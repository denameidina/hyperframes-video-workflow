# Sumber Tambahan untuk Katalog Transisi dan Persiapan Aset
Status: research — bahan pemilihan AI Agent, belum implementasi
Date: 2026-09-30

## Cakupan dan disiplin bukti

Riset ini memperluas [riset awal](motion-linked-transitions.md) dengan 15
sumber primer tambahan bernomor A01–A15. Ringkasan **fakta** berasal dari
dokumentasi/halaman produksi pemilik sumber; **aset/usulan** dan **batas**
adalah sintesis untuk kebutuhan teks, ilustrasi, screenshot, dan cut-out.
Nama resep tidak berarti resep tersebut tersedia di engine repo sekarang.

Halaman produksi studio dibaca sebagai bukti proses dan gaya, bukan hasil
menonton setiap shot. Tidak ada timecode atau klaim mekanik sambungan spesifik
yang belum diamati. Beberapa halaman Blender hanya dapat dibaca melalui
cuplikan terindeks resmi karena pembukaan langsung gagal; versi/link dicatat
agar batas verifikasinya terlihat. Tidak ada kursus berbayar yang diakses.

## Sumber teknis

### A01 — Animasi mask dan shape path

**Fakta:** After Effects menginterpolasi mask/shape path antarkeyframe;
rotoscoping dapat memisahkan objek dari background supaya keduanya diproses
terpisah. [Adobe: Managing and animating shape paths and masks](https://helpx.adobe.com/uk/after-effects/desktop/animate-in-after-effects/animate-shape-paths-and-masks/animating-shape-paths-masks.html).

**Aset/usulan:** siapkan SVG path atau matte, cut-out ber-alpha, dan keyframe
jalur untuk reveal mengikuti siluet, lubang yang melebar, atau garis yang
menjadi bidang. **Batas:** mengganti visibility dengan mask tidak otomatis
mengubah geometri objek; animasi alpha saja berbeda dari true morph.

### A02 — Displacement, turbulence, dan deformasi

**Fakta:** Displacement Map memindahkan pixel horizontal/vertikal berdasarkan
warna control layer; pixel bernilai tengah tidak memberi displacement, dan
hasil dapat diperluas melewati batas layer. [Adobe: Distort effects](https://helpx.adobe.com/lu_en/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/distort-effects.html).

**Aset/usulan:** siapkan source A/B sebagai tekstur, displacement map dengan
encoding/netral yang dicatat, overscan, dan timeline kekuatan untuk ripple,
smear, liquid warp, atau gelombang. **Batas:** lapisan ripple transparan hanya
menambahkan gambar ripple; untuk menggeser isi screenshot perlu sampler/shader
atau render yang memang sudah memproses screenshot itu.

### A03 — Partikel dan pecahan

**Fakta:** Particle Playground dapat mengganti partikel titik dengan layer
gambar/karakter; Shatter dapat memakai bentuk pecahan khusus dan gradient
untuk urutan ledakan, serta dibalik waktunya untuk membentuk kembali gambar.
[Adobe: Simulation effects](https://helpx.adobe.com/lt/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/simulation-effects.html).

**Aset/usulan:** siapkan sprite partikel ber-alpha, gambar sumber, peta pecahan,
urutan/seed terkontrol, dan state tujuan untuk confetti-cover, pixel dispersal,
pecah-lalu-susun, atau word-to-particles. **Batas:** overlay partikel reusable
bisa menutup pergantian; membentuk objek tujuan dari partikel harus mengetahui
target dan korespondensi partikelnya.

### A04 — Kamera, dolly, dan ruang

**Fakta:** camera layer After Effects dapat melihat layer 3D dari berbagai
sudut/jarak dan menambahkan pans, dolly, serta depth of field; kamera hanya
mempengaruhi layer yang mendukung kamera komposisi. [Adobe: Cameras, lights,
and points of interest](https://helpx.adobe.com/lu_en/after-effects/desktop/work-with-layers/camera-layer/cameras-lights-points-interest.html).

**Aset/usulan:** siapkan foreground/midground/background, posisi z, focal
anchor, orientasi kamera, overscan, dan detail resolusi tinggi untuk zoom-through,
orbit handoff, tunnel, atau whip-pan. **Batas:** kamera/occlusion yang perlu
ruang berbeda tidak diperoleh hanya dengan memutar PNG datar.

### A05 — Audio mendahului atau meneruskan gambar

**Fakta:** J cut memulai audio scene berikut sebelum gambar berganti; L cut
mempertahankan audio scene sebelumnya di atas gambar berikut. [Adobe:
Perform J cuts and L cuts](https://helpx.adobe.com/nl/premiere/desktop/edit-projects/trim-clips/perform-j-cuts-and-l-cuts.html).

**Aset/usulan:** siapkan stem audio terpisah, head/tail handles, transcript
bertimestamp, dan posisi cut visual untuk sound-lead, narration carry, atau
ambience bridge. **Batas:** J/L cut adalah koreografi audio-video; file overlay
visual tidak cukup, dan continuity ucapan harus dipertahankan.

### A06 — Morph mesh dengan shape keys

**Fakta:** shape keys menyimpan posisi vertex untuk deformasi; manual
menyarankan membuatnya ketika topology sudah stabil. [Blender: Shape keys,
Introduction — manual 3.2](https://docs.blender.org/manual/id/3.2/animation/shape_keys/introduction.html).

**Aset/usulan:** siapkan satu basis mesh, state deformasi dengan korespondensi
vertex, UV/material, dan jalur interpolasi untuk object melt, inflate, squeeze,
atau fold-to-object. **Batas:** aturan topology mesh ini berbeda dari MorphSVG
yang dapat memetakan jumlah titik path berbeda; dua model sebarang bukan
pasangan shape key siap pakai.

### A07 — Cloth dan permukaan yang terikat

**Fakta:** pin group menentukan bagian cloth yang terikat melalui bobot vertex;
Dynamic Mesh memungkinkan rest shape berubah melalui modifier/shape key.
[Blender: Cloth Shape — manual 5.0](https://docs.blender.org/manual/id/5.0/physics/cloth/settings/shape.html).

**Aset/usulan:** siapkan mesh bersegmen, pin/hinge group, tekstur depan-belakang,
ketebalan/edge, dan hasil simulasi yang dibekukan untuk fabric curtain,
paper-like drape, atau peel. **Batas:** rasa kertas memerlukan art direction
stiffness/fold tersendiri; simulasi cloth bukan otomatis simulasi kertas.

### A08 — Komposit alpha

**Fakta:** Alpha Over menggabungkan foreground dan background menggunakan
alpha; manual membedakan input straight alpha dari premultiplied alpha.
[Blender: Alpha Over Node](https://docs.blender.org/manual/en/latest/compositing/types/color/alpha_over.html).

**Aset/usulan:** siapkan RGBA yang mempertahankan transparansi, catatan mode
alpha, dan matte terpisah bila diperlukan untuk ink, brush, dust, atau foreground
cover. **Batas:** format ekspor dan renderer tujuan perlu mendukung alpha;
nama ekstensi saja belum membuktikannya, dan mismatch alpha dapat membuat fringe.

### A09 — State dan transisi yang logis

**Fakta:** Rive menyediakan condition, duration, Exit Time, pause-source,
interpolation, dan action untuk mengatur kapan serta bagaimana state berganti.
[Rive: Transitions](https://rive.app/docs/editor/state-machine/transitions).

**Aset/usulan:** siapkan state enter/hold/exit, properti penggerak, serta event
jadwal untuk kartu yang menjadi ikon, status yang berubah, atau karakter
berganti pose. **Batas:** runtime interaktif memerlukan pemetaan input/waktu
yang eksplisit sebelum dipakai untuk render deterministik; random exit dan
ketergantungan interaksi langsung tidak cocok sebagai waktu render tetap.

### A14 — Gradient, iris, strip, dan card wipe

**Fakta:** Gradient Wipe mengurutkan transparansi berdasarkan luminance map;
Linear/Radial/Iris dan Venetian Blinds memberi geometri reveal berbeda, sementara
Card Wipe membagi layer menjadi kartu yang dapat ditransformasi.
[Adobe: Transition effects](https://helpx.adobe.com/th_en/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/transition-effects.html).

**Aset/usulan:** siapkan grayscale rank map, pivot pusat, strip/grid pembagian,
dan tekstur A/B untuk ink-spread, iris portal, clock sweep, blinds, mosaic flip,
atau card wave. **Batas:** grayscale rank map memilih urutan reveal; ia bukan
depth map atau displacement map. Card flip yang memperlihatkan konten kedua
memerlukan koreografi dua sisi, bukan dekorasi kartu di atas gambar tetap.

### A15 — Depth, mask objek, dan data render

**Fakta:** Blender menyediakan pass Z, Mist, Normal, dan index; Z/Position/index
tidak anti-aliased, dan manual menyarankan Mist untuk hasil lebih bersih bila
depth of field atau motion blur terlibat. [Blender: Passes — manual 4.5](https://docs.blender.org/manual/en/4.5/render/layers/passes.html).

**Aset/usulan:** siapkan color plate, depth dengan encoding/range jelas,
object mask, dan layer tambahan untuk depth wipe, fog reveal, atau rack-focus
handoff. **Batas:** satu color PNG tidak menyimpan data tersebut; tepi depth
perlu ditangani supaya reveal tidak bergerigi atau memberi halo.

## Bukti proses dan gaya dari studio

### A10 — BUCK, HBO “Between the World & Me”

**Fakta:** trailer menggunakan mixed media seperti scrapbook/poster,
tekstur dengan palet minimal, gestural typography, serta painterly illustration.
[BUCK: HBO](https://buck.co/work/hbo-btw).

**Aset/usulan:** siapkan potongan foto/ilustrasi, ragged-edge mattes, stroke
brush, tipe terpisah, dan tekstur untuk collage swap atau poster-build handoff.
**Batas:** halaman membuktikan gaya produksinya; resep transisi tersebut adalah
sintesis, bukan hasil verifikasi shot tertentu.

### A11 — BUCK, Riot Games Lunar New Year

**Fakta:** paper-cut world memakai layer dan cut-out untuk bentuk 3D,
memperhatikan edge/light/shadow, serta gerak sederhana dengan cadence rendah.
[BUCK: Riot Games Lunar New Year](https://buck.co/work/riot-games-lunar-new-year).

**Aset/usulan:** siapkan paper layer ber-alpha, edge/ketebalan, shadow terpisah,
pose utama, dan versi detail untuk ukuran berbeda bagi paper-stack reveal,
folding stage, atau stop-motion replacement. **Batas:** cadence rendah adalah
pilihan artistik proyek ini, bukan kekurangan yang harus selalu dibetulkan.

### A12 — BUCK, UW Health Masterpieces

**Fakta:** proyek menyatukan conceptual painting dengan paper collage dan
metafora yang dipersonalisasi; konsistensi kesan satu tangan seniman menjadi
tantangan proses. [BUCK: UW Health Masterpieces](https://buck.co/work/uw-health-masterpieces).

**Aset/usulan:** siapkan portrait/ilustrasi dengan style yang sama, potongan
cerita, brush masks, dan palet per dunia untuk painting-to-collage atau
brush-reveal portrait. **Batas:** menggabungkan tekstur acak belum menciptakan
kesatuan style; sumber tidak menetapkan mekanik transisi generik tertentu.

### A13 — BUCK, IBM Leadership Agenda

**Fakta:** BUCK membuat lebih dari 40 interlude modular, memanfaatkan
keyword/theme, serta stop-motion, 2D, dan 3D agar sesuai edit interview.
[BUCK: IBM Leadership Agenda](https://buck.co/work/ibm-leadership-agenda).

**Aset/usulan:** siapkan keluarga tanda baca, keyword tokens, slot palet,
dan profil enter/exit kompatibel untuk punctuation-cover, word-to-object,
atau editorial insert. **Batas:** modular berarti bisa ditempatkan dengan
fleksibel; tidak membuktikan setiap interlude saling morph atau tersambung otomatis.

## Pelengkap engine yang telah diverifikasi

Flip merekam posisi/ukuran/rotasi sebelum layout berubah lalu menganimasikan
selisihnya; siapkan identitas elemen, state awal/akhir, dan koordinat supaya
kartu/reparent/grid handoff bisa diatur. Ini koreografi konten, bukan overlay
video universal. [GSAP: Flip](https://gsap.com/docs/v3/Plugins/Flip/).

MotionPath menerima SVG path atau koordinat dan mendukung alignment/orientasi;
siapkan path, anchor, serta objek pembawa untuk orbit-follow, line-to-icon,
atau trajectory handoff. Export jalur harus menyertakan sistem koordinat agar
aset di scene berbeda tidak meloncat. [GSAP: MotionPath](https://gsap.com/docs/v3/Plugins/MotionPathPlugin/).

Text animator/selector dapat mengubah bagian karakter, sedangkan text path
menggerakkan teks di sepanjang mask path; siapkan teks editable, font dan
layout metric, grouping karakter/kata, serta path untuk glyph cascade,
type-to-path, atau word wheel. Flattened bitmap menghilangkan kontrol karakter.
[Adobe: Animating text](https://helpx.adobe.com/after-effects/desktop/animating-text/text-animation/animating-text.html).

## Kesimpulan portabilitas untuk pemilihan Agent

Tabel ini merupakan **sintesis desain**, bukan jaminan dukungan engine.

| Paket yang dipilih | Cocok untuk | Wajib tersedia | Batas yang perlu dicatat |
| --- | --- | --- | --- |
| Overlay alpha | Foreground, brush, ink, smoke, confetti yang menutup cut | RGBA + time/matte/cue | Tidak memindahkan atau mendistorsi pixel konten di bawahnya |
| Matte/reveal | Luma wipe, shape iris, strip, brush reveal | Mask/rank map + kedua scene | Mask harus dipakai oleh compositor yang mengerti semantik/encoding-nya |
| Koreografi konten | Shared object, layout flip, type, particle assembly | Layer editable + pasangan state + handoff | Membutuhkan objek tujuan dan timeline, bukan hanya file efek |
| Depth/shader | Ripple, depth fog, lens warp, displace handoff | Source texture + maps + shader/compositor | Memerlukan sampling konten dan validasi tepi/range/warna |
| 3D/simulasi ter-render | Cloth, fold, mesh morph, camera orbit | Mesh/rig/state/camera atau output yang dibekukan | Render jadi mungkin terikat desain/kamera tertentu; screenshot baru tidak otomatis bisa disubstitusi |
| Audio bridge | J/L cut, sound-lead, narration carry | Stem + handles + transcript/time | Timing audio dan gambar berbeda; tidak tercakup overlay visual |

Catalog dapat menawarkan banyak resep, tetapi Agent perlu memilih menurut
hubungan narasi, data aset yang tersedia, dan tingkat portabilitas tersebut.
Variasi warna/arah dari mekanik yang sama dapat menjadi parameter resep;
gunakan ID berbeda ketika mekanisme atau kontrak asetnya memang berbeda.
