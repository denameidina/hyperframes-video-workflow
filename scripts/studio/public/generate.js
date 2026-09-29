// Studio tab Generate (ADR-0026, RD-05-21..29): start a generate-mode video, then answer its gates.
// Plain JS, no build step; helpers come from app.js (window.studio).
(() => {
  const { $, api, post, esc, enc, banner, dur, openTerminal } = window.studio;
  const PHASE = { story: 'Story berjalan', 'screen-plan': 'Screen Plan berjalan', build: 'Build berjalan', done: 'Selesai', error: 'Error' };
  const STATE = { waiting: 'Menunggu', revising: 'Agent merevisi', qa: 'QA dulu' };
  let openSlug = '';
  let bodyKey = '';
  let detail = null;
  let pending = null; // { gate, decision } while the note dialog is open
  let followingVoice = ''; // slug whose voice-job log is attached

  const statusText = (s) => (s.phase === 'gate' ? `${STATE[s.state] || 'Menunggu'} · Gate ${s.gate}` : PHASE[s.phase] || s.phase);
  const sessionText = (x) => (x ? x.status : 'tidak ada sesi');
  const media = (slug, file, fp) => `/media/${enc(slug)}/${file}${fp ? `?v=${enc(fp.slice(0, 12))}` : ''}`;
  const setHash = (h) => { if (location.hash !== h) history.replaceState(null, '', h); };

  async function refresh() {
    if (openSlug) renderDetail(await api(`/api/generate/${enc(openSlug)}`));
    else renderList(await api('/api/generate'));
  }

  function home() {
    openSlug = '';
    bodyKey = '';
    setHash('#generate');
  }

  function open(slug) {
    if (slug === 'new') {
      home();
      refresh().catch((e) => banner(e.message));
      openForm();
      return;
    }
    openSlug = slug;
    bodyKey = '';
    setHash(slug ? `#generate/${slug}` : '#generate');
    refresh().catch((e) => banner(e.message));
  }

  // ---- list ----
  function renderList(items) {
    $('#gen-detail').hidden = true;
    $('#gen-home').hidden = false;
    $('#gen-list').innerHTML = items.length ? items.map((p) => `
      <li>
        <div class="meta"><strong>${esc(p.slug)}</strong><span class="status ${esc(p.session?.status || '')}">${esc(statusText(p.status))}</span>
          <span class="muted">${esc(p.brief)}</span><span class="muted">Sesi: ${esc(sessionText(p.session))}</span></div>
        <div class="actions"><button class="primary" data-gen-open="${esc(p.slug)}">Buka</button></div>
      </li>`).join('') : '<li class="muted">Belum ada video generate. Tekan "Buat video".</li>';
  }
  $('#gen-list').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-gen-open]');
    if (b) open(b.dataset.genOpen);
  });

  // ---- panel ----
  function gate1(d) {
    const g = d.gate1;
    const v = g.voice;
    return `
      <section class="gen-card"><h3>Suara</h3>
        ${g.audio ? `<audio controls preload="none" src="${media(d.slug, 'processed-audio.wav', d.status.fingerprint?.['processed-audio.wav'])}"></audio>` : ''}
        <p class="muted">${v ? `${dur(v.duration)} · ${esc(v.preset)}${v.wer !== null ? ` · WER ${esc(v.wer)}` : ''}` : 'meta suara belum ada'}</p>
        ${d.status.voiceStale ? '<p class="warn">Naskah berubah setelah suara dibuat. Buat ulang suara sebelum menyetujui.</p>' : ''}
      </section>
      <section class="gen-card"><h3>Naskah</h3>
        <div id="gen-script-view">${g.paragraphs.map((p, i) => `<p${i === 0 ? ' class="hook"' : ''}>${esc(p)}</p>`).join('')}
          ${g.facts ? `<details><summary>Fakta</summary><pre>${esc(g.facts)}</pre></details>` : ''}</div>
        <form id="gen-script-form" hidden><textarea name="text" rows="14">${esc(g.script)}</textarea>
          <menu><button type="button" data-gen="edit-cancel">Batal</button><button class="primary">Simpan naskah</button></menu></form>
        <div class="actions"><button data-gen="edit">Edit naskah</button><button data-gen="voice">Buat ulang suara</button></div>
        <pre id="gen-voice-log" hidden></pre>
      </section>`;
  }

  function gate2(d) {
    const g = d.gate2;
    return `
      <section class="gen-card"><h3>Storyboard</h3>
        ${g.sheets.map((s) => `<a href="${media(d.slug, s)}" target="_blank" rel="noopener"><img class="sheet" alt="${esc(s)}" src="${media(d.slug, s, d.status.fingerprint?.[s])}"></a>`).join('') || '<p class="muted">Belum ada sheet.</p>'}
      </section>
      <section class="gen-card"><h3>Scene</h3>
        <ol class="scenes">${g.rows.map((r) => `<li><strong>${r.n}. ${esc(r.time)}</strong> <span class="muted">${esc(r.style)}</span><span>${esc(r.what)}</span><span class="muted">“${esc(r.words)}” · ${esc(r.example)}</span></li>`).join('')}</ol>
      </section>
      <section class="gen-card"><h3>Style World</h3><pre>${esc(g.styleWorld || '–')}</pre></section>
      <section class="gen-card"><h3>Musik</h3><pre>${esc(g.music || '–')}</pre>
        ${g.musicTrack ? `<audio controls preload="none" src="/api/music/${enc(g.musicTrack)}/file"></audio>` : ''}</section>`;
  }

  function gate3(d) {
    const g = d.gate3;
    return `
      <section class="gen-card"><h3>Render</h3>
        ${g.render ? `<video controls preload="metadata" playsinline src="/media/${enc(d.slug)}/${enc(g.render)}?v=${enc((d.status.fingerprint?.[`renders/${g.render}`] || '').slice(0, 12))}"></video>` : '<p class="muted">Belum ada render.</p>'}
      </section>
      ${g.deviations ? `<section class="gen-card"><h3>Perubahan dari rencana</h3><pre>${esc(g.deviations)}</pre></section>` : ''}
      ${g.risks ? `<section class="gen-card"><h3>Risiko</h3><pre>${esc(g.risks)}</pre></section>` : ''}
      ${g.qaReport ? '<p class="muted">Laporan QA ada: <code>qa-report.md</code> di folder proyek.</p>' : ''}`;
  }

  function running(d) {
    const s = d.status;
    if (s.phase === 'done') return `<section class="gen-card"><p>Selesai. Publish lewat <button data-gen="results">tab Results</button>.</p></section>${gate3(d)}`;
    return `<section class="gen-card"><p>Agent sedang mengerjakan: ${esc(PHASE[s.phase] || s.phase)}…</p>
      <p class="muted">Buka Terminal untuk melihat prosesnya.</p></section>`;
  }

  function renderDetail(d) {
    detail = d;
    $('#gen-home').hidden = true;
    $('#gen-detail').hidden = false;
    const s = d.status;
    const live = d.session && d.session.status !== 'exited';
    $('#gen-head').innerHTML = `<button data-gen="back">← Generate</button><strong>${esc(d.slug)}</strong>
      <span class="status ${esc(d.session?.status || '')}">${esc(statusText(s))}</span><span class="muted">Sesi: ${esc(sessionText(d.session))}</span>
      ${live ? '<button data-gen="terminal">Terminal</button>' : '<button data-gen="session" class="primary">Mulai sesi lanjut</button>'}`;
    // redraw the body only when what it shows changed: a playing player survives polling, an open editor is never
    // redrawn under Dena's typing (RD-05-29)
    const voiceBusy = Boolean(d.voiceJob?.running);
    const key = JSON.stringify([s.phase, s.gate, s.fingerprint, s.voiceStale, voiceBusy, d.gate2.rows.length, d.gate3.render]);
    const editing = $('#gen-script-form') && !$('#gen-script-form').hidden;
    if (key !== bodyKey && !editing) {
      bodyKey = key;
      $('#gen-body').innerHTML = s.phase === 'gate' ? { 1: gate1, 2: gate2, 3: gate3 }[s.gate](d) : running(d);
      if (voiceBusy) for (const b of document.querySelectorAll('[data-gen="edit"], [data-gen="voice"]')) b.disabled = true;
    }
    if (voiceBusy && followingVoice !== d.slug) followVoice(d.slug); // re-attach the log after a reload
    $('#gen-history-list').innerHTML = s.log.slice().reverse().map((e) => `<li><strong>Gate ${esc(e.gate)} ${esc(e.decision)}</strong> <span class="muted">${esc(e.by)} · ${esc(new Date(e.at).toLocaleString('id-ID'))}</span>${e.note ? `<br>${esc(e.note)}` : ''}</li>`).join('') || '<li class="muted">Belum ada keputusan.</li>';
    renderActions(d);
  }

  function renderActions(d) {
    const s = d.status;
    const bar = $('#gen-actions');
    if (s.phase !== 'gate') {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    const voiceBusy = Boolean(d.voiceJob?.running);
    const busy = d.session?.status === 'running' || voiceBusy;
    const label = voiceBusy ? 'Suara sedang dibuat ulang…'
      : s.state === 'revising' ? (busy ? 'Agent merevisi…' : 'Agent selesai tanpa mengubah artefak — cek terminal')
      : s.state === 'qa' ? 'QA berjalan — putuskan setelah laporan QA' : busy ? 'Agent masih bekerja…' : '';
    const canApprove = !busy && !(s.gate === 1 && s.voiceStale);
    bar.innerHTML = `${label ? `<span class="muted">${esc(label)}</span>` : ''}
      <button data-gen="revise"${busy ? ' disabled' : ''}>Revisi</button>
      ${s.gate === 3 ? `<button data-gen="qa"${busy ? ' disabled' : ''}>QA dulu</button>` : ''}
      <button class="primary" data-gen="approve"${canApprove ? '' : ' disabled'}>Setuju</button>`;
  }

  function askNote(gate, decision) {
    pending = { gate, decision };
    const f = $('#gen-note-form');
    f.reset();
    $('#gen-note-title').textContent = { approve: `Setujui Gate ${gate}`, revise: `Revisi Gate ${gate}`, qa: 'QA dulu (Gate 3)' }[decision];
    $('#gen-note-label').firstChild.textContent = decision === 'revise' ? 'Apa yang harus diubah? (wajib) ' : 'Catatan (opsional) ';
    f.note.required = decision === 'revise';
    $('#gen-note-error').textContent = '';
    $('#gen-note-dialog').showModal();
  }

  $('#gen-note-form').addEventListener('submit', async (e) => {
    if (e.submitter?.value !== 'send') return;
    e.preventDefault();
    try {
      const r = await post(`/api/generate/${enc(detail.slug)}/decision`, { ...pending, note: e.target.note.value, fingerprint: detail.status.fingerprint });
      $('#gen-note-dialog').close();
      banner(r.sent ? '' : `Keputusan tercatat, tapi belum terkirim ke agent: ${r.error}`);
      bodyKey = '';
      refresh();
    } catch (err) {
      $('#gen-note-error').textContent = err.message;
    }
  });

  function followVoice(slug) {
    followingVoice = slug;
    const log = $('#gen-voice-log');
    if (log) {
      log.hidden = false;
      log.textContent = '';
    }
    const es = new EventSource(`/api/generate/${enc(slug)}/voice/stream`);
    es.addEventListener('log', (ev) => {
      const el = $('#gen-voice-log');
      if (!el) return;
      el.textContent += JSON.parse(ev.data);
      el.scrollTop = el.scrollHeight;
    });
    es.addEventListener('done', (ev) => {
      const code = JSON.parse(ev.data).code;
      es.close();
      followingVoice = '';
      banner(code === 0 ? '' : `Buat ulang suara gagal (exit ${code}); suara lama tetap dipakai.`);
      bodyKey = '';
      refresh();
    });
  }

  async function startSession() {
    const st = await api('/api/state');
    const rt = st.tools.claude === false ? 'codex' : 'claude';
    const m = st.models[rt] || { models: [] };
    const model = m.default || m.models[0]?.value;
    const effort = m.models.find((x) => x.value === model)?.efforts?.includes('high') ? 'high' : m.models.find((x) => x.value === model)?.efforts?.[0];
    await post(`/api/generate/${enc(detail.slug)}/session`, { runtime: rt, model, effort });
    openTerminal(detail.slug);
  }

  $('#gen-detail').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-gen]');
    if (!b) return;
    const act = b.dataset.gen;
    try {
      if (act === 'back') { home(); refresh(); }
      if (act === 'results') document.querySelector('nav button[data-tab="results"]').click();
      if (act === 'terminal') openTerminal(detail.slug);
      if (act === 'session') await startSession();
      if (act === 'approve' || act === 'revise' || act === 'qa') askNote(detail.status.gate, act);
      if (act === 'edit' || act === 'edit-cancel') {
        $('#gen-script-form').hidden = act === 'edit-cancel';
        $('#gen-script-view').hidden = act === 'edit';
      }
      if (act === 'voice') {
        await post(`/api/generate/${enc(detail.slug)}/voice`);
        followVoice(detail.slug);
      }
    } catch (err) {
      banner(err.message);
    }
  });

  $('#gen-detail').addEventListener('submit', async (e) => {
    if (e.target.id !== 'gen-script-form') return;
    e.preventDefault();
    try {
      await api(`/api/generate/${enc(detail.slug)}/script`, { method: 'PUT', body: JSON.stringify({ text: e.target.text.value }) });
      e.target.hidden = true; // saved: the body may redraw again
      banner('Naskah tersimpan. Tekan "Buat ulang suara" sebelum menyetujui.');
      bodyKey = '';
      refresh();
    } catch (err) {
      banner(err.message);
    }
  });

  // ---- form ----
  const slugify = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 5).join('-').slice(0, 40).replace(/-+$/, '');
  let slugTouched = false;
  const opt = (value, label) => `<option value="${esc(value)}">${esc(label)}</option>`;

  function fillModels(f) {
    const st = window.studio.state();
    const rt = st.models[f.runtime.value] || { models: [] };
    f.model.innerHTML = rt.models.map((m) => opt(m.value, m.label)).join('');
    f.model.value = rt.default || rt.models[0]?.value || '';
    const efforts = rt.models.find((m) => m.value === f.model.value)?.efforts || [];
    f.effort.innerHTML = efforts.map((x) => opt(x, x)).join('');
    f.effort.value = efforts.includes('high') ? 'high' : efforts[0] || '';
  }

  async function openForm() {
    try {
      const [o, st] = await Promise.all([api('/api/generate/options'), api('/api/state')]);
      Object.assign(window.studio.state(), st);
      const f = $('#gen-form');
      f.reset();
      slugTouched = false;
      f.repurpose.innerHTML = opt('', '—') + o.repurpose.map((s) => opt(s, s)).join('');
      f.voice.innerHTML = opt('', `otomatis${o.defaultVoice ? ` (default ${o.defaultVoice})` : ''}`) + o.voices.map((v) => opt(v.name, `${v.name} · ${v.provider}`)).join('');
      f.style.innerHTML = opt('', 'otomatis') + o.styles.map((s) => opt(s, s)).join('');
      f.music.innerHTML = opt('', 'otomatis') + o.music.map((m) => opt(m.id, `${m.title} · ${(m.mood || []).join(', ')} · ${dur(m.duration)}`)).join('');
      for (const o2 of f.runtime.options) o2.disabled = st.tools[o2.value] === false;
      f.runtime.value = st.tools.claude === false ? 'codex' : 'claude';
      fillModels(f);
      $('#gen-error').textContent = '';
      $('#gen-dialog').showModal();
    } catch (e) {
      banner(e.message);
    }
  }
  $('#gen-new').addEventListener('click', openForm);
  const form = $('#gen-form');
  form.brief.addEventListener('input', () => { if (!slugTouched) form.slug.value = slugify(form.brief.value); });
  form.slug.addEventListener('input', () => { slugTouched = true; });
  form.runtime.addEventListener('change', () => fillModels(form));
  form.model.addEventListener('change', () => {
    const rt = window.studio.state().models[form.runtime.value] || { models: [] };
    const efforts = rt.models.find((m) => m.value === form.model.value)?.efforts || [];
    form.effort.innerHTML = efforts.map((x) => opt(x, x)).join('');
    form.effort.value = efforts.includes('high') ? 'high' : efforts[0] || '';
  });
  form.addEventListener('submit', async (e) => {
    if (e.submitter?.value !== 'create') return;
    e.preventDefault();
    const f = e.target;
    const urls = f.urls.value.split('\n').map((u) => u.trim()).filter(Boolean);
    try {
      const r = await post('/api/generate', {
        brief: f.brief.value, slug: f.slug.value.trim(), urls, repurpose: f.repurpose.value, voice: f.voice.value,
        duration: f.duration.value, style: f.style.value, music: f.music.value,
        runtime: f.runtime.value, model: f.model.value, effort: f.effort.value,
      });
      $('#gen-dialog').close();
      banner(r.session.started ? '' : `Proyek dibuat, tapi sesi agent gagal dimulai: ${r.session.error}`);
      open(r.slug);
    } catch (err) {
      $('#gen-error').textContent = err.message;
    }
  });

  // ---- polling: status every 3 s while the tab is open, never while a dialog or the terminal is open ----
  setInterval(() => {
    const busyUi = window.studio.termOpen() || $('#gen-dialog').open || $('#gen-note-dialog').open;
    if (window.studio.tab() === 'generate' && !busyUi) refresh().catch((e) => banner(e.message));
  }, 3000);

  window.studioGenerate = { refresh, home, open };
})();
