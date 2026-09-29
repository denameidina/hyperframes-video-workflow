// Generate-mode formats (ADR-0025, ADR-0027): explainer (narrated; the TTS voiceover is the time base) and the
// music-driven kinetic-post and motion-short (the cut music is the time base). Node 22+ built-ins (ADR-0007).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const FORMATS = ['explainer', 'kinetic-post', 'motion-short'];
export const DURATION = { explainer: [30, 90], 'kinetic-post': [8, 20], 'motion-short': [15, 40] };
export const isMusicFormat = (format) => format === 'kinetic-post' || format === 'motion-short';
export const finalGate = (format) => (isMusicFormat(format) ? 2 : 3);

export function checkFormat(format, where = 'format') {
  if (!FORMATS.includes(format)) throw new Error(`${where}: "${format}" is not one of ${FORMATS.join(', ')}`);
  return format;
}

// "- format: <name>" under Workflow Settings; no line = explainer (projects made before ADR-0027)
export function readFormat(dir) {
  const file = join(dir, 'creative-brief.md');
  if (!existsSync(file)) return 'explainer';
  const m = /^\s*-\s*format:\s*(\S+)\s*$/m.exec(readFileSync(file, 'utf8'));
  return m ? checkFormat(m[1], file) : 'explainer';
}
