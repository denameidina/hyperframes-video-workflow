# Riset Transisi yang Menghubungkan Aset melalui Motion

Riset lanjutan: [katalog pilihan Agent dan kebutuhan aset](transition-catalog.md)
serta [sumber primer tambahan](transition-expansion-sources.md). Katalog memuat
status ketersediaan per resep; paket yang sudah dirender mengikuti
[kontrak aset v1](../design-system/transition-assets.md).
Status: research — rekomendasi desain, belum menjadi standar implementasi
Date: 2026-09-30

## Tujuan dan ruang lingkup

Mencari pendekatan transisi untuk rangkaian aset campuran: teks, ilustrasi,
screenshot, dan cut-out. Aset akan diproduksi setelah hubungan antar-scene
direncanakan. Sasaran visualnya adalah penonton bisa mengikuti sebuah objek,
arah gerak, bentuk, ruang, atau ide saat tampilannya berubah.

**Temuan utama:** rancang akhir scene A dan awal scene B sebagai satu gerakan.
Tentukan elemen yang diwariskan sebelum membuat asetnya. Ini rekomendasi riset
untuk kebutuhan pengguna, diturunkan dari prinsip kontinuitas dan proses studio
di bawah; belum merupakan perubahan workflow, spesifikasi engine, atau hasil
uji render.

## Metode dan batas bukti

- Sumber primer: deskripsi produksi dari studio/kreator, dokumentasi resmi
  Adobe dan GSAP, serta sistem motion Google dan IBM.
- Halaman publik dan deskripsi produksinya telah dibaca. Video tertanam belum
  dianalisis frame per frame; laporan ini tidak mengklaim timecode, bentuk
  transisi tertentu, atau urutan shot yang tidak tercantum pada sumber.
- **Fakta sumber** berarti dinyatakan pemilik sumber. **Penerapan/usulan**
  berarti interpretasi desain untuk proyek ini, bukan klaim dari studio.
- Prinsip UI dipakai sebagai pembanding konseptual. Timing, larangan bounce,
  grid, maupun aturan navigasi UI tidak otomatis berlaku pada video kreatif.

## Dasar yang bisa dipakai

### 1. Elemen yang berlanjut membantu penonton menjaga orientasi

**Fakta sumber:** Carbon menjelaskan bahwa elemen bersama dapat membentuk
kontinuitas antar-layar. Gerak yang memiliki fungsi sama perlu konsisten;
hubungan ruang harus jelas, dan urutan motion perlu berakhir pada konten
penting. [IBM Carbon: Choreography](https://carbondesignsystem.com/elements/motion/choreography/).

**Penerapan:** pilih satu elemen pembawa perhatian yang tetap terbaca ketika
layout atau medium berganti.

### 2. Perubahan ukuran dan perpindahan ruang adalah hubungan berbeda

**Fakta sumber:** Material mendefinisikan container transform untuk hubungan
elemen melalui sebuah container; shared axis menyatakan hubungan spasial atau
navigasi lewat sumbu x, y, atau z. [Google Material: Motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md#transitions).

**Penerapan:** bedakan pembesaran kartu, perpindahan ke langkah berikut, dan
zoom ke detail berdasarkan hubungan ceritanya.

### 3. Match cut mempertahankan kecocokan tanpa wajib morph

**Fakta sumber:** Adobe menjelaskan match cut sebagai sambungan melalui
kemiripan visual, motion, komposisi, atau suara; kategori utamanya mencakup
graphic, action, dan audio match cut. [Adobe: Match cuts](https://www.adobe.com/in/creativecloud/video/discover/match-cut.html).

**Penerapan:** lingkaran ilustrasi bisa disambungkan ke avatar screenshot pada
lokasi dan ukuran yang serupa.

### 4. Matte memberi jembatan antarmedium

**Fakta sumber:** track matte dapat berupa gambar, video, grafis, teks, atau
shape yang mengendalikan transparansi layer lain. Jika transform matte
dianimasikan, Adobe menyebutnya traveling matte. [Adobe: Track Mattes and
Traveling Mattes](https://helpx.adobe.com/after-effects/desktop/work-with-transparency-and-compositing/work-with-track-mattes-and-traveling-mattes/track-mattes-and-traveling-mattes.html).

**Penerapan:** cut-out atau kartu bergerak melintasi layar, menutup pergantian
background, kemudian memperlihatkan scene berikut. Batas pergantian perlu
terlindung sepenuhnya pada area yang diganti; sebuah objek kecil yang lewat
tidak otomatis menyembunyikan seluruh pergantian.

### 5. Morph membutuhkan korespondensi bentuk yang dirancang

**Fakta sumber:** MorphSVG dapat menangani path dengan jumlah titik berbeda.
`shapeIndex` mengatur pemetaan titik; origin dan pemisahan path dapat membantu
mengendalikan hasil. [GSAP: MorphSVG](https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/).

**Penerapan:** siapkan bentuk awal dan akhir dengan bagian yang jelas
hubungannya. Jumlah vertex yang sama bukan syarat universal. Screenshot/PNG
tidak langsung memperoleh morph vektor; gunakan outline/proxy shape, matte,
atau teknik compositing yang sesuai.

## Pilihan transisi untuk aset campuran

Seluruh contoh di tabel ini adalah **usulan desain**, bukan shot yang
diklaim ada di film referensi. Nama teknik dipakai sebagai kosakata kerja.

| Teknik | Apa yang menyambung | Contoh sambungan | Aset yang perlu dipersiapkan | Risiko utama |
| --- | --- | --- | --- | --- |
| Shared object / container | Identitas satu objek tetap terlihat | Kartu teks membesar menjadi frame screenshot; frame tetap, isi berubah | Frame/container terpisah dari isi, posisi awal/akhir, crop screenshot | Kartu diganti terlalu cepat sehingga terbaca sebagai dua objek |
| Graphic match / shape match | Bentuk, ukuran, posisi, komposisi | Lingkaran ilustrasi menjadi avatar; kotak catatan menjadi panel UI | Pasangan bentuk dengan siluet serupa dan frame sambungan yang disejajarkan | Warna sama saja belum cukup untuk menciptakan kecocokan |
| Match on motion / momentum | Arah dan fase gerak berlanjut | Ilustrasi terdorong ke kanan, screenshot masuk sebagai lanjutan dorongan | Exit dan entry yang saling cocok, pegangan posisi, ruang untuk travel | Kecepatan mendadak kembali nol atau arah berbalik tanpa alasan |
| Occlusion / object wipe | Objek foreground menutup pergantian | Cut-out tangan/kertas lewat dekat kamera, lalu membuka bukti screenshot | Foreground ber-alpha, matte yang menutup area pergantian, overscan | Ada background yang berubah sebelum tertutup |
| Camera handoff / zoom-through | Hubungan ruang dan fokus | Kamera masuk ke panel screenshot, keluar sebagai detail ilustrasi | Layer dekat/jauh, focal anchor, gambar detail cukup besar, area di luar crop | Dua scene memakai vanishing point atau arah kamera yang tidak selaras |
| Morph / shape evolution | Bentuk berubah dengan hubungan terbaca | Garis underline melengkung menjadi panah, lalu membentuk diagram | SVG bentuk awal/akhir atau proxy shape; bagian bentuk terpisah | Path kusut, identitas hilang di tengah, perubahan terlihat seperti efek acak |
| Semantic handoff | Satu gagasan diteruskan ke representasi berikut | Kata “bukti” menjadi kartu screenshot; label berubah menjadi kategori diagram | Kata/label terpisah, elemen tujuan yang benar-benar menjelaskan kata itu | Narasi seolah menyatakan hubungan faktual yang sebenarnya tidak ada |

**Rekomendasi awal:** shared object, motion match, dan occlusion menjadi
kombinasi utama untuk teks + screenshot + ilustrasi + cut-out. Gunakan morph
untuk shape yang memang bisa berubah secara terbaca; gunakan camera handoff
ketika perpindahan ke detail atau konteks luas berguna bagi cerita.

## Referensi kreatif primer

### A. BUCK — Illumina

**Fakta sumber:** BUCK menyebut pendekatan mixed media yang menggabungkan
keyframe animation dan CG, dengan 2D, 2.5D, serta 3D. Mereka secara eksplisit
membahas tantangan menghubungkan tiap shot, hubungan narasi dengan visual, dan
transisi yang menyambungkan bab cerita. [Halaman proyek
Illumina](https://buck.co/work/illumina).

**Yang bisa diadaptasi:** medium boleh berubah, tetapi hubungan antargagasan
perlu tetap jelas. Cocok menjadi referensi utama arah mixed media pengguna.
Teknik sambungan dan timecode spesifik perlu ditandai setelah film ditonton.

### B. Ordinary Folk — School of Motion Manifesto

**Fakta sumber:** konsep dimulai dengan shape sederhana dan garis, lalu
meningkatkan kompleksitas menjadi beberapa gaya dalam tiga dimensi yang
bekerja bersama. Halaman proyek menyediakan styleframes/process. [Halaman
proyek Manifesto](https://www.ordinaryfolk.co/project/school-of-motion-manifesto).

**Yang bisa diadaptasi:** satu keluarga bentuk berkembang menuju ilustrasi
dan ruang yang lebih kompleks. Ini referensi untuk kesinambungan identitas
visual selama pergantian bentuk/medium; deskripsi tersebut tidak membuktikan
bahwa setiap sambungan memakai morph.

### C. BUCK — Microsoft Security

**Fakta sumber:** seri CG pendek ini memakai imagery sederhana, transisi
fluid, komposisi grafis, dan ruang kosong agar elemen mudah dibaca. [Halaman
proyek Microsoft Security](https://buck.co/work/microsoft-security).

**Yang bisa diadaptasi:** sisakan ruang ketika elemen berpindah dan beri
tampilan tujuan waktu untuk terbaca. Cocok untuk rangkaian pendek yang
berpindah antara ikon, ilustrasi, dan screenshot.

### D. BUCK — Circle HQ Screen / Portal

**Fakta sumber:** sistem modular menggabungkan narasi 3D, live action,
transisi 2D yang seamless, loop logo, dan frame untuk tipe/live action.
Metafora visual antar-tema dirancang saling dapat dipertukarkan. [Halaman
proyek Circle HQ Screen](https://www.buck.co/work/circle-hq-screen).

**Yang bisa diadaptasi:** aset reusable memerlukan aturan entry/exit yang
kompatibel agar modul bisa disambungkan. Skala instalasi dan durasi proyek
tersebut tidak dijadikan patokan durasi video sosial.

### E. Ben Marriott — Motion Foundation, sequence dan breakdown

**Fakta sumber:** Week 3 menyatakan latihan empat shot yang disambungkan
dengan match cuts. Halaman juga menjelaskan workshop morph dan breakdown
sequence Space Column yang membuat ilusi gerakan kamera cepat bergaya.
[Halaman resmi Motion Foundation](https://www.benmarriott.com/motion-foundation).

**Yang bisa diadaptasi:** storyboard dan animatic untuk rangkaian sambungan
perlu dirancang sebelum animasi penuh. Ini referensi teknik dari kreator;
isi kursus berbayar dan project files belum diakses.

## Implikasi untuk produksi berikutnya

Storyboard perlu menunjukkan akhir A → frame perantara → awal B. Uji
sambungan dengan shape/proxy bergerak sebelum membuat aset final; dua still
yang serupa belum membuktikan kontinuitas motion. Produksi aset perlu mengikuti
kebutuhan layer, crop, pivot, dan travel yang muncul dari uji tersebut.

Riset ini belum memilih topik, slug, durasi, atau aset final. Timing/SFX mengikuti
narasi/beat proyek. Halaman studio menjadi titik masuk review visual lanjutan;
analisis timecode diperlukan bila mekanik sambungan spesifik hendak direplikasi.

## Penerapan untuk proyek ini: aset dirancang berpasangan

Bagian ini adalah **usulan desain hasil sintesis**, bukan requirement baru, perubahan
schema, atau keputusan produksi untuk video tertentu. Belum ada slug, naskah,
timing, maupun aset yang dikunci.

### Contoh rangkaian campuran media

Contoh hipotetis untuk cerita tentang alur kerja; isi sesungguhnya mengikuti
naskah/transkrip.

| Sambungan | Elemen yang diteruskan | Gerak keluar → masuk | Aset yang perlu disiapkan |
| --- | --- | --- | --- |
| Judul → screenshot | Garis bawah kata penting | Garis melebar menjadi bingkai; screenshot terbuka di dalamnya | Teks editable, garis/bingkai vektor, capture asli |
| Screenshot → diagram | Highlight satu bagian UI | Capture mengecil; highlight bertahan, memanjang menjadi konektor diagram | Capture utuh + crop, highlight terpisah, node/konektor vektor |
| Diagram → ilustrasi | Satu node/ikon | Node membesar, lalu menjadi bentuk pembuka ilustrasi | Ikon dan bentuk tujuan yang cocok, ilustrasi ber-layer |
| Ilustrasi → cut-out | Kartu/objek depan | Objek melintas menutup area pergantian; cut-out muncul setelah lewat | Objek foreground, cut-out alpha, latar terpisah |
| Cut-out → takeaway | Bingkai/panel yang sama | Panel bergeser mengantar fokus ke kata akhir, lalu diam untuk dibaca | Cut-out, panel terpisah, teks takeaway editable |

Rangkaian ini menunjukkan relasi visual; bukan kewajiban memaksa semua aset
berubah bentuk. Screenshot tetap menjadi bukti asli. Yang bisa berubah menjadi
diagram adalah bingkai atau highlight editorialnya; detail UI jangan dipalsukan.

### Catatan sambungan sebelum membuat aset

Untuk setiap pasangan A → B, tulis di catatan/storyboard:

- **Makna:** mengapa ide A mengantar ke ide B?
- **Pembawa fokus:** elemen mana yang bertahan atau menjadi padanan?
- **Pose keluar dan masuk:** posisi, ukuran, sudut, titik putar, arah gerak,
  serta urutan depan/belakang.
- **Saat penggantian:** terbuka, lewat mask, atau ketika area pergantian
  tertutup; coverage diuji pada framing sebenarnya.
- **Momentum:** jika gerak diteruskan, arah dan kecepatannya menyambung.
  Jika perlu berhenti, perlambatan itu menjadi keputusan yang terlihat.
- **Waktu baca:** kapan informasi tujuan sudah stabil dan cukup lama dibaca?
- **Suara:** cue pada tindakan penting; tetap jelas di bawah narasi.

Ini adalah checklist perencanaan dalam prose/tabel, bukan field JSON baru.
Aset pertama punya pintu masuk; aset terakhir punya akhir yang disengaja.
Aset di tengah harus punya hubungan ke adegan sebelumnya dan sesudahnya.

### Persiapan aset menurut media

| Media | Persiapan yang direkomendasikan | Yang perlu diperiksa |
| --- | --- | --- |
| Teks | Tetap editable; pisahkan kata penting, garis bawah, dan panel | Terbaca saat hold; gerak tidak merusak bentuk huruf |
| Ilustrasi | SVG berbagian atau layer terpisah; siapkan bentuk awal/tujuan jika morph | Siluet tetap rapi pada tengah transisi |
| Screenshot | Simpan capture asli dan crop fokus; highlight/bingkai sebagai overlay terpisah | Detail yang dibuktikan tetap terbaca dan faktual |
| Cut-out | PNG/WebP ber-alpha untuk still; matte berurutan untuk footage | Tepi bersih, anchor konsisten, tidak ada halo |
| Latar/foreground | Pisahkan objek penutup, latar, dan subjek; beri ruang gambar untuk pan/zoom | Tidak muncul tepi kosong saat kamera bergerak |

Jika memakai image generation kelak, hasilkan bagian spesifik yang dibutuhkan
scene, dengan palet, perspektif, dan arah cahaya yang konsisten. Teks utama,
diagram terstruktur, dan bukti UI lebih tepat dibuat editable atau dicapture.
Menghasilkan satu poster datar untuk seluruh scene akan menyulitkan gerak
antar-bagian.

### Kesesuaian dengan panduan lokal

Pemilihan sambungan dan SFX masuk ke Screen Plan, khususnya
[Motion Grammar](../../../docs/agents/references/motion-grammar.md).
Gerak berbobot bisa memakai resep
[Motion Craft](../../../docs/agents/references/motion-craft.md), tetapi resep
entrance/exit saja belum menjamin kontinuitas antar-scene.
[Mix-media](../../../docs/agents/references/styles/mix-media.md) memberi pembagian
kolase/cut-out/foreground;
[Parallax](../../../docs/agents/references/styles/parallax.md) memberi opsi pan,
push-through, dan foreground wipe.

Untuk video yang benar-benar diproduksi, sambungan diputuskan setelah isi dan
timebase terkunci, dicatat dalam visual plan/storyboard, lalu aset dibuat pada
Build sesuai [workflow](../operations/video-editing-workflow.md).
Caption, area wajah, dan safe area mengikuti
[sistem visual](../design-system/visual-system.md).
Riset ini belum mengubah workflow atau membuat komposisi.
