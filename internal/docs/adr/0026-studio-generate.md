# ADR-0026 Studio mode generate: form + panel review gate
Status: accepted
Date: 2026-09-29

## Context

Mode generate (ADR-0025) berhenti di tiga gate (naskah + suara, storyboard, render).
Video pertama (`videos/ai-agent-gagal`) dijawab lewat chat, dan artefaknya hanya bisa
dilihat lewat terminal. Studio (ADR-0020) sudah punya proyek, sesi agent di tmux,
Results + publish, serta pemutar audio di tab Suara/Musik, tetapi belum bisa membuat proyek
generate atau menampilkan artefak untuk menjawab gate.

## Decision

- **Satu sesi agent per proyek; panel sebagai jendela.** Form Studio membuat proyek generate
  (`scaffold` generate + `research/brief.md` + `research/request.json`) dan memulai sesi
  `studio-<slug>` dengan prompt generate. Agent mengerjakan fase dan berhenti di gate; panel
  membaca artefak, mencatat keputusan, lalu mengetik keputusan itu ke sesi dengan
  `tmux send-keys -l` (teks literal, satu baris).
- **Posisi dari artefak, keputusan di `gates.json`.** `scripts/lib/gates.mjs` menghitung fase
  dari artefak dan menulis log keputusan `videos/<slug>/gates.json` (satu-satunya penulis;
  dipakai Studio dan `npm run video -- gate`). Persetujuan mengikat sidik jari sha256 file
  gate; file berubah → gate menunggu lagi.
- **Pilihan Dena menang.** Pilihan yang terisi di `research/request.json` (URL, repurpose,
  preset suara, durasi, style, musik) wajib dipakai agent; yang kosong ditentukan agent.
- **Revisi = catatan ke agent; edit naskah langsung di Gate 1** dengan "Buat ulang suara"
  (`video voice` sebagai job Studio).
- Publish tetap lewat tab Results (ADR-0003).

## Consequences

- Keputusan di chat juga dicatat agent dengan `npm run video -- gate`, jadi Studio dan chat
  melihat status yang sama.
- Panel bergantung pada sesi tmux yang hidup untuk menyampaikan keputusan; tanpa sesi,
  keputusan tetap tercatat dan "Mulai sesi lanjut" membawa keputusan terakhir.
- Agent Studio tetap berjalan tanpa prompt izin (ADR-0020); catatan Dena hanya lewat file
  prompt atau `send-keys -l`, tidak pernah lewat parser shell.

## Alternatives

- **Run headless per fase** (`claude -p` / `codex exec`, Studio sebagai state machine):
  status rapi, tetapi infrastruktur proses baru, konteks percakapan hilang, sulit diarahkan.
- **Tombol CLI per langkah + agent hanya menulis:** alur bolak-balik tombol ↔ agent, paling
  rumit dirawat.
