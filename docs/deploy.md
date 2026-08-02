# 🚀 Publicar la web en internet (URL pública)

Esta app **no puede vivir en GitHub Pages**: Pages solo sirve archivos estáticos y
aquí hace falta un **servidor Node** (las rutas `/api/...` que suben la imagen,
consultan el progreso y descargan el modelo). Por eso, al abrir la URL de Pages,
solo ves los archivos del repositorio y la app nunca arranca.

La solución es desplegarla en un hosting que **sí ejecute Node**. Aquí tienes la
opción recomendada (gratis) y un par de alternativas.

---

## ✅ Opción recomendada: Render (gratis)

El repo ya incluye un archivo [`render.yaml`](../render.yaml) que Render lee para
configurar todo solo. No tienes que tocar código.

### Pasos

1. **Ten el repo en GitHub con el `render.yaml`.**
   Este archivo está en la rama `claude/github-pages-web-deploy-mwltzg`. Cuando la
   fusiones a `main` (o al conectar el repo, elige esa rama), Render lo encontrará.

2. **Crea una cuenta en Render:** entra en <https://render.com> y pulsa
   *Get Started* → **inicia sesión con GitHub** (es lo más rápido).

3. **Nuevo Blueprint:**
   - Arriba a la derecha: **New +** → **Blueprint**.
   - Selecciona tu repositorio `dvargasca/modelo-3d-imagen`.
   - En **Branch**, elige la rama que tenga el `render.yaml`
     (por ahora `claude/github-pages-web-deploy-mwltzg`; luego `main` si lo fusionas).
   - Render detecta el `render.yaml` y te muestra el servicio `imagen-a-3d`.
     Pulsa **Apply**.

4. **Espera el despliegue** (1–2 min la primera vez). Al terminar tendrás una URL
   pública tipo:

   ```
   https://imagen-a-3d.onrender.com
   ```

5. **Ábrela.** Ya funciona en **modo demo**: sube una imagen → *Generar* → verás el
   progreso, el visor 3D y podrás descargar el modelo de ejemplo. 🎉

### Para generar modelos REALES a partir de tu foto

El modo demo no convierte tu imagen (usa un modelo de ejemplo). Para la conversión
real necesitas una API key de Meshy o Tripo:

1. Consigue la key:
   - **Meshy** → <https://www.meshy.ai> (Settings → API Keys)
   - **Tripo3D** → <https://platform.tripo3d.ai>
2. En Render, entra a tu servicio → pestaña **Environment** → **Add Environment
   Variable**:
   - `MESHY_API_KEY` = *tu key* (o `TRIPO_API_KEY` según el motor)
   - Cambia `PROVIDER` de `mock` a `meshy` (o `tripo`)
3. **Save Changes.** Render vuelve a desplegar solo. Al recargar la web, el motor
   aparecerá con "API key ✓" y ya convertirá tu foto de verdad.

> 🔑 **Nunca subas tu API key al repositorio.** El archivo `.env` está en
> `.gitignore` a propósito. En producción la key va SIEMPRE como variable de
> entorno en el panel del hosting, como acabas de hacer.

> 😴 **Nota del plan gratuito:** el servicio se "duerme" tras ~15 min sin visitas.
> La primera carga después de dormir tarda ~30–60 s en despertar; luego va normal.
> Es ideal para probar y enseñar; si quieres que esté siempre despierto, Render
> tiene planes de pago.

---

## 🟣 Alternativa aún más simple: Glitch (sin tarjeta)

Bueno para una demo rápida sin configurar nada.

1. Entra en <https://glitch.com> e inicia sesión.
2. **New Project** → **Import from GitHub** → pega la URL del repo.
3. Glitch importa TODO el repo, pero el servidor está en `web/`. Dos opciones:
   - Mueve el contenido de `web/` a la raíz del proyecto de Glitch, **o**
   - En el panel de Glitch, edita el archivo `.glitch` / `start` para que ejecute
     `cd web && node server.js`.
4. Glitch te da una URL `https://tu-proyecto.glitch.me`.

Para modelos reales, añade tus variables en el archivo `.env` que Glitch crea
(igual que en local: `PROVIDER=meshy`, `MESHY_API_KEY=...`). Glitch también duerme
los proyectos tras un rato de inactividad.

---

## 🚂 Sobre Railway

Railway funciona muy bien con esta app (detecta Node y ejecuta `npm start` en
`web/`), pero **ya no tiene un plan 100% gratuito**: da unos créditos de prueba y
luego pasa a plan de pago (~5 USD/mes). Si te vale, el flujo es:
*New Project → Deploy from GitHub repo → Settings → Root Directory = `web`*.

---

## 🖥️ ¿Solo quieres probarlo en tu PC?

No necesitas desplegar nada. Con **Node 18+** instalado:

```bash
cd web
node server.js
```

Abre <http://localhost:3000>. Es lo más rápido y con todas las funciones (incluida
la conversión real si pones tu key en `web/.env`). La única "pega" es que la URL es
local: solo la ves tú en tu máquina.

---

## Resumen

| Dónde | ¿Gratis? | URL pública | Convierte tu foto real | Notas |
|-------|----------|-------------|------------------------|-------|
| **Render** (recomendado) | ✅ | ✅ | ✅ (con API key) | Se duerme sin uso |
| Glitch | ✅ | ✅ | ✅ (con API key) | Hay que apuntar al `web/` |
| Railway | ⚠️ crédito de prueba | ✅ | ✅ (con API key) | Luego de pago |
| Tu PC (`node server.js`) | ✅ | ❌ (solo local) | ✅ (con API key) | Lo más rápido para probar |
| GitHub Pages | ✅ | ✅ | ❌ **no ejecuta Node** | ❌ No sirve para esta app |
