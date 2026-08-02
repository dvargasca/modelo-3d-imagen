using System.Collections.Generic;
using UnityEngine;

namespace MetroVR
{
    /// <summary>
    /// Puebla el vagón con pasajeros a partir de una lista de <see cref="PassengerConfig"/>.
    ///
    /// Para cada ficha:
    ///   1. Pide al proveedor que cree el avatar (desde su prefab o URL).
    ///   2. Le añade/obtiene el componente <see cref="MetroPassenger"/>.
    ///   3. Lo asigna a un asiento o varilla libre.
    ///   4. Aplica su estado (sentado / de pie sujetando).
    ///
    /// Es la pieza que hace todo "configurable por datos": tú solo editas la lista
    /// de fichas y los puntos de la escena, sin tocar código.
    /// </summary>
    public class MetroPassengerSpawner : MonoBehaviour
    {
        [Header("Pasajeros a generar")]
        public List<PassengerConfig> passengers = new List<PassengerConfig>();

        [Header("Puntos de la escena")]
        [Tooltip("Todos los asientos del vagón.")]
        public List<SeatPoint> seats = new List<SeatPoint>();

        [Tooltip("Todas las varillas/barras de agarre del vagón.")]
        public List<RailPoint> rails = new List<RailPoint>();

        [Header("Proveedor de avatar")]
        [Tooltip("Componente que crea el avatar. Si se deja vacío se busca un IAvatarProvider " +
                 "en este mismo GameObject (por defecto, PrefabAvatarProvider).")]
        public MonoBehaviour avatarProviderBehaviour;

        IAvatarProvider _provider;

        void Start()
        {
            _provider = ResolveProvider();
            if (_provider == null)
            {
                Debug.LogError("[MetroVR] No se encontró ningún IAvatarProvider. " +
                               "Añade un PrefabAvatarProvider a este GameObject.");
                return;
            }

            foreach (PassengerConfig config in passengers)
                SpawnPassenger(config);
        }

        IAvatarProvider ResolveProvider()
        {
            if (avatarProviderBehaviour is IAvatarProvider fromField)
                return fromField;
            return GetComponent<IAvatarProvider>();
        }

        void SpawnPassenger(PassengerConfig config)
        {
            if (config == null) return;

            _provider.CreateAvatar(config, transform, avatar =>
            {
                if (avatar == null) return;

                MetroPassenger passenger = avatar.GetComponent<MetroPassenger>();
                if (passenger == null)
                    passenger = avatar.AddComponent<MetroPassenger>();

                if (config.state == PassengerState.Seated)
                    passenger.seat = PickSeat(config.preferredAnchorIndex);
                else
                    passenger.rail = PickRail(config.preferredAnchorIndex);

                // Aplica el estado DESPUÉS de asignar el asiento/varilla.
                passenger.SetState(config.state);
            });
        }

        SeatPoint PickSeat(int index)
        {
            if (index >= 0 && index < seats.Count && seats[index] != null && !seats[index].isOccupied)
                return seats[index];

            foreach (SeatPoint s in seats)
                if (s != null && !s.isOccupied) return s;

            Debug.LogWarning("[MetroVR] No quedan asientos libres para un pasajero sentado.");
            return null;
        }

        RailPoint PickRail(int index)
        {
            if (index >= 0 && index < rails.Count && rails[index] != null && !rails[index].isOccupied)
                return rails[index];

            foreach (RailPoint r in rails)
                if (r != null && !r.isOccupied) return r;

            Debug.LogWarning("[MetroVR] No quedan varillas libres para un pasajero de pie.");
            return null;
        }
    }
}
