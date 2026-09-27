// Build the shared asset library (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md).
// Pure: buildAll(root) reads vendor/asset-lib/src + the frozen fetch data and returns
// { 'vendor/asset-lib/<file>': content } for every generated file; the CLI writes them and the
// test compares them with disk. One source per kind:
//   icons      src/icons.json (names per tag)        + icons/lucide.json (fetched path data)
//   pictograms src/pictograms.json (tags per name)   + pictograms/phosphor.json (fetched)
//   strokes    src/doodles/*.svg, src/marks/*.svg, src/frames/*.svg (hand-authored)
//   fonts      src/fonts.json; maps src/maps.json + maps/cities.json; presets src/presets.json
//   docs       src/docs.json; everything else (bitmaps, CSS frames, torn masks, scenes) src/items.json
// Node 22+, built-in modules only (ADR-0007).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { splitSubpaths } from './svg-path.mjs';

export const LIB = 'vendor/asset-lib';
export const TAGS = ['ai', 'uang', 'bisnis', 'umkm', 'chat', 'kerja', 'waktu', 'orang', 'perangkat', 'keamanan', 'data', 'logistik', 'ide', 'status', 'arah', 'tempat', 'hidup', 'media', 'kertas', 'peta', 'benda'];
export const STYLES = ['broll-text', 'motion-graphic', 'whiteboard', 'vox', 'stop-motion', 'mix-media', 'parallax'];
export const KINDS = ['icon', 'pictogram', 'doodle', 'paper', 'hand', 'frame', 'doc', 'map', 'texture', 'scene', 'font', 'palette', 'type'];
export const STYLE_KEY = { text: 'broll-text', mg: 'motion-graphic', wb: 'whiteboard', vox: 'vox', stop: 'stop-motion', mm: 'mix-media', px: 'parallax' };
// generated files at the library root; scenes/<name>/scene.json are generated too
export const OUTPUTS = ['asset-lib.js', 'asset-lib.css', 'catalog.json', 'LICENSES.md', 'CATALOG.md'];
const ICON_STYLES = ['motion-graphic', 'vox', 'whiteboard', 'broll-text', 'mix-media'];
const PICT_STYLES = ['motion-graphic', 'stop-motion', 'vox'];
const SHEETS = '../../docs/agents/references/asset-catalog/sheets/';

const read = (root, p) => readFileSync(join(root, p), 'utf8');
const json = (root, p, dflt) => (existsSync(join(root, p)) ? JSON.parse(read(root, p)) : dflt);
const svgFiles = (root, dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => f.endsWith('.svg')).sort() : []);
const bytes = (root, p) => statSync(join(root, p)).size;

export function pngSize(buf) {
  if (buf.toString('latin1', 1, 4) !== 'PNG') throw new Error('not a PNG');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// A hand-authored stroke SVG: viewBox 0 0 W H, one <path d> per pen stroke (drawing order),
// data-tags / data-styles (comma lists), optional data-text (fixed stamp text).
export function parseStrokeSvg(src, file) {
  const vb = src.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!vb) throw new Error(`${file}: needs viewBox="0 0 W H"`);
  const attr = (n) => (src.match(new RegExp(`data-${n}="([^"]*)"`)) || [])[1];
  const d = [...src.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].flatMap((m) => splitSubpaths(m[1]));
  if (!d.length) throw new Error(`${file}: no <path d="…">`);
  const list = (n) => (attr(n) || '').split(',').map((s) => s.trim()).filter(Boolean);
  return { vb: [Number(vb[1]), Number(vb[2])], d, tags: list('tags'), styles: list('styles'), text: attr('text') ?? null };
}

const check = (e) => {
  if (!KINDS.includes(e.kind)) throw new Error(`${e.id}: unknown kind "${e.kind}"`);
  for (const s of e.styles) if (!STYLES.includes(s)) throw new Error(`${e.id}: unknown style "${s}"`);
  for (const t of e.tags) if (!TAGS.includes(t)) throw new Error(`${e.id}: tag "${t}" is not in the vocabulary`);
  if (!e.styles.length) throw new Error(`${e.id}: needs at least one style`);
  if (!e.tags.length) throw new Error(`${e.id}: needs at least one tag`);
  if (!!e.file === !!e.inline) throw new Error(`${e.id}: needs exactly one of file / inline`);
};

const fam = (f) => `'${f}'`;

export function buildAll(root) {
  const S = LIB + '/src';
  const icons = json(root, S + '/icons.json', { categories: {} });
  const lucide = json(root, LIB + '/icons/lucide.json', {});
  const picts = json(root, S + '/pictograms.json', { tags: {} });
  const phosphor = json(root, LIB + '/pictograms/phosphor.json', {});
  const presets = json(root, S + '/presets.json', { roles: {}, exceptions: [], palettes: {}, grades: {}, types: {} });
  const fonts = json(root, S + '/fonts.json', []);
  const maps = json(root, S + '/maps.json', []);
  const cities = json(root, LIB + '/maps/cities.json', {});
  const docs = json(root, S + '/docs.json', []);
  const items = json(root, S + '/items.json', []);

  const lib = { icons: {}, picts: {}, strokes: {}, torn: {}, maps: {}, cities, hands: {}, assets: {} };
  const entries = [];
  const licenses = []; // [path relative to LIB, source, license, changes]
  const add = (e) => {
    const full = { styles: [], tags: [], ...e };
    check(full);
    if (lib.assets[full.id]) throw new Error(`duplicate catalog id "${full.id}"`);
    if (full.file && full.kind === 'scene') {
      // scene.json is generated below; the catalog counts the layer files instead
      const dir = full.file.slice(0, full.file.lastIndexOf('/'));
      full.bytes = e.layers.reduce((n, l) => n + bytes(root, `${dir}/${l.file}`), 0);
    } else if (full.file) {
      if (!existsSync(join(root, full.file))) throw new Error(`${full.id}: missing file ${full.file}`);
      full.bytes = bytes(root, full.file);
    }
    lib.assets[full.id] = { kind: full.kind, ...(full.file ? { file: full.file } : { inline: full.inline }), ...(full.anchor ? { anchor: full.anchor } : {}) };
    entries.push(full);
    return full;
  };

  // ---- icons (Lucide) and pictograms (Phosphor fill) ----
  if (Object.keys(icons.categories).length) {
    const src = `${icons.source.package} ${icons.source.version}`;
    for (const [tag, names] of Object.entries(icons.categories)) {
      for (const n of names) {
        if (!lucide[n]) throw new Error(`icon "${n}" is in src/icons.json but not in icons/lucide.json (run: npm run asset-lib -- fetch icons)`);
        lib.icons[n] = lucide[n];
        add({ id: 'icon.' + n, kind: 'icon', inline: `SK.icon('${n}')`, styles: ICON_STYLES, tags: [tag], source: src, license: icons.source.license });
      }
    }
    licenses.push(['icons/lucide.json', `${src} — ${icons.source.tarball}`, icons.source.license, `${Object.keys(lib.icons).length} icons; every shape converted to absolute path data, one string per subpath`]);
  }
  if (Object.keys(picts.tags).length) {
    const src = `${picts.source.package} ${picts.source.version} (${picts.source.weight})`;
    for (const [n, tags] of Object.entries(picts.tags)) {
      if (!phosphor[n]) throw new Error(`pictogram "${n}" is in src/pictograms.json but not in pictograms/phosphor.json (run: npm run asset-lib -- fetch pictograms)`);
      lib.picts[n] = phosphor[n];
      add({ id: 'pict.' + n, kind: 'pictogram', inline: `SK.pict('${n}')`, styles: PICT_STYLES, tags, source: src, license: picts.source.license });
    }
    licenses.push(['pictograms/phosphor.json', `${src} — ${picts.source.tarball}`, picts.source.license, `${Object.keys(lib.picts).length} icons, 256 grid, path data only`]);
  }

  // ---- hand-authored stroke SVGs ----
  for (const [dir, prefix, kind] of [['doodles', 'doodle', 'doodle'], ['marks', 'mark', 'doc'], ['frames', 'frame', 'frame']]) {
    for (const f of svgFiles(root, `${S}/${dir}`)) {
      const id = `${prefix}.${f.slice(0, -4)}`;
      const s = parseStrokeSvg(read(root, `${S}/${dir}/${f}`), `${S}/${dir}/${f}`);
      lib.strokes[id] = { vb: s.vb, d: s.d, ...(s.text ? { text: s.text } : {}) };
      // frames/swash-* are drawn strokes; every other frame SVG is a stamp or badge border
      const fn = prefix === 'mark' ? 'SK.mark' : prefix === 'frame' && !f.startsWith('swash') ? 'SK.stamp' : 'SK.doodle';
      add({ id, kind, inline: `${fn}('${id}')`, styles: s.styles, tags: s.tags, source: 'project', license: 'MIT' });
    }
  }

  // ---- VOX document templates (SK.doc) ----
  for (const d of docs) add({ id: 'doc.' + d.kind, kind: 'doc', inline: `SK.doc('${d.kind}', …)`, styles: d.styles, tags: d.tags, source: 'project', license: 'MIT' });

  // ---- maps ----
  for (const m of maps) {
    const b = m.box, file = m.file ?? `${LIB}/maps/${m.id}.svg`;
    lib.maps[m.id] = { src: file, w: Math.round((b.lon1 - b.lon0) * b.k), h: Math.round((b.lat0 - b.lat1) * b.k), lon0: b.lon0, lat0: b.lat0, k: b.k };
    add({ id: 'map.' + m.id, kind: 'map', file, styles: ['vox', 'motion-graphic', 'parallax'], tags: ['peta', 'tempat'], source: m.source, license: 'Public domain' });
    if (!m.file) licenses.push([`maps/${m.id}.svg`, m.source, 'Public domain', m.changes]);
  }
  if (Object.keys(cities).length) licenses.push(['maps/cities.json', 'Natural Earth 10m populated places v5.1.2 — https://www.naturalearthdata.com/about/terms-of-use/', 'Public domain', `${Object.keys(cities).length} cities: Indonesian province capitals + Southeast Asian capitals, [lat, lon]`]);

  // ---- fonts ----
  for (const f of fonts) {
    add({ id: 'font.' + f.id, kind: 'font', ...(f.legacy ? { inline: `.sk-f-${f.id}` } : { file: `${LIB}/fonts/${f.files[0].file}` }), styles: f.styles, tags: ['media'], source: f.source, license: f.license });
    if (!f.legacy) {
      for (const x of f.files) licenses.push([`fonts/${x.file}`, f.source, f.license, 'Latin subset woff2, unchanged']);
      licenses.push([`fonts/${f.licenseFile}`, f.source, f.license, 'license text, unchanged']);
    }
  }

  // ---- presets ----
  for (const [st, list] of Object.entries(presets.palettes)) {
    for (const [n, p] of Object.entries(list)) add({ id: `palette.${st}-${n}`, kind: 'palette', inline: `.sk-pal-${st}-${n}`, styles: [STYLE_KEY[st]], tags: ['media'], source: p.legacy ? 'project (legacy Look table)' : 'project', license: 'MIT' });
  }
  for (const [n, g] of Object.entries(presets.grades)) add({ id: `palette.px-${n}`, kind: 'palette', inline: `.sk-grade-px-${n}`, styles: ['parallax'], tags: ['media'], source: g.legacy ? 'project (legacy Look table)' : 'project', license: 'MIT' });
  for (const [st, list] of Object.entries(presets.types)) {
    for (const [n, t] of Object.entries(list)) add({ id: `type.${st}-${n}`, kind: 'type', inline: `.sk-type-${st}-${n}`, styles: [STYLE_KEY[st]], tags: ['media'], source: t.legacy ? 'project (legacy)' : 'project', license: 'MIT' });
  }

  // ---- items: bitmaps, CSS frames, torn masks, procedural textures, scenes, legacy paper-pack ----
  const sceneFiles = {};
  for (const it of items) {
    add(it);
    if (it.torn) lib.torn[it.id] = it.torn;
    if (it.kind === 'hand' && !it.legacy) {
      const a = it.anchor, sz = pngSize(readFileSync(join(root, it.file)));
      if (sz.w !== a.w || sz.h !== a.h) throw new Error(`${it.id}: anchor size ${a.w}×${a.h} ≠ PNG ${sz.w}×${sz.h}`);
      lib.hands[a.pose] = { src: it.file, w: a.w, h: a.h, tx: a.tx, ty: a.ty };
    }
    if (it.kind === 'scene') {
      const dir = it.file.slice(0, it.file.lastIndexOf('/'));
      const scene = { id: it.id, light: it.light, provenance: it.provenance, layers: it.layers.map((l) => ({ file: `${dir}/${l.file}`, z: l.z, role: l.role })) };
      sceneFiles[it.file] = JSON.stringify(scene, null, 2) + '\n';
      for (const l of it.layers) {
        if (!existsSync(join(root, dir, l.file))) throw new Error(`${it.id}: missing layer ${dir}/${l.file}`);
        licenses.push([`${dir.slice(LIB.length + 1)}/${l.file}`, `Codex (generated) — "${l.prompt}"`, 'project asset (MIT)', l.changes]);
      }
    } else if (it.file && it.file.startsWith(LIB + '/') && !it.legacy) {
      licenses.push([it.file.slice(LIB.length + 1), it.prompt ? `Codex (generated) — "${it.prompt}"` : it.source, it.license, it.changes ?? '—']);
    }
  }

  // ---- asset-lib.js ----
  const runtime = read(root, S + '/runtime.js');
  if (!runtime.includes('/*@LIB@*/')) throw new Error('src/runtime.js lost its /*@LIB@*/ marker');
  const js = runtime.replace('/*@LIB@*/', 'SK.LIB = ' + JSON.stringify(lib) + ';');

  // ---- asset-lib.css ----
  const css = [`/* GENERATED by \`npm run asset-lib -- build\` from vendor/asset-lib/src — edit the sources, not this file.
   Spec: docs/superpowers/specs/2026-09-27-asset-library-design.md */`];
  for (const f of fonts.filter((x) => !x.legacy)) {
    for (const x of f.files) css.push(`@font-face { font-family: ${fam(f.family)}; src: url(fonts/${x.file}) format('woff2'); font-weight: ${x.weight}; font-display: block; }`);
  }
  for (const f of fonts) css.push(`.sk-f-${f.id} { font-family: ${fam(f.family)}, ${f.fallback}; text-transform: ${f.transform ?? 'none'}; }`);
  for (const [st, list] of Object.entries(presets.palettes)) {
    for (const [n, p] of Object.entries(list)) {
      const hint = [p.bgClass && `add .${p.bgClass}`, p.overlay && `overlay .${p.overlay}`].filter(Boolean).join(', ');
      css.push(`.sk-pal-${st}-${n} { --sk-bg: ${p.bg}; --sk-ink: ${p.ink}; --sk-accent: ${p.accent}; --sk-accent-2: ${p.accent2}; --sk-muted: ${p.muted}; }${hint ? ` /* ${hint} */` : ''}`);
    }
  }
  for (const [n, g] of Object.entries(presets.grades)) {
    css.push(`.sk-grade-px-${n} .sk-view { filter: ${g.filter}; }`);
    css.push(`.sk-grade-px-${n} .sk-haze { background: ${g.haze ? g.haze[0] : 'transparent'}; opacity: ${g.haze ? g.haze[1] : 0}; }`);
    css.push(`.sk-grade-px-${n} .sk-grain { opacity: ${g.grain}; }`);
  }
  const ROLE = { display: '--sk-font-display', body: '--sk-font-body', hand: '--sk-font-hand', serif: '--sk-font-serif', mono: '--sk-font-mono' };
  for (const [st, list] of Object.entries(presets.types)) {
    for (const [n, t] of Object.entries(list)) {
      css.push(`.sk-type-${st}-${n} { ${Object.entries(ROLE).filter(([r]) => t[r]).map(([r, v]) => `${v}: ${fam(t[r])};`).join(' ')} }`);
    }
  }
  const objs = items.filter((i) => i.kind === 'paper' && !i.legacy);
  if (objs.length) css.push(objs.map((o) => '.sk-obj-' + o.id.slice(6)).join(', ') + ' { position: absolute; background-repeat: no-repeat; background-size: 100% 100%; }');
  for (const o of objs) {
    const sz = pngSize(readFileSync(join(root, o.file)));
    css.push(`.sk-obj-${o.id.slice(6)} { background-image: url(${o.file.slice(LIB.length + 1)}); aspect-ratio: ${sz.w} / ${sz.h}; }`);
  }
  const texs = items.filter((i) => i.kind === 'texture' && i.file && !i.legacy && !i.overlay); // overlays are styled in base.css
  if (texs.length) css.push(texs.map((t) => '.sk-tex-' + t.id.slice(8)).join(', ') + ' { background-size: 1080px 1920px; background-position: 0 0; }');
  for (const t of texs) css.push(`.sk-tex-${t.id.slice(8)} { background-image: url(${t.file.slice(LIB.length + 1)}); }`);
  css.push(read(root, S + '/base.css').trim());
  const cssOut = css.join('\n') + '\n';

  // ---- catalog.json, CATALOG.md, LICENSES.md ----
  // how a clip uses the entry: a class, a call, or the file
  const useOf = (e) => e.use ?? e.inline ?? ({
    texture: `.sk-tex-${e.id.slice(8)}`, paper: `.sk-obj-${e.id.slice(6)}`, font: `.sk-f-${e.id.slice(5)}`,
    hand: `SK.placeHand(img, tip, { pose: '${e.anchor?.pose}' })`, map: `SK.geo(lat, lon, '${e.id.slice(4)}')`, scene: e.file,
  }[e.kind] ?? e.file);
  const catalog = entries.map((e) => {
    const o = { id: e.id, kind: e.kind };
    if (e.file) o.file = e.file; else o.inline = e.inline;
    o.use = useOf(e);
    Object.assign(o, { styles: e.styles, tags: e.tags, source: e.source, license: e.license });
    if (e.prompt) o.prompt = e.prompt;
    if (e.anchor) o.anchor = e.anchor;
    if (e.file) o.bytes = e.bytes;
    return o;
  });
  const md = ['# Asset Library Catalog', '', 'GENERATED by `npm run asset-lib -- build` from `vendor/asset-lib/src`. Look at the contact sheet',
    'for a kind before choosing; grep this file by tag (`uang`, `ai`, `chat`, …) or style. Spec:',
    '`docs/superpowers/specs/2026-09-27-asset-library-design.md`.', ''];
  for (const k of KINDS) {
    const rows = catalog.filter((e) => e.kind === k);
    if (!rows.length) continue;
    md.push(`## ${k} (${rows.length})`, '', `Sheet: [${k}](${SHEETS}) — files \`${k}*.webp\``, '', '| id | use | styles | tags | source |', '| --- | --- | --- | --- | --- |');
    for (const r of rows) md.push(`| \`${r.id}\` | \`${r.use}\` | ${r.styles.join(', ')} | ${r.tags.join(', ')} | ${r.source} |`);
    md.push('');
  }
  const lic = ['# Asset Library Licenses', '', 'GENERATED by `npm run asset-lib -- build`. One row per file in `vendor/asset-lib/` outside `src/`',
    '(project source, MIT) and the generated files. `scripts/asset-lib.test.mjs` fails when a file has no row.',
    'Paper-pack files keep their rows in `vendor/paper-pack/LICENSES.md`.', '', '| File | Source | License | Changes |', '| --- | --- | --- | --- |'];
  for (const [p, s, l, c] of licenses.sort((a, b) => a[0].localeCompare(b[0]))) lic.push(`| \`${p}\` | ${s} | ${l} | ${c} |`);

  const out = {
    [`${LIB}/asset-lib.js`]: js,
    [`${LIB}/asset-lib.css`]: cssOut,
    [`${LIB}/catalog.json`]: JSON.stringify(catalog, null, 1) + '\n',
    [`${LIB}/CATALOG.md`]: md.join('\n') + '\n',
    [`${LIB}/LICENSES.md`]: lic.join('\n') + '\n',
  };
  for (const [f, c] of Object.entries(sceneFiles)) out[f] = c;
  return out;
}
