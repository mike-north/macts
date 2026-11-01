---
'@macts/core': minor
'@macts/runtime': minor
'@macts/cli': minor
---

Permissions can now name camelCase resources and operations

The resource and operation segments of a permission are camelCase (`photos:mediaItems:list`, `iterm:app:splitVertically`) or `*`. The app segment is unchanged. Before this, 129 of the 473 route permissions failed the format and could not be granted by any key. Dashes and underscores are no longer allowed in the resource and operation segments; no shipped manifest used them. Matching is still exact and case-sensitive.

A denied call whose key holds a grant that differs from the required permission only in letter case now gets a hint naming both and the permission to grant. `createApiKey` rejects a malformed permission with the rule and the closest valid permissions, and accepts `knownPermissions` to also reject a permission that differs from a real one only in case (`PermissionCaseMismatchError`). `macts api-key create` and `macts permissions expand` do the same against the app's manifest, from `--manifest` or the discovered manifests directory, and warn on stderr about a well-formed permission no known route requires, saying so explicitly when the manifest's permissions map lists it but no route requires it yet. `@macts/core` adds `suggestPermissions`, `listKnownPermissions`, `findCaseOnlyMismatch`, `explainInvalidPermission`, and `PERMISSION_FORMAT_DESCRIPTION`.
