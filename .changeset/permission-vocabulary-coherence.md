---
'@macts/core': minor
'@macts/api': minor
'@macts/cli': minor
'@macts/microsoft-word': minor
'@macts/microsoft-word-server': minor
---

Make the permission and operation vocabulary coherent so a granted scope reliably authorizes the calls it is meant for.

**Single-sourced operation vocabulary (`@macts/core`)**

- The operation vocabulary now has one authority. A new `permissions/vocabulary` module exports `COARSE_OPERATIONS` (the fixed CRUD aliases), `PURE_COARSE_OPERATIONS` (`read`/`write`, the grouping-only aliases), `isCoarseOperation`, `isPureCoarseOperation`, and `getOperationVocabulary`/`getFineOperations` (which derive the app-specific fine-grained operation set from a manifest). CLI help, the code generator, and docs consume these instead of re-typing the set; a drift-guard test fails if any surface re-defines it.

**Phantom `read` eliminated**

- A grouping-only coarse operation (`read`/`write`) never authorizes a call on its own. Creating a key with such a scope and no manifest to expand it is now rejected with `UnexpandableCoarsePermissionError`, which names the wildcard and fine-grained permissions to use instead — rather than silently storing a scope that denies every real call.
- `validateCommandPermissions` now rejects a manifest command whose operation is a grouping-only coarse alias, preventing a phantom `read` from re-entering a manifest. The Microsoft Word `createRange` command, which incorrectly required `word:documents:read`, now requires `word:documents:createRange`.
- Generated SDK key-creation hints use the real `--permission` flag (was the non-existent `--permissions`) and a wildcard scope that actually authorizes calls.

**Coherent wildcard and `--manifest` semantics**

- Authorization is exact-match-or-wildcard: a granted permission covers a call when it matches exactly or has `*` in the resource and/or operation segment. Coarse operations are creation-time sugar expanded against a manifest, never a matching rule. This mental model is now documented in the CLI and API READMEs to match the matcher's actual behavior.

**Precise denials**

- A denied permission check names the exact missing `app:resource:operation` and the resource wildcard that would also authorize the call, so the fix is a single grant.
