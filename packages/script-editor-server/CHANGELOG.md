# @macts/script-editor-server

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

- 2a00978: Server packages are now contract-only. Each re-exports its app's generated contract from `@macts/<app>/contract` as `contract`, and depends only on `@macts/<app>`. The `./mcp` export (the generated MCP plugin) and the `plugin` export (the HTTP API plugin with its embedded manifest) are removed, along with the dependencies on `@macts/api`, `@macts/core` and `@macts/types`. A macts host serves the app from the contract and the app's manifest. The package's `types` entry now points at the declarations the build emits.

### Patch Changes

- Updated dependencies [c945d04]
- Updated dependencies [686212a]
- Updated dependencies [7429951]
- Updated dependencies [4a4dda0]
- Updated dependencies [a746285]
  - @macts/script-editor@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [2e46b8f]
- Updated dependencies [1d1e53a]
  - @macts/api@0.2.0
  - @macts/core@0.2.0
  - @macts/script-editor@0.2.0
  - @macts/types@0.2.0

## 0.1.0

### Patch Changes

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
  - @macts/types@0.1.0
  - @macts/script-editor@0.1.0
