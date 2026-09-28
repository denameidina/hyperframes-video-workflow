# ADR-0019 Panjang hook diputuskan Story, bukan dikunci 3 detik
Status: accepted
Date: 2026-09-28

## Context

Kontrak hook lama (RD-03-25, RD-03-30) mewajibkan kutipan verbatim pembuka
berakhir paling lambat `00:03.00` pada processed timeline. Pada banyak
transkrip, kalimat yang benar-benar membuat hook — keputusan, kontradiksi, atau
puncak masalah — tidak tuntas dalam 3 detik. Batas itu memaksa Story memotong
hook di tengah pikiran, memilih kandidat yang lebih lemah, atau menandai
blocker, padahal kalimat utuhnya yang membuat penonton bertahan.

## Decision

- Hook tetap satu potongan ucapan verbatim yang kontigu, dimulai di output
  `00:00.00`, tanpa menyambung kata terpisah.
- Akhir hook (`hook_end`) diputuskan Story: titik tempat keputusan hook tuntas.
  Tidak ada batas detik tetap. Story memilih span terpendek yang masih memuat
  keputusan itu secara utuh dan tidak ikut membuka jawaban/penjelasan.
- Story mencatat `hook_end` dan alasan panjangnya di `creative-brief.md`,
  `edit-decision-notes.md` (Cut Summary + Transcript Hook), dan `cut-list.json`
  (`primaryHook.outputEnd`, `primaryHook.lengthReason`).
- "Jendela hook" = `00:00.00`–`hook_end`. Semua aturan hilir yang dulu memakai
  `00:00.00–00:03.00` kini memakai jendela ini: hook card (dibagi beberapa
  halaman bila tidak muat 2–4 baris), R4 (visual yang menutupi wajah), dan
  tahap "hook" di retention spine.
- Tujuan hook: membuat orang berhenti scroll lalu menonton sampai akhir. Hook
  wajib lolos uji stop-scroll (kata pembuka menahan penonton, juga tanpa audio)
  dan uji tonton sampai akhir (membuka loop yang payoff-nya mendarat telat,
  idealnya menjelang CTA). Story mencatat `openLoop` dan `payoff`, dan cut
  tidak boleh menjawab loop sebelum payoff.
- Screen Plan dan Build tidak mengubah panjang hook; bila jendela terasa terlalu
  panjang/pendek, temuan dirutekan ke Story.

## Rationale

- Keputusan hook bersifat editorial dan sudah dimiliki Story (ADR-0008); angka
  tetap menggantikan penilaian itu dengan aturan mekanis.
- Span terpendek yang utuh menjaga tempo tanpa memotong makna.

## Consequences

- Hook yang lebih panjang menunda penjelasan; Story wajib menulis alasan
  panjangnya dan tetap memotong jeda/filler di dalam hook.
- Detik-detik pertama tetap harus menarik tanpa audio: hook card muncul di
  `00:00.00` dan halaman pertamanya memuat kata pembuka hook.
- Rencana/spec lama di `docs/superpowers/` tetap menyebut `00:03.00` sebagai
  catatan historis; dokumen kanonik mengikuti ADR ini.

## Sources

- RD-03-24, RD-03-25, RD-03-29, RD-03-30, RD-03-61–RD-03-64 di
  [rd-03-video-editing-workflow](../requirements/rd-03-video-editing-workflow.md)
- [ADR-0008](0008-four-phase-workflow.md)
