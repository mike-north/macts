---
'@macts/runtime': patch
'@macts/core': patch
---

API keys with no stored record are now refused, so deleting a key removes its access immediately in the process that deleted it, and within a few seconds elsewhere. Validation reports such a key with the new `UNKNOWN_KEY` error code; the HTTP and MCP surfaces answer it like any other key that cannot be verified (`UNAUTHENTICATED`, reason `invalid`, HTTP 401 with `WWW-Authenticate: Bearer`). The new `getKeyRecordStatus` returns `'active'`, `'revoked'`, or `'missing'` (`KeyRecordStatus`); `isKeyRevoked` keeps its meaning (a stored record marked revoked) and is deprecated in its favour.
