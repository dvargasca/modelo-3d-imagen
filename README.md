# Metro VR — Pasajeros 3D a partir de una imagen

Sistema para **Unity** que convierte una **foto de una persona** en un **avatar 3D animable**
y lo coloca como pasajero en un vagón de metro de **realidad virtual**, donde puedes
configurarlo para que vaya **sentado** o **de pie sujetando la varilla**.

> **Idea clave:** una foto sola no basta para animar. El flujo es
> **imagen → avatar rigeado (Humanoid) → configurar comportamiento en Unity**.
> Este repo resuelve la parte de Unity (comportamiento configurable) y te guía en la
> generación del avatar.

---

## 1. Cómo funciona (visión general)

```
   Imagen (foto)                Herramienta IA            Unity (este repo)
 ┌───────────────┐   subir    ┌──────────────────┐  FBX  ┌────────────────────────┐
 │   persona.jpg │ ─────────► │ Ready Player Me / │ ────► │ Avatar Humanoid +      │
 │               │            │ Tripo+Mixamo      │  .glb │ MetroPassenger         │
 └───────────────┘            └──────────────────┘       │  • Sentado             │
                                                          │  • De pie + IK varilla │
                                                          └────────────────────────┘
```

1. **Generas el avatar** desde la imagen (ver [docs/pipeline-avatar.md](docs/pipeline-avatar.md)).
2. **Lo importas a Unity** como Humanoid.
3. **Lo configuras** como pasajero: eliges sentado o de pie. Eso es lo que controla este código.

---

## 2. Requisitos en Unity

- **Unity 2021.3 LTS o superior** (probado con la API de Animator/IK estándar).
- Paquetes (Window ▸ Package Manager):
  - **XR Interaction Toolkit** — para la parte de realidad virtual (cámara/manos del jugador).
  - *(Opcional)* **Ready Player Me SDK** — si generas avatares por URL desde selfie.
  - *(Opcional)* **Animation Rigging** — si más adelante quieres un IK más avanzado.

`Packages/manifest.json` de referencia:

```jsonc
{
  "dependencies": {
    "com.unity.xr.interaction.toolkit": "2.5.4",
    "com.unity.animation.rigging": "1.2.1"   // opcional
  }
}
```

---

## 3. Instalar este código

Copia la carpeta **`Assets/MetroVR/`** dentro de la carpeta `Assets/` de tu proyecto Unity.
Unity generará solo los archivos `.meta` al importarla.

Scripts incluidos:

| Script | Para qué sirve |
|--------|----------------|
| `MetroPassenger.cs` | **El corazón.** Se pone en el avatar. Estado configurable: sentado / de pie sujetando. Aplica el IK de manos y coloca al pasajero en el asiento. |
| `PassengerState.cs` | El enum con los dos estados. |
| `RailPoint.cs` | Marca una varilla en la escena y dónde se agarra cada mano. |
| `SeatPoint.cs` | Marca un asiento en la escena. |
| `PassengerConfig.cs` | Ficha de un pasajero (avatar + estado). Configuración **sin código**. |
| `MetroPassengerSpawner.cs` | Lee las fichas y puebla el vagón automáticamente. |
| `IAvatarProvider.cs` / `PrefabAvatarProvider.cs` | Fuente del avatar (intercambiable: prefab local o Ready Player Me). |

---

## 4. Montar la escena (paso a paso)

### 4.1 Marcar asientos y varillas
- Por cada **asiento**: GameObject vacío en el asiento → añade **`SeatPoint`**.
  Ajusta un hijo `sitAnchor` a la altura/orientación exacta de la cadera al sentarse.
- Por cada **varilla**: GameObject vacío en la barra → añade **`RailPoint`**.
  Crea dos hijos y colócalos donde van las manos → asígnalos a `leftHandTarget` / `rightHandTarget`.
  Orienta cada uno como si la palma envolviera la barra.

> Los `SeatPoint`/`RailPoint` se dibujan con *gizmos* de colores en el editor
> (verde/cian = libre, rojo = ocupado) para colocarlos con precisión.

### 4.2 Preparar el avatar (Animator)
1. Selecciona el modelo importado ▸ pestaña **Rig** ▸ **Animation Type = Humanoid** ▸ Apply.
2. Crea un **Animator Controller** con:
   - Un parámetro **bool** llamado `Seated`.
   - Dos estados: `StandIdle` (animación de pie) y `SitIdle` (animación de sentado).
   - Transiciones `StandIdle ⇄ SitIdle` condicionadas por `Seated`.
   - En la **capa base**, marca la casilla **"IK Pass"** ✅ (imprescindible para que las
     manos agarren la varilla).
3. Asigna ese controller al Animator del avatar.

> Animaciones gratis de pie y sentado: **Mixamo** (idle de pie, "sitting idle").
> Ver [docs/pipeline-avatar.md](docs/pipeline-avatar.md).

### 4.3 Configurar el pasajero — Opción A: manual (1 avatar)
1. Añade **`MetroPassenger`** al GameObject raíz del avatar.
2. En el Inspector:
   - **State** = `StandingHoldingRail` o `Seated`.
   - **Rail** = arrastra un `RailPoint` (si va de pie).
   - **Seat** = arrastra un `SeatPoint` (si va sentado).
3. Play. ▶️ Cámbialo cuando quieras — también en runtime con `SetState(...)`.

### 4.4 Configurar pasajeros — Opción B: por datos (varios avatares) ⭐
1. Por cada persona: **Assets ▸ Create ▸ MetroVR ▸ Passenger Config**.
   Rellena `avatarPrefab`, `state`, etc.
2. Crea un GameObject vacío "Spawner" → añade **`MetroPassengerSpawner`** y **`PrefabAvatarProvider`**.
3. En el spawner arrastra: la lista de **Passenger Configs**, todos los **Seats** y todos los **Rails**.
4. Play. ▶️ El vagón se llena solo, cada pasajero en su estado.

---

## 5. Configurar el comportamiento (lo que pediste)

Todo el "sentarse o agarrar la varilla" se controla con **un solo campo**: `State`.

- **De pie sujetando:** `State = StandingHoldingRail` + un `Rail` asignado.
  Las manos se pegan a la barra con IK (peso ajustable con `handIKWeight`).
- **Sentado:** `State = Seated` + un `Seat` asignado.
  El avatar se coloca en el asiento y el Animator pone la pose de sentado.

Cambiarlo en tiempo de ejecución (por ejemplo, cuando el metro arranca/frena):

```csharp
metroPassenger.SetState(PassengerState.StandingHoldingRail);
// ...más tarde...
metroPassenger.SetState(PassengerState.Seated);
```

---

## 6. Elegir la fuente del avatar

| Vía | Realismo | Rig | Ideal si… | Cómo encaja aquí |
|-----|----------|-----|-----------|------------------|
| **Ready Player Me** | Semirrealista | ✅ Humanoid automático | quieres lo más simple y con SDK de Unity | crea un `IAvatarProvider` que cargue por URL |
| **Tripo3D / Meshy + Mixamo** | Más realista | ✅ Mixamo (Humanoid) | quieres máximo parecido a la foto | usa `PrefabAvatarProvider` (por defecto) |

Detalle completo de ambas vías en **[docs/pipeline-avatar.md](docs/pipeline-avatar.md)**.

---

## 7. Limitaciones honestas

- Una sola foto **no muestra la espalda**: la IA la "inventa". Bien para pasajeros de
  fondo, imperfecto para primeros planos.
- La **topología** de los generadores no siempre es limpia; para muchos NPC va perfecto.
- El **IK** hace que las manos lleguen a la barra, pero no simula dedos que se cierran
  individualmente (para eso haría falta animación/pose de mano específica).

---

## 8. Siguientes pasos sugeridos

- Cambiar estados según el movimiento del tren (evento de arranque/parada → `SetState`).
- Un `RailGrabPoseProvider` para cerrar los dedos alrededor de la barra.
- Un `ReadyPlayerMeAvatarProvider` para meter fotos en runtime sin reimportar.

Ver la arquitectura y puntos de extensión en **[docs/arquitectura.md](docs/arquitectura.md)**.
