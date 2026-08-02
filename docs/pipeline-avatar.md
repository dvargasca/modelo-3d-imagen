# De la imagen al avatar animable (guía detallada)

Este documento cubre **la parte que ocurre fuera de Unity**: convertir una foto en un
avatar 3D rigeado como **Humanoid**, listo para usarse con los scripts de este repo.

Hay dos vías recomendadas. Elige según cuánto realismo quieras y cuánta simplicidad.

---

## Vía A — Ready Player Me (la más simple, con SDK de Unity)

**Cuándo:** quieres el camino más corto, avatares semirrealistas y carga desde selfie.
El rig Humanoid viene ya hecho.

1. Entra en [readyplayer.me](https://readyplayer.me) y crea un avatar desde una **foto/selfie**.
2. Obtienes una **URL `.glb`** del avatar (algo como `https://models.readyplayer.me/<id>.glb`).
3. En Unity instala el **Ready Player Me SDK** (Package Manager por git URL, según su web).
4. Carga el avatar por URL. Puedes usarlo con este repo creando un proveedor propio:

```csharp
using System;
using UnityEngine;
// using ReadyPlayerMe.Core;   // según el SDK instalado

namespace MetroVR
{
    // Ejemplo de integración. Ajusta a la API de la versión del SDK que instales.
    public class ReadyPlayerMeAvatarProvider : MonoBehaviour, IAvatarProvider
    {
        public void CreateAvatar(PassengerConfig config, Transform parent, Action<GameObject> onReady)
        {
            // var loader = new AvatarObjectLoader();
            // loader.OnCompleted += (s, a) => { a.Avatar.transform.SetParent(parent); onReady(a.Avatar); };
            // loader.OnFailed    += (s, a) => { Debug.LogError(a.Message); onReady(null); };
            // loader.LoadAvatar(config.avatarUrl);
        }
    }
}
```

5. En el `MetroPassengerSpawner`, arrastra este proveedor al campo **avatarProviderBehaviour**
   (en lugar de `PrefabAvatarProvider`). El resto del sistema no cambia.

> El avatar de RPM ya es Humanoid, así que solo necesitas el Animator Controller
> con el parámetro `Seated` y la casilla **IK Pass** (ver README §4.2).

---

## Vía B — Tripo3D / Meshy + Mixamo (más parecido a la foto)

**Cuándo:** quieres que el avatar se parezca lo más posible a la persona de la foto.
Aquí el rig lo añades tú con **Mixamo** (gratis).

### Paso 1 — Imagen → malla 3D
- Sube la foto a **[Tripo3D](https://www.tripo3d.ai)** o **[Meshy](https://www.meshy.ai)**
  (ambos tienen plan gratuito).
- Descarga el modelo. Prefiere **FBX** u **OBJ** (o **GLB**).

### Paso 2 — Poner huesos (rig) con Mixamo
- Entra en **[mixamo.com](https://www.mixamo.com)** (cuenta Adobe gratuita).
- **Upload Character** → sube tu malla.
- Mixamo la **auto-rigea** como humanoide (marca las articulaciones si te lo pide).
- Descarga:
  - El personaje rigeado (**FBX**, "T-pose" o "With Skin").
  - Una animación **idle de pie** y otra **"Sitting Idle"** (FBX, *Without Skin* si vas a
    compartir el mismo esqueleto).

### Paso 3 — Importar a Unity como Humanoid
1. Arrastra el FBX del personaje a `Assets/`.
2. Selecciónalo ▸ **Rig** ▸ **Animation Type = Humanoid** ▸ **Apply**.
3. Importa también las animaciones (idle de pie, sitting) como Humanoid.
4. Convierte el personaje en **prefab** (arrástralo de la escena a `Assets/`).
5. Ese prefab es el que pones en `PassengerConfig.avatarPrefab`.

### Paso 4 — Animator
Crea el Animator Controller como en el **README §4.2** (parámetro `Seated`,
estados `StandIdle`/`SitIdle`, **IK Pass** activado).

---

## Comparativa rápida

| | Ready Player Me | Tripo/Meshy + Mixamo |
|---|---|---|
| Parecido a la foto | Medio (estilizado) | Alto |
| Dificultad | Baja | Media |
| Rig Humanoid | Automático | Con Mixamo (fácil) |
| Carga en runtime | Sí (por URL) | No (prefab preparado) |
| Coste | Gratis / planes | Gratis / planes |

---

## Consejos para mejores resultados

- Foto **de cuerpo entero, de frente, fondo neutro y buena luz** (como la imagen de ejemplo).
- Ropa ajustada da mejor reconstrucción que ropa muy holgada.
- Para VR, **optimiza polígonos** (los generadores a veces dan mallas pesadas):
  usa un modificador de decimate/LOD si vas a tener muchos pasajeros.
