using UnityEngine;

namespace MetroVR
{
    /// <summary>
    /// Ficha de un pasajero, guardada como asset (ScriptableObject).
    /// Crea uno por cada persona/imagen: menú "Assets > Create > MetroVR > Passenger Config".
    ///
    /// Aquí decides QUIÉN entra (el avatar generado desde la imagen) y CÓMO se comporta
    /// (sentado o de pie). El <see cref="MetroPassengerSpawner"/> lee estas fichas y
    /// puebla el vagón automáticamente.
    /// </summary>
    [CreateAssetMenu(fileName = "PassengerConfig", menuName = "MetroVR/Passenger Config")]
    public class PassengerConfig : ScriptableObject
    {
        [Header("Identidad")]
        public string displayName = "Pasajero";

        [Header("Avatar generado desde la imagen")]
        [Tooltip("Prefab del avatar ya rigeado como Humanoid (Tripo/Meshy + Mixamo, o un .glb importado). " +
                 "Es la vía recomendada y funciona sin dependencias extra.")]
        public GameObject avatarPrefab;

        [Tooltip("Alternativa: URL .glb de un avatar de Ready Player Me. " +
                 "Requiere el SDK de RPM y un proveedor de avatar que lo cargue (ver README).")]
        public string avatarUrl;

        [Header("Comportamiento")]
        [Tooltip("De pie sujetando la varilla, o sentado.")]
        public PassengerState state = PassengerState.StandingHoldingRail;

        [Tooltip("Índice del asiento/varilla concreto a ocupar. " +
                 "-1 = asignar automáticamente el primero que esté libre.")]
        public int preferredAnchorIndex = -1;
    }
}
