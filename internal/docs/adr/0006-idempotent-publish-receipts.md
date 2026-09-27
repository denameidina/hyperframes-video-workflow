# ADR-0006 Idempotensi Publish via Receipt + Publish Key
Status: accepted (reverse-engineered); amended oleh [ADR-0011](0011-per-target-publish-idempotency.md)
Date: 2026-07-20

**Catatan 2026-09-26:** `publishKey` global di sini masih dihitung dan disimpan
di receipt, tapi `runPublish` tidak lagi memakainya untuk memutuskan skip.
Keputusan skip/publish sekarang per target account (lihat ADR-0011) supaya
menambah satu platform baru (mis. Threads) tidak memicu re-publish ke platform
yang sudah sukses.

## Context

Menjalankan ulang `repliz:publish` (retry, rerun otomasi) tidak boleh membuat
post duplikat di platform sosial. Butuh cara mendeteksi bahwa kombinasi
media+target+caption sudah pernah dipublish.

## Decision

Menyimpan **receipt** `videos/<slug>/repliz-publish.json` setelah publish sukses,
berisi `publishKey` = `sha256({ r2Key, targetAccounts terurut, description })`.
Pada run berikutnya, publish **di-skip** bila `!force` dan
`receipt.publishKey === publishKey` dan `receipt.schedules.length > 0`. Flag
`--force` menimpa (re-upload + schedule baru).

## Rationale

- Hash atas (media, target, caption) menangkap "publish yang sama" secara
  deterministik.
- Menyimpan `scheduleId` di receipt memungkinkan resume/poll tanpa membuat ulang.
- `--force` menyediakan jalan keluar sadar untuk republish yang disengaja.

## Consequences

- Mengubah caption/target/file menghasilkan `publishKey` berbeda → dianggap
  publish baru (tidak di-skip).
- Receipt harus bebas secret (hanya hash + id), agar boleh disimpan lokal.
- Poll timeout menyimpan receipt non-terminal; rerun akan melanjutkan/menghormati
  state (tergantung isi schedules).

## Sources

- `scripts/repliz-publish.mjs` (`makePublishKey`, `shouldSkipPublish`, `writeReceipt`)
- `scripts/repliz-publish.test.mjs` (duplicate guard)
- [requirements/rd-01-publish-pipeline](../requirements/rd-01-publish-pipeline.md) (RD-01-13..15, 29)
