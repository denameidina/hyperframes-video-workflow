// Fetch and freeze third-party data for the asset library (spec:
// docs/superpowers/specs/2026-09-27-asset-library-design.md). Every source is pinned to a version or
// a fixed asset id; the output is committed, so the build and the renders never touch the network.
// Needs network, `tar`, `unzip`, and `ffmpeg` on PATH. Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mapSvg } from './geo-svg.mjs';
import { shapeToPath, splitSubpaths } from './svg-path.mjs';
import { LIB } from './asset-lib-build.mjs';

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/';

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r;
};

async function download(url, file) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

// a tarball from the npm registry, unpacked into a temp dir; returns the package/ path
async function npmPackage(tarball, tmp) {
  const tgz = await download(tarball, join(tmp, 'pkg.tgz'));
  run('tar', ['-xzf', tgz, '-C', tmp]);
  return join(tmp, 'package');
}

const src = (root, p) => JSON.parse(readFileSync(join(root, LIB, 'src', p), 'utf8'));
const out = (root, p) => { const f = join(root, LIB, p); mkdirSync(join(f, '..'), { recursive: true }); return f; };

export async function fetchIcons(root) {
  const { source, categories } = src(root, 'icons.json');
  const tmp = mkdtempSync(join(tmpdir(), 'lucide-'));
  try {
    const pkg = await npmPackage(source.tarball, tmp);
    const version = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).version;
    if (version !== source.version) throw new Error(`lucide-static ${version} ≠ pinned ${source.version}`);
    const nodes = JSON.parse(readFileSync(join(pkg, 'icon-nodes.json'), 'utf8'));
    const data = {};
    for (const n of Object.values(categories).flat().sort()) {
      if (!nodes[n]) throw new Error(`lucide-static ${version} has no icon "${n}"`);
      data[n] = nodes[n].flatMap(([tag, attrs]) => splitSubpaths(shapeToPath(tag, attrs)));
    }
    writeFileSync(out(root, 'icons/lucide.json'), '{\n' + Object.entries(data).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n');
    return Object.keys(data).length;
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

export async function fetchPictograms(root) {
  const { source, tags } = src(root, 'pictograms.json');
  const tmp = mkdtempSync(join(tmpdir(), 'phosphor-'));
  try {
    const pkg = await npmPackage(source.tarball, tmp);
    const data = {};
    for (const n of Object.keys(tags).sort()) {
      const f = join(pkg, 'assets', source.weight, `${n}-${source.weight}.svg`);
      if (!existsSync(f)) throw new Error(`phosphor ${source.version} has no ${source.weight} icon "${n}"`);
      const ds = [...readFileSync(f, 'utf8').matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
      if (!ds.length) throw new Error(`${f}: no path`);
      data[n] = ds.join(' ');
    }
    writeFileSync(out(root, 'pictograms/phosphor.json'), '{\n' + Object.entries(data).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n');
    return Object.keys(data).length;
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

export async function fetchFonts(root) {
  let n = 0;
  for (const f of src(root, 'fonts.json').filter((x) => !x.legacy)) {
    for (const x of f.files) { await download(x.url, out(root, `fonts/${x.file}`)); n++; }
    await download(f.licenseUrl, out(root, `fonts/${f.licenseFile}`));
  }
  return n;
}

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function fetchMaps(root) {
  const maps = src(root, 'maps.json').filter((m) => !m.file);
  const tmp = join(tmpdir(), 'natural-earth-5.1.2');
  mkdirSync(tmp, { recursive: true });
  const cache = {};
  const load = async (name) => {
    if (!cache[name]) {
      const f = join(tmp, name + '.geojson');
      if (!existsSync(f)) await download(NE + name + '.geojson', f);
      cache[name] = JSON.parse(readFileSync(f, 'utf8')).features;
    }
    return cache[name];
  };
  for (const m of maps) {
    const layers = [];
    for (const l of m.layers) {
      const feats = (await load(l.dataset)).filter((f) => {
        const p = f.properties;
        if (l.admin && p.admin !== l.admin && p.ADMIN !== l.admin) return false;
        if (l.exclude && (l.exclude.includes(p.ADMIN) || l.exclude.includes(p.admin))) return false;
        return true;
      }).map((f) => ({ ...f, id: slug(f.properties.ADMIN ?? f.properties.name) }));
      layers.push({ ...l, features: feats });
    }
    writeFileSync(out(root, `maps/${m.id}.svg`), mapSvg(m.box, layers, `${m.source}; equirectangular lon ${m.box.lon0}..${m.box.lon1}, lat ${m.box.lat0}..${m.box.lat1}, ${m.box.k} px/deg`));
  }
  // cities: Indonesian province capitals + Southeast Asian capitals, [lat, lon] rounded to 4 places
  const places = (await load('ne_10m_populated_places_simple')).map((f) => f.properties);
  const SEA = ['Malaysia', 'Singapore', 'Thailand', 'Vietnam', 'Philippines', 'Brunei', 'Cambodia', 'Laos', 'Myanmar', 'East Timor'];
  const WRONG = ['Sumenep', 'Tuban']; // labelled Admin-1 capital in NE 5.1.2 but are not province capitals
  const pick = places.filter((p) => (p.adm0name === 'Indonesia' && /capital/.test(p.featurecla) && !WRONG.includes(p.name))
    || (SEA.includes(p.adm0name) && p.featurecla === 'Admin-0 capital'));
  const cities = {};
  for (const p of pick.sort((a, b) => slug(a.nameascii).localeCompare(slug(b.nameascii)))) cities[slug(p.nameascii)] = [Number(p.latitude.toFixed(4)), Number(p.longitude.toFixed(4))];
  writeFileSync(out(root, 'maps/cities.json'), JSON.stringify(cities, null, 1) + '\n');
  return { maps: maps.length, cities: Object.keys(cities).length };
}

// ambientCG 2K-JPG Color map → centre crop 9:16 → 1080×1920 → optional ffmpeg filter → JPEG,
// raising the quantiser until the file is ≤ 400 KB
export async function fetchTextures(root) {
  const items = src(root, 'items.json').filter((i) => i.fetch?.ambientcg);
  const tmp = mkdtempSync(join(tmpdir(), 'ambientcg-'));
  try {
    for (const it of items) {
      const id = it.fetch.ambientcg;
      const zip = await download(`https://ambientcg.com/get?file=${id}_2K-JPG.zip`, join(tmp, id + '.zip'));
      run('unzip', ['-o', '-q', zip, `${id}_2K-JPG_Color.jpg`, '-d', tmp]);
      const vf = ['crop=ih*9/16:ih', 'scale=1080:1920:flags=lanczos', ...(it.fetch.filter ? [it.fetch.filter] : [])].join(',');
      const dest = join(root, it.file);
      mkdirSync(join(dest, '..'), { recursive: true });
      let q = 6;
      for (;;) {
        run('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(tmp, `${id}_2K-JPG_Color.jpg`), '-vf', vf, '-q:v', String(q), dest]);
        if (statSync(dest).size <= 400 * 1024 || q >= 12) break;
        q++;
      }
      if (statSync(dest).size > 400 * 1024) throw new Error(`${it.file} is still over 400 KB at q ${q}`);
    }
    makeGrainTiles(root);
    return items.length + 2;
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/* Overlay grain as small PNG tiles: an SVG feTurbulence filter inside a data-URI background renders
   blank in HyperFrames' Chrome, so the noise is baked. ffmpeg's `noise` filter with a fixed seed gives
   the same bytes every run. riso: ~9% pink speckles on alpha; film: grey grain (gray + opaque alpha). */
export function makeGrainTiles(root) {
  const dir = join(root, LIB, 'textures');
  mkdirSync(dir, { recursive: true });
  run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0xEC3D7F:s=256x256', '-f', 'lavfi', '-i',
    "color=c=gray:s=256x256,noise=alls=100:allf=u:all_seed=3,format=gray,geq=lum='if(gt(lum(X\\,Y)\\,175)\\,255\\,0)'",
    '-filter_complex', '[0]format=rgba[c];[c][1]alphamerge', '-frames:v', '1', '-update', '1', join(dir, 'riso-tile.png')]);
  run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=gray:s=256x256,noise=alls=60:allf=u:all_seed=9,format=ya8',
    '-frames:v', '1', '-update', '1', join(dir, 'film-tile.png')]);
}

// crop a transparent PNG to its alpha box (+pad), fit the long edge to max, and write a 256-colour
// palette PNG with alpha (or WebP q80 with alpha when out ends in .webp)
export function processImage(input, output, { max = 720, pad = 4 } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), 'asset-proc-'));
  try {
    const rgba = join(tmp, 'rgba.png');
    run('ffmpeg', ['-loglevel', 'error', '-y', '-i', input, '-vf', `format=rgba,pad=iw+${2 * pad}:ih+${2 * pad}:${pad}:${pad}:color=black@0`, rgba]);
    const r = spawnSync('ffmpeg', ['-hide_banner', '-i', rgba, '-vf', 'alphaextract,bbox=min_val=16', '-f', 'null', '-'], { encoding: 'utf8' });
    const m = [...r.stderr.matchAll(/x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)/g)].pop();
    if (!m) throw new Error(`${input}: no opaque pixels found`);
    const [x1, x2, y1, y2] = m.slice(1).map(Number);
    const x = Math.max(0, x1 - pad), y = Math.max(0, y1 - pad), w = x2 - x1 + 1 + 2 * pad, h = y2 - y1 + 1 + 2 * pad;
    const scale = Math.max(w, h) > max ? (w >= h ? `scale=${max}:-2:flags=lanczos` : `scale=-2:${max}:flags=lanczos`) : 'null';
    const crop = `crop=${w}:${h}:${x}:${y},${scale}`;
    if (output.endsWith('.webp')) run('ffmpeg', ['-loglevel', 'error', '-y', '-i', rgba, '-vf', crop, '-c:v', 'libwebp', '-quality', '80', '-lossless', '0', output]);
    else run('ffmpeg', ['-loglevel', 'error', '-y', '-i', rgba, '-vf', `${crop},split[a][b];[a]palettegen=max_colors=256:reserve_transparent=1[p];[b][p]paletteuse=alpha_threshold=128`, output]);
    return { w, h };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

