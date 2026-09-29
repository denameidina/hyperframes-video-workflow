// One voiceover end to end (ADR-0023, RD-06): synthesize (or take a recording), whisper + alignment -> words.json,
// and voice-meta.json. Used by `npm run voice -- say` and the listening test; sub-project 2 adds `video voice`.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOUDNESS } from '../cut-plan.mjs';
import { alignWords, whisperWords } from './align.mjs';
import { exec } from './exec.mjs';
import { resolveVoiceId } from './presets.mjs';
import { geminiKey, geminiSay } from './providers/gemini.mjs';
import { supertonicSay } from './providers/supertonic.mjs';
import { scriptWords } from './script.mjs';
import { prepareRecorded, synthesize } from './synth.mjs';
import { whisperPlan } from './whisper.mjs';

export const WER_WARN = 0.1;

export function writeJson(file, data) {
  writeFileSync(`${file}.part`, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(`${file}.part`, file);
}

export function makeSay(preset, { root = '.', env = process.env, fetchImpl = fetch, run = spawnSync, sleep } = {}) {
  if (preset.provider === 'gemini') {
    const key = geminiKey(env);
    const voice = resolveVoiceId(preset, root);
    return {
      voiceId: voice,
      say: async ({ text, file }) => writeFileSync(file, await geminiSay({ text, model: preset.model, voice, style: preset.style, language: preset.language, key, fetchImpl, sleep })),
    };
  }
  if (preset.provider === 'supertonic') return { voiceId: preset.voice, say: async ({ text, file }) => supertonicSay({ text, voice: preset.voice, speed: preset.speed, out: file, run }) };
  throw new Error(`preset ${preset.name} (${preset.provider}) has no synthesizer; pass a recording with --recorded <file>`);
}

export async function renderVoice({ text, preset, out, root = '.', lexicon = [], env, fetchImpl, run = spawnSync, sleep, recorded, align = true, say }) {
  mkdirSync(out, { recursive: true });
  let audio;
  let voiceId = null;
  if (preset.provider === 'recorded') {
    if (!recorded) throw new Error(`preset ${preset.name} needs --recorded <audio file>`);
    audio = prepareRecorded({ file: recorded, out, run });
  } else {
    const s = say ? { say, voiceId: preset.voice || '' } : makeSay(preset, { root, env, fetchImpl, run, sleep });
    voiceId = s.voiceId;
    audio = await synthesize({ text, preset, voiceId, out, say: s.say, lexicon, run });
  }
  const meta = { version: 1, preset: preset.name, provider: preset.provider, model: preset.model || null, voice: voiceId, paragraphs: audio.paragraphs, duration: audio.duration, lufs: LOUDNESS.target, alignment: null, warnings: [] };
  if (align) {
    const plan = whisperPlan({ wav: join(out, 'voiceover.wav'), work: out, root });
    for (const [c, a] of plan.cmds) exec(run, c, a);
    const asr = whisperWords(JSON.parse(readFileSync(plan.json, 'utf8')));
    rmSync(join(out, 'asr-16k.wav'), { force: true });
    const { words, wer, unmatched } = alignWords({ script: scriptWords(text), asr, duration: audio.duration });
    writeJson(join(out, 'words.json'), words);
    meta.alignment = { wer, unmatched };
    if (wer > WER_WARN) meta.warnings.push(`alignment WER ${wer} > ${WER_WARN}: check ${unmatched.join(', ')}; regenerate the paragraph that holds them`);
  }
  writeJson(join(out, 'voice-meta.json'), meta);
  return meta;
}
