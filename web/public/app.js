'use strict';

// Estado de la interfaz.
let imageDataUri = null;
let imageName = null;
let pollTimer = null;

const els = {
  provider: document.getElementById('provider'),
  keyBadge: document.getElementById('keyBadge'),
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('fileInput'),
  dropEmpty: document.getElementById('dropEmpty'),
  preview: document.getElementById('preview'),
  generateBtn: document.getElementById('generateBtn'),
  idle: document.getElementById('idle'),
  progress: document.getElementById('progress'),
  progressLabel: document.getElementById('progressLabel'),
  barFill: document.getElementById('barFill'),
  result: document.getElementById('result'),
  viewer: document.getElementById('viewer'),
  downloadBtns: document.getElementById('downloadBtns'),
  errorBox: document.getElementById('errorBox'),
};

// -------- Configuración: cargar proveedores --------
init();

async function init() {
  try {
    const cfg = await fetch('/api/config').then((r) => r.json());
    els.provider.innerHTML = '';
    for (const p of cfg.providers) {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.label + (p.requiresKey && !p.keyConfigured ? ' (sin key)' : '');
      opt.dataset.keyConfigured = p.keyConfigured;
      opt.dataset.requiresKey = p.requiresKey;
      els.provider.appendChild(opt);
    }
    els.provider.value = cfg.defaultProvider;
    updateKeyBadge();
  } catch {
    showError('No se pudo cargar la configuración del servidor.');
  }
}

els.provider.addEventListener('change', updateKeyBadge);

function updateKeyBadge() {
  const opt = els.provider.selectedOptions[0];
  if (!opt) return;
  const requiresKey = opt.dataset.requiresKey === 'true';
  const keyConfigured = opt.dataset.keyConfigured === 'true';
  if (!requiresKey) {
    els.keyBadge.textContent = 'demo';
    els.keyBadge.className = 'badge';
  } else if (keyConfigured) {
    els.keyBadge.textContent = 'API key ✓';
    els.keyBadge.className = 'badge ok';
  } else {
    els.keyBadge.textContent = 'falta API key';
    els.keyBadge.className = 'badge warn';
  }
}

// -------- Subida de imagen --------
els.dropzone.addEventListener('click', () => els.fileInput.click());
els.dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
});
els.fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

['dragenter', 'dragover'].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.add('drag'); })
);
['dragleave', 'drop'].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.remove('drag'); })
);
els.dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showError('Elige un archivo de imagen (JPG, PNG o WEBP).');
    return;
  }
  imageName = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    imageDataUri = reader.result;
    els.preview.src = imageDataUri;
    els.preview.hidden = false;
    els.dropEmpty.hidden = true;
    els.generateBtn.disabled = false;
    hideError();
  };
  reader.readAsDataURL(file);
}

// -------- Generación --------
els.generateBtn.addEventListener('click', startGeneration);

async function startGeneration() {
  if (!imageDataUri) return;
  hideError();
  clearInterval(pollTimer);

  els.generateBtn.disabled = true;
  showPanel('progress');
  setProgress(0, 'Enviando imagen…');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: imageDataUri,
        filename: imageName,
        provider: els.provider.value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar la generación.');

    pollStatus(data.taskId);
  } catch (err) {
    failGeneration(err.message);
  }
}

function pollStatus(taskId) {
  const poll = async () => {
    try {
      const res = await fetch(`/api/status/${taskId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al consultar el estado.');

      if (data.status === 'succeeded') {
        clearInterval(pollTimer);
        showResult(taskId, data.models);
      } else if (data.status === 'failed') {
        clearInterval(pollTimer);
        failGeneration(data.error || 'La generación falló en el proveedor.');
      } else {
        setProgress(data.progress || 0, `Generando… ${data.progress || 0}%`);
      }
    } catch (err) {
      clearInterval(pollTimer);
      failGeneration(err.message);
    }
  };
  poll();
  pollTimer = setInterval(poll, 2000);
}

function showResult(taskId, models) {
  showPanel('result');
  els.generateBtn.disabled = false;

  // Previsualiza el GLB a través del servidor (mismo origen, sin líos de CORS).
  const glbUrl = `/api/download/${taskId}?format=glb`;
  els.viewer.src = glbUrl;

  // Botones de descarga por cada formato disponible.
  els.downloadBtns.innerHTML = '';
  const formats = Object.keys(models).filter((f) => models[f]);
  const shown = formats.length ? formats : ['glb'];
  for (const fmt of shown) {
    const a = document.createElement('a');
    a.href = `/api/download/${taskId}?format=${fmt}`;
    a.textContent = fmt.toUpperCase();
    a.setAttribute('download', `modelo.${fmt}`);
    els.downloadBtns.appendChild(a);
  }
}

function failGeneration(message) {
  els.generateBtn.disabled = false;
  showPanel('idle');
  showError(message);
}

// -------- Helpers de UI --------
function showPanel(which) {
  els.idle.hidden = which !== 'idle';
  els.progress.hidden = which !== 'progress';
  els.result.hidden = which !== 'result';
}

function setProgress(pct, label) {
  els.barFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  if (label) els.progressLabel.textContent = label;
}

function showError(msg) {
  els.errorBox.textContent = msg;
  els.errorBox.hidden = false;
}
function hideError() {
  els.errorBox.hidden = true;
}
