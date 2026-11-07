# @macts/mail

## 0.3.0

### Minor Changes

- c4717eb: App manifests can now record the app's own spelling of a term and mark what the app does not have, and native operations use both.
  - **Native spellings.** A resource can name its collection as the app spells it (`native.collection`), and a property its field (`native.name`). Native bodies address the app by those names and return records under the public keys. Music's AirPlay devices are reached as `airplayDevices`, and 23 fields in Google Chrome, iTerm, Mail, Music and System Events (such as `url`, `ansiBlackColor` and `macAddress`) are read under the app's spelling.
  - **Probes read the app by its own spelling.** `macts probe` and `macts probe --nullability` address collections and properties by the recorded native spellings, and report under the manifest keys. Before, Music's AirPlay devices looked empty and fields such as Chrome's `url` and iTerm's ANSI colours counted as failed reads. Neither probe reads a resource marked unsupported.
  - **Fewer round trips for get, create and update.** Each reads the item's record once. A property the app leaves out of that record, such as Finder's `entireContents`, is read on its own.
  - **Unsupported resources and commands.** A resource or command can be marked unsupported, with the evidence for it: the app's dictionary has no such class or element, or a live read failed with a recorded error. A marked resource or command gets no route, no permission, and no generated operation or type. Screen Sharing connections, Console devices, Finder desktop and trash objects, and Contacts instant messages are marked, as are Automator's `getSetting` and `getRequiredResource`.
  - **Top-level collections.** The Reminders and Automator manifests now record that reminders, and Automator's actions and variables, are collections of the application itself, as live counts confirm. No route changes.

  Breaking for callers of what is removed: the Screen Sharing connections `list` and `get` operations and the Automator `settings get` and `requiredResources get` operations, with their permissions; and the exported types and schemas for Console `Device`, Finder `DesktopObject` and `TrashObject`, Contacts `InstantMessage`, and Screen Sharing `Connection`.

- e2c7efc: Generated contracts leave out, for now, an output field holding a reference that macts cannot yet return in a form a caller can resolve. Each is a gap in what macts covers, not something the app cannot do. Restoring them is planned under #219, and each field comes back on regeneration once macts provides a way to read its target. A field is left out when it references:
  - a resource macts has no get for yet;
  - a resource macts has no identifier for yet;
  - a resource the app finds only within its container, unless the field is on that container's own record and the container is identified by an id, or by a name claimed unique with evidence (see the container reference changeset);
  - or a resource macts identifies by its name, when the manifest has no evidence yet that the name is unique. Such a reference resolves to whichever object has that name, which may not be the one the app returned. A primary identifier claimed `unique: true`, with its evidence, counts as identity.

  A field left out is not declared by the contract's record type or value type, and native reads do not read it. It is also gone from the HTTP client's read type and schema and from what the CLI prints. Input types are unchanged, so a writable field may still be set. Generation warns once per field left out. The warning names the app, the field, the referenced resource and what macts does not provide yet, for example: macts has no get for "Mailbox" yet. The same rule applies to a command result, but no manifest records one yet. The generator's tests pin every field left out, as a ledger of the coverage still to restore.

  Breaking change: these record fields are gone from the HTTP client's read types and schemas, and from what the CLI prints. Only the four Xcode fields were on records a call returned before this change: RunDestination and WorkspaceDocument have a get and a list. Every other record listed here has no get, list, create or update in macts today, so no call returned it, and only its declared type changes.
  - Arc: Window `activeTab` and `activeSpace`.
  - Finder: FinderWindow `listViewOptions`, and ListViewOptions `sortColumn`.
  - iTerm: Window `currentTab` and `currentSession`, and Tab `currentSession`.
  - Mail:
    - Message `mailbox` and `content`;
    - MessageViewer `draftsMailbox`, `inbox`, `junkMailbox`, `outbox`, `sentMailbox` and `trashMailbox`;
    - Mailbox `account` and `container`;
    - Rule `copyMessage` and `moveMessage`.
  - Messages: Participant and Chat `account`.
  - System Events:
    - the folder fields of ClassicDomainObject, Domain and UserDomainObject;
    - DiskItem `container`;
    - NetworkPreferencesObject `currentLocation`;
    - Service `currentConfiguration` and `interface`;
    - ScriptingClass `superclass`;
    - ScriptingCommand `directParameter`.
  - TV: BrowserWindow and PlaylistWindow `view`, and Playlist `parent`.
  - Xcode, on records a call returns: RunDestination `device` and `companionDevice` (macts has no get for Device yet), and WorkspaceDocument `lastSchemeActionResult` (no get for SchemeActionResult yet) and `activeRunDestination`. A run destination is identified by its name, and the manifest has no evidence yet that the name is unique. It is also found only within its workspace document, so the field needs its workspace container as well as that evidence.

- 36942f9: A reference now names the app it belongs to. Every reference data and bound form (`IdentityReferenceData`, `SelectorReferenceData`, `IdentityCollectionReferenceData`, `SelectorCollectionReferenceData`, and the bound `ObjectReference` and `CollectionReference` types) has a required `app` field: the `app` of the contract it is used with. Containers and identity-collection entries carry it too.
  - **Decoding** sets `app` from the contract at every level.
  - **Encoding** rejects a reference whose `app` is missing or names another app, at any level. The issue is at `[...path, 'app']`, so a reference from one app cannot be passed to another app's operation; the call fails with a validation error before anything is sent.
  - **The wire form is unchanged.** It never carries `app`, because the route already names the app. A wire reference that carries `app` is rejected.

  `t.reference` now takes a scope instead of a resource table: `t.reference(() => scope, resource, cardinality)`, where the new `ReferenceScope` type is `{ app, resources }`. An app contract is assignable to `ReferenceScope`, and generated contracts pass `() => <app>Contract`. Code that builds references by hand must add `app`, and code that calls `t.reference` with a resource table must pass a scope instead.

  Reference types now carry their resource key as a literal type. The data types (`IdentityReferenceData`, `SelectorReferenceData`, `IdentityCollectionReferenceData`, `SelectorCollectionReferenceData`, `ObjectReferenceData`, `CollectionReferenceData`) and the bound types (`ObjectReference`, `CollectionReference`, `IdentityReference`, `SelectorReference`, `IdentityCollectionReference`, `SelectorCollectionReference`, `ObjectReferenceVariant`, `CollectionReferenceVariant`) each take a final type parameter for it, which defaults to `string`. `t.reference` infers it from its `resource` argument.

  Generated contracts type references by direction:
  - Record fields and command results hold a bound reference, `ObjectReferenceVariant<Record, Id, 'Key'>`.
  - Parameters and create and update fields take its data form, `ObjectReferenceData<Id, 'Key'>`. Callers can pass a reference they build, by identifier or by selector, or one they received.

  A reference to another resource, or of the other cardinality, no longer type-checks.

  A reference must now name objects that can be resolved, at every level:
  - A single reference, every container, and every identity-collection entry need a resource with a `get` operation.
  - A collection needs a resource with `list`.

  `ReferenceRegistry` entries record `get` and `list` for this, and an app contract's `resources` table already has them. The runtime's reference resolution applies the rule too: a resolve request whose container or entry names a resource with no `get` is rejected as a validation failure. A resource whose resolving operation is unavailable cannot be resolved. The rule is part of the reference wire schema, so it applies everywhere: to encoding, decoding, the runtime's check of raw HTTP and MCP requests, and the JSON Schema of every reference position. That JSON Schema now lists only the resources that can contain a reference, and a position whose resource lacks its operation admits no value (`{"not": {}}`). A violation is reported at the reference itself, or at the `resource` of the offending container or entry.

  `ResourceDescriptor.id` now documents the meaning of an identity reference to a resource keyed by name. It resolves to whichever object has that name when it is resolved. When several objects share the name, the app decides which one that is.

  Generated surfaces never offer an operation that cannot be called. An input position that takes a single reference to a resource with no `get` admits no value, so the rule above rejects every request that fills it. An optional position like that is left out of the input. A required one makes the operation unavailable:
  - generation warns, naming the app, the operation and the position;
  - the descriptor stays in the contract's `operations`, with a new `unavailable` member (`OperationUnavailability`: the positions and the reason);
  - the runtime answers `invoke` of it exactly as an unknown operation, with the same validation error, before permission, governance or approval, so no one is asked to approve a call that cannot run;
  - the MCP adapter lists no tool for it, and calling its tool name is an unknown-tool call;
  - the HTTP API neither routes nor lists it: `POST /rpc/<id>` gets the same 404 as an unknown operation, and introspection leaves it out;
  - neither generated client has a method for it, the generated CLI has no command for it, and capability discovery lists no capability for it;
  - its permission is no longer a known permission: `macts api-key create` rejects a grant naming it (for example `mail:app:synchronize`) as an unknown permission, and `macts permissions expand` no longer lists or suggests it. These permissions never authorized anything that could be called.

  A left-out position has no parameter in either generated client, no CLI flag, and no field in the capability schema.

  None of the affected positions ever worked through the native runtime, because it cannot yet encode references. What changes is how a request that uses them is treated. A request that sends a left-out field used to reach the server, and is now rejected as an unknown field. An unavailable operation is no longer offered as a tool, a route, a client method, a command or a capability.

  The operation that becomes unavailable is Mail `mail.app.synchronize`: its required `with` takes an account, and Mail has no operation that gets one. The `synchronize` method of both the contract client and the `MailClient` HTTP client, and the CLI command `macts mail synchronize`, are removed.

  Operations that lose an optional position:
  - Mail `mail.app.checkForNewMail` loses `for` (an account). The contract client method is now `checkForNewMail(options?)`, the HTTP client method `checkForNewMail()`, and the CLI flag `--for` is removed.
  - Mail `mail.app.performMailActionWithMessages` loses `inMailboxes` (a mailbox) and `forRule` (a rule). The contract client method is now `performMailActionWithMessages(options?)`, the HTTP client method `performMailActionWithMessages()`, and the CLI flags `--in-mailboxes` and `--for-rule` are removed.

  Create and update input types that no operation takes lose the same kind of field, in both the contract and the HTTP client types (`src/types.ts`), so the two clients' input types agree for every resource. The types change, but no request does:
  - Finder `ListViewOptionsCreateInput` and `ListViewOptionsUpdateInput` lose `sortColumn`.
  - iTerm `WindowCreateInput` and `WindowUpdateInput` lose `currentTab` and `currentSession`, and `TabCreateInput` and `TabUpdateInput` lose `currentSession`.
  - Mail `MessageCreateInput` and `MessageUpdateInput` lose `mailbox`, and `RuleCreateInput` and `RuleUpdateInput` lose `copyMessage` and `moveMessage`.
  - TV `BrowserWindowCreateInput` and `BrowserWindowUpdateInput` lose `view`, and become `Record<string, never>`.
  - System Events `NetworkPreferencesObjectCreateInput` and `NetworkPreferencesObjectUpdateInput` lose `currentLocation`, and become `Record<string, never>`. `ServiceCreateInput` and `ServiceUpdateInput` lose `currentConfiguration`.

  `CliGeneratorContext` gains `isOperationAvailable` and `omittedInputs`, which the CLI generator uses to apply the rule.

- a189125: Breaking change: the application-level `delete` operation is removed from Finder, Google Chrome, iTerm, Mail, Music and TV.

  Each app declared `delete` at application scope with no parameters, so the operation named no item to delete. It never deleted anything: its body called the app's delete with no object, and each of these apps' dictionaries requires the object to delete. Each manifest now leaves it out. The removed pieces are the `<app>.app.delete` operation, the `_delete()` method of the contract client and of the HTTP client, the CLI's `delete` command, and the capability entry. A delete for these apps comes back once it can name the item it acts on.

  Update these packages together with `@macts/runtime`. A runtime from this release refuses an earlier release of any of these six packages as a whole, because it still declares the application-level delete.

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
