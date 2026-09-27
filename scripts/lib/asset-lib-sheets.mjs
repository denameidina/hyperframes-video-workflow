// Contact sheets for the asset library (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md,
// "Contact sheet"). sheetPages(root) turns the catalog into 1080×1920 pages; sheetProject(root) writes
// them as a HyperFrames project (docs/agents/references/asset-catalog/); buildSheets(root) renders
// every page and saves sheets/<page>.webp so an agent can *look* at the library before choosing.
// Node 22+, built-in modules only (ADR-0007); rendering needs `npx hyperframes` and `cwebp`.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { LIB, STYLE_KEY } from './asset-lib-build.mjs';

export const CATALOG_DIR = 'docs/agents/references/asset-catalog';
const HYPERFRAMES = 'hyperframes@0.7.24';

// SK in a vm, for the pure string helpers (icon, pict, doodle, mark, stamp, frame, doc, torn)
function loadSK(root) {
  const ctx = { document: { querySelector: () => null }, gsap: { timeline: () => ({ to() { return this; } }) } };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['vendor/motion-kit/motion-kit.js', 'vendor/style-kit/style-kit.js', `${LIB}/asset-lib.js`]) vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx);
  return ctx.SK;
}

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const short = (id) => id.slice(id.indexOf('.') + 1);
const cell = (art, label, o = {}) => `<div class="c${o.dark ? ' c-grey' : ''}"${o.style ? ` style="${o.style}"` : ''}><div class="a">${art}</div><div class="l sk-f-geist-mono">${label}</div></div>`;

// sample text for fonts and documents: invented, marked as an example on the page itself
const SAMPLE = 'Sistem AI untuk bisnis — Rp 169 jt';
const DOC_SAMPLE = {
  'article': { kicker: 'Contoh', headline: 'Judul artikel contoh', dek: 'Satu kalimat ringkasan.' },
  'report-page': { section: 'Contoh', title: 'Ringkasan', rows: [{ label: 'Baris A', value: '12' }, { label: 'Baris B', value: '34' }] },
  'spreadsheet': { columns: ['A', 'B', 'C'], rows: [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']], highlightRow: 1 },
  'chat-thread': { messages: [{ from: 'Klien', side: 'l', text: 'Contoh pesan masuk' }, { from: 'Tim', side: 'r', text: 'Contoh balasan' }] },
  'email': { from: 'Tim', subject: 'Contoh subjek' },
  'social-post': { name: 'Akun contoh', text: 'Contoh isi postingan.' },
  'receipt': { title: 'STRUK', items: [{ name: 'Item A', price: '10.000' }, { name: 'Item B', price: '5.000' }], total: '15.000' },
  'invoice': { number: '#001', to: 'Klien', items: [{ name: 'Jasa A', qty: '1', price: '1.000.000' }], total: '1.000.000' },
  'search-results': { query: 'contoh pencarian', results: [{ title: 'Hasil pertama', snippet: 'Cuplikan contoh.' }, { title: 'Hasil kedua', snippet: 'Cuplikan contoh.' }] },
  'terminal': { lines: [{ prompt: true, text: 'npm run contoh' }, { text: 'selesai' }] },
};

export function sheetPages(root) {
  const SK = loadSK(root);
  const cat = JSON.parse(readFileSync(join(root, LIB, 'catalog.json'), 'utf8'));
  const pf = join(root, LIB, 'src/presets.json');
  const presets = existsSync(pf) ? JSON.parse(readFileSync(pf, 'utf8')) : { palettes: {}, types: {}, grades: {} };
  const of = (k) => cat.filter((e) => e.kind === k);
  const pages = [];
  const grid = (name, title, cols, cells, per) => chunk(cells, per).forEach((cs, i, all) => pages.push({ name: all.length > 1 ? `${name}-${i + 1}` : name, title: all.length > 1 ? `${title} (${i + 1}/${all.length})` : title, cols, cells: cs }));

  grid('icon', 'icon — Lucide (SK.icon)', 9, of('icon').map((e) => cell(SK.icon(short(e.id), { size: 72, sw: 3 }), short(e.id))), 90);
  grid('pictogram', 'pictogram — Phosphor fill (SK.pict)', 8, of('pictogram').map((e) => cell(SK.pict(short(e.id), { size: 84 }), short(e.id))), 72);
  const doodles = of('doodle');
  if (doodles.length) grid('doodle', 'doodle (SK.doodle)', 6, doodles.map((e) => cell(SK.doodle(e.id, { size: 150, sw: 6 }), short(e.id))), 48);
  const rough = ['coins', 'bot', 'store', 'chart-line', 'lightbulb', 'laptop', 'receipt', 'message-circle', 'users', 'rocket', 'truck', 'target', 'clock', 'calendar', 'database', 'shield-check', 'wallet', 'handshake', 'search', 'workflow'];
  grid('doodle-rough', 'doodle — any icon via SK.rough (seed = index)', 5, rough.map((n, i) => cell(SK.icon(n, { size: 150, sw: 7 }).replace('<svg ', `<svg data-rough="${i + 1}" `), n)), 20);
  const marks = cat.filter((e) => e.id.startsWith('mark.'));
  const stamps = cat.filter((e) => e.kind === 'frame' && e.inline.startsWith('SK.stamp'));
  const swashes = cat.filter((e) => e.kind === 'frame' && e.inline.startsWith('SK.doodle'));
  const cssFrames = cat.filter((e) => e.kind === 'frame' && e.inline.startsWith('SK.frame'));
  const torn = cat.filter((e) => e.kind === 'frame' && e.inline.startsWith('SK.tornFrame'));
  grid('frame', 'frame + mark — SK.frame · tornFrame · stamp · mark', 4, [
    ...cssFrames.map((e) => cell(`<div style="position:relative;width:200px;height:230px"><div style="transform:scale(.38);transform-origin:0 0;position:absolute">${SK.frame(short(e.id), { w: 460, h: 400, content: short(e.id) === 'film-strip-3' ? ['', '', ''] : '', caption: 'caption' })}</div></div>`, short(e.id))),
    ...torn.map((e) => cell(`<div class="sk-paper-cream" style="width:200px;height:200px;clip-path:${SK.tornFrame(e.id, 200, 200)}"></div>`, short(e.id), { dark: true })),
    ...stamps.map((e) => cell(`<div style="position:relative;width:220px;height:110px">${SK.stamp(e.id, { size: 220, text: SK.LIB.strokes[e.id].text ?? 'Badge' })}</div>`, short(e.id))),
    ...swashes.map((e) => cell(SK.doodle(e.id, { size: 220, sw: 7 }), short(e.id))),
    ...marks.map((e) => cell(SK.mark(e.id, { size: 200 }), short(e.id))),
  ], 24);
  grid('doc', 'doc — SK.doc (always tagged Ilustrasi; sample text)', 2, of('doc').filter((e) => e.id.startsWith('doc.')).map((e) => cell(`<div style="position:relative;width:440px;height:520px"><div style="transform:scale(.52);transform-origin:0 0;position:absolute;left:0;top:14px">${SK.doc(short(e.id), DOC_SAMPLE[short(e.id)] ?? {}, { w: 820 })}</div></div>`, short(e.id))), 6);
  grid('map', 'map — SK.geo(lat, lon, map)', 1, of('map').map((e) => cell(`<img src="${e.file}" style="width:960px;max-height:300px;object-fit:contain" alt="" />`, short(e.id))), 5);
  // bitmap textures are scaled to the tile; pattern classes keep their own size; overlays sit on white paper
  const OVERLAY = ['.sk-tex-halftone', '.sk-tex-riso', '.sk-tex-film'];
  const tile = (e) => OVERLAY.includes(e.use)
    ? `<div class="${e.use === '.sk-tex-film' ? '' : 'sk-paper-white'}" style="position:relative;width:220px;height:300px;background-size:cover;overflow:hidden${e.use === '.sk-tex-film' ? ';background:#8a7355' : ''}"><div class="${e.use.slice(1)}" style="width:220px;height:300px"></div></div>`
    : `<div class="${e.use.slice(1)}" style="position:relative;width:220px;height:300px;background-color:#f5f3f4;overflow:hidden${e.file ? ';background-size:cover' : ''}"></div>`;
  grid('texture', 'texture — classes (overlays on paper; film on kraft)', 4, of('texture').map((e) => cell(tile(e), short(e.id))), 20);
  const papers = of('paper');
  if (papers.length) grid('paper', 'paper — .sk-obj-* (cut-outs, tape, scraps)', 5, papers.map((e) => cell(`<div class="${e.use.slice(1)}" style="position:relative;width:160px;max-height:200px"></div>`, short(e.id), { dark: true })), 30);
  const hands = of('hand');
  if (hands.length) grid('hand', 'hand — SK.placeHand poses', 3, hands.map((e) => cell(`<img src="${e.file}" style="width:260px" alt="" />`, e.anchor.pose, { dark: true })), 9);
  const scenes = of('scene');
  if (scenes.length) {
    grid('scene', 'scene — layered parallax kits (back → front)', 1, scenes.map((e) => {
      const s = JSON.parse(readFileSync(join(root, e.file), 'utf8'));
      return cell(`<div style="display:flex;gap:10px">${s.layers.map((l) => `<img src="${l.file}" style="height:300px;background:#8a8a8a" alt="" />`).join('')}</div>`, `${short(e.id)} — ${s.layers.map((l) => `${l.role} z${l.z}`).join(', ')}`);
    }), 5);
  }
  grid('font', 'font — .sk-f-*', 1, of('font').map((e) => cell(`<div class="${e.use.slice(1)}" style="width:980px;font-size:38px;line-height:1.1;color:#1c1917;white-space:nowrap;overflow:hidden">${SAMPLE}</div>`, short(e.id), { style: 'height:68px;align-items:flex-start;padding:8px 20px' })), 17);
  for (const [st, list] of Object.entries(presets.palettes)) {
    const types = Object.entries(presets.types[st] ?? {});
    pages.push({ name: `preset-${STYLE_KEY[st]}`, title: `preset — ${STYLE_KEY[st]}: .sk-pal-${st}-* and .sk-type-${st}-*`, cols: 2, cells: [
      ...Object.entries(list).map(([n, p]) => cell(`<div class="sk-pal-${st}-${n}${p.bgClass ? ' ' + p.bgClass : ''}" style="position:relative;width:440px;height:210px;background-color:var(--sk-bg);overflow:hidden">${p.overlay ? `<div class="${p.overlay}" style="width:440px;height:210px"></div>` : ''}<div class="sk-f-geist" style="position:absolute;left:20px;top:14px;font-size:40px;font-weight:800;color:var(--sk-ink)">${n}</div><div style="position:absolute;left:20px;top:78px;width:170px;height:40px;background:var(--sk-accent)"></div><div style="position:absolute;left:200px;top:78px;width:110px;height:40px;background:var(--sk-accent-2)"></div><div style="position:absolute;left:320px;top:78px;width:80px;height:40px;background:var(--sk-muted)"></div><div class="sk-f-geist-mono" style="position:absolute;left:20px;top:140px;font-size:20px;color:var(--sk-ink)">${p.bg} ${p.ink}${p.legacy ? ' · legacy' : ''}</div></div>`, `.sk-pal-${st}-${n}`)),
      ...types.map(([n]) => cell(`<div class="sk-type-${st}-${n}" style="width:440px;color:#1c1917"><div class="sk-display" style="font-size:52px;line-height:1">Judul Contoh</div><div class="sk-sans" style="font-size:30px">Kalimat isi contoh.</div><div class="sk-hand" style="font-size:36px">catatan tangan</div><div class="sk-serif" style="font-size:34px">Serif kutipan</div></div>`, `.sk-type-${st}-${n}`, { style: 'height:250px' })),
    ] });
  }
  if (Object.keys(presets.grades).length) pages.push({ name: 'preset-parallax', title: 'preset — parallax grades: .sk-grade-px-* (on the stage)', cols: 2, cells: Object.entries(presets.grades).map(([n, g]) => cell(`<div class="sk-grade-px-${n}" style="position:relative;width:440px;height:260px;overflow:hidden"><div class="sk-view" style="width:440px;height:260px"><div class="sk-paper-cream" style="position:absolute;inset:0"></div><div class="sk-kraft" style="position:absolute;left:40px;top:40px;width:200px;height:170px"></div><div style="position:absolute;left:260px;top:70px;width:140px;height:140px;border-radius:50%;background:#2f6f8f"></div></div><div class="sk-haze" style="width:440px;height:260px"></div></div>`, `.sk-grade-px-${n}${g.legacy ? ' · legacy' : ''}`)) });
  return pages;
}

const PAGE_CSS = `#root { position: absolute; inset: 0; }
        .t { position: absolute; left: 40px; top: 40px; right: 40px; font-size: 30px; font-weight: 700; color: #1c1917; white-space: nowrap; overflow: hidden; }
        .g { position: absolute; left: 30px; top: 110px; right: 30px; bottom: 30px; display: grid; gap: 14px; align-content: start; }
        .c { background: #fbfaf6; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; color: #1c1917; }
        .c-grey { background: #8a8a8a; }
        .a { position: relative; display: flex; align-items: center; justify-content: center; }
        .l { margin-top: 6px; font-size: 16px; color: #57534e; text-align: center; word-break: break-all; }`;

export function sheetHtml(page) {
  const id = `sheet-${page.name}`;
  return `<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- GENERATED by \`npm run asset-lib -- sheets\` from the catalog; do not edit. -->
    <template>
      <style>
        ${PAGE_CSS}
      </style>
      <div id="root" data-composition-id="${id}" data-width="1080" data-height="1920" data-duration="1">
        <div class="sk-stage" style="background:#ecebe7">
          <div class="t sk-f-geist">${page.title}</div>
          <div class="g" style="grid-template-columns:repeat(${page.cols},1fr)">${page.cells.join('')}</div>
        </div>
      </div>
      <script>
        (() => {
          const ID = '${id}';
          const stage = SK.stageOf(ID);
          stage.querySelectorAll('svg[data-rough]').forEach((s) => SK.rough(s, { seed: Number(s.dataset.rough) }));
          SK.clip(ID, { T: 1, update: () => {} });
        })();
      </script>
    </template>
  </body>
</html>
`;
}

export function sheetProject(root) {
  const pages = sheetPages(root);
  const mounts = pages.map((p, i) => `      <div id="sheet-${p.name}-mount" class="sheet" data-composition-id="sheet-${p.name}" data-composition-src="compositions/${p.name}.html"
           data-start="${i}" data-duration="1" data-track-index="1" data-width="1080" data-height="1920"></div>`).join('\n');
  const index = `<!doctype html>
<html lang="id">
  <head>
    <!-- GENERATED by \`npm run asset-lib -- sheets\`; vendor/ is copied in when rendering. -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="vendor/gsap.min.js"></script>
    <script src="vendor/motion-kit/motion-kit.js"></script>
    <script src="vendor/style-kit/style-kit.js"></script>
    <script src="vendor/asset-lib/asset-lib.js"></script>
    <link rel="stylesheet" href="vendor/motion-kit/motion-kit.css" />
    <link rel="stylesheet" href="vendor/style-kit/style-kit.css" />
    <link rel="stylesheet" href="vendor/paper-pack/paper-pack.css" />
    <link rel="stylesheet" href="vendor/asset-lib/asset-lib.css" />
    <style>
      body { margin: 0; background: #ecebe7; }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #ecebe7; }
      .sheet { position: absolute; inset: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="asset-catalog" data-start="0" data-width="1080" data-height="1920" data-duration="${pages.length}">
${mounts}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines['asset-catalog'] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
  const files = { [`${CATALOG_DIR}/index.html`]: index, [`${CATALOG_DIR}/hyperframes.json`]: JSON.stringify({ id: 'asset-catalog', name: 'Asset library contact sheets' }, null, 2) + '\n' };
  for (const p of pages) files[`${CATALOG_DIR}/compositions/${p.name}.html`] = sheetHtml(p);
  return { pages, files };
}

export async function buildSheets(root) {
  const { pages, files } = sheetProject(root);
  rmSync(join(root, CATALOG_DIR, 'compositions'), { recursive: true, force: true });
  for (const [p, c] of Object.entries(files)) { mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), c); }
  const dir = mkdtempSync(join(tmpdir(), 'asset-catalog-'));
  const env = { ...process.env };
  delete env.GEMINI_API_KEY; // snapshot would otherwise send frames to Gemini for --describe
  const hf = (...args) => { const r = spawnSync('npx', ['--yes', HYPERFRAMES, ...args], { stdio: 'inherit', env }); if (r.status !== 0) throw new Error(`hyperframes ${args[0]} failed`); };
  try {
    cpSync(join(root, CATALOG_DIR), dir, { recursive: true, filter: (f) => !f.includes('/sheets') });
    mkdirSync(join(dir, 'vendor'), { recursive: true });
    cpSync(join(root, 'vendor/gsap.min.js'), join(dir, 'vendor/gsap.min.js'));
    for (const v of ['motion-kit', 'style-kit', 'paper-pack']) cpSync(join(root, 'vendor', v), join(dir, 'vendor', v), { recursive: true });
    cpSync(join(root, LIB), join(dir, LIB), { recursive: true, filter: (f) => !f.includes('/src') });
    hf('lint', dir);
    hf('validate', dir);
    const snaps = join(dir, 'snaps');
    hf('snapshot', '--at', pages.map((_, i) => i + 0.5).join(','), '-o', snaps, dir);
    const out = join(root, CATALOG_DIR, 'sheets');
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    const frames = readdirSync(snaps).filter((f) => /^frame-\d+/.test(f)).sort();
    if (frames.length !== pages.length) throw new Error(`expected ${pages.length} frames, got ${frames.length}`);
    frames.forEach((f, i) => {
      const r = spawnSync('cwebp', ['-quiet', '-q', '80', join(snaps, f), '-o', join(out, `${pages[i].name}.webp`)]);
      if (r.status !== 0) throw new Error(`cwebp failed for ${f}`);
    });
    return `${pages.length} sheets → ${CATALOG_DIR}/sheets/`;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

