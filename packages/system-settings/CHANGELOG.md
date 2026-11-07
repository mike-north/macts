# @macts/system-settings

## 0.3.0

### Minor Changes

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

- a746285: `bindReference` now accepts only resource keys a reference can resolve through, and generated contracts expose their resource table's type.

  Each generated contract exports the type of its resource table as `<App>Resources` (for example `NotesResources`), and the contract is typed `AppContract<<App>Client, <App>Resources>`. The type declares one entry per resource: each builds on `ResourceDescriptor<Record, Id>` and requires the identifier and the literal `get` and `list` operation ids the resource has. The table value is checked against it with `satisfies`, so the type and the value describe one table. `AppContract` takes the table type as an optional second type argument, so `AppContract<Client>` still means a contract whose table keys are not known. Both `createClient` factories return `Client & ClientBrand<Resources>`, and each generated client interface extends `ClientBrand<<App>Resources>` (for example `interface NotesClient extends ClientBrand<NotesResources>`), so the client's type carries the contract's table, including a variable or parameter annotated `NotesClient`. The brand exists only in the type; a client has no added property under any key, and its members are still exactly the app's operations.

  A generated resource table now lists only the resources that have a `get` or a `list` operation. No reference to any other resource can be resolved, in any form or position, so encoding and decoding already rejected them; they now fail as references to a resource the app cannot resolve references through. Their record interfaces are still exported.

  `MactsRuntime.resolveReference` (and so the `/references/v1` route) rejects both kinds of unresolvable target with `ValidationError` (`VALIDATION_FAILED`, 400), with an issue at the reference's `resource`. A reference to a resource absent from the contract's table fails with "The reference names no resource of the app.", the issue saying the app has no such resource. A reference to a resource in the table that has no `get` (for a single reference) or no `list` (for a collection) fails with an issue naming that missing operation. `InvalidSelectionError` is reserved for an index or range the collection cannot satisfy.

  `bindReference(client, data)` reads the table from the client's type. Data type-checks only when every level names a key that records the operation it resolves through: `get` for a single-object reference, a container, and an identity-collection entry, and `list` for a collection. An identity reference needs a resource with an identifier, of the identifier's type. The result is the bound variant for the data's resource, form and cardinality, with the resource's record and identifier types, so `resolve()` returns `Promise<Record>` or `Promise<readonly Record[]>` instead of `unknown`. Where the position takes any container, a container that is itself a reference a client decoded is accepted as it is. At a parent-scoped position, only an identity reference to the parent is accepted. Clients of a contract with no declared table type accept any reference data, as before. `bindReference` behaves as before at runtime. `@macts/contracts` exports the types involved: `ResourceTable`, `ClientBrand`, `ResolvableResourceKey`, `ResolvableReferenceData` (and its object and collection halves), `ResolvableContainment`, `ResourceRecordOf`, `ResourceIdOf`, and `BoundReferenceOf`.

  Generated HTTP clients' list methods return `Page<T>` from `@macts/contracts` instead of an inline `{ items, nextCursor? }` shape, so their items are read-only arrays.

### Patch Changes

- c5a4690: Discovery reports the permission every operation requires. A capability's permission was reported only when the manifest declared one, so most capabilities showed no permission although the server enforces one for every operation. Each capability, in the capability registry, in discovery and CLI search output, and in every generated `capabilities.ts`, now reports the permission the server enforces for its route: the declared one, else the one derived from the route, such as `notes:attachments:get`.
- 686212a: Generated CLI commands now name the identifier that addresses an item, instead of always saying "ID". The arguments and their order are unchanged.
  - A `get` command's description names it: "Get a playlist by persistent ID", "Get a document by name". It is the item's own identifying field, which can differ from the parameter's name: a calendar is looked up by its name.
  - In help, the item argument of a `get` command, and of any other command on one item, is labeled with it: `macts music playlists get <persistent-id>` instead of `<playlistId>`.
  - Descriptions use "an" before a vowel: "Get an event by uid".

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
