// Voiceover word timing (ADR-0023, RD-06-09/10): whisper.cpp tokens -> words, then a DP alignment onto the script
// in spoken form (both sides normalized, so "Rp2,5" and "dua koma lima rupiah" meet), keeping the script spelling.
import { normalizeForSpeech } from './normalize.mjs';

const r3 = (x) => Math.round(x * 1000) / 1000;
const norm = (w) => w.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '');

// whisper-cli -ojf JSON with --dtw: a token that starts with a space starts a word; [_..._] tokens are special.
export function whisperWords(json) {
  const words = [];
  for (const seg of json?.transcription || []) {
    const segEnd = (seg.offsets?.to ?? 0) / 1000;
    for (const tok of seg.tokens || []) {
      const text = String(tok.text ?? '');
      if (!text.trim() || /^\[_[^\]]*\]$/.test(text.trim())) continue;
      const t = tok.t_dtw >= 0 ? tok.t_dtw / 100 : (tok.offsets?.from ?? 0) / 1000;
      if (text.startsWith(' ') || !words.length) words.push({ text: text.trim(), start: t, end: segEnd });
      else words[words.length - 1].text += text;
    }
  }
  for (let i = 0; i < words.length - 1; i++) words[i].end = Math.max(words[i].start, words[i + 1].start);
  return words.map((w) => ({ text: w.text, start: r3(w.start), end: r3(w.end) }));
}

// Each word -> its spoken tokens; an ASR word's time is split evenly across its tokens.
function spoken(words, times) {
  const tokens = [];
  const ranges = [];
  words.forEach((w, i) => {
    const toks = normalizeForSpeech(w).split(/\s+/).map(norm).filter(Boolean);
    const from = tokens.length;
    toks.forEach((t, k) => {
      const tm = times?.[i];
      const step = tm ? (tm.end - tm.start) / toks.length : 0;
      tokens.push({ t, start: tm ? tm.start + step * k : null, end: tm ? tm.start + step * (k + 1) : null });
    });
    ranges.push([from, tokens.length]);
  });
  return { tokens, ranges };
}

function interpolate(words, duration) {
  let k = 0;
  while (k < words.length) {
    if (words[k].start !== null) {
      k++;
      continue;
    }
    let e = k;
    while (e < words.length && words[e].start === null) e++;
    const from = k > 0 ? words[k - 1].end : 0;
    const to = e < words.length ? words[e].start : duration;
    const step = Math.max(0, to - from) / (e - k);
    for (let q = k; q < e; q++) {
      words[q].start = r3(from + step * (q - k));
      words[q].end = r3(from + step * (q - k + 1));
    }
    k = e;
  }
}

export function alignWords({ script, asr, duration }) {
  const S = spoken(script);
  const A = spoken(asr.map((w) => w.text), asr).tokens;
  const n = S.tokens.length;
  const m = A.length;
  const cost = (i, j) => (S.tokens[i].t === A[j].t ? 0 : 1);
  const D = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Uint32Array(m + 1);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j - 1] + cost(i - 1, j - 1), D[i - 1][j] + 1, D[i][j - 1] + 1);
  }
  const pair = new Array(n).fill(-1);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + cost(i - 1, j - 1)) pair[--i] = --j;
    else if (i > 0 && D[i][j] === D[i - 1][j] + 1) i--;
    else j--;
  }
  const words = script.map((text, w) => {
    const [from, to] = S.ranges[w];
    const idx = Array.from({ length: to - from }, (_, k) => from + k);
    const timed = idx.filter((k) => pair[k] >= 0).map((k) => A[pair[k]]);
    return {
      text,
      start: timed.length ? r3(Math.min(...timed.map((a) => a.start))) : null,
      end: timed.length ? r3(Math.max(...timed.map((a) => a.end))) : null,
      matched: idx.every((k) => pair[k] >= 0 && S.tokens[k].t === A[pair[k]].t),
    };
  });
  interpolate(words, duration);
  return { words, wer: n ? r3(D[n][m] / n) : 0, unmatched: [...new Set(words.filter((w) => !w.matched).map((w) => w.text))].slice(0, 20) };
}
