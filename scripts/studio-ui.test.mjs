// Execute the actual plain-JS UI against a small event/DOM harness. This verifies
// behavior and requests; layout/paint still require the browser (see audit doc).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInContext, createContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
const dir = new URL('./studio/public/', import.meta.url);
const html = readFileSync(new URL('index.html', dir), 'utf8');
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
class Element {
  constructor() { this.handlers = {}; this.dataset = {}; this.attributes = {}; this.hidden = false; this.disabled = false; this.value = ''; this.textContent = ''; this.rows = []; this.classList = { toggle() {} }; }
  set innerHTML(value) {
    this.html = value;
    this.rows = [...value.matchAll(/<li data-search="([^"]+)"/g)].map((m) => { const e = new Element(); e.dataset.search = decode(m[1]); return e; });
  }
  get innerHTML() { return this.html || ''; }
  addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
  dispatchEvent(e) { return this.emit(e.type, e); }
  async emit(type, extra = {}) { for (const f of this.handlers[type] || []) await f({ target: this, preventDefault() {}, ...extra }); }
  setAttribute(k, v) { this.attributes[k] = v; }
  removeAttribute(k) { delete this.attributes[k]; }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  reset() {}
  querySelectorAll() { return this.children || []; }
}
async function ui({ hash = '#calendar', calendar, holdCalendar } = {}) {
  const nodes = new Map([...html.matchAll(/id="([^"]+)"/g)].map((m) => [`#${m[1]}`, new Element()]));
  const nav = [...html.matchAll(/data-tab="([^"]+)"/g)].map((m) => { const e = new Element(); e.dataset.tab = m[1]; return e; });
  for (const id of ['edit-form', 'gen-form']) for (const name of ['runtime', 'model', 'effort', 'notes', 'slug']) nodes.get(`#${id}`)[name] = new Element();
  nodes.set('.keys', new Element()); nodes.set('.create-project', new Element());
  nodes.get('#publish-settings').children = ['publish-mode', 'publish-date', 'publish-time'].map((id) => nodes.get(`#${id}`));
  const requests = []; const publishes = []; const streams = [];
  const snapshot = calendar || { month: '2026-10', events: [{ id: 's1', slug: 'one', title: '<script>bad</script>', platform: 'instagram', status: 'pending', scheduleAt: '2026-10-02T02:00:00Z', source: 'repliz' }], configured: true, syncedAt: null, undated: 0 };
  const renders = [{ slug: 'one', file: 'one.mp4', size: 100, mtime: 1 }, { slug: 'two', file: 'two.mp4', size: 100, mtime: 1 }];
  const document = {
    querySelector(s) {
      if (nodes.has(s)) return nodes.get(s);
      const day = /^\[data-date="([^"]+)"\]$/.exec(s);
      if (day && nodes.get('#calendar-grid').innerHTML.includes(`data-date="${day[1]}"`)) { const e = new Element(); e.dataset.date = day[1]; return e; }
      throw Error(`Unknown selector ${s}`);
    },
    querySelectorAll(s) {
      if (s === 'nav button') return nav;
      if (s === '[data-clear-search]') return [];
      const rows = /^(#[\w-]+) > li\[data-search\]$/.exec(s);
      if (rows) return nodes.get(rows[1]).rows;
      return [];
    },
  };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-01T00:00:00Z'])); } static now() { return new Date('2026-10-01T00:00:00Z').getTime(); } }
  const window = {};
  const context = createContext({ document, window, Date: Clock, crypto: webcrypto, encodeURIComponent, Event: class { constructor(type) { this.type = type; } }, history: { replaceState() {} }, location: { hash }, setInterval() {}, setTimeout, clearTimeout, console,
    EventSource: class { constructor(url) { this.url = url; this.handlers = {}; streams.push(this); } addEventListener(k, fn) { this.handlers[k] = fn; } close() {} },
    fetch: async (path, opts = {}) => {
      requests.push(path);
      let body;
      if (path === '/api/state') body = { tools: {}, models: {} };
      else if (path === '/api/sessions') body = [];
      else if (path === '/api/projects') body = renders.map((r) => ({ ...r, counts: {}, renders: [] }));
      else if (path === '/api/results') body = renders;
      else if (path.includes('publish-preview')) body = { slug: 'one', file: 'one.mp4', title: 'Titel', description: 'Caption', targets: ['instagram'] };
      else if (path.endsWith('/publish')) { publishes.push(JSON.parse(opts.body)); body = { ok: true }; }
      else if (path.startsWith('/api/calendar')) body = holdCalendar ? await holdCalendar(path) : snapshot;
      else throw Error(`Unexpected request ${path}`);
      return { ok: true, status: 200, json: async () => body };
    },
  });
  runInContext(readFileSync(new URL('app.js', dir), 'utf8'), context);
  const generateCalls = [];
  window.studioGenerate = { home() {}, refresh() { generateCalls.push('refresh'); }, open(slug) { generateCalls.push(`open:${slug}`); } };
  runInContext(readFileSync(new URL('calendar.js', dir), 'utf8'), context);
  await new Promise((r) => setImmediate(r));
  return { window, nodes, requests, publishes, streams, snapshot, context, nav, generateCalls };
}
const clickedDate = (date) => ({ closest: () => ({ dataset: { date } }) });

test('calendar boots without remote sync, renders a Monday-first month and escapes remote text', async () => {
  const app = await ui();
  const { nodes, requests } = app;
  assert.equal(nodes.get('#page-title').textContent, 'Kalender konten');
  assert.equal(nodes.get('#tab-calendar').hidden, false);
  assert.equal(requests.filter((p) => p.includes('/api/calendar')).length, 1);
  assert.ok(!requests.some((p) => p.includes('sync=1')));
  const grid = nodes.get('#calendar-grid').innerHTML;
  assert.equal((grid.match(/<span aria-hidden="true"><\/span>/g) || []).length, 3, 'Oct 1 2026 is Thursday');
  assert.equal((grid.match(/class="calendar-day/g) || []).length, 31);
  await nodes.get('#calendar-grid').emit('click', { target: clickedDate('2026-10-02') });
  assert.match(nodes.get('#calendar-events').innerHTML, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.doesNotMatch(nodes.get('#calendar-events').innerHTML, /<script>/);
  assert.match(nodes.get('#calendar-events').innerHTML, /09.00 WIB/);
  await nodes.get('#calendar-sync').emit('click');
  assert.ok(requests.some((p) => p.endsWith('&sync=1')));
});

test('calendar date/render selection opens review only; submit sends exact WIB time after confirmation', async () => {
  const { nodes, requests, publishes, streams } = await ui();
  await nodes.get('#calendar-grid').emit('click', { target: clickedDate('2026-10-02') });
  await nodes.get('#calendar-plan').emit('click');
  assert.equal(nodes.get('#calendar-render-form').hidden, false);
  nodes.get('#calendar-render').value = '0';
  await nodes.get('#calendar-render-form').emit('submit');
  await new Promise((r) => setImmediate(r));
  assert.equal(nodes.get('#publish-dialog').open, true);
  assert.equal(nodes.get('#publish-date').value, '2026-10-02');
  assert.equal(publishes.length, 0, 'selection cannot publish');
  assert.ok(requests.some((p) => p.includes('publish-preview')));
  await nodes.get('#publish-form').emit('submit', { submitter: { value: 'publish' } });
  assert.deepEqual(publishes, [{ file: 'one.mp4', scheduleAt: '2026-10-02T02:00:00.000Z' }]);
  streams[0].handlers.done({ data: JSON.stringify({ code: 0 }) });
});

test('search filters existing result nodes without resetting media HTML or requesting data', async () => {
  const { window, nodes, requests } = await ui({ hash: '#results' });
  const result = nodes.get('#result-list'); const original = result.innerHTML; const count = requests.length;
  nodes.get('#result-search').value = 'two'; await nodes.get('#result-search').emit('input');
  assert.equal(result.innerHTML, original);
  assert.deepEqual(result.rows.map((r) => r.hidden), [true, false]);
  assert.equal(requests.length, count);
  nodes.get('#result-search').value = 'none'; await nodes.get('#result-search').emit('input');
  assert.equal(nodes.get('#result-no-match').hidden, false);
  window.studio.showTab('projects'); await new Promise((r) => setImmediate(r));
  assert.equal(nodes.get('#page-title').textContent, 'Edit rekaman');
});

test('newer calendar month wins when an earlier request resolves late', async () => {
  let release;
  const old = new Promise((r) => { release = r; });
  const { nodes } = await ui({ holdCalendar: (path) => path.includes('2026-10') ? old : { month: '2026-11', configured: true, events: [], undated: 0 } });
  await nodes.get('#calendar-next').emit('click'); await new Promise((r) => setImmediate(r));
  release({ month: '2026-10', events: [], configured: true, undated: 0 });
  await new Promise((r) => setImmediate(r));
  assert.match(nodes.get('#calendar-month').textContent, /November/i);
  assert.ok(nodes.get('#calendar-grid').innerHTML.includes('data-date="2026-11-01"'));
  assert.ok(!nodes.get('#calendar-grid').innerHTML.includes('data-date="2026-10-01"'));
});

test('a Generate project deep link opens once without a racing list refresh', async () => {
  const { nodes, generateCalls } = await ui({ hash: '#generate/one' });
  assert.equal(nodes.get('#page-title').textContent, 'Generate dari ide');
  assert.equal(nodes.get('#tab-generate').hidden, false);
  assert.deepEqual(generateCalls, ['open:one']);
});

test('home is the default page and lists every video with one next action, escaped', async () => {
  const app = await ui({ hash: '' });
  const { nodes } = app;
  assert.equal(nodes.get('#page-title').textContent, 'Beranda');
  assert.equal(nodes.get('#tab-home').hidden, false);
  assert.equal(nodes.get('#tab-projects').hidden, true);
  assert.match(nodes.get('#home-list').innerHTML, /data-home="projects" data-slug="one"/);
});
