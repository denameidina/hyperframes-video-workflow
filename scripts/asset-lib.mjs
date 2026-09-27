#!/usr/bin/env node
// Asset library CLI (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md).
//   npm run asset-lib -- fetch <icons|pictograms|fonts|maps|textures>   pinned sources → frozen files (network)
//   npm run asset-lib -- build                                          src + frozen data → generated files
//   npm run asset-lib -- check                                          exit 1 when a generated file is stale
//   npm run asset-lib -- process <in.png> <out.png|out.webp> [--max N]  crop to alpha, resize, compress
//   npm run asset-lib -- sheets                                         contact sheets → asset-catalog/sheets/
// Node 22+, built-in modules only (ADR-0007).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildAll } from './lib/asset-lib-build.mjs';
import { fetchFonts, fetchIcons, fetchMaps, fetchPictograms, fetchTextures, processImage } from './lib/asset-lib-fetch.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const [cmd, ...args] = process.argv.slice(2);
const FETCH = { icons: fetchIcons, pictograms: fetchPictograms, fonts: fetchFonts, maps: fetchMaps, textures: fetchTextures };

function stale() {
  return Object.entries(buildAll(root)).filter(([p, c]) => !existsSync(resolve(root, p)) || readFileSync(resolve(root, p), 'utf8') !== c).map(([p]) => p);
}

try {
  if (cmd === 'fetch') {
    const what = args[0];
    if (!FETCH[what]) throw new Error(`fetch what? one of: ${Object.keys(FETCH).join(', ')}`);
    console.log(`fetched ${what}:`, await FETCH[what](root));
  } else if (cmd === 'build') {
    for (const [p, c] of Object.entries(buildAll(root))) {
      mkdirSync(dirname(resolve(root, p)), { recursive: true });
      writeFileSync(resolve(root, p), c);
      console.log('wrote', p);
    }
  } else if (cmd === 'check') {
    const s = stale();
    if (s.length) { console.error('stale (run: npm run asset-lib -- build):\n  ' + s.join('\n  ')); process.exit(1); }
    console.log('asset library outputs are up to date');
  } else if (cmd === 'process') {
    const [input, output] = args;
    const i = args.indexOf('--max');
    if (!input || !output) throw new Error('usage: process <in.png> <out.png|out.webp> [--max N]');
    console.log(output, processImage(input, output, { max: i >= 0 ? Number(args[i + 1]) : 720 }));
  } else if (cmd === 'sheets') {
    const { buildSheets } = await import('./lib/asset-lib-sheets.mjs');
    console.log(await buildSheets(root));
  } else {
    throw new Error('usage: asset-lib <fetch|build|check|process|sheets> …');
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
