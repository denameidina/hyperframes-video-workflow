// Voiceover word timing (ADR-0023, RD-06-09/10): whisper.cpp tokens -> words, then a DP alignment onto the script
// in spoken form (both sides normalized in word groups, so "Rp 2.500" and "dua ribu lima ratus rupiah" meet),
// keeping the script spelling.
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

const tokensOf = (text) => normalizeForSpeech(text).split(/\s+/).map(norm).filter(Boolean);
const same = (a, b) => a.length === b.length && a.every((t, i) => t === b[i]);

// Words whose spoken form depends on a neighbour ("Rp 2.500", "2,5 jt", "50 %", "3 - 5") are normalized
// together, at most 3 words per group; every other word is its own group.
export function spokenGroups(words) {
  const groups = [];
  let i = 0;
  while (i < words.length) {
    let to = i + 1;
    grow: while (to - i < 3) {
      for (const step of [1, 2]) {
        if (to + step > words.length || to + step - i > 3) break;
        const next = words.slice(to, to + step);
        // the change must involve the group: a pair that changes on its own ("Rp2,5 juta") starts its own group
        if (step === 2 && !same(tokensOf(next.join(' ')), next.flatMap(tokensOf))) break;
        const apart = [...tokensOf(words.slice(i, to).join(' ')), ...next.flatMap(tokensOf)];
        if (!same(tokensOf(words.slice(i, to + step).join(' ')), apart)) {
          to += step;
          continue grow;
        }
      }
      break;
    }
    groups.push({ from: i, to, tokens: tokensOf(words.slice(i, to).join(' ')) });
    i = to;
  }
  return groups;
}

// Spoken tokens of every group; an ASR group's time span is split evenly across its tokens.
function spoken(words, times) {
  const groups = spokenGroups(words);
  const tokens = [];
  for (const [g, grp] of groups.entries()) {
    const span = times ? { start: times[grp.from].start, end: times[grp.to - 1].end } : null;
    const step = span ? (span.end - span.start) / (grp.tokens.length || 1) : 0;
    grp.tokens.forEach((t, k) => tokens.push({ t, g, start: span ? span.start + step * k : null, end: span ? span.start + step * (k + 1) : null }));
  }
  return { tokens, groups };
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
  // Each script group gets the span of the ASR tokens paired with its tokens, split evenly across its words.
  const words = [];
  for (const [g, grp] of S.groups.entries()) {
    const idx = S.tokens.flatMap((tok, k) => (tok.g === g ? [k] : []));
    const timed = idx.filter((k) => pair[k] >= 0).map((k) => A[pair[k]]);
    const matched = idx.every((k) => pair[k] >= 0 && S.tokens[k].t === A[pair[k]].t);
    const start = timed.length ? Math.min(...timed.map((a) => a.start)) : null;
    const end = timed.length ? Math.max(...timed.map((a) => a.end)) : null;
    const count = grp.to - grp.from;
    for (let w = 0; w < count; w++) {
      words.push({
        text: script[grp.from + w],
        start: start === null ? null : r3(start + ((end - start) * w) / count),
        end: end === null ? null : r3(start + ((end - start) * (w + 1)) / count),
        matched,
      });
    }
  }
  interpolate(words, duration);
  return { words, wer: n ? r3(D[n][m] / n) : 0, unmatched: [...new Set(words.filter((w) => !w.matched).map((w) => w.text))].slice(0, 20) };
}
