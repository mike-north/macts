---
'@macts/runtime': minor
---

Add uploads and temporary copies to the transfer store.

`createUpload()`, `receiveUpload()` and `consumeUpload()` let a remote caller send a file's bytes for an operation to write. An upload belongs to the caller that created it; anyone else presenting its id gets `TransferError` with reason `unknown-transfer`, indistinguishable from an id that never existed. An upload is usable only once completely received (`incomplete` otherwise) and is single-use: a second consume fails, whatever the first one's outcome, and the staged bytes are deleted after the consuming call whether it succeeded or failed. An oversized receive (`too-large`) or an interrupted one leaves no partial file; an interrupted upload can be received again. Uploads are limited to 100 MiB each, 16 outstanding per caller and 512 MiB outstanding per caller; going over the count fails with `RateLimitedError` saying when to retry. Uploads last 15 minutes.

`allocateTemporaryCopy()` mints a fresh, owner-only file for a local read, at a path the store chooses itself, and returns it with a `release()`. The store only ever deletes regular files it named, so cleanup can never reach outside the store. Temporary copies last 60 minutes.

The sweep now also removes expired uploads and temporary copies with their files. Error messages never contain upload ids or staged file paths.
