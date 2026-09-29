// Generate mode (ADR-0025, RD-03-75..81, RD-06-23..25): the script's voiceover is the time base instead of processed.mp4.
// Brief stub for `video new --generate`, the duration sync, and `video voice`. Node 22+ built-ins (ADR-0007).
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLexicon } from './voice/normalize.mjs';
import { getPreset, loadVoices } from './voice/presets.mjs';
import { renderVoice, writeJson } from './voice/render.mjs';
import { scriptBody } from './voice/script.mjs';

export const GENERATE_TEMPLATE = join('templates', 'dena-generate');

export const briefStub = (slug) => `# Creative Brief - ${slug}

## Workflow Settings

- mode: generate
- visual_density: medium

<!-- Story (mode generate) fills the rest from the Brief Template in docs/agents/references/generate-mode.md. -->
`;

// Every tag marked data-voice-duration gets data-duration = the voiceover length. HTML comments are left alone
// (the starter's comments hold sample markup).
export function syncDuration(html, duration) {
  if (!(duration > 0)) throw new Error('duration must be > 0');
  return html
    .split(/(<!--[\s\S]*?-->)/)
    .map((part, i) => (i % 2 ? part : part.replace(/<[^>]*\bdata-voice-duration\b[^>]*>/g, (tag) => tag.replace(/\bdata-duration="[^"]*"/, `data-duration="${duration}"`))))
    .join('');
}

// processed-transcript.json in the schema the edit path writes (segments + words), from the voiceover.
export function transcriptFromVoice({ meta, words }) {
  return {
    source: 'voice/voiceover.wav',
    model: [meta.provider, meta.model || '-', meta.voice || '-'].join('/'),
    language: 'id',
    note: 'generate mode: words from voice/words.json (script spelling, whisper DTW times)',
    segments: meta.paragraphs.map((p) => ({ start: p.start, end: p.end, text: p.text })),
    words: words.map((w) => ({ start: w.start, end: w.end, text: w.text })),
  };
}

export async function voiceStep({ dir, root = '.', preset: presetName, env, fetchImpl, run = spawnSync }) {
  const brief = join(dir, 'creative-brief.md');
  const generate = existsSync(brief) && /^\s*-\s*mode:\s*generate\b/m.test(readFileSync(brief, 'utf8'));
  if (!generate || existsSync(join(dir, 'processed.mp4'))) {
    throw new Error(`${dir} is not a generate-mode project (creative-brief.md needs "- mode: generate" and there is no processed.mp4); start one with npm run video -- new <slug> --generate`);
  }
  const scriptFile = join(dir, 'script.md');
  if (!existsSync(scriptFile)) throw new Error(`${scriptFile} not found; the Story phase writes the script first (docs/agents/01-story.md, mode generate)`);
  const voices = loadVoices(root);
  const name = presetName ?? voices.default;
  if (!name) throw new Error('no voice preset: pass --preset <name> or set "default" in config/voices.json');
  const preset = getPreset(voices, name);
  if (preset.provider === 'recorded') throw new Error(`preset ${name} is a recording; generate mode reads the script with a TTS preset`);
  const text = scriptBody(readFileSync(scriptFile, 'utf8'));
  const out = join(dir, 'voice');
  const meta = await renderVoice({ text, preset, out, root, lexicon: loadLexicon(root), env, fetchImpl, run });
  const audio = join(dir, 'processed-audio.wav');
  copyFileSync(join(out, 'voiceover.wav'), `${audio}.part`);
  renameSync(`${audio}.part`, audio);
  const words = JSON.parse(readFileSync(join(out, 'words.json'), 'utf8'));
  writeJson(join(dir, 'processed-transcript.json'), transcriptFromVoice({ meta, words }));
  const index = join(dir, 'index.html');
  if (existsSync(index)) {
    writeFileSync(`${index}.part`, syncDuration(readFileSync(index, 'utf8'), meta.duration));
    renameSync(`${index}.part`, index);
  }
  return meta;
}
