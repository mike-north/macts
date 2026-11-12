# @macts/microsoft-word-server

## 0.4.0

### Patch Changes

- @macts/microsoft-word@0.4.0

## 0.3.0

### Minor Changes

- 4a4dda0: Permissions for Microsoft Edge, Microsoft Word and Script Editor now start with the same app segment as their routes.

  Every permission's app segment is now its route's app segment, the app name in lower case with spaces as hyphens. Before, these three apps used a second, shorter name, so a grant such as `microsoft-edge:*:*` didn't cover their routes. A test over every shipped manifest now checks this rule.

  **Breaking: re-grant API keys for these three apps.** Only the app prefix changes; the resource and operation segments stay the same:
  - `edge:` becomes `microsoft-edge:`
  - `word:` becomes `microsoft-word:`
  - `scripteditor:` becomes `script-editor:`

  Every grant that changes:

  | Old grant                       | New grant                              |
  | ------------------------------- | -------------------------------------- |
  | `edge:bookmarkFolders:get`      | `microsoft-edge:bookmarkFolders:get`   |
  | `edge:bookmarkFolders:list`     | `microsoft-edge:bookmarkFolders:list`  |
  | `edge:bookmarkItems:get`        | `microsoft-edge:bookmarkItems:get`     |
  | `edge:bookmarkItems:list`       | `microsoft-edge:bookmarkItems:list`    |
  | `edge:tabs:copySelection`       | `microsoft-edge:tabs:copySelection`    |
  | `edge:tabs:create`              | `microsoft-edge:tabs:create`           |
  | `edge:tabs:cutSelection`        | `microsoft-edge:tabs:cutSelection`     |
  | `edge:tabs:delete`              | `microsoft-edge:tabs:delete`           |
  | `edge:tabs:execute`             | `microsoft-edge:tabs:execute`          |
  | `edge:tabs:get`                 | `microsoft-edge:tabs:get`              |
  | `edge:tabs:goBack`              | `microsoft-edge:tabs:goBack`           |
  | `edge:tabs:goForward`           | `microsoft-edge:tabs:goForward`        |
  | `edge:tabs:list`                | `microsoft-edge:tabs:list`             |
  | `edge:tabs:pasteSelection`      | `microsoft-edge:tabs:pasteSelection`   |
  | `edge:tabs:redo`                | `microsoft-edge:tabs:redo`             |
  | `edge:tabs:reload`              | `microsoft-edge:tabs:reload`           |
  | `edge:tabs:selectAll`           | `microsoft-edge:tabs:selectAll`        |
  | `edge:tabs:stop`                | `microsoft-edge:tabs:stop`             |
  | `edge:tabs:undo`                | `microsoft-edge:tabs:undo`             |
  | `edge:tabs:update`              | `microsoft-edge:tabs:update`           |
  | `edge:tabs:viewSource`          | `microsoft-edge:tabs:viewSource`       |
  | `edge:windows:create`           | `microsoft-edge:windows:create`        |
  | `edge:windows:delete`           | `microsoft-edge:windows:delete`        |
  | `edge:windows:get`              | `microsoft-edge:windows:get`           |
  | `edge:windows:list`             | `microsoft-edge:windows:list`          |
  | `edge:windows:update`           | `microsoft-edge:windows:update`        |
  | `scripteditor:documents:create` | `script-editor:documents:create`       |
  | `scripteditor:documents:get`    | `script-editor:documents:get`          |
  | `scripteditor:documents:list`   | `script-editor:documents:list`         |
  | `word:app:copy`                 | `microsoft-word:app:copy`              |
  | `word:app:cut`                  | `microsoft-word:app:cut`               |
  | `word:app:find`                 | `microsoft-word:app:find`              |
  | `word:app:paste`                | `microsoft-word:app:paste`             |
  | `word:app:redo`                 | `microsoft-word:app:redo`              |
  | `word:app:replace`              | `microsoft-word:app:replace`           |
  | `word:app:selectAll`            | `microsoft-word:app:selectAll`         |
  | `word:app:undo`                 | `microsoft-word:app:undo`              |
  | `word:bookmarks:create`         | `microsoft-word:bookmarks:create`      |
  | `word:bookmarks:delete`         | `microsoft-word:bookmarks:delete`      |
  | `word:bookmarks:get`            | `microsoft-word:bookmarks:get`         |
  | `word:bookmarks:list`           | `microsoft-word:bookmarks:list`        |
  | `word:documents:activate`       | `microsoft-word:documents:activate`    |
  | `word:documents:close`          | `microsoft-word:documents:close`       |
  | `word:documents:create`         | `microsoft-word:documents:create`      |
  | `word:documents:createRange`    | `microsoft-word:documents:createRange` |
  | `word:documents:delete`         | `microsoft-word:documents:delete`      |
  | `word:documents:get`            | `microsoft-word:documents:get`         |
  | `word:documents:insert`         | `microsoft-word:documents:insert`      |
  | `word:documents:list`           | `microsoft-word:documents:list`        |
  | `word:documents:print`          | `microsoft-word:documents:print`       |
  | `word:documents:save`           | `microsoft-word:documents:save`        |
  | `word:documents:update`         | `microsoft-word:documents:update`      |
  | `word:fields:create`            | `microsoft-word:fields:create`         |
  | `word:fields:delete`            | `microsoft-word:fields:delete`         |
  | `word:fields:get`               | `microsoft-word:fields:get`            |
  | `word:fields:list`              | `microsoft-word:fields:list`           |
  | `word:fields:update`            | `microsoft-word:fields:update`         |
  | `word:paragraphs:get`           | `microsoft-word:paragraphs:get`        |
  | `word:paragraphs:list`          | `microsoft-word:paragraphs:list`       |
  | `word:paragraphs:update`        | `microsoft-word:paragraphs:update`     |
  | `word:tables:create`            | `microsoft-word:tables:create`         |
  | `word:tables:delete`            | `microsoft-word:tables:delete`         |
  | `word:tables:get`               | `microsoft-word:tables:get`            |
  | `word:tables:list`              | `microsoft-word:tables:list`           |
  | `word:tables:update`            | `microsoft-word:tables:update`         |

- 8c4faef: App permission groups now list only permissions that some operation requires.

  The permission groups in 14 app manifests listed 122 permissions that no operation required, such as `microsoft-edge:tabs:update` (Edge has no tab update operation) and `calendar:calendars:delete`. Granting one authorized nothing. They are removed from the permission groups that discovery and the generated packages publish, and a test over every shipped manifest keeps them from coming back. An operation's permission returns to its group together with the operation's command.

  Grants of the removed permissions authorized nothing before and still authorize nothing. `macts api-key create` still accepts one, with or without `--manifest`, and warns on stderr that no route requires it, appending `Closest: "…"` when a permission a route requires is close. For example, `omniplan:tasks:update` names `omniplan:tasks:create`. Before, with `--manifest` it failed with `Resource "…" not found in permissions mapping` or `Operation "…" not found`. Without `--manifest`, a `create` or `delete` permission was accepted silently.

  `createApiKey` in `@macts/runtime` grants a well-formed fine-grained permission that the permissions map does not list as written, and still expands coarse and wildcard permissions through the map. `expandPermissions` and `expandCoarsePermission` in `@macts/core` take a new option, `{ unmapped: 'keep' | 'reject' }`, which `createApiKey` sets to `keep`. The default stays `reject`, so `macts permissions expand` still fails for such a permission.

- 2a00978: Server packages are now contract-only. Each re-exports its app's generated contract from `@macts/<app>/contract` as `contract`, and depends only on `@macts/<app>`. The `./mcp` export (the generated MCP plugin) and the `plugin` export (the HTTP API plugin with its embedded manifest) are removed, along with the dependencies on `@macts/api`, `@macts/core` and `@macts/types`. A macts host serves the app from the contract and the app's manifest. The package's `types` entry now points at the declarations the build emits.

### Patch Changes

- Updated dependencies [c945d04]
- Updated dependencies [686212a]
- Updated dependencies [80fad3c]
- Updated dependencies [7429951]
- Updated dependencies [4a4dda0]
- Updated dependencies [8c4faef]
- Updated dependencies [e6214e2]
- Updated dependencies [a746285]
  - @macts/microsoft-word@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [2e46b8f]
- Updated dependencies [1d1e53a]
  - @macts/api@0.2.0
  - @macts/core@0.2.0
  - @macts/microsoft-word@0.2.0
  - @macts/types@0.2.0

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

- Updated dependencies [1454024]
- Updated dependencies [613ffcf]
- Updated dependencies [2ad7c96]
- Updated dependencies [4851845]
- Updated dependencies [4898fbd]
- Updated dependencies [68bf762]
- Updated dependencies [37fc2aa]
- Updated dependencies [8143d36]
- Updated dependencies [41274b5]
- Updated dependencies [f1e103f]
- Updated dependencies [17166aa]
- Updated dependencies [7f3f095]
- Updated dependencies [25f27f4]
- Updated dependencies [d4fa5be]
- Updated dependencies [6225db2]
- Updated dependencies [0a6f7e1]
- Updated dependencies [b72513a]
- Updated dependencies [4851845]
- Updated dependencies [d1f350e]
- Updated dependencies [245273b]
- Updated dependencies [a68161c]
- Updated dependencies [9a98e47]
- Updated dependencies [cd2860a]
- Updated dependencies [c7ac226]
  - @macts/core@0.1.0
  - @macts/api@0.1.0
  - @macts/microsoft-word@0.1.0
  - @macts/types@0.1.0
