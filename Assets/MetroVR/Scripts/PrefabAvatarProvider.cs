using System;
using UnityEngine;

namespace MetroVR
{
    /// <summary>
    /// Proveedor de avatar por defecto: instancia el prefab incluido en el PassengerConfig.
    ///
    /// Úsalo cuando ya tienes el avatar rigeado como Humanoid — por ejemplo:
    ///   - Un modelo de Tripo/Meshy rigeado en Mixamo y exportado como FBX.
    ///   - Un .glb importado a Unity y convertido en prefab.
    ///
    /// Para Ready Player Me (carga por URL en runtime) crea otro IAvatarProvider
    /// que use su SDK; el resto del sistema no cambia. Ver README.
    /// </summary>
    public class PrefabAvatarProvider : MonoBehaviour, IAvatarProvider
    {
        public void CreateAvatar(PassengerConfig config, Transform parent, Action<GameObject> onReady)
        {
            if (config == null || config.avatarPrefab == null)
            {
                Debug.LogError($"[MetroVR] El PassengerConfig '{config?.displayName}' no tiene avatarPrefab asignado.");
                onReady?.Invoke(null);
                return;
            }

            GameObject instance = Instantiate(config.avatarPrefab, parent);
            instance.name = string.IsNullOrEmpty(config.displayName) ? config.avatarPrefab.name : config.displayName;
            onReady?.Invoke(instance);
        }
    }
}
