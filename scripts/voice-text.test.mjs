import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLexicon, normalizeForSpeech, readNumber, terbilang } from './lib/voice/normalize.mjs';
import { forProvider, scriptBody, scriptWords, splitParagraphs, stripTags } from './lib/voice/script.mjs';
import { voiceRoot } from './voice-fixtures.mjs';

test('terbilang reads Indonesian integers', () => {
  const cases = [[0, 'nol'], [1, 'satu'], [10, 'sepuluh'], [11, 'sebelas'], [12, 'dua belas'], [19, 'sembilan belas'], [20, 'dua puluh'], [21, 'dua puluh satu'], [100, 'seratus'], [110, 'seratus sepuluh'], [250, 'dua ratus lima puluh'], [1000, 'seribu'], [1500, 'seribu lima ratus'], [2026, 'dua ribu dua puluh enam'], [100000, 'seratus ribu'], [1000000, 'satu juta'], [2500000, 'dua juta lima ratus ribu'], [3000000000, 'tiga miliar']];
  for (const [n, w] of cases) assert.equal(terbilang(n), w, String(n));
  assert.throws(() => terbilang(-1), /out of range/);
});

test('readNumber handles thousands dots and decimals', () => {
  assert.equal(readNumber('2.500.000'), 'dua juta lima ratus ribu');
  assert.equal(readNumber('2,5'), 'dua koma lima');
  assert.equal(readNumber('2,75'), 'dua koma tujuh lima');
  assert.equal(readNumber('0,05'), 'nol koma nol lima');
  assert.equal(readNumber('1.2'), 'satu koma dua');
  assert.equal(readNumber('70'), 'tujuh puluh');
  assert.equal(readNumber('1.2.3'), '1.2.3');
});

test('normalizeForSpeech rewrites money, percent, units, multipliers, ordinals, ranges, and plain numbers', () => {
  const n = (t) => normalizeForSpeech(t);
  assert.equal(n('Biayanya Rp2,5 jt per bulan.'), 'Biayanya dua koma lima juta rupiah per bulan.');
  assert.equal(n('Harganya Rp2.500.000.'), 'Harganya dua juta lima ratus ribu rupiah.');
  assert.equal(n('Cuma Rp 50rb!'), 'Cuma lima puluh ribu rupiah!');
  assert.equal(n('Naik 70% dalam 3x percobaan.'), 'Naik tujuh puluh persen dalam tiga kali percobaan.');
  assert.equal(n('Omzet 2,5 M setahun'), 'Omzet dua koma lima miliar setahun');
  assert.equal(n('Butuh 3-5 hari, bukan 3–5 minggu.'), 'Butuh tiga sampai lima hari, bukan tiga sampai lima minggu.');
  assert.equal(n('Ini yang ke-3 kalinya di 2026.'), 'Ini yang ketiga kalinya di dua ribu dua puluh enam.');
  assert.equal(n('Pakai v3 dan 4K'), 'Pakai v3 dan 4K');
  assert.equal(n('Tunggu <short pause> 3 detik.'), 'Tunggu <short pause> tiga detik.');
  assert.equal(n('Cuma 1rb, ongkir Rp1rb.'), 'Cuma seribu, ongkir seribu rupiah.');
  assert.doesNotThrow(() => n('Kode 1234567890123456-2 lalu 9999999999999999-3.'));
  assert.equal(n('Yang ke-12345678901234567.'), 'Yang ke-12345678901234567.');
});

test('the lexicon replaces whole words, only for the listed providers', () => {
  const lexicon = [{ term: 'CRM', say: 'si ar em', only: ['supertonic'] }, { term: 'Nafanesia', say: 'nafa nesia' }];
  assert.equal(normalizeForSpeech('CRM Nafanesia, bukan CRMX.', { lexicon, provider: 'supertonic' }), 'si ar em nafa nesia, bukan CRMX.');
  assert.equal(normalizeForSpeech('CRM Nafanesia.', { lexicon, provider: 'gemini' }), 'CRM nafa nesia.');
  const root = voiceRoot();
  assert.deepEqual(loadLexicon(root), []);
  writeFileSync(join(root, 'config/pronunciation.json'), JSON.stringify({ version: 1, entries: [{ term: 'CRM' }] }));
  assert.throws(() => loadLexicon(root), /needs "term" and "say"/);
});

test('script helpers: body, paragraphs, tags per provider, caption words', () => {
  const md = '# Naskah uji\n\nJujur, gue kira <short pause> gampang.\n\n<!-- catatan -->\nTernyata   susah.\n';
  const body = scriptBody(md);
  assert.deepEqual(splitParagraphs(body), ['Jujur, gue kira <short pause> gampang.', 'Ternyata susah.']);
  assert.equal(stripTags('Jujur, gue kira <short pause> gampang.'), 'Jujur, gue kira gampang.');
  assert.equal(forProvider('Jujur, gue kira <short pause> gampang. <long pause> Oke <laugh> ya.', 'supertonic'), 'Jujur, gue kira, gampang. Oke ya.');
  assert.equal(forProvider('A <breath> B', 'gemini'), 'A <breath> B');
  assert.deepEqual(scriptWords(body), ['Jujur,', 'gue', 'kira', 'gampang.', 'Ternyata', 'susah.']);
  assert.deepEqual(splitParagraphs(scriptBody('## Judul\n\n#1 masalahnya: #AIagent itu mahal.\n')), ['#1 masalahnya: #AIagent itu mahal.']);
});
