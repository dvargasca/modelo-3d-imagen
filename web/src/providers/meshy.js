'use strict';

/**
 * Proveedor Meshy AI (image-to-3D).
 *
 * Necesita una API key: define MESHY_API_KEY en tu .env.
 * Consíguela en https://www.meshy.ai (Settings → API Keys).
 *
 * NOTA: los endpoints y campos siguen la API pública de Meshy conocida al
 * escribir esto. Si Meshy cambia su API, ajusta SOLO este archivo — el resto
 * de la app no depende de estos detalles. Verifica en https://docs.meshy.ai
 */

const BASE = 'https://api.meshy.ai/openapi/v1/image-to-3d';

module.exports = {
  name: 'meshy',
  label: 'Meshy AI',
  requiresKey: true,
  envKey: 'MESHY_API_KEY',

  async start({ imageDataUri, options, apiKey }) {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageDataUri, // Meshy acepta un data URI base64 o una URL pública.
        enable_pbr: options.enablePbr ?? true,
        should_texture: options.shouldTexture ?? true,
      }),
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(`Meshy ${res.status}: ${data?.message || JSON.stringify(data)}`);
    }
    // La API devuelve el id de la tarea en "result".
    const taskId = data.result || data.id;
    if (!taskId) throw new Error('Meshy no devolvió un id de tarea.');
    return String(taskId);
  },

  async status({ providerTaskId, apiKey }) {
    const res = await fetch(`${BASE}/${providerTaskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(`Meshy ${res.status}: ${data?.message || JSON.stringify(data)}`);
    }

    const urls = data.model_urls || {};
    return {
      status: mapStatus(data.status),
      progress: data.progress ?? 0,
      models: { glb: urls.glb, fbx: urls.fbx, obj: urls.obj, usdz: urls.usdz },
      error: data.task_error?.message || null,
    };
  },
};

function mapStatus(s) {
  switch ((s || '').toUpperCase()) {
    case 'SUCCEEDED':
      return 'succeeded';
    case 'FAILED':
    case 'CANCELED':
      return 'failed';
    default:
      return 'running'; // PENDING, IN_PROGRESS, ...
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
