# @macts/notes-server

## 0.3.0

### Minor Changes

- ee7ba82: Manifest properties can carry nullability and resettability claims with their evidence. Generated contracts make a read field nullable unless the manifest has evidence that it is never empty, and an update field accepts `null` only when the property is resettable. Each generated field documents its nullability and the evidence for it.

  `macts probe <app> --nullability` gathers that evidence read-only from the running app. It records, per field, how often a value was missing, never the values themselves. Probe writes now keep the manifest's formatting.

  A manifest command can set `routeName`, the segment of its public route and default permission, which otherwise is the command key. Two commands that resolve to the same route are rejected when the manifest loads. The HTTP router and the runtime operation registry take each operation's permission from its resolved route.

  Breaking: Notes attachments are identified by `id` instead of `name`, which can be empty. Their route stays `notes.attachments.get`, and the permission stays `notes:attachments:get`.

- 2d69b61: Notes and attachments now type `creationDate` and `modificationDate` as `Date`, as the Notes dictionary declares them. They used to be typed as strings, so listing attachments failed decode against the real app ("Expected a string, received a date"). Breaking for callers that read these fields as strings.
- 8c4faef: App permission groups now list only permissions that some operation requires.

  The permission groups in 14 app manifests listed 122 permissions that no operation required, such as `microsoft-edge:tabs:update` (Edge has no tab update operation) and `calendar:calendars:delete`. Granting one authorized nothing. They are removed from the permission groups that discovery and the generated packages publish, and a test over every shipped manifest keeps them from coming back. An operation's permission returns to its group together with the operation's command.

  Grants of the removed permissions authorized nothing before and still authorize nothing. `macts api-key create` still accepts one, with or without `--manifest`, and warns on stderr that no route requires it, appending `Closest: "…"` when a permission a route requires is close. For example, `omniplan:tasks:update` names `omniplan:tasks:create`. Before, with `--manifest` it failed with `Resource "…" not found in permissions mapping` or `Operation "…" not found`. Without `--manifest`, a `create` or `delete` permission was accepted silently.

  `createApiKey` in `@macts/runtime` grants a well-formed fine-grained permission that the permissions map does not list as written, and still expands coarse and wildcard permissions through the map. `expandPermissions` and `expandCoarsePermission` in `@macts/core` take a new option, `{ unmapped: 'keep' | 'reject' }`, which `createApiKey` sets to `keep`. The default stays `reject`, so `macts permissions expand` still fails for such a permission.

- e319917: Generated SDKs no longer expose properties that the app cannot provide at runtime.
  - A manifest property can now carry an evidence-backed `unsupported` marker. Every generated surface (contract, SDK, CLI, MCP tools, HTTP routes) omits a marked property.
  - `macts probe --nullability` reports a defect when every read of a property fails. It also reports a defect when the observed value kind (date, number, boolean, string, record, list, reference) contradicts the declared type, and suggests the marker where it fits.
  - Nested resources are now sampled from evenly spaced parents within a bounded scan, so deep collections such as calendar event alarms yield items instead of hitting the time limit. The probe record gains `parentsScanned`.
  - **Breaking SDK field changes:**
    - Finder: `Container.expandable`, `expanded`, `completelyExpanded`, `containerWindow` removed. `ApplicationFile.suggestedSize`, `minimumSize`, `preferredSize`, `opensInClassic` removed. `DocumentFile.id` removed. `Package.id` is now a string.
    - Calendar: `Calendar.calendarIdentifier` removed. Calendars are targeted by name. `Event.stampDate` is now nullable, because a wider sample found events without it.
    - Notes: `Folder.container` removed.
    - Reminders: `allDayDueDate` is renamed `alldayDueDate` and is nullable. `List.color` is now a string.

- 2a00978: Server packages are now contract-only. Each re-exports its app's generated contract from `@macts/<app>/contract` as `contract`, and depends only on `@macts/<app>`. The `./mcp` export (the generated MCP plugin) and the `plugin` export (the HTTP API plugin with its embedded manifest) are removed, along with the dependencies on `@macts/api`, `@macts/core` and `@macts/types`. A macts host serves the app from the contract and the app's manifest. The package's `types` entry now points at the declarations the build emits.

### Patch Changes

- Updated dependencies [c945d04]
- Updated dependencies [c5a4690]
- Updated dependencies [686212a]
- Updated dependencies [80fad3c]
- Updated dependencies [ee7ba82]
- Updated dependencies [7429951]
- Updated dependencies [2d69b61]
- Updated dependencies [7aed949]
- Updated dependencies [ead44ad]
- Updated dependencies [8c4faef]
- Updated dependencies [e319917]
- Updated dependencies [e6214e2]
- Updated dependencies [a746285]
  - @macts/notes@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [2e46b8f]
- Updated dependencies [1d1e53a]
  - @macts/api@0.2.0
  - @macts/core@0.2.0
  - @macts/notes@0.2.0
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
  - @macts/notes@0.1.0
