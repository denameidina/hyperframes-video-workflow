// Supertonic 3 local TTS (ADR-0023): a pinned uv sidecar, stock voices F1-F5 / M1-M5, Indonesian "id".
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { exec } from '../exec.mjs';

export const SUPERTONIC = { python: '3.12', package: 'supertonic==1.3.1', voices: ['F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5'] };
const SAY_PY = join(import.meta.dirname, 'supertonic_say.py');

export function supertonicArgs({ voice, speed = 1.05, lang = 'id', out }) {
  return ['run', '--quiet', '--python', SUPERTONIC.python, '--with', SUPERTONIC.package, 'python', SAY_PY, '--voice', voice, '--lang', lang, '--speed', String(speed), '--out', out];
}

export function supertonicSay({ text, voice, speed, out, run = spawnSync }) {
  if (!SUPERTONIC.voices.includes(voice)) throw new Error(`Supertonic voice must be one of ${SUPERTONIC.voices.join(', ')} (got "${voice}")`);
  exec(run, 'uv', supertonicArgs({ voice, speed, out }), { input: text });
}
