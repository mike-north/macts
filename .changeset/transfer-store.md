---
'@macts/runtime': minor
---

Add the transfer store, `createTransferStore()`: a persistent record of file grants, uploads, download links, and temporary copies under `<macts-home>/transfers/`, for reading and writing files remotely. The store mints every temporary copy's path itself (`allocateTemporaryCopy()`) and only ever deletes regular files it named, so cleanup can never reach outside the store.

Grants and uploads belong to the caller that created them; anyone else presenting one gets `TransferError` with reason `unknown-transfer`, indistinguishable from an id that never existed. Grants are reusable until they expire, and each exchange issues a fresh, short-lived download link. Uploads are usable only once completely received and are single-use: a second consume fails, and the staged bytes are deleted after the consuming call whether it succeeded or failed. Interrupted or oversized uploads leave no partial file behind.

Uploads are limited to 100 MiB each, 16 outstanding per caller, and 512 MiB outstanding per caller; going over the count fails with `RateLimitedError` saying when to retry. Grants and uploads last 15 minutes, download links 5 minutes, and temporary copies 60 minutes; expired transfers and their files are swept automatically. The limits are exported as named constants. Tokens are stored only as SHA-256 hashes and never appear in error messages, nor do upload ids or staged file paths. The store writes its directories and files readable by the owner only, and refuses to open a store created by a newer macts rather than downgrading it.
