# Imagen → Modelo 3D

Convierte la **foto de una persona (u objeto) en un modelo 3D** que puedes
**descargar** e importar en Unity (o donde quieras).

El proyecto tiene dos partes independientes:

| Carpeta | Qué es | ¿La necesito? |
|---------|--------|---------------|
| **[`web/`](web/)** | 🌐 **La página web** (tipo *meshy.ai*): subes una imagen, genera el modelo 3D, lo previsualizas y lo **descargas** en GLB. | **Sí** — es lo principal. |
| [`Assets/MetroVR/`](Assets/MetroVR/) | 🎮 Sistema **opcional** de Unity para colocar avatares como pasajeros configurables de metro (sentado / de pie sujetando la varilla). | Solo si además quieres eso. Puedes ignorarlo o borrarlo. |

---

## 🌐 La página web (empieza aquí)

Requiere **Node.js 18+**. No hay dependencias que instalar.

```bash
cd web
node server.js
```

Abre **http://localhost:3000**, sube una imagen, pulsa **Generar** y descarga el modelo.

- **Modo demo** (por defecto, sin configurar nada): prueba toda la interfaz con un
  modelo de ejemplo.
- **Gratis y local (sin API de pago)**: el motor **TripoSR** genera el modelo en
  tu propia máquina, offline y sin ninguna key. Ideal si no quieres depender de
  ningún servicio externo. Guía: **[web/local-generator/README.md](web/local-generator/README.md)**.
- **En la nube**: añade una API key de **Meshy** o **Tripo3D** en `web/.env`
  (plan gratis con créditos; ver **[web/README.md](web/README.md)**).

Después descargas el **GLB** y lo arrastras a la carpeta `Assets/` de tu proyecto Unity.

> 📄 Guía completa de la web, motores y cómo añadir otros: **[web/README.md](web/README.md)**

---

## 🚀 Publicarla en internet (URL pública)

¿Quieres una **URL que puedas abrir desde cualquier lado** (no solo tu PC)?
Necesitas un hosting que ejecute **Node** — **GitHub Pages no sirve** porque solo
aloja archivos estáticos y esta app necesita su servidor (`node server.js`).

La forma gratuita más sencilla es **Render** (el repo ya incluye `render.yaml` listo):

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/dvargasca/modelo-3d-imagen)

> 👉 Guía paso a paso (Render, Glitch y alternativas): **[docs/deploy.md](docs/deploy.md)**

---

## 🎮 Parte opcional de Unity

Si además quieres montar la escena VR con pasajeros configurables (sentarse /
agarrar la varilla), en [`Assets/MetroVR/`](Assets/MetroVR/) están los scripts y las
guías. Es totalmente opcional respecto al generador web.

- Montaje paso a paso y flujo de avatar animable: se documenta en
  [docs/pipeline-avatar.md](docs/pipeline-avatar.md) y [docs/arquitectura.md](docs/arquitectura.md).

---

## Nota honesta sobre los resultados

Una sola imagen **no muestra la espalda** de la persona: la IA la reconstruye de
forma aproximada. El resultado es muy útil para props y personajes de fondo, y algo
más limitado para primeros planos. Para **animar** el modelo (caminar, sentarse),
la malla descargada suele necesitar un *rig*; la forma gratuita es
[Mixamo](https://www.mixamo.com).
