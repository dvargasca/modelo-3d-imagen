'use strict';

/**
 * Proveedor Tripo3D (image-to-3D).
 *
 * Necesita una API key: define TRIPO_API_KEY en tu .env.
 * Consíguela en https://platform.tripo3d.ai
 *
 * Flujo de la API de Tripo:
 *   1. Subir la imagen  -> se obtiene un image_token.
 *   2. Crear la tarea "image_to_model" con ese token -> task_id.
 *   3. Consultar la tarea hasta "success" -> URL del modelo.
 *
 * NOTA: endpoints/campos según la API conocida al escribir esto. Si cambian,
 * ajusta SOLO este archivo. Verifica en https://platform.tripo3d.ai/docs
 */

const UPLOAD_URL = 'https://api.tripo3d.ai/v2/openapi/upload';
const TASK_URL = 'https://api.tripo3d.ai/v2/openapi/task';

module.exports = {
  name: 'tripo',
  label: 'Tripo3D',
  requiresKey: true,
  envKey: 'TRIPO_API_KEY',

  async start({ imageBuffer, mime, filename, apiKey }) {
    // 1) Subir la imagen (multipart). Node 18+ trae FormData/Blob globales.
    const form = new FormData();
    form.append('file', new Blob([imageBuffer], { type: mime }), filename || 'imagen');

    const up = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const upData = await safeJson(up);
    if (!up.ok || upData?.code !== 0) {
      throw new Error(`Tripo upload ${up.status}: ${JSON.stringify(upData)}`);
    }
    const imageToken = upData.data.image_token;

    // 2) Crear la tarea image_to_model.
    const create = await fetch(TASK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'image_to_model',
        file: { type: extFromMime(mime), file_token: imageToken },
      }),
    });
    const createData = await safeJson(create);
    if (!create.ok || createData?.code !== 0) {
      throw new Error(`Tripo task ${create.status}: ${JSON.stringify(createData)}`);
    }
    return String(createData.data.task_id);
  },

  async status({ providerTaskId, apiKey }) {
    const res = await fetch(`${TASK_URL}/${providerTaskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await safeJson(res);
    if (!res.ok || data?.code !== 0) {
      throw new Error(`Tripo status ${res.status}: ${JSON.stringify(data)}`);
    }

    const d = data.data || {};
    const output = d.output || {};
    const glb = output.pbr_model || output.model || output.base_model;
    return {
      status: mapStatus(d.status),
      progress: d.progress ?? 0,
      models: { glb },
      error: d.status === 'failed' ? 'La tarea de Tripo falló.' : null,
    };
  },
};

function mapStatus(s) {
  switch ((s || '').toLowerCase()) {
    case 'success':
      return 'succeeded';
    case 'failed':
    case 'cancelled':
    case 'banned':
    case 'expired':
      return 'failed';
    default:
      return 'running'; // queued, running, ...
  }
}

function extFromMime(mime) {
  if (/png/.test(mime)) return 'png';
  if (/webp/.test(mime)) return 'webp';
  return 'jpg';
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
