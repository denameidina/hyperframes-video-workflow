# RD-03 Video Editing Workflow
Status: accepted
Date: 2026-09-26

Domain: disiplin workflow 4 fase untuk video sosial Dena. Owner: `docs/agents/*`,
`docs/skills/dena-video-editing-workflow/SKILL.md`. Keputusan:
[ADR-0008](../adr/0008-four-phase-workflow.md). Detail operasional:
[operations/video-editing-workflow](../operations/video-editing-workflow.md).

## Urutan & routing

- **RD-03-01** (Event-driven) — When sebuah task video Dena dimulai, the system
  shall membaca `docs/skills/dena-video-editing-workflow/SKILL.md` sebagai router
  lalu dokumen fase yang relevan di `docs/agents/`.
- **RD-03-02** (Ubiquitous) — The system shall menjalankan fase berurutan
  Story → Screen Plan → Build sebelum review user, kecuali user meminta
  perbaikan teknis sempit.
- **RD-03-03** (Unwanted) — If fase Build hendak dimulai sebelum
  `creative-brief.md`, `edit-decision-notes.md`, `caption-beats.json`, dan
  `visual-plan.md` dengan bagian `Gate 2 Result` ada, then the system shall
  menolak dan kembali ke fase hulu yang kurang.
- **RD-03-04** (Ubiquitous) — Setiap fase hilir shall membaca artifact fase hulu
  di `videos/<slug>/`, bukan dokumen fase hulu.

## Gate

- **RD-03-05** (Event-driven) — When video raw baru diberikan, fase Story shall
  mentranskripsi sumber sebelum memilih hook.
- **RD-03-06** (State-driven) — While `gate_cut` bernilai `off` dan user tidak
  meminta review cut, fase Story shall menulis blok `## Cut Summary` di
  `edit-decision-notes.md` (kutipan hook `00:00.00-00:03.00`, durasi awal →
  akhir, bagian yang dibuang + alasan) lalu lanjut ke Screen Plan.
- **RD-03-07** (Optional) — Where `gate_cut` bernilai `on` atau user meminta
  review cut, fase Story shall berhenti dan menunjukkan `processed.mp4` beserta
  Cut Summary sebelum Screen Plan dimulai.
- **RD-03-08** (Unwanted) — If baris Timeline `visual-plan.md` cocok dengan
  pemicu R1–R6 (`docs/agents/02-screen-plan.md`), then fase Screen Plan shall
  berhenti dan menampilkan hanya baris yang ditandai, beserta pemicu dan satu
  alternatif aman per baris, sebelum Build.
- **RD-03-09** (Event-driven) — When tidak ada baris Timeline yang cocok dengan
  R1–R6, fase Screen Plan shall menulis `Gate 2: no triggers` di bagian
  `Gate 2 Result` lalu lanjut ke Build.
- **RD-03-10** (Event-driven) — When render final siap, fase Build shall berhenti
  untuk review user dan menawarkan approve, QA dulu, atau revisi.
- **RD-03-11** (Event-driven) — When user meng-approve render final tanpa memilih
  QA, the system shall lanjut ke gate publish tanpa mensyaratkan `qa-report.md`
  atau `final-approval.md`.
- **RD-03-12** (Optional) — Where user memilih QA, fase QA shall berjalan di
  subagent yang hanya menerima path slug, path render,
  `docs/agents/04-qa.md`, `docs/agents/references/qa-checklist.md`, serta
  batasan QA dari user bila ada.

## Handoff artifacts

- **RD-03-13** (Ubiquitous) — The system shall menghasilkan artifact milik tiap
  fase di `videos/<slug>/` bila slug ada: Story (`creative-brief.md`,
  `metadata.json`, `transcript.json`, `processed-transcript.json`,
  `edit-decision-notes.md`, `cut-list.json`,
  `processed.mp4`), Screen Plan (`caption-plan.md`, `caption-beats.json`,
  `publish-captions.md`, `visual-plan.md`, `overlay-timeline.json`), Build
  (`assets/asset-manifest.json` bila ada aset, `assembly-notes.md`,
  `assembly-checklist.md`).
- **RD-03-14** (Unwanted) — If artifact hulu hilang, then the system shall
  membuatnya lewat fase hulu yang benar atau menulis catatan blocker; tidak boleh
  mengarang keputusan yang hilang.

## Aturan konten (non-negotiable)

- **RD-03-15** (Ubiquitous) — The system shall memberi cakupan caption penuh:
  setiap kata terucap yang lolos cut punya beat caption (talking-head/storytelling).
- **RD-03-16** (State-driven) — While memproses video Dena default, the system
  shall memakai kecepatan `1.2x`; If kecepatan diturunkan, then the system shall
  mendokumentasikan alasan eksak di `edit-decision-notes.md`.
- **RD-03-17** (Ubiquitous) — The system shall membuat CTA non-promissory secara
  default; the system shall tidak menyiratkan janji "kirim/bahas/share source
  nanti" kecuali user memintanya eksplisit.
- **RD-03-18** (Event-driven) — When user memberi URL atau transkrip menyebut
  tool/produk/situs, fase Screen Plan shall meneliti/inspeksi dan merencanakan
  capture yang ditautkan ke jendela transkrip, dan fase Build shall menangkap
  screenshot/rekaman lokal yang direncanakan.
- **RD-03-19** (Ubiquitous) — Fase Screen Plan shall menulis `Visual Decision Log`
  di `visual-plan.md` untuk setiap peluang visual-support sebelum menyimpulkan
  generated media tidak perlu.
- **RD-03-20** (Unwanted) — If aset generated tampak generik/palsu/lepas dari
  workflow (AI slop), then the system shall menolaknya setelah maksimal satu
  revisi dan mendokumentasikan penolakan.
- **RD-03-21** (Ubiquitous) — The system shall menyertakan cue SFX yang audible
  namun tidak menutup speech; SFX hilang atau terlalu pelan adalah temuan review.

## Batas tanggung jawab

- **RD-03-22** (Ubiquitous) — The system shall menjaga tiap fase dalam batasnya:
  Screen Plan memutuskan visual dan timing; Build mengimplementasikannya di
  HyperFrames.
- **RD-03-23** (Ubiquitous) — Temuan review user atau QA shall dirutekan ke fase
  pemilik (Story, Screen Plan, atau Build), bukan menjadi "polish" kabur.

## Hook transkrip tiga detik

- **RD-03-24** (Event-driven) — When transkrip lengkap tersedia, fase Story shall
  memilih tepat satu potongan ucapan verbatim yang memuat intisari, puncak
  masalah, kontradiksi, atau curiosity gap sebagai hook utama.
- **RD-03-25** (Event-driven) — When hook utama dipindahkan ke awal, fase Story
  shall menempatkan awal potongan pada output `00:00.00`, mengakhirinya paling
  lambat `00:03.00` pada processed timeline, lalu melanjutkan ke penjelasan.
- **RD-03-26** (Unwanted) — If pemendekan hook diperlukan, then fase Story shall
  hanya membuang jeda atau filler tanpa mengubah makna; fase Story shall tidak
  menyambung kata terpisah untuk membuat klaim yang tidak pernah diucapkan.
- **RD-03-27** (Ubiquitous) — Fase Story shall mencatat timestamp sumber, kutipan
  verbatim, timing output, alasan pemilihan, transisi ke penjelasan, dan
  penanganan duplikasi hook di `edit-decision-notes.md` serta `cut-list.json`.
- **RD-03-28** (Event-driven) — When potongan sumber dipindahkan menjadi hook,
  fase Story shall menghapus kemunculan aslinya dari alur berikutnya kecuali
  pengulangan adalah callback yang diminta brief dan didokumentasikan.
- **RD-03-29** (Event-driven) — When fase Screen Plan membuat caption hook, fase
  Screen Plan shall memakai kata ucapan yang sama, mencakup setiap kata pada
  hook, dan menayangkannya dalam hook card yang dapat dipahami tanpa audio
  selama jendela `00:00.00`–`00:03.00`.
- **RD-03-30** (Unwanted) — If tidak ada potongan ucapan yang muat dalam tiga
  detik tanpa mengubah makna, then fase Story shall menandai blocker dan meminta
  keputusan user, bukan mengarang atau memanipulasi ucapan.

## Motion b-roll

- **RD-03-31** (Ubiquitous) — Fase Screen Plan shall memilih motion b-roll lebih
  dulu untuk kalimat yang menjelaskan, menunjukkan, membandingkan, atau
  berurutan, dan mencatat alasannya di Visual Decision Log.
- **RD-03-32** (Ubiquitous) — Setiap baris `motion-broll` di `visual-plan.md`
  shall punya Motion B-roll Brief dengan treatment (cutaway/split/panel) beserta
  alasan dan state per kata.
- **RD-03-33** (Unwanted) — If sebuah visual menutup wajah Dena penuh lebih dari
  10 detik atau menutup kalimat personal/emosional/opini, then Gate 2 shall
  menandainya sebagai R3.
- **RD-03-34** (Event-driven) — When fase Build selesai menulis clip motion
  b-roll, fase Build shall mengambil snapshot clip pada waktu kata kunci brief
  tanpa `GEMINI_API_KEY` dan memperbaiki temuan sebelum render.

## Style b-roll

- **RD-03-35** (Ubiquitous) — Fase Screen Plan shall memilih tipe motion visual
  (`motion-broll`, `broll-text`, `motion-graphic`, `whiteboard`, `stop-motion`,
  `vox`, `mix-media`, `parallax`) per baris lewat
  tabel "Choosing A Style" di `docs/agents/references/styles/README.md` dan
  mencatat alasannya di Visual Decision Log.
- **RD-03-36** (Ubiquitous) — Setiap baris `broll-text`, `motion-graphic`,
  `whiteboard`, `stop-motion`, `vox`, `mix-media`, atau `parallax` di `visual-plan.md` shall punya Style B-roll
  Brief dengan treatment, pola, palet (preset `sk-pal-*` atau hex), tipografi
  (preset `sk-type-*` atau `.sk-f-*`), beat per kata, `Library assets:`, dan
  daftar `Assets:`.
- **RD-03-37** (Unwanted) — If teks atau angka yang tampil di clip style b-roll
  tidak verbatim dari transkrip dan tidak diberikan user, then Gate 2 shall
  menandainya sebagai R1.
- **RD-03-38** (Unwanted) — If sebuah video memakai lebih dari tiga tipe motion
  visual, then fase Screen Plan shall mengurangi tipenya sebelum Gate 2.
- **RD-03-39** (Ubiquitous) — Fase Build shall memproduksi setiap bitmap di
  `Assets:` sebelum menulis clip-nya dan mencatatnya di `asset-manifest.json`
  dengan `provenance` (`generated`, `cc0`, `dena-footage`, atau `user`).
- **RD-03-40** (Unwanted) — If sebuah aset perlu menampilkan Dena, then fase
  Build shall memotongnya dari footage Dena (`remove-background`) dan tidak
  pernah meng-generate kemiripannya.
- **RD-03-41** (Unwanted) — If cutout hasil generate berisi teks, atau
  menggambarkan orang/brand nyata, then fase Build shall menolaknya dan
  meng-generate ulang (teks) atau menandainya Gate 2 R6 (orang/brand nyata).
- **RD-03-42** (Ubiquitous) — Setiap dokumen `capture` di clip `vox` shall
  menampilkan baris sumber (media/domain dan tanggal) ≥ 28 px selama ≥ 1,5 detik,
  dengan data privat diredaksi.
- **RD-03-43** (Ubiquitous) — Setiap dokumen `illustrative` di clip `vox` shall
  menampilkan tag "Ilustrasi" dan tidak meniru masthead, layout, atau logo media
  nyata.
- **RD-03-44** (Unwanted) — If highlight di clip `vox` menandai kata yang tidak
  diucapkan, atau frasa yang maknanya berubah di luar kalimat utuhnya, then fase
  Screen Plan shall memindahkannya sebelum Gate 2.
- **RD-03-45** (Event-driven) — When sebuah baris `mix-media` direncanakan, fase
  Build shall membuat cutout Dena dengan `npm run video -- cutout` untuk jendela
  klip itu, bukan dengan meng-generate kemiripannya.
- **RD-03-46** (Unwanted) — If sebuah plate latar parallax direkonstruksi
  (lubang bekas orang/objek ditambal Codex), then plate itu shall dicatat
  `provenance: "reconstructed"` dan tidak dipakai sebagai bukti.
- **RD-03-47** (Unwanted) — If sebuah foto arsip dipakai untuk parallax, then foto
  itu shall berstatus domain publik yang diverifikasi di halaman asetnya, dengan
  sumber dan alasan status dicatat di manifest.
- **RD-03-48** (Ubiquitous) — Gerak kamera clip `parallax` shall tetap di dalam
  Depth Budget (`parallax.md`) sehingga tepi plate dan celah antar-lapisan tidak
  terlihat.
- **RD-03-49** (Unwanted) — If sebuah capture di clip `vox` punya bagian yang
  diredaksi, then bar redaksi shall sudah menutup bagian itu sejak frame pertama
  clip, sehingga teks yang disembunyikan tidak pernah terbaca selama kartu
  bergerak masuk.
- **RD-03-50** (Event-driven) — When fase Screen Plan memilih motion visual,
  agen shall membaca `vendor/asset-lib/CATALOG.md` dan contact sheet gaya itu
  (`docs/agents/references/asset-catalog/sheets/`) sebelum meminta aset baru
  per video.
- **RD-03-51** (Ubiquitous) — Palet dan tipografi di Style B-roll Brief shall
  berupa preset bernama (`sk-pal-*`, `sk-grade-px-*`, `sk-type-*`) yang ada di
  `vendor/asset-lib/asset-lib.css`, atau hex eksplisit dengan alasan.
- **RD-03-52** (Ubiquitous) — Aset pustaka di daftar `Assets:` shall ditulis
  dengan id katalog yang ada di `vendor/asset-lib/catalog.json`.
- **RD-03-53** (Ubiquitous) — Pustaka aset shall mencatat setiap file di
  `catalog.json` dan `LICENSES.md`, ter-track di git, dengan total (pustaka +
  contact sheet) ≤ 25 MB.
- **RD-03-54** (Ubiquitous) — Setiap dokumen dari `SK.doc` shall menampilkan
  tag "Ilustrasi"; tag itu tidak bisa dimatikan.
- **RD-03-55** (Unwanted) — If sebuah aset per video menduplikasi aset yang
  sudah ada di pustaka, then fase Build shall memakai aset pustaka, kecuali
  brief mencatat alasannya.
- **RD-03-56** (Ubiquitous) — Setiap pola di tabel Patterns setiap referensi
  gaya shall punya minimal satu contoh yang bisa dirender di tabel Examples
  (`COVERED` di `scripts/style-docs.test.mjs` = semua gaya).
- **RD-03-57** (Ubiquitous) — Contoh gaya shall ditambahkan lewat
  `style-examples/<gaya>/examples.json`; `index.html` dan `snapshots.json` host
  shall dihasilkan oleh `npm run style-examples -- build`, tidak ditulis tangan
  ([ADR-0017](../adr/0017-per-style-example-hosts.md)).
- **RD-03-58** (Event-driven) — When Screen Plan memilih gaya untuk sebuah baris
  visual, the agent shall melihat `moodboard/sheets/<gaya>.webp` (dan
  `moodboard/local/<gaya>.webp` bila ada) sebelum menulis Style B-roll Brief.
- **RD-03-59** (Unwanted) — If sebuah still dari karya pihak lain diunduh untuk
  moodboard, then still itu shall hanya disimpan di
  `docs/agents/references/moodboard/local/` (gitignored) dan tidak pernah
  ter-track; moodboard yang di-commit hanya berisi studi buatan sendiri
  ([ADR-0018](../adr/0018-moodboard-studies.md)).

## Referensi

- Operasional detail: [operations/video-editing-workflow](../operations/video-editing-workflow.md)
- Keputusan: [ADR-0008](../adr/0008-four-phase-workflow.md) (menggantikan
  [ADR-0005](../adr/0005-seven-agent-workflow-discipline.md))
- Sistem visual: [design-system/visual-system](../design-system/visual-system.md)
