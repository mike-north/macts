# @macts/finder-server

## 0.4.0

### Patch Changes

- @macts/finder@0.4.0

## 0.3.0

### Minor Changes

- c4717eb: App manifests can now record the app's own spelling of a term and mark what the app does not have, and native operations use both.
  - **Native spellings.** A resource can name its collection as the app spells it (`native.collection`), and a property its field (`native.name`). Native bodies address the app by those names and return records under the public keys. Music's AirPlay devices are reached as `airplayDevices`, and 23 fields in Google Chrome, iTerm, Mail, Music and System Events (such as `url`, `ansiBlackColor` and `macAddress`) are read under the app's spelling.
  - **Probes read the app by its own spelling.** `macts probe` and `macts probe --nullability` address collections and properties by the recorded native spellings, and report under the manifest keys. Before, Music's AirPlay devices looked empty and fields such as Chrome's `url` and iTerm's ANSI colours counted as failed reads. Neither probe reads a resource marked unsupported.
  - **Fewer round trips for get, create and update.** Each reads the item's record once. A property the app leaves out of that record, such as Finder's `entireContents`, is read on its own.
  - **Unsupported resources and commands.** A resource or command can be marked unsupported, with the evidence for it: the app's dictionary has no such class or element, or a live read failed with a recorded error. A marked resource or command gets no route, no permission, and no generated operation or type. Screen Sharing connections, Console devices, Finder desktop and trash objects, and Contacts instant messages are marked, as are Automator's `getSetting` and `getRequiredResource`.
  - **Top-level collections.** The Reminders and Automator manifests now record that reminders, and Automator's actions and variables, are collections of the application itself, as live counts confirm. No route changes.

  Breaking for callers of what is removed: the Screen Sharing connections `list` and `get` operations and the Automator `settings get` and `requiredResources get` operations, with their permissions; and the exported types and schemas for Console `Device`, Finder `DesktopObject` and `TrashObject`, Contacts `InstantMessage`, and Screen Sharing `Connection`.

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

- Updated dependencies [c5a4690]
- Updated dependencies [c4717eb]
- Updated dependencies [e2c7efc]
- Updated dependencies [e319917]
- Updated dependencies [36942f9]
- Updated dependencies [a189125]
- Updated dependencies [a746285]
  - @macts/finder@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [2e46b8f]
- Updated dependencies [1d1e53a]
  - @macts/api@0.2.0
  - @macts/core@0.2.0
  - @macts/finder@0.2.0
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
  - @macts/finder@0.1.0
