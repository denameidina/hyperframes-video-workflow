# Audit kualitas motion design — 30 September 2026

Status: audit dan rekomendasi; belum mengubah requirement, workflow, atau kode.

## Kesimpulan

Project ini sudah mempunyai fondasi produksi yang kuat dan beberapa frame showreel yang matang. Namun, proses yang ada belum membuat kualitas tersebut konsisten pada video explainer. Hambatan terbesar adalah desain scene yang belum benar-benar diuji sebelum Build, koreografi yang lebih kuat di dalam scene daripada antar-scene, dan verifikasi hasil bergerak yang lebih lemah daripada verifikasi HTML serta gambar diam.

Target berikutnya sebaiknya **membuktikan satu video dengan art direction dan finishing yang tuntas**, kemudian menjadikan cara memproduksinya standar. Menambah jumlah preset, aset, atau jenis transisi belum menyelesaikan celah ini.

Penilaian estetika di bawah adalah judgement desain berdasarkan sampel; bug dan pengukuran teknis diberi bukti terpisah. Audit ini tidak memberikan sertifikasi kualitas profesional atau verdict QA untuk semua video.

## Ruang lingkup dan bukti

- Audit utama ditambah tiga subagent dengan konteks terpisah: workflow, motion craft, dan audio/render.
- Membaca kontrak lokal, phase/reference terkait, implementasi engine/CLI, dan artefak produksi. Contoh visual mencakup FORM / FREQUENCY, Style Atelier, AI Agent Gagal, Badiblum Storynight Explainer, Hanoman, dan OpenAI Dots.
- Mengekstrak **36 frame baru langsung dari empat MP4 final**, termasuk sebelum/pada/setelah sambungan. Contact sheet lama dipakai sebagai bukti tambahan, bukan pengganti frame final.
- Mengukur stream dan audio sembilan MP4 dengan FFprobe/FFmpeg; memakai `input_i`/`input_tp` dari analisis `loudnorm`, tanpa mengubah MP4.
- `npm test`: **421 pass, 0 fail, 0 skip**. Reproduksi seek memakai script scene asli dengan DOM stub; reproduksi encode blur memakai fixture video sintetis di direktori sementara.
- Tidak melakukan full playback audiovisual atau listening test ponsel/headphone. Karena itu, rasa gerak sepanjang video, intonasi, dan kualitas subjektif sound mix masih memerlukan review tersebut.
- Audit tidak mengubah source, komposisi, konfigurasi, atau render. Perubahan `config/pronunciation.json` dan `config/voices.json` sudah ada sebelum audit. Tidak ada upload, publish, atau API berbayar yang dijalankan.

Rujukan `videos/` di bawah menunjuk artefak lokal yang diabaikan Git. Frame, hasil ukur, dan log bukti disertakan dalam folder evidence agar laporan tetap dapat ditinjau dari repo. Nomor baris source merekam kondisi pada saat audit.

Bukti tersimpan:

- [Frame sambungan FORM / FREQUENCY](motion-design-quality-audit-2026-09-30-evidence/form-frequency-render-samples.jpg)
- [Frame sambungan Style Atelier](motion-design-quality-audit-2026-09-30-evidence/style-atelier-render-samples.jpg)
- [Frame explainer AI Agent Gagal](motion-design-quality-audit-2026-09-30-evidence/ai-agent-gagal-render-samples.jpg)
- [Frame explainer Badiblum](motion-design-quality-audit-2026-09-30-evidence/badiblum-storynight-explainer-render-samples.jpg)
- [Hasil ukur sembilan MP4](motion-design-quality-audit-2026-09-30-evidence/render-audio-scan.json), [log reproduksi blur](motion-design-quality-audit-2026-09-30-evidence/blur-reproduction.txt), [reproduksi file bukan video](motion-design-quality-audit-2026-09-30-evidence/non-video-readiness-reproduction.json), dan [log tes](motion-design-quality-audit-2026-09-30-evidence/npm-test.txt).

## Kemampuan yang sudah ada

Tujuh gaya, motion/style/craft-kit, anticipation/overshoot/settle, spring, drawing, gerak on twos, layered SVG, parallax, motion blur, transition catalog, caption word timing, hybrid captions, source capture, voice listening test, licensed BGM, ducking, SFX, dan stem terpisah sudah tersedia. Koleksi Atelier menambahkan 112 SVG; paket portabel juga membawa 42 vector FORM / FREQUENCY.

Animasi bagian SVG benar-benar dipakai: node/spoke, authored pen order, daun kipas, flap/card envelope, serta event timeline. Tidak tepat menyebut seluruh library hanya gambar datar yang digeser. Lihat `videos/style-atelier/compositions/03-mg-orbit.html` (lokal), `videos/style-atelier/compositions/07-stop-fan.html` (lokal), dan `videos/style-atelier/compositions/08-stop-envelope.html` (lokal).

Showreel mempunyai `design.md` yang jelas tentang skala hero, peran font, quiet zones, motif, dan rhythm. Video explainer juga sudah mempunyai style world, makna visual, callback, dan timing per kata. Celahnya terletak pada ketuntasan serta bukti kualitas, bukan ketiadaan seluruh perencanaan.

## Temuan prioritas

P1 = paling berdampak untuk mencapai target output; P2 = memperkuat finishing dan keandalan; P3 = pengembangan selektif. Prioritas ini bukan kategori insiden keamanan.

| ID | Prioritas | Temuan | Jenis bukti | Owner perbaikan |
| --- | --- | --- | --- | --- |
| F01 | P1 | Storyboard approval belum memperlihatkan desain aktual proyek | Kontrak + kedua sheet | Screen Plan / tooling |
| F02 | P1 | Hierarki dan framing belum konsisten setara sampel terbaik | Frame final + judgement desain | Screen Plan / Build |
| F03 | P1 | Kontinuitas dan ritme belum menjadi keputusan handoff yang cukup tegas | Plan + kontrak; inferensi craft | Screen Plan |
| F04 | P1 | Teks dua scene bercampur pada frame sambungan; preflight temporal kurang | MP4 final + jalur runtime | Build / tooling |
| F05 | P2 | Pose berubah menurut urutan seek | Reproduksi script scene | Build |
| F06 | P2 | Sound finishing dan target master belum konsisten ditegakkan | Catatan produksi + analisis audio | Screen Plan / Build / tooling |
| F07 | P2 | Encode terakhir jalur blur tidak mempunyai profil kualitas eksplisit | Source + fixture nyata | Render tooling |
| F08 | P2 | Approval tidak mengikat semua keputusan kreatif yang disetujui | Source gate fingerprint | Gate tooling |
| F09 | P2 | File non-video bisa dianggap final render siap review | Reproduksi input bukan video | Render / gate tooling |
| F10 | P3 | Studi material tertentu belum mempunyai kedalaman gerak yang diisyaratkan shading | Source; judgement craft | Asset / Build |

### F01 — Storyboard saat ini masih berupa sheet referensi

[`scripts/lib/storyboard.mjs:103`](../../../scripts/lib/storyboard.mjs#L103) memilih still dari **contoh library**, kemudian memasangkannya dengan kata/timing proyek. Ini sesuai kontrak [`generate-mode.md:213–229`](../../../docs/agents/references/generate-mode.md#L213), bukan kesalahan implementasi terhadap spec.

Sheet Badiblum menampilkan warung, laptop, dan tulisan contoh “CATAT OTOMATIS LAPORAN JALAN SENDIRI” untuk narasi membaca bersama anak. Kedua `videos/badiblum-storynight-explainer/storyboard.md` (lokal) / `videos/ai-agent-gagal/storyboard.md` (lokal) menjelaskan penggunaan contoh ini. **Render final tidak dituduh memakai tulisan contoh tersebut.**

Konsekuensi: approval belum menguji komposisi final, wajah/karakter/aset, hierarki teks, dan hubungan antarscene. Pengguna masih harus membayangkan hasil sebenarnya.

Usulan: pisahkan moodboard referensi dari storyboard aktual. Sebelum animasi penuh, buat 3–5 style frame dengan kata/aset proyek: opening, scene penjelasan, payoff, serta scene tersulit. Tambahkan animatic sederhana memakai suara/musik terkunci dan proxy scene; uji sambungan tersulit 5–10 detik. Ini dapat masuk gate desain yang sudah ada, tanpa menambah approval untuk setiap scene.

Proses Ordinary Folk menghubungkan message, design/storyboard, animation, dan audio sejak awal, serta menggunakan animatic sebagai titik kerja audio. Ini pembanding proses, bukan bukti bahwa software tertentu menjamin hasil studio. [Sumber primer: Ordinary Folk — Process](https://www.ordinaryfolk.co/process).

### F02 — Desain frame perlu lebih tegas dan sesuai layar tujuan

FORM / FREQUENCY dan Atelier mempunyai headline besar, hero jelas, quiet zones, serta hierarki primer/sekunder. Pada frame explainer, hubungan tersebut lebih tidak merata. Contoh: Badiblum **43.30 s** menaruh satu buku/coin di bagian bawah dengan bidang kosong besar; nilai yang sedang dijelaskan masih tampil kecil di dalam coin. Scene capture **37.00 s** membawa seluruh body kartu, padahal fokus narasinya hanya penawaran utama. Lihat [bukti final](motion-design-quality-audit-2026-09-30-evidence/badiblum-storynight-explainer-render-samples.jpg).

Source mendukung framing itu: `videos/badiblum-storynight-explainer/compositions/broll/12-seribu-per-buku.html:22` (lokal) memakai teks coin 38 px pada kanvas 1080; `videos/badiblum-storynight-explainer/compositions/broll/11-dua-cara-capture.html:16` (lokal) memuat seluruh capture ke kartu. Angka 38 px memenuhi minimum teknis tertentu, tetapi belum tentu cukup sebagai pesan utama di ponsel.

Ini judgement desain, bukan larangan negative space, style paper, atau detail screenshot kecil. Ruang kosong dan detail kecil sah bila hierarkinya disengaja. Yang perlu dibuktikan adalah: perhatian jatuh ke pesan penting, bukan ke texture atau caption yang menanggung seluruh penjelasan.

Usulan: tulis art-direction sheet per proyek dengan satu konsep visual, fungsi warna, skala hero, peran font, keluarga bentuk/material, dan contoh framing. Uji actual style frame pada **360×640**, dengan satu fokus primer per beat. Saat angka/kata adalah point, beri posisi dan skala utama; crop bukti pada bagian relevan dengan konteks/sumber tetap tersedia. Adaptasi portrait perlu desain ulang komposisi, bukan sekadar memindahkan layout landscape. FEVR juga menyatakan pendekatan reframing per layar; ini pembanding proses. [Sumber primer: FEVR](https://wearefevr.com/).

Aset Atelier baru dibuat pada 30 September, sedangkan kedua explainer mulai pada 29 September. Audit tidak menyimpulkan bahwa proyek lama mengabaikan library yang saat itu belum tersedia. Integrasi library yang lebih kaya ke produksi berikutnya masih perlu dibuktikan.

### F03 — Rancang perpindahan gagasan dan ritme, bukan hanya entrance per scene

`videos/ai-agent-gagal/visual-plan.md:70` (lokal) memiliki banyak hard cut, satu sequence board yang berlanjut, dan callback. [`motion-grammar.md:7–16`](../../../docs/agents/references/motion-grammar.md#L7) menyediakan connected transitions sebagai referensi opsional. Jadi kontinuitas sudah dikenal, tetapi belum menjadi keputusan handoff rutin.

Selain itu, [`generate-mode.md:202`](../../../docs/agents/references/generate-mode.md#L202) meminta setiap scene terus berkembang dan tidak freeze; [`motion-craft.md`](../../../docs/agents/references/motion-craft.md) memiliki prinsip “Never freeze”. Dibaca secara kaku, aturan ini dapat mendorong gerakan kecil terus-menerus sekalipun penonton sedang membutuhkan hold tenang. Ini risiko interpretasi, bukan bukti bahwa semua video terlalu ramai.

Usulan: setiap batas scene mempunyai keputusan **cut beserta alasan**, atau elemen yang diwariskan, pose akhir/awal, posisi/scale, arah, momentum, waktu baca, dan landing audio. Pilih beberapa sambungan bermakna: misalnya paper pile yang berantakan tersusun menjadi workflow rapi, bukan reset ke scene baru. Beri beat reveal → develop → hold → transition; diam untuk membaca adalah pilihan sah. Continuity tidak harus berupa morph dan setiap cut tidak perlu efek.

Panjang empat detik dan wipe berulang pada showreel adalah keputusan showcase yang sah. Jangan menyamakan struktur paket studi dengan kesalahan produksi; yang penting adalah bagaimana grammar tersebut diadaptasi pada cerita sebenarnya.

### F04 — Ada frame tercemar di sambungan final Atelier

**Bug teramati pada MP4:** di **4.00 s**, “MAKE IT MATTER” dari bab pertama muncul di latar acid bab kedua; di **32.00 s**, “SEND THE IDEA” bertumpuk dengan dokumen VOX berikutnya. [Bukti sebelum/pada/setelah batas](motion-design-quality-audit-2026-09-30-evidence/style-atelier-render-samples.jpg).

`videos/style-atelier/index.html` (lokal) memakai endpoint sama pada mount berurutan. Runtime HyperFrames 0.7.24 yang terpasang memakai interval inklusif `time >= start && time <= end`; pada endpoint keduanya aktif. Mount tidak mempunyai stacking context terisolasi, sehingga z-index anak outgoing dapat menimpa background incoming. Ini tidak sesuai hard chapter cuts dalam `videos/style-atelier/design.md` (lokal).

Usulan: buat kepemilikan frame batas eksklusif dan isolasi stacking mount. Verifikasi seluruh **15 batas**, pada frame sebelum/batas/sesudah, termasuk render final. Jangan hanya menilai frame hero tengah scene.

Celah proses yang menjelaskan lolosnya bug: [`video.mjs:101`](../../../scripts/video.mjs#L101) menjalankan lint/validate/inspect; Build mewajibkan still dan export sanity, sementara full playback berada pada QA opsional ([Build](../../../docs/agents/03-build.md#L142), [render gate](../../../docs/skills/dena-video-editing-workflow/references/quality-gates.md#L129), [QA](../../../docs/agents/references/qa-checklist.md#L324)). Tambahkan playback final dengan audio dan sampling semua sambungan sebagai baseline Build. QA independen tetap pilihan pengguna.

### F05 — Seek scene typography tidak stateless

`videos/style-atelier/compositions/02-text-tempo.html:26` (lokal) mengubah transform `.headline` hanya ketika `t > 2.6`, tanpa assignment untuk waktu sebelumnya. [`SK.clip`](../../../vendor/style-kit/style-kit.js#L33) mengizinkan update berdasarkan waktu seek.

Reproduksi script asli dengan DOM stub: fresh **0.5 s → transform unset**; **3.5 s → translate(-35px,0px)**; kembali **0.5 s → masih translate(-35px,0px)**. State visual bergantung riwayat pemanggilan. Ini adalah bukti perilaku assignment, bukan pixel test browser.

Usulan: setiap properti yang diubah dihitung dari waktu pada setiap frame. Uji frame target fresh melawan seek late → target dan seek acak di semua scene, kemudian bandingkan pixels pada runtime sebenarnya. Bukti seek tunggal di [`rich-style-assets.md:52`](../design-system/rich-style-assets.md#L52) belum mencakup kasus tersebut.

### F06 — Sound finishing perlu dinilai sebagai bagian desain

Suara dan cue sudah ada dalam jumlah banyak. Namun, `videos/badiblum-storynight-explainer/assembly-notes.md:48` (lokal) mencatat marker squeak, pen scratch, dan scribble memakai `paper-slide`; baris 85 mengakui bunyi pengganti. Ini bukti assignment sementara, bukan kesimpulan bahwa hasil pasti terdengar buruk. Listening review masih diperlukan.

Target master dalam [`nfr.md:64–73`](../architecture/nfr.md#L64) belum menjadi check delivery otomatis. Pengukuran **audio MP4 final**, bukan source WAV:

| Render | Integrated loudness | True peak | Interpretasi |
| --- | --- | --- | --- |
| FORM / FREQUENCY | −16.72 LUFS | −0.30 dBTP | Headroom lebih kecil dari target kanonik |
| OpenAI Dots | −16.04 LUFS | −0.53 dBTP | Headroom lebih kecil dari target kanonik |
| Style Atelier | −17.92 LUFS | −1.64 dBTP | Target lebih tenang tercatat dalam kontrak produksi |
| AI Agent Gagal | −16.08 LUFS | −2.15 dBTP | Headroom aman; sedikit di bawah rentang loudness kanonik |
| Badiblum Explainer | −16.18 LUFS | −2.88 dBTP | Headroom aman; sedikit di bawah rentang loudness kanonik |

Nilai peak −0.30/−0.53 dBTP **tidak membuktikan clipping**. Loudness berbeda juga tidak otomatis buruk; format musik/showreel dapat mempunyai kebijakan berbeda. Celahnya adalah target/exception per format belum dinyatakan dan diverifikasi secara konsisten.

Usulan: sound palette kecil sesuai material/tindakan, transient yang mendarat pada aksi, decay yang disengaja, dan jeda untuk speech. Ukur master AAC akhir dengan target per format dan catatan exception; lakukan listening di ponsel/headphone. Banyak cue dan peak normalisation tidak menggantikan keputusan bunyi. Ordinary Folk membahas audio sejak awal dan sepanjang proyek, bukan hanya setelah animation. [Sumber primer](https://www.ordinaryfolk.co/process).

### F07 — Jalur blur kehilangan kontrol profil encode akhir

[`render-blur.mjs:31–32`](../../../scripts/render-blur.mjs#L31) meminta render high quality 120 fps, lalu menjalankan blend FFmpeg tanpa video codec/CRF/preset eksplisit. Fixture nyata dengan plan yang sama menghasilkan **libx264 CRF 23.0** pada tahap final; [log bukti](motion-design-quality-audit-2026-09-30-evidence/blur-reproduction.txt).

Efeknya adalah tambahan encode lossy dengan profil default yang tidak mengikuti kualitas pass pertama. Audit membuktikan profil encode, bukan mengukur seberapa besar detail hilang pada semua render. Grain, garis tipis, dan type perlu inspeksi visual.

Usulan: tentukan codec, kualitas, pixel format, metadata warna, dan delivery flags pada encode terakhir; validasi hasil serta preservation audio. [`render-blur.test.mjs`](../../../scripts/render-blur.test.mjs) saat ini menguji command plan, belum kualitas media hasilnya. Motion blur juga perlu keputusan per shot; paper on twos tidak otomatis membutuhkannya.

### F08 — Approval desain belum mengikat keseluruhan keputusan

[`gates.mjs:64–74`](../../../scripts/lib/gates.mjs#L64) sengaja mengecualikan `visual-plan.md` agar penulisan hasil gate tidak membatalkan approval. Gate storyboard mengikat sheet dan `storyboard.md`; `overlay-timeline.json`, perubahan style world, cue motion/SFX, dan pilihan BGM tidak ikut fingerprint tersebut.

Konsekuensi dari kode: perubahan plan/timeline dapat mempertahankan approval jika sheet dan storyboard tidak berubah. Audit tidak menemukan bukti bahwa perubahan tidak sah dilakukan pada sampel.

Usulan: fingerprint keputusan kreatif yang dinormalisasi, timeline, serta pilihan audio; pisahkan record approval dari plan kreatif. Sheet juga perlu ditandai stale bila dependency berubah. Tujuannya menjaga desain yang dibangun tetap sesuai desain yang ditinjau.

### F09 — Readiness render belum membuktikan file adalah video

[`gates.mjs:45–61`](../../../scripts/lib/gates.mjs#L45) menganggap file regular nonempty sebagai kandidat final render. `fingerprint()` meng-hash file itu tanpa probe/decode. Reproduksi **file teks 11 byte bernama `demo.mp4`** berhasil dipilih dan difingerprint. [Bukti](motion-design-quality-audit-2026-09-30-evidence/non-video-readiness-reproduction.json).

Ini tidak membuktikan MP4 proyek saat ini korup. Sembilan MP4 yang diperiksa mempunyai video H.264/yuv420p/BT.709 30 fps, audio AAC stereo 48 kHz, dan selisih durasi stream ≤33 ms. Probe stream sendiri belum merupakan decode penuh atau uji sinkronisasi perseptual.

Usulan: render ke file sementara, probe/decode hasil, cocokkan durasi/frame count/stream yang diharapkan, lalu promote secara atomik sebagai final. Tambahkan fixture media pendek offline untuk invalid file, interrupted output, cue onset/gain, final peaks, dan blur encoding. **421 tes lulus tidak sama dengan semua render bagus**, terutama karena media fixture audio tertentu adalah mock ([voice-fixtures](../../../scripts/voice-fixtures.mjs#L37)).

### F10 — Material premium tertentu masih bergerak sebagai artwork 2D

`videos/style-atelier/compositions/15-material.html:35` (lokal) dan `videos/style-atelier/compositions/16-finale.html:26` (lokal) terutama memutar/menskalakan seluruh artwork ribbon/prism/star/petal. Shading, highlight, dan facet tetap melekat pada gambar, meski named parts tersedia.

Ini batas craft selektif, bukan bug atau kegagalan seluruh library. Gerak SVG 2D sah dan dapat sangat bagus. Namun, ketika shot ingin memberi rasa benda sculptural dengan cahaya/depth yang berubah, transform luar saja membatasi kredibilitasnya.

Usulan: pilih hero shot yang layak mendapat animasi part, deformasi, specular/occlusion, atau rig 3D. Jangan menjadikan migrasi engine atau 3D untuk semua video sebagai prioritas awal. Frame terbaik proyek sudah menunjukkan bahwa art direction 2D yang kuat mempunyai nilai besar.

## Urutan tindak lanjut yang disarankan

| Tahap | Deliverable konkret | Syarat selesai |
| --- | --- | --- |
| 1. Tutup cacat terukur | Boundary visibility, stateless seek, profil blur, media readiness, target master | Reproduksi yang sekarang gagal menjadi pass; frame final dan audio terukur |
| 2. Buktikan desain | Art-direction sheet, 3–5 actual style frame, animatic proyek pilot | Pesan/focal point terbaca di ponsel; sambungan sulit dapat dinilai sebelum animasi penuh |
| 3. Selesaikan satu pilot | Satu explainer existing sebagai baseline, scene disusun mengikuti visual metaphor dan rhythm | Comparison baseline/revisi menunjukkan peningkatan hierarki, continuity, timing, dan sound finishing |
| 4. Jadikan reusable | Update EARS, dokumen fase, gate dependencies, fixture rendered media, contoh pendek yang representatif | Produksi berikutnya mengikuti pola yang sudah dibuktikan, bukan hanya bertambah opsi library |

Pilot sebaiknya satu video explainer dengan naskah/suara yang sudah disetujui, agar perubahan visual dapat dibandingkan dengan jelas. Sampel empat detik yang indah tidak cukup untuk membuktikan kualitas sepanjang narasi 50–60 detik.

Rubrik review pilot yang disarankan:

- **Komposisi/hierarki:** satu fokus primer per beat; informasi penting tetap terbaca pada 360×640; negative space mempunyai fungsi.
- **Visual storytelling:** objek/metafora menjelaskan hubungan sebab-akibat atau perubahan; kata/angka utama tidak hanya ditanggung subtitle.
- **Timing/spacing:** reveal, development, hold, dan exit disengaja; motion tidak mengganggu membaca.
- **Continuity:** cut beralasan atau carrier tersambung; semua batas bersih sebelum/pada/setelah sambungan.
- **Material/asset:** bahasa bentuk, arah cahaya, outline, texture, dan depth konsisten sesuai world.
- **Audio-visual:** cue sesuai tindakan, narration jelas, musik mendukung perubahan energi, master final mengikuti target/exception.

Ini usulan untuk perubahan selanjutnya. Audit ini hanya menambahkan laporan dan bukti, tidak mengubah gate produksi atau menandai video sebagai approved.

## Catatan tambahan tentang klaim determinisme

[`nfr.md:12–14`](../architecture/nfr.md#L12) menyebut output byte-stabil. Pixel/audio determinism, seek determinism, dan kesamaan bytes container adalah klaim berbeda. Pin renderer saja belum menjamin bytes yang sama lintas versi browser/FFmpeg; CI memasang FFmpeg dari distribusi. Simpan versi toolchain/flags dan tetapkan jenis repeatability yang benar-benar diuji. Bukti fresh/late/back pada F05 menunjukkan satu pelanggaran seek; audit ini belum membandingkan dua full encode untuk kesamaan bytes.

## Dokumen pemilik bila rekomendasi diimplementasikan

- Workflow/styleframes/animatic: `requirements/rd-03-video-editing-workflow.md`, `docs/agents/02-screen-plan.md`, `docs/agents/references/generate-mode.md`, `docs/agents/references/motion-grammar.md`.
- Craft/art direction: `design-system/visual-system.md`, `docs/agents/references/motion-craft.md`, reference style terkait.
- Render/seek/blur: `requirements/rd-02-composition-render.md`, `architecture/nfr.md`, `docs/agents/03-build.md`, quality gate reference.
- Audio: `requirements/rd-06-audio.md`, `architecture/nfr.md`, audio/cut references terkait.
- Approval dependency: RD-03, `architecture/data-model.md`, ADR baru bila kontrak gate berubah.

Perubahan perilaku berikutnya tetap memerlukan EARS terlebih dahulu sesuai standar repo. Laporan audit ini diregistrasikan di README; tidak ada perubahan requirement dalam sesi audit.
