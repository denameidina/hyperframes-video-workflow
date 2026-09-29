# Studio — Buat Video Generate dan Panel Review Gate — Design

Status: approved 2026-09-29 (sub-proyek 3 dari "generate video motion design")
Date: 2026-09-29

## Latar belakang

Sub-proyek 2 (`docs/superpowers/specs/2026-09-29-generate-mode-explainer-design.md`,
ADR-0025) menambahkan mode generate: explainer 30–90 detik dari brief, URL, atau
repurpose, dengan naskah + TTS sebagai sumbu waktu, dan tiga gate (naskah + suara,
storyboard, render). Video pertama (`videos/ai-agent-gagal`) dibuat lewat chat: Dena
menjawab setiap gate di percakapan, dan artefaknya (naskah, storyboard sheet, render)
hanya bisa dilihat lewat terminal atau `open`.

Studio (ADR-0020) sudah punya proyek, sesi agent Claude/Codex di tmux dengan terminal di
browser, Results + publish, serta tab Suara dan Musik dengan pemutar audio. Belum ada:
cara membuat proyek generate, dan tampilan artefak proyek untuk menjawab gate.

Sub-proyek ini membuat Dena bisa membuat video generate dari Studio: isi form, agent
bekerja, lalu setiap gate dijawab di panel review (HP atau laptop).

## Keputusan yang sudah diambil

- **Form = brief + opsi.** Wajib: brief. Opsional: URL sumber, proyek lama untuk
  repurpose, preset suara, durasi, style utama, musik. Opsi kosong = agent yang memilih
  (dan tetap dicek di gate).
- **Review di HP dan laptop.** Panel satu kolom, nyaman di lebar HP (Tailscale), rapi
  di laptop.
- **Revisi = catatan ke agent + edit naskah di Gate 1.** Setiap gate punya kotak catatan
  revisi; di Gate 1 Dena juga bisa mengedit `script.md` di panel lalu menekan "Buat ulang
  suara" (`video voice`, tanpa agent).
- **Pendekatan A: satu sesi agent per proyek, panel sebagai jendela.** Bukan run headless
  per fase, bukan tombol CLI per langkah. Agent (sesi `studio-<slug>` yang sudah ada)
  mengerjakan fase dan berhenti di gate; panel membaca artefak, mencatat keputusan, dan
  mengetik keputusan itu ke sesi.
- **Satu penulis status gate: `scripts/lib/gates.mjs` / `npm run video -- gate`.**
  Panel dan agent di chat sama-sama mencatat keputusan lewat modul ini, jadi status di
  Studio dan di chat selalu sama.
- Di luar cakupan: publish dari panel (tetap tab Results), format motion-short /
  kinetic-post / product-promo (sub-proyek 4–5), edit baris storyboard di panel, QA
  otomatis.

## 1. Status gate — `scripts/lib/gates.mjs`, `video gate`, `gates.json`

### Posisi dari artefak

Untuk proyek mode generate (`creative-brief.md` memuat `mode: generate`), posisi
dihitung dari artefak, bukan dari terminal agent:

| Kondisi (dicek berurutan) | `phase` | `gate` |
| --- | --- | --- |
| `script.md` atau `processed-audio.wav` belum ada | `story` | – |
| Gate 1 belum disetujui untuk sidik jari G1 sekarang | `gate` | 1 |
| `preview/storyboard-sheet.jpg` / `storyboard-sheet-N.jpg` belum ada | `screen-plan` | – |
| Gate 2 belum disetujui untuk sidik jari G2 sekarang | `gate` | 2 |
| `renders/<slug>.mp4` belum ada | `build` | – |
| Gate 3 belum disetujui untuk sidik jari G3 sekarang | `gate` | 3 |
| lainnya | `done` | – |

Sidik jari (sha256 per file):

- G1: `script.md`, `processed-audio.wav`.
- G2: semua `preview/storyboard-sheet*.jpg` (urut nama) dan `storyboard.md`.
  (`visual-plan.md` tidak ikut: agent menulis `## Gate 2 Result` ke dalamnya setelah
  persetujuan, jadi ia akan membuka gate lagi.)
- G3: `renders/<slug>.mp4`.

Persetujuan hanya berlaku untuk sidik jari yang disetujui: bila artefak berubah (suara
dibuat ulang, sheet baru, render baru), gate itu kembali menunggu.

Tambahan pada status:

- `state` (hanya untuk label panel): `waiting` bila belum ada keputusan untuk sidik jari
  ini; `revising` bila keputusan terakhir untuk sidik jari yang sama adalah `revise`;
  `qa` bila keputusan terakhir Gate 3 adalah `qa`. Tombol keputusan tidak bergantung pada
  `state` (lihat bagian 3): agent bisa selesai merevisi atau menjalankan QA tanpa
  mengubah artefak, dan gate tidak boleh terkunci karenanya.
- `voiceStale` (Gate 1): `script.md` lebih baru (mtime) dari `processed-audio.wav`.
  Setuju di Gate 1 tidak boleh selama `voiceStale`.

### `gates.json`

`videos/<slug>/gates.json`, log keputusan yang hanya ditambah:

```json
{
  "version": 1,
  "log": [
    { "gate": 1, "decision": "revise", "note": "CTA kurang natural", "at": "2026-09-29T08:10:00.000Z", "by": "studio", "fingerprint": { "script.md": "…", "processed-audio.wav": "…" } },
    { "gate": 1, "decision": "edit", "note": "naskah diedit di Studio", "at": "…", "by": "studio", "fingerprint": null },
    { "gate": 1, "decision": "approve", "note": "", "at": "…", "by": "studio", "fingerprint": { "script.md": "…", "processed-audio.wav": "…" } }
  ]
}
```

- `decision`: `approve`, `revise` (catatan wajib), `qa` (hanya Gate 3), `edit` (naskah
  diubah di Studio; hanya saat posisi di Gate 1; tanpa sidik jari, tidak mengubah status).
- `by`: `studio` atau `cli`.
- File ditulis atomik (`.part` lalu rename). Isi yang rusak atau versi lain → error
  yang menyebut file itu; tidak ditimpa diam-diam.

### API modul dan CLI

`scripts/lib/gates.mjs` (Node built-in saja, ADR-0007), waktu di-inject untuk tes:

- `fingerprint(dir, gate)` → `{ file: sha256 }`.
- `gateStatus(dir, { slug })` → `{ mode, phase, gate, state: 'waiting'|'revising'|null,
  voiceStale, fingerprint, last, log }`.
- `recordDecision(dir, { gate, decision, note, by, fingerprint, now })` → entri baru.
  Menolak (error berkode) bila: proyek bukan mode generate; `gate` bukan gate yang sedang
  menunggu; `fingerprint` yang dibawa tidak sama dengan sidik jari sekarang (`stale`);
  `approve` di Gate 1 saat `voiceStale`; `revise` tanpa catatan; `qa` di luar Gate 3.

CLI (`scripts/video.mjs`):

```bash
npm run video -- gate <slug>                              # status: fase, gate, keputusan terakhir
npm run video -- gate <slug> approve <n> [--note "…"]
npm run video -- gate <slug> revise <n> --note "…"
npm run video -- gate <slug> qa 3 [--note "…"]
```

CLI memakai sidik jari sekarang (agent di chat menyetujui apa yang ada di disk) dan
`by: "cli"`.

## 2. Form "Buat video" dan sesi

### Isi form (tab Generate)

| Isian | Aturan |
| --- | --- |
| Brief | wajib, 1–4000 karakter; disimpan kata per kata |
| Slug | otomatis dari kata-kata awal brief (slugify), bisa diubah; `checkSlug`, belum ada |
| URL sumber | opsional, maksimal 5, `http:`/`https:` saja |
| Repurpose | opsional, proyek di `videos/` yang punya `processed-transcript.json` |
| Preset suara | opsional, nama di `config/voices.json` (bukan provider `recorded`); default ditampilkan |
| Durasi | opsional, "otomatis" atau bilangan bulat 30–90 |
| Style utama | opsional: `motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`, `vox`, `parallax` |
| Musik | opsional, id lagu di katalog `shared/music/` yang tidak ditolak |
| Agent | runtime, model, effort (sama seperti dialog sesi yang ada) |

### Saat dikirim

1. Validasi semua isian di server; salah satu gagal → 400 dengan nama isiannya, tidak ada
   yang dibuat.
2. `scaffold({ slug, generate: true })` (sama dengan `video new <slug> --generate`), lalu
   `research/brief.md` (brief apa adanya, dengan judul dan tanggal) dan
   `research/request.json`:

   ```json
   { "version": 1, "brief": "…", "urls": [], "repurpose": null, "voice": null, "duration": null, "style": null, "music": null, "createdAt": "…" }
   ```

3. Mulai sesi `studio-<slug>` dengan prompt generate (di file `.studio/prompts/<slug>.md`,
   seperti sekarang):

   > Buat video mode generate (explainer) di `videos/<slug>/`. Brief Dena ada di
   > `research/brief.md`; pilihannya di `research/request.json` — pilihan yang terisi wajib
   > dipakai, yang kosong kamu tentukan. Ikuti `docs/skills/dena-video-editing-workflow/SKILL.md`
   > dan `docs/agents/references/generate-mode.md`. Berhenti di Gate 1 (naskah + suara),
   > Gate 2 (storyboard), dan Gate 3 (render); keputusan Dena datang sebagai pesan
   > "Gate N disetujui …" atau "Gate N revisi: …" dari Studio, dan sudah tercatat di
   > `gates.json`. Jangan publish ke Repliz — publish dilakukan Dena dari Studio.

4. Sesi gagal dimulai (tmux error, sesi sudah ada) → proyek tetap ada; respons menyebut
   alasannya dan panel menampilkan "Mulai sesi".

Prompt "lanjut" untuk proyek generate (tombol "Mulai sesi lanjut" di panel dan mode
continue di tab Sessions): baca artefak, jalankan `npm run video -- gate <slug>` untuk
posisi dan keputusan terakhir, lalu lanjutkan dari sana; keputusan terakhir yang belum
dijalankan agent disertakan di prompt.

## 3. Tab Generate dan panel review

### Tab Generate

- Kartu per proyek generate: slug, baris pertama brief, status ("Story berjalan",
  "Menunggu Gate 1", "Agent merevisi Gate 1", "Screen Plan berjalan", "Menunggu Gate 2",
  "Build berjalan", "Menunggu Gate 3", "Selesai"), status sesi (jalan / menunggu / tidak
  ada).
- Tombol "Buat video" membuka form. Kartu → panel proyek.

### Panel (satu kolom; lebar HP dulu, laptop maksimal ±720 px di tengah)

- Header: slug, status, status sesi, tautan "Terminal" (panel terminal yang ada),
  "Mulai sesi lanjut" bila tidak ada sesi.
- Isi per gate:
  - **Gate 1:** pemutar `processed-audio.wav`, durasi, preset, WER
    (`voice/voice-meta.json`); naskah per paragraf, paragraf 1 ditandai hook, `## Fakta`
    dilipat. "Edit naskah" → textarea + Simpan; "Buat ulang suara" → job `video voice`
    dengan log live; setelah selesai pemutar dimuat ulang. `voiceStale` → pesan "naskah
    berubah, buat ulang suara dulu" dan Setuju nonaktif.
  - **Gate 2:** storyboard sheet (semua halaman; ketuk untuk layar penuh), baris
    `storyboard.md` sebagai kartu (nomor, waktu, kata, style/pattern, yang tampil,
    contoh), bagian `## Style World` dan `## Music` dari `visual-plan.md`, pemutar lagu
    musik yang dipilih (rute musik yang ada).
  - **Gate 3:** pemutar `renders/<slug>.mp4`; bagian "Deviations From Plan" dan "Handoff
    Risks" dari `assembly-notes.md`. Tombol tambahan **QA dulu**.
  - **Fase berjalan / merevisi:** "Agent sedang mengerjakan <fase>…" + tautan terminal.
  - **Selesai:** tautan ke tab Results untuk publish.
- Riwayat keputusan (dilipat) dari `gates.json`.
- Bar aksi menempel di bawah: **Revisi** (membuka kotak catatan, wajib diisi) dan
  **Setuju** (catatan opsional). Aktif bila `phase` = `gate` dan sesi tidak `running`
  (menunggu atau tidak ada). Label mengikuti `state`: "Agent merevisi…" selama sesi
  `running` setelah `revise`; "Agent selesai tanpa mengubah artefak — cek terminal" bila
  sesi menunggu dan `state` = `revising`; "QA berjalan / laporan QA" (tautan
  `qa-report.md` bila ada) setelah `qa`.
- Panel memuat ulang status tiap 3 detik; elemen audio/video yang sedang diputar tidak
  digambar ulang (hanya diganti bila sidik jarinya berubah).

### Pesan ke sesi

Setelah keputusan tercatat, Studio mengetik satu baris ke `studio-<slug>` dengan
`tmux send-keys -t =studio-<slug>: -l "<teks>"` lalu `Enter`:

- approve: `Gate N disetujui dari Studio. Catatan: <catatan atau ->. Lanjutkan ke fase berikutnya.`
- revise: `Gate N revisi dari Studio: <catatan>. Perbaiki di fase pemiliknya, lalu berhenti lagi di Gate N.`
- qa: `Gate 3: Dena memilih QA dulu. Jalankan fase QA (docs/agents/04-qa.md) sebagai subagent baru, lalu kembali ke Gate 3.`
- Bila ada entri `edit` sejak keputusan Gate 1 terakhir, pesan Gate 1 diawali
  `Naskah diedit Dena di Studio dan suaranya sudah dibuat ulang; baca ulang script.md.`

Teks: satu baris, karakter kontrol dibuang, maksimal 1000 karakter (catatan dipotong
dengan "…").

## 4. Server Studio — `scripts/studio/generate.mjs`

Rute baru (di tabel rute `app.mjs`, lewat penjaga yang sama: Host, Origin, token):

| Metode | Path | Isi |
| --- | --- | --- |
| GET | `/api/generate` | daftar proyek generate + ringkasan status + status sesi |
| GET | `/api/generate/options` | preset suara (+ default), style, lagu musik (tidak ditolak), kandidat repurpose |
| POST | `/api/generate` | buat proyek + mulai sesi (bagian 2) → 201 `{ slug, session: { started, error } }` |
| GET | `/api/generate/<slug>` | detail: `gateStatus`, naskah, meta suara, baris storyboard, Style World, Music, render, catatan assembly, ada/tidaknya `qa-report.md`, riwayat, sesi; 404 bila bukan proyek generate |
| POST | `/api/generate/<slug>/decision` | `{ gate, decision, note, fingerprint }` → catat + kirim → `{ recorded, sent, error }`; 409 bila `stale` / bukan gate yang menunggu |
| PUT | `/api/generate/<slug>/script` | `{ text }` ≤ 20 KB, narasi tidak kosong (`scriptBody`); hanya di Gate 1 dan saat sesi tidak `running` (409) → tulis atomik `script.md` + entri `edit` |
| POST | `/api/generate/<slug>/voice` | mulai job `video voice <slug> [--preset <request.voice>]`; 409 bila job jalan atau sesi `running` |
| GET | `/api/generate/<slug>/voice/stream` | SSE log job (pola job publish di `results.mjs`) |
| POST | `/api/generate/<slug>/session` | mulai sesi lanjut `{ runtime, model, effort }` |

Rute `/media/<slug>/<path>` diperluas dengan daftar putih: `processed-audio.wav`,
`preview/storyboard-sheet.jpg`, `preview/storyboard-sheet-<N>.jpg`, `renders/<file>.mp4`
(yang sudah ada). Path lain → 404.

Dependency injection seperti modul Studio lain: `run` (tmux), `spawn` (job suara), `now`.

## 5. UI

- `scripts/studio/public/index.html`: tombol tab "Generate", section tab, dialog form.
- `scripts/studio/public/generate.js` (file baru; `app.js` sudah 553 baris): daftar, form,
  panel, job suara, polling. Memakai helper yang ada (fetch JSON, dialog, pemutar
  `<audio>`/`<video>` dengan `preload="none"` seperti Suara/Musik).
- `app.css`: gaya panel; bar aksi `position: sticky; bottom: 0`; tanpa scroll horizontal
  di 390 px.

## 6. Error dan keamanan

- Validasi form sebelum membuat apa pun (400 + nama isian).
- Keputusan membawa sidik jari yang dilihat Dena; berbeda → 409 "artefak berubah, muat
  ulang". Tidak ada persetujuan atas hasil yang belum dilihat.
- Sesi tidak ada saat keputusan dikirim → keputusan tetap tercatat, respons `sent: false`
  dengan alasan; panel menawarkan "Mulai sesi lanjut" (prompt membawa keputusan terakhir).
- Job suara gagal → suara lama tetap (`video voice` menulis di akhir), log tampil.
- Edit naskah hanya menulis `videos/<slug>/script.md`; ukuran dan isi dicek.
- Teks ke tmux lewat `send-keys -l` (literal), satu baris, tanpa karakter kontrol: catatan
  tidak bisa menekan tombol lain di terminal agent.
- URL hanya disimpan di `request.json`; Studio tidak mengambil isinya (agent yang meneliti).
- `video voice` membaca `.env` sendiri; proses anaknya tetap tanpa kunci Gemini (RD-06-25).
  Sesi agent tetap hanya menerima `PATH` (ADR-0020).

## 7. Tes

`node:test`, tanpa tmux / TTS sungguhan:

- `scripts/generate-gates.test.mjs` (masuk `test:video`): posisi dari artefak contoh untuk
  semua baris tabel; gate terbuka lagi setelah artefak berubah; `revising` sampai artefak
  berubah; `voiceStale`; semua penolakan `recordDecision`; `gates.json` rusak / versi lain;
  CLI `video gate` (status, approve, revise tanpa catatan, qa di Gate 1).
- `scripts/studio.test.mjs` (masuk `test:studio`): validasi form (setiap isian); proyek +
  `research/` + prompt; sesi gagal → proyek tetap; detail per gate; keputusan → entri +
  argumen `send-keys` (literal, satu baris, dipotong); 409 `stale`; `sent: false` tanpa
  sesi; edit naskah (ukuran, narasi kosong, entri `edit`); job suara (409 ganda / sesi
  sibuk, argumen `--preset`); daftar putih `/media`.
- Manual: screenshot headless Chrome di 390×844 dan 1280×800 untuk tab Generate, form,
  dan panel di tiap gate (proyek `ai-agent-gagal` dipakai sebagai contoh Gate 3 / selesai).

## 8. Dokumen

- ADR-0026 "Studio mode generate: form + panel review gate" (accepted).
- RD-05 (Studio): kriteria baru RD-05-21… untuk tab Generate, form, panel, keputusan,
  edit naskah, job suara, `/media` daftar putih.
- RD-03: kriteria baru RD-03-88… untuk `gates.json`, `video gate`, sidik jari, dan aturan
  bahwa keputusan gate di chat juga dicatat dengan `video gate`.
- `docs/agents/references/generate-mode.md`: `research/request.json` (pilihan terisi
  menang atas pilihan agent); di setiap gate agent berhenti, dan bila Dena menjawab di
  chat, agent mencatatnya dengan `npm run video -- gate …`; pesan dari Studio sudah
  tercatat.
- `CLAUDE.md` / `AGENTS.md`: perintah `video gate`, deskripsi `npm run studio`.
- `internal/docs/README.md` (indeks ADR), `internal/docs/entrypoints/rd.md`.
