// whisper.cpp runner for voiceover timing (ADR-0023, RD-06-09); flags follow RD-04-06 and RD-04-11.
import { join } from 'node:path';

export const WHISPER_BIN = join('vendor', 'whisper.cpp', 'build', 'bin', 'whisper-cli');
export const WHISPER_MODEL = join('vendor', 'whisper.cpp', 'models', 'ggml-large-v3-turbo.bin');
// Not the script text: a prompt holding the script would hide words the TTS skipped or misread.
export const DOMAIN_PROMPT = 'Dena Meidina, gue, lo, AI agent, workflow, deploy, prompt, CRM, ERP, API, Flutter, Nafanesia, HyperFrames.';

export function whisperPlan({ wav, work, root = '.', prompt = DOMAIN_PROMPT }) {
  const wav16 = join(work, 'asr-16k.wav');
  const base = join(work, 'asr');
  return {
    json: `${base}.json`,
    cmds: [
      ['ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-ar', '16000', '-ac', '1', wav16]],
      [join(root, WHISPER_BIN), ['-m', join(root, WHISPER_MODEL), '-f', wav16, '-l', 'id', '-nfa', '--dtw', 'large.v3.turbo', '-oj', '-ojf', '-of', base, '--prompt', prompt, '-np']],
    ],
  };
}

export const transcriptText = (json) => (json?.transcription || []).map((s) => String(s.text || '').trim()).filter(Boolean).join(' ');
