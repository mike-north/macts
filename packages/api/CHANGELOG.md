# @macts/api

## 0.4.0

### Patch Changes

- Updated dependencies [eb4f199]
- Updated dependencies [ae76d85]
- Updated dependencies [b3f160f]
- Updated dependencies [ae76d85]
- Updated dependencies [76d53b9]
  - @macts/core@0.4.0
  - @macts/runtime@0.4.0
  - @macts/contracts@0.4.0

## 0.3.0

### Minor Changes

- c945d04: Breaking change: list operations return bounded pages.

  Every list output changed from an array to a page, `{ items, nextCursor? }` (`Page<T>` and `t.page(item)` in `@macts/contracts`). Lists whose items have an identifier the manifest claims unique take two optional inputs, `pageSize` and `cursor`. A page holds at most `pageSize` items: 25 by default and at most 100, the same on every transport. A page size of zero, below zero, not an integer or above 100 is rejected, never clamped. When more items remain, the page carries a `nextCursor`; send the same inputs again with it as `cursor` to read the next page. The cursor is opaque. Paging bounds the size of each call. It bounds the latency of each call only for lists whose pages are read by range, which is most of them: a list read by column costs what its whole collection costs per page (see the entry on how each list reads its pages). Paging does not make a full listing cheaper in total.

  Every other list takes neither input and returns its whole collection as one page with no `nextCursor`: a page is anchored on the identifier of the item before it, which only a unique identifier can do. Uniqueness is opt-in, from evidence: a manifest identifier records `unique: true` (or `unique: false`) with `evidence.unique` saying where the claim comes from, and the capability registry's input schemas show the paging inputs for exactly the lists that page. Contacts lists (people, groups, and a person's emails, phones and addresses) page, because Contacts describes each of those identifiers as unique. Music's playlist list pages. Its track list does not: a playlist can hold the same song more than once, and both entries are expected to share one persistent ID. Calendar event and calendar lists do not page: recurring events share a uid, and calendar names can repeat. `listOperationPages` in `@macts/core` is the one rule every surface uses, and the runtime refuses a contract whose list takes the paging inputs when the manifest says it does not page, or the reverse. Resolving a collection reference is not paged: it still returns the full array of records.

  Each surface takes the paging inputs from the contract. Generated SDK list methods take a trailing `page` argument (`list(listId, { pageSize, cursor })`) and return `Page<T>`. HTTP and MCP callers send `pageSize` and `cursor` in the input. When more items remain, MCP adds a second text block after the result, saying how many items the page holds and how to read more; the first block is always the JSON result. Generated CLI list commands take `--page-size` and `--cursor` and print how to see the next page. App parameters named `pageSize` or `cursor` on a list operation are now a generation error.

  There is a new error, `COLLECTION_CHANGED` (`CollectionChangedError`, HTTP 409, no details). It replaces `UnexpectedValueError` for a collection that changed while it was being read. The same request is correct and can be retried, from the first page if it was paged. A cursor whose item has since moved or been deleted fails this way. A malformed cursor, or one sent to another operation or with other inputs, is a validation error at `cursor`. Audit records and logs record only that a cursor was presented, never its contents.

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

- 8edbbc2: Add the shared invocation pipeline to `@macts/runtime`

  **`createRuntime({ executor })`** builds a runtime that runs every operation through one ordered pipeline: verify the caller's credential, check the operation's permission, validate the input, enforce governance policy (auditing the decision and, for a held call, asking a human and recording the answer), and only then hand the request to the executor. No step can be skipped, and failures are the structured errors from `@macts/contracts` (`AuthenticationError`, `PermissionDeniedError`, `PolicyDeniedError`, `ApprovalPendingError`, `ApprovalRejectedError`, `ValidationError`, `OperationCancelledError`, `InternalError`). Anything unexpected, such as an unreadable key policy or an audit record that cannot be written, denies the call. An executor failure that is not a structured error becomes an `InternalError` whose message does not repeat the underlying failure.
  - `runtime.registerManifest(manifest)` registers every operation a manifest exposes, with the same ids and permissions as the RPC routes. `runtime.registerContract(contract, manifest)` registers a generated contract's operations and refuses any whose permission or target disagrees with the manifest, so a stale or altered package cannot widen what a key authorizes. Registering the same operation id twice is refused.
  - `createBearerCredential(token)` wraps an API key so it never appears in logs, errors, `JSON.stringify`, or `util.inspect`. Only `reveal()` returns it.
  - `createKeyStoreVerifier()` verifies macts API keys against the local key store and reports failures as `missing`, `malformed`, `invalid`, `expired`, or `revoked`.
  - The executor is supplied at construction, so any implementation of `Executor` from `@macts/core` can be wired in.

  `buildCommandSchema` and `buildSchemaRegistry` now live in `@macts/runtime`. `@macts/api/server` still re-exports them, and `@macts/api` no longer depends on `zod` directly.

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

- dbab1db: `macts --serve` serves every installed app, validated against each app's contract

  **`@macts/cli`**
  - **Fixed:** `macts --serve` previously served only Calendar, from a manifest file it searched for in a few fixed places, and failed to start when it found none. It now serves every app whose server package is installed in the macts plugins directory (`macts mcp install <app>`), registered from that app's generated contract.
  - Inputs are validated against each app's contract, which is stricter than before: an unknown field, or a value of the wrong type, is now rejected with 400 `VALIDATION_FAILED` before anything runs. Errors keep the same `{ "error": { code, message, details } }` envelope.
  - At startup, `macts --serve` lists the apps it serves, any installed app that failed to load (with the reason), and any app installed without its server package (with the command that installs it). With no apps installed it still starts, says so, and serves no operations.

  **`@macts/api`**
  - `createServer`, `createMultiServer`, and `createApp` gain a `register` option, which registers apps from their generated contracts on the server's runtime before its routes are built: `register: (registrar) => registrar.registerContract(contract, manifest)`. Each contract is checked against its manifest, and its operations validate inputs against the contract's wire schemas. The registrar type is exported as `AppRegistrar`.
  - Manifest registration (the `manifests` parameter) remains, as passthrough: operations carry no contract value types, and inputs are validated by each command's request schema.
  - `/health` and `/api/v1` list every registered app, whether it was registered from a contract or a manifest.

- 5869dfc: Manifest-registered operations now reject input keys that are not declared parameters, as contract-registered operations already do.

  An operation registered with `registerManifest` (in `@macts/api`, every app passed to `createApp` as a manifest) accepts exactly its command's declared parameters. A call with any other key fails input validation with `VALIDATION_FAILED` (HTTP 400), with one issue at the input itself. As for any input that fails validation after the permission check, the call writes one `invalid-input` audit record, is not evaluated by policy, is never put to an approver, and does not run. Clients that sent extra keys to a manifest-served operation now receive this validation error; send only the operation's declared parameters.

  A resource-scoped get, update or delete whose manifest command declares no identifier parameter (no required parameter other than its parent's) is rejected at registration: `registerManifest` throws `OperationRegistrationError` naming the app and the command, and registers nothing from the app. Such a get or update could not be called once undeclared keys are rejected, and such a delete selects no item: it calls the app's delete with no target.

  Breaking change in `@macts/system-events`: the `diskItems.delete` operation (`system-events.diskItems.delete`) is removed, because it did not target the disk item it named. It took an `id` but called System Events' delete with no target. The contract client's `diskItems.delete(id)`, the HTTP client's `DiskItemResourceClient` and `SystemEventsClient.diskItems`, and the capability entry are gone, and the System Events manifest no longer declares the command. A delete that targets one disk item will be added once disk items can be selected by an identifier. No other shipped command is affected.

  A list registered from a manifest does not page, so it does not accept `pageSize` or `cursor`. Lists registered from a contract page as before.

  `buildCommandSchema` and `buildSchemaRegistry` are unchanged and still let undeclared keys through; the runtime no longer validates operation input with them.

### Patch Changes

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
- Updated dependencies [b43d6af]
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
- Updated dependencies [e796f6b]
- Updated dependencies [d393e28]
- Updated dependencies [3463be6]
- Updated dependencies [e6214e2]
- Updated dependencies [dae51a7]
- Updated dependencies [8edbbc2]
- Updated dependencies [5f49d6f]
- Updated dependencies [62f30ba]
- Updated dependencies [fb9a0a1]
- Updated dependencies [b8a7587]
- Updated dependencies [fe1c06c]
- Updated dependencies [f717527]
- Updated dependencies [075e994]
- Updated dependencies [832e1ad]
- Updated dependencies [5869dfc]
- Updated dependencies [dba9328]
- Updated dependencies [a746285]
- Updated dependencies [b49af54]
- Updated dependencies [62a95dd]
- Updated dependencies [762a1ef]
  - @macts/core@0.3.0
  - @macts/runtime@0.3.0
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
- Updated dependencies [2e46b8f]
- Updated dependencies [1d1e53a]
  - @macts/core@0.2.0

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

### Patch Changes

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

- 245273b: Fix RPC get and delete handlers to resolve identifier param name from the manifest

  The `get` branch in the RPC resource command executor hardcoded `id` in the generated
  JXA lookup (`app.<resource>.byId(id)`), causing failures for resources whose identifier
  parameter is declared with any other name (e.g. `name`, `widgetName`). Several apps in
  the current manifests — Notes, Automator, TextEdit, Terminal, Preview, Script Editor,
  Xcode, OmniGraffle — already use `name` as their `get` identifier.

  The `delete` branch was missing entirely and fell through to the generic handler, which
  called `app.delete(...)` instead of the correct `app.<resource>.byId(<identifier>).delete()`.

  Both branches now resolve the identifier variable name from the first required parameter
  declared in the manifest command definition.

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

- cd2860a: Resolve key/secret storage paths from `MACTS_HOME` (then `os.homedir()`), never a cwd-relative `./~/.macts`

  API-key storage previously computed its directory as
  `path.join(process.env['HOME'] ?? '~', '.macts')`. This had two problems:
  - It ignored `MACTS_HOME`, so a custom install put plugins under `MACTS_HOME`
    but the JWT signing secret and `api-keys.db` under `$HOME/.macts` — a silent
    split-brain.
  - When `HOME` was unset (cron, containers, CI, some service managers), the
    `?? '~'` fallback produced a **cwd-relative** `./~/.macts`, writing the
    signing secret (mode `0o600`) and key database wherever the process ran. Since
    that secret signs every API key, a predictable or shared location is an
    auth-bypass risk.

  Storage now resolves its directory the same way plugin paths do — `MACTS_HOME`
  when set, otherwise `~/.macts` via `os.homedir()` — so every macts surface
  agrees on a single, absolute location. Secret-file (`0o600`) and directory
  (`0o700`) permissions are unchanged. The same unsafe `process.env['HOME']`
  pattern in the CLI's serve/manifest lookup and `service` commands has been
  migrated to the same resolution (`os.homedir()` for fixed macOS paths such as
  `~/Library/LaunchAgents`).

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
- Updated dependencies [a68161c]
- Updated dependencies [9a98e47]
- Updated dependencies [c7ac226]
  - @macts/core@0.1.0
