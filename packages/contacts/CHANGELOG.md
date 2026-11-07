# @macts/contacts

## 0.3.0

### Minor Changes

- c945d04: Breaking change: list operations return bounded pages.

  Every list output changed from an array to a page, `{ items, nextCursor? }` (`Page<T>` and `t.page(item)` in `@macts/contracts`). Lists whose items have an identifier the manifest claims unique take two optional inputs, `pageSize` and `cursor`. A page holds at most `pageSize` items: 25 by default and at most 100, the same on every transport. A page size of zero, below zero, not an integer or above 100 is rejected, never clamped. When more items remain, the page carries a `nextCursor`; send the same inputs again with it as `cursor` to read the next page. The cursor is opaque. Paging bounds the size of each call. It bounds the latency of each call only for lists whose pages are read by range, which is most of them: a list read by column costs what its whole collection costs per page (see the entry on how each list reads its pages). Paging does not make a full listing cheaper in total.

  Every other list takes neither input and returns its whole collection as one page with no `nextCursor`: a page is anchored on the identifier of the item before it, which only a unique identifier can do. Uniqueness is opt-in, from evidence: a manifest identifier records `unique: true` (or `unique: false`) with `evidence.unique` saying where the claim comes from, and the capability registry's input schemas show the paging inputs for exactly the lists that page. Contacts lists (people, groups, and a person's emails, phones and addresses) page, because Contacts describes each of those identifiers as unique. Music's playlist list pages. Its track list does not: a playlist can hold the same song more than once, and both entries are expected to share one persistent ID. Calendar event and calendar lists do not page: recurring events share a uid, and calendar names can repeat. `listOperationPages` in `@macts/core` is the one rule every surface uses, and the runtime refuses a contract whose list takes the paging inputs when the manifest says it does not page, or the reverse. Resolving a collection reference is not paged: it still returns the full array of records.

  Each surface takes the paging inputs from the contract. Generated SDK list methods take a trailing `page` argument (`list(listId, { pageSize, cursor })`) and return `Page<T>`. HTTP and MCP callers send `pageSize` and `cursor` in the input. When more items remain, MCP adds a second text block after the result, saying how many items the page holds and how to read more; the first block is always the JSON result. Generated CLI list commands take `--page-size` and `--cursor` and print how to see the next page. App parameters named `pageSize` or `cursor` on a list operation are now a generation error.

  There is a new error, `COLLECTION_CHANGED` (`CollectionChangedError`, HTTP 409, no details). It replaces `UnexpectedValueError` for a collection that changed while it was being read. The same request is correct and can be retried, from the first page if it was paged. A cursor whose item has since moved or been deleted fails this way. A malformed cursor, or one sent to another operation or with other inputs, is a validation error at `cursor`. Audit records and logs record only that a cursor was presented, never its contents.

- 686212a: Contacts and Music can now be read. Before, neither app had a list or get operation on any surface, so an agent could not list people or read a playlist.

  Contacts:
  - `people.list` and `people.get`, and `groups.list` and `groups.get`, by each record's `id`, which the app keeps with the record.
  - `emails`, `phones` and `addresses` of one person: `list(personId)` and `get(personId, id)`.
  - People and groups now include their `id`, `creationDate` and `modificationDate`. A person's `birthDate` is now a date, as the app reports it, instead of a string.
  - People no longer include `vcard` or `image`, and a person's create and update inputs no longer take `image`. The app reports both only one person at a time, so a list of a few hundred people took several seconds and carried megabytes of card and photo data.

  Music:
  - `playlists.list` and `playlists.get(persistentID)`.
  - `tracks.list(playlistId)` and `tracks.get(playlistId, persistentID)`, under a playlist. The library playlist holds every track in the library, so a track listed under any playlist can also be read under the library playlist.
  - Playlists and tracks are looked up by their persistent ID, which is the same in every playlist that holds a track. Their numeric `id`, also included, identifies a track's entry in one playlist. Tracks now include their `name`, `id`, `index` and `persistentID`; playlists, their `id`, `index` and `persistentID`.
  - A playlist's `parent` is left out: for a playlist that is in no folder, the app fails the read instead of reporting no value.

  Behavior change: a get, update or delete of an item under a parent now looks the item up the way its resource is identified, as top-level lookups already did, instead of always by `id`. In the shipped manifests only Music's `tracks.get` is affected.

  Behavior change: when a list result carries identifier aliases (operations served without a typed contract), its canonical `id` no longer overwrites a resource's own `id` field. This affects Notes accounts, folders and notes and Terminal windows and settings sets, whose list records carried their name as `id`. They now keep their real `id`, as their read types already declared. `resolveCanonicalIdentifierSource` names the field a resource's alias mirrors, if any.

- 18564b2: Contacts fields now carry observed nullability.

  A read-only probe of Contacts 14.0 on macOS 27.2 recorded which fields the app leaves empty. The probe records presence only, never a value.
  - Six fields that the app filled in every sampled item (at least 30 items) are now non-null in the generated types. They are `Email.id`, `Email.label`, `Email.value`, `Phone.id`, `Phone.label` and `Phone.value`, each typed `string` instead of `string | null`. Breaking for callers that handle `null` on these fields.
  - Fields observed empty stay nullable, and their documentation states how often they were missing. For example, `Person.birthDate` was empty in all 23 sampled people.

- c4717eb: App manifests can now record the app's own spelling of a term and mark what the app does not have, and native operations use both.
  - **Native spellings.** A resource can name its collection as the app spells it (`native.collection`), and a property its field (`native.name`). Native bodies address the app by those names and return records under the public keys. Music's AirPlay devices are reached as `airplayDevices`, and 23 fields in Google Chrome, iTerm, Mail, Music and System Events (such as `url`, `ansiBlackColor` and `macAddress`) are read under the app's spelling.
  - **Probes read the app by its own spelling.** `macts probe` and `macts probe --nullability` address collections and properties by the recorded native spellings, and report under the manifest keys. Before, Music's AirPlay devices looked empty and fields such as Chrome's `url` and iTerm's ANSI colours counted as failed reads. Neither probe reads a resource marked unsupported.
  - **Fewer round trips for get, create and update.** Each reads the item's record once. A property the app leaves out of that record, such as Finder's `entireContents`, is read on its own.
  - **Unsupported resources and commands.** A resource or command can be marked unsupported, with the evidence for it: the app's dictionary has no such class or element, or a live read failed with a recorded error. A marked resource or command gets no route, no permission, and no generated operation or type. Screen Sharing connections, Console devices, Finder desktop and trash objects, and Contacts instant messages are marked, as are Automator's `getSetting` and `getRequiredResource`.
  - **Top-level collections.** The Reminders and Automator manifests now record that reminders, and Automator's actions and variables, are collections of the application itself, as live counts confirm. No route changes.

  Breaking for callers of what is removed: the Screen Sharing connections `list` and `get` operations and the Automator `settings get` and `requiredResources get` operations, with their permissions; and the exported types and schemas for Console `Device`, Finder `DesktopObject` and `TrashObject`, Contacts `InstantMessage`, and Screen Sharing `Connection`.

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

- 90ba160: An address id from another person now gives `TargetNotFoundError` naming `Address` from `addresses.get` and from reference resolution, instead of a record.

  Contacts finds an address within its person by matching the address's `id`, rather than by the app's id lookup, which under a person who holds no address reports an address that person does not hold. Email addresses and phone numbers are found as before. The address id stays claimed unique, so `addresses.list` pages as before.

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

- ead44ad: Each list that pages reads its pages in one of two ways, chosen for its app from live measurement of both:
  - by range: each value is read for the page's items only;
  - by column: each value is read for the whole collection, then cut to the page.

  Two ways exist because apps answer them differently. Contacts reads a page's worth of people one person at a time, but reads a value for every person at once, so with 295 people a page of 25 takes about 1.6 seconds by column and about 15 seconds by range. Reminders is the opposite: with 332 reminders in a list, a page takes about 7 seconds by range and over 40 seconds by column.

  Both ways return the same page, cursor and `COLLECTION_CHANGED` error. Range is the default, because a page read by range costs what the page holds however large the collection grows. A list reads by column only when that was measured clearly faster, taking at most three quarters of the time. Contacts people, Notes attachments and Photos albums are read by column. Every other list that pages is read by range.

  A page read by column costs what the whole collection costs, so it gets slower as the collection grows.

  A manifest's `rangeRead` marker with `supported: true` now requires `read: range` or `read: column`. Its evidence also requires `cost`, what a page cost, as its own observation:
  - `observedAt`, when the page was timed;
  - `pageMs` and `columnMs`, the time of the first page read each way, in milliseconds;
  - `items`, the collection size they were measured at;
  - `runs`, how many times the page was read each way, each time being the median of those runs;
  - `pageSize`, the size of the page timed.

  All six are required, and a `rangeRead` marker with `supported: false` records no `read` and no `cost`. `read` must be `column` exactly when `columnMs` is at most 0.75 × `pageMs`, and `range` otherwise. `PAGE_READS`, the `PageRead` type, `pageReadFor`, which applies that rule, and `PageCostSchema` with its `PageCost` type are exported from `@macts/core`.

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
