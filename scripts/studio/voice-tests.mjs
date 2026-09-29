// Studio tab Suara: blind listening-test runs in shared/voice-tests/ (ADR-0023, RD-05-18/19).
// Only the samples and the reference are served; key.json (who is who) never leaves the server.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RUN_RE, TESTS_DIR, saveRatings } from '../lib/voice/test-run.mjs';
import { HttpError } from './http.mjs';

function runDir(root, id) {
  if (!RUN_RE.test(String(id))) throw new HttpError(400, 'invalid run id');
  const dir = join(root, TESTS_DIR, id);
  if (!existsSync(join(dir, 'key.json'))) throw new HttpError(404, `voice test ${id} not found`);
  return dir;
}

const labelsOf = (dir) => Object.keys(JSON.parse(readFileSync(join(dir, 'key.json'), 'utf8')).labels || {}).sort();
const readRatings = (dir) => {
  const f = join(dir, 'ratings.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
};

export function listVoiceTests(root) {
  const base = join(root, TESTS_DIR);
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .filter((d) => RUN_RE.test(d) && existsSync(join(base, d, 'key.json')))
    .sort()
    .reverse()
    .map((id) => ({ id, labels: labelsOf(join(base, id)), hasRef: existsSync(join(base, id, 'ref.wav')), rated: existsSync(join(base, id, 'ratings.json')) }));
}

export function getVoiceTest(root, id) {
  const dir = runDir(root, id);
  const script = existsSync(join(dir, 'script.md')) ? readFileSync(join(dir, 'script.md'), 'utf8') : '';
  const saved = readRatings(dir);
  return { id, labels: labelsOf(dir), hasRef: existsSync(join(dir, 'ref.wav')), script, ratings: saved?.ratings ?? null, savedAt: saved?.savedAt ?? null };
}

export function voiceTestFile(root, id, name) {
  const dir = runDir(root, id);
  if (name === 'ref.wav') return join(dir, 'ref.wav');
  const m = /^([A-Z])\.wav$/.exec(String(name));
  if (!m || !labelsOf(dir).includes(m[1])) throw new HttpError(404, 'not found');
  return join(dir, 'samples', name);
}

export function saveVoiceRatings(root, id, body) {
  const dir = runDir(root, id);
  try {
    return saveRatings(dir, labelsOf(dir), body);
  } catch (e) {
    throw new HttpError(400, e.message);
  }
}
