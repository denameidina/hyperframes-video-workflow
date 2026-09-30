# Motion-linked Transition Assets
Status: asset-pack production contract
Date: 2026-09-30

## Scope

Paket reusable yang diminta setelah [riset transisi](../research/motion-linked-transitions.md).
Ini produksi aset motion, bukan video sosial dengan naskah/voiceover atau
perubahan workflow Story/Screen Plan/Build. Tujuh jenis di riset dibuat sebagai
sumber editable, overlay transparan, dan demo konten. Root template tidak diubah.

Output lokal: `shared/transitions/motion-linked-v1/`. Sumber preview/render:
`videos/motion-linked-transitions/` dan `videos/motion-linked-overlays/`.
Media lokal ini mengikuti kebijakan repo: ignored, tidak di-upload.

## Acceptance criteria

Kriteria EARS kanonik paket ini: **RD-02-48–55** di
[kontrak komposisi/render](../requirements/rd-02-composition-render.md).
Ringkasannya: tujuh preset 3 detik/1080×1920/30 fps, endpoint alpha nol,
wipe penuh pada 1.5 s, manifest sambungan, SVG/source/SFX terpisah, demo
berlabel sample UI, dan check + inspeksi snapshot sebelum handoff.

## Presets and connection plan

All presets use one style world: near-black, cream, yellow, optional restrained
blue; bold local sans and mono labels. Central connection anchor `(540, 960)`.
Overlay time 0–3 s; entry/exit are transparent handles, active motion is in the
middle. The demo gives each transition a four-second slot, preserving a stable
reading interval around the active move. SFX lands on the important action.

| Preset | Carrier / connection | Content behavior in the demo | Implementation boundary |
| --- | --- | --- | --- |
| shared-element | One continuous frame | Text card expands into sample UI | Replace content in the editable source; overlay is the connecting frame |
| shape-match | Circle and rounded panel | Circle becomes matching diagram node | Align position/size at handoff; this can be a cut, not a morph |
| motion-match | Directional ribbon/arrow | Outgoing and incoming media continue rightwards | Retiming both content assets is required; overlay alone does not move them |
| object-wipe | Oversized paper foreground | Scene changes under full coverage | Cut only at the documented fully covered frame |
| camera-handoff | Expanding portal/frame | View pushes into a detail and settles | Editable source drives content scale; overlay supplies the portal |
| shape-morph | One connected vector carrier | Underline becomes arrow/diagram route | Authored vector correspondence; no raster/image morph promise |
| semantic-handoff | Label/chip frame | A concept label leads into its illustrated representation | Replace copy/content together; motion does not manufacture factual links |

These are transition carriers and motion templates. MP4 does not preserve
transparency. WebM overlay does not automatically animate footage below it;
shared-element, motion-match, camera-handoff, and semantic connections need
the matching content motion in the editable scene.

## Production and verification

Read HyperFrames router/core/animation/motion-graphics/CLI before composition
edits. Run `npm run video -- check motion-linked-transitions` and
`npm run video -- check motion-linked-overlays`. Inspect snapshots at the active
handoff and resting state for each preset. Verify exported WebM alpha by decoding
with `libvpx-vp9`, including clear endpoints and active pixels. For object wipe,
verify full coverage at the cut frame. Probe durations, dimensions, fps, and demo
audio with FFprobe. Record measured outputs in the pack README and manifest.

The user requested production of the complete asset pack; render is part of this
deliverable. Publishing remains subject to the existing explicit approval gate.

## Verified delivery (2026-09-30)

- Seven alpha WebM + seven ProRes 4444 MOV clips, ten editable SVG files,
  seven original procedural WAV cues, seven standalone preset sources, and
  a portable editable demo source are in `shared/transitions/motion-linked-v1/`.
- Demo: `preview/motion-linked-demo.mp4`, 28.000 s video, 1080×1920, 30 fps;
  AAC 48 kHz stereo. Final-render contact sheet: `preview/contact-sheet.jpg`.
- Both project checks passed: lint and runtime had zero errors, inspect had
  zero layout issues. Forty demo contrast warnings were reviewed against
  visible frames: dark text is on cream/yellow panels; warnings include
  transparent/inactive layers and do not describe the visible panel contrast.
- All seven WebM and MOV endpoints decoded to alpha zero; active frames were
  visible. Object wipe decoded to alpha 255 across the entire canvas at 1.5 s.
- MOV alpha uses `prores_ks -profile:v 4 -alpha_bits 8`. With the available
  FFmpeg, alpha 16-bit conversion produced some 254 values on opaque wipe
  pixels; the 8-bit alpha option preserved full coverage. Keep the decoded
  pixel check when changing codecs/settings.
- All seven final-demo SFX cue windows have measured peaks between −16.1
  and −15.3 dBFS. Per-cue measurements are in `preview/audio-verification.json`.
- `manifest.json` records exact paths, anchors, timing, limitations, checksums,
  and alpha verification. Source SVG edits are reusable asset edits; animation
  uses editable CSS/SVG equivalents in HTML, so motion changes belong there.
- Packaging: `shared/transitions/motion-linked-v1.zip`; renders and media remain
  local, following the existing media-storage convention.
