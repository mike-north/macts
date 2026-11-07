# @macts/omniplan

## 0.3.0

### Minor Changes

- c945d04: Breaking change: list operations return bounded pages.

  Every list output changed from an array to a page, `{ items, nextCursor? }` (`Page<T>` and `t.page(item)` in `@macts/contracts`). Lists whose items have an identifier the manifest claims unique take two optional inputs, `pageSize` and `cursor`. A page holds at most `pageSize` items: 25 by default and at most 100, the same on every transport. A page size of zero, below zero, not an integer or above 100 is rejected, never clamped. When more items remain, the page carries a `nextCursor`; send the same inputs again with it as `cursor` to read the next page. The cursor is opaque. Paging bounds the size of each call. It bounds the latency of each call only for lists whose pages are read by range, which is most of them: a list read by column costs what its whole collection costs per page (see the entry on how each list reads its pages). Paging does not make a full listing cheaper in total.

  Every other list takes neither input and returns its whole collection as one page with no `nextCursor`: a page is anchored on the identifier of the item before it, which only a unique identifier can do. Uniqueness is opt-in, from evidence: a manifest identifier records `unique: true` (or `unique: false`) with `evidence.unique` saying where the claim comes from, and the capability registry's input schemas show the paging inputs for exactly the lists that page. Contacts lists (people, groups, and a person's emails, phones and addresses) page, because Contacts describes each of those identifiers as unique. Music's playlist list pages. Its track list does not: a playlist can hold the same song more than once, and both entries are expected to share one persistent ID. Calendar event and calendar lists do not page: recurring events share a uid, and calendar names can repeat. `listOperationPages` in `@macts/core` is the one rule every surface uses, and the runtime refuses a contract whose list takes the paging inputs when the manifest says it does not page, or the reverse. Resolving a collection reference is not paged: it still returns the full array of records.

  Each surface takes the paging inputs from the contract. Generated SDK list methods take a trailing `page` argument (`list(listId, { pageSize, cursor })`) and return `Page<T>`. HTTP and MCP callers send `pageSize` and `cursor` in the input. When more items remain, MCP adds a second text block after the result, saying how many items the page holds and how to read more; the first block is always the JSON result. Generated CLI list commands take `--page-size` and `--cursor` and print how to see the next page. App parameters named `pageSize` or `cursor` on a list operation are now a generation error.

  There is a new error, `COLLECTION_CHANGED` (`CollectionChangedError`, HTTP 409, no details). It replaces `UnexpectedValueError` for a collection that changed while it was being read. The same request is correct and can be retried, from the first page if it was paged. A cursor whose item has since moved or been deleted fails this way. A malformed cursor, or one sent to another operation or with other inputs, is a validation error at `cursor`. Audit records and logs record only that a cursor was presented, never its contents.

- 2f68e92: Breaking: CRUD operations are published under their operation name instead of the manifest's internal command key. Every get, list, create, update, and delete route and operation id is now `<app>.<resource plural>.<get|list|create|update|delete>`; for example, `calendar.events.getEvent` is now `calendar.events.get`, and `reminders.reminders.listReminders` is now `reminders.reminders.list`. This moves 90 routes across Automator, Calendar, Microsoft Edge, OmniFocus, OmniGraffle, OmniPlan, Photos, Reminders, Shortcuts, and Xcode.

  Permissions do not change. SDK, CLI, and MCP method, command, and tool names do not change.

- 8c4faef: App permission groups now list only permissions that some operation requires.

  The permission groups in 14 app manifests listed 122 permissions that no operation required, such as `microsoft-edge:tabs:update` (Edge has no tab update operation) and `calendar:calendars:delete`. Granting one authorized nothing. They are removed from the permission groups that discovery and the generated packages publish, and a test over every shipped manifest keeps them from coming back. An operation's permission returns to its group together with the operation's command.

  Grants of the removed permissions authorized nothing before and still authorize nothing. `macts api-key create` still accepts one, with or without `--manifest`, and warns on stderr that no route requires it, appending `Closest: "…"` when a permission a route requires is close. For example, `omniplan:tasks:update` names `omniplan:tasks:create`. Before, with `--manifest` it failed with `Resource "…" not found in permissions mapping` or `Operation "…" not found`. Without `--manifest`, a `create` or `delete` permission was accepted silently.

  `createApiKey` in `@macts/runtime` grants a well-formed fine-grained permission that the permissions map does not list as written, and still expands coarse and wildcard permissions through the map. `expandPermissions` and `expandCoarsePermission` in `@macts/core` take a new option, `{ unmapped: 'keep' | 'reject' }`, which `createApiKey` sets to `keep`. The default stays `reject`, so `macts permissions expand` still fails for such a permission.

- e6214e2: Resource commands now send the app the item you name, and take the same inputs as the resource's `get`: the parent's identifier where the get takes one, then the item's identifier, then the command's other parameters. Each manifest edit cites the command's direct parameter in the app's scripting dictionary.

  **Breaking changes in the SDK, contract and CLI inputs:**
  - **Automator:** `workflows.execute(name)` takes the workflow's name, in place of `workflow`.
  - **Calendar:** `events.show(calendarId, id)`. Its docs say that when several calendars share the name, the first match is used as the calendar.
  - **Mail:** `outgoingMessages.send(id)` takes the outgoing message's integer id.
  - **Microsoft Edge:** the tab commands (`reload`, `goBack`, `goForward`, `selectAll`, `cutSelection`, `copySelection`, `pasteSelection`, `undo`, `redo`, `stop`, `viewSource` and `execute`) take `(windowId, id, ...)` in place of `tabId`.
  - **Microsoft Word:** the document commands (`activate`, `close`, `createRange`, `print`, `save` and `saveAs`) take the document's name first.
  - **Music:** `playlists.move` and `playlists.search` take the playlist's `persistentID` first.
  - **TV:** `playlists.move` and `playlists.search` take `(sourceId, persistentID, ...)`.
  - **Reminders:** `reminders.show(id)`.
  - **Xcode:** the workspace document commands (`attach`, `build`, `clean`, `debug`, `run`, `stop` and `test`) take `name` in place of `workspaceName`.
  - **Notes, Photos and Shortcuts:** the SDK and contract are unchanged. Their CLI commands (`notes show`, `mediaItems duplicate` and `shortcuts run`) take the item as their one positional. They no longer ask for it a second time as a flag, or for parent flags they never used, such as `--album-id`.

  **Removed commands that do nothing:**
  - **Mail:** `messages.bounce`, which Mail's dictionary describes as "Does nothing at all (deprecated)".
  - **System Settings:** `panes.authorize` and `panes.timedLoad`, which its dictionary says no longer do anything. With them, the SDK's `panes` client and `PaneResourceClient` are removed, since panes had no other commands.

  OmniPlan `fix`, Music and TV `refresh`, System Events `click`, `perform` and `select`, and Mail `forward`, `redirect` and `reply` cannot select their item yet. They behave as before, with the same SDK, contract and CLI inputs, and their docs and CLI help now say that macts does not yet send the item to the app.

  Refs #287

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

- a746285: `bindReference` now accepts only resource keys a reference can resolve through, and generated contracts expose their resource table's type.

  Each generated contract exports the type of its resource table as `<App>Resources` (for example `NotesResources`), and the contract is typed `AppContract<<App>Client, <App>Resources>`. The type declares one entry per resource: each builds on `ResourceDescriptor<Record, Id>` and requires the identifier and the literal `get` and `list` operation ids the resource has. The table value is checked against it with `satisfies`, so the type and the value describe one table. `AppContract` takes the table type as an optional second type argument, so `AppContract<Client>` still means a contract whose table keys are not known. Both `createClient` factories return `Client & ClientBrand<Resources>`, and each generated client interface extends `ClientBrand<<App>Resources>` (for example `interface NotesClient extends ClientBrand<NotesResources>`), so the client's type carries the contract's table, including a variable or parameter annotated `NotesClient`. The brand exists only in the type; a client has no added property under any key, and its members are still exactly the app's operations.

  A generated resource table now lists only the resources that have a `get` or a `list` operation. No reference to any other resource can be resolved, in any form or position, so encoding and decoding already rejected them; they now fail as references to a resource the app cannot resolve references through. Their record interfaces are still exported.

  `MactsRuntime.resolveReference` (and so the `/references/v1` route) rejects both kinds of unresolvable target with `ValidationError` (`VALIDATION_FAILED`, 400), with an issue at the reference's `resource`. A reference to a resource absent from the contract's table fails with "The reference names no resource of the app.", the issue saying the app has no such resource. A reference to a resource in the table that has no `get` (for a single reference) or no `list` (for a collection) fails with an issue naming that missing operation. `InvalidSelectionError` is reserved for an index or range the collection cannot satisfy.

  `bindReference(client, data)` reads the table from the client's type. Data type-checks only when every level names a key that records the operation it resolves through: `get` for a single-object reference, a container, and an identity-collection entry, and `list` for a collection. An identity reference needs a resource with an identifier, of the identifier's type. The result is the bound variant for the data's resource, form and cardinality, with the resource's record and identifier types, so `resolve()` returns `Promise<Record>` or `Promise<readonly Record[]>` instead of `unknown`. Where the position takes any container, a container that is itself a reference a client decoded is accepted as it is. At a parent-scoped position, only an identity reference to the parent is accepted. Clients of a contract with no declared table type accept any reference data, as before. `bindReference` behaves as before at runtime. `@macts/contracts` exports the types involved: `ResourceTable`, `ClientBrand`, `ResolvableResourceKey`, `ResolvableReferenceData` (and its object and collection halves), `ResolvableContainment`, `ResourceRecordOf`, `ResourceIdOf`, and `BoundReferenceOf`.

  Generated HTTP clients' list methods return `Page<T>` from `@macts/contracts` instead of an inline `{ items, nextCursor? }` shape, so their items are read-only arrays.

### Patch Changes

- 686212a: Generated CLI commands now name the identifier that addresses an item, instead of always saying "ID". The arguments and their order are unchanged.
  - A `get` command's description names it: "Get a playlist by persistent ID", "Get a document by name". It is the item's own identifying field, which can differ from the parameter's name: a calendar is looked up by its name.
  - In help, the item argument of a `get` command, and of any other command on one item, is labeled with it: `macts music playlists get <persistent-id>` instead of `<playlistId>`.
  - Descriptions use "an" before a vowel: "Get an event by uid".

- 80fad3c: The generated HTTP client and CLI now send integer ids and integer list parameters in the contract's wire form, so `get` by an integer id works through them.

  A get keyed by an integer id, such as OmniPlan's tasks, resources and milestones or TV's browser and playlist windows, sent the id as the text it was given, and the operation's input rejected it. The client's `get` now takes the id as a number or as text and sends `{ integer: "<digits>" }`. A list's required integer parameter is sent the same way, and the CLI's `list` converts the flag's text to a number. So are a delete's and an update's integer ids and every integer parameter of a command, such as Automator `add`'s `atIndex`, Word `insertText`'s `at` and `createRange`'s `start` and `end`, QuickTime Player's step `by`, System Events' `usingActionNumber` and Xcode `attach`'s `toProcessIdentifier`. An optional integer that is omitted is not sent.

  Required integer list flags and page-size flags validate their original text before exact conversion to the numeric SDK input, so fractional boundary values and noncanonical spellings cannot change the selected scope.

  Malformed, fractional, non-finite, and out-of-range integer inputs now fail locally with `ValidationError` before any HTTP request. Text identifiers must use canonical decimal spelling; numeric negative zero is sent as zero. The safe-integer bounds and validation policy come from the shared operation value contract.

  Standalone CLI plugin manifests also declare the shared contract runtime directly, so integer validation resolves under isolated dependency installation.

  Refs #207

- 7aed949: A list now returns bounded pages only when the app was seen to read the list's items a page at a time. Music's playlists list failed on every call, because Music rejects that kind of read. It now returns every playlist again.

  These lists stop paging: `music.playlists.list`, `photos.mediaItems.list`, `shortcuts.shortcuts.list`, `automator.automatorActions.list`, `xcode.projects.list`, `xcode.schemes.list`, `omniplan.scenarios.list`, and the Microsoft Edge `windows`, `tabs`, `bookmarkFolders` and `bookmarkItems` lists. Each one loses its `pageSize` and `cursor` inputs: the SDK method no longer takes a page argument, the CLI command no longer takes `--page-size` or `--cursor`, and the capability listing no longer shows either input. The list returns its whole collection as one page, with no `nextCursor`. Callers that pass `pageSize` or `cursor` to one of these lists now get a validation error, so remove those inputs.

  These lists still page, because each passed the check: Contacts people, groups, email addresses, phone numbers and addresses; Notes attachments; Photos albums and folders; Reminders lists, reminders and accounts; and Shortcuts folders.

  A manifest resource records the check in a new `rangeRead` field: `supported: true` or `false`, with evidence of the app version, macOS version and time it was checked, plus the error numbers when the check failed. A list pages only when its resource's primary identifier is claimed unique and its resource records `rangeRead.supported: true`. A resource with no `rangeRead`, or with `supported: false`, has lists that return their whole collection. `RangeReadEvidenceSchema` and `ResourceRangeReadSchema` are exported from `@macts/core`.

- Updated dependencies [c945d04]
- Updated dependencies [127d864]
- Updated dependencies [2a00978]
- Updated dependencies [7429951]
- Updated dependencies [7400f3b]
- Updated dependencies [87985bb]
- Updated dependencies [f9d86f8]
- Updated dependencies [aadc2fe]
- Updated dependencies [99a59fa]
- Updated dependencies [1cfc8fd]
- Updated dependencies [20e7083]
- Updated dependencies [36942f9]
- Updated dependencies [fb9a0a1]
- Updated dependencies [fe1c06c]
- Updated dependencies [f717527]
- Updated dependencies [075e994]
- Updated dependencies [dba9328]
- Updated dependencies [a746285]
- Updated dependencies [762a1ef]
  - @macts/contracts@0.3.0

## 0.2.0

## 0.1.0

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
