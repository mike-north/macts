# @macts/cli

## 0.4.0

### Patch Changes

- b3f160f: Complete a selected reminder by setting its completed property, using the reminder update permission. JSON errors retain their structured code and details.
- 6ba1f10: Write background MCP server diagnostics to `mcp.log` under `MACTS_HOME`, and show its location in status and diagnostics. Fix background server startup from the packaged CLI.
- Updated dependencies [eb4f199]
- Updated dependencies [ae76d85]
- Updated dependencies [b3f160f]
- Updated dependencies [ae76d85]
- Updated dependencies [76d53b9]
  - @macts/core@0.4.0
  - @macts/api@0.4.0
  - @macts/mcp@0.4.0
  - @macts/runtime@0.4.0
  - @macts/contracts@0.4.0

## 0.3.0

### Minor Changes

- c945d04: Breaking change: list operations return bounded pages.

  Every list output changed from an array to a page, `{ items, nextCursor? }` (`Page<T>` and `t.page(item)` in `@macts/contracts`). Lists whose items have an identifier the manifest claims unique take two optional inputs, `pageSize` and `cursor`. A page holds at most `pageSize` items: 25 by default and at most 100, the same on every transport. A page size of zero, below zero, not an integer or above 100 is rejected, never clamped. When more items remain, the page carries a `nextCursor`; send the same inputs again with it as `cursor` to read the next page. The cursor is opaque. Paging bounds the size of each call. It bounds the latency of each call only for lists whose pages are read by range, which is most of them: a list read by column costs what its whole collection costs per page (see the entry on how each list reads its pages). Paging does not make a full listing cheaper in total.

  Every other list takes neither input and returns its whole collection as one page with no `nextCursor`: a page is anchored on the identifier of the item before it, which only a unique identifier can do. Uniqueness is opt-in, from evidence: a manifest identifier records `unique: true` (or `unique: false`) with `evidence.unique` saying where the claim comes from, and the capability registry's input schemas show the paging inputs for exactly the lists that page. Contacts lists (people, groups, and a person's emails, phones and addresses) page, because Contacts describes each of those identifiers as unique. Music's playlist list pages. Its track list does not: a playlist can hold the same song more than once, and both entries are expected to share one persistent ID. Calendar event and calendar lists do not page: recurring events share a uid, and calendar names can repeat. `listOperationPages` in `@macts/core` is the one rule every surface uses, and the runtime refuses a contract whose list takes the paging inputs when the manifest says it does not page, or the reverse. Resolving a collection reference is not paged: it still returns the full array of records.

  Each surface takes the paging inputs from the contract. Generated SDK list methods take a trailing `page` argument (`list(listId, { pageSize, cursor })`) and return `Page<T>`. HTTP and MCP callers send `pageSize` and `cursor` in the input. When more items remain, MCP adds a second text block after the result, saying how many items the page holds and how to read more; the first block is always the JSON result. Generated CLI list commands take `--page-size` and `--cursor` and print how to see the next page. App parameters named `pageSize` or `cursor` on a list operation are now a generation error.

  There is a new error, `COLLECTION_CHANGED` (`CollectionChangedError`, HTTP 409, no details). It replaces `UnexpectedValueError` for a collection that changed while it was being read. The same request is correct and can be retried, from the first page if it was paged. A cursor whose item has since moved or been deleted fails this way. A malformed cursor, or one sent to another operation or with other inputs, is a validation error at `cursor`. Audit records and logs record only that a cursor was presented, never its contents.

- c8dd396: Permissions can now name camelCase resources and operations

  The resource and operation segments of a permission are camelCase (`photos:mediaItems:list`, `iterm:app:splitVertically`) or `*`. The app segment is unchanged. Before this, 129 of the 473 route permissions failed the format and could not be granted by any key. Dashes and underscores are no longer allowed in the resource and operation segments; no shipped manifest used them. Matching is still exact and case-sensitive.

  A denied call whose key holds a grant that differs from the required permission only in letter case now gets a hint naming both and the permission to grant. `createApiKey` rejects a malformed permission with the rule and the closest valid permissions, and accepts `knownPermissions` to also reject a permission that differs from a real one only in case (`PermissionCaseMismatchError`). `macts api-key create` and `macts permissions expand` do the same against the app's manifest, from `--manifest` or the discovered manifests directory, and warn on stderr about a well-formed permission no known route requires, saying so explicitly when the manifest's permissions map lists it but no route requires it yet. `@macts/core` adds `suggestPermissions`, `listKnownPermissions`, `findCaseOnlyMismatch`, `explainInvalidPermission`, and `PERMISSION_FORMAT_DESCRIPTION`.

- 2a00978: The generator no longer emits an HTTP API plugin or an MCP plugin into server packages. `@macts/core` drops `generateMcpPlugin`, `createMcpGeneratorContext`, `generateApiPlugin`, `generateAllHttpPackages` and their option and result types (`McpGeneratorContext`, `CreateMcpContextOptions`, `GeneratedMcpPlugin`, `GeneratedTool`, `GeneratedToolFile`, `ApiPluginGeneratorOptions`, `GenerateApiPluginResult`, `GenerateAllOptions`, `GenerateAllResult`). `generateServerPackage` now emits a contract-only package, and every generated contract descriptor carries `inputJsonSchema`. `JsonSchema` stays exported, now alongside the capability types that use it, and capability input schemas and MCP tool names are unchanged.

  `macts generate --target server` writes the contract-only server package.

- 2a00978: Generated packages now record the files the generator emitted, in `.macts-generated.json`, and regenerating deletes any of them it no longer emits, so removing an operation or a resource from a manifest leaves no stale files behind. Files the generator never emitted, such as a changelog or handwritten tests, are kept. A package without a record yet takes the files carrying the generator's "do not edit" notice as its previous set; this applies only to a directory holding a `package.json`, and never reaches into a nested package, so an output directory that holds other packages loses none of their files.

  `@macts/core` adds `writeGeneratedPackage`, which writes a package, prunes what it no longer emits and writes its record, along with `OWNED_OUTPUT_RECORD_FILE` and the `GeneratedPackageWriteResult` and `OwnedOutputSource` types (`record`, `headers`, or `none` for a directory that is not yet a package). `macts generate` uses it for every target and names each deleted file on stdout.

- a4c3502: macts serves each app from its server package's contract

  `macts --serve`, `macts --mcp`, and the MCP daemon (`macts mcp serve` and `macts mcp start`) now load each installed app from its server package, `@macts/<app>-server`, which exports the app's contract. The server package is what you install to serve an app (`macts mcp install <app>`), and the app package it depends on comes with it.

  Server packages installed by an older macts do not export the contract and are not served. The startup report names each one with the command that fixes it, for example:

  ```text
  Not serving 1 app(s) that failed to register:
    notes: @macts/notes-server is from an older macts and does not export its app's contract. Reinstall it with `macts mcp install notes`.
  ```

  Every other installed app is still served. `macts mcp diagnose` reports the same reason under `apps.failed`.

  `@macts/types` is no longer published. Its MCP plugin types described generated MCP tool definitions that no longer exist: macts serves every app from its contract. Remove any dependency on it.

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

- 8c4faef: App permission groups now list only permissions that some operation requires.

  The permission groups in 14 app manifests listed 122 permissions that no operation required, such as `microsoft-edge:tabs:update` (Edge has no tab update operation) and `calendar:calendars:delete`. Granting one authorized nothing. They are removed from the permission groups that discovery and the generated packages publish, and a test over every shipped manifest keeps them from coming back. An operation's permission returns to its group together with the operation's command.

  Grants of the removed permissions authorized nothing before and still authorize nothing. `macts api-key create` still accepts one, with or without `--manifest`, and warns on stderr that no route requires it, appending `Closest: "…"` when a permission a route requires is close. For example, `omniplan:tasks:update` names `omniplan:tasks:create`. Before, with `--manifest` it failed with `Resource "…" not found in permissions mapping` or `Operation "…" not found`. Without `--manifest`, a `create` or `delete` permission was accepted silently.

  `createApiKey` in `@macts/runtime` grants a well-formed fine-grained permission that the permissions map does not list as written, and still expands coarse and wildcard permissions through the map. `expandPermissions` and `expandCoarsePermission` in `@macts/core` take a new option, `{ unmapped: 'keep' | 'reject' }`, which `createApiKey` sets to `keep`. The default stays `reject`, so `macts permissions expand` still fails for such a permission.

- e319917: Generated SDKs no longer expose properties that the app cannot provide at runtime.
  - A manifest property can now carry an evidence-backed `unsupported` marker. Every generated surface (contract, SDK, CLI, MCP tools, HTTP routes) omits a marked property.
  - `macts probe --nullability` reports a defect when every read of a property fails. It also reports a defect when the observed value kind (date, number, boolean, string, record, list, reference) contradicts the declared type, and suggests the marker where it fits.
  - Nested resources are now sampled from evenly spaced parents within a bounded scan, so deep collections such as calendar event alarms yield items instead of hitting the time limit. The probe record gains `parentsScanned`.
  - **Breaking SDK field changes:**
    - Finder: `Container.expandable`, `expanded`, `completelyExpanded`, `containerWindow` removed. `ApplicationFile.suggestedSize`, `minimumSize`, `preferredSize`, `opensInClassic` removed. `DocumentFile.id` removed. `Package.id` is now a string.
    - Calendar: `Calendar.calendarIdentifier` removed. Calendars are targeted by name. `Event.stampDate` is now nullable, because a wider sample found events without it.
    - Notes: `Folder.container` removed.
    - Reminders: `allDayDueDate` is renamed `alldayDueDate` and is nullable. `List.color` is now a string.

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

- dbab1db: `macts --serve` serves every installed app, validated against each app's contract

  **`@macts/cli`**
  - **Fixed:** `macts --serve` previously served only Calendar, from a manifest file it searched for in a few fixed places, and failed to start when it found none. It now serves every app whose server package is installed in the macts plugins directory (`macts mcp install <app>`), registered from that app's generated contract.
  - Inputs are validated against each app's contract, which is stricter than before: an unknown field, or a value of the wrong type, is now rejected with 400 `VALIDATION_FAILED` before anything runs. Errors keep the same `{ "error": { code, message, details } }` envelope.
  - At startup, `macts --serve` lists the apps it serves, any installed app that failed to load (with the reason), and any app installed without its server package (with the command that installs it). With no apps installed it still starts, says so, and serves no operations.

  **`@macts/api`**
  - `createServer`, `createMultiServer`, and `createApp` gain a `register` option, which registers apps from their generated contracts on the server's runtime before its routes are built: `register: (registrar) => registrar.registerContract(contract, manifest)`. Each contract is checked against its manifest, and its operations validate inputs against the contract's wire schemas. The registrar type is exported as `AppRegistrar`.
  - Manifest registration (the `manifests` parameter) remains, as passthrough: operations carry no contract value types, and inputs are validated by each command's request schema.
  - `/health` and `/api/v1` list every registered app, whether it was registered from a contract or a manifest.

### Patch Changes

- 0dd1855: A manifest resource can now say which class it inherits, and it then gets what that class declares.

  A resource whose class in the app's dictionary inherits another class records `inherits: { resource, evidence }`. `resource` is the key of the superclass in the same manifest, and the evidence is the superclass's name as the dictionary writes it. Every reader of a manifest sees the resource with what it inherits:
  - each property of its ancestors that it does not declare, nearest first, with its code, native spelling, any `unsupported` marker, and every claim the ancestor records about it (nullability and resettability, whatever their evidence);
  - the nearest ancestor's identifiers, when it declares none, with their uniqueness claims, targeting and runtime property.

  A resource replaces an inherited claim with its own evidence through `inheritedClaims.<property>`, a claims-only overlay that states a nullability claim, a resettability claim or an `unsupported` marker without redeclaring the property. Each claim the overlay states replaces the inherited one, the others stay inherited, and the resource's own subclasses inherit the result. An overlay on a resource with no superclass, on a property the resource declares itself, on a property no ancestor declares, or with no claim, is a manifest error. A property the resource declares replaces the inherited one whole. Commands, the hierarchy and collection-level fields are not inherited. A superclass the manifest does not declare, and a chain of superclasses that loops, are manifest errors. A resource's own rules hold for what it inherits: an inherited property whose type the manifest marks unsupported is an error on the resource that declares it.

  `macts probe --nullability` writes a claim about an inherited property as the resource's overlay. `writeNullabilityResults` reports each claim it had nowhere to write in `notWritten`, and the command names each one on its own line.

  `Resource` gains the optional `inherits` and `inheritedClaims` fields, described by the new `ResourceInheritsSchema` and `PropertyClaimsSchema`. `DictionaryTermEvidenceSchema` (and its `DictionaryTermEvidence` type) is the dictionary evidence that both `inherits` and native spellings record.

- fb9a0a1: The runtime resolves references. `MactsRuntime.resolveReference(app, reference, context)` takes a reference in wire form (the `{"reference": …}` control record) and resolves it as a call of the referenced resource's `get` operation (a single reference) or `list` operation (a collection reference). It needs that operation's permission, is governed, approved, and audited exactly like a direct call of it, validates the reference against the app contract's resource table, and validates the result against the operation's output contract. A container's permission is not required, because containers only locate the target. A reference to a resource absent from the contract's resource table fails with `ValidationError` ("The reference names no resource of the app."), and so does one whose resource has no such operation, with an issue at the reference's `resource` naming the missing operation. `InvalidSelectionError` is for an index or range the collection cannot satisfy. An app now has at most one registered contract, and `registerContract` refuses a second contract for the same app. `registerContract` also refuses a contract whose resource table records a `get` or `list` operation that is not one of its operations targeting that resource. For an identity collection, the result must hold exactly one record per entry, so an entry is never silently dropped.

  The `Executor` interface in `@macts/core` gains a required `resolve(request: ResolutionRequest)` method, which resolves a validated reference into the record or records it denotes. Custom executors must implement it. To migrate, add a `resolve` method; one that does not support references can return a rejected promise with `InternalError`, as the native macOS executor does.

  `TargetNotFoundError` details in `@macts/contracts` can carry `entryIndex`, the zero-based position of the identity-collection entry whose target no longer exists.

  `@macts/cli`: the host's built-in test executor implements the new `resolve` method.

- 5f49d6f: The host's built-in test executor answers with values the operations' output contracts admit: an empty list for a list operation, and `TargetNotFoundError` for an operation that needs an existing object.
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
- Updated dependencies [ae5121c]
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
- Updated dependencies [dbab1db]
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
  - @macts/api@0.3.0
  - @macts/mcp@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [2e46b8f]
- Updated dependencies [1d1e53a]
  - @macts/api@0.2.0
  - @macts/core@0.2.0
  - @macts/mcp@0.2.0

## 0.1.0

### Minor Changes

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

- 1472939: **BREAKING BEHAVIOR:** the MCP server now requires a valid API key by default on every transport:
  - **stdio** — set `MACTS_API_KEY` in the environment (e.g. the MCP client's `env` config) before starting the server. Startup fails immediately with an actionable error if the key is missing or invalid.
  - **HTTP (daemon)** — every route except `GET /health` requires `Authorization: Bearer macts_sk_...`.

  Existing installs that don't set `MACTS_API_KEY` (or don't send a bearer token to the daemon) will start failing until a key is created and configured. Create one with:

  ```
  macts api-key create --name <name> --permission <app:resource:operation>
  ```

  A new `--disable-api-key-validation` flag opts back out of this check on `macts --mcp`, `macts mcp serve`, and `macts mcp start` (not recommended; intended for local development or trusted embedding).

  Also new/fixed in this release:
  - New streamable HTTP transport at `/mcp` (the current MCP spec transport), alongside the existing legacy SSE transport (`/sse` + `/message`).
  - Fixed the legacy SSE `POST /message` endpoint, which previously always returned 404.
  - Fixed a teardown bug where restarting the SSE transport left a stale double-started session.

- 4851845: Add MCP daemon server with HTTP/SSE transport and stdio adapter

  **@macts/mcp:**
  - Add HTTP/SSE daemon server for long-running MCP service
  - Support Unix socket (`~/.macts/mcp.sock`) for fast local access
  - Support TCP port for HTTP/SSE remote access
  - PID file management for daemon lifecycle
  - Graceful shutdown with SIGTERM/SIGINT handlers
  - Multi-client support with isolated MCP server instances
  - Tool multiplexing across all loaded plugins

  **@macts/cli:**
  - `macts mcp serve` - Run daemon in foreground
  - `macts mcp start` - Start daemon in background
  - `macts mcp stop` - Stop running daemon
  - `macts mcp status` - Check daemon status (supports --json)
  - `macts mcp diagnose` - Detailed diagnostics for troubleshooting
  - `macts-mcp-stdio` - Fast shell script adapter using socat
    - Connects to daemon via Unix socket for minimal latency
    - Falls back to `macts mcp diagnose` on errors for detailed troubleshooting
    - Gracefully degrades to Node.js mode if socat unavailable

- 6225db2: Add a first-class command to install MCP server plugins and align plugin docs with the real package names.
  - `macts mcp install <app>` installs an app's MCP server plugin (`@macts/<app>-server`) into `~/.macts/plugins/` (overridable via `MACTS_HOME`), where the MCP daemon discovers it. After installing, `macts mcp start` exposes that app's tools to MCP clients. `macts mcp uninstall <app>` and `macts mcp list` round out the flow. CLI plugins (`@macts/<app>`) continue to be managed with `macts plugin install`; the CLI plugin loader still excludes `-server` packages.
  - Replaced references to nonexistent `@macts/cli-*` / `@macts/mcp-*` packages across CLI help, examples, hints, and docs with the real `@macts/<app>` (CLI) and `@macts/<app>-server` (MCP) names. The package generators now default to these consolidated names.

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

- d46ed64: Fix CLI plugins failing to load entirely

  Every `@macts/<app>` plugin package failed to load: the loader resolved the
  plugin's `./cli` subpath with a CJS `require.resolve()`, which only matches
  the `"require"` export condition, but every generated `@macts/<app>` package
  is ESM-only and declares only `"types"`/`"import"` conditions. Resolution
  threw `ERR_PACKAGE_PATH_NOT_EXPORTED` for every plugin, unconditionally,
  before a single command was registered.

  The loader now resolves the `./cli` export itself by reading the installed
  package's `package.json` `exports` map directly (honoring the `"import"`
  condition, with a `"default"` fallback) and dynamically importing the
  resolved file by URL, rather than going through Node's CJS resolver. The
  existing development-mode fallback (plain module resolution when no managed
  plugins directory is present) is unchanged.

  Separately, `bin.ts` no longer decides whether a plugin is "not installed"
  by checking whether its error message contains the substring
  `"Cannot find package"` — a genuinely broken (but installed) plugin can
  produce that same substring, so this silently swallowed real failures and
  made "installed but broken" indistinguishable from "not installed" (users
  saw no warning and no error, just a missing command). `PluginLoadError` now
  carries a structural `reason: 'not-installed' | 'load-error'` field (see the
  new `PluginLoadFailureReason`/`LoadPluginResult` types) that the loader
  determines directly (a missing package directory vs. any other failure), and
  `bin.ts` branches on that field instead of pattern-matching the message.

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

- 8143d36: Fix governance filter applied after --limit slice, causing under-filled results

  Previously, `searchCapabilities` sliced results to `--limit` before governance was applied, so denied capabilities in the top-N left gaps instead of being backfilled from lower-ranked allowed matches. A search for "top 10" could silently return fewer than 10 results when a real policy denied some.
  - Add `governedDiscoverySearch` to `@macts/core` — the correct all-in-one entry point for discovery surfaces: applies governance to the **full** ranked match set, then slices to `limit`. A request for N results now returns N _allowed_ results, with backfilling from lower-ranked capabilities.
  - Add `filter?: GovernanceFilter` option to `SearchCapabilitiesOptions` so `searchCapabilities` can also apply governance before slicing.
  - Update CLI (`macts capabilities search`) and MCP discovery tool to use `governedDiscoverySearch`.
  - Add regression tests: partial-denial-under-limit (verifies backfilling) and all-denied (verifies `governance-blocked` vs `no-match` distinction is preserved).

- 41274b5: Wire the real governance policy into capability discovery (CLI + MCP)

  `@macts/core` now exports a policy-backed `GovernanceFilter` implementation and a policy file loader:
  - **`createPolicyGovernanceFilter(policy)`** — returns a `GovernanceFilter` backed by a parsed `GovernancePolicy`. Translates policy dispositions to discovery dispositions: `allowed` → `allow`, `read-only`/`confirm-first` → `warn` (surface with flag), `forbidden` → `deny`. Uses `findMatchingPolicyRule` to resolve the most specific matching rule per capability's `app:resource:operation` triple; falls back to `policy.defaultDisposition` (fail-closed: `forbidden` by default) when no rule matches.
  - **`PolicyGovernanceFilter`** — the class implementing the filter (exported for `instanceof` checks / extension).
  - **`loadPolicyFromFile(path)`** — reads and validates a governance policy from a JSON file. Returns a discriminated `LoadPolicyResult`: `{ found: false }` when absent (normal — policy is optional), `{ found: true, error, issues? }` when present but invalid, or `{ found: true, policy }` when valid. Never reads `MACTS_HOME` itself; callers supply the absolute path.

  `@macts/cli` now wires the active policy into `capabilities search`, `capabilities inspect`, and the built-in MCP discovery tool:
  - Both CLI discovery surfaces and the MCP discovery tool load `$MACTS_HOME/policy.json` on startup. When the file is present and valid, the policy-backed filter is used; when absent, the existing no-op allow-all behaviour is preserved; when present but invalid, a warning is written to stderr and the filter degrades gracefully to allow-all.

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
- Updated dependencies [1472939]
- Updated dependencies [4851845]
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
  - @macts/mcp@0.1.0
