# Generador local con TripoSR (gratis, sin API, offline)

Este es el motor **`triposr`**: genera el modelo 3D **en tu propia máquina** con
[TripoSR](https://github.com/VAST-AI-Research/TripoSR) (open source, licencia MIT).

- ✅ **Gratis**: no paga nada, no necesita cuenta ni API key.
- ✅ **Offline**: una vez descargado el modelo, no se conecta a ningún servicio.
- ⚠️ **La 1ª vez** descarga el modelo (~1.6 GB) desde Hugging Face. Es gratis y
  sólo pasa una vez; después funciona sin internet.

Cómo encaja: es un pequeño servicio Python que corre aparte. El servidor Node de
la web (`../server.js`) le pasa la imagen y le pide el modelo. **El navegador
nunca habla con Python** — todo va a través de Node.

```
imagen  ─▶  web (node server.js)  ─▶  este servicio (python server.py)  ─▶  TripoSR
   ▲                                                                          │
   └──────────────────  modelo .glb  ◀───────────────────────────────────────┘
```

## Requisitos

- **Python 3.8–3.11**.
- **GPU NVIDIA** recomendada (varios GB de VRAM) → segundos por modelo.
  Sin GPU **también funciona en CPU**, pero cada modelo tarda **varios minutos**.
- ~**4 GB de disco** (modelo + dependencias) e **internet la primera vez**.
- Un **compilador de C++** (para `torchmcubes`): en Windows, *Visual C++ Build
  Tools*; en Linux, `build-essential`; en macOS, las *Command Line Tools*.

> ❗ Esto es para tu **máquina local**. **No** sirve en el hosting gratis de
> Render (no tiene GPU y tiene poca RAM). Para una URL pública con generación
> real y sin montar servidores, usa Meshy/Tripo (plan gratis con créditos).

## Instalación (una vez)

Desde esta carpeta (`web/local-generator/`):

```bash
# 1) Clona TripoSR aquí mismo (trae el paquete "tsr" que usa el servicio)
git clone https://github.com/VAST-AI-Research/TripoSR

# 2) Instala PyTorch para tu equipo (elige CPU o CUDA en la web oficial):
#    https://pytorch.org/get-started/locally/
pip install torch torchvision          # ejemplo para CPU

# 3) Instala el resto de dependencias
pip install -r TripoSR/requirements.txt
#    (o la lista mínima de aquí:)
# pip install -r requirements.txt
```

> Consejo: usa un entorno virtual (`python -m venv .venv && source .venv/bin/activate`)
> para no ensuciar tu Python del sistema.

## Arrancar el servicio

Desde esta carpeta (`web/local-generator/`), indicando dónde clonaste TripoSR:

```bash
TRIPOSR_DIR=./TripoSR python server.py     # ajusta la ruta si lo clonaste en otro sitio
```

En Windows (PowerShell):

```powershell
$env:TRIPOSR_DIR=".\TripoSR"; python server.py
```

Verás algo como:

```
[triposr] Dispositivo: cuda:0
[triposr] Modelo listo.
  TripoSR local escuchando en  http://127.0.0.1:5001
```

Déjalo abierto en esa terminal.

## Usarlo desde la web

En **otra terminal**, en la carpeta `web/`:

```bash
# .env  ->  PROVIDER=triposr
node server.js
```

Abre http://localhost:3000, elige **TripoSR (local, gratis)** en el selector
**Motor**, sube tu imagen y pulsa **Generar**. El modelo se genera en tu PC y lo
puedes previsualizar y **descargar** en GLB.

> Si arrancaste el servicio en otra dirección o puerto, ponlo en `web/.env`:
> `TRIPOSR_URL=http://127.0.0.1:5001`

## Ajustes (variables de entorno del servicio)

| Variable | Por defecto | Para qué |
|----------|-------------|----------|
| `TRIPOSR_DIR` | carpeta actual | Ruta a tu clon de TripoSR (donde está `tsr/`). |
| `HOST` | `127.0.0.1` | Interfaz de escucha (sólo tu PC por defecto). |
| `PORT` | `5001` | Puerto del servicio (debe coincidir con `TRIPOSR_URL`). |
| `DEVICE` | auto | Fuerza `cuda`, `mps` o `cpu`. |
| `MC_RESOLUTION` | `256` | Detalle de la malla (más = más lento y pesado). |
| `CHUNK_SIZE` | `8192` | Bájalo si te quedas sin VRAM. |
| `FOREGROUND_RATIO` | `0.85` | Cuánto recorta el sujeto al quitar el fondo. |
| `REMOVE_BG` | `1` | `0` para no quitar el fondo. |

## Problemas frecuentes

- **`No pude conectar con el generador local…`** en la web → el servicio Python
  no está arrancado, o `TRIPOSR_URL` no apunta a su dirección/puerto.
- **`No pude importar el paquete 'tsr'`** → define `TRIPOSR_DIR` con la ruta a tu
  clon de TripoSR.
- **Falla al instalar `torchmcubes`** → falta el compilador de C++ (ver
  *Requisitos*). Instálalo y reintenta.
- **Va lentísimo** → estás en CPU. Es lo esperado; con GPU NVIDIA es cuestión de
  segundos.
- **Sin `rembg`** → el servicio funciona igual pero sin recortar el fondo (peor
  resultado). Instala `rembg` y `onnxruntime` para activarlo.

## Nota honesta sobre el resultado

Una sola imagen **no muestra la espalda** del sujeto: la IA la reconstruye de
forma aproximada. Ideal para props y personajes de fondo. Para **animar** el
modelo (caminar, sentarse), la malla suele necesitar un *rig*; la vía gratis es
[Mixamo](https://www.mixamo.com).
