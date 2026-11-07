# @macts/microsoft-edge

## 0.3.0

### Minor Changes

- c945d04: Breaking change: list operations return bounded pages.

  Every list output changed from an array to a page, `{ items, nextCursor? }` (`Page<T>` and `t.page(item)` in `@macts/contracts`). Lists whose items have an identifier the manifest claims unique take two optional inputs, `pageSize` and `cursor`. A page holds at most `pageSize` items: 25 by default and at most 100, the same on every transport. A page size of zero, below zero, not an integer or above 100 is rejected, never clamped. When more items remain, the page carries a `nextCursor`; send the same inputs again with it as `cursor` to read the next page. The cursor is opaque. Paging bounds the size of each call. It bounds the latency of each call only for lists whose pages are read by range, which is most of them: a list read by column costs what its whole collection costs per page (see the entry on how each list reads its pages). Paging does not make a full listing cheaper in total.

  Every other list takes neither input and returns its whole collection as one page with no `nextCursor`: a page is anchored on the identifier of the item before it, which only a unique identifier can do. Uniqueness is opt-in, from evidence: a manifest identifier records `unique: true` (or `unique: false`) with `evidence.unique` saying where the claim comes from, and the capability registry's input schemas show the paging inputs for exactly the lists that page. Contacts lists (people, groups, and a person's emails, phones and addresses) page, because Contacts describes each of those identifiers as unique. Music's playlist list pages. Its track list does not: a playlist can hold the same song more than once, and both entries are expected to share one persistent ID. Calendar event and calendar lists do not page: recurring events share a uid, and calendar names can repeat. `listOperationPages` in `@macts/core` is the one rule every surface uses, and the runtime refuses a contract whose list takes the paging inputs when the manifest says it does not page, or the reverse. Resolving a collection reference is not paged: it still returns the full array of records.

  Each surface takes the paging inputs from the contract. Generated SDK list methods take a trailing `page` argument (`list(listId, { pageSize, cursor })`) and return `Page<T>`. HTTP and MCP callers send `pageSize` and `cursor` in the input. When more items remain, MCP adds a second text block after the result, saying how many items the page holds and how to read more; the first block is always the JSON result. Generated CLI list commands take `--page-size` and `--cursor` and print how to see the next page. App parameters named `pageSize` or `cursor` on a list operation are now a generation error.

  There is a new error, `COLLECTION_CHANGED` (`CollectionChangedError`, HTTP 409, no details). It replaces `UnexpectedValueError` for a collection that changed while it was being read. The same request is correct and can be retried, from the first page if it was paged. A cursor whose item has since moved or been deleted fails this way. A malformed cursor, or one sent to another operation or with other inputs, is a validation error at `cursor`. Audit records and logs record only that a cursor was presented, never its contents.

- 261a888: Google Chrome windows and tabs can now be read:
  - `windows.list` and `windows.get(id)`.
  - `tabs.list(windowId)` and `tabs.get(windowId, id)`. Chrome holds each tab in its window and has no list of every tab, so a tab is listed and read within its window.

  A window or tab id identifies it within one browser session: ids start over when the browser is relaunched, so an id kept across a relaunch may name a different window or tab, not merely fail to find one. Nothing shows an id changing while the browser keeps running.

  Breaking change in Microsoft Edge: `tabs.get` now takes the tab's window as well as its id, `tabs.get(windowId, id)`, and the CLI's `windows tabs get` takes `--window-id`. Edge, like Chrome, has no list of every tab, so a tab can be read only within its window; before, the read looked for the tab in a list Edge does not have. This follows Edge's scripting dictionary and has not been verified on an installed Edge.

- a18ee4b: A command on a nested resource now names its parent in the manifest instead of having it guessed.

  A manifest command records `parent: { resource, parameter }`: the resource whose items hold the command's target, and the command's required parameter that carries the parent's identifier. The manifest schema rejects a parent resource the manifest does not declare or marks unsupported, and a parameter that is not one of the command's required parameters. Every operation takes its parent from this record. A command that records no parent addresses its resource at the application. Nothing infers a parent from a parameter's name or position any more.

  These operations now reach the right collection, where before they addressed one their app does not have:
  - Microsoft Edge: `bookmarkItems.list`, under a bookmark folder.
  - Xcode: `projects.list`, `schemes.list` and `runDestinations.list`, under a workspace document.
  - Automator: `automatorActions.list` and `variables.list`, under a workflow; `settings.list` and `requiredResources.list`, under an action.

  Xcode workspace documents and Automator workflows, which have no `id` in their apps, are now looked up by name when they are the parent.

  Calendar events, Microsoft Edge tabs, OmniGraffle graphics, shapes, lines and layers, and Reminders reminders record the parent they already used, so they behave as before. The generated SDK, CLI and tool signatures are unchanged; each app's contract manifest now carries the recorded parents.

- 2f68e92: Breaking: CRUD operations are published under their operation name instead of the manifest's internal command key. Every get, list, create, update, and delete route and operation id is now `<app>.<resource plural>.<get|list|create|update|delete>`; for example, `calendar.events.getEvent` is now `calendar.events.get`, and `reminders.reminders.listReminders` is now `reminders.reminders.list`. This moves 90 routes across Automator, Calendar, Microsoft Edge, OmniFocus, OmniGraffle, OmniPlan, Photos, Reminders, Shortcuts, and Xcode.

  Permissions do not change. SDK, CLI, and MCP method, command, and tool names do not change.

- aadc2fe: Some reference inputs now require a container. When the operation that resolves a reference finds objects only within an object of another resource, the reference has to name that parent as its container.
  - Music gets and lists tracks within a playlist.
  - Contacts gets and lists addresses, emails and phones within a person.
  - Calendar gets and lists events within a calendar.
  - Google Chrome and Microsoft Edge get and list tabs within a window.
  - Xcode gets and lists projects, schemes and run destinations within a workspace document.
  - Some apps list resources only within a parent, though each gets a single one without a parent:
    - Reminders lists reminders within a list.
    - Microsoft Edge lists bookmark items within a bookmark folder.
    - OmniGraffle lists graphics, shapes, lines and layers within a canvas.
    - Automator lists actions and variables within a workflow, and an action's settings and required resources within that action.

  The generated resource table records this for each resolving operation, as `parents: { get?, list? }` on the resource. `ResourceDescriptor.parents` (of type `ResourceParents`) in `@macts/contracts` describes it. A reference takes the parent of the operation that resolves it:
  - A single-object reference, a container and an identity-collection entry take the `get` parent.
  - A selector collection (every or range) takes the `list` parent.

  Where a parent applies, the reference's `container` must be an identity reference to it. The following reject a reference with no container, with a container naming another resource, or with a selector container:
  - encoding and decoding;
  - `bindReference`;
  - the runtime's reference check;
  - the published input JSON Schemas.

  Encoding and `bindReference` raise a `ValidationError` at `container` that names the parent. The reference data types reject the same references at compile time. A chain of parents is checked level by level. A container whose parent is name-keyed and not claimed unique (Calendar calendars, Automator workflows, Xcode workspace documents) names the parent by name, so a name others share resolves to the first match the app returns. References resolved through an operation that works at the application are unchanged.

  Behavior change: code that built such a reference without its container now fails to compile and is rejected at runtime. That covers references to a track, address, email, phone or event, and collections of reminders, tabs, graphics and the other listed resources. Add the parent's identity reference as `container`. Contacts' input JSON Schemas grow, because each container branch for an address, email or phone now spells out the person container it requires.

  The macOS provider still does not convert a reference with a container. Passing one to an operation still fails with `InternalError`, and operations still return no references to these resources.

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

- 5033b73: References to objects an app holds only inside another object now carry that object as their container, and the macOS provider reads and resolves them.

  Google Chrome and Microsoft Edge: window records include the window's `activeTab`, from `windows.get`, `windows.list` and Edge's `windows.create`. In Edge, the field keeps its type, and its value now carries its window, so it can be resolved; before, it could not be used to read the tab. It is a reference to the tab that carries the window it was read from as its container, for example `{ resource: 'Tab', id: '…', container: { resource: 'Window', id: '…' } }`. Chrome and Edge hold each tab in its window, so a tab is identified only within its window, and `activeTab.resolve()` finds the window first, then the tab in it. A window or tab id identifies it within one browser session: ids start over when the browser is relaunched, so a reference kept across a relaunch may resolve to a different tab or window, not merely fail, and an action through it, such as closing the tab, would act on that other tab. Nothing shows an id changing while the browser keeps running. The Edge behavior follows Edge's scripting dictionary and has not been verified on an installed Edge.

  `@macts/core`:
  - The macOS provider now converts and resolves a reference whose target is found within a container: it finds the container first, by the container's own targeting (a container found by its key is looked up by its key), then the target within it, by the target's. If the container is missing, the call fails with `TargetNotFoundError` whose `details.resource` names the container's resource (for example `Window`), and the target is not looked up. If the container does not hold the target, it fails with `TargetNotFoundError` naming the target's resource. A container on an object found at the app level, or a container of another resource, still fails with `InternalError`.
  - This also covers Contacts email addresses, phone numbers and addresses within their person, Music tracks within their playlist, TV playlists within their source, Calendar events within their calendar, and Xcode projects, schemes and run destinations within their workspace document, at inputs and on resolution. Each still needs its own check against the live app before it is claimed. Calendar resolution is not exact: calendars are found by name, which is not claimed unique, and an event's `uid` is not unique, so an event reference you build addresses the first match, as the existing Calendar operations that take a calendar already do. Xcode resolution is not exact either: a workspace document is found by name, which is not claimed unique, and a run destination by its name within it, so a reference you build addresses the first match.
  - An output field holding such a reference is now kept when it is read from its container's own record and the container is identified by an id, or by a name claimed unique with evidence. Of such fields, only Chrome and Edge `Window.activeTab` qualify. The others stay left out: TV browser window and playlist window `view` and a playlist's `parent`, which are read through a window or a playlist rather than the playlist's source; Xcode workspace document `activeScheme` and `activeRunDestination`, which need the workspace document identified by its path; and an Xcode target's `project`, which also needs references whose container is itself found within another.
  - `NativeCollectionAddressing` gains `within`, the resource an object is found within, and `NativeBodyOptions` gains `containerReferences`.

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

- 7aed949: A list now returns bounded pages only when the app was seen to read the list's items a page at a time. Music's playlists list failed on every call, because Music rejects that kind of read. It now returns every playlist again.

  These lists stop paging: `music.playlists.list`, `photos.mediaItems.list`, `shortcuts.shortcuts.list`, `automator.automatorActions.list`, `xcode.projects.list`, `xcode.schemes.list`, `omniplan.scenarios.list`, and the Microsoft Edge `windows`, `tabs`, `bookmarkFolders` and `bookmarkItems` lists. Each one loses its `pageSize` and `cursor` inputs: the SDK method no longer takes a page argument, the CLI command no longer takes `--page-size` or `--cursor`, and the capability listing no longer shows either input. The list returns its whole collection as one page, with no `nextCursor`. Callers that pass `pageSize` or `cursor` to one of these lists now get a validation error, so remove those inputs.

  These lists still page, because each passed the check: Contacts people, groups, email addresses, phone numbers and addresses; Notes attachments; Photos albums and folders; Reminders lists, reminders and accounts; and Shortcuts folders.

  A manifest resource records the check in a new `rangeRead` field: `supported: true` or `false`, with evidence of the app version, macOS version and time it was checked, plus the error numbers when the check failed. A list pages only when its resource's primary identifier is claimed unique and its resource records `rangeRead.supported: true`. A resource with no `rangeRead`, or with `supported: false`, has lists that return their whole collection. `RangeReadEvidenceSchema` and `ResourceRangeReadSchema` are exported from `@macts/core`.

- 686212a: The HTTP client's `list` method for items held by another item now says it lists the items of one parent, for example "List the events of one calendar.", instead of "List all events." Only the documentation changes.
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
