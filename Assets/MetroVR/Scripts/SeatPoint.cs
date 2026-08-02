using UnityEngine;

namespace MetroVR
{
    /// <summary>
    /// Asiento del vagón. Cuando un pasajero se sienta, su cadera se coloca
    /// en <see cref="Anchor"/> (posición + rotación).
    ///
    /// Cómo usarlo en la escena:
    ///   1. Crea un GameObject vacío en el asiento (por ejemplo "Seat_01").
    ///   2. Añádele este componente.
    ///   3. Opcional: crea un hijo vacío bien ajustado a la altura/orientación
    ///      del asiento y asígnalo a sitAnchor para afinar la pose.
    /// </summary>
    public class SeatPoint : MonoBehaviour
    {
        [Tooltip("Punto exacto donde se sienta la cadera del avatar. " +
                 "Si es null se usa el propio transform de este objeto.")]
        public Transform sitAnchor;

        [Tooltip("Marcado automáticamente cuando un pasajero ocupa este asiento.")]
        public bool isOccupied;

        /// <summary>Punto efectivo donde se coloca al pasajero.</summary>
        public Transform Anchor => sitAnchor != null ? sitAnchor : transform;

        void OnDrawGizmos()
        {
            Gizmos.color = isOccupied ? Color.red : Color.green;
            var t = Anchor;
            Gizmos.DrawWireCube(t.position, new Vector3(0.4f, 0.05f, 0.4f));
            Gizmos.DrawLine(t.position, t.position + t.forward * 0.3f);
        }
    }
}
