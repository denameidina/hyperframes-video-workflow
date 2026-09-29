// Child-process helper for the voice adapter (ADR-0023): one place for "not installed" and "failed" messages.
import { basename } from 'node:path';

const HINTS = {
  uv: 'install it with: brew install uv (docs/initial-setup.md)',
  'whisper-cli': 'build vendor/whisper.cpp (docs/initial-setup.md)',
  ffmpeg: 'install it with: brew install ffmpeg',
  ffprobe: 'install it with: brew install ffmpeg',
};

export function exec(run, cmd, args, opts = {}) {
  const r = run(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
  const name = basename(cmd);
  if (r.error?.code === 'ENOENT') throw new Error(`${name} not found; ${HINTS[name] || 'install it and retry'}`);
  if (r.status !== 0) throw new Error(`${name} failed (exit ${r.status}): ${String(r.stderr || '').trim().split('\n').slice(-3).join(' ')}`);
  return r;
}
