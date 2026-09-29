# Supertonic 3 sidecar for scripts/lib/voice (ADR-0023): text on stdin -> 44.1 kHz mono WAV at --out.
# Run through uv (scripts/lib/voice/providers/supertonic.mjs); nothing is installed into the repo.
import argparse
import sys

from supertonic import TTS

parser = argparse.ArgumentParser()
parser.add_argument('--voice', required=True)
parser.add_argument('--lang', default='id')
parser.add_argument('--speed', type=float, default=1.05)
parser.add_argument('--out', required=True)
args = parser.parse_args()
text = sys.stdin.read().strip()
if not text:
    sys.exit('empty text')
tts = TTS()
wav, _ = tts.synthesize(text, tts.get_voice_style(args.voice), speed=args.speed, lang=args.lang)
tts.save_audio(wav, args.out)
