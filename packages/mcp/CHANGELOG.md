# @macts/mcp

## 0.3.0

### Minor Changes

- c945d04: Breaking change: list operations return bounded pages.

  Every list output changed from an array to a page, `{ items, nextCursor? }` (`Page<T>` and `t.page(item)` in `@macts/contracts`). Lists whose items have an identifier the manifest claims unique take two optional inputs, `pageSize` and `cursor`. A page holds at most `pageSize` items: 25 by default and at most 100, the same on every transport. A page size of zero, below zero, not an integer or above 100 is rejected, never clamped. When more items remain, the page carries a `nextCursor`; send the same inputs again with it as `cursor` to read the next page. The cursor is opaque. Paging bounds the size of each call. It bounds the latency of each call only for lists whose pages are read by range, which is most of them: a list read by column costs what its whole collection costs per page (see the entry on how each list reads its pages). Paging does not make a full listing cheaper in total.

  Every other list takes neither input and returns its whole collection as one page with no `nextCursor`: a page is anchored on the identifier of the item before it, which only a unique identifier can do. Uniqueness is opt-in, from evidence: a manifest identifier records `unique: true` (or `unique: false`) with `evidence.unique` saying where the claim comes from, and the capability registry's input schemas show the paging inputs for exactly the lists that page. Contacts lists (people, groups, and a person's emails, phones and addresses) page, because Contacts describes each of those identifiers as unique. Music's playlist list pages. Its track list does not: a playlist can hold the same song more than once, and both entries are expected to share one persistent ID. Calendar event and calendar lists do not page: recurring events share a uid, and calendar names can repeat. `listOperationPages` in `@macts/core` is the one rule every surface uses, and the runtime refuses a contract whose list takes the paging inputs when the manifest says it does not page, or the reverse. Resolving a collection reference is not paged: it still returns the full array of records.

  Each surface takes the paging inputs from the contract. Generated SDK list methods take a trailing `page` argument (`list(listId, { pageSize, cursor })`) and return `Page<T>`. HTTP and MCP callers send `pageSize` and `cursor` in the input. When more items remain, MCP adds a second text block after the result, saying how many items the page holds and how to read more; the first block is always the JSON result. Generated CLI list commands take `--page-size` and `--cursor` and print how to see the next page. App parameters named `pageSize` or `cursor` on a list operation are now a generation error.

  There is a new error, `COLLECTION_CHANGED` (`CollectionChangedError`, HTTP 409, no details). It replaces `UnexpectedValueError` for a collection that changed while it was being read. The same request is correct and can be retried, from the first page if it was paged. A cursor whose item has since moved or been deleted fails this way. A malformed cursor, or one sent to another operation or with other inputs, is a validation error at `cursor`. Audit records and logs record only that a cursor was presented, never its contents.

- 9ddbb58: Serve MCP tools derived from operation contracts, dispatched through the shared runtime

  **`@macts/mcp`** can now serve every operation registered on a `MactsRuntime` as an MCP tool, with no generated tool code. The existing plugin-based server is unchanged.
  - **`createMcpAdapter(runtime, options?)`** derives one tool per registered operation and runs each tool call as one `runtime.invoke`, so MCP calls pass through the same credential, permission, governance, and input checks as the HTTP API and the SDK. `listTools()` returns the tools; `callTool(name, args, context)` handles one call.
  - **`attachMcpAdapter(server, adapter, resolveCredential)`** registers the `tools/list` and `tools/call` handlers on an MCP SDK `Server`. The resolver locates each call's credential in the request context (the startup key for stdio, the per-request bearer for HTTP), and each request's abort signal cancels the operation.
  - **Tool names** come from the operation id: `<app>.<resource>.<operation>` is served as `macts__<app>__<resource>_<operation in snake case>`, for example `macts__calendar__app_reload_calendars`. `toolNameFor(id)` exposes the derivation. Words are split by `splitIdentifierWords`, now exported from **`@macts/core`**, the same split every generated surface uses, so an acronym and its plural stay one word (`listURLs` is `list_urls`).
  - **Input schemas** are the JSON Schema (draft 7) of each operation's wire contract, and are always object schemas. An operation whose contract cannot be represented, or two operations that derive the same tool name, make the adapter refuse to build with `McpToolDerivationError`, naming the operations involved.
  - **Results and errors** use the same shapes as the HTTP API. Success is `{ "result": <wire value> }`; a failure is `isError: true` with `{ "error": { code, message, details } }`. An unexpected failure is a generic `INTERNAL` that never repeats the underlying message, and a call to an unknown tool is an MCP `InvalidParams` protocol error.

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

### Patch Changes

- ae5121c: List the declared parameters of a manifest-registered operation in MCP `tools/list`.

  A tool for an operation registered from a manifest alone used to list its input as a bare JSON record, with no `properties` and no `required`, even though a call is validated against the command's declared parameters. The adapter now renders the input side of the operation's wire contract, so the tool's `inputSchema` lists each declared parameter with its type, the required ones under `required`, and `additionalProperties: false`. Tools for contract-registered operations are unchanged, and capability discovery, which serves the same schemas, follows. An MCP client can now learn from the listing which arguments a manifest-served tool takes, which of them it must send, and that it accepts no others.

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

### Patch Changes

- Updated dependencies [2e46b8f]
- Updated dependencies [1d1e53a]
  - @macts/api@0.2.0
  - @macts/core@0.2.0
  - @macts/types@0.2.0

## 0.1.0

### Minor Changes

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

- 8143d36: Fix governance filter applied after --limit slice, causing under-filled results

  Previously, `searchCapabilities` sliced results to `--limit` before governance was applied, so denied capabilities in the top-N left gaps instead of being backfilled from lower-ranked allowed matches. A search for "top 10" could silently return fewer than 10 results when a real policy denied some.
  - Add `governedDiscoverySearch` to `@macts/core` — the correct all-in-one entry point for discovery surfaces: applies governance to the **full** ranked match set, then slices to `limit`. A request for N results now returns N _allowed_ results, with backfilling from lower-ranked capabilities.
  - Add `filter?: GovernanceFilter` option to `SearchCapabilitiesOptions` so `searchCapabilities` can also apply governance before slicing.
  - Update CLI (`macts capabilities search`) and MCP discovery tool to use `governedDiscoverySearch`.
  - Add regression tests: partial-denial-under-limit (verifies backfilling) and all-denied (verifies `governance-blocked` vs `no-match` distinction is preserved).

- c7ac226: Add `@macts/types`, a zero-runtime package holding the shared MCP plugin type
  definitions (`JsonSchema`, `McpToolDefinition`, `McpPlugin`).

  Generated `@macts/<app>-server` packages used these types only — no value import
  existed — but declared `@macts/mcp` as a peer dependency to get them. They now
  depend on `@macts/types` directly, so a server package no longer implies a
  dependency on the MCP server implementation.

  `@macts/mcp` re-exports all three types, so importing them from `@macts/mcp`
  continues to work unchanged.

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
- Updated dependencies [245273b]
- Updated dependencies [a68161c]
- Updated dependencies [9a98e47]
- Updated dependencies [cd2860a]
- Updated dependencies [c7ac226]
  - @macts/core@0.1.0
  - @macts/api@0.1.0
  - @macts/types@0.1.0
