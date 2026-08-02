using System;
using UnityEngine;

namespace MetroVR
{
    /// <summary>
    /// Abstracción para obtener la instancia de un avatar.
    ///
    /// Gracias a esta interfaz, la FUENTE del avatar (un prefab local ya rigeado,
    /// Ready Player Me por URL, un cargador de glTF en runtime, etc.) se puede
    /// cambiar sin tocar el resto del sistema (spawner, pasajero, IK).
    ///
    /// La creación es asíncrona a propósito (callback onReady): cargar un avatar
    /// de Ready Player Me implica una descarga de red que no es inmediata.
    /// </summary>
    public interface IAvatarProvider
    {
        /// <param name="config">Ficha del pasajero (contiene prefab o URL).</param>
        /// <param name="parent">Transform padre donde instanciar el avatar.</param>
        /// <param name="onReady">Se llama con el GameObject del avatar creado (o null si falla).</param>
        void CreateAvatar(PassengerConfig config, Transform parent, Action<GameObject> onReady);
    }
}
