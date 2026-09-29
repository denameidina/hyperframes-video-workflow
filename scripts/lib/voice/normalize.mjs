// TTS text normalization (ADR-0023, RD-06-02): numbers, money, percent, units, "3x", "ke-3", ranges, and the
// pronunciation lexicon. Only the text sent to a provider is normalized; captions keep the script text.
// Node 22+, built-in modules only (ADR-0007).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const LEXICON_FILE = join('config', 'pronunciation.json');
const ONES = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
const SCALES = [[1e12, 'triliun'], [1e9, 'miliar'], [1e6, 'juta'], [1e3, 'ribu']];

const withRest = (head, rest) => (rest ? `${head} ${terbilang(rest)}` : head);

export function terbilang(n) {
  if (!Number.isSafeInteger(n) || n < 0 || n >= 1e15) throw new Error(`terbilang: ${n} is out of range`);
  if (n < 12) return ONES[n];
  if (n < 20) return `${ONES[n - 10]} belas`;
  if (n < 100) return withRest(`${ONES[Math.floor(n / 10)]} puluh`, n % 10);
  if (n < 200) return withRest('seratus', n - 100);
  if (n < 1000) return withRest(`${ONES[Math.floor(n / 100)]} ratus`, n % 100);
  if (n < 2000) return withRest('seribu', n - 1000);
  const [size, word] = SCALES.find(([s]) => n >= s);
  return withRest(`${terbilang(Math.floor(n / size))} ${word}`, n % size);
}

const digits = (dec) => [...dec].map((d) => ONES[Number(d)]).join(' ');

// "2.500.000" thousands, "2,5" or "1.2" decimals; anything else is returned unchanged.
export function readNumber(s) {
  let int;
  let dec = '';
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) [int, dec = ''] = s.replaceAll('.', '').split(',');
  else {
    const m = /^(\d+)(?:[.,](\d+))?$/.exec(s);
    if (!m) return s;
    [, int, dec = ''] = m;
  }
  const n = Number(int);
  if (!Number.isSafeInteger(n) || n >= 1e15) return s;
  return dec ? `${terbilang(n)} koma ${digits(dec)}` : terbilang(n);
}

const NUM = String.raw`\d+(?:[.,]\d+)*`;
const UNITS = { rb: 'ribu', ribu: 'ribu', jt: 'juta', juta: 'juta', M: 'miliar', miliar: 'miliar', milyar: 'miliar', T: 'triliun', triliun: 'triliun' };
const UNIT = Object.keys(UNITS).join('|');
const START = String.raw`(?<![\p{L}\p{N}])`;
const END = String.raw`(?![\p{L}\p{N}])`;
// "1rb" is "seribu", not "satu ribu"; everything else reads as number + unit.
const amount = (n, u) => (u && UNITS[u] === 'ribu' && readNumber(n) === 'satu' ? 'seribu' : `${readNumber(n)}${u ? ` ${UNITS[u]}` : ''}`);
const inRange = (...xs) => xs.every((x) => Number.isSafeInteger(Number(x)) && Number(x) < 1e15); // else leave the text as written
const RULES = [
  [new RegExp(String.raw`Rp\.?\s?(${NUM})(?:\s?(${UNIT})${END})?`, 'gu'), (m, n, u) => `${amount(n, u)} rupiah`],
  [new RegExp(String.raw`${START}(${NUM})\s?%`, 'gu'), (m, n) => `${readNumber(n)} persen`],
  [new RegExp(String.raw`${START}(${NUM})\s?(${UNIT})${END}`, 'gu'), (m, n, u) => amount(n, u)],
  [new RegExp(String.raw`${START}(${NUM})x${END}`, 'gu'), (m, n) => `${readNumber(n)} kali`],
  [new RegExp(String.raw`(?<!\p{L})ke-(\d+)${END}`, 'gu'), (m, n) => (n === '1' ? 'pertama' : inRange(n) ? `ke${terbilang(Number(n))}` : m)],
  // a range may end a clause ("3-5."), but a decimal ("1.2-1.5") is not a range
  [/(?<![\d–-]|\d[.,])(\d+)\s?[–-]\s?(\d+)(?![\d–-]|[.,]\d)/gu, (m, a, b) => (inRange(a, b) ? `${terbilang(Number(a))} sampai ${terbilang(Number(b))}` : m)],
  [new RegExp(String.raw`(?<![\p{L}\p{N}.,])(${NUM})${END}`, 'gu'), (m, n) => readNumber(n)],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function loadLexicon(root = '.') {
  const file = join(root, LEXICON_FILE);
  if (!existsSync(file)) return [];
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (data?.version !== 1 || !Array.isArray(data.entries)) throw new Error(`${file} is not a version 1 pronunciation lexicon`);
  for (const e of data.entries) {
    if (typeof e?.term !== 'string' || !e.term || typeof e.say !== 'string') throw new Error(`${file}: every entry needs "term" and "say"`);
    if (e.only !== undefined && !Array.isArray(e.only)) throw new Error(`${file}: "only" must be a list of providers (${e.term})`);
  }
  return data.entries;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// A lowercase term also matches its capitalized form ("Agent" at the start of a sentence -> "Ejen").
function applyLexicon(text, lexicon, provider) {
  let out = text;
  for (const e of lexicon) {
    if (e.only && !e.only.includes(provider)) continue;
    const forms = [[e.term, e.say]];
    if (capitalize(e.term) !== e.term) forms.push([capitalize(e.term), capitalize(e.say)]);
    for (const [term, say] of forms) out = out.replace(new RegExp(`${START}${escapeRe(term)}${END}`, 'gu'), () => say);
  }
  return out;
}

// Inline Gemini tags (<short pause>, <breath>, ...) pass through untouched.
export function normalizeForSpeech(text, { lexicon = [], provider = '' } = {}) {
  return String(text)
    .split(/(<[a-z][a-z ]*>)/)
    .map((part, i) => {
      if (i % 2) return part;
      let out = applyLexicon(part, lexicon, provider);
      for (const [re, fn] of RULES) out = out.replace(re, fn);
      return out;
    })
    .join('')
    .replace(/[ \t]{2,}/g, ' ');
}
