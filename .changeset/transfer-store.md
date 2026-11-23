---
'@macts/runtime': minor
---

Add the transfer store, `createTransferStore()`: a persistent record of file grants and download links under `<macts-home>/transfers/`, for reading files remotely.

A grant belongs to the caller it was issued to; anyone else presenting it gets `TransferError` with reason `unknown-transfer`, indistinguishable from a token that never existed. Grants are reusable until they expire, and each exchange issues a fresh, short-lived download link. Grants last 15 minutes and download links 5 minutes, and expired ones are swept automatically.

The limits for every kind of transfer, including uploads and temporary copies, are exported as named constants. Tokens are stored only as SHA-256 hashes and never appear in error messages. The store writes its directory and database readable by the owner only, and refuses to open a store created by a newer macts rather than downgrading it.
