# @macts/contracts

## 0.4.0

## 0.3.0

### Minor Changes

- c945d04: Breaking change: list operations return bounded pages.

  Every list output changed from an array to a page, `{ items, nextCursor? }` (`Page<T>` and `t.page(item)` in `@macts/contracts`). Lists whose items have an identifier the manifest claims unique take two optional inputs, `pageSize` and `cursor`. A page holds at most `pageSize` items: 25 by default and at most 100, the same on every transport. A page size of zero, below zero, not an integer or above 100 is rejected, never clamped. When more items remain, the page carries a `nextCursor`; send the same inputs again with it as `cursor` to read the next page. The cursor is opaque. Paging bounds the size of each call. It bounds the latency of each call only for lists whose pages are read by range, which is most of them: a list read by column costs what its whole collection costs per page (see the entry on how each list reads its pages). Paging does not make a full listing cheaper in total.

  Every other list takes neither input and returns its whole collection as one page with no `nextCursor`: a page is anchored on the identifier of the item before it, which only a unique identifier can do. Uniqueness is opt-in, from evidence: a manifest identifier records `unique: true` (or `unique: false`) with `evidence.unique` saying where the claim comes from, and the capability registry's input schemas show the paging inputs for exactly the lists that page. Contacts lists (people, groups, and a person's emails, phones and addresses) page, because Contacts describes each of those identifiers as unique. Music's playlist list pages. Its track list does not: a playlist can hold the same song more than once, and both entries are expected to share one persistent ID. Calendar event and calendar lists do not page: recurring events share a uid, and calendar names can repeat. `listOperationPages` in `@macts/core` is the one rule every surface uses, and the runtime refuses a contract whose list takes the paging inputs when the manifest says it does not page, or the reverse. Resolving a collection reference is not paged: it still returns the full array of records.

  Each surface takes the paging inputs from the contract. Generated SDK list methods take a trailing `page` argument (`list(listId, { pageSize, cursor })`) and return `Page<T>`. HTTP and MCP callers send `pageSize` and `cursor` in the input. When more items remain, MCP adds a second text block after the result, saying how many items the page holds and how to read more; the first block is always the JSON result. Generated CLI list commands take `--page-size` and `--cursor` and print how to see the next page. App parameters named `pageSize` or `cursor` on a list operation are now a generation error.

  There is a new error, `COLLECTION_CHANGED` (`CollectionChangedError`, HTTP 409, no details). It replaces `UnexpectedValueError` for a collection that changed while it was being read. The same request is correct and can be retried, from the first page if it was paged. A cursor whose item has since moved or been deleted fails this way. A malformed cursor, or one sent to another operation or with other inputs, is a validation error at `cursor`. Audit records and logs record only that a cursor was presented, never its contents.

- 127d864: Generated app constructors now share the contract client's value codec, reference authority and HTTP transport. Typed methods return canonical Date, Integer, null and hydratable reference values, and throw canonical structured errors. Constructors, numeric argument conveniences, standalone resource clients and custom HttpClient.rpc overrides remain available.

  Root record and input types reuse their app contract definitions. Numeric create/update conveniences retain runtime validation before dispatch. Raw HttpClient.rpc, app-specific error exports and raw response schema validators remain available for explicit passthrough consumers; typed methods target contract-registered services.

  Raw and typed RPC now share protocol handling even through overrides forwarding only public arguments. Valid raw results, including null void results, and arbitrary server app-error codes/messages are preserved. Malformed JSON and missing success results now consistently throw TransportError for explicit raw calls as well as typed methods.

- 2a00978: `OperationDescriptor` gains an optional `inputJsonSchema`: the draft-7 JSON Schema of the input's wire values, exactly `z.toJSONSchema(input.wire, { target: 'draft-7' })`. Generated descriptors always carry it, for consumers that read an operation's input schema as plain data without zod. Adapters never read or serve it; they derive their schemas from `input.wire`.
- 7400f3b: Serve the HTTP API through the shared runtime, with structured errors and rate limiting

  **`@macts/api`** now composes `createRuntime` with a thin HTTP adapter. Every `POST /api/v1/rpc/<operation>` runs through the runtime's pipeline (verify the credential, admit against the rate limit, check permission, validate input, enforce governance, execute), so the HTTP server and every other surface enforce exactly the same checks.
  - **`createHttpAdapter(runtime, options?)`** is the pure HTTP transport, mounted at `/api/v1` by `createServer`. It reads the JSON body (a missing or blank body is `{}`), the `Authorization: Bearer` credential, the request's abort signal, and an optional `X-Request-Id` correlation id. Unknown routes, including `POST /rpc/<unknown operation>`, are 404 `NOT_FOUND` and never reach the runtime.
  - **Errors** are always `{ "error": { code, message, details } }` with the structured codes from `@macts/contracts`, so a client can rebuild the same error class with `fromWireErrorEnvelope`. `httpStatusForError(error)` gives the status for each code. Native failures are no longer collapsed into `EXECUTION_ERROR`: a missing target is 404 `TARGET_NOT_FOUND`, an unavailable app is 503 `APP_UNAVAILABLE`, a timeout is 504 `TIMEOUT`, and so on. An unexpected failure is a generic 500 `INTERNAL` that never repeats the underlying message. A confirm-first call with no approval provider is now 409 `APPROVAL_PENDING` instead of 202.
  - **`ServerOptions`** gains `executor`, `verifier`, and `clientAddress`, so tests and alternate providers can compose the server without a Mac app or key store. `createApp` accepts every option except the listener ones.
  - **Rate limiting** answers 429 `RATE_LIMITED` with a `Retry-After` header. The per-key limit (default 100 calls per minute) now runs in the runtime. A new per-client-address limit (default 300 requests per minute, `rateLimit.perAddress`) runs before the credential is checked, so failed authentication attempts are bounded too. `rateLimit: false` disables both. The `X-RateLimit-*` headers are no longer sent.
  - `/health` reports the installed `@macts/api` version instead of a fixed `1.0.0`.
  - Removed: `authMiddleware`, `requirePermission`, `rpcPathToPermission`, `requirePolicy`, `createRpcRouter`, `createMultiAppRpcRouter`, the server-only `createRateLimiter` middleware, and their response types (`AuthVariables`, `AuthErrorCode`, `AuthErrorResponse`, `PermissionErrorResponse`, `PermissionMiddlewareOptions`, `RequirePolicyOptions`, `GovernanceDeniedResponse`, `GovernancePendingResponse`, `GovernanceApprovalDeniedResponse`, `RpcRequest`, `RpcErrorResponse`, `RpcHandler`, `RpcHandlerContext`, `RpcEndpointInfo`, `RateLimiterInstance`). Error bodies are now typed by `WireErrorEnvelope`, re-exported from `@macts/contracts`.
  - Removed: the automation bridge that `@macts/api` re-exported from `@macts/core` (`runJxa`, `runWithApp`, `JxaExecutionError`, `connect`, `isAppRunning`, `activateApp`, `quitApp`, `getAppName`, `ObjectSpecifier`, `dateCoercer`, `colorCoercer`, `createEnumCoercer`, `pathCoercer`, `booleanCoercer`, `numberCoercer`, `stringCoercer`, `createArrayCoercer`, `nullSafe`, `HexColorSchema`, and the types `JxaExecutorOptions`, `AppConnection`, `AppConnectionOptions`, `SpecifierStep`, `Selector`, `TypeCoercer`, `HexColor`, `JxaEnumValue`). They remain available from `@macts/core` for anyone who needs them.

  **`@macts/runtime`** adds an optional admission step: `createRuntime({ rateLimiter })` admits each call by the verified key after authentication and before the permission check, raising `RateLimitedError` when the limit is exhausted. Admission never grants anything, and a limiter that fails denies the call with `InternalError`. `createRateLimiter({ max, windowMs })` is the in-memory fixed-window limiter.

  **`@macts/contracts`** adds `RateLimitedError` (code `RATE_LIMITED`, details `{ retryAfterSeconds }`), with its registry entry and wire schema.

- 87985bb: Add integer and RGB helpers and validators for wire values
  - **`Integer.validate`, `Integer.round`, `Integer.truncate`, and `Integer.is`** sit on a value with the same name as the `Integer` type, so a type error that names `Integer` leads straight to the fix. Validation rejects fractions, non-finite values, and anything outside the safe-integer range, with a message that names the explicit conversion to use instead. Rounding is half away from zero, and nothing is ever clamped or rounded implicitly.
  - **`Rgb.create`, `Rgb.from8Bit`, `Rgb.fromHex`, `Rgb.to8Bit`, and `Rgb.toHex`** build 16-bit colors and convert from and to 8-bit and hex forms. Each 8-bit channel is multiplied by exactly 257; converting back divides by 257 and rounds, which is documented as lossy.
  - **`WireIntegerSchema`, `WireDoubleSchema`, `WireDateSchema`, and `DynamicWireValueSchema`** validate wire control records strictly. Integer text must be canonical and within the safe range. Doubles accept the `NaN`, infinity, and `-0` states but reject non-finite JSON numbers. Dates must be real calendar instants with three fractional digits and an explicit offset. Dynamic content must be self-describing.
  - **`VALUE_ISSUE_CODES`** gives each value-contract violation a stable machine-readable code.
  - The wire control-record types are now type aliases, so they are assignable to `WireValue`.

- f9d86f8: The macOS provider now converts references at operation inputs and outputs. Contacts `actionTitle`, `performAction` and `shouldEnableAction`, whose `for` takes a single person reference, no longer fail: they accept the reference and pass that person to the app. `actionTitle` still resolves to `undefined` rather than the title, because no manifest records command results yet (#233).

  A reference converts when it is a single identity reference with no container, to a resource the app finds at the application by its identifier, or with its container, to a resource found within one (see the container reference changeset). An input reference becomes the app's object, found as the resource's `get` finds it. If no object has that identifier, the call fails with `TargetNotFoundError` with `details.resource` set to the referenced resource, before any command is sent, for example: Contacts has no Person matching the reference at `for`. An app object at an output position becomes an identity reference with no container. The output positions that convert, on records an operation returns, are Photos album and folder `parent`. Microsoft Edge and Google Chrome window `activeTab` convert to a reference that carries its window (see the container reference changeset). Xcode workspace document `activeScheme`, `activeRunDestination` and `lastSchemeActionResult`, and run destination `device` and `companionDevice`, are left out of output for now, as is every other output field whose reference macts cannot yet return in a resolvable form (see the output reference changeset; #219).

  At an operation position, every other reference still fails with `InternalError`: selectors; identity collections, including one whose entries carry a container; references to a resource with no identifier, no `get`, or no entry in the contract's resource table; a reference with a container to a resource the app finds at the application, or with a container of another resource; and a reference without its container to a resource the app finds only within one. The message for a reference changed to: The Contacts operation "performAction" takes a reference at `for` that the macOS provider cannot convert yet.

  Breaking change for executor implementers: `ExecutionRequest` and `ResolutionRequest` have a new required field, `resourcePlans`, a `ResourcePlanTable` (in `@macts/contracts`) with each resource's identifier plan. `resourcePlanTable(resources)` derives it from an app contract, and `EMPTY_RESOURCE_PLAN_TABLE` is the table for a caller without a contract. The runtime fills it from the registered contract on every request. `registerContract` now refuses, with `OperationRegistrationError`, a contract whose resource is missing from the manifest or whose identifier type differs from the manifest's primary identifier type.

  Nothing reaches the app before the whole input converted: a value that cannot convert, such as a file, a file source, a reference form the provider cannot convert yet, or an invalid value, fails before any event is sent, wherever it sits in the input. Referenced objects are found, and their existence checked, only after that. A call to an app that is not installed fails with `AppUnavailableError` (`not-installed`) whatever its input holds.

  The native codec's functions take a third argument, `{ app, references }`, and a native script carries its `references` table. `@macts/core/testing` is a new internal entry for macts' own tests; it is not public API and not covered by semantic versioning.

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

- 1cfc8fd: A manifest can now declare a positional resource: one whose objects have no identifier and are found only by their zero-based position within their parent. The resource records `positional: { evidence }`, with curated evidence (`source: curated`, a `note`, `observedAt` and `appVersion`). Nothing is inferred from a missing identifier.

  The manifest schema, every generator and both operation registrations refuse the marker on a resource that has a primary identifier, has no get, has a get that records no parent, has a parent the app does not find by its identifier, or has a command that selects one of its items by anything but a non-null `integer` parameter. `@macts/core` exports the rule as `positionalProblems()`, and `isPositional()`.

  For a positional resource:
  - Its native get, update and delete find the item at the given zero-based position within its parent, after checking that the parent holds that many. A position past the end is `InvalidSelectionError`; a missing parent is `TargetNotFoundError` naming the parent.
  - An output field holding one, read through its parent's own record, is emitted as an index selector within that parent: `{form: 'selector', cardinality: 'one', selector: {by: 'index', index}, container}`. The index is the position the app itself reports for the object within that parent, never a dictionary `index` property; an object whose position the app does not report fails as `InternalError`. A command result holding one stays out of output.
  - The native executor resolves, and converts at input positions, an index selector to it within its parent's identity container, with the same errors.
  - Generated docs say the object has no id, is selected by its zero-based position, and that the position drifts when objects open, close or move.

  In `@macts/contracts`, `IndexSelectorReference<T, R>` is a `SelectorReference` whose selector is an index and whose container is an identity reference; it is assignable to `ObjectReference`. `t.indexSelectorReference(scope, resource)` is its value type: its wire schema, and so the runtime's output check, admits only that form. A reference plan gains an optional `form: 'index'`, which records the form the native codec emits.

  In `@macts/core`, `NativeAddressing` gains `NativePositionalAddressing` (`lookup: 'byIndex'`), `NativeCodecEnvironment` gains an optional `positionOf`, and a codec failure can carry `outOfRangeResource`. An exhaustive `switch` over `NativeAddressing['lookup']` needs a new case.

- 20e7083: Add reference and file value types

  `ValueTypes.reference(registry, resource, cardinality)` builds the value type for a typed reference position. It accepts both identity and selector forms for its cardinality, and a list of single references is `ValueTypes.array(ValueTypes.reference(…, 'one'))`. Identifiers are encoded and decoded with each resource's own identifier type, which `ResourceDescriptor.id` now carries, so containers of other resources round-trip correctly. A resource without an identifier has no `id` and is referenced only by selector forms. Encoding reads only a reference's data fields and never resolves it. Class instances and accessors are accepted, but an undeclared data property, such as a typo or a field from the other form, is rejected. The same rule applies to file sources. Both directions check:
  - the resource and cardinality
  - identity-collection entries
  - non-negative selector positions
  - ranges with `start <= end`
  - single-object containers

  `ValueTypes.file()` and `ValueTypes.fileSource()` cover file results and file inputs. A decoded file value is bound through `DecodeContext.bindFile`, and its fetch grant is never exposed on the value. Encoding an uploaded file sends only its upload id. Decoding an upload handle is rejected, because the service resolves uploads. `FileWireSchema` and `FileSourceWireSchema` are exported for server-side validation.

  **Breaking:**
  - `DecodeContext.bindReference` and `bindFile` now receive decoded `ReferenceData` and `FileData` instead of wire forms.
  - `DynamicWireValue` no longer includes references or files. References, files, and file sources are rejected inside dynamic content, because they appear only at typed positions.

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

- fb9a0a1: The runtime resolves references. `MactsRuntime.resolveReference(app, reference, context)` takes a reference in wire form (the `{"reference": …}` control record) and resolves it as a call of the referenced resource's `get` operation (a single reference) or `list` operation (a collection reference). It needs that operation's permission, is governed, approved, and audited exactly like a direct call of it, validates the reference against the app contract's resource table, and validates the result against the operation's output contract. A container's permission is not required, because containers only locate the target. A reference to a resource absent from the contract's resource table fails with `ValidationError` ("The reference names no resource of the app."), and so does one whose resource has no such operation, with an issue at the reference's `resource` naming the missing operation. `InvalidSelectionError` is for an index or range the collection cannot satisfy. An app now has at most one registered contract, and `registerContract` refuses a second contract for the same app. `registerContract` also refuses a contract whose resource table records a `get` or `list` operation that is not one of its operations targeting that resource. For an identity collection, the result must hold exactly one record per entry, so an entry is never silently dropped.

  The `Executor` interface in `@macts/core` gains a required `resolve(request: ResolutionRequest)` method, which resolves a validated reference into the record or records it denotes. Custom executors must implement it. To migrate, add a `resolve` method; one that does not support references can return a rejected promise with `InternalError`, as the native macOS executor does.

  `TargetNotFoundError` details in `@macts/contracts` can carry `entryIndex`, the zero-based position of the identity-collection entry whose target no longer exists.

  `@macts/cli`: the host's built-in test executor implements the new `resolve` method.

- fe1c06c: References a client decodes now resolve. Every reference in a result, and every container and identity-collection entry inside it, has a working `resolve(options?)` that hydrates it through the client that decoded it: a single reference resolves to its record, and a collection to an array of records, possibly empty. Resolution is governed as a call of the resource's `get` operation (a single reference) or `list` operation (a collection), under that operation's permission and policy, and references inside the result are bound to the same client.
  - **Remote clients** (`@macts/sdk`) post `{ app, reference }` to `<url>/references/v1/resolve` with the client's API key, and turn every outcome into the same canonical errors an operation call produces.
  - **Local clients** (`@macts/sdk/local`) resolve through their in-process runtime's `resolveReference`, with the same credential and abort signal an operation call uses.

  Callers can also bind a reference they built, and then `resolve()` it. `bindReference(client, data)`, exported from both `@macts/sdk` and `@macts/sdk/local`, binds reference data (an identifier or a selector, such as "the note named Groceries") to a client, so it resolves through that client exactly like a reference the client decoded. It also rebinds a reference bound to another client of the same app, for example a reference a local client returned, handed to a remote client. Binding makes no request. A reference to another app, a malformed field, or a target that the app has no operation to resolve fails with `ValidationError`, and a value that is not a client created by either `createClient` fails with `TypeError`. For a client of a generated contract, its type admits only reference data the contract can resolve, and returns the bound reference for that resource, form and cardinality, typed by the resource's record and identifier.

  What is sent is always the reference re-encoded from its data fields, never wire the client received. A reference from another app, at any level, fails with `ValidationError` before anything is sent. A result that does not match the resolving operation's output contract fails with `UnexpectedValueError`, and so does a resolved identity collection that does not hold exactly one record per entry, so an entry is never silently dropped. A bound reference's own enumerable properties are exactly its data fields, so it can still be passed to any operation that takes a reference.

  `ClientRuntime` in `@macts/contracts` gains a required `resolve(reference, options?)` member, which encodes a reference's data, resolves it, and decodes the result. Custom `ClientRuntime` implementations must add `resolve`; generated contracts and the two client factories already provide it.

  `@macts/contracts` also exports `resolvingOperationKey(cardinality)`, which names the resource-table field (`'get'` or `'list'`) whose operation a reference of that cardinality resolves as.

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

- 075e994: Expose platform-neutral client composition at `@macts/contracts/client` and reuse it from the SDK. Existing SDK factories, value validation, canonical errors, and reference binding retain their behavior and shared identity.
- dba9328: Add the structured error wire codec. `toWireError` / `toWireErrorEnvelope` encode a structured error as `{ error: { code, message, details } }`, passing details through their per-code schema so only declared fields are sent. `fromWireErrorEnvelope` reconstructs the same canonical class from the code (never from the HTTP status); an unknown code or malformed body becomes a `TransportError` with reason `protocol-mismatch`. Per-code details schemas are exported as `WIRE_ERROR_DETAILS_SCHEMAS`.
- a746285: `bindReference` now accepts only resource keys a reference can resolve through, and generated contracts expose their resource table's type.

  Each generated contract exports the type of its resource table as `<App>Resources` (for example `NotesResources`), and the contract is typed `AppContract<<App>Client, <App>Resources>`. The type declares one entry per resource: each builds on `ResourceDescriptor<Record, Id>` and requires the identifier and the literal `get` and `list` operation ids the resource has. The table value is checked against it with `satisfies`, so the type and the value describe one table. `AppContract` takes the table type as an optional second type argument, so `AppContract<Client>` still means a contract whose table keys are not known. Both `createClient` factories return `Client & ClientBrand<Resources>`, and each generated client interface extends `ClientBrand<<App>Resources>` (for example `interface NotesClient extends ClientBrand<NotesResources>`), so the client's type carries the contract's table, including a variable or parameter annotated `NotesClient`. The brand exists only in the type; a client has no added property under any key, and its members are still exactly the app's operations.

  A generated resource table now lists only the resources that have a `get` or a `list` operation. No reference to any other resource can be resolved, in any form or position, so encoding and decoding already rejected them; they now fail as references to a resource the app cannot resolve references through. Their record interfaces are still exported.

  `MactsRuntime.resolveReference` (and so the `/references/v1` route) rejects both kinds of unresolvable target with `ValidationError` (`VALIDATION_FAILED`, 400), with an issue at the reference's `resource`. A reference to a resource absent from the contract's table fails with "The reference names no resource of the app.", the issue saying the app has no such resource. A reference to a resource in the table that has no `get` (for a single reference) or no `list` (for a collection) fails with an issue naming that missing operation. `InvalidSelectionError` is reserved for an index or range the collection cannot satisfy.

  `bindReference(client, data)` reads the table from the client's type. Data type-checks only when every level names a key that records the operation it resolves through: `get` for a single-object reference, a container, and an identity-collection entry, and `list` for a collection. An identity reference needs a resource with an identifier, of the identifier's type. The result is the bound variant for the data's resource, form and cardinality, with the resource's record and identifier types, so `resolve()` returns `Promise<Record>` or `Promise<readonly Record[]>` instead of `unknown`. Where the position takes any container, a container that is itself a reference a client decoded is accepted as it is. At a parent-scoped position, only an identity reference to the parent is accepted. Clients of a contract with no declared table type accept any reference data, as before. `bindReference` behaves as before at runtime. `@macts/contracts` exports the types involved: `ResourceTable`, `ClientBrand`, `ResolvableResourceKey`, `ResolvableReferenceData` (and its object and collection halves), `ResolvableContainment`, `ResourceRecordOf`, `ResourceIdOf`, and `BoundReferenceOf`.

  Generated HTTP clients' list methods return `Page<T>` from `@macts/contracts` instead of an inline `{ items, nextCursor? }` shape, so their items are read-only arrays.

- 762a1ef: Add `ValueTypes`, the shared constructors for value contracts

  Each constructor composes one value's SDK schema, wire schema, native plan, and codecs from a single call. The constructors are `string`, `boolean`, `integer`, `double`, `date`, `point`, `rectangle`, `rgb`, `enumeration`, `array`, `record` (with `optional` fields), `nullable`, `unknown`, and `none`. Because the three representations come from one composition, they cannot disagree. Record types infer their SDK shape, and `optional` and `nullable` stay independent axes.

  `encode` validates runtime values that bypass static types, such as a cast fractional `Integer`, and reports every issue with its path and code. `decode` restores native SDK values: branded integers, `NaN`, the infinities, and `-0`, `Date`s honoring any offset, and absent optional fields with no own property. An enum member the SDK does not know is rejected with the field path, the received value, and the known members. Dynamic content stays self-describing, so a user record can never be read as a control record.

### Patch Changes

- 7429951: Generated docs now say which item a get, update or delete acts on when several items share the value it looks the item up by.

  When a resource is matched on a property (`byProperty`) that is not claimed unique, the generated HTTP client's get, update and delete docs, the contract client's, and the CLI get's help add one sentence: when several items share the value, the first match in the app's order is used, and the operation does not fail as ambiguous. Nothing is added for a value claimed unique, or for a resource looked up by the app's id or key specifier.

  This adds the sentence to Calendar calendars and Music tracks. It also reaches Automator workflows, Xcode workspace documents and run destinations, and the documents, layers, Notes items and Terminal windows, settings sets and tabs that are now matched by name or tty. No operation, input or capability changes.

  `ResourceDescriptor.id` now says that an identity reference to a resource matched on a property resolves to the first match in the app's order when several objects share the value, and that a key is interpreted by the app.

- 99a59fa: An index selector reference must now carry a container chain of identity references only, each the parent its resource is found within, ending at one the app finds at the application. A container above that, or a selector anywhere in the chain, is rejected.

  A positional resource must now sit under a parent the app finds at the application by its identifier, and every command that selects one of its items must record that parent, as its get does, and declare its integer item parameter. No command with an executable route may record a positional resource as its parent. A manifest that does otherwise is refused by the manifest schema, by generation and by registration.

  For every positional CRUD route, usable hierarchy placement constrains where the command can address its collection. A nested-only collection requires a recorded parent, and any recorded parent must be a declared holder. Application-wide list/create and resources with no usable placement retain their existing scope behavior. Every recorded parent must be an ordinary identified collection resource with a usable unparented get, must not be known nested-only, and must have its required identity parameter supplied. A top-level collection does not waive an explicitly recorded ancestor requirement. Unsupported commands and resource targets contribute no executable route.

  The native codec now converts a reference's container only as an identity reference: an input reference whose container chain holds a selector fails as `InternalError` before the app is touched. In `@macts/core`, `NativeCodecEnvironment.positionOf` now takes the collection the position is counted in, and reads a position only from a specifier that ends at that collection of a container below the application.
