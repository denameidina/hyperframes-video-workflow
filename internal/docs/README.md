# Internal Docs — Source of Truth Index
Status: operating standard
Date: 2026-08-25

Ini index + registry Source of Truth repo **hyperframes-video-workflow**
(workspace produksi video sosial Dena Meidina + CLI auto-publish R2/Repliz).
Setiap doc terdaftar di sini dengan deskripsi satu baris, dalam urutan baca
bernomor. Doc detail adalah **kanonik**; `entrypoints/` hanya pintu masuk ringkas.

Baca dulu `AGENTS.md` (root) → file ini → hanya doc yang relevan dengan task.

## Reading Order

### Entrypoints (pintu masuk ringkas)
1. [entrypoints/blueprint.md](entrypoints/blueprint.md) - Pintu masuk: apa repo ini + peta ke doc detail.
2. [entrypoints/prd.md](entrypoints/prd.md) - Ringkas kebutuhan produk → requirements/prd.
3. [entrypoints/frd.md](entrypoints/frd.md) - Ringkas kebutuhan fungsional → requirements/frd.
4. [entrypoints/rd.md](entrypoints/rd.md) - Ringkas requirement per domain (EARS) → rd-NN.
5. [entrypoints/brd.md](entrypoints/brd.md) - Ringkas kebutuhan bisnis → business/brd (draft).

### Product
6. [product/blueprint.md](product/blueprint.md) - Apa produk & untuk siapa: personal tool + template open-source.
7. [product/scope-principles.md](product/scope-principles.md) - Batas in/out scope + prinsip personal-first & deterministik.
8. [product/onboarding.md](product/onboarding.md) - Cara mulai untuk pemilik, adopter template, dan agent AI.

### Business / Brand / Research (sebagian draft)
9. [business/brd.md](business/brd.md) - Model bisnis: personal/non-komersial; monetisasi draft.
10. [brand/strategy.md](brand/strategy.md) - Tidak ada strategi brand formal; rujuk style guide produksi; draft.
11. [research/market.md](research/market.md) - Belum ada riset pasar/kompetitor formal; draft.

### Requirements (EARS)
12. [requirements/ears-standard.md](requirements/ears-standard.md) - 5 pola EARS + aturan penulisan terukur.
13. [requirements/prd.md](requirements/prd.md) - Kebutuhan produk tingkat "apa & kenapa".
14. [requirements/frd.md](requirements/frd.md) - Ikhtisar fungsional + peta domain requirement.
15. [requirements/rd-01-publish-pipeline.md](requirements/rd-01-publish-pipeline.md) - EARS auto-publish R2/Repliz (approval, idempotensi, schedule).
16. [requirements/rd-02-composition-render.md](requirements/rd-02-composition-render.md) - EARS kontrak komposisi HyperFrames + render deterministik.
17. [requirements/rd-03-video-editing-workflow.md](requirements/rd-03-video-editing-workflow.md) - EARS workflow 4 fase + gate + non-negotiable konten.
18. [requirements/rd-04-transcription-setup.md](requirements/rd-04-transcription-setup.md) - EARS setup lingkungan + transkripsi whisper lokal.
19. [requirements/rd-05-studio.md](requirements/rd-05-studio.md) - EARS Studio web UI: bind, guard, upload, cascade delete, sesi tmux, publish, tab Generate (form + panel review gate).
20. [requirements/rd-06-audio.md](requirements/rd-06-audio.md) - EARS audio: adapter suara TTS, uji dengar blind, pustaka musik.

### Architecture
21. [architecture/stack.md](architecture/stack.md) - Stack: Node 22+, HyperFrames npx, GSAP, whisper.cpp, R2/Wrangler, Repliz.
22. [architecture/data-model.md](architecture/data-model.md) - Semua entitas data & bentuk JSON (receipt, caption-beats, dst.).
23. [architecture/api-contract.md](architecture/api-contract.md) - Kontrak R2 (Wrangler) + Repliz (3 endpoint) + surface fungsi CLI.
24. [architecture/nfr.md](architecture/nfr.md) - NFR terukur: determinisme, keamanan, audio/caption, timeout, idempotensi.

### ADR (accepted, reverse-engineered)
25. [adr/0001-hyperframes-html-to-video.md](adr/0001-hyperframes-html-to-video.md) - Pilih HyperFrames HTML→video sebagai engine komposisi.
26. [adr/0002-repliz-r2-publish-via-wrangler.md](adr/0002-repliz-r2-publish-via-wrangler.md) - Publish via R2 (Wrangler) + Repliz, tanpa S3 key.
27. [adr/0003-approval-gated-publish.md](adr/0003-approval-gated-publish.md) - Publish di-gate flag `--approved`.
28. [adr/0004-local-whisper-transcription.md](adr/0004-local-whisper-transcription.md) - Transkripsi lokal via whisper.cpp submodule.
29. [adr/0005-seven-agent-workflow-discipline.md](adr/0005-seven-agent-workflow-discipline.md) - (Superseded oleh 0008) Produksi dibagi 7 peran agent berbasis dokumen.
30. [adr/0006-idempotent-publish-receipts.md](adr/0006-idempotent-publish-receipts.md) - Idempotensi publish via receipt + publishKey.
31. [adr/0007-no-local-npm-deps-pinned-npx.md](adr/0007-no-local-npm-deps-pinned-npx.md) - Tanpa deps npm lokal; HyperFrames via npx ter-pin.
32. [adr/0008-four-phase-workflow.md](adr/0008-four-phase-workflow.md) - Produksi 4 fase (Story, Screen Plan, Build, QA opsional) dengan gate.
33. [adr/0009-motion-broll-motion-kit.md](adr/0009-motion-broll-motion-kit.md) - Motion b-roll lewat engine motion-kit + sub-composition HyperFrames.
34. [adr/0010-per-video-hyperframes-projects.md](adr/0010-per-video-hyperframes-projects.md) - Komposisi per video di `videos/<slug>/`; root `index.html` hanya template.
35. [adr/0011-per-target-publish-idempotency.md](adr/0011-per-target-publish-idempotency.md) - Idempotensi publish per target account (amends 0006); aman menambah platform baru.
36. [adr/0012-style-broll-style-kit.md](adr/0012-style-broll-style-kit.md) - Style b-roll (broll-text, motion-graphic, whiteboard) lewat style-kit; 7 gaya dalam 3 sub-proyek.
37. [adr/0013-paper-pack-bitmap-assets.md](adr/0013-paper-pack-bitmap-assets.md) - Paper pack (tekstur CC0 + objek Codex) dan aset bitmap per video; stop-motion + tangan whiteboard.
38. [adr/0014-vox-mix-media.md](adr/0014-vox-mix-media.md) - VOX (capture/ilustrasi + highlighter, peta) dan mix-media (Dena di atas kolase via `video cutout`).
39. [adr/0015-parallax-css-3d.md](adr/0015-parallax-css-3d.md) - 2.5D parallax lewat multiplane CSS 3D, `parallax-stage`, dan `video layers`; ketujuh gaya lengkap.
40. [adr/0016-shared-asset-library.md](adr/0016-shared-asset-library.md) - Pustaka aset bersama `vendor/asset-lib/` (ikon, doodle, kertas, peta, tekstur, scene, font), preset palet/tipografi, dan contact sheet.
41. [adr/0017-per-style-example-hosts.md](adr/0017-per-style-example-hosts.md) - Satu host contoh per gaya di `style-examples/<gaya>/`, `index.html` + `snapshots.json` dihasilkan dari `examples.json`; tes cakupan pola.
42. [adr/0018-moodboard-studies.md](adr/0018-moodboard-studies.md) - Moodboard per gaya: 42 studi teknik buatan sendiri + sheet per gaya; still asli hanya di `moodboard/local/` (gitignored).
43. [adr/0019-story-decides-hook-length.md](adr/0019-story-decides-hook-length.md) - Panjang hook diputuskan Story (`hook_end`), bukan dikunci 3 detik; jendela hook dipakai hook card dan R4.
44. [adr/0020-studio-web-ui.md](adr/0020-studio-web-ui.md) - Studio: web UI lokal tanpa dependency (localhost + Tailscale), sesi agen tmux + terminal xterm.js, cascade delete, publish dari UI.
45. [adr/0021-craft-kit-choreography.md](adr/0021-craft-kit-choreography.md) - Koreografi motion ala NullMotion lewat `vendor/craft-kit/` (resep data keyframe, `CK.add` GSAP + `CK.at` update(t)); opsional, reference `motion-craft.md`.
46. [adr/0022-multi-source-projects.md](adr/0022-multi-source-projects.md) - Project multi-sumber: `sources.json`, `shared/` menggantikan `raw/`, `video cut`, Studio berpusat project.
47. [adr/0023-voice-adapter-tts.md](adr/0023-voice-adapter-tts.md) - Adapter suara: Gemini 3.8 Flash TTS (`GEMINI_TTS_API_KEY`) + Supertonic lokal via `uv` + rekaman; preset, cache per paragraf, uji dengar blind.
48. [adr/0024-music-library.md](adr/0024-music-library.md) - Pustaka BGM `shared/music/`: allowlist lisensi (cc0, public-domain, pixabay, mixkit), katalog + bukti lisensi, tab Studio Musik.
49. [adr/0025-generate-mode-explainer.md](adr/0025-generate-mode-explainer.md) - Mode generate: explainer motion design dari naskah + TTS (tanpa footage), Gate 1/2 wajib, storyboard sheet, BGM ter-duck, starter `dena-generate`.
50. [adr/0026-studio-generate.md](adr/0026-studio-generate.md) - Studio mode generate: form + panel review gate, `gates.json` + `video gate` (sidik jari artefak), keputusan diketik ke sesi tmux.
51. [adr/0027-music-formats.md](adr/0027-music-formats.md) - Format generate tanpa narasi (kinetic-post, motion-short): musik sebagai sumbu waktu (`video music` + `beats.json`), dua gate.

### Design System & Frontend
52. [design-system/visual-system.md](design-system/visual-system.md) - Sistem visual: palet, tipografi, kartu, track/z-index, safe area, motion.
53. [frontend/composition-implementation.md](frontend/composition-implementation.md) - Starter Dena dan tata letak proyek per video.

### Operations
54. [operations/runbook.md](operations/runbook.md) - Perintah harian: setup, dev, check, render, publish, transkripsi.
55. [operations/publish-runbook.md](operations/publish-runbook.md) - Menjalankan auto-publish R2/Repliz + kegagalan umum.
56. [operations/video-editing-workflow.md](operations/video-editing-workflow.md) - Operasional 4 fase + gate + ikhtisar per fase.
57. [operations/implementation-standard.md](operations/implementation-standard.md) - Alur perubahan, verifikasi wajib, Definition of Done.
58. [operations/agent-documentation-workflow.md](operations/agent-documentation-workflow.md) - Cara agent memakai docs sebagai SoT + Stop hook.
59. [operations/roadmap.md](operations/roadmap.md) - Rencana: imagegen fix, rilis open-source; arah produk draft.

### Security
60. [security/security-standard.md](security/security-standard.md) - Aturan secret, model kredensial publish, secret scan.
61. [security/audit-2026-07-20.md](security/audit-2026-07-20.md) - Audit awal: tidak ada secret asli ter-track (pass).

## Canonical Files

Doc mana yang kanonik untuk area apa (perbaiki di sini dulu bila ada konflik):

| Area | Doc kanonik |
| --- | --- |
| Stack / teknologi | [architecture/stack](architecture/stack.md) |
| Entitas data & JSON | [architecture/data-model](architecture/data-model.md) |
| Kontrak Repliz / R2 / CLI | [architecture/api-contract](architecture/api-contract.md) |
| Kualitas non-fungsional | [architecture/nfr](architecture/nfr.md) |
| Perilaku publish (EARS) | [requirements/rd-01-publish-pipeline](requirements/rd-01-publish-pipeline.md) |
| Kontrak komposisi/render (EARS) | [requirements/rd-02-composition-render](requirements/rd-02-composition-render.md) |
| Disiplin workflow video (EARS) | [requirements/rd-03-video-editing-workflow](requirements/rd-03-video-editing-workflow.md) |
| Transkripsi & setup (EARS) | [requirements/rd-04-transcription-setup](requirements/rd-04-transcription-setup.md) |
| Studio web UI (EARS) | [requirements/rd-05-studio](requirements/rd-05-studio.md) |
| Audio: suara TTS, uji dengar, musik (EARS) | [requirements/rd-06-audio](requirements/rd-06-audio.md) |
| Keputusan arsitektur | [adr/](adr/) (0001–0027) |
| Sistem visual video | [design-system/visual-system](design-system/visual-system.md) |
| Implementasi komposisi | [frontend/composition-implementation](frontend/composition-implementation.md) |
| Operasi harian | [operations/runbook](operations/runbook.md) |
| Operasi publish | [operations/publish-runbook](operations/publish-runbook.md) |
| Workflow 4 fase (operasional) | [operations/video-editing-workflow](operations/video-editing-workflow.md) |
| Standar implementasi & DoD | [operations/implementation-standard](operations/implementation-standard.md) |
| Keamanan | [security/security-standard](security/security-standard.md) |
| Produk & scope | [product/blueprint](product/blueprint.md) |
| Bisnis (draft) | [business/brd](business/brd.md) |
| Brand (draft) | [brand/strategy](brand/strategy.md) |
| Riset (draft) | [research/market](research/market.md) |

> Detail workflow video per fase hidup di `docs/agents/` (dokumen fase
> `01-story.md` … `04-qa.md` + `docs/agents/references/`) dan
> `docs/dena-social-video-style-guide.md` (di luar `internal/docs/`); doc
> operasional di sini merangkum & merujuknya, dan menjadi index kanoniknya.

## Naming Standard (glosarium domain)

Pakai istilah ini secara konsisten di semua doc & kode:

- **slug** — nama direktori kerja satu video: `videos/<slug>/`.
- **processed.mp4** — base video hasil cut (9:16, tanpa caption/overlay burned-in).
- **beat / caption beat** — satu unit caption pendek (1–4 kata ideal).
- **hook card** — kartu atas hitam pembuka selama jendela hook, kerja tanpa audio.
- **transcript hook** — satu kutipan ucapan verbatim yang memuat
  tension/puncak masalah, dipindahkan ke processed output `00:00.00-<hook_end>`
  sebelum alur penjelasan.
- **hook_end / jendela hook** — akhir hook yang diputuskan Story (titik keputusan
  hook tuntas, tanpa batas detik tetap); jendela hook = `00:00.00`–`hook_end`.
- **track (data-track-index)** — layer tumpang-tindih **temporal**, bukan paint order.
- **z-index** — urutan **paint** (siapa di atas siapa).
- **clip** — kelas wajib (`class="clip"`) tiap elemen ber-waktu.
- **composition-id** — `data-composition-id` root, kunci `window.__timelines`.
- **fase (phase)** — tahap workflow: Story → Screen Plan → Build → QA opsional (ADR-0008).
- **handoff artifact** — file output milik satu fase di `videos/<slug>/`.
- **Visual Decision Log** — log wajib fase Screen Plan di `visual-plan.md` untuk tiap peluang visual-support.
- **Gate 1 / Gate 2 / Gate 3** — review cut (opsional), rencana visual (kondisional R1–R6), review render (wajib); di mode generate: naskah + suara (wajib), storyboard (wajib), render.
- **mode generate** — video motion design tanpa footage Dena (`mode: generate`, ADR-0025): naskah + TTS sebagai sumbu waktu.
- **script.md** — naskah mode generate; narasi = teks sebelum section `## ` pertama, `## Fakta` memberi sumber tiap fakta.
- **style world** — satu style utama + palet (+ maksimal 2 aksen) untuk seluruh video generate.
- **storyboard sheet** — `preview/storyboard-sheet.jpg`: still contoh style per scene dengan nomor, waktu, dan kata (Gate 2 mode generate).
- **receipt** — `videos/<slug>/repliz-publish.json` (metadata + hasil publish).
- **publishKey** — sha256 ringkasan seluruh run `{r2Key, targetAccounts, description}`; disimpan di receipt tapi tidak lagi dipakai untuk keputusan skip (lihat `targetKey`, ADR-0011).
- **targetKey** — sha256 per target account `{r2Key, platform, accountId, description, title, replies}`; menentukan apakah satu platform di-reuse, dijadwalkan ulang, atau `blocked` (ADR-0011).
- **r2Key** — object key R2 `<prefix>/<slug>/<file>`.
- **approval / `--approved`** — gate manusia wajib sebelum upload/scheduling.
- **target account** — akun sosial tujuan dari `REPLIZ_<PLATFORM>_ACCOUNT_ID`.
- **EARS** — format acceptance criteria (5 pola), lihat [ears-standard](requirements/ears-standard.md).

## Source Discipline

- Doc detail = kanonik. `entrypoints/` hanya ringkas. **Bila konflik, perbaiki
  doc detail dulu, lalu sinkronkan entrypoint-nya.**
- Perubahan perilaku ditulis sebagai EARS **sebelum** kode.
- Update doc yang tersentuh **dalam commit yang sama** dengan kodenya.
- Doc baru **wajib** ter-link dari Reading Order di file ini.
- Keputusan arsitektural baru → ADR baru (`adr/NNNN-*.md`, Status accepted).
- Bila perubahan murni mekanis, nyatakan eksplisit "no docs update needed".
