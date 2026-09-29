#!/usr/bin/env node
// BGM library CLI (ADR-0024, RD-06-18..22). Spec: docs/superpowers/specs/2026-09-29-audio-foundation-design.md
// Usage: npm run music -- add <url|file> --source <page> --license <cc0|public-domain|pixabay|mixkit> --title <t> --author <a>
//                            --mood <m[,m]> --energy <1-5> [--notes <t>] [--loopable] [--content-id none|unknown|known] [--proof <file>]
//        npm run music -- list [--mood <m>] [--min-dur <s>] [--include-rejected]
//        npm run music -- check
// Node 22+, built-in modules only (ADR-0007).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { addTrack, checkCatalog, listTracks, readCatalog } from './lib/music.mjs';

export const formatTrack = (t) => [
  t.id, t.mood.join(','), `E${t.energy}`, `${t.duration}s`,
  `${t.license}${t.contentIdRisk === 'none' ? '' : ` (Content ID: ${t.contentIdRisk})`}`,
  `${t.title} — ${t.author}${t.rejected ? ' [ditolak]' : ''}`,
].join('\t');

export async function main(argv, { root = '.', fetchImpl = fetch, run = spawnSync, now = new Date(), log = console.log } = {}) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      source: { type: 'string' }, license: { type: 'string' }, title: { type: 'string' }, author: { type: 'string' },
      mood: { type: 'string' }, energy: { type: 'string' }, notes: { type: 'string' }, loopable: { type: 'boolean', default: false },
      'content-id': { type: 'string' }, proof: { type: 'string' }, 'min-dur': { type: 'string' },
      'include-rejected': { type: 'boolean', default: false },
    },
  });
  const [cmd, input] = positionals;
  if (cmd === 'add') {
    if (!input) throw new Error('add needs <url|file>');
    const t = await addTrack({ root, input, license: values.license, title: values.title, author: values.author, source: values.source, mood: values.mood, energy: values.energy, notes: values.notes, loopable: values.loopable, contentIdRisk: values['content-id'], proof: values.proof, fetchImpl, run, now });
    log(`added ${t.id} (${t.duration} s, ${t.lufs} LUFS, ${t.license})`);
    return;
  }
  if (cmd === 'list') {
    const minDur = values['min-dur'] === undefined ? undefined : Number(values['min-dur']);
    const tracks = listTracks(readCatalog(root), { mood: values.mood, minDur, includeRejected: values['include-rejected'] });
    for (const t of tracks) log(formatTrack(t));
    log(`${tracks.length} track(s)`);
    return;
  }
  if (cmd === 'check') {
    const problems = checkCatalog(root);
    if (problems.length) throw new Error(`music check failed:\n- ${problems.join('\n- ')}`);
    log(`music check ok (${readCatalog(root).tracks.length} tracks)`);
    return;
  }
  throw new Error('usage: npm run music -- add <url|file> ... | list [--mood m] [--min-dur s] [--include-rejected] | check');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
