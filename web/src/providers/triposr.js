'use strict';

/**
 * Proveedor TripoSR LOCAL (open source, gratis, offline).
 *
 * A diferencia de Meshy/Tripo, aquí NO se paga ni se llama a ningún servicio en
 * la nube: el modelo 3D lo genera un pequeño servicio Python que corre en TU
 * máquina (ver web/local-generator/). Este archivo sólo habla con ese servicio
 * local por HTTP.
 *
 *   start()  -> POST  {TRIPOSR_URL}/generate   (bytes de la imagen) -> job_id
 *   status() -> GET   {TRIPOSR_URL}/status/:id                      -> estado
 *   modelo   -> GET   {TRIPOSR_URL}/files/:id.glb  (lo descarga el server Node)
 *
 * Arranca el servicio antes de generar:  ver web/local-generator/README.md
 */

const BASE = (process.env.TRIPOSR_URL || 'http://127.0.0.1:5001').replace(/\/+$/, '');

module.exports = {
  name: 'triposr',
  label: 'TripoSR (local, gratis)',
  requiresKey: false,
  envKey: null,
  kind: 'local',

  async start({ imageBuffer, mime }) {
    let res;
    try {
      res = await fetch(`${BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': mime || 'application/octet-stream' },
        body: imageBuffer,
      });
    } catch (err) {
      throw new Error(
        `No pude conectar con el generador local de TripoSR en ${BASE}. ` +
        `¿Arrancaste el servicio Python? Guía: web/local-generator/README.md. ` +
        `Detalle: ${err.message}`
      );
    }

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(`TripoSR local ${res.status}: ${data?.error || 'error desconocido'}`);
    }
    if (!data?.job_id) throw new Error('El generador local no devolvió un job_id.');
    return String(data.job_id);
  },

  async status({ providerTaskId }) {
    let res;
    try {
      res = await fetch(`${BASE}/status/${providerTaskId}`);
    } catch (err) {
      throw new Error(`No pude consultar el generador local (${BASE}): ${err.message}`);
    }

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(`TripoSR local ${res.status}: ${data?.error || 'error desconocido'}`);
    }

    const status = data.status || 'running';
    return {
      status, // 'running' | 'succeeded' | 'failed'
      progress: data.progress ?? 0,
      models: status === 'succeeded' ? { glb: `${BASE}/files/${providerTaskId}.glb` } : {},
      error: data.error || null,
    };
  },
};

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
