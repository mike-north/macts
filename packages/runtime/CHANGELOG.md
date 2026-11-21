# @macts/runtime

## 0.4.0

### Patch Changes

- Updated dependencies [eb4f199]
- Updated dependencies [ae76d85]
- Updated dependencies [b3f160f]
- Updated dependencies [ae76d85]
- Updated dependencies [76d53b9]
  - @macts/core@0.4.0
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

- 9144fc3: Summarize only declared arguments in audit and approval records, validate input before governance, and record calls rejected by input validation as `invalid-input` audit entries without their arguments.

  The runtime checks a call's permission, then validates its input, and only then applies governance and approval. Validating a paged list's input includes checking any cursor against the operation and the call's other inputs, so a cursor that cannot continue the listing is rejected before governance; only an anchor that has moved is reported during execution, as `COLLECTION_CHANGED`. Audit and approval records summarize the operation's declared parameters from the validated input; any other keys are recorded only as a count, `unknownKeys: N`. A call whose input fails validation after the permission check writes one `invalid-input` audit record with its issue count, is not evaluated by policy, and is never put to an approver.

  In `@macts/core`, `AuditRecord`, `AuditRecordInput` and `SerializedAuditRecord` are now unions discriminated by `decision`: `GovernedAuditRecord` carries `argsSummary` as before, and `InvalidInputAuditRecord` carries `issueCount` and never a summary, reason or approval id. Narrow to a governed decision (one that is neither `'invalid-input'` nor `'permission-denied'`) before reading `argsSummary`. `AUDIT_DECISIONS` and `AuditDecision` gain `'invalid-input'`, so an exhaustive `switch` over decisions needs a new case, and a custom `AuditWriter` now receives records that have no `argsSummary`. `recordInvalidInput()` writes the new record.

- a189125: A get, update or delete now selects its item only by a parameter its manifest command declares.

  The item's identifier is the command's first required parameter other than its parent's (`itemIdentifierParameter` in `@macts/core`). This applies to a resource-scoped get, update or delete, and to a delete at application scope. No generated interface, CLI command or native body supplies an `id` parameter the manifest does not declare.

  Generation refuses a manifest with a command that must select an item and declares no identifier parameter. `generateConsolidatedPackages`, `generateClientPackage`, `generateServerPackage`, `generateHttpClientSdk`, `generateCliPlugin` and `generateSdk` return one error for each such command and no files, and `generateCapabilitiesModule` throws with the same errors. Each error names the app and the command key and says to declare the item's identifier as a required parameter. `unselectableItemCommands` and `itemSelectionProblem` in `@macts/core` report the same commands.

  Registration refuses the same commands. `operationsFromManifest` (`registerManifest`) now also refuses an application-scoped delete that declares no identifier parameter. `operationsFromContract` (`registerContract`) now runs the same check against the manifest, whichever operations the contract covers. Both throw `OperationRegistrationError` naming the app and the command, and register nothing from the app.

  An application-scoped get or update is a plain command call and selects no item, so the rule does not reach it. If a manifest of yours is refused, declare the item's identifier as a required parameter of the command named in the error.

  A runtime from this release refuses an installed `@macts/finder`, `@macts/google-chrome`, `@macts/iterm`, `@macts/mail`, `@macts/music` or `@macts/tv` package from an earlier release as a whole, because those packages still declare the application-level delete. Update them together with `@macts/runtime`.

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

- ee7ba82: Manifest properties can carry nullability and resettability claims with their evidence. Generated contracts make a read field nullable unless the manifest has evidence that it is never empty, and an update field accepts `null` only when the property is resettable. Each generated field documents its nullability and the evidence for it.

  `macts probe <app> --nullability` gathers that evidence read-only from the running app. It records, per field, how often a value was missing, never the values themselves. Probe writes now keep the manifest's formatting.

  A manifest command can set `routeName`, the segment of its public route and default permission, which otherwise is the command key. Two commands that resolve to the same route are rejected when the manifest loads. The HTTP router and the runtime operation registry take each operation's permission from its resolved route.

  Breaking: Notes attachments are identified by `id` instead of `name`, which can be empty. Their route stays `notes.attachments.get`, and the permission stays `notes:attachments:get`.

- b43d6af: MCP tool calls run through the same pipeline as the HTTP API

  `macts --mcp` (stdio) and the MCP daemon (`macts mcp serve` and `macts mcp start`, over HTTP) now run every tool call through the shared runtime: the caller's API key is verified, its permissions are checked, the input is validated against the operation's contract, and this Mac's governance policy is enforced and audited, all before the app is touched. Both register the installed apps through the same host path as `macts --serve`, serve one tool per operation of every installed app beside the capability-discovery tool, and no longer route a call through an HTTP hop to the API server.

  Results and errors use the structured shapes of the HTTP API. A successful call returns one text item holding `{ "result": <wire value> }`; a failed call is a tool result with `isError: true` holding `{ "error": { "code", "message", "details" } }`, with the same code, message, and details as the HTTP API for the same call. An unexpected failure is reported as `INTERNAL`, and its original text is logged on the host, never returned.

  The HTTP daemon governs each request by its own key. Every route except `GET /health` requires `Authorization: Bearer <key>`; each tool call runs under the key of the request that carried it, so two clients with different keys on one daemon are each governed by their own key. A request without a usable key is refused with `401`, `WWW-Authenticate: Bearer`, and the HTTP API's `UNAUTHENTICATED` error, whose `details.reason` is `missing`, `malformed`, `invalid`, `expired`, or `revoked`. `GET /health` now answers `{ "status": "ok", "tools": <count> }` (previously `plugins`).

  Over stdio, `MACTS_API_KEY` is required at startup and is presented on every call; a key revoked during the session is refused on its next call. All of `macts --mcp`'s diagnostics, including the startup report of served, failed, and missing apps, go to stderr, so stdout carries only the protocol.

  **`--disable-api-key-validation` is removed** from `macts --mcp`, `macts mcp serve`, and `macts mcp start`. Passing it is an error that names the replacement, and setting `MACTS_DISABLE_API_KEY_VALIDATION` has no effect beyond a warning on stderr. Instead: create a key with `macts api-key create --name <name> --permission <app:resource:operation>`, then set it as `MACTS_API_KEY` (or send it as a bearer token to the daemon).

  Other behavior changes:
  - `macts mcp serve` starts when no app is installed, serving only the capability-discovery tool (previously it exited with an error).
  - `macts mcp diagnose` reports installed apps under `apps` (`totalLoaded`, `totalFailed`, `apps`, `failed`, `missingHost`) instead of `plugins`, and its health check reports `tools`.
  - The capability-discovery tool answers with compact JSON, and reports a failure as `INTERNAL` instead of returning the error's text.

  `@macts/mcp` API changes:
  - `createDaemon(options)` takes the `adapter` to serve and an optional `verifier` (default: the local key store) in place of `plugins` and `disableApiKeyValidation`.
  - `createDiscoveryTool()` returns an `McpHostTool`.
  - New: `withHostTools(adapter, hostTools)` serves tools that run no operation beside an adapter's operation tools, and refuses duplicate names with `McpToolCompositionError`. `startStdioServer({ adapter, credential })` serves an adapter over stdio. Types `McpHostTool`, `McpHostToolsOptions`, `StdioServer`, and `StdioServerOptions`.
  - Removed: `createMcpServer`, `McpServerOptions`, `requireStartupApiKey`, `authenticateHttpRequest`, `McpAuthErrorCode`, `AuthResult`, `discoverMcpPlugins`, `loadMcpPlugin`, `readMcpPluginCache`, `writeMcpPluginCache`, `invalidateMcpPluginCache`, `PluginDiscoveryResult`, `PluginLoadError`, `CachedPlugin`, and the re-exports of `McpPlugin`, `McpToolDefinition`, and `JsonSchema`.
  - Removed: the `macts-mcp` bin. Use `macts --mcp`.

  `@macts/cli` API changes: `RootCommand` no longer has a `disableApiKeyValidation` property.

  `@macts/cli` no longer ships the `macts-mcp-stdio` bin. Use `macts --mcp`, with the key in `MACTS_API_KEY`, instead. The old bin piped raw stdio into the daemon's socket and never carried a bearer token, so it could not authenticate to the daemon.

  `@macts/runtime` adds a `destination` parameter to `createLogger(options, destination)`, with the `LogDestination` type (`'stdout'`, the default, or `'stderr'`), so a host whose stdout is a protocol channel can log to stderr.

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

- e796f6b: The HTTP server resolves references remotely at `POST /references/v1/resolve`, a top-level namespace beside `/api/v1`. The body is exactly `{ "app", "reference" }`, where `reference` is the reference control record as encoding produces it; any other field is refused with `VALIDATION_FAILED` rather than ignored. The route runs `MactsRuntime.resolveReference` with the request's bearer credential, abort signal, and correlation id, so a resolution is authorized, governed, and audited as the resource's `get` or `list` operation. It answers `200 { result }` or the structured error envelope with the same statuses as the operation routes, and shares their per-client-address limit. `createReferencesAdapter` serves the route for a runtime you compose yourself.

  Every 401 from the HTTP server now carries `WWW-Authenticate: Bearer`.

  Apps named `introspect`, `rpc`, `references`, or `transfers` are refused: `registerManifest` and `registerContract` throw `OperationRegistrationError` and register nothing. The reserved names are exported as `RESERVED_APP_ROUTE_SEGMENTS` from `@macts/runtime`.

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

- 8edbbc2: Add the shared invocation pipeline to `@macts/runtime`

  **`createRuntime({ executor })`** builds a runtime that runs every operation through one ordered pipeline: verify the caller's credential, check the operation's permission, validate the input, enforce governance policy (auditing the decision and, for a held call, asking a human and recording the answer), and only then hand the request to the executor. No step can be skipped, and failures are the structured errors from `@macts/contracts` (`AuthenticationError`, `PermissionDeniedError`, `PolicyDeniedError`, `ApprovalPendingError`, `ApprovalRejectedError`, `ValidationError`, `OperationCancelledError`, `InternalError`). Anything unexpected, such as an unreadable key policy or an audit record that cannot be written, denies the call. An executor failure that is not a structured error becomes an `InternalError` whose message does not repeat the underlying failure.
  - `runtime.registerManifest(manifest)` registers every operation a manifest exposes, with the same ids and permissions as the RPC routes. `runtime.registerContract(contract, manifest)` registers a generated contract's operations and refuses any whose permission or target disagrees with the manifest, so a stale or altered package cannot widen what a key authorizes. Registering the same operation id twice is refused.
  - `createBearerCredential(token)` wraps an API key so it never appears in logs, errors, `JSON.stringify`, or `util.inspect`. Only `reveal()` returns it.
  - `createKeyStoreVerifier()` verifies macts API keys against the local key store and reports failures as `missing`, `malformed`, `invalid`, `expired`, or `revoked`.
  - The executor is supplied at construction, so any implementation of `Executor` from `@macts/core` can be wired in.

  `buildCommandSchema` and `buildSchemaRegistry` now live in `@macts/runtime`. `@macts/api/server` still re-exports them, and `@macts/api` no longer depends on `zod` directly.

- 5f49d6f: `MactsRuntime.invoke` now validates every operation result against the operation's output contract before returning it, as `resolveReference` already did, whichever executor produced it. A result that does not match fails with `UnexpectedValueError` (`UNEXPECTED_VALUE`, HTTP 502) instead of reaching the caller. Previously `invoke` returned whatever the executor produced, so a custom executor's malformed result reached HTTP and MCP callers unchecked.

  The operation has already run when its result is checked, so it may have changed the app. The error message says so: "The "<operation>" operation ran in the app, but its result does not match its contract; do not assume it had no effect." Do not retry a create or a send on the assumption that nothing happened. The error's issues give a path into the result, a code, and a message built from the contract's expectations (for example `Expected one of "mint" | "worn".`); they never repeat a value from the result, which may be user content. Undeclared keys are counted, not named, and a path into dynamic content (an `unknown` field) stops at its `record` envelope, so the keys of a user record are never named. Each mismatch is also logged at warn level with the operation, the executor's provider, and the same issues, never the result. `resolveReference` reports a mismatch the same way, with "to resolve a reference" after "ran in the app".

  An operation whose output plan is `passthrough`, such as every operation registered with `registerManifest`, has no wire encoding and is not checked, on `invoke` or on `resolveReference`. `resolveReference` previously checked such results; it no longer does. Its check that an identity collection's result holds one record per entry still applies to every plan.

- 62f30ba: Add `@macts/runtime` and store API keys with Node's built-in SQLite

  **`@macts/runtime`** is a new package for the Mac-side state and checks that every macts surface shares. It holds:
  - **API keys**: minting, verification, revocation, and the on-disk key store, including per-key governance policies. `closeKeyStore()` releases the store's database for a graceful shutdown.
  - **Governance loading**: the active host policy, the configured approval provider, per-key policy resolution, and the `GovernanceContext` a call is enforced against, with `resolveGovernanceForRequest`.
  - **Shared host state**: `getMactsHome()` and the process-wide logger (`getLogger`, `setLogger`, `createLogger`).

  The HTTP server, the MCP server, and the CLI's `api-key` commands now all use it. `@macts/mcp` no longer depends on `@macts/api`.

  **The key store uses Node's built-in `node:sqlite`.** Installing macts no longer builds or downloads a native addon. Existing key databases open unchanged. Node.js **22.13.0** or later is now required, because it is the first release that loads `node:sqlite` without a flag. On Node versions that still label SQLite experimental, macts keeps that one-time notice off stderr and leaves every other warning visible.

  **Breaking for direct importers of `@macts/api`:**
  - The `@macts/api/keys` entry point is removed. Import key management from `@macts/runtime` instead.
  - `@macts/api` and `@macts/api/server` no longer re-export key management, the logger, governance policy and approval loading, or the governance context types. Import them from `@macts/runtime`. `requirePolicy` and the HTTP response types stay in `@macts/api`.

  **Logging no longer requires `pino-pretty`.** Outside production the logger pretty-prints only when `pino-pretty` is installed, and otherwise falls back to structured JSON. Before, the first log line crashed any installed CLI or MCP server.

- fb9a0a1: The runtime resolves references. `MactsRuntime.resolveReference(app, reference, context)` takes a reference in wire form (the `{"reference": …}` control record) and resolves it as a call of the referenced resource's `get` operation (a single reference) or `list` operation (a collection reference). It needs that operation's permission, is governed, approved, and audited exactly like a direct call of it, validates the reference against the app contract's resource table, and validates the result against the operation's output contract. A container's permission is not required, because containers only locate the target. A reference to a resource absent from the contract's resource table fails with `ValidationError` ("The reference names no resource of the app."), and so does one whose resource has no such operation, with an issue at the reference's `resource` naming the missing operation. `InvalidSelectionError` is for an index or range the collection cannot satisfy. An app now has at most one registered contract, and `registerContract` refuses a second contract for the same app. `registerContract` also refuses a contract whose resource table records a `get` or `list` operation that is not one of its operations targeting that resource. For an identity collection, the result must hold exactly one record per entry, so an entry is never silently dropped.

  The `Executor` interface in `@macts/core` gains a required `resolve(request: ResolutionRequest)` method, which resolves a validated reference into the record or records it denotes. Custom executors must implement it. To migrate, add a `resolve` method; one that does not support references can return a rejected promise with `InternalError`, as the native macOS executor does.

  `TargetNotFoundError` details in `@macts/contracts` can carry `entryIndex`, the zero-based position of the identity-collection entry whose target no longer exists.

  `@macts/cli`: the host's built-in test executor implements the new `resolve` method.

- b8a7587: Create typed clients from an app's contract, remotely or on this Mac, under this Mac's governance

  **`@macts/sdk`** now has two entry points with the same `createClient(app, options)` factory. Each takes an app's contract (app packages expose it at the `/contract` subpath) and returns that app's typed client:
  - **`@macts/sdk`**: `createClient(app, { token, url, fetch? })` runs operations on a macts service over HTTP. Inputs are validated before anything is sent (`ValidationError`), results are validated on the way back (`UnexpectedValueError`), and service errors come back as the same canonical classes a local call throws. Aborts become `OperationCancelledError`, and an unreachable service or unusable response becomes `TransportError`. The token is sent only in the `Authorization` header and never appears in an error. This entry point never loads the Mac-side runtime, so it runs anywhere Node runs.
  - **`@macts/sdk/local`**: `createClient(app, { token, governance?, executor? })` runs operations in process on this Mac, through the same pipeline the service runs: token verification, permission checks, governance, and validation. A contract whose permissions disagree with its manifest is refused on the first call.
  - Both entry points re-export everything from `@macts/contracts` (error classes, value types), so `instanceof` works across them and application code imports only `@macts/sdk`.
  - `resolveClientOptions()` reads `MACTS_API_KEY` and `MACTS_API_URL` and returns `{ token, url }` for `createClient`.
  - Node.js 22.13.0 or later is required.

  **Breaking:** `createMactsClients`, `MactsClients`, the re-exported per-app client types, `resolveConnectionOptions`, and `MactsConnectionOptions` are removed, along with the 35 optional app peer dependencies. `@macts/sdk` no longer fails to import when app packages are missing ([#118](https://github.com/mike-north/macts/issues/118)). Create each app's client from its contract instead, and install the app packages a script uses. `resolveClientOptions()` replaces `resolveConnectionOptions()` and reads the same `MACTS_API_KEY` and `MACTS_API_URL`. Method names, arguments, and results are unchanged:

  ```typescript
  // Before: one map of every app's client, configured from the environment.
  import { createMactsClients } from '@macts/sdk'

  const m = createMactsClients()
  const calendars = await m.calendar.calendars.list()

  // After: one client per app, created from that app's contract.
  import { createClient, resolveClientOptions } from '@macts/sdk'
  import { calendarContract } from '@macts/calendar/contract'

  const calendar = createClient(calendarContract, resolveClientOptions())
  const calendars = await calendar.calendars.list()
  ```

  **`@macts/runtime`** adds `loadHostGovernance()`, the governance this Mac enforces when none is supplied: the policy file and approval provider under `MACTS_HOME`, each key's own policy, and an audit log at `<macts-home>/governance/audit.jsonl` (`getAuditLogPath()`). A missing policy file means the default policy. A malformed or unreadable policy or approval file denies every call that passes the permission check with `InternalError` and never falls back to allowing everything; a caller without the permission is still answered `PermissionDeniedError`. `createRuntime({ governance })` now also accepts a loader such as `loadHostGovernance`, which runs once, on the first call that reaches governance or needs the audit log.

  **Breaking:** `createRuntime` now requires `governance`. Omitting it used to mean an allow-all policy with no audit log; now it is a type error, so a host can never run calls under governance it forgot to supply. Pass `loadHostGovernance` to enforce this Mac's governance, or `{ policy: ALLOW_ALL_POLICY }` to state that nothing is restricted.

  **`@macts/api`**: `createServer`, `createMultiServer`, and `createApp` now enforce `loadHostGovernance()` when no `governance` option is given, instead of an allow-all policy with no audit log. Every governed call is now recorded in the audit log under `MACTS_HOME`. Pass `governance` explicitly to enforce something else.

- 832e1ad: A key's stored grant can no longer be edited after the key is issued: to narrow a key, set its policy with `setKeyPolicy`; to change its grant, revoke it and issue a new one. `createApiKey` is now the only way to store a key, and it stores exactly the grant it signed into the token; `addKeyMetadata` is no longer exported. `updateKeyMetadata` now takes a `KeyMetadataUpdate`, which allows only `name`: any other `ApiKeyMetadata` field (`id`, `permissions`, `originalPermissions`, `expiresAt`, `revoked`, `createdAt`, `keyPrefix`) is a type error, including in a `Partial<ApiKeyMetadata>`, and throws a `TypeError` at runtime, leaving the record unchanged; revoke with `revokeKey`. `saveKeyMetadata` is removed; use `createApiKey`, `revokeKey` and `deleteKeyMetadata`. The permissions and expiry that `macts api-key list` shows for a key therefore match the grant `createApiKey` signed for it. Records that earlier versions changed through `updateKeyMetadata` or `saveKeyMetadata` are left as they are.
- 5869dfc: Manifest-registered operations now reject input keys that are not declared parameters, as contract-registered operations already do.

  An operation registered with `registerManifest` (in `@macts/api`, every app passed to `createApp` as a manifest) accepts exactly its command's declared parameters. A call with any other key fails input validation with `VALIDATION_FAILED` (HTTP 400), with one issue at the input itself. As for any input that fails validation after the permission check, the call writes one `invalid-input` audit record, is not evaluated by policy, is never put to an approver, and does not run. Clients that sent extra keys to a manifest-served operation now receive this validation error; send only the operation's declared parameters.

  A resource-scoped get, update or delete whose manifest command declares no identifier parameter (no required parameter other than its parent's) is rejected at registration: `registerManifest` throws `OperationRegistrationError` naming the app and the command, and registers nothing from the app. Such a get or update could not be called once undeclared keys are rejected, and such a delete selects no item: it calls the app's delete with no target.

  Breaking change in `@macts/system-events`: the `diskItems.delete` operation (`system-events.diskItems.delete`) is removed, because it did not target the disk item it named. It took an `id` but called System Events' delete with no target. The contract client's `diskItems.delete(id)`, the HTTP client's `DiskItemResourceClient` and `SystemEventsClient.diskItems`, and the capability entry are gone, and the System Events manifest no longer declares the command. A delete that targets one disk item will be added once disk items can be selected by an identifier. No other shipped command is affected.

  A list registered from a manifest does not page, so it does not accept `pageSize` or `cursor`. Lists registered from a contract page as before.

  `buildCommandSchema` and `buildSchemaRegistry` are unchanged and still let undeclared keys through; the runtime no longer validates operation input with them.

- a746285: `bindReference` now accepts only resource keys a reference can resolve through, and generated contracts expose their resource table's type.

  Each generated contract exports the type of its resource table as `<App>Resources` (for example `NotesResources`), and the contract is typed `AppContract<<App>Client, <App>Resources>`. The type declares one entry per resource: each builds on `ResourceDescriptor<Record, Id>` and requires the identifier and the literal `get` and `list` operation ids the resource has. The table value is checked against it with `satisfies`, so the type and the value describe one table. `AppContract` takes the table type as an optional second type argument, so `AppContract<Client>` still means a contract whose table keys are not known. Both `createClient` factories return `Client & ClientBrand<Resources>`, and each generated client interface extends `ClientBrand<<App>Resources>` (for example `interface NotesClient extends ClientBrand<NotesResources>`), so the client's type carries the contract's table, including a variable or parameter annotated `NotesClient`. The brand exists only in the type; a client has no added property under any key, and its members are still exactly the app's operations.

  A generated resource table now lists only the resources that have a `get` or a `list` operation. No reference to any other resource can be resolved, in any form or position, so encoding and decoding already rejected them; they now fail as references to a resource the app cannot resolve references through. Their record interfaces are still exported.

  `MactsRuntime.resolveReference` (and so the `/references/v1` route) rejects both kinds of unresolvable target with `ValidationError` (`VALIDATION_FAILED`, 400), with an issue at the reference's `resource`. A reference to a resource absent from the contract's table fails with "The reference names no resource of the app.", the issue saying the app has no such resource. A reference to a resource in the table that has no `get` (for a single reference) or no `list` (for a collection) fails with an issue naming that missing operation. `InvalidSelectionError` is reserved for an index or range the collection cannot satisfy.

  `bindReference(client, data)` reads the table from the client's type. Data type-checks only when every level names a key that records the operation it resolves through: `get` for a single-object reference, a container, and an identity-collection entry, and `list` for a collection. An identity reference needs a resource with an identifier, of the identifier's type. The result is the bound variant for the data's resource, form and cardinality, with the resource's record and identifier types, so `resolve()` returns `Promise<Record>` or `Promise<readonly Record[]>` instead of `unknown`. Where the position takes any container, a container that is itself a reference a client decoded is accepted as it is. At a parent-scoped position, only an identity reference to the parent is accepted. Clients of a contract with no declared table type accept any reference data, as before. `bindReference` behaves as before at runtime. `@macts/contracts` exports the types involved: `ResourceTable`, `ClientBrand`, `ResolvableResourceKey`, `ResolvableReferenceData` (and its object and collection halves), `ResolvableContainment`, `ResourceRecordOf`, `ResourceIdOf`, and `BoundReferenceOf`.

  Generated HTTP clients' list methods return `Page<T>` from `@macts/contracts` instead of an inline `{ items, nextCursor? }` shape, so their items are read-only arrays.

### Patch Changes

- 7429951: An identifier other than the class's dictionary id must now declare how it is looked up.

  An identifier with no `targeting` is looked up with the app's id specifier (`byId`). That finds an item only by the class's dictionary id, the property the app's scripting dictionary declares with code `ID  `, whatever the property is named. Calendar's event `uid` carries that code and keeps the default. Any other identifier, such as a document's `name`, must declare its targeting, whether or not the class also has an `id`: usually `byProperty` or `byKey`. An explicit `byId` is accepted as the manifest's own claim that the app's id specifier finds the item by that property. A property with no code never qualifies. The rule judges the resource's primary identifier with what it inherits from its superclasses.

  Generation refuses a manifest with such an identifier. `generateConsolidatedPackages`, `generateClientPackage`, `generateServerPackage`, `generateHttpClientSdk`, `generateCliPlugin` and `generateSdk` return one error for each such resource and no files, and `generateCapabilitiesModule` throws with the same errors. Each error names the app, the resource and the identifier property, and says to declare its targeting. `untargetedIdentifiers` and `identifierTargetingProblem` in `@macts/core` report the same resources.

  Registration refuses the same manifests. `operationsFromManifest` (`registerManifest`) and `operationsFromContract` (`registerContract`) throw `OperationRegistrationError` naming the app, the resource and the property, and register nothing from the app.

  If a manifest of yours is refused, add `targeting: byProperty` to the identifier the error names, to match items on that property, or `targeting: byKey` if the app looks items up by that value as a key.

- 7aed949: A list now returns bounded pages only when the app was seen to read the list's items a page at a time. Music's playlists list failed on every call, because Music rejects that kind of read. It now returns every playlist again.

  These lists stop paging: `music.playlists.list`, `photos.mediaItems.list`, `shortcuts.shortcuts.list`, `automator.automatorActions.list`, `xcode.projects.list`, `xcode.schemes.list`, `omniplan.scenarios.list`, and the Microsoft Edge `windows`, `tabs`, `bookmarkFolders` and `bookmarkItems` lists. Each one loses its `pageSize` and `cursor` inputs: the SDK method no longer takes a page argument, the CLI command no longer takes `--page-size` or `--cursor`, and the capability listing no longer shows either input. The list returns its whole collection as one page, with no `nextCursor`. Callers that pass `pageSize` or `cursor` to one of these lists now get a validation error, so remove those inputs.

  These lists still page, because each passed the check: Contacts people, groups, email addresses, phone numbers and addresses; Notes attachments; Photos albums and folders; Reminders lists, reminders and accounts; and Shortcuts folders.

  A manifest resource records the check in a new `rangeRead` field: `supported: true` or `false`, with evidence of the app version, macOS version and time it was checked, plus the error numbers when the check failed. A list pages only when its resource's primary identifier is claimed unique and its resource records `rangeRead.supported: true`. A resource with no `rangeRead`, or with `supported: false`, has lists that return their whole collection. `RangeReadEvidenceSchema` and `ResourceRangeReadSchema` are exported from `@macts/core`.

- d393e28: API keys with no stored record are now refused, so deleting a key removes its access immediately in the process that deleted it, and within a few seconds elsewhere. Validation reports such a key with the new `UNKNOWN_KEY` error code; the HTTP and MCP surfaces answer it like any other key that cannot be verified (`UNAUTHENTICATED`, reason `invalid`, HTTP 401 with `WWW-Authenticate: Bearer`). The new `getKeyRecordStatus` returns `'active'`, `'revoked'`, or `'missing'` (`KeyRecordStatus`); `isKeyRevoked` keeps its meaning (a stored record marked revoked) and is deprecated in its favour.
- Updated dependencies [7cb8bc4]
- Updated dependencies [7cb8bc4]
- Updated dependencies [8edbbc2]
- Updated dependencies [361b04c]
- Updated dependencies [89168af]
- Updated dependencies [e569256]
- Updated dependencies [c945d04]
- Updated dependencies [c8dd396]
- Updated dependencies [127d864]
- Updated dependencies [c5a4690]
- Updated dependencies [a18ee4b]
- Updated dependencies [686212a]
- Updated dependencies [7cb8bc4]
- Updated dependencies [9144fc3]
- Updated dependencies [a189125]
- Updated dependencies [2a00978]
- Updated dependencies [7429951]
- Updated dependencies [7429951]
- Updated dependencies [16cda4d]
- Updated dependencies [e0d2969]
- Updated dependencies [2a00978]
- Updated dependencies [2a00978]
- Updated dependencies [62a95dd]
- Updated dependencies [7400f3b]
- Updated dependencies [87985bb]
- Updated dependencies [80fad3c]
- Updated dependencies [915effc]
- Updated dependencies [ee7ba82]
- Updated dependencies [0dd1855]
- Updated dependencies [9ddbb58]
- Updated dependencies [261a888]
- Updated dependencies [eb51c54]
- Updated dependencies [3885b38]
- Updated dependencies [7ac69f1]
- Updated dependencies [f9d86f8]
- Updated dependencies [ed3bf17]
- Updated dependencies [c4717eb]
- Updated dependencies [862bf2d]
- Updated dependencies [e2c7efc]
- Updated dependencies [7aed949]
- Updated dependencies [ead44ad]
- Updated dependencies [bd34a91]
- Updated dependencies [aadc2fe]
- Updated dependencies [8c4faef]
- Updated dependencies [99a59fa]
- Updated dependencies [1cfc8fd]
- Updated dependencies [e319917]
- Updated dependencies [20e7083]
- Updated dependencies [36942f9]
- Updated dependencies [5033b73]
- Updated dependencies [d393e28]
- Updated dependencies [3463be6]
- Updated dependencies [e6214e2]
- Updated dependencies [dae51a7]
- Updated dependencies [fb9a0a1]
- Updated dependencies [fe1c06c]
- Updated dependencies [f717527]
- Updated dependencies [075e994]
- Updated dependencies [dba9328]
- Updated dependencies [a746285]
- Updated dependencies [b49af54]
- Updated dependencies [62a95dd]
- Updated dependencies [762a1ef]
  - @macts/core@0.3.0
  - @macts/contracts@0.3.0
