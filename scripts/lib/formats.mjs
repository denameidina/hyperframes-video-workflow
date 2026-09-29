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

const KEY = /^\s*[-*]\s*(?:\*\*|__)?format(?:\*\*|__)?\s*:(.*)$/i;

// The "- format:" line of ## Workflow Settings (the whole brief when that section is missing), written any common
// way: "Format:", "**format**:", a backticked value, a trailing comment or note. null when there is no such line.
function briefFormat(md, file) {
  let scope = md.split('\n');
  const at = scope.findIndex((l) => /^##\s+workflow settings\s*$/i.test(l.trim()));
  if (at >= 0) {
    scope = scope.slice(at + 1);
    const end = scope.findIndex((l) => /^##\s/.test(l));
    if (end >= 0) scope = scope.slice(0, end);
  }
  const m = scope.map((l) => KEY.exec(l)).find(Boolean);
  if (!m) return null;
  const value = /^[a-z-]+/i.exec(m[1].replace(/<!--[\s\S]*?-->/g, '').replace(/[`*_]/g, '').trim())?.[0];
  if (!value) throw new Error(`${file}: the format line has no value (one of ${FORMATS.join(', ')})`);
  return checkFormat(value.toLowerCase(), file);
}

// creative-brief.md decides; a brief rewritten without the line falls back to the Studio request (research/request.json);
// neither = explainer (projects made before ADR-0027). The two disagreeing is an error, never a guess.
export function readFormat(dir) {
  const file = join(dir, 'creative-brief.md');
  const fromBrief = existsSync(file) ? briefFormat(readFileSync(file, 'utf8'), file) : null;
  let requested = null;
  try {
    requested = JSON.parse(readFileSync(join(dir, 'research', 'request.json'), 'utf8')).format ?? null;
  } catch {
    // no request.json (a CLI project) or an unreadable one: the brief alone decides
  }
  if (requested !== null) checkFormat(requested, join(dir, 'research', 'request.json'));
  if (fromBrief && requested && fromBrief !== requested) throw new Error(`creative-brief.md says ${fromBrief} but research/request.json says ${requested}; make them match`);
  return fromBrief ?? requested ?? 'explainer';
}
