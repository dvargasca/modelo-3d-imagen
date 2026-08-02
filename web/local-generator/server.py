#!/usr/bin/env python3
"""
Servicio LOCAL de generación 3D con TripoSR (open source, gratis, offline).

Todo el cómputo ocurre en TU máquina: NO se conecta a ningún servicio de pago.
La primera vez descarga el modelo (~1.6 GB) desde Hugging Face — eso es gratis y
sólo pasa una vez; después funciona sin internet.

Expone un HTTP mínimo (sólo librería estándar de Python) que el servidor Node
del proyecto consume como un "proveedor" más:

  POST /generate            cuerpo = bytes de la imagen  -> {"job_id": "..."}
  GET  /status/<job_id>     -> {"status": running|succeeded|failed, "progress": 0-100, "error": null}
  GET  /files/<job_id>.glb  -> descarga el modelo generado (GLB)
  GET  /health              -> {"ok": true, "device": "cpu|cuda|mps", "model_loaded": true}

Uso (ver README.md de esta carpeta para el paso a paso):

  # 1) Instala TripoSR y sus dependencias (una vez).
  # 2) Arranca el servicio, apuntando a tu carpeta de TripoSR:
  TRIPOSR_DIR=/ruta/a/TripoSR python server.py

Variables de entorno (todas opcionales):
  TRIPOSR_DIR         Ruta a la carpeta de TripoSR (donde está el paquete "tsr").
                      Por defecto: la carpeta actual.
  HOST                Interfaz de escucha. Por defecto 127.0.0.1 (sólo tu PC).
  PORT                Puerto. Por defecto 5001. (El .env de la web usa TRIPOSR_URL.)
  DEVICE              cuda | mps | cpu. Por defecto se detecta automáticamente.
  MC_RESOLUTION       Resolución del "marching cubes" (detalle de la malla). Def. 256.
  CHUNK_SIZE          Tamaño de chunk del render. Def. 8192. Bájalo si te falta VRAM.
  FOREGROUND_RATIO    Cuánto recorta el sujeto (0-1). Def. 0.85.
  REMOVE_BG           1 quita el fondo (recomendado), 0 lo deja. Def. 1.
"""

import io
import json
import os
import queue
import sys
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# --------------------------------------------------------------------------
# Configuración por entorno
# --------------------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
TRIPOSR_DIR = os.environ.get("TRIPOSR_DIR", os.getcwd())
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "5001"))
DEVICE_OVERRIDE = os.environ.get("DEVICE", "").strip().lower()
MC_RESOLUTION = int(os.environ.get("MC_RESOLUTION", "256"))
CHUNK_SIZE = int(os.environ.get("CHUNK_SIZE", "8192"))
FOREGROUND_RATIO = float(os.environ.get("FOREGROUND_RATIO", "0.85"))
REMOVE_BG = os.environ.get("REMOVE_BG", "1") not in ("0", "false", "False", "")
OUTPUT_DIR = os.path.join(HERE, "outputs")

# Permite importar el paquete "tsr" de TripoSR aunque el servicio viva en otra carpeta.
if TRIPOSR_DIR and TRIPOSR_DIR not in sys.path:
    sys.path.insert(0, TRIPOSR_DIR)


def _fail(msg):
    print("\n[triposr] ERROR: " + msg + "\n", file=sys.stderr)
    sys.exit(1)


# --------------------------------------------------------------------------
# Carga del modelo (una sola vez, al arrancar)
# --------------------------------------------------------------------------
print("[triposr] Cargando dependencias…")
try:
    import numpy as np
    import torch
    from PIL import Image
except Exception as e:  # noqa: BLE001
    _fail(
        "Faltan dependencias base (torch / numpy / Pillow). "
        "Instálalas con los requisitos de TripoSR. Detalle: %s" % e
    )

try:
    from tsr.system import TSR
    from tsr.utils import remove_background, resize_foreground
except Exception as e:  # noqa: BLE001
    _fail(
        "No pude importar el paquete 'tsr' de TripoSR desde:\n    %s\n"
        "Clona TripoSR (https://github.com/VAST-AI-Research/TripoSR) y/o define "
        "TRIPOSR_DIR con la ruta a esa carpeta. Detalle: %s" % (TRIPOSR_DIR, e)
    )


def pick_device():
    if DEVICE_OVERRIDE:
        return DEVICE_OVERRIDE
    if torch.cuda.is_available():
        return "cuda:0"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


DEVICE = pick_device()
print("[triposr] Dispositivo: %s" % DEVICE)
if DEVICE == "cpu":
    print("[triposr] Aviso: en CPU cada modelo puede tardar varios minutos.")

print("[triposr] Cargando el modelo TripoSR (la 1ª vez se descarga ~1.6 GB)…")
try:
    MODEL = TSR.from_pretrained(
        "stabilityai/TripoSR",
        config_name="config.yaml",
        weight_name="model.ckpt",
    )
    MODEL.renderer.set_chunk_size(CHUNK_SIZE)
    MODEL.to(DEVICE)
except Exception as e:  # noqa: BLE001
    _fail("No pude cargar el modelo TripoSR. Detalle: %s" % e)

# Sesión de rembg (quitar fondo). Opcional: si no está instalado, se avisa y se
# continúa sin recorte de fondo (los resultados suelen ser peores).
REMBG_SESSION = None
if REMOVE_BG:
    try:
        import rembg

        REMBG_SESSION = rembg.new_session()
    except Exception as e:  # noqa: BLE001
        print(
            "[triposr] Aviso: 'rembg' no disponible (%s). Se generará SIN quitar "
            "el fondo. Instala rembg para mejores resultados." % e
        )

os.makedirs(OUTPUT_DIR, exist_ok=True)
print("[triposr] Modelo listo.\n")

# --------------------------------------------------------------------------
# Cola de trabajos (una GPU no procesa dos cosas a la vez: los serializamos)
# --------------------------------------------------------------------------
JOBS = {}          # job_id -> {"status", "progress", "error"}
JOBS_LOCK = threading.Lock()
WORK = queue.Queue()


def set_job(job_id, **fields):
    with JOBS_LOCK:
        JOBS.setdefault(job_id, {})
        JOBS[job_id].update(fields)


def get_job(job_id):
    with JOBS_LOCK:
        j = JOBS.get(job_id)
        return dict(j) if j else None


def preprocess(image):
    """Recorta el fondo y coloca el sujeto sobre gris, como hace run.py de TripoSR."""
    if REMBG_SESSION is None:
        return image.convert("RGB")
    image = remove_background(image, REMBG_SESSION)
    image = resize_foreground(image, FOREGROUND_RATIO)
    arr = np.array(image).astype(np.float32) / 255.0
    if arr.shape[-1] == 4:  # RGBA -> componer sobre gris
        arr = arr[:, :, :3] * arr[:, :, 3:4] + (1 - arr[:, :, 3:4]) * 0.5
    return Image.fromarray((arr * 255.0).astype(np.uint8))


def run_job(job_id, image_bytes):
    try:
        set_job(job_id, status="running", progress=10, error=None)
        image = Image.open(io.BytesIO(image_bytes))

        set_job(job_id, progress=25)  # quitando fondo / preparando
        image = preprocess(image)

        set_job(job_id, progress=45)  # inferencia (lo más pesado)
        with torch.no_grad():
            scene_codes = MODEL([image], device=DEVICE)

        set_job(job_id, progress=80)  # extrayendo la malla
        meshes = MODEL.extract_mesh(scene_codes, True, resolution=MC_RESOLUTION)

        out_path = os.path.join(OUTPUT_DIR, "%s.glb" % job_id)
        meshes[0].export(out_path)

        set_job(job_id, status="succeeded", progress=100)
        print("[triposr] Job %s -> %s" % (job_id, out_path))
    except Exception as e:  # noqa: BLE001
        print("[triposr] Job %s FALLÓ: %s" % (job_id, e), file=sys.stderr)
        set_job(job_id, status="failed", progress=0, error=str(e))


def worker_loop():
    while True:
        job_id, image_bytes = WORK.get()
        run_job(job_id, image_bytes)
        WORK.task_done()


threading.Thread(target=worker_loop, daemon=True).start()


# --------------------------------------------------------------------------
# Servidor HTTP
# --------------------------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802
        path = self.path.split("?", 1)[0]

        if path == "/health":
            return self._json(200, {"ok": True, "device": DEVICE, "model_loaded": True})

        if path.startswith("/status/"):
            job_id = path[len("/status/"):]
            job = get_job(job_id)
            if not job:
                return self._json(404, {"error": "job desconocido"})
            return self._json(200, {
                "status": job.get("status", "running"),
                "progress": job.get("progress", 0),
                "error": job.get("error"),
            })

        if path.startswith("/files/"):
            name = path[len("/files/"):]
            if not name.endswith(".glb") or "/" in name or ".." in name:
                return self._json(400, {"error": "nombre inválido"})
            fpath = os.path.join(OUTPUT_DIR, name)
            if not os.path.isfile(fpath):
                return self._json(404, {"error": "modelo no encontrado"})
            with open(fpath, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "model/gltf-binary")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        return self._json(404, {"error": "ruta no encontrada"})

    def do_POST(self):  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path != "/generate":
            return self._json(404, {"error": "ruta no encontrada"})

        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return self._json(400, {"error": "cuerpo vacío: envía los bytes de la imagen"})
        image_bytes = self.rfile.read(length)

        job_id = uuid.uuid4().hex
        set_job(job_id, status="running", progress=5, error=None)
        WORK.put((job_id, image_bytes))
        return self._json(200, {"job_id": job_id})

    def log_message(self, *args):  # silencia el log por-petición de http.server
        pass


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("  TripoSR local escuchando en  http://%s:%d" % (HOST, PORT))
    print("  (En la web pon PROVIDER=triposr; si cambiaste HOST/PORT, ajusta TRIPOSR_URL.)\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[triposr] Apagando…")
        server.shutdown()


if __name__ == "__main__":
    main()
