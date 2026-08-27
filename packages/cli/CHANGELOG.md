# @macts/cli

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
