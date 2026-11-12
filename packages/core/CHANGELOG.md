# @macts/core

## 0.4.0

### Minor Changes

- ae76d85: `@macts/core/testing` now exports `standInPanes`, a stand-in app of windows holding tabs that have no id, for testing apps whose tabs are selected by their position within their window. Its windows and tabs can carry extra fields, so it can stand in for an app such as iTerm.

### Patch Changes

- eb4f199: Convert Calendar's normalized color components to 16-bit RGB channels on reads and back to fractions on writes. Other apps retain their declared color representation.
- b3f160f: Complete a selected reminder by setting its completed property, using the reminder update permission. JSON errors retain their structured code and details.
- ae76d85: The generated CLI get help, and the generated HTTP client's get, update and delete, now say what the contract client already says about an object with no id: it is selected by its zero-based position within its parent, and that position drifts when objects open, close or move.
- 76d53b9: Return the scalar values declared by Mail and Contacts commands instead of discarding them. Mail `outgoingMessages.send` returns `boolean | null`; Contacts `actionProperty` and `actionTitle` return `string | null`, and `performAction` and `shouldEnableAction` return `boolean | null`.

  Generated CLI commands print a declared, available result using the existing human or JSON formatter. Values such as `false`, `0`, empty text and explicit null remain data; JSON output uses the `data` field. Commands without an effective result retain their existing success message. Result validation and nullable defaults remain shared with the SDK contract.

  Other command results and reference retrieval gaps remain separate work.
  - @macts/contracts@0.4.0

## 0.3.0

### Minor Changes

- 8edbbc2: A caller can abandon a call that is held for human approval. `seekApprovalUnlessCancelled()` in `@macts/core` waits for a decision like `seekApproval()`, but ends at once when the caller's signal aborts, aborting the provider's signal so it can retract its prompt. It returns an `ApprovalCancellation` instead of a decision, and `recordApprovalCancellation()` resolves the held call's audit trail with the new `'cancelled'` decision. The runtime uses both: an abort during a hold now fails with `OperationCancelledError` right away, records `'cancelled'` rather than an approval, and never executes the call.

  The runtime also exports `operationsFromContract()`, which checks a generated contract against its manifest without constructing a runtime. Operator logs record an unexpected failure as its name, code, message, and stack, with the caller's credential scrubbed, rather than as the raw error object.

- 361b04c: Audit permission denials as `permission-denied` records.

  A call whose key lacks the operation's permission now writes one `permission-denied` audit record, for `invoke` and `resolveReference` alike, wherever the governance context has an audit writer (the host governance always has one, its audit log). With no audit writer, nothing is written. It is written after admission, so where the runtime has a rate limiter (as the HTTP server does by default) that limit also bounds how many are written, and before input validation, so it carries only the operation's permission, the app, the key and the time: the record is the same whatever the call's input. A call turned away earlier (an unverified credential, a rate-limited call, an unknown operation or app) still writes nothing. The caller's answer is unchanged: the same `PermissionDeniedError`, with the same message, code and details. If the record cannot be written, the caller is still answered `PermissionDeniedError` and the failure is logged to the operator log with the operation, the key and the correlation id.

  In `@macts/core`, `AUDIT_DECISIONS` and `AuditDecision` gain `'permission-denied'`, so an exhaustive `switch` over decisions needs a new case. `AuditRecord`, `AuditRecordInput` and `SerializedAuditRecord` gain the `PermissionDeniedAuditRecord` kind, which has no `argsSummary`, `reason`, `approvalId` or `issueCount`; the constructor, serializer and file writer refuse one that carries any of them. `GovernedAuditDecision` excludes it: narrow to a governed decision (one that is neither `'invalid-input'` nor `'permission-denied'`) before reading `argsSummary`. A custom `AuditWriter` receives these records. Audit volume grows by one record per denied call. `recordPermissionDenied()` writes the new record.

- c945d04: Breaking change: list operations return bounded pages.

  Every list output changed from an array to a page, `{ items, nextCursor? }` (`Page<T>` and `t.page(item)` in `@macts/contracts`). Lists whose items have an identifier the manifest claims unique take two optional inputs, `pageSize` and `cursor`. A page holds at most `pageSize` items: 25 by default and at most 100, the same on every transport. A page size of zero, below zero, not an integer or above 100 is rejected, never clamped. When more items remain, the page carries a `nextCursor`; send the same inputs again with it as `cursor` to read the next page. The cursor is opaque. Paging bounds the size of each call. It bounds the latency of each call only for lists whose pages are read by range, which is most of them: a list read by column costs what its whole collection costs per page (see the entry on how each list reads its pages). Paging does not make a full listing cheaper in total.

  Every other list takes neither input and returns its whole collection as one page with no `nextCursor`: a page is anchored on the identifier of the item before it, which only a unique identifier can do. Uniqueness is opt-in, from evidence: a manifest identifier records `unique: true` (or `unique: false`) with `evidence.unique` saying where the claim comes from, and the capability registry's input schemas show the paging inputs for exactly the lists that page. Contacts lists (people, groups, and a person's emails, phones and addresses) page, because Contacts describes each of those identifiers as unique. Music's playlist list pages. Its track list does not: a playlist can hold the same song more than once, and both entries are expected to share one persistent ID. Calendar event and calendar lists do not page: recurring events share a uid, and calendar names can repeat. `listOperationPages` in `@macts/core` is the one rule every surface uses, and the runtime refuses a contract whose list takes the paging inputs when the manifest says it does not page, or the reverse. Resolving a collection reference is not paged: it still returns the full array of records.

  Each surface takes the paging inputs from the contract. Generated SDK list methods take a trailing `page` argument (`list(listId, { pageSize, cursor })`) and return `Page<T>`. HTTP and MCP callers send `pageSize` and `cursor` in the input. When more items remain, MCP adds a second text block after the result, saying how many items the page holds and how to read more; the first block is always the JSON result. Generated CLI list commands take `--page-size` and `--cursor` and print how to see the next page. App parameters named `pageSize` or `cursor` on a list operation are now a generation error.

  There is a new error, `COLLECTION_CHANGED` (`CollectionChangedError`, HTTP 409, no details). It replaces `UnexpectedValueError` for a collection that changed while it was being read. The same request is correct and can be retried, from the first page if it was paged. A cursor whose item has since moved or been deleted fails this way. A malformed cursor, or one sent to another operation or with other inputs, is a validation error at `cursor`. Audit records and logs record only that a cursor was presented, never its contents.

- c8dd396: Permissions can now name camelCase resources and operations

  The resource and operation segments of a permission are camelCase (`photos:mediaItems:list`, `iterm:app:splitVertically`) or `*`. The app segment is unchanged. Before this, 129 of the 473 route permissions failed the format and could not be granted by any key. Dashes and underscores are no longer allowed in the resource and operation segments; no shipped manifest used them. Matching is still exact and case-sensitive.

  A denied call whose key holds a grant that differs from the required permission only in letter case now gets a hint naming both and the permission to grant. `createApiKey` rejects a malformed permission with the rule and the closest valid permissions, and accepts `knownPermissions` to also reject a permission that differs from a real one only in case (`PermissionCaseMismatchError`). `macts api-key create` and `macts permissions expand` do the same against the app's manifest, from `--manifest` or the discovered manifests directory, and warn on stderr about a well-formed permission no known route requires, saying so explicitly when the manifest's permissions map lists it but no route requires it yet. `@macts/core` adds `suggestPermissions`, `listKnownPermissions`, `findCaseOnlyMismatch`, `explainInvalidPermission`, and `PERMISSION_FORMAT_DESCRIPTION`.

- 127d864: Generated app constructors now share the contract client's value codec, reference authority and HTTP transport. Typed methods return canonical Date, Integer, null and hydratable reference values, and throw canonical structured errors. Constructors, numeric argument conveniences, standalone resource clients and custom HttpClient.rpc overrides remain available.

  Root record and input types reuse their app contract definitions. Numeric create/update conveniences retain runtime validation before dispatch. Raw HttpClient.rpc, app-specific error exports and raw response schema validators remain available for explicit passthrough consumers; typed methods target contract-registered services.

  Raw and typed RPC now share protocol handling even through overrides forwarding only public arguments. Valid raw results, including null void results, and arbitrary server app-error codes/messages are preserved. Malformed JSON and missing success results now consistently throw TransportError for explicit raw calls as well as typed methods.

- a18ee4b: A command on a nested resource now names its parent in the manifest instead of having it guessed.

  A manifest command records `parent: { resource, parameter }`: the resource whose items hold the command's target, and the command's required parameter that carries the parent's identifier. The manifest schema rejects a parent resource the manifest does not declare or marks unsupported, and a parameter that is not one of the command's required parameters. Every operation takes its parent from this record. A command that records no parent addresses its resource at the application. Nothing infers a parent from a parameter's name or position any more.

  These operations now reach the right collection, where before they addressed one their app does not have:
  - Microsoft Edge: `bookmarkItems.list`, under a bookmark folder.
  - Xcode: `projects.list`, `schemes.list` and `runDestinations.list`, under a workspace document.
  - Automator: `automatorActions.list` and `variables.list`, under a workflow; `settings.list` and `requiredResources.list`, under an action.

  Xcode workspace documents and Automator workflows, which have no `id` in their apps, are now looked up by name when they are the parent.

  Calendar events, Microsoft Edge tabs, OmniGraffle graphics, shapes, lines and layers, and Reminders reminders record the parent they already used, so they behave as before. The generated SDK, CLI and tool signatures are unchanged; each app's contract manifest now carries the recorded parents.

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

- 7cb8bc4: A manifest can say that a property of a resource with a single instance is absent because of the data, not the app's structure.

  A probe tells the two kinds of absence apart only across several instances: a property some instances read is nullable, and one that every instance fails to read is `unsupported`. A singleton root with one kind has one instance, so one failed read cannot show which it is. On such a resource, curated nullability evidence can record `absentReads`: the probe's failed reads (`observedAt`, `bundleId`, `appVersion`, `osVersion`, `failedReads`, and `errorNumbers`, which must be -1728 only) and a `reason` saying why the absence depends on the data. The claim must be `nullable: true`. A read of that property failing with -1728 then returns `null`, as it does for probe evidence of absence, and the generated SDK's documentation gives the reason and the reads.

  The manifest schema rejects `absentReads` without a reason, on a command parameter, and on a resource with several instances (one reached through a collection, or a root with more than one kind), whether the resource declares the property or states a claim about one it inherits. A superclass's claim reaches its subclasses only once the superclass is valid, so a claim on a superclass with several instances is rejected even if a subclass has one. Each rejection points to probe evidence or to `unsupported` instead.

  `readsAbsentAsNull` now also takes the resource the property belongs to (`ClaimResource`). New exports: `hasSingleInstance`, `checkCuratedAbsence`, `CuratedAbsentReadsSchema` and its type.

- 9144fc3: Summarize only declared arguments in audit and approval records, validate input before governance, and record calls rejected by input validation as `invalid-input` audit entries without their arguments.

  The runtime checks a call's permission, then validates its input, and only then applies governance and approval. Validating a paged list's input includes checking any cursor against the operation and the call's other inputs, so a cursor that cannot continue the listing is rejected before governance; only an anchor that has moved is reported during execution, as `COLLECTION_CHANGED`. Audit and approval records summarize the operation's declared parameters from the validated input; any other keys are recorded only as a count, `unknownKeys: N`. A call whose input fails validation after the permission check writes one `invalid-input` audit record with its issue count, is not evaluated by policy, and is never put to an approver.

  In `@macts/core`, `AuditRecord`, `AuditRecordInput` and `SerializedAuditRecord` are now unions discriminated by `decision`: `GovernedAuditRecord` carries `argsSummary` as before, and `InvalidInputAuditRecord` carries `issueCount` and never a summary, reason or approval id. Narrow to a governed decision (one that is neither `'invalid-input'` nor `'permission-denied'`) before reading `argsSummary`. `AUDIT_DECISIONS` and `AuditDecision` gain `'invalid-input'`, so an exhaustive `switch` over decisions needs a new case, and a custom `AuditWriter` now receives records that have no `argsSummary`. `recordInvalidInput()` writes the new record.

- a189125: A get, update or delete now selects its item only by a parameter its manifest command declares.

  The item's identifier is the command's first required parameter other than its parent's (`itemIdentifierParameter` in `@macts/core`). This applies to a resource-scoped get, update or delete, and to a delete at application scope. No generated interface, CLI command or native body supplies an `id` parameter the manifest does not declare.

  Generation refuses a manifest with a command that must select an item and declares no identifier parameter. `generateConsolidatedPackages`, `generateClientPackage`, `generateServerPackage`, `generateHttpClientSdk`, `generateCliPlugin` and `generateSdk` return one error for each such command and no files, and `generateCapabilitiesModule` throws with the same errors. Each error names the app and the command key and says to declare the item's identifier as a required parameter. `unselectableItemCommands` and `itemSelectionProblem` in `@macts/core` report the same commands.

  Registration refuses the same commands. `operationsFromManifest` (`registerManifest`) now also refuses an application-scoped delete that declares no identifier parameter. `operationsFromContract` (`registerContract`) now runs the same check against the manifest, whichever operations the contract covers. Both throw `OperationRegistrationError` naming the app and the command, and register nothing from the app.

  An application-scoped get or update is a plain command call and selects no item, so the rule does not reach it. If a manifest of yours is refused, declare the item's identifier as a required parameter of the command named in the error.

  A runtime from this release refuses an installed `@macts/finder`, `@macts/google-chrome`, `@macts/iterm`, `@macts/mail`, `@macts/music` or `@macts/tv` package from an earlier release as a whole, because those packages still declare the application-level delete. Update them together with `@macts/runtime`.

- 16cda4d: Generate a transport-neutral contract for each app

  Each generated app package now exposes `@macts/<app>/contract`. It holds the app's contract (for example `notesContract`), the client interface, and the record, input, and enum types. The contract contains one descriptor per operation, with its identity, permission, and input and result value types. Resource-typed fields are references, files are file values on output and file sources on input, and resources without an identifier are referenced by selectors. The manifest is loaded lazily, and only by the Mac-side runtime.

  Each `ManifestRoute` now carries the operation's `permission`, derived once from the manifest. Generated packages declare `engines.node >=22.13.0`. The existing package entry points are unchanged.

- 2a00978: The generator no longer emits an HTTP API plugin or an MCP plugin into server packages. `@macts/core` drops `generateMcpPlugin`, `createMcpGeneratorContext`, `generateApiPlugin`, `generateAllHttpPackages` and their option and result types (`McpGeneratorContext`, `CreateMcpContextOptions`, `GeneratedMcpPlugin`, `GeneratedTool`, `GeneratedToolFile`, `ApiPluginGeneratorOptions`, `GenerateApiPluginResult`, `GenerateAllOptions`, `GenerateAllResult`). `generateServerPackage` now emits a contract-only package, and every generated contract descriptor carries `inputJsonSchema`. `JsonSchema` stays exported, now alongside the capability types that use it, and capability input schemas and MCP tool names are unchanged.

  `macts generate --target server` writes the contract-only server package.

- 2a00978: Generated packages now record the files the generator emitted, in `.macts-generated.json`, and regenerating deletes any of them it no longer emits, so removing an operation or a resource from a manifest leaves no stale files behind. Files the generator never emitted, such as a changelog or handwritten tests, are kept. A package without a record yet takes the files carrying the generator's "do not edit" notice as its previous set; this applies only to a directory holding a `package.json`, and never reaches into a nested package, so an output directory that holds other packages loses none of their files.

  `@macts/core` adds `writeGeneratedPackage`, which writes a package, prunes what it no longer emits and writes its record, along with `OWNED_OUTPUT_RECORD_FILE` and the `GeneratedPackageWriteResult` and `OwnedOutputSource` types (`record`, `headers`, or `none` for a directory that is not yet a package). `macts generate` uses it for every target and names each deleted file on stdout.

- 62a95dd: A manifest whose hierarchy names a resource it does not declare is now rejected. Every hierarchy entry's `resource`, at any depth, must be a key of `resources`; the error names the entry's path and the value. Before, a misspelt key was accepted and placed nothing, so the checks that read the hierarchy for which resources the app holds only within a container silently skipped the resource it meant. Every shipped manifest already meets the rule.
- 915effc: Manifests can describe two more ways an app finds its objects.
  - **Key targeting.** An identifier can set `targeting: byKey`: the app finds an item from the identifier's value through its collection's key form, which the app interprets (for example, a file path). Gets, lookups under a parent, parents found by key and references all use it, and a key that finds nothing fails as a missing target. A `byKey` identifier takes no `runtimeProperty`.
  - **Singleton roots.** A resource can record `roots: { <kind>: { property, evidence } }` when the app holds its objects as application properties, one per kind, instead of in a collection. Validation gives the resource a closed enum of its kinds (`<Resource>Kind`), a read-only `kind` property, and a unique primary identifier on `kind` with the new `byRoot` targeting. Its get takes a kind and fails as a missing target when that kind's property holds nothing on this Mac; its list returns one record per kind the app has, skipping the rest. A reference by kind is accepted as input and resolves. An output field holding a reference to a root is left out, with the new `root-kind-unmapped` reason, until a manifest can say which kind the field holds. A root has no create, update or delete, records no parent, and no hierarchy entry names it.

  `IdentifierTargeting` gains `'byKey'` and `'byRoot'`. `NativeAddressing` becomes a union of `NativeCollectionAddressing` (whose `lookup` gains `'byKey'`) and the new `NativeRootAddressing`. New exports: `ResourceRootSchema` and `ResourceRootsSchema`, which validate one kind's entry and a resource's whole `roots`, with their `ResourceRoot` and `ResourceRoots` types.

- ee7ba82: Manifest properties can carry nullability and resettability claims with their evidence. Generated contracts make a read field nullable unless the manifest has evidence that it is never empty, and an update field accepts `null` only when the property is resettable. Each generated field documents its nullability and the evidence for it.

  `macts probe <app> --nullability` gathers that evidence read-only from the running app. It records, per field, how often a value was missing, never the values themselves. Probe writes now keep the manifest's formatting.

  A manifest command can set `routeName`, the segment of its public route and default permission, which otherwise is the command key. Two commands that resolve to the same route are rejected when the manifest loads. The HTTP router and the runtime operation registry take each operation's permission from its resolved route.

  Breaking: Notes attachments are identified by `id` instead of `name`, which can be empty. Their route stays `notes.attachments.get`, and the permission stays `notes:attachments:get`.

- 0dd1855: A manifest resource can now say which class it inherits, and it then gets what that class declares.

  A resource whose class in the app's dictionary inherits another class records `inherits: { resource, evidence }`. `resource` is the key of the superclass in the same manifest, and the evidence is the superclass's name as the dictionary writes it. Every reader of a manifest sees the resource with what it inherits:
  - each property of its ancestors that it does not declare, nearest first, with its code, native spelling, any `unsupported` marker, and every claim the ancestor records about it (nullability and resettability, whatever their evidence);
  - the nearest ancestor's identifiers, when it declares none, with their uniqueness claims, targeting and runtime property.

  A resource replaces an inherited claim with its own evidence through `inheritedClaims.<property>`, a claims-only overlay that states a nullability claim, a resettability claim or an `unsupported` marker without redeclaring the property. Each claim the overlay states replaces the inherited one, the others stay inherited, and the resource's own subclasses inherit the result. An overlay on a resource with no superclass, on a property the resource declares itself, on a property no ancestor declares, or with no claim, is a manifest error. A property the resource declares replaces the inherited one whole. Commands, the hierarchy and collection-level fields are not inherited. A superclass the manifest does not declare, and a chain of superclasses that loops, are manifest errors. A resource's own rules hold for what it inherits: an inherited property whose type the manifest marks unsupported is an error on the resource that declares it.

  `macts probe --nullability` writes a claim about an inherited property as the resource's overlay. `writeNullabilityResults` reports each claim it had nowhere to write in `notWritten`, and the command names each one on its own line.

  `Resource` gains the optional `inherits` and `inheritedClaims` fields, described by the new `ResourceInheritsSchema` and `PropertyClaimsSchema`. `DictionaryTermEvidenceSchema` (and its `DictionaryTermEvidence` type) is the dictionary evidence that both `inherits` and native spellings record.

- 9ddbb58: Serve MCP tools derived from operation contracts, dispatched through the shared runtime

  **`@macts/mcp`** can now serve every operation registered on a `MactsRuntime` as an MCP tool, with no generated tool code. The existing plugin-based server is unchanged.
  - **`createMcpAdapter(runtime, options?)`** derives one tool per registered operation and runs each tool call as one `runtime.invoke`, so MCP calls pass through the same credential, permission, governance, and input checks as the HTTP API and the SDK. `listTools()` returns the tools; `callTool(name, args, context)` handles one call.
  - **`attachMcpAdapter(server, adapter, resolveCredential)`** registers the `tools/list` and `tools/call` handlers on an MCP SDK `Server`. The resolver locates each call's credential in the request context (the startup key for stdio, the per-request bearer for HTTP), and each request's abort signal cancels the operation.
  - **Tool names** come from the operation id: `<app>.<resource>.<operation>` is served as `macts__<app>__<resource>_<operation in snake case>`, for example `macts__calendar__app_reload_calendars`. `toolNameFor(id)` exposes the derivation. Words are split by `splitIdentifierWords`, now exported from **`@macts/core`**, the same split every generated surface uses, so an acronym and its plural stay one word (`listURLs` is `list_urls`).
  - **Input schemas** are the JSON Schema (draft 7) of each operation's wire contract, and are always object schemas. An operation whose contract cannot be represented, or two operations that derive the same tool name, make the adapter refuse to build with `McpToolDerivationError`, naming the operations involved.
  - **Results and errors** use the same shapes as the HTTP API. Success is `{ "result": <wire value> }`; a failure is `isError: true` with `{ "error": { code, message, details } }`. An unexpected failure is a generic `INTERNAL` that never repeats the underlying message, and a call to an unknown tool is an MCP `InvalidParams` protocol error.

- 261a888: An operation on an item under a parent now names the parent when the parent is missing. Getting a Calendar event in a calendar that does not exist fails with `TargetNotFoundError` whose `resource` is `Calendar`, where it was `Event`; the same holds for every list, get, create, update and delete scoped to a parent, such as a Music track in a playlist or a Contacts email address of a person. A missing item in a parent that exists still names the item's own resource.

  `NativeFailure` from the app may now carry `missingResource`, the resource the operation found missing when it is not the operation's own.

- 3885b38: Native operations now convert values through their contract inside the automation process. The native executor runs every operation with the in-process value codec, so integers, special doubles, negative zero, and dates survive the trip to and from the app. A result that violates the contract fails with `UnexpectedValueError`, and input that cannot be converted fails with `ValidationError`, each with the offending `issues`. A script that does not compile, or whose outcome cannot be read, fails with `InternalError`. `runNativeScript()` runs one native script with a codec, honoring the time limit, the abort signal, and the output limit, and resolves to the outcome the automation process reported. The executor's `NativeTransport` now runs a native script and resolves to that outcome.

  List results keep the legacy `id` alias, and the declared identifier mirrored from a working property, only when the operation's output passes through unconverted. A typed result contract receives exactly the record's declared fields. `buildNativeBody()` takes `{ identifierAliases }` to choose between the two.

  Native gets and lists read only a resource's usable properties. A property the manifest marks unsupported is never read, so it no longer costs a failed round trip per item.

- 7ac69f1: Add the native macOS executor. `createNativeExecutor()` implements the executor seam: it runs manifest-defined operations against the target app and reports failures as the canonical structured errors, so a missing target, an app that is not installed or not responding, missing automation permission, and a timeout are each distinguishable. A missing target, or a missing parent of a scoped operation, fails as a missing target before anything is read, changed, or deleted. Host failures (an automation host that cannot start, a process killed from outside, oversized output) are internal errors, never blamed on the app. `buildNativeBody()` produces the script body for one operation; input values are read at run time and never written into script text.

  The automation transport now reports every process failure as a `JxaExecutionError` with a `kind`: `timed-out`, `cancelled`, `output-too-large`, `not-started`, `signalled`, `exited`, or `unreadable-output`. `timedOut` is true only when the transport's own time limit stopped the process. `runJxa()` accepts an abort `signal`, which stops the process, and `maxOutputBytes`. Output is read up to `MAX_OUTPUT_BYTES` (64 MiB) per stream, up from 1 MiB, so large list results no longer fail.

- f9d86f8: The macOS provider now converts references at operation inputs and outputs. Contacts `actionTitle`, `performAction` and `shouldEnableAction`, whose `for` takes a single person reference, no longer fail: they accept the reference and pass that person to the app. `actionTitle` still resolves to `undefined` rather than the title, because no manifest records command results yet (#233).

  A reference converts when it is a single identity reference with no container, to a resource the app finds at the application by its identifier, or with its container, to a resource found within one (see the container reference changeset). An input reference becomes the app's object, found as the resource's `get` finds it. If no object has that identifier, the call fails with `TargetNotFoundError` with `details.resource` set to the referenced resource, before any command is sent, for example: Contacts has no Person matching the reference at `for`. An app object at an output position becomes an identity reference with no container. The output positions that convert, on records an operation returns, are Photos album and folder `parent`. Microsoft Edge and Google Chrome window `activeTab` convert to a reference that carries its window (see the container reference changeset). Xcode workspace document `activeScheme`, `activeRunDestination` and `lastSchemeActionResult`, and run destination `device` and `companionDevice`, are left out of output for now, as is every other output field whose reference macts cannot yet return in a resolvable form (see the output reference changeset; #219).

  At an operation position, every other reference still fails with `InternalError`: selectors; identity collections, including one whose entries carry a container; references to a resource with no identifier, no `get`, or no entry in the contract's resource table; a reference with a container to a resource the app finds at the application, or with a container of another resource; and a reference without its container to a resource the app finds only within one. The message for a reference changed to: The Contacts operation "performAction" takes a reference at `for` that the macOS provider cannot convert yet.

  Breaking change for executor implementers: `ExecutionRequest` and `ResolutionRequest` have a new required field, `resourcePlans`, a `ResourcePlanTable` (in `@macts/contracts`) with each resource's identifier plan. `resourcePlanTable(resources)` derives it from an app contract, and `EMPTY_RESOURCE_PLAN_TABLE` is the table for a caller without a contract. The runtime fills it from the registered contract on every request. `registerContract` now refuses, with `OperationRegistrationError`, a contract whose resource is missing from the manifest or whose identifier type differs from the manifest's primary identifier type.

  Nothing reaches the app before the whole input converted: a value that cannot convert, such as a file, a file source, a reference form the provider cannot convert yet, or an invalid value, fails before any event is sent, wherever it sits in the input. Referenced objects are found, and their existence checked, only after that. A call to an app that is not installed fails with `AppUnavailableError` (`not-installed`) whatever its input holds.

  The native codec's functions take a third argument, `{ app, references }`, and a native script carries its `references` table. `@macts/core/testing` is a new internal entry for macts' own tests; it is not public API and not covered by semantic versioning.

- ed3bf17: The macOS provider now resolves references. A single identity reference with no container, to a resource the app finds by its identifier alone, resolves to that object's record, the same record the resource's `get` returns. An identity collection of such references resolves to one record per entry, in entry order, and to `[]` when it has no entries, without starting an automation process; permission, governance, approval and audit still apply to it. With the local SDK, `resolve()` on such a reference, for example a Contacts person or a Reminders list, now returns the record instead of failing.

  The object is found the same way an operation finds a reference it takes as input. A missing object fails with `TargetNotFoundError` with `details.resource` set to the referenced resource, for example: Contacts has no Person matching the reference. In an identity collection, `details.entryIndex` is the position of the first missing entry, and nothing is read. A record that does not match the resource's record type fails with `UnexpectedValueError`.

  Other forms still fail with `InternalError`, before anything is sent to the app: selectors, references and identity-collection entries with a container, and references to a resource that has no identifier, is found only within a container, or has no entry in the contract's resource table. The message names the form, for example: The macOS provider cannot resolve a selector reference to the Contacts resource "Person" yet.

  `@macts/core/testing`, the internal entry for macts' own tests, adds `standInTransport` and `nativeReadKeys`. It is not public API and not covered by semantic versioning.

- c4717eb: App manifests can now record the app's own spelling of a term and mark what the app does not have, and native operations use both.
  - **Native spellings.** A resource can name its collection as the app spells it (`native.collection`), and a property its field (`native.name`). Native bodies address the app by those names and return records under the public keys. Music's AirPlay devices are reached as `airplayDevices`, and 23 fields in Google Chrome, iTerm, Mail, Music and System Events (such as `url`, `ansiBlackColor` and `macAddress`) are read under the app's spelling.
  - **Probes read the app by its own spelling.** `macts probe` and `macts probe --nullability` address collections and properties by the recorded native spellings, and report under the manifest keys. Before, Music's AirPlay devices looked empty and fields such as Chrome's `url` and iTerm's ANSI colours counted as failed reads. Neither probe reads a resource marked unsupported.
  - **Fewer round trips for get, create and update.** Each reads the item's record once. A property the app leaves out of that record, such as Finder's `entireContents`, is read on its own.
  - **Unsupported resources and commands.** A resource or command can be marked unsupported, with the evidence for it: the app's dictionary has no such class or element, or a live read failed with a recorded error. A marked resource or command gets no route, no permission, and no generated operation or type. Screen Sharing connections, Console devices, Finder desktop and trash objects, and Contacts instant messages are marked, as are Automator's `getSetting` and `getRequiredResource`.
  - **Top-level collections.** The Reminders and Automator manifests now record that reminders, and Automator's actions and variables, are collections of the application itself, as live counts confirm. No route changes.

  Breaking for callers of what is removed: the Screen Sharing connections `list` and `get` operations and the Automator `settings get` and `requiredResources get` operations, with their permissions; and the exported types and schemas for Console `Device`, Finder `DesktopObject` and `TrashObject`, Contacts `InstantMessage`, and Screen Sharing `Connection`.

- 862bf2d: Add the in-process native value codec, `NATIVE_CODEC`

  `NATIVE_CODEC.prelude` converts wire values to native values for operation arguments, and native results to wire values, inside the automation process and before results are serialized. Integers become canonical decimal text within the safe-integer range. Doubles keep their classification, including `NaN`, the infinities, and `-0`. Dates carry exact milliseconds. Points, rectangles, and 16-bit RGB colors wrap each numeric member. Closed enums reject unknown members with an actionable message. Records follow the presence rules: a missing value is `null` only where the field is nullable, and is omitted at an optional field. Numbers in dynamic content are always doubles, and user records there are enveloped so they cannot be mistaken for control records. A value that violates its plan fails with a structured codec error that carries the direction and the path. Reference and file values have no conversion in this codec and fail with a codec error that says so. Absence is never turned into `null`: `undefined` is accepted only at an optional record field, where it is omitted.

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

- 8c4faef: App permission groups now list only permissions that some operation requires.

  The permission groups in 14 app manifests listed 122 permissions that no operation required, such as `microsoft-edge:tabs:update` (Edge has no tab update operation) and `calendar:calendars:delete`. Granting one authorized nothing. They are removed from the permission groups that discovery and the generated packages publish, and a test over every shipped manifest keeps them from coming back. An operation's permission returns to its group together with the operation's command.

  Grants of the removed permissions authorized nothing before and still authorize nothing. `macts api-key create` still accepts one, with or without `--manifest`, and warns on stderr that no route requires it, appending `Closest: "…"` when a permission a route requires is close. For example, `omniplan:tasks:update` names `omniplan:tasks:create`. Before, with `--manifest` it failed with `Resource "…" not found in permissions mapping` or `Operation "…" not found`. Without `--manifest`, a `create` or `delete` permission was accepted silently.

  `createApiKey` in `@macts/runtime` grants a well-formed fine-grained permission that the permissions map does not list as written, and still expands coarse and wildcard permissions through the map. `expandPermissions` and `expandCoarsePermission` in `@macts/core` take a new option, `{ unmapped: 'keep' | 'reject' }`, which `createApiKey` sets to `keep`. The default stays `reject`, so `macts permissions expand` still fails for such a permission.

- 1cfc8fd: A manifest can now declare a positional resource: one whose objects have no identifier and are found only by their zero-based position within their parent. The resource records `positional: { evidence }`, with curated evidence (`source: curated`, a `note`, `observedAt` and `appVersion`). Nothing is inferred from a missing identifier.

  The manifest schema, every generator and both operation registrations refuse the marker on a resource that has a primary identifier, has no get, has a get that records no parent, has a parent the app does not find by its identifier, or has a command that selects one of its items by anything but a non-null `integer` parameter. `@macts/core` exports the rule as `positionalProblems()`, and `isPositional()`.

  For a positional resource:
  - Its native get, update and delete find the item at the given zero-based position within its parent, after checking that the parent holds that many. A position past the end is `InvalidSelectionError`; a missing parent is `TargetNotFoundError` naming the parent.
  - An output field holding one, read through its parent's own record, is emitted as an index selector within that parent: `{form: 'selector', cardinality: 'one', selector: {by: 'index', index}, container}`. The index is the position the app itself reports for the object within that parent, never a dictionary `index` property; an object whose position the app does not report fails as `InternalError`. A command result holding one stays out of output.
  - The native executor resolves, and converts at input positions, an index selector to it within its parent's identity container, with the same errors.
  - Generated docs say the object has no id, is selected by its zero-based position, and that the position drifts when objects open, close or move.

  In `@macts/contracts`, `IndexSelectorReference<T, R>` is a `SelectorReference` whose selector is an index and whose container is an identity reference; it is assignable to `ObjectReference`. `t.indexSelectorReference(scope, resource)` is its value type: its wire schema, and so the runtime's output check, admits only that form. A reference plan gains an optional `form: 'index'`, which records the form the native codec emits.

  In `@macts/core`, `NativeAddressing` gains `NativePositionalAddressing` (`lookup: 'byIndex'`), `NativeCodecEnvironment` gains an optional `positionOf`, and a codec failure can carry `outOfRangeResource`. An exhaustive `switch` over `NativeAddressing['lookup']` needs a new case.

- e319917: Generated SDKs no longer expose properties that the app cannot provide at runtime.
  - A manifest property can now carry an evidence-backed `unsupported` marker. Every generated surface (contract, SDK, CLI, MCP tools, HTTP routes) omits a marked property.
  - `macts probe --nullability` reports a defect when every read of a property fails. It also reports a defect when the observed value kind (date, number, boolean, string, record, list, reference) contradicts the declared type, and suggests the marker where it fits.
  - Nested resources are now sampled from evenly spaced parents within a bounded scan, so deep collections such as calendar event alarms yield items instead of hitting the time limit. The probe record gains `parentsScanned`.
  - **Breaking SDK field changes:**
    - Finder: `Container.expandable`, `expanded`, `completelyExpanded`, `containerWindow` removed. `ApplicationFile.suggestedSize`, `minimumSize`, `preferredSize`, `opensInClassic` removed. `DocumentFile.id` removed. `Package.id` is now a string.
    - Calendar: `Calendar.calendarIdentifier` removed. Calendars are targeted by name. `Event.stampDate` is now nullable, because a wider sample found events without it.
    - Notes: `Folder.container` removed.
    - Reminders: `allDayDueDate` is renamed `alldayDueDate` and is nullable. `List.color` is now a string.

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

- 3463be6: Manifests can describe an app that reports an absent value by failing the read.

  Probe nullability evidence can record `errorNumbers`. When some reads failed, every failed read raised "no such object" (-1728), and at least one read succeeded, the evidence supports `nullable: true`, and a read of that property failing that way returns `null` after the item itself is found, in a get, a resolved reference, a create or update's read-back, and a list's item-by-item reads (an update checks the item exists before its writes, and a create just made the item). The generated SDK's documentation for such a property says the app reported no value in some reads. Evidence whose every read failed describes structural absence, which is `unsupported`, not nullable. The same failure of any other property, and any other failure, still fails.

  New exports: `ABSENT_VALUE_ERROR_NUMBER` (-1728); `reportsAbsence`, which says whether nullability evidence records only that failure; and `readsAbsentAsNull`, which says whether a property reads that failure as `null`, and the `NullabilityClaim` type it takes.

- e6214e2: A resource command now sends the app the item you name. Commands such as `show`, `build`, `send` or `save` are now sent their item as the command's direct parameter.

  Each of these commands acts on one item, and the app's command takes that item as its direct parameter. The generated native body used to call the command on the application with only its declared parameters, so the app never received the item. Depending on the app, the call failed or acted on an item the app picked, such as the front document.

  The body now selects the item exactly as a get does, through the same lookup, under the parent the command records, by the resource's identifier targeting. A missing parent or item fails with `TargetNotFoundError` naming its resource, before the command is sent. The item is then sent as the direct parameter. Only the command's other declared parameters are sent as named parameters; the item's and the parent's identifiers never are.

  The rule that selects an item now covers every resource-scoped command except a list or create. The item's identifier is the command's first required parameter other than its parent's. The generated contract client, HTTP client and CLI take a resource command's inputs in the same order as a get's: the parent's identifier, then the item's, then the command's other parameters. The generated CLI command now asks only for those inputs, as follows:
  - a flag for the parent, when the command records one;
  - one positional for the item, labelled with the identifier a get takes;
  - a flag for each other parameter.

  It no longer asks for a positional it never used, for parent flags taken from the resource's place in the hierarchy, or for the identifier a second time as a flag. When the resource, or the parent the command records, is matched on a name that is not claimed unique, the generated docs and CLI help say the first match is used, as a get's do.

  A few shipped commands cannot select their item yet, because their resource has no identifier or get, or because their item lies more than one parent deep and a command records only one parent: OmniPlan `fix`, Music and TV `refresh`, System Events `click`, `perform` and `select`, and Mail `forward`, `redirect` and `reply`. `@macts/core` lists them in `KNOWN_ITEM_SELECTION_GAPS`, each with what it still needs. They stay available and behave as before, with the same inputs on every surface, CLI included, and their generated docs and CLI help say so: "macts does not yet send the <item> to the app, so the app acts on whatever it chooses." Generation and registration refuse any other command that cannot select its item.

  Generation and registration now refuse a resource command that declares no identifier parameter, as they already refused such a get, update or delete. Each refusal names the app and the command key and says to declare the item's identifier as a required parameter. If a manifest of yours is refused, declare it, together with the command's `parent` where the resource's get records one.

  Update the app packages together with `@macts/runtime` and `@macts/core`. A runtime from this release refuses an earlier Calendar, Mail, Microsoft Word, Reminders or System Settings package. It runs an earlier Music or TV playlist `move` or `search` against the playlist named by its `to` or `for` value, and an earlier Microsoft Edge tab command against the application, which has no tabs, so those fail.

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

- fb9a0a1: The runtime resolves references. `MactsRuntime.resolveReference(app, reference, context)` takes a reference in wire form (the `{"reference": …}` control record) and resolves it as a call of the referenced resource's `get` operation (a single reference) or `list` operation (a collection reference). It needs that operation's permission, is governed, approved, and audited exactly like a direct call of it, validates the reference against the app contract's resource table, and validates the result against the operation's output contract. A container's permission is not required, because containers only locate the target. A reference to a resource absent from the contract's resource table fails with `ValidationError` ("The reference names no resource of the app."), and so does one whose resource has no such operation, with an issue at the reference's `resource` naming the missing operation. `InvalidSelectionError` is for an index or range the collection cannot satisfy. An app now has at most one registered contract, and `registerContract` refuses a second contract for the same app. `registerContract` also refuses a contract whose resource table records a `get` or `list` operation that is not one of its operations targeting that resource. For an identity collection, the result must hold exactly one record per entry, so an entry is never silently dropped.

  The `Executor` interface in `@macts/core` gains a required `resolve(request: ResolutionRequest)` method, which resolves a validated reference into the record or records it denotes. Custom executors must implement it. To migrate, add a `resolve` method; one that does not support references can return a rejected promise with `InternalError`, as the native macOS executor does.

  `TargetNotFoundError` details in `@macts/contracts` can carry `entryIndex`, the zero-based position of the identity-collection entry whose target no longer exists.

  `@macts/cli`: the host's built-in test executor implements the new `resolve` method.

- f717527: Add the shared contracts for local and remote SDK clients

  **`@macts/contracts`** is a new platform-neutral package. It holds the contracts that both clients, the runtime, the adapters, and generated app packages share:
  - **Values** — the `Integer` brand and its safe-integer domain (`INTEGER_LIMITS`), `Point`, `Rectangle`, 16-bit `Rgb`, and the wire control records. Integers travel as decimal text (`{"integer":"42"}`); doubles, including `NaN`, the infinities, and `-0`, travel as `{"double":…}`. The package also defines the serializable `ValuePlan` (including `PASSTHROUGH_PLAN` for values that carry no wire encoding), the `WireRecord` input shape, and the `ValueType` contract that ties an SDK schema, a wire schema, and a native plan together.
  - **References** — identity versus selector and single versus collection as independent axes, plus materialized `ReferenceList`s, each with precise `resolve()` result types.
  - **Files** — `FileValue` and the transfer handles, which are distinct per locality: `TemporaryFileCopy`, `SignedDownload`, `CallerOwnedFile`, `UploadedFile`, and `UploadTarget`.
  - **Invocation** — `Credential`, `InvocationContext`, and the token-derived `Authority`.
  - **Errors** — the canonical structured error classes (`ValidationError`, `TargetNotFoundError`, `PermissionDeniedError`, `PolicyDeniedError`, and the rest), their typed `details`, the `WireError` envelope, and the `ERROR_CLASSES` registry used to reconstruct the same class from the wire.
  - **Operations** — `OperationDescriptor`, `AppContract`, `ClientRuntime`, `ClientFactory`, and the `CallOptions` that invocation, reference resolution, and file fetching share.
  - **Exhaustiveness** — `UnreachableError`, whose constructor accepts only `never`, so an unhandled member of a closed union becomes a compile error.

  **`@macts/core`** adds two interfaces:
  - **The executor seam** — `Executor` and `ExecutionRequest`, the provider-neutral interface through which an authorized, validated operation is handed to a provider.
  - **The in-process native codec contract** — `NativeCodec`, `NativeScript`, `NativeFailure`, and `NativeOutcome`, plus the `NATIVE_*` names. It defines how wire values are converted to and from native values inside the automation process, before results are serialized.

  These are interfaces and error classes only; no existing behavior changes.

- a746285: `bindReference` now accepts only resource keys a reference can resolve through, and generated contracts expose their resource table's type.

  Each generated contract exports the type of its resource table as `<App>Resources` (for example `NotesResources`), and the contract is typed `AppContract<<App>Client, <App>Resources>`. The type declares one entry per resource: each builds on `ResourceDescriptor<Record, Id>` and requires the identifier and the literal `get` and `list` operation ids the resource has. The table value is checked against it with `satisfies`, so the type and the value describe one table. `AppContract` takes the table type as an optional second type argument, so `AppContract<Client>` still means a contract whose table keys are not known. Both `createClient` factories return `Client & ClientBrand<Resources>`, and each generated client interface extends `ClientBrand<<App>Resources>` (for example `interface NotesClient extends ClientBrand<NotesResources>`), so the client's type carries the contract's table, including a variable or parameter annotated `NotesClient`. The brand exists only in the type; a client has no added property under any key, and its members are still exactly the app's operations.

  A generated resource table now lists only the resources that have a `get` or a `list` operation. No reference to any other resource can be resolved, in any form or position, so encoding and decoding already rejected them; they now fail as references to a resource the app cannot resolve references through. Their record interfaces are still exported.

  `MactsRuntime.resolveReference` (and so the `/references/v1` route) rejects both kinds of unresolvable target with `ValidationError` (`VALIDATION_FAILED`, 400), with an issue at the reference's `resource`. A reference to a resource absent from the contract's table fails with "The reference names no resource of the app.", the issue saying the app has no such resource. A reference to a resource in the table that has no `get` (for a single reference) or no `list` (for a collection) fails with an issue naming that missing operation. `InvalidSelectionError` is reserved for an index or range the collection cannot satisfy.

  `bindReference(client, data)` reads the table from the client's type. Data type-checks only when every level names a key that records the operation it resolves through: `get` for a single-object reference, a container, and an identity-collection entry, and `list` for a collection. An identity reference needs a resource with an identifier, of the identifier's type. The result is the bound variant for the data's resource, form and cardinality, with the resource's record and identifier types, so `resolve()` returns `Promise<Record>` or `Promise<readonly Record[]>` instead of `unknown`. Where the position takes any container, a container that is itself a reference a client decoded is accepted as it is. At a parent-scoped position, only an identity reference to the parent is accepted. Clients of a contract with no declared table type accept any reference data, as before. `bindReference` behaves as before at runtime. `@macts/contracts` exports the types involved: `ResourceTable`, `ClientBrand`, `ResolvableResourceKey`, `ResolvableReferenceData` (and its object and collection halves), `ResolvableContainment`, `ResourceRecordOf`, `ResourceIdOf`, and `BoundReferenceOf`.

  Generated HTTP clients' list methods return `Page<T>` from `@macts/contracts` instead of an inline `{ items, nextCursor? }` shape, so their items are read-only arrays.

- 62a95dd: Code generation leaves out an output field when its reference is to a resource the manifest's hierarchy holds only within another resource, never at the application, while that resource's get names no container. Such a reference could not be resolved, because the get would look in a list the app does not have. Generation warns about each one, saying that the app holds the resource only within a container and that macts's get for it does not name that container yet. If the hierarchy does not place the resource anywhere, this rule does not apply. No shipped manifest has such a field after this change.

### Patch Changes

- 7cb8bc4: A property whose evidence makes the app's "no such object" failure (-1728) its empty value now reads as `null` when the app reports its object missing only as the object is read for the reference, not only when the property read itself fails. This holds wherever the value came from: an item's property record, a column read across a list, or a read on its own. Before, a get or a list could fail as if the item itself were missing. Such a property is also always read on its own in a get, never taken from the item's property record, because its evidence is of what that read reports.

  Only the read of the field's own object counts. The same failure while reading the identity of the item the field was read through still fails.

  The body marks such a value for the codec with a registry symbol, which no app record or JSON value can carry, so app data is never taken for the marker. The codec honours the marker only as a record field's value, where bodies put it; anywhere else it fails by its plan, under an `unknown` plan too, rather than encoding as an empty record. A value handed over with the record it was read through (a reference whose resource is found within a container) is marked the same way, so an app record with a key of the old marker's name is ordinary data. A body marks values only for a result encoded by a typed plan: `NativeBodyOptions.absentValueMarkers` (default `true`) turns marking off, and the native executor turns it off under a passthrough plan, whose result the codec returns unchanged.

- 7cb8bc4: When the app fails a read inside a list or a get, the error's cause now says what was being read: a property by its manifest name, with its position in the result (`while reading the property "holder" at [2]`), or the items themselves. It names properties and positions only, never a value the app returned. The error's class and message are unchanged.
- 89168af: Pass the script to the automation process without a shell. Script text, and every value embedded in it, now reaches the process byte for byte, so values containing quotes, backslashes, or newlines arrive unchanged. Bundle identifiers, element names, selector values, and property keys are embedded in generated scripts as literals. A process that exits before reading a large script now rejects the call instead of crashing the host process.
- e569256: List operations now read each property once across the collection instead of once per item. List operations in apps where each request is slow, such as Reminders, now finish much faster: a Reminders list that took over four minutes now takes seconds. Records are assembled by position. After reading the properties, a list reads the identifiers once more and checks that no item was added, removed or moved meanwhile; if the collection changed, it reads again from the start rather than returning records that pair values from different items. A resource with no identifier is counted again instead, which catches items added or removed but not items that swap places. A property the app cannot read across the collection is still read item by item, so it is never dropped. A list whose app quits, stops answering, is cancelled or loses its automation authorization partway through fails, rather than returning records that lack a field. Events in one calendar that share an identifier now each report their own details; before, each one repeated the first event's.

  Behavior change: Script Editor's document list now reads `contents` across the collection, like every other property, instead of taking it from each document's property record. A document whose record left `contents` out now includes it.

- c5a4690: Discovery reports the permission every operation requires. A capability's permission was reported only when the manifest declared one, so most capabilities showed no permission although the server enforces one for every operation. Each capability, in the capability registry, in discovery and CLI search output, and in every generated `capabilities.ts`, now reports the permission the server enforces for its route: the declared one, else the one derived from the route, such as `notes:attachments:get`.
- 7429951: An identifier other than the class's dictionary id must now declare how it is looked up.

  An identifier with no `targeting` is looked up with the app's id specifier (`byId`). That finds an item only by the class's dictionary id, the property the app's scripting dictionary declares with code `ID  `, whatever the property is named. Calendar's event `uid` carries that code and keeps the default. Any other identifier, such as a document's `name`, must declare its targeting, whether or not the class also has an `id`: usually `byProperty` or `byKey`. An explicit `byId` is accepted as the manifest's own claim that the app's id specifier finds the item by that property. A property with no code never qualifies. The rule judges the resource's primary identifier with what it inherits from its superclasses.

  Generation refuses a manifest with such an identifier. `generateConsolidatedPackages`, `generateClientPackage`, `generateServerPackage`, `generateHttpClientSdk`, `generateCliPlugin` and `generateSdk` return one error for each such resource and no files, and `generateCapabilitiesModule` throws with the same errors. Each error names the app, the resource and the identifier property, and says to declare its targeting. `untargetedIdentifiers` and `identifierTargetingProblem` in `@macts/core` report the same resources.

  Registration refuses the same manifests. `operationsFromManifest` (`registerManifest`) and `operationsFromContract` (`registerContract`) throw `OperationRegistrationError` naming the app, the resource and the property, and register nothing from the app.

  If a manifest of yours is refused, add `targeting: byProperty` to the identifier the error names, to match items on that property, or `targeting: byKey` if the app looks items up by that value as a key.

- 7429951: Generated docs now say which item a get, update or delete acts on when several items share the value it looks the item up by.

  When a resource is matched on a property (`byProperty`) that is not claimed unique, the generated HTTP client's get, update and delete docs, the contract client's, and the CLI get's help add one sentence: when several items share the value, the first match in the app's order is used, and the operation does not fail as ambiguous. Nothing is added for a value claimed unique, or for a resource looked up by the app's id or key specifier.

  This adds the sentence to Calendar calendars and Music tracks. It also reaches Automator workflows, Xcode workspace documents and run destinations, and the documents, layers, Notes items and Terminal windows, settings sets and tabs that are now matched by name or tty. No operation, input or capability changes.

  `ResourceDescriptor.id` now says that an identity reference to a resource matched on a property resolves to the first match in the app's order when several objects share the value, and that a key is interpreted by the app.

- e0d2969: Generated app packages now include a `.gitattributes` that marks the files the generator owns there as `linguist-generated`: the whole `src/` tree, the build, TypeScript and API Extractor configuration, `LICENSE`, `.gitignore`, the `.macts-generated.json` record and the `.gitattributes` itself. Because they are marked `linguist-generated`, GitHub collapses these files in pull-request diffs and leaves them out of the repository's language statistics, so a change that regenerates packages shows its generated code as generated, and review-size checks that honour the attribute stop counting it as hand-written. `package.json` is left unmarked, because its version and dependency changes are meant to be reviewed. The file is listed in each package's `.macts-generated.json` like any other generated file, and it is not published: the packages' `files` field still includes only `dist`.
- 80fad3c: The generated HTTP client and CLI now send integer ids and integer list parameters in the contract's wire form, so `get` by an integer id works through them.

  A get keyed by an integer id, such as OmniPlan's tasks, resources and milestones or TV's browser and playlist windows, sent the id as the text it was given, and the operation's input rejected it. The client's `get` now takes the id as a number or as text and sends `{ integer: "<digits>" }`. A list's required integer parameter is sent the same way, and the CLI's `list` converts the flag's text to a number. So are a delete's and an update's integer ids and every integer parameter of a command, such as Automator `add`'s `atIndex`, Word `insertText`'s `at` and `createRange`'s `start` and `end`, QuickTime Player's step `by`, System Events' `usingActionNumber` and Xcode `attach`'s `toProcessIdentifier`. An optional integer that is omitted is not sent.

  Required integer list flags and page-size flags validate their original text before exact conversion to the numeric SDK input, so fractional boundary values and noncanonical spellings cannot change the selected scope.

  Malformed, fractional, non-finite, and out-of-range integer inputs now fail locally with `ValidationError` before any HTTP request. Text identifiers must use canonical decimal spelling; numeric negative zero is sent as zero. The safe-integer bounds and validation policy come from the shared operation value contract.

  Standalone CLI plugin manifests also declare the shared contract runtime directly, so integer validation resolves under isolated dependency installation.

  Refs #207

- eb51c54: Native operations on multi-word collections now reach the app. Bodies used to address a collection by its plural lowercased (`app["mediaitems"]`), which no app resolves. They now use the app's own spelling of the dictionary term: the first word lowercased whole, each later word capitalized (`mediaItems`, `urlTracks`). That covers the collection itself, the parent a nested resource is reached through, and a parent derived from a parameter name.
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

- bd34a91: Generated docs now say which parent an operation uses when several parents share the value it looks the parent up by.

  A list, get, create, update or delete under a parent looks the parent up by the parent's own identifier. When that identifier is matched on a property (`byProperty`) that is not claimed unique, these docs add one sentence:
  - the generated HTTP client's docs for those operations;
  - the contract client's docs for them;
  - the CLI's list, get and create help.

  For example: "When several calendars share the same name, the first match in the app's order is used as the calendar." When the item is matched the same way, this sentence comes after the item's own first-match sentence.

  Nothing is added for a parent claimed unique, for a parent looked up by the app's id or key specifier, or for an operation with no parent.

  This adds the sentence to:
  - Calendar events, under a calendar;
  - Automator actions and variables, under a workflow;
  - Xcode projects, schemes and run destinations, under a workspace document.

  No operation, input or capability changes.

- 99a59fa: An index selector reference must now carry a container chain of identity references only, each the parent its resource is found within, ending at one the app finds at the application. A container above that, or a selector anywhere in the chain, is rejected.

  A positional resource must now sit under a parent the app finds at the application by its identifier, and every command that selects one of its items must record that parent, as its get does, and declare its integer item parameter. No command with an executable route may record a positional resource as its parent. A manifest that does otherwise is refused by the manifest schema, by generation and by registration.

  For every positional CRUD route, usable hierarchy placement constrains where the command can address its collection. A nested-only collection requires a recorded parent, and any recorded parent must be a declared holder. Application-wide list/create and resources with no usable placement retain their existing scope behavior. Every recorded parent must be an ordinary identified collection resource with a usable unparented get, must not be known nested-only, and must have its required identity parameter supplied. A top-level collection does not waive an explicitly recorded ancestor requirement. Unsupported commands and resource targets contribute no executable route.

  The native codec now converts a reference's container only as an identity reference: an input reference whose container chain holds a selector fails as `InternalError` before the app is touched. In `@macts/core`, `NativeCodecEnvironment.positionOf` now takes the collection the position is counted in, and reads a position only from a specifier that ends at that collection of a container below the application.

- d393e28: API keys with no stored record are now refused, so deleting a key removes its access immediately in the process that deleted it, and within a few seconds elsewhere. Validation reports such a key with the new `UNKNOWN_KEY` error code; the HTTP and MCP surfaces answer it like any other key that cannot be verified (`UNAUTHENTICATED`, reason `invalid`, HTTP 401 with `WWW-Authenticate: Bearer`). The new `getKeyRecordStatus` returns `'active'`, `'revoked'`, or `'missing'` (`KeyRecordStatus`); `isKeyRevoked` keeps its meaning (a stored record marked revoked) and is deprecated in its favour.
- b49af54: A call whose input or result holds a value of a kind the macOS provider cannot convert yet (a reference, a file, or a file source) now fails with an internal error that names the operation, the kind and the position, instead of an input error that blamed the caller, or an unexpected-value error that blamed the app. For example, the Contacts rollover actions, which take a person, now report that the macOS provider does not support reference values yet. A call with such an input still fails before the app is contacted.
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

### Minor Changes

- 1d1e53a: Let an API key carry its own governance policy, composed with the host policy so it can only tighten

  An API key can now carry a governance policy document of its own (the same `PolicySchema` shape as the host policy). A narrowly-scoped key — one issued to a single agent, say — can be held to a stricter bar than the machine-wide default without editing the host policy file. The invariant is structural: **a key policy can only ever tighten, and can never grant what the host policy withholds.**

  **`@macts/core` — layered composition:**
  - `evaluateLayeredPolicy({ hostPolicy, keyPolicy?, permission, risk })` evaluates each layer independently through the existing evaluator and returns the stricter result as a `LayeredPolicyEvaluation` — a `PolicyEvaluation` plus `layer` (`'host'` | `'key'`), each layer's own evaluation, and the composed restrictions.
  - Composition happens at the **decision** level, after risk class is applied, where the tightening lattice is a true total order: `denied` > `confirm-first` > `allowed`. A deny at either layer denies and is never escalated into an approval request; a `confirm-first` at either layer holds the call rather than letting it through silently; `allowed` requires both layers to allow. Composing declared _dispositions_ instead would be unsound — `read-only` and `confirm-first` swap strictness with the operation's risk class, so a `confirm-first` key policy would turn a host `read-only` denial of a mutating call into an approvable hold. `compareDispositionStrictness` still ships as a declarative ordering for policy authoring and inspection, documented as not being the composition rule.
  - `composeRestrictions` composes path/URL restrictions as **union of denies, intersection of allows**. Allow lists stay as one conjunctive group per constraining layer (a candidate must satisfy every group), because flattening two allow lists over opaque patterns into one list would widen them. `composedRestrictionsPermit` evaluates a candidate against the composed set using a caller-supplied pattern matcher.
  - `enforceCall` accepts an optional `keyPolicy` and returns the layered evaluation, so every enforcement decision reports which layer governed it. With no key policy the evaluation — decision, matched rule, and reason string alike — is the host policy's own, unchanged.

  **`@macts/api` — per-request resolution:**
  - An API key's policy is stored alongside its metadata in the key store, keyed by key id, encrypted at rest: `setKeyPolicy`, `getKeyPolicy`, `deleteKeyPolicy`, `listKeyPolicyIds`. A policy is validated on write, and a stored policy that cannot be read back raises `KeyPolicyError` rather than being silently dropped (dropping it would widen the key back to the host policy alone). A key's policy is removed with the key — whether the key is deleted individually or dropped by a bulk `saveKeyMetadata` replacement — so a future key issued with the same id can never inherit it.
  - `GovernanceContext` gains an optional `keyPolicies` resolver, and `resolveGovernanceForRequest` resolves the applying policy **per request** from `apiKeyPayload.sub` — the host policy is machine-wide and can be bound once, but which key policy applies depends on who authenticated. `createKeyPolicyResolver` / `createStoredKeyPolicyResolver` cache per key id with a short TTL and an explicit `invalidate` that holds even against a load already in flight, so tightening a key's policy takes effect immediately; a resolver failure fails the request closed with a 500 rather than falling back to the host policy.
  - A `confirm-first` hold now carries the layer that produced it all the way to the approval provider: `ApprovalRequest.layer` reports `'host'` or `'key'`, which is the data a provider declaring `supportsDistinctRouting` routes on. A host denial is still never escalated — the provider is not consulted for a call the host policy already refused. The `202` pending-approval response (no provider configured) likewise names the layer in `pendingApproval.layer`.
  - `ApprovalLayer` is now an alias of `PolicyLayer` so the approval seam and the policy layer cannot drift into two spellings of the same idea.

  Keys with no policy of their own are entirely unaffected: same decisions, same reasons, same response bodies.

### Patch Changes

- 2e46b8f: Removed the unused optional `@opentelemetry/sdk-node` and `@opentelemetry/exporter-trace-otlp-http` peer dependencies from `@macts/api` (nothing imports them; `configureTelemetry` is a no-op stub, and its docs now say so plainly instead of implying tracing activates once the SDK is installed). Also moved `clipanion`, `typanion`, and `zod` to the pnpm catalog so their version ranges are declared once and stay consistent across the workspace and generated packages.

## 0.1.0

### Minor Changes

- 1454024: Convert `ApiKeyValidationResult` to a discriminated union on `valid`

  `ApiKeyValidationResult` was a single interface with `valid: boolean` and
  optional `payload`, `error`, and `errorCode` fields, forcing consumers to add
  defensive guards (e.g. `result.valid && result.payload`) that the type system
  could not verify. It is now a discriminated union of `ApiKeyValidationSuccess`
  (`valid: true`, required `payload`) and `ApiKeyValidationFailure`
  (`valid: false`, required `error` and `errorCode`), so narrowing on
  `result.valid` gives direct, type-safe access to the appropriate fields.

  The failure error codes are extracted into a new exported
  `ApiKeyValidationErrorCode` type, which the API server's `AuthErrorCode` now
  builds on instead of duplicating the code list. Consumers (API auth middleware,
  CLI `api-key verify`) drop their defensive `payload` guards and error-message
  fallbacks in favor of narrowing.

  Breaking for TypeScript consumers that constructed partial results (e.g.
  `{ valid: false }` without `error`/`errorCode`); runtime behavior is unchanged
  except that a failure response message can no longer silently fall back to a
  generic string.

- 613ffcf: Add 12 new macOS app packages, fix all lint errors, and add plugin discovery e2e tests

  **New apps (12):**
  - Shortcuts, Automator, Photos, Xcode, Microsoft Edge, Microsoft Word, OmniFocus, OmniGraffle, OmniPlan, Alfred 5, Bluetooth File Exchange, System Information

  **Generator improvements:**
  - Fix code generators to emit lint-clean TypeScript (no-invalid-void-type, no-explicit-any, restrict-template-expressions, no-unnecessary-condition, no-useless-escape)
  - Generated code now uses `rpc<undefined>` instead of `rpc<void>`, `as unknown` instead of `as any`, and proper template literal interpolation

  **Infrastructure lint fixes:**
  - Fix all ESLint errors across @macts/core, @macts/cli, @macts/mcp, @macts/api
  - Replace deprecated Zod v4 APIs (.passthrough → .loose, .datetime → z.iso.datetime)
  - Add isValidCachedPlugin type guard to CLI cache for consistency with MCP cache

  **Plugin discovery e2e tests:**
  - Add e2e tests for CLI and MCP plugin discovery using fixturify-project
  - Add unit tests for CLI plugin manager, cache, and path utilities
  - Add MCP path utility tests
  - Add cross-system integration test validating CLI/MCP coexistence
  - Add cache integration tests (fast path, invalidation)

  **Manifest fixes:**
  - Fix duplicate enum values in mail (kerberos5, md5) and music (mP3CD, m3U, m3U8) manifests
  - Fix Script Editor manifest name for correct package directory naming

  **Documentation:**
  - Add comprehensive manifests/README.md documenting YAML schema and permissions model
  - Add CONTRIBUTING.md with guidelines for adding new macOS app packages
  - Update root README.md with current package names and full supported apps table

  **Infrastructure:**
  - Remove Verdaccio registry from .npmrc
  - Add fixturify-project devDependency for e2e test fixtures
  - Add scratch/ to .gitignore

- 2ad7c96: Add capability discovery with deterministic risk classification

  Agents can now ask "is there a typed capability for this intent?" and get a focused, ranked answer plus the snippet to call each — without holding every app's tools in context.
  - Every capability carries a machine-readable risk classification (`read` / `write` / `delete` / `send` / `execute` / `system-change`), derived deterministically from its operation semantics with an optional manifest-level override. Every generated app package now exports a typed `capabilities` array carrying this risk metadata and the required permission.
  - A new manifest-sourced capability registry derives, for each capability, a stable name, app dependency, input schema, required permission (`app:resource:operation`), and risk — consumable by both the CLI and MCP.
  - New CLI commands: `macts capabilities search <intent>` (ranked matches with the call snippet) and `macts capabilities inspect <capability>` (schema, permission, risk, app dependency).
  - A built-in MCP discovery tool returns the same, context-window-friendly.
  - A governance filter seam lets an active policy filter or flag capabilities at discovery time (default: no-op pass-through). When nothing matches a search, the next move is to generate a new capability — never a UI fallback.

- 4851845: Add CLI and MCP plugin systems with Calendar plugins

  **@macts/cli:**
  - Add plugin management commands: `macts plugin install/uninstall/list`
  - Plugins installed into `~/.macts/plugins/` using npm
  - Plugin cache with package-lock.json hash for fast CLI startup
  - JSON and human-readable output formatters with table support
  - Export plugin system types and utilities for plugin development
  - Add `createFormatter()` utility for consistent output handling
  - Add `--mcp` flag to start MCP server with discovered plugins
  - Add `--serve` flag stub for Phase 8

  **@macts/calendar:**
  - CLI plugin for macOS Calendar.app (install via `macts plugin install @macts/calendar`)
  - Calendar management commands: list, create, get
  - Event management commands: list, create, get, show
  - Application control: reload calendars, switch view, view calendar
  - All commands support both human-readable and JSON output formats

  **@macts/mcp:**
  - MCP (Model Context Protocol) server for AI assistant integration
  - Plugin system for MCP tools (`@macts/mcp-*` packages)
  - Plugin discovery with caching using package-lock.json hash
  - `createMcpServer()` function for programmatic server creation
  - Stdio transport for MCP protocol communication
  - Export types: `McpPlugin`, `McpToolDefinition`, `McpServerOptions`

  **@macts/calendar-server:**
  - MCP plugin for macOS Calendar.app (install via `macts plugin install @macts/calendar-server`)
  - 10 tools following naming convention `macts__calendar__<resource>_<operation>`
  - Calendar tools: list, get, create
  - Event tools: list, get, create, show
  - App control tools: reload_calendars, switch_view, view_calendar

  **@macts/core:**
  - Add MCP generator: `generateMcpPlugin()` function
  - Generate MCP plugins from app manifests
  - Tool naming convention: `macts__<app>__<resource>_<operation>`
  - JSON Schema generation for tool inputs

- 37fc2aa: Fix generated CLI and MCP code so the whole workspace passes strict `pnpm typecheck`

  The code generators emitted argument casts that strict TypeScript rejects, so every
  generated app package failed type checking. The generators now emit sound, precise
  assertions and all app packages have been regenerated from their manifests.

  **Generator fixes (`@macts/core`):**
  - Generated CLI `create` commands assert the SDK's exact `*CreateInput` type instead of
    the unsound `as Record<string, unknown>` (which strict mode rejected, including for
    inputs with no writable fields).
  - Generated CLI and MCP command/tool handlers assert each argument to the SDK method's
    exact parameter type (`Parameters<typeof method>[i]`) instead of the bare `as unknown`
    cast, which is assignable to no concrete parameter type.
  - A command parameter named `path` no longer produces a class field that shadows
    Clipanion's `Command.path` member; it is renamed (e.g. `browsePath`) while keeping the
    `--path` flag.
  - Self-nested resource hierarchies (and commands whose parameter is the resource's own
    ID) no longer emit a duplicate identifier for the resource-ID option.
  - MCP tools no longer synthesize an implicit identifier for custom resource commands
    (e.g. `show`), and the generic resource-command handler now passes every parameter
    positionally to match the SDK signature.
  - MCP array parameters emit `items` as a JSON Schema object instead of a bare type
    string.
  - Resource client files now import enum types referenced by resource command parameters
    (e.g. `SaveFormat`).

  **Other fixes:**
  - `pnpm typecheck` now runs in CI, after `pnpm build`, so this class of error cannot
    regress unnoticed.
  - Fixed strict-mode type errors in `@macts/api`, `@macts/cli`, and `@macts/mcp` plugin
    and middleware tests.

- 41274b5: Wire the real governance policy into capability discovery (CLI + MCP)

  `@macts/core` now exports a policy-backed `GovernanceFilter` implementation and a policy file loader:
  - **`createPolicyGovernanceFilter(policy)`** — returns a `GovernanceFilter` backed by a parsed `GovernancePolicy`. Translates policy dispositions to discovery dispositions: `allowed` → `allow`, `read-only`/`confirm-first` → `warn` (surface with flag), `forbidden` → `deny`. Uses `findMatchingPolicyRule` to resolve the most specific matching rule per capability's `app:resource:operation` triple; falls back to `policy.defaultDisposition` (fail-closed: `forbidden` by default) when no rule matches.
  - **`PolicyGovernanceFilter`** — the class implementing the filter (exported for `instanceof` checks / extension).
  - **`loadPolicyFromFile(path)`** — reads and validates a governance policy from a JSON file. Returns a discriminated `LoadPolicyResult`: `{ found: false }` when absent (normal — policy is optional), `{ found: true, error, issues? }` when present but invalid, or `{ found: true, policy }` when valid. Never reads `MACTS_HOME` itself; callers supply the absolute path.

  `@macts/cli` now wires the active policy into `capabilities search`, `capabilities inspect`, and the built-in MCP discovery tool:
  - Both CLI discovery surfaces and the MCP discovery tool load `$MACTS_HOME/policy.json` on startup. When the file is present and valid, the policy-backed filter is used; when absent, the existing no-op allow-all behaviour is preserved; when present but invalid, a warning is written to stderr and the filter degrades gracefully to allow-all.

- f1e103f: Enforce the declared governance policy at capability call time

  `@macts/core` now turns a declared governance policy into call-time decisions and the `@macts/api` server enforces them on every capability invocation, layered after the existing API-key permission check.

  **`@macts/core` — the decision layer:**
  - `evaluatePolicy(policy, permission, risk)` — the single source of truth for "does this policy allow this capability?". Returns a structured `PolicyEvaluation` with a decision (`allowed` | `denied` | `confirm-first`), the matched rule and its provenance, and a human-readable reason naming the rule and the exact `app:resource:operation`. Discovery filtering and enforcement both consume this so they can never drift.
  - `compilePolicyToPermissions(policy, candidates)` / `policyGrantsPermission(policy, candidate)` — project a policy onto the concrete `app:resource:operation` permissions it grants (allowed plus read-only-as-read), consistent with the evaluator.
  - `enforceCall(options)` — the audit-writing wrapper: evaluates the policy, maps the decision to an enforcement outcome (`allowed` | `denied` | `pending-approval`), and writes one audit record per decision via the injected `AuditWriter`. A `confirm-first` (pending-approval) outcome is recorded with the dedicated `pending` audit decision — distinct from `denied` — so a withheld confirmation is never misattributed as a policy denial.
  - `AUDIT_DECISIONS` now includes `pending` (a confirm-first call withheld awaiting approval), alongside `allowed`, `denied`, `approved`, and `rejected`.

  Disposition semantics: `allowed` permits; `read-only` permits only read-class operations (mutating operations are denied); `confirm-first` surfaces a pending-approval signal and the operation is withheld; `forbidden` denies; an unmatched capability falls back to `policy.defaultDisposition` (fail-closed `forbidden` by default).

  **`@macts/api` — call-time enforcement:**
  - `requirePolicy(...)` middleware checks every RPC endpoint against the active policy after the API-key permission check; out-of-policy calls fail with `403 GOVERNANCE_DENIED` and the human-readable reason. A `confirm-first` call is withheld safe-by-default: the operation does **not** execute, and the middleware returns `202` with a `GovernancePendingResponse` body naming the gating rule and the exact `app:resource:operation` (audited as `pending`). The dedicated approval flow that would let such a call proceed is a separate change.
  - The active policy is loaded via `loadActivePolicy` from `<macts-home>/governance/policy.json`. When no policy file is configured, the server defaults to an allow-all policy so existing behavior is preserved; a malformed policy file is a hard error (never silently downgraded to allow-all).
  - Every decision is audited (with redacted argument summaries) through the foundation's file audit writer, whose destination is injected by the API layer.

- 17166aa: Add the governance policy declaration and audit-record foundation

  `@macts/core` now exports a domain-agnostic governance module that supplies the decision-invariant building blocks for the trust boundary:
  - **Governance policy declaration** — a Zod schema, types, and a `parsePolicy(unknown)` parser that validates at the trust boundary via `.safeParse()` and returns structured, path-tagged issues instead of throwing. The declaration models apps and operations as `allowed` / `read-only` / `confirm-first` / `forbidden`, with separate path/URL allow and deny restrictions and sensitivity tags. Unspecified apps/operations default to a fail-closed `forbidden` boundary, and unknown keys are rejected.
  - **Structured audit records** — a typed, immutable `AuditRecord` (capability, args summary, app, API-key id, timestamp, decision, optional reason) plus a pure `createAuditRecord` constructor and a deterministic `serializeAuditRecord` that emits a JSON-safe form with an ISO-8601 timestamp. Timestamps are caller-injected, so records are fully deterministic.
  - **Argument-redaction helper** (`redactArgs`) — sanitises raw capability-call arguments before they enter an audit record. Sensitive key names (password, token, secret, apiKey, api_key, authorization, key, credential — compared case-insensitively) are replaced with a stable `[redacted]` placeholder; non-sensitive values are summarised safely (large objects/arrays truncated to a size hint). Callers may extend the default sensitive-key list.
  - **Durable audit-record writer** (`createFileAuditWriter`) — appends serialised audit records to a JSON-lines (NDJSON) file at an explicitly-provided path. Parent directories are created automatically; errors are surfaced, never swallowed. The writer accepts a plain absolute path and never resolves a home directory or reads environment variables — home-dir wiring belongs to the caller layer.
  - **Governance-policy wildcard matcher** (`findMatchingPolicyRule`, `appPatternMatches`, `operationPatternMatches`) — resolves which policy rule governs a concrete `app:resource:operation` capability, using the same "wildcard in pattern position matches any concrete value" semantic as the existing permission-system matcher. First-match-wins in declaration order.

  This is decision-invariant scaffolding. It deliberately does not compile declarations to `app:resource:operation` permissions, wire approval gates, filter discovery, or build full enforcement — those await the governance-policy design decision.

- 25f27f4: Add a provider-agnostic human-in-the-loop approval interface and wire the
  confirm-first hold to it

  Governance policy could already hold a `confirm-first` capability call, but
  nothing could ask a human about it: the API server answered `202` with a
  pending-approval body and the operation stayed withheld. macts now defines the
  interface it owns for seeking a human decision, and concrete approval systems
  plug in behind it.

  `@macts/core` gains the approval seam: an `ApprovalProvider` receives a
  decision-grade `ApprovalRequest` (permission, risk class, API-key identity,
  redacted argument summary, the matched policy rule and its reason, a stable
  request id, and the timeout) and answers `approved`, `rejected`, or `timeout`,
  optionally attaching an opaque `evidence` artifact such as a signed verdict.
  `seekApproval` bounds the wait and normalizes the answer fail-closed into a
  discriminated `ApprovalOutcome`, so `approved: true` is inexpressible with a
  denied state: only an explicit approval releases a call, while a rejection, a
  timeout, a provider error, and a malformed response all deny. Because a
  provider is third-party code, its returned `state`, `reason`, and any policy
  suggestion are validated rather than trusted, and its exception text is kept
  out of the client-facing `reason` (which names a stable failure category)
  while the full detail travels on `auditReason` for the trail and server logs.
  Providers declare `supportsPolicySuggestions` and `supportsDistinctRouting`;
  both are reserved, and a policy suggestion from a provider that did not
  declare support is dropped rather than forwarded.

  `recordApprovalDecision` writes the resolution using the existing `approved` /
  `rejected` audit vocabulary, so a held call leaves a `pending` record followed
  by the decision that resolved it. Both records carry a shared `approvalId`, so
  overlapping identical calls from the same key can still be paired. The writer
  is required — there is no "decide but do not record" mode.

  `@macts/api` wires this into `requirePolicy`. With an approval gate
  configured, a `confirm-first` call asks the provider and awaits the decision
  in-request within a bounded timeout: approved releases the call to the handler
  and audits `approved`; rejected, timed out, or a failed provider denies with
  `403 GOVERNANCE_APPROVAL_DENIED` (carrying the terminal state, narrowed to the
  denied states, so a client can distinguish "declined" from "nobody answered")
  and audits `rejected`. With no provider configured, the existing `202`
  pending-approval behavior is unchanged.

  A `confirm-first` operation can never execute unaudited. `GovernanceContext`
  is now a union whose approvals arm requires an audit writer, so a context that
  seeks approval with nowhere to record it does not type-check and
  `loadApprovalGate` refuses to build one; and if the resolving audit write
  fails at runtime anyway, the call is denied rather than released.

  A provider is installed like any other macts plugin, into
  `<macts-home>/plugins`, and is activated by naming it in
  `<macts-home>/governance/approval.json` — explicit opt-in, because the
  approval provider decides whether held calls run rather than adding capability
  the way CLI and MCP plugins do. Its factory is looked up at the package's
  `approval` subpath (a sibling of the established `cli` and `mcp` entry points)
  and then at the package root, resolved by path under the managed directory and
  honouring the package's `exports` map with ESM conditions — so a pure-ESM
  provider loads, and a package outside that directory can never act as the
  approval authority. `loadApprovalGate` resolves and validates it; a configured
  provider that cannot be loaded is a hard error rather than a silent downgrade
  to "no approval channel", and an installed package with no usable entry point
  says so instead of claiming to be uninstalled.

- d4fa5be: Ensure list output surfaces the identifier sibling operations require, under one canonical name

  To call a write/get/delete route an agent first needs the target's identifier, and the
  natural way to obtain it is to `list` the resource. But list output left two gaps: the
  identifier could be missing (the executor read only declared `properties`, so an
  identifier declared solely in a resource's `identifiers` was omitted), and the value was
  exposed under an app-specific property name (e.g. `calendarIdentifier`) that differs from
  what sibling operations reference (e.g. `calendarId`) — leaving the consumer no reliable
  way to map one to the other. A live `calendars.list()` hit exactly this: it returned no
  usable id for `events.create`.

  **Single source of truth (`@macts/core`):** a new identifier module derives a resource's
  primary identifier property from the manifest's `identifiers` array (primary-first) and
  defines the canonical key (`id`) under which every surface exposes it. The server's list
  executor now (1) always reads the manifest-declared primary identifier — even when it is
  not also a regular property — and (2) mirrors that value onto the canonical `id` key, so
  a consumer can always read `item.id` regardless of the app's property name. The generated
  SDK read type surfaces an optional `id` field (and its Zod schema) for resources whose
  identifier is not already named `id`.

  Resources that declare no identifier are handled gracefully: list still returns their
  declared properties and simply omits the canonical alias rather than inventing one.

  All app packages were regenerated from their manifests; no generated files were
  hand-edited.

- 0a6f7e1: Drop support for EOL Node.js 20; require Node.js >=22 and support Node.js 26. Upgrade better-sqlite3 to v13 (N-API prebuilds).
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

- 4851845: Add two-layer permissions system and JWT-based API key management

  **@macts/core - Permissions System:**
  - Fine-grained permissions (one per command): `app:resource:operation`
  - Coarse-grained permissions (CRUD-style groups): `app:resource:read`
  - Wildcard permissions for broad grants: `app:*:read`, `app:resource:*`
  - Permission parsing, expansion, and matching utilities
  - Permission history tracking for helpful upgrade error messages
  - Manifest schema updates to support `permission` field on commands and `permissions` section for coarse-to-fine mappings

  **@macts/api - API Key Management:**
  - JWT-based API key generation with HMAC-SHA256 signatures
  - Token format: `macts_sk_<jwt>` for easy identification
  - Permission expansion at key creation time (coarse/wildcard → fine-grained)
  - Key metadata storage with revocation support
  - Secure secret storage in `~/.macts/secrets/` with proper file permissions
  - Environment variable override: `MACTS_API_KEY_SECRET`
  - Validation utilities with detailed error codes

  **Key Features:**
  - Coarse permissions expand at creation, not validation (security: new permissions require new keys)
  - Permission history provides actionable error messages when requirements change
  - Keys store only fine-grained permissions for precise access control
  - Helper functions for common patterns: `createFullAccessKey()`, `createReadOnlyKey()`

- a68161c: Make the client SDK and server router address every RPC operation with the same route

  The generated client SDK and the server router are both produced from the manifest,
  but they keyed RPC routes differently for manifest-named commands: the server used the
  command's manifest **key** (e.g. `createEvent`) while the client used the command's
  **name** (`create`). As a result, structured writes were unreachable —
  `@macts/calendar` `events.create()` posted to `calendar.events.create` and the server
  (which exposed `calendar.events.createEvent`) returned `404 NOT_FOUND`. Multi-word apps
  drifted too: the server kept the space (`google chrome`) while the client hyphenated
  (`google-chrome`), breaking every route for those apps.

  **Single source of truth (`@macts/core`):** a new route module derives the canonical
  `app.resource.operation` string (keyed by the command's manifest key, with a normalized
  app segment) and is used by both surfaces — the SDK generator emits it as a literal and
  the server router registers it at runtime. New generator-level tests assert, for every
  manifest operation across every app, that the client route equals the route the server
  exposes.

  **Reachable surface only:** the SDK now emits a CRUD method only when a backing manifest
  command exists (routing it by that command's key), and omits resource clients for
  resources that declare no operations — eliminating methods that always 404'd.

  **Identifier reconciliation:** a resource's create-input type now includes the backing
  create command's parameters, so identifiers the server requires (e.g. an Event's
  `calendarId`) are surfaced under the exact name the server validates.

  All app packages were regenerated from their manifests; no generated files were
  hand-edited.

- 9a98e47: Add runtime identifier probe to validate manifest identifier claims against the live app

  Manifests are sdef-derived and contain identifier claims that may not work at runtime.
  Calendar's declared primary identifier `calendarIdentifier` throws "AppleEvent handler
  failed" via JXA while `name` works — a systemic gap that could affect other apps too.

  **`@macts/core`**:
  - New `probe` field on `ResourceSchema` — optional `RuntimeProbeSchema` block written by
    the probe tool, carrying `status`, `runtimeIdentifier`, `probedAt`, and `note`. The
    sdef-declared `identifiers` array is untouched (preserved for provenance); `probe` is
    purely additive metadata.
  - New `ProbeStatusSchema` / `ProbeStatus` type: `'probed' | 'no-items' | 'failed' | 'error'`.
  - New `probeManifest(manifest, runner, options?)` function — probes each resource by
    reading the first item of the collection and attempting each declared identifier property
    (primary first), plus common fallbacks (`name`, `id`), recording which returns a value
    vs. throws. The JXA-execution layer is **injectable** (`JxaRunner` type) so unit tests
    exercise the full probe logic with fake runners — no real apps or TCC grants required.
  - New `writeProbeResults(manifestPath, result)` — merges probe results back into the
    manifest YAML file, upserting `resource.probe` for each probed resource.

  **`@macts/cli`**:
  - New `macts probe <app>` subcommand — loads an app's manifest, runs the probe with
    the real JXA executor, prints per-resource results (human or `--json`), and writes the
    updated probe metadata back into the manifest unless `--dry-run` is set. Supports
    `--resource <Name>` to target a single resource and `--manifests-dir` for custom
    manifest locations.

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

- 68bf762: Fix get/update/delete inputSchema spuriously requiring identifier property alongside declared id param

  When a resource command (get, update, delete) declares its own required parameter (e.g. `id`), the
  resource's primary identifier property (e.g. `name` for Calendar, `uid` for Event) was incorrectly
  being added to the `required` array in addition to the declared param. The identifier property is
  now only added to `required` when the command declares no required params of its own (the fallback
  for resources without an explicit id parameter).

  This corrects `required: ['id', 'name']` → `required: ['id']` in `calendars.get` and similar
  operations across all app packages. Regenerated capabilities and MCP tool artifacts are included.

- 8143d36: Fix governance filter applied after --limit slice, causing under-filled results

  Previously, `searchCapabilities` sliced results to `--limit` before governance was applied, so denied capabilities in the top-N left gaps instead of being backfilled from lower-ranked allowed matches. A search for "top 10" could silently return fewer than 10 results when a real policy denied some.
  - Add `governedDiscoverySearch` to `@macts/core` — the correct all-in-one entry point for discovery surfaces: applies governance to the **full** ranked match set, then slices to `limit`. A request for N results now returns N _allowed_ results, with backfilling from lower-ranked capabilities.
  - Add `filter?: GovernanceFilter` option to `SearchCapabilitiesOptions` so `searchCapabilities` can also apply governance before slicing.
  - Update CLI (`macts capabilities search`) and MCP discovery tool to use `governedDiscoverySearch`.
  - Add regression tests: partial-denial-under-limit (verifies backfilling) and all-denied (verifies `governance-blocked` vs `no-match` distinction is preserved).

- 7f3f095: Fix governance policy-path split-brain: enforcement and discovery now read the same file

  Enforcement (`@macts/api`) and discovery (`@macts/cli`) previously resolved the
  active policy from different paths — enforcement used
  `<macts-home>/governance/policy.json` while discovery used
  `<macts-home>/policy.json`. A policy placed in one location had no effect on the
  other, silently undermining governance.

  **`@macts/core`** — new `resolveActivePolicyPath(home)` exported from the
  governance barrel. This is the single source of truth for where the active policy
  lives on disk: `<home>/governance/policy.json`. Both the enforcement layer and
  the discovery layer now call this function instead of building the path
  themselves, so they always read the same file.

  **`@macts/api`** — `getActivePolicyPath()` in
  `server/governance/active-policy.ts` now delegates to `resolveActivePolicyPath`
  from `@macts/core` instead of joining the path inline.

  **`@macts/cli`** — `getPolicyFilePath()` in
  `commands/capabilities/policy.ts` now delegates to `resolveActivePolicyPath`
  from `@macts/core` instead of joining to `policy.json` at the home root.

  **Canonical path:** `<macts-home>/governance/policy.json` (unchanged from
  enforcement; the discovery path was the one that was wrong).

- 6225db2: Add a first-class command to install MCP server plugins and align plugin docs with the real package names.
  - `macts mcp install <app>` installs an app's MCP server plugin (`@macts/<app>-server`) into `~/.macts/plugins/` (overridable via `MACTS_HOME`), where the MCP daemon discovers it. After installing, `macts mcp start` exposes that app's tools to MCP clients. `macts mcp uninstall <app>` and `macts mcp list` round out the flow. CLI plugins (`@macts/<app>`) continue to be managed with `macts plugin install`; the CLI plugin loader still excludes `-server` packages.
  - Replaced references to nonexistent `@macts/cli-*` / `@macts/mcp-*` packages across CLI help, examples, hints, and docs with the real `@macts/<app>` (CLI) and `@macts/<app>-server` (MCP) names. The package generators now default to these consolidated names.

- d1f350e: Package manifests now include license, repository, and publishConfig metadata, plus a bundled LICENSE file, in support of npm publishing with provenance.
- c7ac226: Add `@macts/types`, a zero-runtime package holding the shared MCP plugin type
  definitions (`JsonSchema`, `McpToolDefinition`, `McpPlugin`).

  Generated `@macts/<app>-server` packages used these types only — no value import
  existed — but declared `@macts/mcp` as a peer dependency to get them. They now
  depend on `@macts/types` directly, so a server package no longer implies a
  dependency on the MCP server implementation.

  `@macts/mcp` re-exports all three types, so importing them from `@macts/mcp`
  continues to work unchanged.
