# @macts/api

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
