# Imagen → Modelo 3D (app web)

Página web tipo *meshy.ai*: subes una **imagen**, genera un **modelo 3D**, lo
**previsualizas** en el navegador y lo **descargas** (GLB) para meterlo en Unity
o donde quieras.

![flujo](https://img.shields.io/badge/imagen-%E2%86%92%203D-6d8bff)

## Arranque rápido (modo demo, sin configurar nada)

Requiere **Node.js 18+** (probado en Node 22). No hay dependencias que instalar.

```bash
cd web
node server.js
```

Abre **http://localhost:3000**, sube una imagen y pulsa **Generar**. En modo
**demo** verás el flujo completo (subida → progreso → visor 3D → descarga) con un
modelo de ejemplo, sin necesidad de API key.

> El modo demo NO convierte tu imagen: sirve para probar la interfaz. Para generar
> el modelo real a partir de tu foto, configura un motor real (abajo).

## Generar modelos reales

Hay dos caminos. Elige según si prefieres **no pagar ni depender de nadie** (local)
o **cero instalación** (nube).

### Opción A — Gratis y local, sin API (recomendada si tienes GPU)

El motor **`triposr`** genera el modelo **en tu propia máquina** con
[TripoSR](https://github.com/VAST-AI-Research/TripoSR) (open source). No necesita
cuenta, ni API key, ni pagar nada, y funciona offline.

1. Monta el servicio local (una vez): sigue **[local-generator/README.md](local-generator/README.md)**.
2. En `web/.env` pon `PROVIDER=triposr` (o simplemente elígelo en el selector **Motor**).
3. Arranca `node server.js`, sube tu imagen y genera.

> Necesita Python y, para ir rápido, una GPU NVIDIA (en CPU funciona pero lento).
> No sirve en el hosting gratis de Render (no tiene GPU).

### Opción B — En la nube (Meshy o Tripo), sin instalar nada

Tienen **plan gratis con créditos**, pero necesitas cuenta y API key, y el 3D lo
generan sus servidores.

1. Consigue una API key:
   - **Meshy** — https://www.meshy.ai (Settings → API Keys)
   - **Tripo3D** — https://platform.tripo3d.ai
2. Copia `.env.example` a `.env` y rellena la key + el proveedor:
   ```bash
   cp .env.example .env
   # edita .env:
   #   PROVIDER=meshy
   #   MESHY_API_KEY=tu_key
   ```
3. Arranca de nuevo (`node server.js`) y elige el motor en el selector de arriba.

También puedes cambiar de motor en la propia página con el desplegable **Motor**
(el que necesite key y no la tenga aparece marcado como "sin key").

## Publicarla en internet (URL pública)

Para que otras personas la abran desde una URL (no solo en tu `localhost`), hay que
desplegarla en un hosting que ejecute **Node**. **GitHub Pages NO sirve**: solo
aloja archivos estáticos y esta app necesita su servidor. La forma gratuita más
simple es **Render** (el repo trae un `render.yaml` listo).

> 👉 Guía paso a paso: **[../docs/deploy.md](../docs/deploy.md)**

## Cómo se usa el resultado en Unity

1. Descarga el **GLB**.
2. En Unity, arrástralo a la carpeta `Assets/` de tu proyecto
   (Unity importa glTF/GLB de forma nativa desde 2020+; si tu versión no lo hace,
   instala el paquete **glTFast** desde el Package Manager).
3. Coloca el modelo en la escena.

> ¿Necesitas que el personaje **se anime** (caminar, sentarse)? El GLB sale como
> malla estática. Para animarlo, ríggealo en **Mixamo** (gratis) y úsalo como
> Humanoid. En la carpeta `../Assets/MetroVR` de este repo tienes, además, un
> sistema opcional para colocar pasajeros configurables en un vagón (sentado /
> de pie sujetando la varilla). Puedes ignorarlo si solo querías el generador.

## Estructura

```
web/
├── server.js                 # Servidor Node puro (sin dependencias)
├── package.json
├── .env.example              # Copia a .env para las API keys
├── src/providers/            # Motores de generación (intercambiables)
│   ├── index.js              #   registro de proveedores
│   ├── mock.js               #   demo, sin key
│   ├── triposr.js            #   TripoSR local (gratis, sin key, offline)
│   ├── meshy.js              #   Meshy AI (necesita MESHY_API_KEY)
│   └── tripo.js              #   Tripo3D (necesita TRIPO_API_KEY)
├── local-generator/          # Servicio Python de TripoSR (para el motor local)
│   ├── server.py
│   ├── requirements.txt
│   └── README.md
└── public/                   # Interfaz (HTML/CSS/JS)
    ├── index.html
    ├── styles.css
    └── app.js
```

## Añadir otro motor

Crea `src/providers/mi-motor.js` con la misma forma que los demás
(`start` + `status`) y regístralo en `src/providers/index.js`. El resto de la app
(interfaz, subida, visor, descarga) no cambia. El motor local `triposr.js` es un
buen ejemplo de cómo conectar un servicio propio (Python) sin API de pago.

Interfaz que debe cumplir un proveedor:

```js
module.exports = {
  name: 'mi-motor',
  label: 'Mi Motor',
  requiresKey: true,          // ¿necesita API key?
  envKey: 'MI_MOTOR_API_KEY', // variable de entorno con la key
  async start({ imageDataUri, imageBuffer, mime, filename, options, apiKey }) {
    // inicia la generación y devuelve el id de la tarea del proveedor
    return providerTaskId;
  },
  async status({ providerTaskId, apiKey }) {
    // devuelve el estado actual
    return { status: 'running'|'succeeded'|'failed', progress: 0-100, models: { glb, fbx, obj }, error };
  },
};
```

## Notas y límites

- Los endpoints de **Meshy** y **Tripo** están implementados según su API pública
  conocida; si esos servicios cambian su API, ajusta solo el archivo del proveedor
  correspondiente en `src/providers/`.
- El visor 3D (`<model-viewer>`) se carga desde CDN (unpkg). Si necesitas que
  funcione sin internet, descarga ese script y sírvelo desde `public/`.
- Una sola imagen no muestra la espalda de la persona: la IA la reconstruye
  aproximándola. Ideal para props y personajes de fondo.
