# @macts/system-events-server

## 0.4.0

### Patch Changes

- @macts/system-events@0.4.0

## 0.3.0

### Minor Changes

- c4717eb: App manifests can now record the app's own spelling of a term and mark what the app does not have, and native operations use both.
  - **Native spellings.** A resource can name its collection as the app spells it (`native.collection`), and a property its field (`native.name`). Native bodies address the app by those names and return records under the public keys. Music's AirPlay devices are reached as `airplayDevices`, and 23 fields in Google Chrome, iTerm, Mail, Music and System Events (such as `url`, `ansiBlackColor` and `macAddress`) are read under the app's spelling.
  - **Probes read the app by its own spelling.** `macts probe` and `macts probe --nullability` address collections and properties by the recorded native spellings, and report under the manifest keys. Before, Music's AirPlay devices looked empty and fields such as Chrome's `url` and iTerm's ANSI colours counted as failed reads. Neither probe reads a resource marked unsupported.
  - **Fewer round trips for get, create and update.** Each reads the item's record once. A property the app leaves out of that record, such as Finder's `entireContents`, is read on its own.
  - **Unsupported resources and commands.** A resource or command can be marked unsupported, with the evidence for it: the app's dictionary has no such class or element, or a live read failed with a recorded error. A marked resource or command gets no route, no permission, and no generated operation or type. Screen Sharing connections, Console devices, Finder desktop and trash objects, and Contacts instant messages are marked, as are Automator's `getSetting` and `getRequiredResource`.
  - **Top-level collections.** The Reminders and Automator manifests now record that reminders, and Automator's actions and variables, are collections of the application itself, as live counts confirm. No route changes.

  Breaking for callers of what is removed: the Screen Sharing connections `list` and `get` operations and the Automator `settings get` and `requiredResources get` operations, with their permissions; and the exported types and schemas for Console `Device`, Finder `DesktopObject` and `TrashObject`, Contacts `InstantMessage`, and Screen Sharing `Connection`.

- dae51a7: Each resource is now spelled the same way on every public surface.

  A resource's segment is the acronym-aware lower camel case of its plural (`MediaItems` → `mediaItems`, `AIMHandles` → `aimHandles`, `URLs` → `urls`). One shared function derives it, and these all use it: routes and operation ids, SDK accessors, MCP tool names, capability names, and the scope segment of derived permissions.

  **Breaking for multi-word resources.** These change:
  - routes and operation ids: `photos.mediaitems.list` becomes `photos.mediaItems.list`
  - SDK accessors: `photos.mediaitems` becomes `photos.mediaItems`
  - MCP tool names: `macts__photos__mediaitems_list` becomes `macts__photos__mediaItems_list`
  - MCP operation names split acronyms as words: `macts__iterm__app_invoke_a_p_i_expression` becomes `macts__iterm__app_invoke_api_expression`, and `macts__mail__app_get_u_r_l` becomes `macts__mail__app_get_url` (5 tools in iTerm, Mail, QuickTime Player and Screen Sharing)
  - derived permissions: for example, `mail:outgoingmessages:send` becomes `mail:outgoingMessages:send`

  A permission granted with the old lowercase scope no longer matches. The permission error suggests the correctly spelled one. Single-word resources are unchanged.

  Explicit manifest permissions that only restated the derived default are removed, so they can't drift from the derivation. Every route's enforced permission is unchanged except where its spelling changes as above.

- 2a00978: Server packages are now contract-only. Each re-exports its app's generated contract from `@macts/<app>/contract` as `contract`, and depends only on `@macts/<app>`. The `./mcp` export (the generated MCP plugin) and the `plugin` export (the HTTP API plugin with its embedded manifest) are removed, along with the dependencies on `@macts/api`, `@macts/core` and `@macts/types`. A macts host serves the app from the contract and the app's manifest. The package's `types` entry now points at the declarations the build emits.
- 5869dfc: Manifest-registered operations now reject input keys that are not declared parameters, as contract-registered operations already do.

  An operation registered with `registerManifest` (in `@macts/api`, every app passed to `createApp` as a manifest) accepts exactly its command's declared parameters. A call with any other key fails input validation with `VALIDATION_FAILED` (HTTP 400), with one issue at the input itself. As for any input that fails validation after the permission check, the call writes one `invalid-input` audit record, is not evaluated by policy, is never put to an approver, and does not run. Clients that sent extra keys to a manifest-served operation now receive this validation error; send only the operation's declared parameters.

  A resource-scoped get, update or delete whose manifest command declares no identifier parameter (no required parameter other than its parent's) is rejected at registration: `registerManifest` throws `OperationRegistrationError` naming the app and the command, and registers nothing from the app. Such a get or update could not be called once undeclared keys are rejected, and such a delete selects no item: it calls the app's delete with no target.

  Breaking change in `@macts/system-events`: the `diskItems.delete` operation (`system-events.diskItems.delete`) is removed, because it did not target the disk item it named. It took an `id` but called System Events' delete with no target. The contract client's `diskItems.delete(id)`, the HTTP client's `DiskItemResourceClient` and `SystemEventsClient.diskItems`, and the capability entry are gone, and the System Events manifest no longer declares the command. A delete that targets one disk item will be added once disk items can be selected by an identifier. No other shipped command is affected.

  A list registered from a manifest does not page, so it does not accept `pageSize` or `cursor`. Lists registered from a contract page as before.

  `buildCommandSchema` and `buildSchemaRegistry` are unchanged and still let undeclared keys through; the runtime no longer validates operation input with them.

### Patch Changes

- Updated dependencies [c5a4690]
- Updated dependencies [80fad3c]
- Updated dependencies [c4717eb]
- Updated dependencies [e2c7efc]
- Updated dependencies [36942f9]
- Updated dependencies [e6214e2]
- Updated dependencies [dae51a7]
- Updated dependencies [5869dfc]
- Updated dependencies [85e3e3a]
- Updated dependencies [0dd1855]
- Updated dependencies [a746285]
  - @macts/system-events@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [2e46b8f]
- Updated dependencies [1d1e53a]
  - @macts/api@0.2.0
  - @macts/core@0.2.0
  - @macts/system-events@0.2.0
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
  - @macts/system-events@0.1.0
