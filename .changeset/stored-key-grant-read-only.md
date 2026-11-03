---
'@macts/runtime': minor
---

A key's stored grant can no longer be edited after the key is issued: to narrow a key, set its policy with `setKeyPolicy`; to change its grant, revoke it and issue a new one. `createApiKey` is now the only way to store a key, and it stores exactly the grant it signed into the token; `addKeyMetadata` is no longer exported. `updateKeyMetadata` now takes a `KeyMetadataUpdate`, which allows only `name`, and throws a `TypeError` for any other field (`permissions`, `originalPermissions`, `expiresAt`, `revoked`, `createdAt`, `keyPrefix`), leaving the record unchanged; revoke with `revokeKey`. `saveKeyMetadata` is removed; use `createApiKey`, `revokeKey` and `deleteKeyMetadata`. The permissions and expiry that `macts api-key list` shows are therefore always the ones the key's token carries.
