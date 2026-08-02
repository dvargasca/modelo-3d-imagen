'use strict';

/**
 * Registro de proveedores de generación 3D.
 *
 * Cada proveedor es un módulo con esta forma:
 *   {
 *     name, label, requiresKey, envKey,
 *     async start({ imageDataUri, imageBuffer, mime, filename, options, apiKey }) -> providerTaskId
 *     async status({ providerTaskId, apiKey }) -> { status, progress, models:{glb,fbx,obj}, error }
 *   }
 *
 * status.status ∈ { 'running', 'succeeded', 'failed' }
 *
 * Para añadir un motor nuevo (p. ej. TripoSR self-host), crea otro archivo aquí
 * y regístralo en PROVIDERS. El resto de la app no cambia.
 */

const mock = require('./mock');
const triposr = require('./triposr');
const meshy = require('./meshy');
const tripo = require('./tripo');

const PROVIDERS = { mock, triposr, meshy, tripo };

function getProvider(name) {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Proveedor desconocido: ${name}`);
  return p;
}

function listProviders() {
  return Object.values(PROVIDERS);
}

module.exports = { getProvider, listProviders };
