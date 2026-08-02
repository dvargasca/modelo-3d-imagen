# Arquitectura del sistema

Objetivo del diseño: que **cambiar la fuente del avatar** (foto → modelo) y **el
comportamiento** (sentado / de pie) sea sencillo y no obligue a tocar el resto del código.

## Piezas y responsabilidades

```
                         ┌─────────────────────────┐
                         │   MetroPassengerSpawner  │  Lee fichas y puebla el vagón
                         └───────────┬─────────────┘
                                     │ usa
                    ┌────────────────┼───────────────────┐
                    ▼                ▼                   ▼
          ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
          │PassengerConfig│  │ IAvatarProvider│  │ Seat/RailPoint   │
          │ (datos)       │  │ (fuente avatar)│  │ (puntos escena)  │
          └──────────────┘  └───────┬────────┘  └──────────────────┘
                                     │ crea
                                     ▼
                           ┌──────────────────┐
                           │  MetroPassenger   │  Estado + IK + sentarse
                           │  (en el avatar)   │
                           └──────────────────┘
```

| Componente | Responsabilidad | Punto de extensión |
|------------|-----------------|--------------------|
| `MetroPassenger` | Aplicar el estado: colocar en asiento o IK de manos a la varilla. | Añadir estados nuevos (p. ej. `Falling`, `WalkingToSeat`). |
| `PassengerState` | Enum de estados. | Ampliar el enum. |
| `RailPoint` / `SeatPoint` | Describir puntos de la escena (dónde agarrar / dónde sentarse). | Añadir capacidad, prioridad, zonas. |
| `PassengerConfig` | Datos de un pasajero, sin código. | Añadir campos (equipaje, ropa, etc.). |
| `MetroPassengerSpawner` | Orquestar la creación y asignación. | Reglas de asignación (aleatoria, por densidad…). |
| `IAvatarProvider` | Abstraer **de dónde sale** el avatar. | `ReadyPlayerMeAvatarProvider`, `GlbRuntimeProvider`… |

## Por qué IK para la varilla

Agarrar la barra depende de **dónde esté la barra en la escena**, no de una animación fija.
El **IK de manos** del Animator de Unity (`OnAnimatorIK` + `SetIKPosition/Rotation`) mueve
las manos hacia los `Transform` de `RailPoint` sobre cualquier animación de pie. Así:

- La misma animación idle sirve para varillas a distintas alturas/posiciones.
- El peso del IK (`handIKWeight`) se **mezcla suavemente** al cambiar de estado.

> Requiere **"IK Pass"** activado en la capa base del Animator Controller.

## Por qué sentarse "coloca la cadera"

Las animaciones de sentado posicionan el cuerpo respecto a la **cadera** del avatar.
Al entrar en `Seated`, `MetroPassenger` fija la posición/rotación del avatar al
`Anchor` del `SeatPoint` y deja que la animación haga el resto. Ajustar el `sitAnchor`
del asiento afina el resultado sin tocar código.

## Flujo asíncrono

`IAvatarProvider.CreateAvatar` usa un **callback** (`Action<GameObject>`) porque cargar un
avatar de Ready Player Me es una descarga de red. El `PrefabAvatarProvider` responde de
inmediato; un proveedor de RPM responderá cuando termine la descarga. El spawner funciona
igual en ambos casos.

## Ideas de extensión

- **Estados por evento del tren:** un `MetroMotion` que llame a `SetState` en arranques/frenadas.
- **Pose de mano al agarrar:** un `RailGrabPose` que cierre los dedos alrededor de la barra.
- **Densidad configurable:** que el spawner reparta N pasajeros entre asientos y varillas
  según un porcentaje.
