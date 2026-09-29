#!/usr/bin/env node
// Voice adapter CLI (ADR-0023, RD-06): TTS voiceovers, reference/clone/design voices, the blind listening test.
// Spec: docs/superpowers/specs/2026-09-29-audio-foundation-design.md
// Usage: npm run voice -- say --preset <p> (--text <t> | --file <f>) --out <dir> [--recorded <audio>] [--no-align]
//        npm run voice -- ref --from <audio|video> --at <s> --dur <s> [--name dena]
//        npm run voice -- clone --consent <audio> [--name dena] [--force]
//        npm run voice -- design --name <n> --prompt "<deskripsi>" [--gender female|male|neutral] [--language id-ID] [--force]
//        npm run voice -- voices [--lang <bcp47>] [--search <kata>]
//        npm run voice -- test build [--seed <n>]
//        npm run voice -- test reveal <run>
// Node 22+, built-in modules only (ADR-0007); Supertonic runs as a uv sidecar (ADR-0023).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { exec } from './lib/voice/exec.mjs';
import { loadLexicon } from './lib/voice/normalize.mjs';
import { VOICE_DIR, getPreset, loadVoices } from './lib/voice/presets.mjs';
import { CONSENT_ID, createVoice, designRequest, geminiKey, listPrebuiltVoices, replicateRequest } from './lib/voice/providers/gemini.mjs';
import { renderVoice, writeJson } from './lib/voice/render.mjs';
import { scriptBody } from './lib/voice/script.mjs';
import { buildRun, revealRun } from './lib/voice/test-run.mjs';
import { transcriptText, whisperPlan } from './lib/voice/whisper.mjs';
import { probeDuration } from './video.mjs';

export const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
export const REF = { min: 10, max: 30 }; // seconds, Gemini voice replication
export const CONSENT = { min: 2, max: 30 };
export const VOICE_MODEL = 'gemini-3.8-flash-tts';
const GENDERS = ['female', 'male', 'neutral'];

function voiceDir(root, name = 'dena') {
  if (!NAME_RE.test(String(name))) throw new Error('--name must use lowercase letters, digits, and dashes');
  return join(root, VOICE_DIR, name);
}

// 24 kHz mono 16-bit WAV: the format Gemini recommends for replication.
export const refArgs = ({ from, at = 0, dur, out }) => ['-y', '-loglevel', 'error', ...(dur === undefined ? [] : ['-ss', String(at), '-t', String(dur)]), '-i', from, '-vn', '-ar', '24000', '-ac', '1', '-sample_fmt', 's16', out];

function checkLength(file, { min, max }, what, run) {
  const d = probeDuration(file, run);
  if (d < min || d > max) throw new Error(`${what} must be ${min}-${max} s long (got ${d} s)`);
  return d;
}

function refuseOverwrite(file, force) {
  if (existsSync(file) && !force) throw new Error(`${file} already exists; pass --force to replace it (the old voice stays in Google until deleted)`);
}

export async function main(argv, { root = '.', env = process.env, fetchImpl = fetch, run = spawnSync, now = () => new Date(), log = console.log } = {}) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      preset: { type: 'string' }, text: { type: 'string' }, file: { type: 'string' }, out: { type: 'string' },
      recorded: { type: 'string' }, 'no-align': { type: 'boolean', default: false },
      from: { type: 'string' }, at: { type: 'string' }, dur: { type: 'string' }, name: { type: 'string' },
      consent: { type: 'string' }, force: { type: 'boolean', default: false },
      prompt: { type: 'string' }, gender: { type: 'string' }, language: { type: 'string' },
      lang: { type: 'string' }, search: { type: 'string' }, seed: { type: 'string' },
    },
  });
  const [cmd, sub, arg] = positionals;

  if (cmd === 'say') {
    const preset = getPreset(loadVoices(root), values.preset);
    const text = values.text ?? (values.file ? scriptBody(readFileSync(values.file, 'utf8')) : undefined);
    if (preset.provider !== 'recorded' && !text) throw new Error('say needs --text <text> or --file <script.md>');
    if (!values.out) throw new Error('say needs --out <dir>');
    const meta = await renderVoice({ text: text ?? '', preset, out: values.out, root, lexicon: loadLexicon(root), env, fetchImpl, run, recorded: values.recorded, align: !values['no-align'] });
    log(`voiceover ${join(values.out, 'voiceover.wav')} (${meta.duration} s${meta.alignment ? `, WER ${meta.alignment.wer}` : ''})`);
    for (const w of meta.warnings) log(`warning: ${w}`);
    return;
  }

  if (cmd === 'ref') {
    const dir = voiceDir(root, values.name ?? 'dena');
    const at = Number(values.at ?? 0);
    const dur = Number(values.dur);
    if (!values.from || !existsSync(values.from)) throw new Error('ref needs --from <audio or video file>');
    if (!Number.isFinite(at) || at < 0) throw new Error('--at must be a number of seconds >= 0');
    if (!(dur >= REF.min && dur <= REF.max)) throw new Error(`--dur must be ${REF.min}-${REF.max} seconds`);
    mkdirSync(dir, { recursive: true });
    const ref = join(dir, 'ref.wav');
    exec(run, 'ffmpeg', refArgs({ from: values.from, at, dur, out: ref }));
    checkLength(ref, REF, 'the reference clip', run);
    const plan = whisperPlan({ wav: ref, work: dir, root });
    for (const [c, a] of plan.cmds) exec(run, c, a);
    writeFileSync(join(dir, 'ref.txt'), `${transcriptText(JSON.parse(readFileSync(plan.json, 'utf8')))}\n`);
    rmSync(join(dir, 'asr-16k.wav'), { force: true });
    log(`reference ${ref}; check ${join(dir, 'ref.txt')}: one speaker, no music, no noise`);
    return;
  }

  if (cmd === 'clone') {
    const name = values.name ?? 'dena';
    const dir = voiceDir(root, name);
    if (!values.consent) throw new Error(`clone needs --consent <audio>: the same speaker saying "${CONSENT_ID}"`);
    const ref = join(dir, 'ref.wav');
    if (!existsSync(ref)) throw new Error(`${ref} not found; run npm run voice -- ref first`);
    if (!existsSync(values.consent)) throw new Error(`${values.consent} not found`);
    refuseOverwrite(join(dir, 'voice.json'), values.force);
    checkLength(ref, REF, 'the reference clip', run);
    const consent = join(dir, 'consent.wav');
    exec(run, 'ffmpeg', refArgs({ from: values.consent, out: consent }));
    checkLength(consent, CONSENT, 'the consent clip', run);
    const key = geminiKey(env);
    const v = await createVoice(replicateRequest({ model: VOICE_MODEL, name, source: readFileSync(ref), consent: readFileSync(consent) }), { key, fetchImpl });
    writeJson(join(dir, 'voice.json'), { id: v.id, type: 'replicated', model: v.model, displayName: v.displayName, createdAt: now().toISOString(), expireTime: v.expireTime });
    log(`cloned voice ${v.id} -> ${join(dir, 'voice.json')}`);
    return;
  }

  if (cmd === 'design') {
    if (!values.name) throw new Error('design needs --name <n>');
    const dir = voiceDir(root, values.name);
    if (!values.prompt?.trim()) throw new Error('design needs --prompt "<voice description>"');
    if (values.gender !== undefined && !GENDERS.includes(values.gender)) throw new Error(`--gender must be one of ${GENDERS.join(', ')}`);
    refuseOverwrite(join(dir, 'voice.json'), values.force);
    const language = values.language || 'id-ID';
    const key = geminiKey(env);
    const v = await createVoice(designRequest({ model: VOICE_MODEL, name: values.name, prompt: values.prompt.trim(), language, gender: values.gender }), { key, fetchImpl });
    mkdirSync(dir, { recursive: true });
    if (v.sample) writeFileSync(join(dir, 'sample.wav'), v.sample);
    writeJson(join(dir, 'voice.json'), { id: v.id, type: 'prompted', model: v.model, displayName: v.displayName, prompt: values.prompt.trim(), language, gender: values.gender ?? null, createdAt: now().toISOString(), expireTime: v.expireTime });
    log(`designed voice ${v.id} -> ${join(dir, 'voice.json')}${v.sample ? ` (preview ${join(dir, 'sample.wav')})` : ''}`);
    return;
  }

  if (cmd === 'voices') {
    const all = await listPrebuiltVoices({ key: geminiKey(env), fetchImpl });
    const lang = values.lang?.toLowerCase();
    const q = values.search?.toLowerCase();
    const hits = all.filter((v) => (!lang || String(v.language_code).toLowerCase().startsWith(lang)) && (!q || [v.id, v.display_name, v.persona, v.description].join(' ').toLowerCase().includes(q)));
    for (const v of hits) log([v.id, v.language_code, v.gender, v.pitch, v.persona].join('\t'));
    log(`${hits.length} of ${all.length} prebuilt voices`);
    return;
  }

  if (cmd === 'test' && sub === 'build') {
    const seed = values.seed === undefined ? undefined : Number(values.seed);
    const r = await buildRun({ root, env, fetchImpl, run, seed, now: now(), log });
    log(`listening test ${r.dir}: samples ${r.labels.join(' ')}${r.hasRef ? ' + reference' : ''}; rate them in Studio (tab Suara), then npm run voice -- test reveal ${r.id}`);
    return;
  }
  if (cmd === 'test' && sub === 'reveal') {
    const rows = revealRun({ root, id: arg });
    for (const [i, r] of rows.entries()) log(`${i + 1}. ${r.label} ${r.name} score ${r.score ?? '–'} similarity ${r.similarity ?? '–'} WER ${r.wer ?? '–'}`);
    log(`table: ${join(root, 'shared', 'voice-tests', arg, 'reveal.md')}`);
    return;
  }
  throw new Error('usage: npm run voice -- say | ref | clone | design | voices | test build | test reveal <run> (see the header of scripts/voice.mjs)');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (existsSync('.env')) process.loadEnvFile('.env');
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
