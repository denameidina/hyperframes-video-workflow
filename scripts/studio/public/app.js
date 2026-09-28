// Studio UI (ADR-0020). Plain JS, no build step.
const $ = (s) => document.querySelector(s);
const enc = encodeURIComponent;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
const dur = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '–');
const when = (t) => (t ? new Date(t).toLocaleString('id-ID') : '');
// crypto.randomUUID needs a secure context; the Tailscale URL is plain http.
const viewer = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  if (res.status === 401) {
    location.href = '/login';
    throw new Error('login required');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}
const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });

let state = { tools: {}, codex: {}, claudeModels: [], efforts: {} };
let tab = 'raw';

function banner(msg) {
  $('#banner').textContent = msg || '';
  $('#banner').hidden = !msg;
}

function showTab(name) {
  tab = name;
  for (const b of document.querySelectorAll('nav button')) b.classList.toggle('active', b.dataset.tab === name);
  for (const t of ['raw', 'sessions', 'results']) $(`#tab-${t}`).hidden = t !== name;
  refresh();
}
document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

async function refresh() {
  try {
    if (tab === 'raw') renderRaw(await api('/api/raw'));
    if (tab === 'sessions') renderSessions(await api('/api/sessions'));
    if (tab === 'results') renderResults(await api('/api/results'));
  } catch (e) {
    banner(e.message);
  }
}

// ---- Raw ----
function renderRaw(items) {
  $('#raw-list').innerHTML = items.length ? items.map((r) => `
    <li>
      <div class="meta"><strong>${esc(r.name)}</strong><span class="muted">${mb(r.size)} · ${dur(r.duration)} · ${r.projects.length} proyek</span></div>
      <div class="actions"><button class="primary" data-edit="${esc(r.name)}">Edit this video</button><button class="danger" data-delete="${esc(r.name)}">Delete</button></div>
    </li>`).join('') : '<li class="muted">Belum ada raw video.</li>';
}
$('#raw-list').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b?.dataset.edit) openEdit(b.dataset.edit);
  if (b?.dataset.delete) openDelete(b.dataset.delete);
});

$('#upload').addEventListener('change', () => {
  const file = $('#upload').files[0];
  if (!file) return;
  const bar = $('#upload-progress');
  bar.hidden = false;
  bar.value = 0;
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `/api/raw?name=${enc(file.name)}`);
  xhr.upload.onprogress = (e) => { if (e.lengthComputable) bar.value = e.loaded / e.total; };
  xhr.onload = () => {
    bar.hidden = true;
    $('#upload').value = '';
    if (xhr.status >= 400) banner((JSON.parse(xhr.responseText || '{}').error) || `Upload gagal (${xhr.status})`);
    refresh();
  };
  xhr.onerror = () => {
    bar.hidden = true;
    banner('Upload terputus');
  };
  xhr.send(file);
});

// ---- Edit ----
let editRaw = '';
function fillModelOptions() {
  const f = $('#edit-form');
  const rt = f.runtime.value;
  const models = rt === 'claude' ? state.claudeModels : [state.codex.model].filter(Boolean);
  $('#model-options').innerHTML = models.map((m) => `<option value="${esc(m)}">`).join('');
  f.model.value = rt === 'claude' ? 'opus' : state.codex.model || '';
  const efforts = state.efforts[rt] || [];
  f.effort.innerHTML = efforts.map((x) => `<option>${x}</option>`).join('');
  f.effort.value = rt === 'codex' && efforts.includes(state.codex.effort) ? state.codex.effort : 'high';
}
$('#edit-form').runtime.addEventListener('change', fillModelOptions);

async function openEdit(name) {
  let plan;
  try {
    plan = await api(`/api/raw/${enc(name)}/edit-plan`);
  } catch (e) {
    return banner(e.message);
  }
  if (plan.mode === 'open') return openTerminal(plan.slug);
  editRaw = name;
  const f = $('#edit-form');
  f.reset();
  $('#edit-raw').textContent = name;
  $('#edit-mode').textContent = plan.mode === 'continue' ? `Lanjutkan proyek videos/${plan.slug}/` : 'Proyek baru';
  f.slug.value = plan.slug;
  f.slug.readOnly = plan.mode === 'continue';
  for (const o of f.runtime.options) o.disabled = state.tools[o.value] === false;
  f.runtime.value = state.tools.claude === false ? 'codex' : 'claude';
  fillModelOptions();
  $('#edit-error').textContent = '';
  $('#edit-dialog').showModal();
}
$('#edit-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'start') return;
  e.preventDefault();
  const f = e.target;
  try {
    const s = await post('/api/sessions', { raw: editRaw, slug: f.slug.value, runtime: f.runtime.value, model: f.model.value, effort: f.effort.value, notes: f.notes.value });
    $('#edit-dialog').close();
    openTerminal(s.slug);
  } catch (err) {
    $('#edit-error').textContent = err.message;
  }
});

// ---- Delete ----
let deleteTarget = '';
async function openDelete(name) {
  let plan;
  try {
    plan = await api(`/api/raw/${enc(name)}/delete-plan`);
  } catch (e) {
    return banner(e.message);
  }
  deleteTarget = name;
  $('#delete-items').innerHTML = [
    `<li>raw/${esc(name)}</li>`,
    ...plan.projects.map((p) => `<li>videos/${esc(p.slug)}/${p.renders.length ? ` (${p.renders.length} render)` : ''}</li>`),
    ...plan.sessions.map((s) => `<li>sesi tmux studio-${esc(s)}</li>`),
  ].join('');
  $('#delete-error').textContent = '';
  $('#delete-dialog').showModal();
}
$('#delete-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'delete') return;
  e.preventDefault();
  try {
    await api(`/api/raw/${enc(deleteTarget)}`, { method: 'DELETE' });
    $('#delete-dialog').close();
    refresh();
  } catch (err) {
    $('#delete-error').textContent = err.message;
  }
});

// ---- Sessions ----
function renderSessions(items) {
  $('#session-list').innerHTML = items.length ? items.map((s) => `
    <li>
      <div class="meta"><strong>${esc(s.slug)}</strong><span class="status ${esc(s.status)}">${esc(s.status)}</span>
        <span class="muted">${esc(s.runtime)} · ${esc(s.model)} · ${esc(s.effort)} · ${esc(s.raw)}</span></div>
      <div class="actions"><button class="primary" data-open="${esc(s.slug)}">Show terminal</button><button data-esc="${esc(s.slug)}">Esc</button><button class="danger" data-kill="${esc(s.slug)}">Kill</button></div>
    </li>`).join('') : '<li class="muted">Tidak ada sesi.</li>';
}
$('#session-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.open) openTerminal(b.dataset.open);
    if (b.dataset.esc) await post(`/api/sessions/${enc(b.dataset.esc)}/interrupt`);
    if (b.dataset.kill && confirm(`Kill sesi ${b.dataset.kill}?`)) {
      await api(`/api/sessions/${enc(b.dataset.kill)}`, { method: 'DELETE' });
      refresh();
    }
  } catch (err) {
    banner(err.message);
  }
});

// ---- Terminal ----
let term;
let fit;
let source;
let termSlug = '';
let lastSize = '';
let pending = '';
let sending = false;
let resizeTimer;

function ensureTerm() {
  if (term) return;
  term = new Terminal({ fontSize: 13, cursorBlink: true, scrollback: 5000, theme: { background: '#111111' } });
  fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open($('#term'));
  term.onData(sendInput);
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(reconnectIfResized, 250);
  }).observe($('#term'));
}

// Keystrokes are queued and sent in order, one POST at a time.
function sendInput(data) {
  pending += data;
  if (sending) return;
  sending = true;
  (async () => {
    while (pending) {
      const chunk = pending;
      pending = '';
      try {
        await post(`/api/sessions/${enc(termSlug)}/input`, { viewer, data: chunk });
      } catch (e) {
        term.write(`\r\n[input gagal: ${e.message}]\r\n`);
      }
    }
    sending = false;
  })();
}

function connect() {
  if (source) source.close();
  fit.fit();
  lastSize = `${term.cols}x${term.rows}`;
  source = new EventSource(`/api/sessions/${enc(termSlug)}/stream?viewer=${viewer}&cols=${term.cols}&rows=${term.rows}`);
  source.addEventListener('data', (e) => term.write(Uint8Array.from(atob(JSON.parse(e.data)), (c) => c.charCodeAt(0))));
  source.addEventListener('exit', () => {
    term.write('\r\n[sesi selesai atau terputus]\r\n');
    source.close();
  });
}

function reconnectIfResized() {
  if (!termSlug || $('#term-panel').hidden) return;
  fit.fit();
  if (`${term.cols}x${term.rows}` !== lastSize) connect();
}

function openTerminal(slug) {
  termSlug = slug;
  $('#term-title').textContent = `studio-${slug}`;
  $('#term-panel').hidden = false;
  ensureTerm();
  term.reset();
  connect();
  term.focus();
}

$('#term-close').addEventListener('click', () => {
  if (source) source.close();
  source = null;
  termSlug = '';
  $('#term-panel').hidden = true;
  refresh();
});

const KEYS = { esc: '\x1b', tab: '\t', up: '\x1b[A', down: '\x1b[B', ctrlc: '\x03', enter: '\r' };
document.querySelector('.keys').addEventListener('click', (e) => {
  const k = e.target.closest('button')?.dataset.key;
  if (!k) return;
  sendInput(KEYS[k]);
  term.focus();
});

// ---- Results ----
function renderResults(items) {
  $('#result-list').innerHTML = items.length ? items.map((r) => `
    <li>
      <div class="meta"><strong>${esc(r.slug)}</strong><span class="muted">${esc(r.file)} · ${mb(r.size)} · ${when(r.mtime)}</span>
        ${r.publish ? `<span class="muted">Publish ${esc(when(r.publish.createdAt))}: ${r.publish.platforms.map((p) => `${esc(p.platform)} ${esc(p.status)}`).join(', ')}</span>` : ''}</div>
      <video controls preload="metadata" playsinline src="/media/${enc(r.slug)}/${enc(r.file)}"></video>
      <div class="actions"><button class="primary" data-publish="${esc(r.slug)}" data-file="${esc(r.file)}">Publish to Repliz</button></div>
    </li>`).join('') : '<li class="muted">Belum ada render.</li>';
}

let publishTarget = null;
$('#result-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-publish]');
  if (!b) return;
  publishTarget = { slug: b.dataset.publish, file: b.dataset.file };
  try {
    const p = await api(`/api/results/${enc(publishTarget.slug)}/publish-preview?file=${enc(publishTarget.file)}`);
    $('#publish-file').textContent = `videos/${p.slug}/renders/${p.file}`;
    $('#publish-targets').textContent = p.targets.length ? `Target: ${p.targets.join(', ')}` : 'Tidak ada target akun di .env';
    $('#publish-caption').textContent = `${p.title || ''}\n\n${p.description || '(deskripsi kosong — isi publish-captions.md dulu)'}`;
    $('#publish-log').hidden = true;
    $('#publish-log').textContent = '';
    $('#publish-error').textContent = '';
    $('#publish-go').disabled = !p.targets.length || !p.description;
    $('#publish-dialog').showModal();
  } catch (err) {
    banner(err.message);
  }
});
$('#publish-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'publish') return;
  e.preventDefault();
  $('#publish-go').disabled = true;
  try {
    await post(`/api/results/${enc(publishTarget.slug)}/publish`, { file: publishTarget.file });
    const log = $('#publish-log');
    log.hidden = false;
    const es = new EventSource(`/api/results/${enc(publishTarget.slug)}/publish/stream`);
    es.addEventListener('log', (ev) => {
      log.textContent += JSON.parse(ev.data);
      log.scrollTop = log.scrollHeight;
    });
    es.addEventListener('done', (ev) => {
      log.textContent += `\n[selesai, exit ${JSON.parse(ev.data).code}]\n`;
      es.close();
      refresh();
    });
  } catch (err) {
    $('#publish-error').textContent = err.message;
    $('#publish-go').disabled = false;
  }
});

// ---- Boot ----
(async () => {
  try {
    state = await api('/api/state');
  } catch (e) {
    return banner(e.message);
  }
  const missing = Object.entries(state.tools).filter(([, ok]) => !ok).map(([t]) => t);
  if (missing.length) banner(`Tidak ditemukan di PATH: ${missing.join(', ')}`);
  refresh();
  // Only the Sessions tab polls; re-rendering Results would reset playing videos.
  setInterval(() => { if (tab === 'sessions' && $('#term-panel').hidden) refresh(); }, 2000);
})();
