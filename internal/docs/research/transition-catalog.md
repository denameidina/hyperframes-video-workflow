# Katalog transisi dan kebutuhan aset untuk AI Agent

Status: riset / referensi desain opsional. Tanggal pemeriksaan: 2026-09-30.
Owning area: riset motion; tidak mengubah gate, engine, atau skema overlay-timeline.

## Hasil dan batas bukti

**72 resep dalam 18 keluarga, 16 bundle kebutuhan aset.** Tujuh resep mengacu ke export v1 yang sudah dibuat; 65 adalah usulan produksi. Empat resep audio merupakan jembatan suara, bukan overlay visual. Keluarga saling beririsan: satu resep dapat menggabungkan makna, penutupan dan depth. Angka 72 menghitung resep desain yang berbeda; warna, arah, durasi dan aspect ratio bukan resep tambahan.

Ini perluasan [riset awal](motion-linked-transitions.md). [Catatan sumber primer tambahan](transition-expansion-sources.md) memisahkan kemampuan teknik dari inferensi produksi. [JSON](transition-catalog.json) memuat setiap ID, tujuan, media, aset, handoff, risiko, fallback, status dan sumber. JSON adalah reference data untuk dibaca agent, bukan API yang sudah dihubungkan ke runtime.

Dokumen creator dan dokumentasi teknik dibaca melalui halaman publik. Video tertanam tidak dianalisis frame-per-frame; tidak ada klaim timecode atau isi kursus berbayar. Resep, timing dan prioritas di bawah merupakan sintesis desain untuk kebutuhan teks, ilustrasi, screenshot, cut-out. Sumber mendukung mekanismenya, bukan membuktikan setiap resep sudah dirender di repo.

## Temuan yang mengubah persiapan aset

- **Kontinuitas identitas membutuhkan dua layout.** FLIP merekam keadaan sebelum/sesudah; di video, agent tetap membutuhkan koordinat A/B dan identitas yang sama. Flip tidak mendukung transform 3D. [P01](https://gsap.com/docs/v3/Plugins/Flip/)
- **Path, stroke dan fill adalah kebutuhan berbeda.** DrawSVG mengatur stroke; membuka isi gambar memerlukan matte tersendiri. MorphSVG menerima jumlah titik yang berbeda, tetapi segment mapping dan bentuk di tengah tetap diperiksa. [P02](https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/), [P03](https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/)
- **Tipografi perlu layout stabil.** Pisahkan hanya kata/glyph yang bergerak; font dan baseline siap sebelum menghitung anchor. SplitText menyediakan pemisahan/mask, bukan otomatis membuat makna transisinya. [P09](https://gsap.com/docs/v3/Plugins/SplitText/)
- **Motion yang konsisten membantu membaca hubungan.** Carbon mengaitkan motion dengan makna dan posisi layer; adaptasi katalog memakai identitas/arah yang konsisten dan landing pada isi penting. Ini pedoman desain, bukan bukti dampak engagement. [P06](https://carbondesignsystem.com/elements/motion/choreography/)
- **Aset alpha hanya membawa pixel overlay.** Overlay tidak otomatis memindah/menekuk screenshot di bawahnya. Distorsi memerlukan input scene dan compositor; depth memerlukan layer terpisah; J/L cut memerlukan audio scene. Lihat A02, A04, A05 dalam catatan sumber tambahan.

## Memilih resep saat Screen Plan

Baca bagian keluarga yang sesuai dengan hubungan A → B, lalu gunakan ID resep dalam catatan visual bila membantu. Untuk Build, buka daftar aset resep dan kontrak v1 jika memilih export yang sudah tersedia. Referensi ini opsional; tidak menambah field wajib atau gate produksi.

1. Nyatakan hubungan isi: objek yang sama, sebab-akibat, perubahan state, urutan, perbandingan, detail bukti, konteks, atau pindah bab.
2. Filter media dan treatment. Screenshot bukti mempertahankan sumber serta keterbacaan; cut-out perlu matte/clean plate; teks perlu baseline dan hold; footage pembicara perlu caption/face safe area.
3. Filter kemampuan: `implemented-v1` boleh memakai file yang tercatat. `research-proposal` membutuhkan aset dan validasi baru. Keberadaan primitive lokal tidak berarti preset siap.
4. Shortlist maksimal tiga resep; pilih sambungan yang paling jelas dengan biaya persiapan yang masuk akal. Tiga–empat perilaku berulang per video mengikuti style reference yang sudah berlaku, bukan kewajiban memakai semua keluarga.
5. Tentukan anchor A/B, momen handoff, target landing dan SFX cue. Fallback jika anchor, coverage atau keterbacaan gagal: cut yang jelas dengan framing tetap dan hold, atau connector statis.

Skor opsional untuk shortlist (sintesis): makna 0–3, kesinambungan bentuk/gerak 0–2, keterbacaan 0–3, kesiapan aset 0–2. Terapkan syarat mutlak sumber benar dan caption terbaca sebelum membandingkan skor; skor tinggi tidak membenarkan bukti palsu. Durasi di katalog adalah jendela motion usulan, belum termasuk waktu membaca. Durasi kontainer v1 tetap 3 s sesuai kontraknya.

| Kebutuhan adegan | Shortlist | Aset penentu | Fallback |
| --- | --- | --- | --- |
| Teks → bukti UI | TR-01-01, TR-07-04, TR-11-01 | Capture asli, source label, region rect | Cut ke crop bukti |
| Kata → penjelasan hubungan | TR-07-02, TR-06-01, TR-10-01 | Shared word, path, node | Kata + connector statis |
| Dulu → sekarang | TR-09-01, TR-10-02, TR-08-03 | State A/B, matte lokal | Before/after cut |
| Daftar → kelompok hasil | TR-11-03, TR-09-02, TR-14-01 | Separate items, target slots | Reveal item berurutan |
| Angka → data visual | TR-07-03, TR-06-04 | Nilai, unit, domain, source | Chart statis berlabel |
| Foto/ilustrasi → konteks ruang | TR-12-01, TR-12-04, TR-05-03 | Clean plate, layer depth, overscan | Pan 2D ringan |
| Scene berbeda tanpa objek sama | TR-04-01, TR-04-02, TR-16-04 | Full-cover occluder atau source ambience | Direct cut |
| Aksi menyebabkan hasil | TR-03-04, TR-11-01, TR-07-02 | Contact/click marker, true result | Label sebab → hasil |
| Objek sama, konteks berubah | TR-01-04, TR-01-03, TR-02-02 | Alpha subject atau persistent badge | Hold objek + background cut |
| Reveal kreatif, bukan bukti | TR-08-02, TR-13-01, TR-14-02 | Glyph counter, matte, fragments | Frame wipe |
| Narasi tetap mengalir melewati cut | TR-16-01, TR-16-02 | Scene audio, transcript relation | Cut pada jeda ujaran |
| Penutup kembali ke hook | TR-15-04 | Matching pose, velocity, audio tail | Ending hold |

## Katalog per keluarga

Mode: `overlay` = pixel penutup; `content` = gerak konten/layout; `geometry` = path/panel/fragmen; `depth` = scene berlapis; `compositor` = matte/distorsi dua scene; `audio` = mix suara. Mode utama tidak meniadakan kebutuhan tambahan pada resep.

### Identitas / shared element (`identity`)

Mode **content**, biaya relatif **rendah**, media: text, screenshot, illustration, cutout. Jendela motion usulan: 0.35–0.8 s.

Sambungan: Identitas, pusat, ukuran, crop dan radius A → B; sisakan hold setelah landing.

Kesiapan lokal: Frame/editable content v1; varian lain membutuhkan layout A/B. Referensi repo: `docs/agents/references/motion-broll-planning.md`. Sumber mekanisme: P01, P06, P07; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-01-01 — Frame handoff v1 | Teks → screenshot dalam bingkai yang sama | Frame SVG + dua content slot + crop rect | Pusat dan frame tetap; isi berganti pada state yang direncanakan | Frame tidak cocok dengan crop sumber; SFX: soft click | implemented-v1 |
| TR-01-02 — Hero thumbnail expand | Detail kecil → bukti besar | Capture resolusi tinggi + thumbnail rect + full rect | Objek yang sama membesar tanpa loncat anchor | Capture pecah pada zoom; SFX: short rise | research-proposal |
| TR-01-03 — Persistent badge rehome | Status yang sama pindah antar adegan | Badge terpisah + anchor A/B + palette token | Badge bertahan saat konteks berubah | Status baru berbeda arti dengan badge lama; SFX: soft tick | research-proposal |
| TR-01-04 — Subject carryover | Cut-out yang sama masuk konteks baru | Alpha cutout + clean plates A/B + pivot | Silhouette subjek tetap sambil latar berganti | Matte rambut buruk atau skala subjek berubah kasar; SFX: optional room tone | research-proposal |

### Graphic match (`match`)

Mode **content**, biaya relatif **rendah**, media: text, screenshot, illustration, cutout. Jendela motion usulan: cut–0.45 s.

Sambungan: Samakan silhouette atau komposisi pada frame potong; match cut boleh tanpa tween.

Kesiapan lokal: Primitive shape lokal; match antar konten tetap perlu aset pasangan. Referensi repo: `docs/agents/references/styles/motion-graphic.md`. Sumber mekanisme: P05, P10; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-02-01 — Circle node match v1 | Bentuk lingkaran → simpul diagram | Circle SVG + node target + ukuran/posisi | Circle bertemu node pada pose matching | Node kecil sehingga sambungan tak terbaca; SFX: pop | implemented-v1 |
| TR-02-02 — Silhouette object match | Ikon → objek ilustrasi dengan contour sejenis | Dua silhouette + bounding box + outline overlay untuk review | Contour dominan bertemu pada cut | Kemiripan bentuk hanya kebetulan tanpa makna; SFX: tap | research-proposal |
| TR-02-03 — Composition match | Foto/UI → scene dengan tata letak sama | A/B + anchor tiga elemen dominan + crop guide | Pola ruang dan focal point sejajar | Pasangan mengesankan dua bukti yang sebenarnya berbeda; SFX: none | research-proposal |
| TR-02-04 — Colour-field match | Bidang dominan A → bidang dominan B | Swatch asli + area mask + crop A/B | Bidang warna mengisi lokasi sama saat cut | Warna mengubah arti chart/status; SFX: short tonal bridge | research-proposal |

### Momentum dan lintasan (`momentum`)

Mode **content**, biaya relatif **sedang**, media: text, screenshot, illustration, cutout. Jendela motion usulan: 0.25–0.65 s.

Sambungan: Kecepatan dan arah keluar A diteruskan oleh B; fase deselerasi menghasilkan landing.

Kesiapan lokal: GSAP core tersedia; MotionPath plugin perlu diperiksa/dibundel bila dipilih. Referensi repo: `vendor/motion-kit/motion-kit.js`. Sumber mekanisme: P04, P05; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-03-01 — Momentum ribbon v1 | Aset bergerak diteruskan oleh aset berikut | Ribbon SVG + content groups + direction vector | A keluar dan B masuk dengan arah/ritme konsisten | Sekadar overlay sementara konten diam; SFX: passing whoosh | implemented-v1 |
| TR-03-02 — Path relay | Titik/cursor membawa perhatian ke asset B | Route SVG + carrier + start/end tangent | Tangent akhir carrier sejajar dengan gerak B | Lintasan melintasi caption atau wajah; SFX: zip | research-proposal |
| TR-03-03 — Whip pan match | Perpindahan cepat dalam ruang yang searah | Kanvas A/B + overscan + authored blur timing | A/B punya gerak searah; cut pada fase tercepat | Footage tanpa gerak cocok atau teks perlu dibaca; SFX: short whoosh | research-proposal |
| TR-03-04 — Impact transfer | Objek A menabrak pemicu lalu B muncul | Collider SVG + contact pivot + squash/recoil poses | Kontak pada frame yang sama dengan onset B | Bounce tidak sesuai benda atau narasi; SFX: impact tick | research-proposal |

### Penutupan / object wipe (`occlusion`)

Mode **overlay**, biaya relatif **rendah**, media: text, screenshot, illustration, cutout. Jendela motion usulan: 0.35–0.8 s.

Sambungan: Potong saat seluruh area konten tertutup; buktikan coverage pada frame hasil decode.

Kesiapan lokal: Paper wipe v1 tersedia; bentuk occluder lain membutuhkan produksi baru. Referensi repo: `docs/agents/references/styles/mix-media.md`. Sumber mekanisme: A01, A08; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-04-01 — Paper cover v1 | Pergantian scene di balik kertas | Oversized paper alpha + coverage mask + A/B | Cut hanya pada full coverage terdokumentasi | Kertas masih menyisakan celah; SFX: paper swipe | implemented-v1 |
| TR-04-02 — Foreground prop wipe | Benda adegan menjadi penutup | Cutout prop + clean silhouette + coverage trajectory | Prop menutup bidang konten sebelum swap | Prop tak terkait konteks; SFX: passing cloth/object sound | research-proposal |
| TR-04-03 — Hand palm cover | Gestur tangan mengantar adegan baru | Flat hand poses + hotspot + cover matte | Telapak menutup target crop dan membuka B | Pose berbeda dari gaya ilustrasi; SFX: hand swipe | research-proposal |
| TR-04-04 — Panel shutter | Panel modular menutup lalu membuka B | Panel strips SVG + stagger map + matte | Semua panel tertutup sebelum konten diganti | Gap antar panel bocor atau terlalu banyak gerak; SFX: sequential clicks | research-proposal |

### Kamera pada kanvas 2D (`camera`)

Mode **content**, biaya relatif **sedang**, media: text, screenshot, illustration, cutout. Jendela motion usulan: 0.5–1.2 s.

Sambungan: Posisi fokus dan skala kamera A/B; gerak selesai pada subjek yang disebut.

Kesiapan lokal: SK.cam tersedia; bukan kamera perspektif 3D. Referensi repo: `vendor/style-kit/style-kit.js`. Sumber mekanisme: P05, A04; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-05-01 — Portal camera v1 | Masuk detail melalui bukaan | Portal SVG + content mount A/B + focal anchor | Detail B mengisi bukaan saat kamera landing | Bukaan hanya menambah ornamen; SFX: rise then settle | implemented-v1 |
| TR-05-02 — Zoom into screenshot region | Konteks → detail bukti | Real capture + region rect + scale limit + source label | Landing tepat pada region yang disebut | Zoom mengaburkan provenance atau pixel detail; SFX: subtle zoom | research-proposal |
| TR-05-03 — Canvas pan continuation | Dua bagian dari satu papan besar | Wide canvas + layout A/B + path camera | B berada dalam koordinat papan yang sama | Scene tak berhubungan dipaksa menjadi ruang sama; SFX: none or air shift | research-proposal |
| TR-05-04 — Frame tunnel | Perjalanan melewati frame bertingkat | Nested frames + authored scale/focus + final content | Frame terakhir berimpit dengan framing B | Terlalu banyak frame menyita waktu pesan; SFX: layered rise | research-proposal |

### Evolusi bentuk vector (`vector`)

Mode **geometry**, biaya relatif **sedang**, media: text, illustration. Jendela motion usulan: 0.4–0.9 s.

Sambungan: Path/subpath dan orientasi dipetakan; endpoint sama dengan bentuk B tanpa pop.

Kesiapan lokal: Morph v1 authored; plugin MorphSVG belum otomatis dipasang oleh katalog. Referensi repo: `internal/docs/design-system/transition-assets.md`. Sumber mekanisme: P03, A06; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-06-01 — Underline to arrow v1 | Penekanan kata → jalur penjelasan | Path underline/arrow + common pivot + target node | Garis yang sama selesai sebagai arah B | Arrow mengarah ke hubungan yang salah; SFX: pen zip | implemented-v1 |
| TR-06-02 — Icon state morph | Proses → hasil dengan ikon berganti | Path state A/B + segment map + final label | B terbaca sebagai ikon yang dimaksud | Morph menghasilkan silhouette aneh; SFX: small chime | research-proposal |
| TR-06-03 — Blob to container | Bentuk abstrak → wadah konten | Closed path states + content mask + endpoint frame | Blob menetap jadi container sebelum isi terbaca | Gaya evidence/serius tidak cocok elastisitas; SFX: soft plop | research-proposal |
| TR-06-04 — Line to chart | Jalur → struktur data | Polyline states + scale/axes + real data mapping | Endpoint cocok chart yang berlabel | Data hanya dibuat agar morph bagus; SFX: tick | research-proposal |

### Handoff makna (`semantic`)

Mode **content**, biaya relatif **sedang**, media: text, screenshot, illustration, cutout. Jendela motion usulan: 0.4–0.9 s.

Sambungan: Kata, angka atau hubungan yang sama muncul dalam fungsi berikutnya; makna harus benar.

Kesiapan lokal: Semantic label v1 tersedia; data dan pasangan per adegan tetap perlu authored. Referensi repo: `docs/agents/references/styles/vox.md`. Sumber mekanisme: P05, P06; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-07-01 — Label to laptop v1 | Nama objek → objeknya | Label chip + laptop vector + label/object anchors | Label mengantar laptop pada noun landing | Objek tak sesuai kata di naskah; SFX: tap | implemented-v1 |
| TR-07-02 — Keyword to diagram node | Klaim verbal → bagian diagram | Editable keyword + node label + route SVG | Kata yang sama tetap terlihat saat pindah peran | Diagram memberi causal claim tanpa dasar; SFX: pen tick | research-proposal |
| TR-07-03 — Number to bar | Angka → besar visual yang proporsional | Numeric text + chart bar + domain/units + source | Nilai dan skala tetap benar setelah handoff | Nilai/denominator belum terverifikasi; SFX: count tick | research-proposal |
| TR-07-04 — Tool label to capture | Nama tool → UI asli | Label + real capture + source/date + focal rect | Nama tetap terbaca dan fokus menuju fungsi disebut | Mock UI disajikan sebagai bukti; SFX: click | research-proposal |

### Tipografi sebagai penghubung (`type`)

Mode **content**, biaya relatif **sedang**, media: text, screenshot, illustration. Jendela motion usulan: 0.3–0.8 s.

Sambungan: Baseline, kata bersama dan panjang glyph; teks terbaca sebelum dan sesudah transisi.

Kesiapan lokal: Helper teks ada; glyph mask/split perlu layout deterministik. Referensi repo: `docs/agents/references/styles/broll-text.md`. Sumber mekanisme: P08, P09; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-08-01 — Shared word bridge | Kalimat A → kalimat B berbagi kata | Dua teks + shared-word anchor + final baselines | Satu kata bertahan; bagian lain berubah | Kata bersama tidak membawa makna; SFX: none | research-proposal |
| TR-08-02 — Glyph counter portal | Masuk lewat lubang huruf menuju gambar | Glyph outline berlisensi + counter mask + destination | Counter mengisi frame lalu B menetap | Caption penuh atau glyph kehilangan keterbacaan; SFX: short rise | research-proposal |
| TR-08-03 — Baseline roll replace | Istilah lama → istilah baru di slot yang sama | Word groups + line mask + font metrics | Baseline B berada tepat di slot A | Panjang kata memecah layout; SFX: soft type tick | research-proposal |
| TR-08-04 — Outline to image fill | Judul memperkenalkan visual dalam huruf | Outlined title + image fill + expand matte + full image | Isi huruf berlanjut sebagai image B | Evidence kecil tak terbaca dalam huruf; SFX: soft reveal | research-proposal |

### Kertas fisik / replacement (`paper`)

Mode **geometry**, biaya relatif **sedang**, media: text, screenshot, illustration, cutout. Jendela motion usulan: 0.4–1.0 s.

Sambungan: Engsel/robekan dan bayangan mengikuti material; pose stepped atau simulasi dipilih eksplisit.

Kesiapan lokal: SK.torn/onTwos/piece ada; mesh realistis membutuhkan pre-render baru. Referensi repo: `docs/agents/references/styles/stop-motion.md`. Sumber mekanisme: A07, A12; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-09-01 — Tear reveal | Cara lama dibuka untuk hasil baru | Torn cover + irregular edge + reveal matte + backside shadow | Robekan membuka B dari titik yang masuk akal | Straight edge tampak seperti slide biasa; SFX: paper rip | research-proposal |
| TR-09-02 — Fold unfold panels | Satu konsep → beberapa bagian | Hinged panels + front/back textures + crease + per-item content | Panel final mendatar, urutan mengikuti jumlah yang disebut | Lipatan menutupi bagian yang belum dibaca; SFX: crease | research-proposal |
| TR-09-03 — Crumple away | Buang state lama lalu tunjukkan pengganti | Replacement crumple poses atau mesh bake + clean B | Sisa A keluar; B punya hold | Kertas datar sekadar diskalakan tanpa material cue; SFX: crumple | research-proposal |
| TR-09-04 — Sticker peel reveal | Lepas label untuk membuka fakta | Sticker front/back + peeled corner + contact shadow + mask | Label terangkat dari corner dan fakta B tetap diam | Foto nyata/bukti ikut melengkung palsu; SFX: peel | research-proposal |

### Garis / draw / erase (`line`)

Mode **geometry**, biaya relatif **rendah**, media: text, illustration, screenshot. Jendela motion usulan: 0.3–0.9 s.

Sambungan: Tip stroke terakhir menjadi awal elemen B; fill reveal memakai mask terpisah.

Kesiapan lokal: SK.drawSeq, SK.highlight, pose tangan tersedia; path baru disiapkan. Referensi repo: `docs/agents/references/styles/whiteboard.md`. Sumber mekanisme: P02, A01; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-10-01 — Draw connector handoff | Ide A dihubungkan ke B | Stroke SVG + ordered path + endpoint + optional flat hand | Tip stroke mencapai node B saat onset label | Banyak garis serentak membingungkan; SFX: pen scratch | research-proposal |
| TR-10-02 — Erase correct redraw | Koreksi pemahaman lama | Old/new strokes + erase matte + hand/eraser hotspot | Old stroke terhapus lokal lalu B digambar | Hapus seluruh board menghilangkan konteks; SFX: eraser rub | research-proposal |
| TR-10-03 — Marker band to panel | Sorotan kata menjadi panel bukti | Highlight SVG + panel rect + anchored text | Band meluas menjadi ruang B; kata tetap terbaca | Menyorot semua teks sekaligus; SFX: marker swish | research-proposal |
| TR-10-04 — Scribble matte reveal | Sketsa membuka ilustrasi | Scribble stroke + thickness + reveal matte + B | Matte benar-benar mengungkap isi, bukan hanya stroke dekoratif | Isi B tetap terlihat sebelum reveal; SFX: scribble | research-proposal |

### Kontinuitas antarmuka (`ui`)

Mode **content**, biaya relatif **sedang**, media: screenshot, text, illustration. Jendela motion usulan: 0.35–0.8 s.

Sambungan: State UI, cursor hotspot dan slot layout konsisten; aksi menghasilkan state yang benar.

Kesiapan lokal: Motion-broll ada; bukan otomatisasi browser atau bukti UI asli. Referensi repo: `docs/agents/references/motion-broll-planning.md`. Sumber mekanisme: P01, P06, A09; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-11-01 — Cursor click expand | Aksi UI → detail UI | Cursor vector + measured hotspot + before/after capture + target rect | Click mendahului state change dan fokus tetap pada target | Aksi tool direkayasa tanpa label demo; SFX: click | research-proposal |
| TR-11-02 — Drag card to slot | Pemindahan file/item dalam workflow | Separate card + source/destination slot + drag route + pointer | Card tiba di slot lalu state sukses muncul | Capture datar tidak bisa memisahkan card dengan bersih; SFX: drop tick | research-proposal |
| TR-11-03 — Grid reflow | Daftar → kelompok atau hasil filter | Separate cards + A/B rects + persistent item IDs | Item mempertahankan identitas saat layout berubah | Produk UI tidak mendukung state yang diperagakan; SFX: light shuffle | research-proposal |
| TR-11-04 — Scroll to anchored proof | Ringkasan → detail di halaman yang sama | Tall real capture + viewport mask + heading/source anchors | Scroll landing pada heading bukti | Screenshot terlalu pendek atau konteks dipotong menyesatkan; SFX: optional wheel cue | research-proposal |

### Kedalaman / multiplane (`depth`)

Mode **depth**, biaya relatif **tinggi**, media: cutout, screenshot, illustration. Jendela motion usulan: 0.6–1.3 s.

Sambungan: 2–5 layer, depth, focus, overscan dan plate tertutup lubangnya; caption di layer tenang.

Kesiapan lokal: SK.layer/camera/dof/dollyZoom ada; sumber layer harus disiapkan. Referensi repo: `docs/agents/references/styles/parallax.md`. Sumber mekanisme: A04, A11, A15; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-12-01 — Multiplane pass through | Masuk dari foreground ke scene belakang | 2–5 layers + clean plate + depth/perspective + overscan | Foreground lewat kamera lalu fokus B menetap | Plate punya lubang bekas subjek; SFX: passing whoosh | research-proposal |
| TR-12-02 — Near object depth wipe | Objek dekat menyembunyikan cut | Alpha foreground + blur/depth map + covered A/B | Occluder near menutup frame sebelum swap | Blur mengaburkan caption; SFX: low whoosh | research-proposal |
| TR-12-03 — Rack focus handoff | Perhatian pindah dari A ke B tanpa cut besar | Separate layers A/B + focus depths + sharp text layer | B tajam saat disebut; A turun prioritas | Kedua bukti perlu dibaca bersamaan; SFX: none | research-proposal |
| TR-12-04 — Layer peel to context | Detail → konteks berlapis | Layer stack + ordered peel route + reconstructed hidden areas | Lapisan keluar satu per satu dan B lengkap | Tidak ada informasi nyata di lapisan bawah; SFX: soft paper taps | research-proposal |

### Tekstur / luma / distorsi (`material`)

Mode **compositor**, biaya relatif **tinggi**, media: text, screenshot, illustration, cutout. Jendela motion usulan: 0.4–1.0 s.

Sambungan: Matte dan displacement adalah kanal berbeda; state B selesai bersih dan terbaca.

Kesiapan lokal: Ada tekstur lokal; compositor/shader per resep belum diverifikasi di HyperFrames. Referensi repo: `docs/agents/references/asset-catalog/sheets/texture-1.webp`. Sumber mekanisme: A01, A02, A14; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-13-01 — Ink luma reveal | Pergeseran bab dengan tekstur organik | Animated grayscale ink matte + A/B + endpoints | Threshold selesai bersih; B tanpa residue | Tekstur menyamarkan detail bukti; SFX: wet swish | research-proposal |
| TR-13-02 — Directional displacement | Bergeser melalui medan distorsi | Displacement map + two scene inputs + UV edge policy | A/B kembali normal sebelum membaca | Hanya alpha overlay tetapi berharap memindahkan pixel konten; SFX: digital sweep | research-proposal |
| TR-13-03 — Liquid bridge | Bentuk cair membawa warna ke scene baru | Blob/matte sequence + optional displacement + colour endpoint | B terbuka pada bentuk terakhir; endpoint bersih | Screenshot/teks bukti dibengkokkan; SFX: soft liquid | research-proposal |
| TR-13-04 — Texture rub replacement | Material lama digosok menjadi material baru | Grain/rub matte + two plates + reveal progression | Reveal lokal sesuai arah gesek | Footage real tertutup grain terus menerus; SFX: dry rub | research-proposal |

### Pecahan / assemble (`assembly`)

Mode **geometry**, biaya relatif **tinggi**, media: illustration, text, screenshot, cutout. Jendela motion usulan: 0.5–1.2 s.

Sambungan: Setiap fragmen punya asal, tujuan, urutan dan seed tetap; B utuh setelah settle.

Kesiapan lokal: Authored fragment sederhana mungkin HTML; simulasi baru membutuhkan bake/pre-render. Referensi repo: `vendor/asset-lib/src/items.json`. Sumber mekanisme: A03, P05; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-14-01 — Tile assemble | Bagian tersebar membentuk konten B | Content split grid + per-tile UV/crop + target rects + order | Semua tile kembali tepat tanpa seam | Teks terpecah terlalu lama; SFX: small sequential taps | research-proposal |
| TR-14-02 — Fragment scatter reform | A pecah lalu menjadi bentuk B | Authored fragments + source/target map + seed + pivots | Fragmen berhenti sebagai silhouette B yang jelas | Fragmen random tanpa tujuan/sulit direproduksi; SFX: scatter then settle | research-proposal |
| TR-14-03 — Line particles to node | Jalur data berakhir pada satu simpul | Particle sprites + path + seed + node target | Partikel berkumpul tepat di node B | Jumlah partikel menutupi label; SFX: tiny ticks | research-proposal |
| TR-14-04 — Cutout inventory stack | Beberapa objek membentuk satu paket konsep | Alpha object set + stack anchors + shadows + final label | Object menyusun kelompok B dengan satu focal point | Tumpukan objek generic tak sesuai naskah; SFX: paper/object taps | research-proposal |

### Waktu / editorial loop (`time`)

Mode **content**, biaya relatif **sedang**, media: text, screenshot, illustration, cutout. Jendela motion usulan: 0.25–0.9 s.

Sambungan: Pose dan fase A/B sesuai; loop menyamakan frame serta audio boundary.

Kesiapan lokal: Replacement helper ada; footage reversal/speed dan loop perlu keputusan editorial. Referensi repo: `docs/agents/references/styles/stop-motion.md`. Sumber mekanisme: P10, P05, A11; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-15-01 — Replacement pose match | Pergantian gambar lewat pose sama | A/B drawings + pose landmarks + cadence map | Pose matching pada pergantian frame | Footage manusia dipaksa menjadi puppet tanpa alasan; SFX: optional tick | research-proposal |
| TR-15-02 — Freeze frame to card | Momen footage menjadi objek grafis | Exact frame export + timestamp + frame card + next layout | Frame yang sama tetap saat live berhenti lalu mengecil | Still bukan frame sumber sehingga continuity palsu; SFX: shutter subtle | research-proposal |
| TR-15-03 — Reverse gesture bridge | Pembatalan membawa balik ke state awal | Reversible motion poses + intent label + original state | Gerak balik selesai di state yang benar | Membalik ujaran/aksi bukti dan mengubah arti; SFX: reverse swish | research-proposal |
| TR-15-04 — Seamless loop handoff | Penutup kembali ke pembuka | First/last layout + matched carrier phase + audio tail | Pose, velocity dan audio boundary cocok | CTA terpotong atau frame reset terlihat; SFX: loop-safe bed | research-proposal |

### Audio sebagai jembatan (`audio`)

Mode **audio**, biaya relatif **rendah**, media: text, screenshot, illustration, cutout. Jendela motion usulan: 0.15–1.2 s overlap.

Sambungan: Envelope, sumber suara dan kata tetap jelas; J/L memerlukan audio scene, bukan hanya whoosh.

Kesiapan lokal: 7 SFX v1 ada; bridge per scene membutuhkan source audio dan mix. Referensi repo: `docs/agents/references/motion-grammar.md`. Sumber mekanisme: A05, P05; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-16-01 — J cut scene preview | Suara B mengantar sebelum visual B | Scene B audio pre-roll + A/B media + word boundaries | Audio B mulai saat A masih tampil; visual B menyusul | Voiceover jadi dobel atau konteks suara keliru; SFX: source sound B | research-proposal |
| TR-16-02 — L cut thought carry | Kalimat A berlanjut saat visual B muncul | Scene A audio tail + B visual + clear transcript relation | Audio A tetap jelas di atas B lalu selesai | B membantah/mengaburkan ujaran A; SFX: source speech A | research-proposal |
| TR-16-03 — Impact cue bridge | Aksen suara menyatukan landing visual | Transient WAV + motion contact marker + mix envelope | Puncak transient tepat pada kontak/landing | Whoosh panjang menggantikan cue kontak; SFX: tick/knock | research-proposal |
| TR-16-04 — Ambience continuity | Ruang tetap terasa terhubung antar visual | Licensed/source room tone + loopable tail + crossfade envelopes | Bed mulus melewati pergantian scene | Ambience mengesankan lokasi nyata yang berbeda; SFX: room tone | research-proposal |

### Reveal geometris / rank map (`mask`)

Mode **compositor**, biaya relatif **sedang**, media: text, screenshot, illustration, cutout. Jendela motion usulan: 0.3–0.8 s.

Sambungan: Scene A/B dimasking menurut pivot/arah/rank; endpoint hanya B, tanpa crop residu.

Kesiapan lokal: clip-path dasar ada; rank-map sampling perlu implementasi dan uji baru. Referensi repo: `vendor/style-kit/style-kit.js`. Sumber mekanisme: A01, A14; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-17-01 — Iris focus reveal | Pusat perhatian membuka konteks B | Circle/shape matte + pivot focal + A/B + open/close endpoints | B muncul dari subjek yang disebut dan mask berakhir full frame | Pivot hanya di tengah default tanpa alasan isi; SFX: soft aperture | research-proposal |
| TR-17-02 — Radial sweep | Progres/putaran membuka tahap berikut | Radial matte + center/angle + clockwise semantic + A/B | Sektor membuka B sesuai urutan; final tanpa seam | Arah putaran menyesatkan urutan data; SFX: short sweep | research-proposal |
| TR-17-03 — Rank-map ordered reveal | Bagian A berganti B menurut urutan luminance | Grayscale rank map + neutral policy + threshold/softness + A/B | Urutan reveal terkontrol lalu B sepenuhnya terbuka | Map dibuat sebagai texture acak tanpa hierarchy; SFX: texture matched cue | research-proposal |
| TR-17-04 — Strip blinds reveal | Bidang modular berganti tanpa menggerakkan isi | Strip mask + thickness/gap + reveal angle + A/B | Semua strip mencapai endpoint dan isi B tidak terpotong | Strip membuat judder atau menghalangi detail kecil; SFX: soft shutter | research-proposal |

### Kartu / panel dua sisi (`modular`)

Mode **geometry**, biaya relatif **sedang**, media: text, screenshot, illustration. Jendela motion usulan: 0.4–1.0 s.

Sambungan: Front A/back B, UV/crop, hinge dan urutan panel cocok; final grid utuh.

Kesiapan lokal: CSS 3D primitive ada; resep dua sisi dan crop-grid belum diproduksi. Referensi repo: `docs/agents/references/styles/stop-motion.md`. Sumber mekanisme: A14, P01, A13; setiap resep adalah sintesis.

| ID / resep | Tujuan | Aset yang disiapkan | Handoff yang diperiksa | Tolak bila / SFX | Status |
| --- | --- | --- | --- | --- | --- |
| TR-18-01 — Single card flip | Dua state pada depan-belakang kartu | Front A/back B textures + hinge + perspective + backside visibility | Pergantian sisi pada edge-on; B final tegak dan utuh | Dua sisi memakai crop berbeda yang meloncat; SFX: card flick | research-proposal |
| TR-18-02 — Mosaic flip wave | Kumpulan bagian menjadi satu gambar baru | Grid tiles + per-tile crop A/B + hinge + rank map + stagger | Wave selesai menjadi B tanpa grid seams | Tile kecil membuat pesan tak terbaca; SFX: sequential flicks | research-proposal |
| TR-18-03 — Accordion panel turn | Konten memanjang berpindah lewat panel terlipat | Panel slices A/B + connected hinges + front/back normals + shadow | Engsel berurutan; panel final merata pada B | Panel saling tembus atau tekstur mirrored; SFX: fold clicks | research-proposal |
| TR-18-04 — Carousel face handoff | Pergantian beberapa kartu dalam urutan ruang | Separate cards + orbit positions + camera perspective + focal index | Kartu B landing frontal; urutan spatial konsisten | Memutar seluruh screenshot membuat bukti tak terbaca; SFX: soft rotation | research-proposal |

## Spesifikasi aset: tiga map yang berbeda

Berikut kontrak produksi usulan. Encoding dipilih serta dicatat oleh implementasi, bukan diasumsikan sama pada semua engine. [A02](https://helpx.adobe.com/lu_en/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/distort-effects.html), [A14](https://helpx.adobe.com/th_en/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/transition-effects.html), [A15](https://docs.blender.org/manual/en/4.5/render/layers/passes.html)

| Data map | Makna | Asset note sebelum produksi | Failure yang dicari |
| --- | --- | --- | --- |
| Reveal rank / luma | Urutan pixel dibuka ketika threshold berubah | Grayscale; pilihan invert; threshold/softness; endpoint tertutup/terbuka | Sebagian area tidak pernah terbuka, reveal urutan salah |
| Displacement | Offset sampling pixel source | Kanal horizontal/vertikal; neutral value; amplitude; address mode; overscan | Tepi terseret/hilang, teks tetap bengkok setelah landing |
| Depth | Jarak atau urutan lapisan terhadap kamera | Near/far range; unit/normalisasi; direction; edge treatment; optional separate object masks | Halo depth, fokus terbalik, depth tidak cocok contour |

Untuk CSS multiplane, nilai z per layer dapat menggantikan depth bitmap; jangan meminta depth map ketika efek hanya memakai 2–5 plane. Untuk ink reveal tanpa warp, rank matte sudah cukup; tidak perlu displacement. Untuk footage/photo depth, mask objek dan plate rekonstruksi tetap dibutuhkan bila kamera memperlihatkan area yang awalnya tertutup.

## Contoh rantai aset yang saling tersambung

Ini contoh authored berdasarkan tipe isi, bukan storyboard video yang sudah disetujui. Setiap panah memilih satu handoff; tidak perlu menambahkan seluruh efek dari shortlist.

| Rantai | ID dan data sambungan | Aset spesifik | Mengapa pilihan ini |
| --- | --- | --- | --- |
| Kata “UPLOAD” → tombol di capture → file di slot → hasil | TR-07-04 → TR-11-01 → TR-11-02; shared label, button rect, cursor hotspot, card target slot | Capture asli before/after, card terpisah, arrow/slot; contoh rekonstruksi berlabel demo | Objek dan aksi tetap bisa ditelusuri, bukan sekadar tiga wipe |
| “Dulu” → catatan lama → koreksi → diagram baru | TR-09-01 → TR-10-02 → TR-10-01; tear pivot, area erase, tip stroke ke node | Torn cover, old/new strokes, eraser pose, ordered route | Material menunjukkan penggantian; connector menjelaskan hasil |
| “3 bagian” → satu kartu → tiga panel → overview | TR-09-02 → TR-11-03; hinge panel dan persistent item IDs | Front/back paper, tiga isi, layout A/B, shadow layer | Isi dibuka berurutan, lalu identitas item bertahan dalam ringkasan |
| Foto objek → cut-out objek → konteks ruang | TR-01-04 → TR-12-01; silhouette sama, focal anchor, z/focus landing | Alpha subject, reconstructed clean plate, foreground/midground/background | Subjek tetap dikenal sambil penonton masuk ke konteksnya |
| Angka berlabel → bar proporsional → capture sumber | TR-07-03 → TR-05-02; nilai/domain, bar pivot, source region rect | Verified number+unit, chart, capture resolusi cukup, source label | Gerak menghubungkan klaim ke ukurannya dan bukti sumber |

## Arah kreatif tambahan dari studi studio

- **Collage dan gestural type:** BUCK HBO mendukung arah B07/B08/B12; siapkan potongan, type terpisah dan palette konsisten. Resep poster swap/brush reveal adalah sintesis, bukan klaim setiap shot memakai wipe. [A10](https://buck.co/work/hbo-btw)
- **Paper layer dengan edge/light/shadow:** BUCK Riot mendukung B08/B11; ketebalan dan bayangan adalah bagian rasa material, bukan sekadar PNG kertas. [A11](https://buck.co/work/riot-games-lunar-new-year)
- **Painting ke collage dengan style satu tangan:** BUCK UW Health memberi alasan mengkurasi ilustrasi/tekstur sebagai keluarga, bukan campuran bitmap acak. [A12](https://buck.co/work/uw-health-masterpieces)
- **Interlude modular mengikuti keyword:** BUCK IBM menunjukkan kebutuhan library editorial modular. Adaptasi katalog: token, slot, profile enter/exit dan matching anchors; modularitas tidak menjamin otomatis morph. [A13](https://buck.co/work/ibm-leadership-agenda)

## Bundle produksi: membuat pilihan kaya tanpa menggandakan file

Satu bundle memuat komponen yang bisa dipakai lintas resep. Simpan teks/warna sebagai parameter; SVG untuk carrier vector; PNG/WebP alpha untuk bitmap cutout; grayscale sequence untuk luma; WAV untuk audio; source editable untuk koreografi. Alpha video boleh diekspor untuk carrier yang mandiri, bukan menggantikan source dua-scene untuk distorsi.

| Bundle | Komponen / data yang dibutuhkan | Prioritas |
| --- | --- | --- |
| B01 — Frame dan viewport | SVG frame; alpha border; editable content slots; crop/focal rectangles; pivots | P1 |
| B02 — Bentuk dan match guides | Circle/rect/contour SVG; bounding boxes; composition anchors; endpoint comparison overlay | P1 |
| B03 — Lintasan dan momentum | SVG routes; ribbon/carrier; start/end tangents; direction and velocity profile; overscan notes | P1 |
| B04 — Occluder dan coverage | Paper/prop/hand/panel silhouettes; cover matte; shadow layer; coverage frame index per aspect | P1 |
| B05 — Vector states | Editable state paths; subpath correspondence; pivot; intermediate poses; endpoint labels | P1 |
| B06 — Label dan data handoff | Editable chip; word/node/object anchors; number units/domain; real source references | P1 |
| B07 — Typography kit | Licensed local fonts; editable word spans; glyph outlines when needed; baselines; counter/line masks | P1 |
| B08 — Paper mechanics kit | Front/back textures; torn edges; crease/hinge pivots; crumple replacement poses; contact shadows | P1 |
| B09 — Draw/erase kit | Ordered stroke paths; tip coordinates; filled reveal matte; flat hand/eraser poses; local paper backdrop | P1 |
| B10 — UI continuity kit | Real source captures; separated cards; cursor with hotspot; slots/viewport rectangles; state IDs; demo labels | P1 |
| B11 — Depth kit | 2–5 alpha layers; reconstructed clean plate; depth/focus values; overscan; camera endpoints | P2 |
| B12 — Material masks kit | Grayscale luma sequences; alpha mattes; displacement channels separately; edge policy; clean endpoint frames | P2 |
| B13 — Fragment kit | Sprites/tiles/cutouts; per-part crop/UV; origin/target transforms; fixed seed; assembly ordering | P2 |
| B14 — Audio bridges kit | Contact transients; material-specific cues; source ambience; speech pre-roll/tails; mix envelopes and provenance | P1 |
| B15 — Geometric/rank reveal kit | Iris/radial/strip masks; grayscale reveal order maps; pivot/angle; threshold/softness; open/closed endpoint validation | P1 |
| B16 — Two-sided panel kit | Front A/back B textures; UV/crop grids; hinge pivots; backface policy; perspective; flip-order maps and contact shadows | P2 |

Prioritas merupakan rekomendasi produksi, bukan jadwal atau aset yang sudah selesai:

- **Gelombang 1: 16 resep baru** pada `type`, `paper`, `line`, `ui`. Banyak primitive sudah ada, cocok campuran media, dan kebutuhan aset jelas. Mulai dengan shared-word bridge, tear reveal, draw connector, cursor click expand; kemudian empat resep lengkap per keluarga. Ini menambah pilihan yang berbeda dari tujuh v1.
- **Gelombang 2: 12 resep baru** pada `depth`, `material`, `assembly`. Lebih mahal karena clean plate, matte/compositor atau fragmen; buat contoh sederhana dahulu dan uji seek/render sebelum memperbanyak.
- **Gelombang 3: 37 usulan tersisa** melengkapi keluarga awal, `time`/`audio`, serta `mask`/`modular`. Audio bridge dapat didahulukan ketika source audio tersedia. Prioritas dapat berubah menurut frekuensi kebutuhan nyata, bukan jumlah export.

Untuk setiap resep yang diproduksi: editable carrier + placeholder demo berlabel + asset-role manifest + thumbnail/contact sheet + source koreografi + timing/anchor note + SFX/provenance. Per aspect ratio, periksa ulang crop, coverage dan safe area; memotong export portrait menjadi landscape bukan jaminan sambungan tetap benar. Variant warna/arah hanya parameter, bukan ID teknik baru.

## Data sambungan yang disiapkan sebelum Build

Usulan berikut merupakan catatan per resep dalam visual-plan/assembly-notes, bukan skema wajib baru:

| Kelompok | Data | Mengapa |
| --- | --- | --- |
| Identity | recipe ID, carrier ID, source asset A/B, semantic relation | Menentukan apa yang benar-benar bertahan |
| Geometry | normalized anchor A/B, pivot, bounds/crop, baseline, shape map | Menghindari loncat ukuran/posisi |
| Motion | start/end direction, velocity phase, easing, landing marker | Gerak mengantar perhatian ke B |
| Coverage | affected region, cover/cut frame, opening/closing matte | Memastikan cut tidak bocor |
| Layers | front/back/depth/focus, clean plate, overscan | Memisahkan konten dari carrier |
| Audio | source, cue marker, envelope, speech overlap | SFX audible tanpa mengganggu ucapan |
| Provenance | capture URL/date, licenses, mock/demo flag | Capture asli dibedakan dari ilustrasi |
| Completion | hold/readability, endpoint continuity, fallback | Ada syarat selesai yang bisa diperiksa |

Normalisasi koordinat hanya usulan authoring. Build menerjemahkannya ke canvas proyek; bukan perubahan arti `data-*` HyperFrames.

## Kriteria uji saat resep baru benar-benar dibangun

Snapshot A, tengah/handoff, landing B dan endpoint. Uji seek mundur/maju memberi pose sama; asset paths lokal; layout aman; proof label dan caption terbaca. Wipe: decode frame cut dan pastikan coverage pada wilayah yang ingin disembunyikan. Morph: cek silhouette di tengah, bukan hanya endpoint. Depth: cek tepi dan lubang plate. Material: cek matte vs displacement serta endpoint bersih. Audio: dengar bersama ucapan, bukan cue sendirian. Source komposisi memakai lint/runtime check proyek yang sudah berlaku.

Untuk tujuh preset tersedia, bukti render dan file mengikuti [kontrak v1](../design-system/transition-assets.md). Untuk 65 usulan, uji di atas masih pekerjaan produksi. Keberhasilan di After Effects, Blender, Rive atau browser tidak otomatis membuktikan kompatibilitas runtime lokal.

## Sumber dan penelusuran bukti

A01–A15 dirinci dalam [catatan sumber primer tambahan](transition-expansion-sources.md); P01–P10 adalah sumber yang diperiksa dalam perluasan katalog ini. Temuan lokal berasal dari file repo yang ditunjuk pada tiap keluarga, bukan klaim pihak luar.

- **P01** [GSAP Flip](https://gsap.com/docs/v3/Plugins/Flip/) — Menangkap posisi/ukuran/rotasi sebelum perubahan layout dan menginterpolasikan keadaan; bukan solusi transform 3D.
- **P02** [GSAP DrawSVG](https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/) — Mengungkap sebagian stroke SVG; fill membutuhkan mask atau teknik lain.
- **P03** [GSAP MorphSVG](https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/) — Morph path vector; jumlah titik awal/akhir dapat berbeda, pemetaan segmen tetap perlu diperiksa.
- **P04** [GSAP MotionPath](https://gsap.com/docs/v3/Plugins/MotionPathPlugin/) — Gerak mengikuti path, alignment dan rotasi arah; alignment dihitung pada awal animasi.
- **P05** [IBM animation tips](https://www.ibm.com/design/language/animation/tips-and-techniques/) — Referensi konsistensi, ritme, momentum dan keterbacaan; aturan brand IBM tidak otomatis menjadi aturan Dena.
- **P06** [Carbon choreography](https://carbondesignsystem.com/elements/motion/choreography/) — Shared elements, urutan dan hubungan spasial mengarahkan perhatian; usulan video di sini adalah adaptasi.
- **P07** [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) — Snapshot old/new view menjelaskan kontinuitas state browser; belum diuji untuk render seek HyperFrames.
- **P08** [Adobe text animation](https://helpx.adobe.com/after-effects/desktop/animating-text/text-animation/animating-text.html) — Animator teks dan seleksi karakter memberi kontrol bagian teks; port HTML memerlukan layout sendiri.
- **P09** [GSAP SplitText](https://gsap.com/docs/v3/Plugins/SplitText/) — Memisahkan baris/kata/karakter dan menyediakan masking; font/layout harus stabil sebelum pengukuran.
- **P10** [Adobe match cuts](https://www.adobe.com/in/creativecloud/video/discover/match-cut.html) — Kesamaan visual, aksi, komposisi atau suara menghubungkan scene; pasangan shot direncanakan.

Referensi studio awal tetap berguna untuk bahasa visual: [BUCK Illumina](https://buck.co/work/illumina) membahas pendekatan mixed-media; [Ordinary Folk / School of Motion](https://www.ordinaryfolk.co/project/school-of-motion-manifesto) memperlihatkan cakupan bahasa bentuk yang dibahas pembuatnya. Keduanya menjadi arah kreatif, bukan sumber izin menyalin aset atau bukti implementasi 72 resep.
