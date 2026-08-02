using UnityEngine;

namespace MetroVR
{
    /// <summary>
    /// Controla un pasajero del metro generado a partir de una imagen.
    ///
    /// Se coloca en el GameObject raíz del avatar (el que tiene el Animator Humanoid).
    /// Expone un único "estado" configurable — sentado o de pie sujetando la varilla —
    /// que puedes fijar desde el Inspector o cambiar en runtime con <see cref="SetState"/>.
    ///
    /// - De pie: aplica IK a las manos para que agarren la varilla (<see cref="rail"/>).
    /// - Sentado: coloca la cadera en el asiento (<see cref="seat"/>) y activa la
    ///   animación de sentado a través del Animator.
    ///
    /// REQUISITO del Animator: en la capa base del Animator Controller marca la casilla
    /// "IK Pass" para que OnAnimatorIK tenga efecto. Ver README.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public class MetroPassenger : MonoBehaviour
    {
        [Header("Estado (esto es lo que tú configuras)")]
        [Tooltip("Cómo empieza el pasajero. Se puede cambiar en runtime con SetState().")]
        public PassengerState state = PassengerState.StandingHoldingRail;

        [Header("Objetivos en la escena")]
        [Tooltip("Varilla que sujeta cuando está de pie.")]
        public RailPoint rail;

        [Tooltip("Asiento que ocupa cuando está sentado.")]
        public SeatPoint seat;

        [Header("IK de manos (solo de pie)")]
        [Range(0f, 1f)]
        [Tooltip("Cuánto se fuerza a las manos hacia la varilla. 1 = totalmente pegadas.")]
        public float handIKWeight = 1f;

        [Tooltip("Velocidad de la transición del IK al cambiar de estado (suavizado).")]
        public float ikBlendSpeed = 6f;

        [Header("Animator")]
        [Tooltip("Nombre del parámetro bool de tu Animator Controller que activa la pose de sentado.")]
        public string seatedBoolParam = "Seated";

        Animator _animator;
        float _currentIKWeight;

        void Awake()
        {
            _animator = GetComponent<Animator>();
            ApplyState(instant: true);
        }

        /// <summary>
        /// Cambia el estado del pasajero (por ejemplo cuando el metro arranca o se detiene).
        /// </summary>
        public void SetState(PassengerState newState)
        {
            state = newState;
            ApplyState(instant: false);
        }

        void ApplyState(bool instant)
        {
            bool seated = state == PassengerState.Seated;

            if (HasParam(seatedBoolParam))
                _animator.SetBool(seatedBoolParam, seated);

            if (seated)
            {
                if (seat != null)
                {
                    // Coloca la cadera del avatar exactamente en el asiento.
                    transform.SetPositionAndRotation(seat.Anchor.position, seat.Anchor.rotation);
                    seat.isOccupied = true;
                }
                if (rail != null) rail.isOccupied = false;
            }
            else
            {
                if (rail != null) rail.isOccupied = true;
                if (seat != null) seat.isOccupied = false;
            }

            if (instant)
                _currentIKWeight = seated ? 0f : handIKWeight;
        }

        void Update()
        {
            // Suaviza la entrada/salida del IK para que no haya saltos bruscos.
            float target = state == PassengerState.StandingHoldingRail ? handIKWeight : 0f;
            _currentIKWeight = Mathf.MoveTowards(_currentIKWeight, target, ikBlendSpeed * Time.deltaTime);
        }

        // Unity llama a esto durante el "IK Pass" del Animator.
        void OnAnimatorIK(int layerIndex)
        {
            if (_currentIKWeight <= 0.001f || rail == null)
            {
                ClearHandIK(AvatarIKGoal.LeftHand);
                ClearHandIK(AvatarIKGoal.RightHand);
                return;
            }

            ApplyHandIK(AvatarIKGoal.LeftHand, rail.leftHandTarget);
            ApplyHandIK(AvatarIKGoal.RightHand, rail.rightHandTarget);
        }

        void ApplyHandIK(AvatarIKGoal goal, Transform target)
        {
            if (target == null)
            {
                ClearHandIK(goal);
                return;
            }
            _animator.SetIKPositionWeight(goal, _currentIKWeight);
            _animator.SetIKRotationWeight(goal, _currentIKWeight);
            _animator.SetIKPosition(goal, target.position);
            _animator.SetIKRotation(goal, target.rotation);
        }

        void ClearHandIK(AvatarIKGoal goal)
        {
            _animator.SetIKPositionWeight(goal, 0f);
            _animator.SetIKRotationWeight(goal, 0f);
        }

        bool HasParam(string paramName)
        {
            if (string.IsNullOrEmpty(paramName) || _animator == null) return false;
            foreach (var p in _animator.parameters)
                if (p.name == paramName) return true;
            return false;
        }
    }
}
