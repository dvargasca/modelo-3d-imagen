'use strict';

/**
 * Servidor de la app "imagen -> modelo 3D".
 *
 * Node puro, SIN dependencias externas: se arranca con `node server.js`.
 * Requiere Node 18+ (usa fetch / FormData / Blob globales). Probado en Node 22.
 *
 * Rutas:
 *   GET  /                     -> interfaz (public/index.html)
 *   GET  /api/config           -> proveedores disponibles y si tienen API key
 *   POST /api/generate         -> inicia la generación, devuelve { taskId }
 *   GET  /api/status/:taskId    -> estado y progreso de la tarea
 *   GET  /api/download/:taskId  -> descarga el modelo (?format=glb|fbx|obj)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { Readable } = require('stream');

const { getProvider, listProviders } = require('./src/providers');
loadDotEnv(path.join(__dirname, '.env'));

const PORT = process.env.PORT || 3000;
const DEFAULT_PROVIDER = process.env.PROVIDER || 'mock';
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 30 * 1024 * 1024; // 30 MB (imágenes en base64)

// Almacén de tareas en memoria: nuestro taskId -> datos del proveedor.
const tasks = new Map();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/api/config' && req.method === 'GET') {
      return sendJson(res, 200, buildConfig());
    }
    if (pathname === '/api/generate' && req.method === 'POST') {
      return await handleGenerate(req, res);
    }
    if (pathname.startsWith('/api/status/') && req.method === 'GET') {
      return await handleStatus(res, pathname.split('/').pop());
    }
    if (pathname.startsWith('/api/download/') && req.method === 'GET') {
      return await handleDownload(res, pathname.split('/').pop(), url.searchParams.get('format'));
    }

    // Archivos estáticos (interfaz).
    return serveStatic(res, pathname);
  } catch (err) {
    console.error('[server] Error no controlado:', err);
    sendJson(res, 500, { error: 'Error interno del servidor', detail: String(err.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Imagen → 3D corriendo en  http://localhost:${PORT}`);
  console.log(`  Proveedor por defecto:     ${DEFAULT_PROVIDER}`);
  const configured = listProviders()
    .filter((p) => !p.requiresKey || process.env[p.envKey])
    .map((p) => p.name)
    .join(', ');
  console.log(`  Proveedores listos:        ${configured || '(ninguno con key)'}\n`);
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function buildConfig() {
  return {
    defaultProvider: DEFAULT_PROVIDER,
    providers: listProviders().map((p) => ({
      name: p.name,
      label: p.label || p.name,
      requiresKey: p.requiresKey,
      kind: p.kind || (p.requiresKey ? 'cloud' : 'demo'),
      keyConfigured: !p.requiresKey || Boolean(process.env[p.envKey]),
    })),
  };
}

async function handleGenerate(req, res) {
  const raw = await readBody(req);
  let body;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    return sendJson(res, 400, { error: 'JSON inválido en el cuerpo de la petición.' });
  }

  const providerName = body.provider || DEFAULT_PROVIDER;
  let provider;
  try {
    provider = getProvider(providerName);
  } catch {
    return sendJson(res, 400, { error: `Proveedor desconocido: ${providerName}` });
  }

  const apiKey = provider.envKey ? process.env[provider.envKey] : null;
  if (provider.requiresKey && !apiKey) {
    return sendJson(res, 400, {
      error: `El proveedor "${providerName}" necesita una API key. Define ${provider.envKey} en tu .env. ` +
        `Para probar sin llaves usa el proveedor "mock".`,
    });
  }

  const image = parseDataUri(body.imageBase64);
  if (!image) {
    return sendJson(res, 400, { error: 'La imagen debe enviarse como data URI base64 (data:image/...;base64,...).' });
  }

  try {
    const providerTaskId = await provider.start({
      imageDataUri: image.dataUri,
      imageBuffer: image.buffer,
      mime: image.mime,
      filename: body.filename || 'imagen',
      options: body.options || {},
      apiKey,
    });

    const taskId = randomUUID();
    tasks.set(taskId, { provider: provider.name, providerTaskId });
    return sendJson(res, 200, { taskId });
  } catch (err) {
    console.error('[generate] Falló el proveedor:', err);
    return sendJson(res, 502, { error: 'El proveedor de 3D falló al iniciar la tarea.', detail: String(err.message || err) });
  }
}

async function handleStatus(res, taskId) {
  const task = tasks.get(taskId);
  if (!task) return sendJson(res, 404, { error: 'Tarea no encontrada.' });

  const provider = getProvider(task.provider);
  const apiKey = provider.envKey ? process.env[provider.envKey] : null;

  try {
    const status = await provider.status({ providerTaskId: task.providerTaskId, apiKey });
    return sendJson(res, 200, {
      status: status.status,
      progress: status.progress ?? 0,
      models: status.models || {},
      error: status.error || null,
    });
  } catch (err) {
    console.error('[status] Falló el proveedor:', err);
    return sendJson(res, 502, { error: 'No se pudo consultar el estado.', detail: String(err.message || err) });
  }
}

async function handleDownload(res, taskId, format) {
  const task = tasks.get(taskId);
  if (!task) return sendJson(res, 404, { error: 'Tarea no encontrada.' });

  const provider = getProvider(task.provider);
  const apiKey = provider.envKey ? process.env[provider.envKey] : null;
  const fmt = (format || 'glb').toLowerCase();

  try {
    const status = await provider.status({ providerTaskId: task.providerTaskId, apiKey });
    const modelUrl = status.models && status.models[fmt];
    if (!modelUrl) return sendJson(res, 404, { error: `No hay modelo en formato "${fmt}" para esta tarea.` });

    const upstream = await fetch(modelUrl);
    if (!upstream.ok || !upstream.body) {
      return sendJson(res, 502, { error: `No se pudo descargar el modelo (${upstream.status}).` });
    }

    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES['.' + fmt] || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="modelo.${fmt}"`,
    });
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    console.error('[download] Error:', err);
    sendJson(res, 502, { error: 'Error al descargar el modelo.', detail: String(err.message || err) });
  }
}

// ---------------------------------------------------------------------------
// Estáticos
// ---------------------------------------------------------------------------

function serveStatic(res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, rel);

  // Evita path traversal fuera de public/.
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { error: 'Prohibido.' });
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      return sendJson(res, 404, { error: 'No encontrado.' });
    }
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.fbx': 'application/octet-stream',
  '.obj': 'text/plain; charset=utf-8',
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('La imagen es demasiado grande (máx. 30 MB).'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseDataUri(dataUri) {
  if (typeof dataUri !== 'string') return null;
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUri);
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64'), dataUri };
}

/** Lector mínimo de .env (KEY=VALOR por línea) para no depender de paquetes. */
function loadDotEnv(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // No hay .env: se usan las variables del entorno o los valores por defecto.
  }
}
