// Voice presets config/voices.json (ADR-0023, RD-06-01). Private voice ids live in shared/voices/<name>/voice.json.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const VOICES_FILE = join('config', 'voices.json');
export const VOICE_DIR = join('shared', 'voices');
export const PROVIDERS = ['gemini', 'supertonic', 'recorded'];

export function loadVoices(root = '.') {
  const file = join(root, VOICES_FILE);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (data?.version !== 1 || !data.presets || typeof data.presets !== 'object') throw new Error(`${file} is not a version 1 voices file`);
  return data;
}

export function getPreset(voices, name) {
  const p = voices.presets?.[name];
  if (!p) throw new Error(`unknown voice preset "${name}" (config/voices.json has ${Object.keys(voices.presets || {}).join(', ')})`);
  if (!PROVIDERS.includes(p.provider)) throw new Error(`preset ${name}: provider must be one of ${PROVIDERS.join(', ')}`);
  return { name, ...p };
}

// A preset names a voice directly ("voice") or through a private file ("voiceRef" -> { id } or { key }).
export function resolveVoiceId(preset, root = '.') {
  if (preset.voice) return preset.voice;
  if (!preset.voiceRef) throw new Error(`preset ${preset.name} has neither "voice" nor "voiceRef"`);
  const file = join(root, preset.voiceRef);
  if (!existsSync(file)) throw new Error(`${preset.voiceRef} not found for preset ${preset.name}; create it with npm run voice -- clone or design`);
  const v = JSON.parse(readFileSync(file, 'utf8'));
  const id = v.id || v.key;
  if (!id) throw new Error(`${preset.voiceRef} has no voice id`);
  return id;
}
