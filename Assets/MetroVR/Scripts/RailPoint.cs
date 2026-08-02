using UnityEngine;

namespace MetroVR
{
    /// <summary>
    /// Punto donde un pasajero de pie sujeta la varilla del metro.
    ///
    /// Cómo usarlo en la escena:
    ///   1. Crea un GameObject vacío sobre la barra (por ejemplo "Rail_01").
    ///   2. Añádele este componente.
    ///   3. Crea uno o dos hijos vacíos y colócalos exactamente donde quieres
    ///      que se agarre cada mano; asígnalos a leftHandTarget / rightHandTarget.
    ///
    /// El giro (rotación) de cada target define cómo se orienta la mano al agarrar,
    /// así que oriéntalos como si la palma envolviera la barra.
    /// </summary>
    public class RailPoint : MonoBehaviour
    {
        [Tooltip("Dónde se coloca la mano izquierda. Si es null, no se aplica IK a esa mano.")]
        public Transform leftHandTarget;

        [Tooltip("Dónde se coloca la mano derecha. Si es null, no se aplica IK a esa mano.")]
        public Transform rightHandTarget;

        [Tooltip("Marcado automáticamente cuando un pasajero ocupa esta varilla.")]
        public bool isOccupied;

        // Dibuja ayudas visuales en el editor para colocar las manos con precisión.
        void OnDrawGizmos()
        {
            Gizmos.color = isOccupied ? Color.red : Color.cyan;
            if (leftHandTarget != null) Gizmos.DrawWireSphere(leftHandTarget.position, 0.04f);
            if (rightHandTarget != null) Gizmos.DrawWireSphere(rightHandTarget.position, 0.04f);
        }
    }
}
