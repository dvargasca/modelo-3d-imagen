'use strict';

/**
 * Proveedor de DEMO. No llama a ninguna API ni necesita llaves.
 *
 * Simula el ciclo real (unos segundos "generando") y luego devuelve un modelo
 * 3D de ejemplo, para que puedas probar toda la interfaz — subir imagen,
 * ver el progreso, previsualizar en 3D y descargar — sin configurar nada.
 *
 * Sustitúyelo por "meshy" o "tripo" (con su API key) para generar el modelo
 * real a partir de tu imagen.
 */

// Modelo GLB público de ejemplo (se ve y se puede descargar).
const SAMPLE_GLB = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const FAKE_DURATION_MS = 4000;

module.exports = {
  name: 'mock',
  label: 'Demo (sin API key)',
  requiresKey: false,
  envKey: null,
  kind: 'demo',

  async start() {
    // Codifica el instante de inicio en el id para calcular el progreso luego.
    return `mock-${Date.now()}`;
  },

  async status({ providerTaskId }) {
    const startedAt = Number(String(providerTaskId).split('-')[1]) || Date.now();
    const elapsed = Date.now() - startedAt;

    if (elapsed < FAKE_DURATION_MS) {
      return {
        status: 'running',
        progress: Math.min(95, Math.round((elapsed / FAKE_DURATION_MS) * 100)),
        models: {},
      };
    }

    return {
      status: 'succeeded',
      progress: 100,
      models: { glb: SAMPLE_GLB },
    };
  },
};
