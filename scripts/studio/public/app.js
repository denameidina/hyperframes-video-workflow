// Studio UI (ADR-0020). Plain JS, no build step.
const $ = (s) => document.querySelector(s);
const enc = encodeURIComponent;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
const dur = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '–');
const when = (t) => (t ? `${new Date(t).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB` : '');
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

let state = { tools: {}, models: {} };
let tab = 'projects';
let openSlug = '';
let openRun = '';
const PAGES = {
  projects: ['Proyek', 'Mulai dari bahan video, lalu lanjutkan proses editing.'],
  generate: ['Generate', 'Ubah ide menjadi video, lalu review naskah, storyboard, dan hasilnya.'],
  results: ['Hasil', 'Tonton hasil render, cek caption, lalu tentukan tanggal tayang.'],
  calendar: ['Kalender konten', 'Lihat tanggal tayang dan atur jadwal konten ke Repliz.'],
  sessions: ['Sesi agen', 'Lanjutkan pekerjaan atau buka terminal agen yang sedang berjalan.'],
  shared: ['Pustaka', 'Bahan video dan gambar yang bisa dipakai di beberapa proyek.'],
  voice: ['Suara', 'Dengarkan dan bandingkan sampel untuk menemukan suara yang sesuai.'],
  music: ['Musik', 'Dengarkan musik latar dan kelola pilihan untuk video berikutnya.'],
};

function banner(msg) {
  $('#banner').textContent = msg || '';
  $('#banner').hidden = !msg;
}

function showTab(name, { refreshPage = true } = {}) {
  if (!Object.hasOwn(PAGES, name)) return;
  if (name === 'generate' && tab === 'generate') window.studioGenerate?.home();
  if (name === 'projects' && tab === 'projects') openSlug = '';
  if (name === 'voice' && tab === 'voice') openRun = '';
  tab = name;
  for (const b of document.querySelectorAll('nav button')) {
    b.classList.toggle('active', b.dataset.tab === name);
    if (b.dataset.tab === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  for (const t of Object.keys(PAGES)) $(`#tab-${t}`).hidden = t !== name;
  $('#page-title').textContent = PAGES[name][0];
  $('#page-description').textContent = PAGES[name][1];
  if (name !== 'generate') history.replaceState(null, '', `#${name}`);
  if (refreshPage) refresh();
}
document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

async function refresh() {
  try {
    if (tab === 'projects') {
      const sessions = await api('/api/sessions');
      if (openSlug) renderProject(await api(`/api/projects/${enc(openSlug)}`), sessions);
      else renderProjects(await api('/api/projects'), sessions);
    }
    if (tab === 'generate') await window.studioGenerate.refresh();
    if (tab === 'shared') renderShared(await api('/api/shared'));
    if (tab === 'sessions') renderSessions(await api('/api/sessions'));
    if (tab === 'results') renderResults(await api('/api/results'));
    if (tab === 'calendar') await window.studioCalendar.refresh();
    if (tab === 'voice') {
      if (openRun) renderVoiceTest(await api(`/api/voice-tests/${enc(openRun)}`));
      else renderVoiceTests(await api('/api/voice-tests'));
    }
    if (tab === 'music') renderMusic(await api('/api/music'));
  } catch (e) {
    banner(e.message);
  }
}

// ---- Uploads (one file at a time, in order) ----
function uploadOne(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      if (xhr.status < 400) return resolve();
      let msg = '';
      try { msg = JSON.parse(xhr.responseText).error; } catch { /* not JSON */ }
      reject(new Error(msg || `Upload gagal (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload terputus'));
    xhr.send(file);
  });
}

async function uploadFiles(input, url, bar) {
  const files = [...input.files];
  if (!files.length) return;
  bar.hidden = false;
  bar.value = 0;
  for (const [i, file] of files.entries()) {
    try {
      await uploadOne(`${url}?name=${enc(file.name)}`, file, (f) => { bar.value = (i + f) / files.length; });
    } catch (err) {
      banner(`${file.name}: ${err.message}`);
    }
  }
  bar.hidden = true;
  input.value = '';
  refresh();
}

// ---- Projects ----
const countText = (c) => Object.entries(c).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(' · ') || 'belum ada sumber';

function renderProjects(items, sessions) {
  $('#project-detail').hidden = true;
  $('#project-home').hidden = false;
  const live = new Map(sessions.map((s) => [s.slug, s.status]));
  $('#project-list').innerHTML = items.length ? items.map((p) => `
    <li data-search="${esc(p.slug.toLowerCase())}">
      <div class="meta"><strong>${esc(p.slug)}</strong>${live.has(p.slug) ? `<span class="status ${esc(live.get(p.slug))}">${esc(live.get(p.slug))}</span>` : ''}
        <span class="muted">${esc(countText(p.counts))} · ${p.renders.length} render</span></div>
      <div class="actions"><button data-open-project="${esc(p.slug)}" aria-label="Buka proyek ${esc(p.slug)}">Buka proyek</button></div>
    </li>`).join('') : '<li class="empty-state"><strong>Mulai proyek pertama</strong><p>Buat proyek, upload bahan video, lalu mulai sesi editing.</p></li>';
  filterList('project');
}
$('#project-list').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-open-project]');
  if (!b) return;
  openSlug = b.dataset.openProject;
  refresh();
});
$('#project-create').addEventListener('submit', async (e) => {
  e.preventDefault();
  const slug = e.target.slug.value.trim();
  try {
    await post('/api/projects', { slug });
    e.target.reset();
    $('#project-search').value = '';
    document.querySelector('.create-project').open = false;
    openSlug = slug;
    refresh();
  } catch (err) {
    banner(err.message);
  }
});

const ROLE_OPTIONS = { video: [['', 'Auto'], ['speech', 'Speech'], ['broll', 'B-roll']], image: [['image', 'Image']] };
function renderProject(p, sessions) {
  $('#project-home').hidden = true;
  $('#project-detail').hidden = false;
  $('#project-title').textContent = p.slug;
  const live = sessions.find((x) => x.slug === p.slug && x.status !== 'exited');
  $('#project-session').textContent = live ? 'Buka terminal' : 'Mulai sesi';
  $('#project-session').dataset.live = live ? '1' : '';
  $('#source-list').innerHTML = p.sources.length ? p.sources.map((x) => {
    const url = `/api/projects/${enc(p.slug)}/sources/${enc(x.id)}/file`;
    const preview = x.kind === 'image' ? `<img src="${url}" alt="" loading="lazy">` : `<video src="${url}#t=0.5" preload="none" muted playsinline></video>`;
    const opts = ROLE_OPTIONS[x.kind].map(([v, l]) => `<option value="${v}"${(x.role ?? '') === v ? ' selected' : ''}>${l}</option>`).join('');
    const size = x.kind === 'video' ? dur(x.probe?.duration) : `${x.probe?.width ?? '?'}×${x.probe?.height ?? '?'}`;
    return `<li class="source" data-id="${esc(x.id)}">
      ${preview}
      <div class="meta"><strong>${esc(x.id)} · ${esc(x.path.split('/').pop())}</strong>
        <span class="muted">${x.origin === 'shared' ? 'shared' : 'project'} · ${esc(size)}${x.roleSource === 'detected' ? ' · deteksi agen' : ''}</span>
        <label>Peran <select data-role${x.kind === 'image' ? ' disabled' : ''}>${opts}</select></label>
        <label>Catatan <input data-note value="${esc(x.note)}" maxlength="500" placeholder="mis. pakai waktu bahas harga"></label></div>
      <div class="actions"><button class="danger" data-remove="${esc(x.id)}">${x.origin === 'shared' ? 'Lepas' : 'Hapus'}</button></div>
    </li>`;
  }).join('') : '<li class="muted">Belum ada sumber. Upload video/gambar atau tambah dari Shared.</li>';
}

$('#project-back').addEventListener('click', () => { openSlug = ''; refresh(); });
$('#source-upload').addEventListener('change', () => uploadFiles($('#source-upload'), `/api/projects/${enc(openSlug)}/sources`, $('#source-progress')));
$('#source-list').addEventListener('change', async (e) => {
  const li = e.target.closest('li[data-id]');
  const body = e.target.matches('[data-role]') ? { role: e.target.value || 'auto' } : e.target.matches('[data-note]') ? { note: e.target.value } : null;
  if (!li || !body) return;
  try {
    await api(`/api/projects/${enc(openSlug)}/sources/${enc(li.dataset.id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  } catch (err) {
    banner(err.message);
  }
  refresh();
});
$('#source-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-remove]');
  if (!b || !confirm(`${b.textContent} sumber ${b.dataset.remove}?`)) return;
  try {
    await api(`/api/projects/${enc(openSlug)}/sources/${enc(b.dataset.remove)}`, { method: 'DELETE' });
    refresh();
  } catch (err) {
    banner(err.message);
  }
});
$('#project-attach').addEventListener('click', async () => {
  let items;
  try {
    items = await api('/api/shared');
  } catch (err) {
    return banner(err.message);
  }
  $('#attach-list').innerHTML = items.length ? items.map((f) => `<li><label><input type="checkbox" value="${esc(f.name)}"${f.projects.includes(openSlug) ? ' checked disabled' : ''}> ${esc(f.name)} <span class="muted">${f.kind === 'video' ? dur(f.duration) : 'image'}</span></label></li>`).join('') : '<li class="muted">Shared library kosong.</li>';
  $('#attach-error').textContent = '';
  $('#attach-dialog').showModal();
});
$('#attach-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'attach') return;
  e.preventDefault();
  const names = [...document.querySelectorAll('#attach-list input:checked:not(:disabled)')].map((i) => i.value);
  if (!names.length) return $('#attach-dialog').close();
  try {
    await post(`/api/projects/${enc(openSlug)}/shared`, { names });
    $('#attach-dialog').close();
    refresh();
  } catch (err) {
    $('#attach-error').textContent = err.message;
  }
});
$('#project-session').addEventListener('click', () => ($('#project-session').dataset.live ? openTerminal(openSlug) : openEdit(openSlug)));
$('#project-delete').addEventListener('click', async () => {
  if (!confirm(`Hapus permanen videos/${openSlug}/ beserta render dan sesi agennya? File di shared/ tidak ikut terhapus.`)) return;
  try {
    await api(`/api/projects/${enc(openSlug)}`, { method: 'DELETE' });
    openSlug = '';
    refresh();
  } catch (err) {
    banner(err.message);
  }
});

// ---- Shared ----
function renderShared(items) {
  $('#shared-list').innerHTML = items.length ? items.map((f) => `
    <li>
      <div class="meta"><strong>${esc(f.name)}</strong><span class="muted">${f.kind === 'video' ? dur(f.duration) : 'image'} · ${mb(f.size)} · ${f.projects.length ? `dipakai: ${f.projects.map(esc).join(', ')}` : 'belum dipakai'}</span></div>
      <div class="actions"><button class="danger" data-delete-shared="${esc(f.name)}">Hapus</button></div>
    </li>`).join('') : '<li class="muted">Shared library kosong.</li>';
}
$('#shared-upload').addEventListener('change', () => uploadFiles($('#shared-upload'), '/api/shared', $('#shared-progress')));
$('#shared-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-delete-shared]');
  if (!b || !confirm(`Hapus permanen shared/${b.dataset.deleteShared}?`)) return;
  try {
    await api(`/api/shared/${enc(b.dataset.deleteShared)}`, { method: 'DELETE' });
    refresh();
  } catch (err) {
    banner(err.message);
  }
});

// ---- Edit ----
// Models come from the runtimes themselves (~/.codex/models_cache.json, Claude aliases + cached options).
const runtimeModels = () => state.models[$('#edit-form').runtime.value] || { models: [] };
function fillModelOptions() {
  const f = $('#edit-form');
  const rt = runtimeModels();
  f.model.innerHTML = rt.models.map((m) => `<option value="${esc(m.value)}">${esc(m.label)}</option>`).join('');
  f.model.value = rt.default;
  if (!f.model.value && rt.models[0]) f.model.value = rt.models[0].value;
  fillEffortOptions();
}
function fillEffortOptions() {
  const f = $('#edit-form');
  const rt = runtimeModels();
  const model = rt.models.find((m) => m.value === f.model.value);
  const efforts = model?.efforts || [];
  f.effort.innerHTML = efforts.map((x) => `<option>${esc(x)}</option>`).join('');
  const preferred = [f.model.value === rt.default && rt.defaultEffort, model?.defaultEffort, 'high'].find((e) => e && efforts.includes(e));
  f.effort.value = preferred || efforts[0] || '';
}
$('#edit-form').runtime.addEventListener('change', fillModelOptions);
$('#edit-form').model.addEventListener('change', fillEffortOptions);

let editSlug = '';
async function openEdit(slug) {
  try {
    state = await api('/api/state'); // fresh model lists every time the form opens
  } catch (e) {
    return banner(e.message);
  }
  editSlug = slug;
  const f = $('#edit-form');
  f.reset();
  $('#edit-slug').textContent = `videos/${slug}/`;
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
    const s = await post('/api/sessions', { slug: editSlug, runtime: f.runtime.value, model: f.model.value, effort: f.effort.value, notes: f.notes.value, motion: f.motion.value });
    $('#edit-dialog').close();
    openTerminal(s.slug);
  } catch (err) {
    $('#edit-error').textContent = err.message;
  }
});

// ---- Sessions ----
function renderSessions(items) {
  $('#session-list').innerHTML = items.length ? items.map((s) => `
    <li>
      <div class="meta"><strong>${esc(s.slug)}</strong><span class="status ${esc(s.status)}">${esc(s.status)}</span>
        <span class="muted">${esc(s.runtime)} · ${esc(s.model)} · ${esc(s.effort)}</span></div>
      <div class="actions"><button data-open="${esc(s.slug)}">Buka terminal</button><button data-esc="${esc(s.slug)}">Esc</button><button class="danger" data-kill="${esc(s.slug)}">Akhiri sesi</button></div>
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
    <li data-search="${esc(`${r.slug} ${r.file}`.toLowerCase())}">
      <div class="meta"><strong>${esc(r.slug)}</strong><span class="muted">${esc(r.file)} · ${mb(r.size)} · ${when(r.mtime)}</span>
        ${r.publish ? `<span class="muted">Publish ${esc(when(r.publish.createdAt))}: ${r.publish.platforms.map((p) => `${esc(p.platform)} ${esc(p.status)}`).join(', ')}</span>` : ''}</div>
      <video controls preload="none" playsinline aria-label="Hasil video ${esc(r.slug)}" src="/media/${enc(r.slug)}/${enc(r.file)}"></video>
      <div class="actions"><button data-publish="${esc(r.slug)}" data-file="${esc(r.file)}">Atur jadwal</button><a class="btn" href="/media/${enc(r.slug)}/${enc(r.file)}" target="_blank" rel="noopener">Buka video</a></div>
    </li>`).join('') : '<li class="empty-state"><strong>Hasil video akan muncul di sini</strong><p>Selesaikan editing atau Generate, lalu review render sebelum menjadwalkan.</p></li>';
  filterList('result');
}

function filterList(kind) {
  const query = $(`#${kind}-search`).value.trim().toLowerCase();
  const rows = [...document.querySelectorAll(`#${kind}-list > li[data-search]`)];
  let count = 0;
  for (const row of rows) { row.hidden = !row.dataset.search.includes(query); if (!row.hidden) count++; }
  $(`#${kind}-count`).textContent = `${count}${query ? ` dari ${rows.length}` : ''} ${kind === 'project' ? 'proyek' : 'hasil render'}`;
  $(`#${kind}-no-match`).hidden = !query || count > 0 || rows.length === 0;
}
for (const kind of ['project', 'result']) $(`#${kind}-search`).addEventListener('input', () => filterList(kind));
document.querySelectorAll('[data-clear-search]').forEach((b) => b.addEventListener('click', () => {
  const input = $(`#${b.dataset.clearSearch}`); input.value = ''; input.dispatchEvent(new Event('input')); input.focus();
}));

const wibDate = (d = new Date()) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
function updatePublishTime() {
  const scheduled = $('#publish-mode').value === 'scheduled';
  $('#publish-date-fields').hidden = !scheduled;
  $('#publish-date').required = $('#publish-time').required = scheduled;
  $('#publish-date').disabled = $('#publish-time').disabled = !scheduled;
  $('#publish-go').textContent = scheduled ? 'Konfirmasi jadwal' : 'Konfirmasi publish';
  const value = `${$('#publish-date').value}T${$('#publish-time').value}:00+07:00`;
  $('#publish-time-summary').textContent = scheduled && Number.isFinite(new Date(value).getTime()) ? `Tayang ${when(value)}` : scheduled ? 'Pilih tanggal dan jam tayang.' : 'Upload dan pengiriman ke Repliz dimulai setelah konfirmasi.';
}
for (const id of ['publish-mode', 'publish-date', 'publish-time']) $(`#${id}`).addEventListener('change', updatePublishTime);

let publishTarget = null;
let publishBusy = false;
async function openPublish(slug, file, date) {
  if (publishBusy) { $('#publish-dialog').showModal(); return; }
  const target = { slug, file };
  try {
    const p = await api(`/api/results/${enc(slug)}/publish-preview?file=${enc(file)}`);
    publishTarget = target;
    $('#publish-file').textContent = `${p.slug} · ${p.file}`;
    $('#publish-targets').textContent = p.targets.length ? `Target: ${p.targets.join(', ')}` : 'Target akun belum dikonfigurasi.';
    $('#publish-caption').textContent = `${p.title || ''}\n\n${p.description || '(Caption belum ada. Lengkapi publish-captions.md dulu.)'}`;
    $('#publish-settings').querySelectorAll('input, select').forEach((el) => { el.disabled = false; });
    $('#publish-date').min = wibDate();
    $('#publish-date').value = date || wibDate(new Date(Date.now() + 86400_000));
    $('#publish-time').value = '09:00';
    if (date === wibDate()) {
      const soon = new Date(Date.now() + 10 * 60_000 + 7 * 3600_000).toISOString();
      $('#publish-date').value = soon.slice(0, 10); $('#publish-time').value = soon.slice(11, 16);
    }
    $('#publish-mode').value = 'scheduled';
    updatePublishTime();
    $('#publish-log').hidden = true; $('#publish-log').textContent = '';
    $('#publish-error').textContent = !p.targets.length ? 'Target akun belum dikonfigurasi.' : !p.description ? 'Caption belum tersedia. Lengkapi caption sebelum menjadwalkan.' : '';
    $('#publish-go').disabled = !p.targets.length || !p.description;
    $('#publish-dialog').showModal();
  } catch (err) { banner(err.message); }
}
$('#result-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-publish]');
  if (!b) return;
  await openPublish(b.dataset.publish, b.dataset.file);
});
$('#publish-form').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'publish') return;
  e.preventDefault();
  if (publishBusy || !publishTarget) return;
  $('#publish-go').disabled = true;
  $('#publish-error').textContent = '';
  try {
    const scheduleAt = $('#publish-mode').value === 'now' ? 'now' : new Date(`${$('#publish-date').value}T${$('#publish-time').value}:00+07:00`).toISOString();
    if (scheduleAt !== 'now' && new Date(scheduleAt).getTime() < Date.now() + 60_000) throw new Error('Pilih tanggal dan jam setidaknya satu menit dari sekarang.');
    publishBusy = true;
    await post(`/api/results/${enc(publishTarget.slug)}/publish`, { file: publishTarget.file, scheduleAt });
    $('#publish-settings').querySelectorAll('input, select').forEach((el) => { el.disabled = true; });
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
      publishBusy = false;
      $('#publish-error').textContent = JSON.parse(ev.data).code ? 'Proses belum berhasil. Periksa log di atas sebelum mencoba lagi.' : '';
      refresh();
    });
  } catch (err) {
    publishBusy = false;
    $('#publish-error').textContent = err.message;
    $('#publish-go').disabled = false;
  }
});

// ---- Voice test (blind; ADR-0023) ----
const CRITERIA = [
  ['natural', 'Natural (tidak robotik)'],
  ['pronunciation', 'Ucapan istilah Inggris & angka'],
  ['register', 'Cocok gaya Dena'],
  ['similarity', 'Mirip suara Dena'],
  ['endurance', 'Betah didengar 60 detik'],
];

function renderVoiceTests(runs) {
  $('#voice-home').hidden = false;
  $('#voice-detail').hidden = true;
  $('#voice-list').innerHTML = runs.length ? runs.map((r) => `
    <li>
      <div class="meta"><strong>${esc(r.id)}</strong><span class="muted">${r.labels.length} sampel${r.hasRef ? ' + referensi' : ''} · ${r.rated ? 'sudah dinilai' : 'belum dinilai'}</span></div>
      <div class="actions"><button class="primary" data-run="${esc(r.id)}">Buka</button></div>
    </li>`).join('') : '<li class="muted"><span>Belum ada uji dengar. Jalankan <code>npm run voice -- test build</code>.</span></li>';
}

function scoreSelect(label, key, text, value) {
  const opts = [1, 2, 3, 4, 5].map((n) => `<option value="${n}"${value === n ? ' selected' : ''}>${n}</option>`).join('');
  return `<label>${esc(text)}<select data-label="${esc(label)}" data-key="${key}"><option value="">–</option>${opts}</select></label>`;
}

function renderVoiceTest(t) {
  $('#voice-home').hidden = true;
  $('#voice-detail').hidden = false;
  $('#voice-title').textContent = t.id;
  $('#voice-saved').textContent = t.savedAt ? `Tersimpan ${when(t.savedAt)}` : '';
  const files = `/api/voice-tests/${enc(t.id)}/files`;
  $('#voice-ref').innerHTML = t.hasRef ? `<p><strong>Referensi: suara asli Dena</strong></p><audio controls preload="none" src="${files}/ref.wav"></audio>` : '';
  const r = t.ratings || {};
  $('#voice-samples').innerHTML = t.labels.map((l) => `
    <li>
      <div class="meta"><strong>Sampel ${esc(l)}</strong></div>
      <audio controls preload="none" src="${files}/${enc(l)}.wav"></audio>
      <div class="scores">${CRITERIA.map(([k, text]) => scoreSelect(l, k, text, r[l]?.[k] ?? null)).join('')}</div>
      <label>Catatan<textarea data-label="${esc(l)}" data-key="note" rows="2" maxlength="1000">${esc(r[l]?.note || '')}</textarea></label>
    </li>`).join('');
}

$('#voice-list').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-run]');
  if (!b) return;
  openRun = b.dataset.run;
  refresh();
});
$('#voice-back').addEventListener('click', () => {
  openRun = '';
  refresh();
});
$('#voice-save').addEventListener('click', async () => {
  const ratings = {};
  for (const el of document.querySelectorAll('#voice-samples [data-label]')) {
    const row = (ratings[el.dataset.label] ||= {});
    row[el.dataset.key] = el.dataset.key === 'note' ? el.value : (el.value ? Number(el.value) : null);
  }
  try {
    const saved = await post(`/api/voice-tests/${enc(openRun)}/ratings`, { ratings });
    $('#voice-saved').textContent = `Tersimpan ${when(saved.savedAt)}`;
  } catch (err) {
    banner(err.message);
  }
});

// ---- Music (ADR-0024) ----
function renderMusic(tracks) {
  $('#music-list').innerHTML = tracks.length ? tracks.map((t) => `
    <li class="${t.rejected ? 'rejected' : ''}">
      <div class="meta"><strong>${esc(t.title)}</strong>
        <span class="muted">${esc(t.author)} · ${esc(t.mood.join(', '))} · energi ${t.energy} · ${dur(t.duration)} · ${esc(t.license)}${t.contentIdRisk === 'none' ? '' : ` · Content ID: ${esc(t.contentIdRisk)}`}${t.rejected ? ' · ditolak' : ''}</span>
        ${t.notes ? `<span class="muted">${esc(t.notes)}</span>` : ''}</div>
      <audio controls preload="none" src="/api/music/${enc(t.id)}/file"></audio>
      <div class="actions">
        <button data-reject="${esc(t.id)}" data-value="${t.rejected ? 'false' : 'true'}" class="${t.rejected ? '' : 'danger'}">${t.rejected ? 'Batal tolak' : 'Tolak'}</button>
        <a class="btn" href="${esc(t.sourceUrl)}" target="_blank" rel="noopener">Sumber</a>
      </div>
    </li>`).join('') : '<li class="muted"><span>Pustaka musik kosong. Tambah dengan <code>npm run music -- add</code>.</span></li>';
}

$('#music-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-reject]');
  if (!b) return;
  try {
    await post(`/api/music/${enc(b.dataset.reject)}/reject`, { rejected: b.dataset.value === 'true' });
    refresh();
  } catch (err) {
    banner(err.message);
  }
});

// Helpers for generate.js (ADR-0026).
window.studio = { $, api, post, esc, enc, banner, dur, when, openTerminal, openPublish, showTab, state: () => state, tab: () => tab, termOpen: () => !$('#term-panel').hidden };

// ---- Boot ----
(async () => {
  try {
    state = await api('/api/state');
  } catch (e) {
    return banner(e.message);
  }
  const missing = Object.entries(state.tools).filter(([, ok]) => !ok).map(([t]) => t);
  if (missing.length) banner(`Tidak ditemukan di PATH: ${missing.join(', ')}`);
  const deep = /^#generate(?:\/([a-z0-9][a-z0-9-]*))?$/.exec(location.hash);
  if (deep) {
    showTab('generate', { refreshPage: false });
    window.studioGenerate.open(deep[1] || '');
  } else showTab(Object.hasOwn(PAGES, location.hash.slice(1)) ? location.hash.slice(1) : 'projects');
  // Only the Sessions tab polls; re-rendering Results would reset playing videos.
  setInterval(() => { if (tab === 'sessions' && $('#term-panel').hidden) refresh(); }, 2000);
})();
