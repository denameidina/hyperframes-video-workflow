// Canvas ratios (ADR-0035, RD-03-120..122): the video size a project is made at. 9:16 is the default; the
// project's choice lives in videos/<slug>/canvas.json. Node 22+, built-in modules only (ADR-0007).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_RATIO = '9:16';
// safe = pixels to keep captions and key content clear of platform UI (top/bottom) and edges (side).
export const RATIOS = {
  '9:16': { width: 1080, height: 1920, label: 'Vertikal', use: 'Reels, TikTok, Shorts, Stories', safe: { top: 120, bottom: 220, side: 48 } },
  '4:5': { width: 1080, height: 1350, label: 'Portrait feed', use: 'Feed Instagram dan Facebook', safe: { top: 60, bottom: 110, side: 54 } },
  '1:1': { width: 1080, height: 1080, label: 'Persegi', use: 'Feed, carousel, LinkedIn', safe: { top: 60, bottom: 90, side: 54 } },
  '16:9': { width: 1920, height: 1080, label: 'Lanskap', use: 'YouTube, LinkedIn, web', safe: { top: 54, bottom: 90, side: 96 } },
};
export const RATIO_LIST = Object.keys(RATIOS);

export function checkRatio(ratio, where = 'ratio') {
  if (!Object.hasOwn(RATIOS, ratio)) throw new Error(`${where}: "${ratio}" is not one of ${RATIO_LIST.join(', ')}`);
  return ratio;
}

export const canvasFor = (ratio = DEFAULT_RATIO) => {
  checkRatio(ratio);
  const { width, height, safe } = RATIOS[ratio];
  return { ratio, width, height, safe };
};

export const CANVAS_FILE = 'canvas.json';

export function writeCanvas(dir, ratio = DEFAULT_RATIO) {
  const { width, height } = canvasFor(ratio);
  writeFileSync(join(dir, CANVAS_FILE), `${JSON.stringify({ ratio, width, height }, null, 2)}\n`);
}

// A project without canvas.json is a 9:16 project (every video made before ratios existed).
export function canvasOf(dir) {
  const file = join(dir, CANVAS_FILE);
  if (!existsSync(file)) return canvasFor(DEFAULT_RATIO);
  let c;
  try {
    c = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`${file}: ${e.message}`);
  }
  return canvasFor(checkRatio(c?.ratio, `${file} ratio`));
}

// The starter templates are written at 1080x1920. For another canvas, swap both sizes in one pass
// (16:9 turns 1080 into 1920 and 1920 into 1080, so two sequential replaces would undo each other).
export function applyCanvas(html, ratio = DEFAULT_RATIO) {
  const { width, height } = canvasFor(ratio);
  if (ratio === DEFAULT_RATIO) return html;
  return html.replace(/(?<![\d.])(1080|1920)(?!\d)/g, (m) => String(m === '1080' ? width : height));
}
