// Studio calendar (ADR-0031). WIB is explicit even on devices in another timezone.
(() => {
  const { $, api, esc, when, banner, openPublish, showTab } = window.studio;
  const dateKey = (value = new Date()) => new Date(new Date(value).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  const dayDate = (key) => new Date(`${key}T12:00:00+07:00`);
  const STATUS = { pending: 'Terjadwal', process: 'Diproses', success: 'Tayang', published: 'Tayang', error: 'Gagal', unknown: 'Belum diketahui' };
  const PLATFORMS = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', threads: 'Threads' };
  let selected = dateKey();
  let month = selected.slice(0, 7);
  let data = null;
  let request = 0;
  let renders = [];
  let planningRequest = 0;

  function renderMonth() {
    $('#calendar-month').textContent = dayDate(`${month}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
    const [year, m] = month.split('-').map(Number);
    $('#calendar-prev').disabled = month === '2000-01';
    $('#calendar-next').disabled = month === '2100-12';
    const first = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const counts = new Map();
    for (const e of data?.events || []) { const key = dateKey(e.scheduleAt); counts.set(key, (counts.get(key) || 0) + 1); }
    let html = '<span aria-hidden="true"></span>'.repeat(first);
    for (let day = 1; day <= days; day++) {
      const key = `${month}-${String(day).padStart(2, '0')}`;
      const count = counts.get(key) || 0;
      const label = dayDate(key).toLocaleDateString('id-ID', { dateStyle: 'full', timeZone: 'Asia/Jakarta' });
      html += `<button class="calendar-day${key === dateKey() ? ' today' : ''}" data-date="${key}" tabindex="${key === selected ? '0' : '-1'}" aria-pressed="${key === selected}" aria-label="${esc(label)}${count ? `, ${count} jadwal` : ', belum ada jadwal'}"><span class="day-number">${day}</span>${count ? `<span class="day-events" aria-hidden="true"></span><span class="day-count" aria-hidden="true">${count} jadwal</span>` : ''}</button>`;
    }
    $('#calendar-grid').innerHTML = html;
    renderAgenda();
  }

  function renderAgenda() {
    $('#calendar-day-title').textContent = dayDate(selected).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });
    const events = (data?.events || []).filter((e) => dateKey(e.scheduleAt) === selected);
    $('#calendar-events').innerHTML = events.length ? events.map((e) => `<li>
      <time datetime="${esc(e.scheduleAt)}">${new Date(e.scheduleAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB · ${esc(PLATFORMS[e.platform] || e.platform)}</time>
      <strong>${esc(e.title)}</strong><span class="status ${Object.hasOwn(STATUS, e.status) ? e.status : ''}">${esc(Object.hasOwn(STATUS, e.status) ? STATUS[e.status] : e.status)}</span>
      <span class="muted">${e.source === 'repliz' ? 'Repliz' : 'Receipt lokal · sinkronkan untuk status terbaru'}${e.account ? ` · ${esc(e.account)}` : ''}</span>
      ${e.slug ? `<div class="actions"><button data-calendar-results="${esc(e.slug)}">Lihat hasil</button></div>` : ''}
    </li>`).join('') : '<li class="muted">Belum ada jadwal pada tanggal ini. Pilih hasil render untuk menambahkan konten.</li>';
    $('#calendar-plan').disabled = selected < dateKey();
    $('#calendar-plan').title = selected < dateKey() ? 'Pilih hari ini atau tanggal berikutnya.' : '';
    $('#calendar-render-form').hidden = true;
    planningRequest++;
  }

  async function refresh(sync = false) {
    const current = ++request;
    const requestedMonth = month;
    $('#calendar-grid').setAttribute('aria-busy', 'true');
    $('#calendar-sync').disabled = true;
    $('#calendar-status').textContent = sync ? 'Menyinkronkan jadwal dari Repliz…' : 'Memuat kalender…';
    try {
      const result = await api(`/api/calendar?month=${requestedMonth}${sync ? '&sync=1' : ''}`);
      if (current !== request) return;
      data = result;
      const messages = [result.warning, result.stale ? 'Snapshot Repliz belum diperbarui; tanggal/status mungkin sudah berubah.' : '', result.partial ? 'Hasil sinkronisasi parsial (batas 1.000 jadwal). Sebagian konten mungkin belum terlihat.' : '', result.undated ? `${result.undated} receipt lama belum memiliki tanggal. Sinkronkan Repliz untuk mencocokkannya.` : ''].filter(Boolean);
      $('#calendar-warning').textContent = messages.join(' ');
      $('#calendar-warning').hidden = !messages.length;
      $('#calendar-sync').textContent = 'Sinkronkan Repliz';
      $('#calendar-sync').disabled = !result.configured;
      $('#calendar-status').textContent = `${result.events.length} jadwal bulan ini · WIB${result.syncedAt ? ` · Sinkronisasi terakhir ${when(result.syncedAt)}` : ' · Receipt lokal; sinkronkan untuk jadwal terbaru'}`;
      const focused = document.activeElement?.dataset?.date;
      renderMonth();
      if (focused && focused.slice(0, 7) === month) $(`[data-date="${focused}"]`).focus();
    } catch (e) {
      if (current !== request) return;
      if (data?.month !== month) data = { month, events: [] };
      $('#calendar-status').textContent = 'Kalender belum berhasil dimuat.';
      $('#calendar-warning').hidden = false;
      $('#calendar-warning').textContent = `${e.message} Coba buka kembali Kalender atau sinkronkan.`;
      $('#calendar-sync').disabled = false;
      renderMonth();
    } finally { if (current === request) $('#calendar-grid').setAttribute('aria-busy', 'false'); }
  }

  function moveMonth(delta) {
    const [year, m] = month.split('-').map(Number);
    const next = new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7);
    if (next < '2000-01' || next > '2100-12') return;
    month = next; selected = `${month}-01`; data = null;
    renderMonth(); refresh();
  }
  $('#calendar-prev').addEventListener('click', () => moveMonth(-1));
  $('#calendar-next').addEventListener('click', () => moveMonth(1));
  $('#calendar-today').addEventListener('click', () => { selected = dateKey(); month = selected.slice(0, 7); renderMonth(); refresh(); });
  $('#calendar-sync').addEventListener('click', () => refresh(true));
  $('#calendar-grid').addEventListener('click', (e) => {
    const button = e.target.closest('[data-date]');
    if (!button) return;
    selected = button.dataset.date; renderMonth();
    $(`[data-date="${selected}"]`).focus();
  });
  $('#calendar-grid').addEventListener('keydown', (e) => {
    const button = e.target.closest('[data-date]');
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!button || !offset) return;
    e.preventDefault();
    const next = new Date(dayDate(button.dataset.date).getTime() + offset * 86400_000);
    const key = dateKey(next);
    if (key.slice(0, 7) < '2000-01' || key.slice(0, 7) > '2100-12') return;
    selected = key;
    if (key.slice(0, 7) !== month) { month = key.slice(0, 7); data = null; refresh(); }
    renderMonth(); $(`[data-date="${selected}"]`).focus();
  });
  $('#calendar-events').addEventListener('click', (e) => {
    const button = e.target.closest('[data-calendar-results]');
    if (!button) return;
    $('#result-search').value = button.dataset.calendarResults; showTab('results');
  });
  $('#calendar-plan').addEventListener('click', async () => {
    const current = ++planningRequest;
    const date = selected;
    $('#calendar-plan').disabled = true;
    try {
      renders = await api('/api/results');
      if (date !== selected || current !== planningRequest) return;
      $('#calendar-render').innerHTML = renders.map((r, i) => `<option value="${i}">${esc(r.slug)} · ${esc(r.file)}</option>`).join('');
      $('#calendar-render-hint').textContent = renders.length ? 'Lanjut untuk memilih jam dan mengecek caption.' : 'Belum ada render. Selesaikan video di Proyek atau Generate terlebih dahulu.';
      $('#calendar-render-go').disabled = !renders.length;
      $('#calendar-render-form').hidden = false;
      if (renders.length) $('#calendar-render').focus();
    } catch (e) { banner(e.message); }
    finally { $('#calendar-plan').disabled = selected < dateKey(); }
  });
  $('#calendar-plan-cancel').addEventListener('click', () => { $('#calendar-render-form').hidden = true; $('#calendar-plan').focus(); });
  $('#calendar-render-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const render = renders[Number($('#calendar-render').value)];
    if (render) openPublish(render.slug, render.file, selected);
  });
  window.studioCalendar = { refresh };
})();
