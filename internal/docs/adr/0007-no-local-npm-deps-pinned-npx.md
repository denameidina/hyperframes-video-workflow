# ADR-0007 Tanpa Dependency npm Lokal; HyperFrames via npx Ter-pin
Status: accepted (reverse-engineered)
Date: 2026-07-20

## Context

Repo adalah workspace video, bukan library. Menyimpan `node_modules` besar dan
lockfile menambah beban clone dan drift versi. CLI publish hanya butuh kemampuan
bawaan Node modern.

## Decision

- `package.json` tidak punya `dependencies`/`devDependencies`.
- HyperFrames dipanggil per invocation via `npx --yes hyperframes@0.7.24` (versi
  di-pin di tiap script).
- CLI publish (`scripts/repliz-publish.mjs`) hanya memakai modul bawaan Node
  (`node:crypto`, `node:child_process`, `node:fs/promises`, `node:path`,
  `node:process`, `node:url`, `node:util`) dan global `fetch`.
- Test memakai `node --test` bawaan.

## Rationale

- Clone ringan, tanpa `npm ci`.
- Versi HyperFrames di-pin → build reproducible.
- Bawaan Node cukup untuk crypto (sha256), proses (Wrangler), fs, dan HTTP.

## Consequences

- Butuh Node.js **22+** (mis. `process.loadEnvFile`, `fetch`, `node:test`).
- Run pertama butuh internet untuk mengunduh `hyperframes@0.7.24`.
- Upgrade HyperFrames = ubah versi pin di `package.json` (dan uji ulang).
- CI hanya perlu `npm run test:repliz` (tanpa install deps).

## Sources

- `package.json`, `scripts/repliz-publish.mjs`, `.github/workflows/ci.yml`
- [architecture/stack](../architecture/stack.md)
