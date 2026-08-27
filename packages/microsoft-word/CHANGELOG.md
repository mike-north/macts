# @macts/microsoft-word

## 0.1.0

### Minor Changes

- b72513a: Make the permission and operation vocabulary coherent so a granted scope reliably authorizes the calls it is meant for.

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

### Patch Changes

- 4898fbd: Fix risk classifier to resolve the most sensitive class for compound operation names

  Multi-token operation names whose first matching keyword was a read verb
  (search/find/get/list) were classified as `read` even when the name also
  contained a mutating verb token (e.g. `searchAndReplace`, `findAndReplace`).
  The classifier now collects all risk classes matched by any token in the name
  and returns the most sensitive, so a name carrying both a read token and a
  write token correctly resolves to `write`.

  Several mutation verbs that appear as non-leading tokens (`replace`, `reorder`,
  `rewrite`, `normalize`, `sanitize`, `toggle`, `apply`, `commit`, `flush`,
  `patch`, `transform`, `convert`, `merge`, `assign`) are added to the `write`
  keyword table.

  Five operations across four app packages that were over-gated as `execute`
  (the safe default for unknown ops) are correctly reclassified as `write`:
  `toggleHotkeyWindow` (iTerm), `replace` (Microsoft Word), `convert` (Music, TV),
  and `assign` (OmniPlan). Affected capability metadata regenerated.
