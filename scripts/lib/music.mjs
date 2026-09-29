// BGM library shared/music/ (ADR-0024, RD-06-18..22): license allowlist, catalog, add/list/check, reject flag.
// The one writer of shared/music/catalog.json, used by the music CLI and the Studio. Node 22+ built-ins (ADR-0007).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { loudnessArgs, parseLoudnorm } from './cut-plan.mjs';
import { probeDuration } from '../video.mjs';

export const MUSIC_DIR = join('shared', 'music');
// Commercial use without attribution only. CC-BY, NC/ND, personal-use, and YouTube Audio Library are refused.
export const LICENSES = {
  cc0: { tier: 'A', url: 'https://creativecommons.org/publicdomain/zero/1.0/', contentIdRisk: 'none' },
  'public-domain': { tier: 'A', url: 'https://creativecommons.org/publicdomain/mark/1.0/', contentIdRisk: 'none' },
  pixabay: { tier: 'B', url: 'https://pixabay.com/service/license-summary/', contentIdRisk: 'unknown' },
  mixkit: { tier: 'B', url: 'https://mixkit.co/license/#musicFree', contentIdRisk: 'unknown' },
};
export const MOODS = ['reflektif', 'tech-ringan', 'tensi', 'playful', 'sinematik', 'upbeat'];
export const AUDIO_EXT = ['.mp3', '.ogg', '.wav', '.m4a'];
export const RISKS = ['none', 'unknown', 'known'];

const catalogFile = (root) => join(root, MUSIC_DIR, 'catalog.json');
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const isUrl = (s) => /^https?:\/\//i.test(String(s ?? ''));

export function readCatalog(root = '.') {
  const file = catalogFile(root);
  if (!existsSync(file)) return { version: 1, tracks: [] };
  const c = JSON.parse(readFileSync(file, 'utf8'));
  if (c?.version !== 1 || !Array.isArray(c.tracks)) throw new Error(`${file} is not a version 1 music catalog`);
  return c;
}

export function writeCatalog(root, catalog) {
  mkdirSync(join(root, MUSIC_DIR), { recursive: true });
  const file = catalogFile(root);
  writeFileSync(`${file}.part`, `${JSON.stringify(catalog, null, 2)}\n`);
  renameSync(`${file}.part`, file);
}

export const slugify = (s) => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'track';

export function nextTrackId(tracks, title) {
  const n = tracks.reduce((m, t) => Math.max(m, Number(/^m(\d+)-/.exec(t.id)?.[1] || 0)), 0) + 1;
  return `m${String(n).padStart(2, '0')}-${slugify(title)}`;
}

export function validateTrackInput({ license, title, author, source, mood, energy, contentIdRisk }) {
  if (!LICENSES[license]) throw new Error(`license "${license}" is not allowed (allowed: ${Object.keys(LICENSES).join(', ')}); CC-BY, NC/ND, personal-use, and YouTube Audio Library tracks are refused`);
  if (!String(title ?? '').trim()) throw new Error('--title is required');
  if (!String(author ?? '').trim()) throw new Error('--author is required');
  if (!isUrl(source)) throw new Error('--source must be the http(s) page of the track');
  const moods = String(mood ?? '').split(',').map((m) => m.trim()).filter(Boolean);
  if (!moods.length || moods.some((m) => !MOODS.includes(m))) throw new Error(`--mood must be one or more of ${MOODS.join(', ')}`);
  const e = Number(energy);
  if (!Number.isInteger(e) || e < 1 || e > 5) throw new Error('--energy must be an integer 1-5');
  const risk = contentIdRisk ?? LICENSES[license].contentIdRisk;
  if (!RISKS.includes(risk)) throw new Error(`--content-id must be one of ${RISKS.join(', ')}`);
  return { moods, energy: e, risk };
}

export const proofText = (t) => [
  `title: ${t.title}`,
  `author: ${t.author}`,
  `source: ${t.sourceUrl}`,
  `license: ${t.license} (${LICENSES[t.license].url})`,
  `retrievedAt: ${t.retrievedAt}`,
  `sha256: ${t.sha256}`,
  '',
].join('\n');

export async function addTrack({ root = '.', input, license, title, author, source, mood, energy, notes = '', loopable = false, contentIdRisk, proof, fetchImpl = fetch, run = spawnSync, now = new Date() }) {
  const { moods, energy: e, risk } = validateTrackInput({ license, title, author, source, mood, energy, contentIdRisk });
  const ext = extname(isUrl(input) ? new URL(input).pathname : String(input ?? '')).toLowerCase();
  if (!AUDIO_EXT.includes(ext)) throw new Error(`audio must be ${AUDIO_EXT.join(' ')} (got "${ext || 'no extension'}")`);
  if (proof !== undefined && !existsSync(proof)) throw new Error(`${proof} not found`);
  const catalog = readCatalog(root);
  const id = nextTrackId(catalog.tracks, title);
  const dir = join(root, MUSIC_DIR);
  mkdirSync(join(dir, 'licenses'), { recursive: true });
  const file = join(dir, `${id}${ext}`);
  const part = join(dir, `.${id}.part${ext}`);
  try {
    if (isUrl(input)) {
      const res = await fetchImpl(input);
      if (!res.ok) throw new Error(`download failed (HTTP ${res.status}); download it by hand and run npm run music -- add <file> with the same flags`);
      writeFileSync(part, Buffer.from(await res.arrayBuffer()));
    } else {
      if (!existsSync(input)) throw new Error(`${input} not found`);
      copyFileSync(input, part);
    }
    const hash = sha256(part);
    const dup = catalog.tracks.find((t) => t.sha256 === hash);
    if (dup) throw new Error(`same audio as ${dup.id}; not adding it twice`);
    const duration = probeDuration(part, run);
    const r = run('ffmpeg', loudnessArgs(part), { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0) throw new Error(`ffmpeg could not read ${input}`);
    const track = {
      id, file: basename(file), title: title.trim(), author: author.trim(), sourceUrl: source, license,
      licenseProof: `licenses/${id}.txt`, retrievedAt: now.toISOString().slice(0, 10), sha256: hash,
      duration, lufs: parseLoudnorm(r.stderr), mood: moods, energy: e, bpm: null, vocals: false,
      loopable: Boolean(loopable), contentIdRisk: risk, rejected: false, notes: notes ?? '',
    };
    renameSync(part, file);
    writeFileSync(join(dir, track.licenseProof), proofText(track));
    if (proof !== undefined) {
      track.extraProof = `licenses/${id}-proof${extname(proof).toLowerCase()}`;
      copyFileSync(proof, join(dir, track.extraProof));
    }
    catalog.tracks.push(track);
    writeCatalog(root, catalog);
    return track;
  } catch (err) {
    rmSync(part, { force: true });
    throw err;
  }
}

export function listTracks(catalog, { mood, minDur, includeRejected = false } = {}) {
  return catalog.tracks.filter((t) => (includeRejected || !t.rejected) && (!mood || t.mood.includes(mood)) && (minDur === undefined || t.duration >= minDur));
}

export function checkCatalog(root = '.') {
  const dir = join(root, MUSIC_DIR);
  const problems = [];
  for (const t of readCatalog(root).tracks) {
    if (!LICENSES[t.license]) problems.push(`${t.id}: license "${t.license}" is not allowed`);
    if (!t.licenseProof || !existsSync(join(dir, t.licenseProof))) problems.push(`${t.id}: license proof ${t.licenseProof || '(none)'} is missing`);
    const f = join(dir, t.file);
    if (!existsSync(f)) problems.push(`${t.id}: ${t.file} is missing`);
    else if (sha256(f) !== t.sha256) problems.push(`${t.id}: sha256 does not match ${t.file}`);
  }
  return problems;
}

export function findTrack(catalog, id) {
  const t = catalog.tracks.find((x) => x.id === id);
  if (!t) throw new Error(`unknown track "${id}"`);
  return t;
}

export function setRejected(root, id, rejected) {
  const catalog = readCatalog(root);
  const t = findTrack(catalog, id);
  t.rejected = Boolean(rejected);
  writeCatalog(root, catalog);
  return t;
}

export function musicPath(root, id) {
  const t = findTrack(readCatalog(root), id);
  const f = join(root, MUSIC_DIR, t.file);
  if (!existsSync(f)) throw new Error(`${t.file} is missing`);
  return f;
}
