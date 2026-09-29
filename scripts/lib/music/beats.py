# Beat grid for the music-driven generate formats (ADR-0027, RD-06-30): tempo, beats, 4/4 downbeats, and energy
# per beat of one audio file, as JSON on stdout. Run through uv by scripts/lib/music/cut.mjs; nothing is installed
# into the repo. Deterministic: librosa's beat tracker has no random sampling.
import json
import sys

import librosa
import numpy as np

SR = 22050
HOP = 512


def analyse(path):
    y, sr = librosa.load(path, sr=SR, mono=True)
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    tempo, frames = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=HOP, units='frames')
    frames = np.asarray(frames, dtype=int)
    if len(frames) < 8:
        sys.exit('fewer than 8 beats found; does this track have a pulse?')
    times = librosa.frames_to_time(frames, sr=sr, hop_length=HOP)
    # 4/4: the downbeat phase is the one whose every 4th beat has the most low-band (kick, under 200 Hz) onset.
    # The full-band onset is nearly flat across phases (snares and hats on 2 and 4); on the catalog the low band
    # was decisive and matched the start of the loop tracks.
    low = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP, fmax=200, n_mels=16)
    strength = low[np.clip(frames, 0, len(low) - 1)]
    sums = np.array([strength[p::4].sum() for p in range(4)])
    order = np.argsort(sums)[::-1]
    phase = int(order[0])
    confidence = float(sums[order[0]] / max(sums[order[1]], 1e-9))  # best phase / second best; near 1 = unsure
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    edges = [min(int(f), len(rms) - 1) for f in frames] + [len(rms)]
    energy = np.array([rms[edges[k]:max(edges[k] + 1, edges[k + 1])].mean() for k in range(len(frames))])
    if energy.max() > 0:
        energy = energy / energy.max()

    def r(x):
        return round(float(x), 3)

    return {
        'version': 1,
        'meter': '4/4',
        'bpm': round(float(np.atleast_1d(tempo)[0]), 2),
        'duration': r(len(y) / sr),
        'beats': [r(t) for t in times],
        'downbeats': [r(t) for t in times[phase::4]],
        'downbeatConfidence': r(confidence),
        'beatEnergy': [r(e) for e in energy],
    }


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('usage: beats.py <audio file>')
    print(json.dumps(analyse(sys.argv[1])))
