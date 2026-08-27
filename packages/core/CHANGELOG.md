# @macts/core

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
