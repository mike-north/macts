# Phase 13: SDK Value and Execution Contracts

## Goal

One manifest-derived set of contracts supports two concrete SDK clients with
common values, validation, permissions, hydration, and structured errors:

- **Local** — executes on the Mac without a required listening daemon.
- **Remote** — calls the macts service on a Mac, and is usable from Linux.

Application code switches locality by changing only the client factory. HTTP
and MCP adapters run on the shared local execution runtime instead of a
mandatory HTTP-client chain, and the CLI uses whichever client is selected.
SDK code owns polymorphic transfer behavior; MCP stays thin.

This document is the canonical statement of those contracts. Part A states the
accepted semantics. Part B is the decision record that settles the engineering
choices the implementation depends on. Part C assigns file ownership between
the two implementation streams:

- **Value contracts** — [#128](https://github.com/mike-north/macts/issues/128):
  the shared value library, native-boundary codecs, and generated SDK and wire
  schemas.
- **Execution** — [#129](https://github.com/mike-north/macts/issues/129): the
  shared runtime with token authority, structured errors, local and remote
  factories, thin adapters, and binary transfer.

The skeleton interfaces this document names live in the packages and seam
modules decided in D1: `packages/contracts` (`@macts/contracts`) and two seam
modules inside `@macts/core`. Changing one of those interfaces means changing
this document in the same pull request.

## Scope and Non-Goals

The project has no users. Breaking changes are unrestricted. No backward
compatibility work, migration shims, old client construction, or legacy
transports kept only for compatibility.

Out of scope: SQL; a speculative process-persistence system; BigInt; numeric
sentinels or notices; universal nullability; always-array hydration; a
universal date-range primitive; speculative alpha or 3D geometry; format
allowlists based on observed samples; broad Music capability claims; a second
transfer engine inside MCP. Photos location is not a capability claim to avoid:
it is information lost in extraction, to be refined from live evidence (A8).
Attachment permission is neither presumed inherited from object permission nor
presumed separate; that work is tracked in
[#125](https://github.com/mike-north/macts/issues/125) (A7). A listening daemon
is not required for local execution. Process reuse and persistent sessions are
separate, undecided concerns.

## Current State

These starting conditions were confirmed in the source at the time of writing.
They describe what this phase replaces; they are not part of the contract.

| Area              | Today                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native boundary   | `runJxa` (`packages/core/src/jxa/executor.ts`) wraps the script in `JSON.stringify(result)` inside `osascript` and parses stdout. NaN, infinities, `-0`, and integer/double classification are lost before any transport runs.                                                                                                                                                                                                         |
| Command execution | `packages/api/src/server/handlers/rpc.ts` builds JXA at request time from the manifest, interpolating arguments into source text, behind Hono middleware: permission → policy → request validation → execute. Every native failure becomes `EXECUTION_ERROR` (HTTP 500).                                                                                                                                                               |
| Authority         | Token verification (`packages/api/src/keys/validator.ts`) needs `jose`, the signing secret on disk, and the SQLite revocation store. It is reachable only through `@macts/api/keys`. Governance (`middleware/governance.ts`) composes `enforceCall`, `seekApproval`, and `recordApprovalDecision` from `@macts/core` inline in a Hono handler.                                                                                         |
| Generated SDK     | `packages/core/src/generator/sdk/http-client.ts` emits a per-app `HttpClient` that POSTs `JSON.stringify(body)`, casts `.result` without validation, and throws a per-app `<App>Error { code }`. `@macts/sdk` only constructs those HTTP clients and statically imports 35 optional peers ([#118](https://github.com/mike-north/macts/issues/118)).                                                                                    |
| Value types       | `integer` is a plain `number` on every surface. TS types say `Date` and `{ r, g, b }` while the generated zod in the same file says `string` and `{ red, green, blue }`. `types/standardized.ts` has `Date \| string`, 8-bit RGB, and `{ path, exists? }` files. `jxa/coercion.ts` is re-exported by `@macts/core` and `@macts/api`, but a search of `packages/`, including generated packages, finds no caller outside its own tests. |
| MCP               | `packages/mcp/src/server.ts` (stdio) and `daemon/server.ts` (HTTP) stringify tool results. The token is checked once at startup (stdio) or per request without propagating identity (HTTP). Generated tools call the HTTP SDK, so a tool call goes MCP → HTTP client → API server.                                                                                                                                                     |
| Binary            | No transfer facility was found in a search of `packages/api/src`, `packages/mcp/src`, `packages/sdk/src`, `packages/core/src/jxa`, and `packages/core/src/types`.                                                                                                                                                                                                                                                                      |

---

# Part A — Accepted Contracts

These semantics are fixed. Exact names, discriminator spellings, exports, and
plumbing are engineering choices settled in Part B.

## A1. Execution and Authority

Generate contracts once from manifests, including evidence-backed refinements.
Provide local execution on the Mac without a required listening daemon and
remote execution through a service on the Mac, including from Linux. HTTP and
MCP adapters depend on the shared local execution SDK. Application code
changes only its client factory when switching local and remote, including for
hydration and exception handling. Transfer handles can be locality-sensitive.
Preserve useful abstraction behavior rather than claiming that an arbitrary
filesystem path is portable.

A token accompanies every SDK and MCP invocation. Both modes derive authority
from that token and enforce shared permissions and policy before app
execution. Token and authority are preserved on the invocation context without
logging credentials or disclosing secrets. Locality is not an alternate
identity or a trust bypass. Existing auth, permission, governance, and audit
mechanisms are reused; adapters do not duplicate policy. Runtime persistence
and subprocess startup are independent design concerns.

## A2. Numbers

All numeric values in the value wire format use typed wrappers, recursively
through arrays, records, and numeric members of other values.

| Classification    | Wire payload/state    | SDK value                           |
| ----------------- | --------------------- | ----------------------------------- |
| Integer           | Decimal string        | Validated branded JavaScript number |
| Finite double     | JSON number           | JavaScript number                   |
| Positive infinity | Explicit double state | `Infinity`                          |
| Negative infinity | Explicit double state | `-Infinity`                         |
| NaN               | Explicit double state | `NaN`                               |

- Integers cannot be non-finite.
- SDK callers see native numeric values, never wrapper objects.
- Source classification is preserved when available: a double whose value is
  `3.0` is still a double.
- Integer provenance is never inferred only from `Number.isInteger`.
- Where native classification is genuinely unknown, find out what the bridge
  can know and record the chosen treatment honestly. Never claim source
  provenance that is unavailable.
- Transport metadata stays distinct from user records, so arbitrary nested data
  cannot impersonate a wrapper. Decoding is schema-aware or otherwise
  unambiguous.

Supported values are preserved before JSON serialization inside the JXA
process as well as across HTTP and MCP. Lossless supported-value transport is
preferred over common-case simplification.

Rejected approaches:

- max/min finite sentinels
- `ACTS-Notice` plus JSON Pointer annotations
- null-for-NaN
- failing a response solely because its numeric result is NaN

Numeric fields are not made nullable or optional to accommodate non-finite
values. App-specific input constraints can still reject inappropriate values;
transport capability is not permission to pass every value to every app.

**Precision and range.**

- The SDK stays number-based; there is no BigInt expansion.
- The earlier safe-integer validation is the baseline, not a newly accepted
  larger integer domain.
- Range is distinct from precision. A decimal string does not restore
  precision already lost in a number, and not every integer below
  `Number.MAX_VALUE` is representable.
- Concrete limits, including app limits, are reconciled with this contract and
  documented.
- Decode never silently rounds.
- Signed zero is resolved explicitly, consistent with the lossless
  supported-value intent. Plain JSON erases `-0`, and the wrapper states above
  do not by themselves decide how `-0` is represented. The resolution is tested
  and documented (decided in D10; observed under A9).

**Integer helpers.** A shared value library provides zod validation and a
branded integer output.

- Integer writes require the brand, and validated reads carry it.
- Explicit validate, round, and truncate helpers are discoverable. Rounding or
  truncation is a strategy the caller selects, never silent coercion.
- Both execution modes validate actual runtime values before JXA, including
  values that arrive through casts and raw wire requests.
- Validation covers finite integral values, the documented precision and range
  policy, and relevant app constraints. AppleScript numeric bounds are not
  treated as JXA bounds.

**Agent DX acceptance.** A realistic number-to-integer type error leads an
agent to a correct conversion. The official helper is preferred. A correctly
validating or converting helper with a localized branding assertion is
acceptable. Unchecked casts at the write site are not. ESLint hints are
optional and out of required scope.

## A3. Dates, Geometry, and Colors

| Value     | SDK representation                                        | Wire/native obligations                                                                                                                                                                                  |
| --------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date      | JavaScript `Date` for inputs and outputs in both SDKs     | ISO 8601 date-time with explicit offset and exactly three fractional digits; native automation date at the Mac boundary. Native app/JXA precision is verified before lossless milliseconds are promised. |
| Point     | `{ x: number, y: number }`                                | Two dimensions. Numeric members use wrappers on the wire. The app contract supplies origin, units, and any constraints.                                                                                  |
| Rectangle | `{ x: number, y: number, width: number, height: number }` | Numeric members use wrappers on the wire. No invented positivity or integer constraints.                                                                                                                 |
| RGB       | `{ r: Integer, g: Integer, b: Integer }`                  | Each channel validated as `0..65535`; integer wrappers on the wire. 16-bit precision is preserved.                                                                                                       |

The contract admits any explicit offset; D3 chooses `Z` as the canonical offset
that encoders emit.

Dates do not define a universal range primitive; all-day flags and
relationships between endpoints belong to app semantics. A future concrete 3D
need gets a separately named point; the existing Point is not expanded.

RGB convenience constructors explicitly accept 8-bit RGB and six-digit RGB
hex, multiplying each 8-bit channel by exactly `257`. Reverse conversion
divides by `257`, rounds, and is explicitly lossy. Hex is not canonical. Basic
RGB has no alpha; alpha is added separately only for a concrete supported
capability. Bridge conversion handles normalized `0..1` channels only where a
particular app interface uses them. No universal native color representation
is assumed.

## A4. Presence, Nullability, and Updates

Presence and value domain are separate axes: required-nullable,
optional-non-nullable, and optional-nullable fields are all meaningful.
Genuinely absent optional fields are omitted on the wire and have no own
property in either SDK's results. Absence is never materialized as an own
property holding `undefined` or `null`. A schema-defined present `null` remains
data and has an own property; nulls are never stripped recursively.

Partial updates are uniform:

| Update value           | Meaning                         |
| ---------------------- | ------------------------------- |
| omitted or `undefined` | unchanged                       |
| explicit `null`        | unset or reset, where supported |
| any other value        | set                             |

Whether an operation permits unset is validated. Required or defaulted fields
are not inherently barred from reset. For example, removing an override can
reveal an effective default of `5`, and a later read of effective state returns
`5`. That is a design scenario, not verified behavior of a named app.

Accepted limitations and open points:

- Where an app distinguishes storing a meaningful `null` from unsetting, updates
  cannot express the difference.
- There is no separate reset operator, unset list, or speculative literal-null
  override machinery.
- A readable semantic `null` does not promise a separately writable stored-null
  operation. Revisit this only with concrete capability evidence.
- Selection metadata that distinguishes unrequested fields from known-unset
  fields remains open and non-blocking unless a concrete operation needs it.

## A5. Enums and Errors

Dictionary-defined enums are closed types suitable for exhaustive
conditionals. User-created resources such as OmniFocus tags are not extensible
enum members.

A shared `UnreachableError` accepts `never`. It turns an unhandled member into
a compile error and, at runtime, into an actionable error that contains the
unexpected value. An app upgrade with a stale SDK can legitimately yield an
unknown enum value. Boundary validation and runtime handling are reconciled so
that static types stay closed and errors stay truthful. Callers are not
assumed to be sloppy, and enums are not silently widened to `string`.

Local and remote SDKs expose the same exported structured exception classes
and types, with the same shapes and observable handling:

- Remote code decodes the wire payload and reconstructs the same class, so
  `catch`, `instanceof`, and structured fields behave identically in both
  modes.
- A missing singular target and a missing file each have a well-defined failure
  that is distinct from permission denial.
- Validation, native execution, transport, and other failures follow a
  documented, consistent mapping. Failures are never collapsed into a generic
  `EXECUTION_ERROR`, and list failures are never converted into empty lists.
- Export identity across packages preserves `instanceof`.

## A6. References and Hydration

- **Identity** references identify particular objects.
- **Selector** references mean whatever matches the rule when resolved.

The identity/selector discriminator describes reference variants. It is not a
success/error result union. Identity versus selector and single versus
collection cardinality are independent axes. App contracts own identity
persistence and referential integrity; the SDK makes no universal stability
guarantee.

There are three distinct shapes:

1. A single object reference.
2. A deferred reference to a collection, whose membership is determined when it
   is resolved.
3. A materialized array of references. The array already determines its
   entries, but it is neither a data snapshot nor an immutable target identity:
   objects can change or disappear, and selector entries can resolve
   differently.

The reference hierarchy is polymorphic and useful:

- Broad hydratable/resolvable abstractions produce records. Generic sync,
  output, and agent-forwarding consumers need not inspect every variant or
  cardinality.
- Cardinality-aware consumers depend on one-object versus collection results
  without caring how selection works.
- Concrete identity-based and selector-based forms exist in both the local and
  the remote client, and for both single and collection references: all four
  combinations of form and cardinality are concrete in each client. "Ten most
  recent" and "these ten identified items" both hydrate collections, but
  editing a query differs from reordering explicit entries.

Precise concrete result types are retained. There are no always-array returns,
no flattening, and no eager hydration.

Native selection semantics are preserved:

- Name, ID, and index selection are singular within a singular container.
- Every and filter selection return lists, which may be empty.
- Ranges return lists, but an invalid range may error.
- Plural containers affect composition.
- Singular lookup with duplicate names is app-defined; it is not universally an
  ambiguity error.
- Range failures are mapped explicitly; failure is never turned into an empty
  result.

[Apple Reference Forms](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/reference/ASLR_reference_forms.html)
is the supporting reference. Absolute and relative specifiers concern
containment, not the identity/selector distinction. Native terminology stays
out of consumer-facing SDK errors and workflows.

## A7. Files and Binary Transfers

One normalized public file abstraction exposes a path when available,
existence as an observation, and a common fetch operation.

- Resolution happens on the executing Mac. A path does not implicitly upload a
  caller's file.
- The bridge converts to the native forms the app requires, including aliases,
  and preserves tracking where feasible.
- Missing or disappearing targets fail clearly.
- Universal MIME metadata is not promised.

| Operation   | Local mode                                                                          | Remote mode                                                                                   |
| ----------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Read bytes  | Materialize a temporary file and return its path                                    | Return a short-lived signed HTTP download URL with expiry; a fresh read can issue a fresh URL |
| Write bytes | Reference an existing file written by the caller; no preallocated local upload slot | Obtain an HTTP upload URL, POST bytes, then use the resulting reference in the app operation  |

Bytes never appear inline as base64 in MCP tool responses or model context.
Tools move bytes outside model context, and MCP exposes metadata and handles
from SDK behavior instead of implementing a second transfer engine.

- Explicit startup selection of stdio versus HTTP configures the intended mode;
  the flag spelling is not fixed.
- Local paths require a shared accessible filesystem, including in container
  cases.
- Original Mac file paths, temporary downloaded copies, caller-owned write
  files, and uploaded remote references are distinct.
- Ownership, cleanup, expiry, completion, and size limits are specified where
  needed. A five-minute URL lifetime is illustrative, not fixed. Bounded
  defaults are chosen and documented as engineering work.
- Permission and token enforcement also apply to transfer operations. Signed
  delivery must not become an unrelated authority bypass.

[#125](https://github.com/mike-north/macts/issues/125) tracks further file
proposal work, in particular:

- app-specific object-read versus attachment-read or download authority
- alias identity and persistence
- reference lifecycle

Neither universally inherited nor universally separate attachment permissions
are presumed. Concrete required cases are resolved, and unsupported ones are
explicitly limited. Broader proposals and projection metadata do not block
unrelated execution or value work, and that issue's earlier transport-open
framing does not override the delivery table above.

## A8. Unconstrained Values and Refinement Evidence

Outputs that are genuinely arbitrary and caller-dependent remain `unknown`.
Automator workflow execution and Safari `do JavaScript` results are the
accepted examples.

The dictionary is evidence, not the SDK's quality ceiling. Demystifying an
`any` is weighed for consumer value against its maintenance cost, and refined
types use durable semantic categories rather than closed unions of observed
samples or formats.

- **Music artwork raw data** is a candidate for central investigation. It is
  not established as binary-only or image-only. Binary data plus MIME is
  illustrative, not a final representation and not evidence of video or any
  particular format; MIME availability or inference must be demonstrated.
- **Photos location** was information lost in extraction and modeling. Live
  dictionary evidence reports real/missing-value lists with two coordinates and
  bounds, so it is not a genuinely unconstrained contract; its type is refined
  from that live evidence.
- Relevant native evidence is verified before a manifest is refined.

Representative specimens carry app, version, and context provenance. They have
automated conversion and validation regressions and a manually runnable
live-app suite for periodic and app-upgrade checks. Dictionary diffs alone
cannot assure stability. Tests verify abstractions and conversions, not an
artificially closed format inventory.

Inappropriate formats are exercised in disposable contexts, recording:

- whether rejection is clear
- whether state was left unchanged or partially mutated
- whether the app stayed responsive

Predictable, loud rejection can justify leaving the exact supported formats to
the app, with normalized SDK failures. Crashes, hangs, or unclear or partial
effects can justify narrowing or limiting the capability, based on evidence.
No blanket allowlist or recurring automation is requested. Coverage,
unknown-variant handling, and cadence are documented honestly.

## A9. Parity Acceptance

Tests are written first, using independently specified expectations followed
by round trips. The same consumer programs and fixtures run through the local
and remote factories, and every row needs observable evidence, not merely
matching signatures.

| Area                 | Required observation                                                                                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native boundary      | Real JXA, or a focused native-boundary test, preserves numeric states before JSON. HTTP-only mocks cannot prove this.                                                                                                                                    |
| Numeric wire         | Every numeric leaf wraps. The integer string is exact. A double `3.0` stays classified as a double. Coverage includes finite extremes, fractions, non-finite values, range and precision rejection, the signed-zero decision, and nested values.         |
| Integer DX           | Branded writes and reads, rejection of runtime bypasses, explicit conversion strategies, and agent recovery from a realistic type error.                                                                                                                 |
| Dates                | Independently expected timestamp, offset, and three fractional digits; `Date` output identity; native precision evidence with app and version; round trips.                                                                                              |
| Presence and updates | Own property is false for absence and true for semantic null. Omitted or `undefined` leaves a field unchanged, `null` resets it, and a value sets it. A read in the default scenario reflects effective state.                                           |
| References           | Identity/selector behavior; the singular, deferred-collection, and materialized-collection distinctions; app-defined duplicate-name behavior; the singular missing-target error; an empty filter result distinguished from a real list or range failure. |
| Errors and authority | The same canonical exported exception identity and fields; permission denial distinct from a missing target; token attribution and enforcement before mutation; failures that do not leak credentials.                                                   |
| Binary               | Exact bytes delivered outside MCP; local writes from existing files and local temporary reads; remote POST then consume; signed download, expiry, and refresh; ownership, cleanup, and failure scenarios.                                                |
| Adapters             | stdio and HTTP MCP stay thin; tool content has no inline base64 or binary; CLI and HTTP use the shared contracts; there is no local daemon dependency.                                                                                                   |
| Refinements          | Versioned specimens, valid and unsupported examples, documented rejection and state integrity, and explicit coverage of what is unsupported or unverified.                                                                                               |

Unit and type tests, generated fixture tests, in-process integration, live
native verification, and end-to-end transport acceptance are distinct evidence
layers.

- Use fixed dates and controllable clocks.
- A passing round trip can hide paired mistakes, so expectations are never
  derived from the output under test.
- CI cannot establish live app support by mocking it.
- Repository validation seals apply where required, and reports state exactly
  what was run.

---

# Part B — Decision Record

Each decision states what is decided, why, and who implements it.
"Value contracts" means [#128](https://github.com/mike-north/macts/issues/128)
and "execution" means [#129](https://github.com/mike-north/macts/issues/129).

## D1. Package Layout and Dependency Direction

**Public shape — confirmed: one package with subpath exports.**

| Entry point        | Contents                                                                                                                                                                                                   | Loads native execution?              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `@macts/sdk`       | Remote client factory `createClient(app, { token, url })`, plus re-exports of every public contract symbol: error classes, `UnreachableError`, `Integer` and its helpers, value, reference, and file types | No — imports only `@macts/contracts` |
| `@macts/sdk/local` | Local client factory `createClient(app, { token })`, with the same name and the same `AppContract` parameter                                                                                               | Yes, and only on the Mac             |

Switching locality means changing the import specifier and the options object
(`url` exists only for remote). Consumer code, values, references, files, and
`catch` blocks stay the same. Both entry points re-export the same error class
bindings.

The aggregate `createMactsClients()` and the 35 optional app peers are
removed. A client is created per app from that app's generated contract, so
`@macts/sdk` no longer depends on app packages and the import failure in
[#118](https://github.com/mike-north/macts/issues/118) disappears by
construction.

**Internal layering.** Each arrow below points from a package to a dependency.

```text
@macts/contracts   (new; depends only on zod; platform-neutral)
   ↑
@macts/core        engine: manifest, generator, executor seam, native provider,
   ↑               governance and permission primitives
@macts/runtime     (new; Mac-side shared execution runtime)
   ↑
@macts/sdk         "."  → contracts only      "./local" → runtime
   ↑
@macts/api         HTTP adapter (remote service) and transfer endpoints → runtime
@macts/mcp         stdio / HTTP MCP adapter → runtime
@macts/cli         → sdk, runtime (key administration), api, mcp

@macts/<app>       generated contract + SDK types + CLI plugin → contracts
@macts/<app>-server  host package: re-exports the app's contract → @macts/<app>
```

The graph is acyclic. `@macts/mcp` does not depend on `@macts/api`: key
verification comes from the runtime's credential verifier. A host package
depends on neither adapter: adapters are contract-generic, so a host package
carries no adapter code.

**Who owns what.**

| Package            | Owns                                                                                                                                                                                                                                                                              | Created by            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `@macts/contracts` | Value types, wire shapes, value plans, the integer brand, `UnreachableError`; the reference hierarchy; file and transfer handle shapes; invocation context and authority types; canonical error classes and their registry; operation descriptors, `AppContract`, `ClientRuntime` | This phase (skeleton) |
| `@macts/core`      | Manifest, generator, `Executor` seam (`src/execution/`), native provider (JXA executor and native codec, `src/jxa/`), governance and permission primitives                                                                                                                        | Exists                |
| `@macts/runtime`   | Credential verification and key store, moved from `@macts/api/keys`; governance context loading, moved from `packages/api/src/server/governance/`; the invocation pipeline; reference resolution dispatch; the transfer store                                                     | Execution             |
| `@macts/sdk`       | Public factories and re-exports                                                                                                                                                                                                                                                   | Execution             |

**Why a separate runtime package.** Token verification needs the signing
secret on disk and the SQLite revocation store. The local
SDK and the HTTP adapter both need it. If it lived in `@macts/api`, local
execution would depend on the HTTP server. If it lived in `@macts/sdk`, the
key store would sit in the public client package and the HTTP adapter would
depend on the client.

A dedicated Mac-side runtime is the one home that sits below both without
widening either. The root entry of `@macts/sdk` never imports it, so a remote
client never loads native execution.

**Invariant: the remote entry point's install graph contains no native
addon.** Installing `@macts/sdk` for remote use, on Linux or anywhere else,
never builds or downloads a native addon. The revocation store uses
`better-sqlite3` today, which is a native addon, so a regular
`@macts/sdk → @macts/runtime` dependency would break the invariant. Execution
resolves this in its first packaging pull request, the one that creates
`@macts/runtime`:

1. **Preferred: replace `better-sqlite3` with Node's built-in `node:sqlite`**,
   so no native addon exists anywhere in macts. The repository requires
   Node ≥ 22. Verify the store on Node 22, 24, and 26, including the earliest
   22.x release that loads `node:sqlite` without a flag (raise `engines` to it
   if needed). Handle the `ExperimentalWarning` that Node 22 emits so it does
   not reach consumers' stderr as noise, without suppressing other warnings.
2. **Fallback, only if `node:sqlite` cannot serve the store:** `@macts/runtime`
   becomes an optional peer of `@macts/sdk` with range `"*"`, and
   `@macts/sdk/local` fails with a clear error naming the missing package
   when it is absent.

Either way, the packed-install UAT below installs `@macts/sdk` and an app
package from packed tarballs. It asserts that the installed tree contains no
native addon and that the macts packages installed are exactly the SDK's
dependency closure (`@macts/contracts`, `@macts/core`, `@macts/runtime`) plus
the SDK and the app. It then deletes `@macts/runtime` and `@macts/core` and
asserts that `@macts/sdk` still loads and runs a remote call.

**Resolution.** Option 1 was taken. The revocation and key store runs on
`node:sqlite`. `engines.node` is `>=22.13.0`, the first release that loads
`node:sqlite` without a flag. Node 22 and 24 print an `ExperimentalWarning` the
first time the module loads; the runtime filters that one warning at its single
load site and suppresses no other warning. No native addon exists anywhere in
macts, so the remote entry point cannot pull one in.

**Why a separate contracts package.** Generated app packages, the core native
provider, the runtime, and the remote client all need the same value types and
error classes. Putting them in `@macts/sdk` would create the cycle
sdk → runtime → core → sdk. `@macts/contracts` is an implementation-layer
package: application code imports from `@macts/sdk`, and generated code
imports from `@macts/contracts`.

**One identity per error class.**

- Error classes are declared once, in `@macts/contracts`.
- `@macts/sdk` and `@macts/sdk/local` re-export those bindings.
- No other package declares, copies, or subclasses them.
- The generated per-app `<App>Error` classes are removed.
- `JxaExecutionError` becomes an internal detail of the native executor, which
  maps it to canonical errors before it leaves the provider.

Identity relies on a single installed copy of `@macts/contracts`. Fixed
versioning and regular dependencies make one copy the norm. Execution adds a
packed-install UAT: it installs `@macts/sdk` and one app package into a temp
directory and asserts `instanceof` across `@macts/sdk`, `@macts/sdk/local`, and
an error thrown through the app's client.

Brands are keyed by an unexported `unique symbol` (`declare const`, so there
is no runtime cost). The brand stays out of editor autocompletion and cannot be
forged except by a cast. Two installed copies of the declaration would make
their brands mutually unassignable, so brands rely on the same single
installed copy of `@macts/contracts` as error identity does, and the
packed-install UAT covers both.

**Governance defaults.** Servers (`createServer`, `createApp`, and
`createMultiServer`), the CLI's HTTP serve mode, and the local client enforce
this Mac's governance (`loadHostGovernance`, D5) by default. `createRuntime` has
no default: its `governance` option is required, so every host states what it
enforces. An allow-all policy applies only when the caller passes it
explicitly. Omitting the governance option never means "no governance".

**Release mechanics.** `@macts/contracts` starts at the fixed-group version and
joins `@macts/*`. A never-published package needs the one-off bootstrap publish
and a trusted publisher before CI can publish it (`RELEASING.md` → "Adding a
new package later"). Sibling `@macts/*` dependencies stay regular
`dependencies`, and no `peerDependencies` on `@macts/*` are added, so the
pre-1.0 release-plan guard is unaffected. The one exception is the runtime
fallback above; its peer range stays `"*"`, is never narrowed, and must pass
`release:plan-check`.

## D2. Generated Operation Descriptors; SDK Types Versus Wire Types

**SDK types** are what callers see:

- `number`, `Integer`, `Date`, `Point`, `Rectangle`, `Rgb`
- closed string-literal enums
- references (D7)
- `FileValue` and `FileSource` (D8)
- `unknown`

They are emitted as named interfaces — records, create/update inputs, and a
per-app client interface — so the SDK reads as hand-written.

**Wire types** are the JSON forms in D3. No per-app wire TypeScript interfaces
are generated. Runtime code handles wire values generically as `WireValue`.
The wire form of each operation is fully described by a generated zod schema,
and the HTTP and MCP JSON Schemas are derived from that schema.

**`ValueType<Sdk>`** (`@macts/contracts`, `values/value-type.ts`) bundles one
value's contract. It is composed in generated code from shared constructors
supplied by the value library:

| Member                                                            | Role                                                                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `plan: ValuePlan`                                                 | Serializable shape tree that drives the native codec inside JXA (D4)                                |
| `sdk`                                                             | zod schema for SDK values                                                                           |
| `wire`                                                            | zod schema for wire values                                                                          |
| `encode(value: unknown): CodecResult<WireValue>`                  | SDK → wire, validating runtime values. It accepts `unknown` because values can bypass static types. |
| `decode(wire: unknown, context: DecodeContext): CodecResult<Sdk>` | Wire → SDK. `context` binds references and file values to the decoding client.                      |

Codecs return results instead of throwing, so only the runtime and clients
construct canonical errors. On failure:

- `encode` maps to `ValidationError`.
- A client-side `decode` maps to `UnexpectedValueError`.

**`OperationDescriptor<Input, Output>`** has these fields:

| Field                          | Meaning                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `id: OperationId`              | The existing route string, e.g. `calendar.events.list`. It is the HTTP RPC path segment and the basis for MCP tool names. |
| `permission: PermissionString` | e.g. `calendar:events:list`                                                                                               |
| `target: OperationTarget`      | `{ command, resource? }`: manifest keys the provider uses to locate the command                                           |
| `description`                  | Text describing the operation                                                                                             |
| `input: ValueType<Input>`      | Always record-shaped                                                                                                      |
| `output: ValueType<Output>`    | The operation's result                                                                                                    |
| `inputJsonSchema?`             | `Readonly<Record<string, unknown>>`, the draft-7 JSON Schema of `input.wire` (below)                                      |

`inputJsonSchema` is exactly `z.toJSONSchema(input.wire, { target: 'draft-7' })`.
It describes wire values, and generated descriptors always carry it. The
generator computes it in process, from value types built with the same
constructors the contract uses, and annotates each descriptor's type so the
declared type is `Readonly<Record<string, unknown>>`, not the literal.
Adapters never read or serve it; they always derive from `input.wire` (D9).

Every asynchronous client call that reaches the runtime (`invoke`, a
reference's `resolve`, and a file value's `fetch`) accepts one shared
`CallOptions { signal? }`. A call that later needs its own option extends that
type instead of redeclaring cancellation.

When an app is registered, the runtime asserts that each descriptor's
`permission` equals the permission derived from the manifest command, and
fails closed on a mismatch. A stale or tampered package therefore cannot widen
authority.

**`AppContract<Client>`** has these members:

| Member                                 | Meaning                                                                                                                                                                                                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app`                                  | Route segment                                                                                                                                                                                                                                                               |
| `operations`                           | All operation descriptors, keyed by `OperationId`                                                                                                                                                                                                                           |
| `resources`                            | Per-resource record value type, identifier value type (`id`, present when the resource has a primary identifier property), and the operation ids used to resolve references. This table is the reference registry, and with `app` the contract is the reference scope (D7). |
| `loadManifest(): Promise<unknown>`     | A lazy dynamic import of the generated manifest module. It is called only by the Mac-side runtime, which validates the result with `AppManifestSchema`, so remote clients never load it.                                                                                    |
| `bind(runtime: ClientRuntime): Client` | A generated, fully type-checked function that maps positional SDK methods onto `runtime.invoke(descriptor, inputRecord)`                                                                                                                                                    |

**Generated contract.** Each generated app package exports its contract at
`@macts/<app>/contract`, alongside the `<PascalApp>Client` interface and the
record, input, and enum types. The contract itself is named
`<camelApp>Contract`, for example `notesContract`. The package root keeps the
existing generated client until that client is retired, and the contract's
names then move to the root. The contract depends only on `@macts/contracts`,
and its manifest module is imported only by `loadManifest`.

Manifest types map to value types as follows:

- Resource-typed properties and parameters are references (D7). A `get`
  returns the record, and a `list` returns one page of records:
  `t.page(record)`, whose SDK type is `Page<T>`, `{ items, nextCursor? }`
  (D9, _Bounded list pages_). A list that pages, one whose resource's
  primary identifier the manifest claims unique, also takes the optional
  paging inputs `pageSize` and `cursor` (`t.pageInputs()`); any other list
  takes neither and returns its whole collection as one page with no
  `nextCursor`.
- `file` and `data` are file values in outputs and file sources in inputs
  (D8).
- Update inputs are optional at every field, and accept `null` only where the
  property is resettable (A4, D10).
- A command with no declared result produces `none`.
- A type name that matches no resource or enum becomes `unknown`, and the
  generator reports it as a diagnostic.

Generation diagnostics are warnings, not errors. `macts generate` prints each
one to stderr as `warning: <app>: <position>: …` and still exits 0, and
`scripts/regenerate.mjs` reports their total across apps. Only generation
errors fail generation. The shipped manifests produce three kinds: unknown
types (Finder's `iconViewOptions` and `columnViewOptions`, and System Events'
`scriptingResult`), an unavailable operation (Mail's `synchronize`), and the
output fields left out under the resolvable-target rule (D7), which
`packages/core/src/generator/contract/index.test.ts` pins.

The generator owns its output. Each generated package carries a committed
`.macts-generated.json` that lists the sorted package-relative paths the last
run emitted, computed from the emitter's own output, never from a glob. A
run deletes every path the previous record lists that it no longer emits,
and removes a directory only when that deletion empties it. A file that is in
no record, such as a package's `CHANGELOG.md`, its API reports, or a
handwritten test, is never touched. A package without a record takes the
files whose leading doc comment carries the generator's "do not edit" notice
as its previous set; after that run, the record decides. That bootstrap stays
inside one package: it runs only in a directory holding a `package.json`,
never looks inside a subdirectory holding its own, and a directory that is
not yet a package has no previous set. A run widens the record to the
previous set plus its own files before writing, so an interrupted run leaves
nothing it wrote outside a record. Removing an
operation or a resource from a manifest therefore leaves the package as a
fresh generate would. `pnpm generate:check` regenerates every package and then
fails on any modified, deleted or untracked file under `packages/`, naming
each one, so a stale or newly emitted file cannot go unnoticed. The rule is
recorded in `packages/core/src/generator/owned-output.ts`.

Each operation's permission comes from the manifest route, the same
derivation the runtime uses, so the registration check holds by construction.
A command's route segment, and the operation segment of its default permission, is its `routeName`, which defaults to the command key. Two commands can then share a public operation name across resources while differing in signature, for example a `get` whose identifier parameter differs for one resource. No two commands may produce the same route. A CRUD command (`get`, `list`, `create`, `update`, `delete`) always publishes under that operation name, never under its manifest key, and a test over every shipped manifest enforces this.
A resource's segment is the acronym-aware lower camel case of its plural, derived by one function in `manifest/route.ts`, and it is the resource's only spelling on every public surface: the route and operation id, the SDK accessor of the HTTP client and of the contract, the MCP tool name, the capability, and the scope of a derived permission. `MediaItems` gives `photos.mediaItems.list`, `client.mediaItems`, `macts__photos__mediaItems_list` and `photos:mediaItems:list`. A single word loses only its initial capital (`Notes` → `notes`); a leading acronym is lowercased, keeping the capital that starts the next word (`AIMHandles` → `aimHandles`, `UIElements` → `uiElements`), and a lone `s` after it is its plural (`URLs` → `urls`). No surface derives its own spelling, and a test over every shipped manifest checks that each resource is spelled the same on all of them and that no explicit permission spells a resource differently only in letter case. The CLI's command path is not a resource segment: it follows the keys of the manifest's hierarchy, which name containment relationships.
A permission is `app:resource:operation`. The app segment is `[a-z][a-z0-9_-]*`. A permission's app segment is always its route's app segment, the app name normalized as for routes (`Microsoft Edge` → `microsoft-edge`), never a second name for the app, and a test over every shipped manifest checks it for every route's permission and every entry of the permission groups. A permission group lists only permissions that some route of the app requires, wildcards aside: an operation without a command is absent from the groups, not listed ahead of it, and a test over every shipped manifest (`permission-group-routes.test.ts`) checks this too. So key creation expands only coarse and wildcard permissions through the groups, and grants a well-formed fine-grained permission the groups do not list as written, warning that no route requires it and naming the closest permission that one does; `permissions expand` still rejects such a permission, since it expands to nothing. The resource and operation segments are each `[a-z][a-zA-Z0-9]*` or `*`, so a camelCase command key or `routeName` (`splitVertically`) or resource name (`mediaItems`) is a valid segment as written, and `-` and `_` are not allowed in them. Matching is exact and case-sensitive, and wildcards cover only whole segments. The operation segment of a derived permission equals the route's operation segment, so no case folding is needed to relate a route to its permission. A permission that fails the grammar, or a grant that differs from a real permission only in letter case, can never authorize anything, so every surface that rejects or denies one must name the closest valid permission for the app: key creation, `permissions expand`, and the denial hint a caller receives. A test checks that every route permission in every shipped manifest satisfies the grammar and is granted by itself, by its resource wildcard, and by the app wildcard.
A permission must have exactly three non-empty segments,
`app:resource:operation`, because governance denies any other shape. A test
checks, for every shipped manifest, that the routes agree with the HTTP
router's own guards and introspection on the set of operations and on each
permission.

**What introspection describes.** The HTTP adapter's `GET /introspect`
describes each operation as its manifest command: the command's description,
its `parameters`, and its `returns` type name, plus the operation's path,
method, and permission. It does not publish the generated descriptor's wire
contract (the input and output plans), so a client must not treat it as a
schema for request or response values; the descriptors are that contract.
`GET /introspect/all` lists only path, method, and permission.

Each generated client package reports its `./contract` subpath in
`api-report/contract.api.md`, using a second API Extractor config,
`api-extractor.contract.json`, which the package's `api-extractor` scripts run
after the root report. That config writes no declaration rollup (the
subpath's types are the bundler's `dist/contract/index.d.ts`) and no doc
model, so the API documentation still covers only the root entry.

Factories supply the `ClientRuntime`: local backed by `@macts/runtime`, remote
backed by HTTP. No proxies are used and no untyped path walking occurs.

**Value contracts** owns the generator and the value constructors.
**Execution** owns the two `ClientRuntime` implementations.

## D3. Numeric Wire Encoding and Unambiguous Decoding

Every control record is a **single-key JSON object**; the key is the
discriminator. Field names deliberately avoid a `$` prefix. MCP clients and
JSON-Schema tooling treat `$ref`, `$id`, and similar names specially, even
inside `properties`, and correctness does not depend on a sigil.

| Value                         | Wire form                                                             | Rules                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Integer                       | `{"integer":"42"}`                                                    | Canonical decimal text matching `^(0\|-?[1-9][0-9]*)$`, so there is no `+`, no leading zeros, and no `-0`. Magnitude must be ≤ 2^53 − 1 (D10). |
| Finite double                 | `{"double":3}`                                                        | Any finite JSON number except negative zero. `3.0` stays a double because the key says so.                                                     |
| Non-finite double             | `{"double":"NaN"}`, `{"double":"Infinity"}`, `{"double":"-Infinity"}` | Explicit states                                                                                                                                |
| Negative zero                 | `{"double":"-0"}`                                                     | Explicit state (D10). Decoders also accept a JSON `-0` number, but encoders always emit the string state.                                      |
| Date                          | `{"date":"2026-10-31T17:04:05.120Z"}`                                 | `YYYY-MM-DDTHH:mm:ss.sss` followed by `Z` or `±HH:MM`. Encoders emit `Z`. Exactly three fractional digits.                                     |
| Reference                     | `{"reference":{…}}`                                                   | D7                                                                                                                                             |
| File value (output)           | `{"file":{…}}`                                                        | D8                                                                                                                                             |
| File source (input)           | `{"fileSource":{…}}`                                                  | D8                                                                                                                                             |
| Record inside dynamic content | `{"record":{"k": <dynamic>, …}}`                                      | Used only inside `unknown` positions                                                                                                           |
| No value (`none`)             | `null`                                                                | The result of an operation that produces nothing. Encoders emit `null` whatever the native result; decoders yield `undefined`.                 |

Dates and references also use control records at typed positions. That keeps
one uniform rule: every value whose wire form is not a JSON string, boolean,
`null`, array, or schema-declared record is a control record. It also means
the native codec never has to infer dates from strings.

Decoders reject JSON numbers whose payload is not finite, such as an
overflowing literal that parses to `Infinity`. They never round. Point,
Rectangle, and RGB are schema-declared records with wrapped members, for
example `{"x":{"double":1},"y":{"double":2}}` and
`{"r":{"integer":"65535"},…}`.

**Why user records cannot impersonate a wrapper.**

1. **Typed positions are decoded by schema.** At a position the schema
   declares as a record, the decoder reads that record's declared fields and
   rejects any key the schema does not declare. At a numeric position it
   requires a numeric control record. A user record shaped like
   `{"integer":"42"}` at a record position is read as a record with a field
   named `integer`, never as a number.

   Record wire schemas are strict for the same reason, so the runtime's
   validation of a request against `input.wire` (D5 step 4) already rejects an
   undeclared key as a `ValidationError` before execution. The native codec
   applies the same rule again inside the automation process (D11). Because
   input was validated first, a rejection there is a bridge-form defect, not
   caller error (D4). Encoding is the one place extra keys are tolerated:
   native records may carry keys outside the plan, and the native encoder
   drops them, emitting only declared fields.

2. **Dynamic positions (`unknown`) are fully self-describing.**
   - JSON strings, booleans, and `null` stand for themselves.
   - Arrays hold encoded elements.
   - Every JSON object must be a control record.
   - A user record is always enveloped as `{"record":{…}}`, and its values are
     encoded recursively.

   A user record `{"integer":"42"}` therefore travels as
   `{"record":{"integer":"42"}}` and decodes back to the same record. A bare
   object that is not a known control record is a decode error.

   References, file values, and file sources appear only at typed
   positions. When decoding dynamic content, `{"reference":…}`, `{"file":…}`,
   and `{"fileSource":…}` are failures. `DynamicWireValue` does not include
   them, and the derived JSON Schema does not advertise them. When encoding,
   a dynamic value carries no type information, so a plain object shaped like
   a reference or file source is an ordinary user record and travels in the
   `record` envelope. A bound reference or file value fails on its function
   member, as every non-plain object does.
   Decoding a reference needs the resource's identifier type from the app's
   resource table, which an `unknown` position does not name. A file value
   carries a runtime-issued grant that dynamic content has no way to
   establish. The native side cannot produce them there either: app objects
   and path objects fail to encode (D10).

## D4. Native Codec Interface and Executor Consumption

The native codec runs **inside the JXA process**. It converts wire values to
native values for arguments, and native results to wire values, before
`JSON.stringify`. Its interface lives in `packages/core/src/jxa/native-codec.ts`.

- **`NativeCodec { prelude: string }`** — JXA source that declares exactly two
  top-level bindings, both holding functions, and no other globals. They are
  named by the exported constants `NATIVE_DECODE_FUNCTION` (`__mactsDecode`)
  and `NATIVE_ENCODE_FUNCTION` (`__mactsEncode`). `NATIVE_CODEC` is the
  implementation.
  - Both take a third argument, the environment
    `NativeCodecEnvironment { app, references }`: the application object and
    the script's reference table (below). Only reference conversion reads it.
  - `__mactsDecode(wire, plan, env)` returns native values. Dates become
    `Date`, integer text becomes a number, double states become `NaN`,
    `Infinity`, or `-0`, and app-specific bridge forms are produced where the
    plan says so. A reference becomes the app's object it names (below).
  - `__mactsEncode(native, plan, env)` returns JSON-safe wire values. The
    output contains no raw `NaN`, `Infinity`, or `-0` numbers, no `Date`
    objects, and no `undefined` own properties. Absent optional fields are
    omitted. An app object at a reference position becomes the identity
    reference that finds it again (below).
  - Under a `passthrough` plan (D9), both return their argument unchanged.
  - Under a `none` plan, `__mactsEncode` returns `null` whatever the native
    result was, and `__mactsDecode` returns `undefined` (D3).
  - Both throw an object with `name: 'MactsCodecError'`, plus `direction`,
    `path`, and `message`, when a value violates the plan. When the plan has a
    kind the codec cannot convert (`file`, `file-source`, a reference form
    outside the conversion scope below, or an unrecognized kind), the object
    also carries `unsupportedKind`, that kind. When a reference names an
    object the app does not have, the object instead carries
    `missingResource`, the referenced resource.
- **Reference conversion.** The codec converts a single identity reference
  with no container, to a resource the app finds at the application by its
  identifier (D7, native conversion scope). The environment's `references`
  table, `NativeReferenceTable`, holds one entry per resource,
  `NativeReferencePlans { id?, addressing? }`: `id` is the resource's
  identifier plan from the request's `resourcePlans` (D9), and `addressing`,
  `NativeAddressing { collection, lookup, property }`, is how the app finds
  one of its objects from its identifier. The native executor derives
  `addressing` from the manifest, by the resource's identifier targeting
  (D10): `lookup: 'byId'` addresses `app[collection].byId(id)`, and
  `lookup: 'byProperty'` addresses the first match of
  `app[collection].whose({ [property]: id })`. Only a resource whose resolving
  get records no parent (D10, command parents) has `addressing`.
  - Decoding runs in two phases. The first converts the whole input with no
    access to the application: the reference's form, its resource's `id` plan
    and `addressing`, and its `id` are checked and converted there, and the
    reference becomes a pending address. Every validation failure and every
    `unsupportedKind` failure, at any position, happens in this phase. Only
    then does the second phase address each pending address's object, in
    input order, and require its `exists()` to be `true`. A miss throws the
    codec error with `missingResource`, before any command uses the object.
  - Encoding reads the object's identifier as `native[property]()`, converts
    it by the `id` plan, and emits
    `{ reference: { resource, form: 'identity', cardinality: 'one', id } }`.
    The SDK stamps the app on decode; the wire form has none.
  - A selector, a collection, a container, or a resource with no `id` plan or
    no `addressing` throws the codec error with `unsupportedKind: 'reference'`,
    in either direction. So does a reference when the codec is called with no
    environment.
  - The codec calls only members of the objects passed to it (the
    application, its collections and objects) and reads no globals.
- **`NativeScript`** — `{ bundleId, body, input, inputPlan, outputPlan, references, page? }`.
  - `input` is a `WireRecord`, because operation input is always
    record-shaped (D2).
  - `body` is a JXA function body invoked as `(app, args, page)`. `args` is
    the decoded input record; `page` is the page window a paged list reads,
    or `null`.
  - `references` is the script's `NativeReferenceTable`. The native executor
    builds it from the request's `resourcePlans` and the manifest, pruned to
    the resources the input and output plans reach, including resources
    reached through an identifier plan. It is required; a script with no
    reference positions carries an empty table.
  - Arguments are never interpolated into source text.
  - The bodies that `rpc.ts` builds today move into the native executor and
    read `args.<name>`.
- **`NativeOutcome`** — `{ ok: true, value: WireValue } | { ok: false, failure: NativeFailure }`.
  A `NativeFailure` takes one of two forms:
  - `{ source: 'app', message, errorNumber? }`: raised by the app or the bridge.
  - `{ source: 'codec', direction, path, message, unsupportedKind?, missingResource? }`:
    raised by the codec. At most one of the two optional fields is present.
  - `{ source: 'collection', message }`: a paged read found its collection
    changed between pages.

**How `executor.ts` consumes it.** The executor gains a function,
`runNativeScript(script, codec, { timeout, signal, maxOutputBytes })`, that runs
a `NativeScript` with a `NativeCodec` and resolves to a `NativeOutcome`. The
time limit stops the process, the caller's abort signal kills it, and output
past `maxOutputBytes` on either stream stops it; any transport, including a
long-lived worker, must honor all three. It replaces the inline
`JSON.stringify(result)` wrapper with this composition:

```js
ObjC.import('stdlib');
/* codec.prelude */
var __mactsOutcome = (function () {
  try {
    var app = Application("<bundleId>");
    app.includeStandardAdditions = true;
    var env = { app: app, references: JSON.parse("<references as JSON text>") };
    var args = __mactsDecode(JSON.parse("<input as JSON text>"), JSON.parse("<inputPlan as JSON text>"), env);
    var value = (function (app, args, page) { /* body */ })(app, args, JSON.parse("<page window or null as JSON text>"));
    return { ok: true, value: __mactsEncode(value, JSON.parse("<outputPlan as JSON text>"), env) };
  } catch (e) {
    return { ok: false, failure: /* describe(e): codec marker → codec, else app with e.errorNumber */ };
  }
})();
JSON.stringify(__mactsOutcome);
```

The input, both plans, the reference table and the page window are embedded
as JSON string literals passed to `JSON.parse`, never as object literals: a
`__proto__` key in an object literal sets the prototype instead of creating a
field. The bundle ID is a JSON string literal, and the application object has
`includeStandardAdditions` set before the body runs, as the bridge has always
set it. The application object is created before the input is decoded,
because finding a referenced object needs it.

**Nothing reaches the app before the input converted.** No member of the
application, or of any object it hands out, is read or called until every
input value has converted. Creating the application object and setting
`includeStandardAdditions` on it are the only uses before that point. Decoding's
first phase converts the whole input without touching the application; only
its second phase finds referenced objects and checks they exist; only then
does the body run and send its command. So a value that cannot convert, a
file, a file source, a reference form the provider cannot convert yet, or an
invalid value, fails before the app receives any event, wherever it sits in
the input. An app that is not installed fails at creation, as
`AppUnavailableError` (`not-installed`), whatever the input holds.

The transport seam is `NativeTransport`, with `runNativeScript` as the
built-in implementation. `composeNativeScript` and `parseNativeOutcome` are
not public API: tests in other packages reach them through
`@macts/core/testing`, an internal test-support entry that is outside the API
report and not covered by semantic versioning.

The script is passed to `osascript` without shell interpolation
(`execFile` with an argument vector, script on stdin), so values never cross a
shell.

In the catch block, a thrown object whose `name` is the codec marker becomes a
`codec` failure with its `direction`, `path`, `message`, and its
`unsupportedKind` or `missingResource` when it has one. Anything else
becomes an `app` failure whose `message` is `String(e && e.message || e)`, with
`errorNumber` only when `e.errorNumber` is a number. An app error caught in
the process carries its native number (a missing object gives -1728), and
`Application()` for an uninstalled bundle ID throws inside the try with -2700
and "Application can't be found.". A success whose value serialization drops
(a passthrough body returning `undefined`) is read as `null`. Output that is
not a well-formed outcome rejects as a process failure.

The native `Executor` maps a `NativeOutcome` failure to canonical errors:

- App and bridge failures map by `errorNumber` through the table below. With
  no number, the failure is `AppOperationError`.
- A codec `encode` failure maps to `UnexpectedValueError` with
  `issues: [{ path, message }]`.
- A codec `decode` failure maps to `ValidationError` with
  `issues: [{ path, message }]`. Input was already validated against `wire`,
  so this indicates a bridge-form defect.
- A codec failure with `unsupportedKind`, in either direction, maps to
  `InternalError`, never `ValidationError` or `UnexpectedValueError`: no input
  or result at that position can be converted, so neither the caller nor the
  app is at fault. Its message names the operation, the kind and the position.
  For a reference it reads: The Contacts operation "actionTitle" takes a
  reference at `for` that the macOS provider cannot convert yet.
- A codec `decode` failure with `missingResource` maps to
  `TargetNotFoundError` with `details: { resource }`, the referenced resource,
  and a message naming the position: Contacts has no Person matching the
  reference at `for`. It is not read from an app error number; the codec
  checks existence before any command runs.
- An app failure with -1728 and `missingResource` maps to
  `TargetNotFoundError` with `details: { resource }`, that resource: a scoped
  operation's body checks its parent exists before it addresses anything
  under it, and a missing parent names the parent's resource, not the
  operation's. Google Chrome has no Window matching the request, for a tab
  got within a window that does not exist.

Native error numbers map to D6 classes as follows:

| `errorNumber`                            | Meaning                                          | Error                                    |
| ---------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| -1728                                    | The addressed object does not exist              | `TargetNotFoundError`                    |
| -1719                                    | The index or range is invalid for its collection | `InvalidSelectionError`                  |
| -1743                                    | This Mac has not authorized automating the app   | `AppAuthorizationRequiredError`          |
| -600, -609                               | The app is not running, or its connection ended  | `AppUnavailableError` (`not-responding`) |
| -1712                                    | The app did not reply within its event timeout   | `AppUnavailableError` (`not-responding`) |
| -10814                                   | The app cannot be found                          | `AppUnavailableError` (`not-installed`)  |
| -2700 with "Application can't be found." | The app is not installed                         | `AppUnavailableError` (`not-installed`)  |
| any other number                         | The app reported a failure                       | `AppOperationError` with `appErrorCode`  |

When the process itself fails there is no outcome. The transport rejects
with a `JxaExecutionError` whose `kind` says what happened, and
classification reads that field, never Node's child-process error shape:

- **Time limit.** `OperationTimeoutError` applies only to `timed-out`: the
  transport's own time limit stopped the process (`timedOut` is `true` for
  exactly this kind). A process killed by any other signal is not a timeout;
  this includes an out-of-memory kill, an external `kill`, and the output
  limit.
- **Cancellation.** `cancelled`, the caller's signal stopped the process,
  maps to `OperationCancelledError`.
- **Host failures.** `output-too-large` (output past the per-stream limit),
  `not-started` (the host could not be started), and `signalled` (killed by a
  signal macts did not send) map to `InternalError`. A missing host is not
  `AppUnavailableError`: the target app may be installed.
- **Compile failure or malformed output.** A script that fails to compile, or
  whose output is not a well-formed outcome (`unreadable-output`), maps to
  `InternalError` with a sanitized message. Either one is a macts defect, not
  an app failure.
- **Trailing error number.** An `exited` failure whose standard error ends in
  an error number maps through the table above. With no number, it maps to
  `InternalError`.

App-supplied text never reaches a message or `details`. This covers an app
failure's `message` and the process's standard error, which stay only in
`cause`. Codec `path` and `message` are written by macts and describe the
contract, so they may appear in `issues`.

**Native collection accessors.** A body addresses an element collection, on
the application object or on a parent item, by the app's own spelling of the
dictionary term, never by the public resource segment. The automation bridge
resolves only that spelling: the first word lowercased whole and each later
word capitalized ("media items" is `mediaItems`, "URL tracks" is `urlTracks`).
Any other spelling, including all lowercase, names no collection. One function,
`resolveCollectionAccessor` in `manifest/native-accessor.ts`, gives every
accessor a body uses: the resource's own collection, and the collection of
the parent a command records (D10, command parents). Its default applies the
bridge's rule to the plural with the same acronym-aware word split as the
public segment (`manifest/lower-camel.ts`), so `URLTracks` gives `urlTracks`
and `URLs` gives `urls`. No accessor is spelled from a parameter's name. The
default coincides with the public segment, but the two
answer different questions. Where the app's term cannot be derived from the
plural ("AirPlay devices" is `airplayDevices`, not `airPlayDevices`), the
spelling recorded in the manifest takes precedence over the default, and
properties are addressed the same way (D10, native spellings). A
macOS test resolves every top-level accessor of every body built from every
shipped manifest against the installed app's dictionary with
`ObjectSpecifier.hasInstance`. The check never launches an app. The rule:

- `hasInstance` sends the app no event and does not launch an app that ships a
  static scripting definition (the `OSAScriptingDefinition` file in its
  bundle).
- `Automation.getDisplayString` does launch the app when it renders a resolved
  specifier, so the check does not use it.
- An app without a static definition publishes its terms only while running,
  so resolving any of them launches it. Such an app is skipped, and the reason
  is reported.
- Each app is checked in its own process with an 8-second limit. An app that
  does not answer is reported, not failed. An app the check launches anyway
  fails it.
- The built-in macOS apps that ship a static definition and have a top-level
  collection in a body must be checked, so the test cannot pass by checking
  nothing.

Known exceptions are listed with their issue, and the test fails when one
starts resolving.

**Command parents.** A command on a nested resource reaches its target
through the parent the manifest records for it (`command.parent`), never a
guessed one. The body binds the parent item, addressed in the parent
resource's collection by that resource's identifier targeting with the
identifier read from the recorded parameter, fails as "no such object" when it
does not exist, and then addresses the command's resource collection under
it. A get, update or delete finds its item in that collection by the item
resource's own identifier targeting, as a top-level lookup does: a Music track
is matched by its persistent ID under its playlist, since its numeric id
belongs to its entry in that one playlist. A command that records no parent
addresses its resource's collection at the application. The rule, the guard,
and its exceptions are in D10 (command parents).

**Worker compatibility.** A later executor may run a long-lived automation
worker (one process per target app, pooled and restartable) instead of one
`osascript` process per call. The contracts above do not preclude it, because
they hold these invariants:

- The codec prelude is pure. It only defines the two bindings, holds no
  per-call state, and is idempotent, so a worker can install it once.
- A `NativeScript` body references only `app`, `args`, its own locals, and
  standard ECMAScript built-ins. It uses no other globals and no per-call
  state, so a worker can compile each body once (for example, cached by body
  text) and invoke it many times. A test checks every body built from every
  shipped manifest for free identifiers.
- Inputs and plans are data. The `JSON.parse` string-literal embedding exists
  only because the `osascript` transport sends source text. A worker receives
  them over its channel and never embeds them.
- The composed script (`ObjC.import`, the prelude, the IIFE, and
  `JSON.stringify`) is the per-call form for the `osascript` transport only.
  It calls the codec only through the exported binding names.
- `NativeOutcome` and its failure description are the transport-independent
  result.
- The `Executor` interface (`execute(request)`) assumes nothing about process
  lifetime.
- Only the process-failure classification is transport-specific: a kill by
  the transport's own timer is a timeout, and any other death is
  `InternalError`. A worker maps a worker crash or restart the same way. A
  per-call timeout on a worker may require restarting that worker.

**Sequencing.**

1. **Value contracts** implements the codec prelude, the plan, and
   native-boundary tests first. It writes the codec functions as plain
   JavaScript in a TypeScript module, so they are unit-testable in Node, and
   embeds them via `Function.prototype.toString()`. The native-boundary tests
   run real `osascript` through a test-local harness.
2. **Execution** then edits `executor.ts` to consume the codec, and owns the
   error description and mapping.

Edits to `executor.ts` are serialized: execution is its only editor.

## D5. Invocation Context and Token-Derived Authority

Defined in `@macts/contracts` (`invocation/`):

- **`Credential`** — `{ scheme: 'bearer'; reveal(): string }`. The concrete
  holder, created by the runtime, redacts itself in `toString`, `toJSON`, and
  `util.inspect`, so it cannot leak into logs, errors, or audit records.
  `reveal()` is called only where the token must be presented: verification,
  or the remote `Authorization` header.
- **`InvocationContext`** — `{ credential, signal?, correlationId? }`. One per
  invocation. The client holds the credential from factory options and attaches
  it to every call. MCP adapters attach a credential to every tool call and
  never rely on a startup-only check. Over stdio (`macts --mcp`) it is the key
  configured for the session; over HTTP (the MCP server of `macts mcp serve`
  and `macts mcp start`) it is the bearer token of the request that carried
  the call, threaded into `invoke`, so each caller is governed by its own key.
- **`Authority`** — `{ subject, displayName?, permissions, expiresAt? }`. This
  is what verification derives. `subject` is today's `apiKeyPayload.sub` and is
  the sole audit attribution key. An `Authority` never holds the secret.

**Pipeline.** The runtime is the only place that turns a credential into
authority, in both modes. Adapters translate protocol context into an
`InvocationContext` and nothing more. Each step reuses an existing mechanism:

| Step                                                                                                 | Reuses                                                                                                                                                                                                                                                                                                                                     | Failure                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Verify credential → `Authority`                                                                   | `validateApiKey`, moved unchanged to the runtime                                                                                                                                                                                                                                                                                           | `AuthenticationError` with `reason`: `missing`, `malformed` (`INVALID_FORMAT`, `MALFORMED_PAYLOAD`), `invalid` (`INVALID_SIGNATURE`), `expired`, `revoked`                                                                                                                                       |
| 1b. Admission (optional): `rateLimiter.admit(authority.subject)`                                     | The fixed-window counter of the former HTTP rate-limit middleware, as `createRateLimiter`                                                                                                                                                                                                                                                  | `RateLimitedError` (`retryAfterSeconds`). A limiter that throws denies with `InternalError`, never `RateLimitedError`.                                                                                                                                                                           |
| 2. Permission check against `descriptor.permission`, using the manifest command's permission history | `checkPayloadPermission` / `hasPermission`                                                                                                                                                                                                                                                                                                 | `PermissionDeniedError` (`required`, `hint`, `changelog`)                                                                                                                                                                                                                                        |
| 3. Input validation against `descriptor.input.wire`                                                  | `recordInvalidInput`: one `invalid-input` audit record `{ capability, app, apiKeyId: subject, timestamp: clock(), issueCount }`, with no argument values, summary, or issue messages                                                                                                                                                       | `ValidationError`. This catches raw wire requests and casts that bypassed client-side `encode`. For a list that pages it includes reading the page window and checking any cursor against the operation and the call's other inputs (D9). Governance is not evaluated and no approval is sought. |
| 4. Governance: `resolveGovernanceForRequest(governance, authority.subject)` → `enforceCall`          | Audit context `{ apiKeyId: subject, argsSummary, timestamp: clock(), approvalId }`, where `argsSummary` is `redactArgs` over the operation's declared input parameters, each value taken from the validated input (a `cursor` recorded as `true`), followed by `unknownKeys: N` when the input had N keys that are not declared parameters | `PolicyDeniedError`. With no approval gate, a confirm-first hold raises `ApprovalPendingError`. With a gate, the runtime calls `seekApproval` then `recordApprovalDecision`; a rejection, a timeout, or a failure to record raises `ApprovalRejectedError`.                                      |
| 5. `executor.execute(...)`                                                                           | —                                                                                                                                                                                                                                                                                                                                          | Canonical errors from the provider; any non-canonical throw becomes `InternalError`                                                                                                                                                                                                              |

Permission comes before validation, so there is no schema oracle: a caller
without the permission learns nothing about the operation's input contract,
and is answered `PermissionDeniedError` whatever its input, never
`ValidationError`. A caller that has the permission and sends invalid input
is answered `ValidationError`. A permission denial writes no audit record. Validation
comes before governance, so only well-formed calls reach policy, audit
summaries, and approvers: an argument summary describes input that passed its
contract, and names only parameters the contract declares. A key that is not
a declared parameter (an input schema may let it through, as a manifest
command's request schema does, or strip it) is counted in `unknownKeys` and
never named. A call rejected by validation after the permission check writes
exactly one `invalid-input` audit record (D6) with the number of validation
issues and nothing from the input, and is never put to an approver.

Fail-closed rules carry over unchanged: a resolver failure, an `enforceCall`
failure, or an audit-write failure denies the call. That includes the
`invalid-input` record: if it cannot be written, the call fails with
`InternalError` rather than `ValidationError`. Steps 1–4 also govern reference
resolution and file fetch, which are read-risk calls (D7, D8). Execution owns
the pipeline.

Step 1b is admission, not authority. It runs only when the runtime is
constructed with a `rateLimiter`, keyed by the verified subject, so it never
sees an unauthenticated call. It never changes the `Authority` and never
grants anything: an admitted call still passes steps 2–5. If the limiter
itself fails (`admit` throws, or a denial carries an invalid retry delay), the
call is denied with `InternalError`, following the fail-closed rule. It is not
reported as `RateLimitedError`, because the caller did not exceed a limit and
a 429 would invite a retry that cannot help.

Transport protection that is not policy stays in the adapter and outside this
table. The HTTP adapter applies a coarse per-client-address request limit
before calling the runtime, because step 1b never counts failed
authentication. It answers with the same `RATE_LIMITED` envelope and
`Retry-After`, and is skipped when the request has no network peer (an
in-process request). Every HTTP route that calls the runtime (operations and
reference resolution) shares one limiter, so one budget covers an address
across namespaces.

**HTTP namespaces.** Each kind of call has its own top-level namespace on the
HTTP server:

- `/api/v1` holds app operations at `POST /api/v1/rpc/<operation id>`, and
  the unauthenticated listings at `/api/v1` and `/api/v1/introspect`;
- `/references/v1` holds reference resolution (D7);
- `/transfers/v1` will hold binary transfers (D8). Nothing is served there
  yet; the namespace is reserved now so that no app can claim it first.

`/references/v1` and `/transfers/v1` are siblings of `/api/v1`, never segments
under it: `/api/v1` is the namespace of app operations, and these calls are
not app operations. Under `/api/v1` itself, `rpc` holds the operations and
`introspect` the listings. The listings predate this namespace rule and stay
there for compatibility.

So that no app is ever spelled like one of these namespaces or routes on any
surface, `introspect`, `rpc`, `references` and `transfers` are reserved: none
is ever an app's route segment. The runtime refuses an app with a reserved
segment at registration (`registerManifest` and `registerContract` raise
`OperationRegistrationError`, and nothing registers), so every host refuses
it, not only HTTP. The reserved names are exported as
`RESERVED_APP_ROUTE_SEGMENTS` from `@macts/runtime`.

Locality changes only where the pipeline runs. In remote mode the client
presents the credential over HTTP and the service runs the same pipeline.
There is no local shortcut that skips steps 1–4.

**This Mac's governance.** `loadHostGovernance()` in `@macts/runtime` is the
single definition of the governance a host enforces when none is supplied. It
composes the active policy (`<macts-home>/governance/policy.json`), the
registered approval gate, the stored per-key policy resolver, and a file audit
writer (`<macts-home>/governance/audit.jsonl`). The local client and the HTTP
server both default to it, passing the loader itself; the runtime loads it once,
on the first call that reaches step 3 (to audit invalid input) or step 4. `createRuntime` itself requires a
`governance` option and has no default, so a host that builds a runtime
directly (the MCP host included, #101) cannot run calls under governance it
forgot to supply. Missing and malformed configuration are treated differently:

- A **missing** policy file resolves to the documented default policy, so a
  first run works. The key's own permissions still gate the call at step 2.
- A **malformed or unreadable** policy file or approval registration fails
  closed. Every call fails with `InternalError`, and nothing ever falls back to
  allow-all. The failed load is kept, not retried, for the life of the runtime.
- An **audit-write failure** under `MACTS_HOME` denies the call, per the
  fail-closed rule above.

**Registering installed apps.** Every macts host on this Mac (`macts --serve`,
`macts --mcp`, and the MCP server of `macts mcp serve`) registers the installed
apps' generated contracts through one host registration function, so every
surface validates calls against the same descriptors. The function finds each
installed host package (`@macts/<app>-server`) in the plugins directory, imports
it, and reads its `contract` export: the host package is the install opt-in and
re-exports the contract of the app it serves. Node resolves `@macts/<app>`
through the host package's own dependencies; the host does not locate the app
package itself. The function then validates the manifest the contract loads and
calls `registerContract(contract, manifest)`. An app has at most one registered
contract, because the contract's resource table is the app's reference
registry (D7); a second contract for the same app is refused. A host package
without a `contract` export was installed by an older macts: it is reported
with the command that reinstalls it (`macts mcp install <app>`) and skipped, with no
fallback to another way of finding the contract. Any other app that fails to
load or register is likewise reported with its reason and skipped, and the other
apps still register. An app installed without its host package is reported at
startup, with the command that installs it. Manifest registration
(`registerManifest`) remains for embedders and tests; it runs passthrough
descriptors, validated by each command's request schema.

## D6. Structured Error Registry, Wire Codec, and Reconstruction

Defined in `@macts/contracts` (`errors/`). Every canonical class extends the
abstract `MactsError<Code>` and carries:

- `code`: a closed `ErrorCode` literal
- `details`: typed per code by `ErrorDetailsByCode`
- `message`
- `cause`, which is local only and never serialized

`AnyMactsError` is the union of all classes. A `switch (error.code)` over it
narrows `details`.

| Class                           | `code`                       | Distinct meaning                                                                                                                                                        | Default HTTP                                      |
| ------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `ValidationError`               | `VALIDATION_FAILED`          | Caller input violated the operation contract (`issues[]`). Raised by input validation after the permission check, it is audited with the decision `invalid-input` (D5). | 400                                               |
| `UnexpectedValueError`          | `UNEXPECTED_VALUE`           | An app result violated the contract. This includes an enum member the SDK does not know and an out-of-policy integer (`issues[]`).                                      | 502                                               |
| `AuthenticationError`           | `UNAUTHENTICATED`            | Credential missing or unusable (`reason`)                                                                                                                               | 401                                               |
| `RateLimitedError`              | `RATE_LIMITED`               | The caller exceeded its admission limit; not evaluated further (`retryAfterSeconds`, a non-negative integer)                                                            | 429                                               |
| `PermissionDeniedError`         | `PERMISSION_DENIED`          | Credential lacks the required permission                                                                                                                                | 403                                               |
| `PolicyDeniedError`             | `POLICY_DENIED`              | Governance policy forbids the call (`permission`, `layer`)                                                                                                              | 403                                               |
| `ApprovalPendingError`          | `APPROVAL_PENDING`           | Held for confirmation with nobody to ask; not executed                                                                                                                  | 409                                               |
| `ApprovalRejectedError`         | `APPROVAL_REJECTED`          | Held, put to a human, and not approved (`state`)                                                                                                                        | 403                                               |
| `TargetNotFoundError`           | `TARGET_NOT_FOUND`           | A singular target does not exist (`entryIndex` for a missing identity-collection entry)                                                                                 | 404                                               |
| `FileNotFoundError`             | `FILE_NOT_FOUND`             | A referenced file does not exist or disappeared                                                                                                                         | 404                                               |
| `InvalidSelectionError`         | `INVALID_SELECTION`          | A range or index selection is invalid for the collection                                                                                                                | 400                                               |
| `CollectionChangedError`        | `COLLECTION_CHANGED`         | The collection changed while it was being read, so no consistent result exists; the same request is correct and can be retried, from the first page if it was paged.    | 409                                               |
| `AppUnavailableError`           | `APP_UNAVAILABLE`            | The app is not installed or cannot be reached                                                                                                                           | 503                                               |
| `AppAuthorizationRequiredError` | `APP_AUTHORIZATION_REQUIRED` | macOS has not authorized automating the app. This is distinct from macts permission denial.                                                                             | 503                                               |
| `AppOperationError`             | `APP_OPERATION_FAILED`       | The app reported a failure not covered above (`appErrorCode?`)                                                                                                          | 502                                               |
| `OperationTimeoutError`         | `TIMEOUT`                    | The operation exceeded its time budget                                                                                                                                  | 504                                               |
| `OperationCancelledError`       | `CANCELLED`                  | The caller aborted the operation                                                                                                                                        | n/a (the caller stopped waiting); recorded as 499 |
| `TransferError`                 | `TRANSFER_FAILED`            | A transfer expired, was incomplete, was too large, or is unknown                                                                                                        | 400 / 410 / 413                                   |
| `InternalError`                 | `INTERNAL`                   | An unexpected macts failure, with a sanitized message                                                                                                                   | 500                                               |
| `TransportError`                | `TRANSPORT_FAILED`           | **Client-side only.** The service was unreachable, sent an invalid response, or uses a different protocol.                                                              | n/a                                               |

**Wire codec.** An error response body is
`{ "error": { "code", "message", "details" } }`. Over HTTP, a 401 also
carries `WWW-Authenticate: Bearer` (RFC 7235 §4.1, RFC 6750 §3), and a 429
carries `Retry-After`. The error envelope is protocol metadata with its own
per-code schemas, not the value codec. Its fields are strings, booleans, and
small integers, which JSON represents exactly.

**Route misses.** A request that matches no HTTP route, including
`POST /rpc/<unregistered id>`, is answered 404 with
`{ "error": { "code": "NOT_FOUND", "message", "details": {} } }` and never
reaches the runtime. `NOT_FOUND` is deliberately outside the registry: a
client hitting an unknown route is a protocol mismatch, not an operation
outcome, so the client reconstructs it as `TransportError` with reason
`'protocol-mismatch'` like any other unknown code.

**Unreadable bodies.** A request body that is not JSON cannot become an
operation input, so the HTTP adapter answers it with `ValidationError` (400,
one issue at path `[]`) before invoking the runtime. This is a framing check,
like a route miss: no credential is verified and nothing is executed, and
route names are already public through unauthenticated introspection. An
absent or empty body is the empty input `{}` and is invoked normally.

**Unexpected failures.** Anything the HTTP adapter cannot encode as a
canonical wire error (a non-canonical throw, or details that fail their
schema) is answered 500 with a generic `INTERNAL` envelope. The original is
logged on the service and never echoed.

**Reconstruction.**

- The remote client selects the class from `code` through the registry
  `ERROR_CLASSES` (`{ [C in WireErrorCode]: constructor }`), never from the
  HTTP status. Status codes are advisory and the adapter owns them.
- An unknown code, or a body that fails its code's schema, becomes a
  `TransportError` with `reason: 'protocol-mismatch'` that carries the
  original code. The error is never guessed into a different class.
- `TransportError` is excluded from `WireErrorCode`; a service never sends it.

**MCP.** Failures return `isError: true` with text content
`{ "error": WireError }`, so agents receive the same code and details.

**Credentials.** No error message or `details` field ever includes a
credential, a signed URL, or bytes.

`UnreachableError` is separate. It extends `Error` rather than `MactsError`
and is never on the wire, because it signals a caller-side exhaustiveness
violation, not an operation outcome.

Ownership:

- **Execution** implements the codec, the registry use, and the HTTP and MCP
  mappings.
- **Value contracts** supplies validation `issues` from codecs.
- Both use the classes in the skeleton.

## D7. Reference Hydration Contracts

Defined in `@macts/contracts` (`references/`). Cardinality (`'one' | 'many'`)
and form (`'identity' | 'selector'`) are independent discriminants.

| Type                                 | Kind                                                                                               | `resolve()` result                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Resolvable<R>`                      | Broad: anything that hydrates                                                                      | `Promise<R>`                                                                             |
| `ObjectReference<T>`                 | Single object (any form)                                                                           | `Promise<T>`; a missing target raises `TargetNotFoundError`                              |
| `CollectionReference<T>`             | Deferred collection (any form); membership is decided when resolved                                | `Promise<readonly T[]>`, possibly empty; an invalid range raises `InvalidSelectionError` |
| `IdentityReference<T, Id>`           | Single, `form: 'identity'`, `id`, optional `container`                                             | as `ObjectReference`                                                                     |
| `SelectorReference<T>`               | Single, `form: 'selector'`, `selector: { by: 'name' } \| { by: 'index' }`, optional `container`    | as `ObjectReference`; duplicate-name behavior is app-defined                             |
| `IdentityCollectionReference<T, Id>` | Deferred, `form: 'identity'`, explicit reorderable `entries`                                       | as `CollectionReference`                                                                 |
| `SelectorCollectionReference<T>`     | Deferred, `form: 'selector'`, `selector: { by: 'every' } \| { by: 'range' }`, optional `container` | as `CollectionReference`                                                                 |
| `ReferenceList<R>`                   | Materialized collection: `readonly R[]` of single references                                       | Not itself resolvable; each entry resolves independently                                 |

**Selectors.** Indexes are zero-based. A range `{ start, end }` is half-open
over zero-based positions, following JavaScript conventions. The native bridge
translates both. The value library adds filter predicates (`by: 'where'`) with
a grammar shaped by concrete supported operations. Queries that combine
filter, order, and range ("ten most recent") are defined there as well.

**Wire form.** Inside `{"reference": …}` the wire form carries:

- `resource` (the manifest resource key)
- `form`
- `cardinality`
- either `id` (wire-encoded), `entries`, or `selector`, depending on the form
- an optional `container` reference

It carries no `app` and no label.

**The app.** Every reference names the app it belongs to in its data and
bound forms: `app`, the `AppContract.app` of the contract it is used with. It
is present at every level: the reference, each container, and each
identity-collection entry. The wire form never carries it, because the route
already names the app. Decoding sets `app` from the contract at every level.
A hand-built reference must supply it, and the types require it. Encoding
rejects a reference whose `app` is missing, or differs from the contract's,
at any level. The issue is at `[...path, 'app']`, so the call fails with
`ValidationError` before anything is sent. A reference therefore cannot be
passed to another app's operation.

**Identifier types.** A reference's `id` and every container's `id` are
wire-encoded by their own resource's identifier value type. A container
usually belongs to a different resource. The reference value type is built
as `t.reference(scope, resource, cardinality)`. `scope` is a function
returning a `ReferenceScope`: `{ app, resources }`, the app and its resource
table. The app contract is assignable to it, so generated code passes
`() => <app>Contract`. Each `ResourceDescriptor` in the contract's
`resources` carries `id` (D2), so generated code builds no parallel table.
The scope is read lazily. Laziness lets mutually referencing record types
compose, even though the contract is defined after them, and construction
never reads the scope. Many resources have no primary identifier property. Their descriptor
has no `id`, so they can be referenced only by selector forms, and an identity
form naming one is an encode and decode issue. A resource key that is missing from the table, whether at the top
level or in a container, is an encode and decode issue. A materialized
`ReferenceList` is `t.array(t.reference(…, 'one'))`, with no constructor of
its own.

**Typed positions.** A typed reference position accepts both forms of its
cardinality, and the position fixes the cardinality: a single-object position
accepts only single-object data, in either form. The resource key is a
literal type on the data types and on the bound types, so a bound `Mailbox`
reference is not assignable to an `Account` position, in either direction.
The two directions use different forms:

- An **output** position holds a bound reference, `ObjectReferenceVariant<R,
Id, 'Key'>`, which a client decoded and can resolve.
- An **input** position takes the data form, `ObjectReferenceData<Id, 'Key'>`.
  A caller can pass a reference it built, by identifier or by selector, or one
  it received, because every bound reference is assignable to its data form.

`t.reference(…)` builds the same value type for both. Its SDK type is the
bound form, which is what decoding produces, and it is assignable to a value
type of the data form, so generated code types inputs by the data form
without a second constructor.

**Resolvable targets.** Every resolvable object has its resolving operation:
`get` for a single object, a container, and an identity-collection entry (a
bound entry is itself a resolvable single reference), and `list` for a
collection. There is no exception. The contract's `resources` table already
records both operations, so a reference value type reads them from its scope,
along with the parent each operation records (below). A generated table lists only the resources
that record `get` or `list`: no reference to any other resource is valid at
any position or in any form, so a reference naming one is rejected as naming
no resource the app can resolve references through.

The rule is part of the wire schema, so one rule serves every boundary. A
reference position's wire schema admits only resources with the operation the
position needs. Every container's `resource` admits only resources with
`get`, and an identity collection admits entries only when its resource has
`get`. A position whose resource lacks its operation admits nothing; its
derived JSON Schema is `{"not": {}}`. Otherwise the derived JSON Schema lists
exactly the admitted container keys, so tool and HTTP schemas advertise them.
The runtime check of raw HTTP and MCP requests against `input.wire` (D11)
therefore enforces the rule, and the codecs and the SDK schema apply the same
predicate. When encoding or decoding, a position's own reference fails at its
path, and a container or an entry fails at its `resource`, for example
`[...path, 'container', 'resource']` or `[...path, 'entries', 0, 'resource']`,
at every depth. The raw `input.wire` check names no such path: a reference that
matches none of the wire forms is one issue at the reference itself. An empty
identity collection has no entry to resolve, so it is admitted.

**Parent-scoped targets.** Some resolving operations find objects only within
an object of another resource: their command records a parent (D10, command
parents) and takes that parent's identifier. Music gets and lists tracks
within a playlist; Contacts addresses, emails and phones within a person;
Calendar events within a calendar; Google Chrome and Microsoft Edge tabs within
a window; TV playlists within a source. Reminders lists reminders only within a
list but gets one at the application, and Automator, Microsoft Edge (bookmark
items), OmniGraffle and Xcode list some resources only within a parent in the
same way. A reference resolved through such an operation can be resolved only
when it carries the parent's identifier, so its `container` is required and
must be an identity reference to that operation's parent. A reference takes the
parent of the operation that resolves it: a single-object reference in either
form (a name or index selector included), a container and an
identity-collection entry take the `get` parent, and a selector collection
(every or range) takes the `list` parent. A missing container, one naming
another resource, and a selector container (which supplies no identifier) are
encode and decode issues at `[...path, 'container']`, and the wire and SDK
schemas reject them, so the derived JSON Schema of such a position lists
`container` as required and admits only the parent's identity form there. The
container is read by the same rules, so a chain of parents is checked level by
level. A reference resolved through an operation at the application keeps an
optional container of any resolvable resource. The rule narrows what bound and
data reference types admit, so `bindReference` and every typed input position
reject the same references at compile time.

The resource table records the parents once, as `ResourceDescriptor.parents`,
`{ get?, list? }`, keyed like the routes: each field is the key of the parent
resource, present exactly when the command behind the route of the same name
records a parent, and taken from that command's `parent.resource` when the
contract is generated, as `get` and `list` are chosen. `parents` is absent
when neither route records one, and the two fields may name different
resources. Encoding, decoding, the wire and SDK schemas, the reference data
types and resolution all read this field; none re-derives it from the
manifest. A route's parent that references cannot name by its identifier and
resolve through a `get` fails generation, naming the resource, the route and
the parent, because no reference resolved through that route could then be
resolved. A guard over the shipped contracts
(`e2e/mcp-contracts/test/parent-scoped-resources.integration.test.ts`) holds
every table's `parents` to the manifest commands behind its routes and pins
them by hand.

A container whose parent is name-keyed and not claimed unique (Calendar
calendars, Automator workflows, Xcode workspace documents) names the parent by
name, and a name others share resolves to the first match the app returns. How
name-keyed resources are looked up is
[#208](https://github.com/mike-north/macts/issues/208).

Generated surfaces never publish an operation an agent cannot call. Some input
positions admit no value at all: those that take a single reference to a
resource with no `get`. A position that also admits `null`, or that takes an
array (which may be empty), is not one of them. What happens depends on
whether the position is optional:

- An optional one is left out of the input: the SDK types, the value types and
  their JSON Schemas, the HTTP client's parameters, the CLI flags, and the
  capability schema.
- A required one means the operation can never be called. Generation warns,
  naming the app, the operation and the position. The descriptor stays in
  the contract's `operations`, marked `unavailable` with the positions and
  the reason. The runtime answers `invoke` of it exactly as an unknown
  operation: the same `ValidationError`, after the credential is verified and
  the call admitted, and before permission, governance or approval, so no
  human is asked to approve a call that cannot run. Reference resolution
  finds its operation the same way, so a resource whose resolving operation
  is unavailable cannot be resolved. The MCP and HTTP adapters leave the
  operation out of their tools, routes and listings, so a call to it is
  answered as one to an unknown operation. Neither generated client has a
  method for it, and the CLI, capability discovery and the permission listing
  leave it out too.

The contract, HTTP client and CLI generators, the capability registry and the
permission listing take this judgment from one manifest-level function.
Generation fails if the contract disagrees with it.

Generated contracts also never declare an output position at which macts
cannot yet return a reference a caller can resolve. This is an interim truth
guard, not the goal. Where an app exposes a relationship and a path to its
target, macts is to provide that path and a reference that hydrates through
it, and an omitted position is a gap in what macts covers, not something the
app cannot do (#219). Every reference a manifest type describes is a single
reference, and an array of them is a list of single references, so each
needs its target's `get`. macts cannot yet return a usable reference when:

- macts has no usable `get` for the target yet, so no reference to it can be
  resolved;
- macts has no primary identifier for the target yet, so the target has no
  identity form, and native reads emit only identity references (native
  emission, below);
- that `get` records a parent (D10, command parents), and native reads do
  not return containers yet (container scoping, below; #242), so a reference
  read from the app to a target identified only within its container could
  not be resolved;
- or macts identifies the target by its name, and the manifest has no
  evidence yet that the name is unique (name-keyed resources, below), so the
  reference would resolve to whichever object has that name, not necessarily
  the one the app returned.

Coverage closes most gaps by curating a `get`, a `list` and an identifier
for the target, and for most shipped rows first a `get` or `list` for the
record that holds the field. Two shapes are decided for targets that a
curated `get` cannot serve:

- A target that is never an element of the app, only an object held in a
  property (Finder's list view options and their sort column, Mail's
  message content, Xcode's run destination `device` and `companionDevice`),
  will be returned as an embedded value record: the object's properties
  inline in the holding record, not a reference. This is a new output kind,
  with no `get` and no identity.
- A target with no identifier, only a position within its container (iTerm's
  window `currentTab`), will be returned as a selector reference by that
  position within its container, once output references carry containers
  (#242).

Xcode's workspace document `activeRunDestination` stays left out until
evidence shows that a run destination's name identifies one object.

A position that holds such a reference anywhere, bare, in an array, or as the
non-null case of a nullable value, is left out of output for now; generation
does not fail. `null` and the empty array do not rescue it, as they do an
input, because the app decides what it returns and no non-null value could be
resolved yet. Leaving it out means:

- A record field holding one is declared by no record type: not the
  contract's record and its value type, not the HTTP client's read type and
  its schema, and not what the CLI prints. The native get, list, create and
  update bodies do not read it.
- An operation whose result holds one declares no result.
- Generation warns once per position, naming the app, the resource and field
  (or the command), the target and what macts does not provide yet, for
  example "macts has no get for "Mailbox" yet". Every warning cites #219.
  The position returns on regeneration once coverage closes the gap: a `get`
  for the target that records no parent and an identifier, returned
  containers (#242), or a unique claim with evidence.

Input positions follow the input rule above, so a field left out of output
may still be settable through create and update. The contract, HTTP client
and CLI generators and the native reads take this judgment from one
manifest-level function too, and generation fails if the contract disagrees
with it. A manifest that is inconsistent, such as an identifier claimed
unique without evidence, is still rejected.

The coverage ledger is the exact set of output positions the shipped
contracts leave out, each with its reason, pinned by hand in
`packages/core/src/generator/contract/index.test.ts`. A new omission fails
CI until it is reviewed and added. A removed row means coverage was restored,
and the field is back in output.
`e2e/mcp-contracts/test/output-references.integration.test.ts` checks that no
output reference left in a shipped contract is one macts cannot yet resolve,
and pins those that remain.

**Encoding.** Encoding reads only the data fields (`app`, `resource`, `form`,
`cardinality`, and `id`, `selector`, `entries`, or `container`). It never
calls `resolve` or any other live member, so a bound reference and a plain
descriptor encode alike, whichever client decoded the reference. The encode strictness rule in D8 applies: an undeclared own data property, or
a field from the other form (a `selector` on an identity reference), is an issue. It
validates the following:

- `app` equals the contract's, at every level.
- `resource` and `cardinality` equal the declared ones.
- Every identity-collection entry is a single identity reference to the same
  resource.
- Selector indexes and range bounds are non-negative integers, and a range
  has `start <= end`. `start === end` is a valid empty range. A range past the
  collection's end is detectable only at resolution, so it remains an
  `InvalidSelectionError`.
- A container is a single reference.
- Every level can be resolved, as described under resolvable targets.

Decoding applies the same rules to the strict wire form, which has no `app`
field. A wire reference carrying `app` is an issue, and so is one whose target
cannot be resolved.

**Native emission.** A native read emits exactly the wire form above, in
identity form only:
`{"reference":{resource, form: "identity", cardinality: "one", id, container?}}`.
`id` is encoded through the plan by the resource's identifier value type.
Native reads never emit a selector form; selectors are constructed only by
callers. SDK output types stay `ObjectReference<R>`, with the form left open.

- **Container scoping.** A resource's identity is scoped to its container
  exactly when its `get` is parent-scoped, meaning the command records a
  parent. A native read emits a container exactly when resolving the object
  by id needs that parent. An object that is identified globally but reached
  only through a container emits no container. Examples are Arc spaces, iTerm
  sessions, and nested Photos folders. Native reads emit no container yet, so
  an output position whose target's identity is scoped to its container is
  left out of output (resolvable targets, above) until reads emit containers
  (#242).
- **Name-keyed resources.** A resource whose primary identifier is its name
  keeps `ResourceDescriptor.id`. Resolving an identity reference to it means
  the same as a name selector: it resolves to whichever object has that name
  when it is resolved. When several objects share the name, the app defines
  which one that is, so the reference does not pin one object. An output
  position referencing a name-keyed target is left out of output when the
  name is not claimed unique (resolvable targets, above). Input positions to
  it are generated. A resource is name-keyed when the property its identity
  references carry and are resolved by (its targeting property, D10) is
  `name`. The manifest's
  evidence that a name is the app's identity for a resource is its primary
  identifier's `unique: true` claim, with the evidence for that claim (D9,
  _Bounded list pages_). With the claim, the target is used at output
  positions like any other. Without it, including a resource matched on its
  name and claimed not unique, such as Calendar's calendars, it is not.

**Native conversion scope.** The macOS provider converts a reference inside
the automation process (D4, reference conversion) when it is a single
identity reference with no container, to a top-level resource with an
identifier. A resource is top-level when its resolving `get` records no parent
(D10, command parents); one helper answers it for both directions. In that
scope, an input reference becomes the app's object, found as the resource's
generated `get` finds it, and a missing one fails as `TargetNotFoundError`
naming the referenced resource before any command runs. An app object at an
output position becomes the identity reference above, with no container.

Every other reference keeps the codec's unsupported marker and fails as
`InternalError` (D4), in either direction. Generation leaves out every output
position whose target has no identifier, no `get`, or a `get` that records a
parent (resolvable targets, above), so for those targets the failure arises
only for a reference a caller supplies:

- every selector form, at any position;
- identity collections;
- a reference with a container, so a parent-scoped target cannot be passed;
- a resource with no identifier, or with no `get`;
- a resource with no entry in the request's `resourcePlans`, so none in the
  script's reference table;
- a resource whose `get` records a parent (Music tracks, Contacts emails,
  phones and addresses, Calendar events).

Selectors and collections address the app through mechanisms other than an
identifier lookup, and container chains need the parent's own addressing, so
each is a separate extension of this scope. In particular, the contract now
requires the parent's container on every reference resolved through an
operation that records a parent (parent-scoped targets, above), but the macOS
provider does not yet convert a
container: such a reference passes encoding and the runtime's checks and then
fails as `InternalError` at an operation position, and output positions to
parent-scoped targets are still left out of generation
([#219](https://github.com/mike-north/macts/issues/219),
[#242](https://github.com/mike-north/macts/issues/242)). Native container
conversion is still to come.

The provider resolves references (resolution, below) within the same scope,
plus identity collections whose entries are in it:

- A single identity reference with no container, to a top-level resource with
  an identifier, resolves to its object's record. The object is found by the
  codec exactly as an input reference is converted: the resolution script
  takes the reference as its input at a single reference position, so there
  is no second addressing. Its body reads the object with the get body's
  record read, and the result is encoded by the request's `outputPlan` in the
  automation process, as `execute` encodes an operation result. A missing
  object is `TargetNotFoundError` naming the referenced resource.
- An identity collection of such references takes its entries as a list of
  single references, so each is found the same way, all before any record is
  read, and read the same way, in entry order, in one automation process. The
  result is validated against the `list` item plan although it is read with
  the get record read. That is correct because, for every resource with both,
  the get record plan equals the list item plan and the get body reads the
  same properties as the list body; a test over every shipped contract
  enforces both. A missing entry is `TargetNotFoundError` with `entryIndex`,
  the first missing entry.
- An identity collection with no entries resolves to `[]` without starting an
  automation process. Permission, governance, approval and audit still run
  for it, as for any resolution: the runtime runs them as the resource's
  `list` (resolution, steps 1 to 6, below) before the executor is called, and
  only the automation process is skipped.
- Every other reference fails as `InternalError` whose message names the form
  the provider does not resolve, before any automation runs: every selector
  form; a reference, or an identity-collection entry, with a container; and a
  reference to a resource that is not top-level, has no identifier, has no
  `get`, or has no entry in `resourcePlans`. Whether the resource is in scope
  is read from the script's reference table, the one the codec reads, so
  resolution and conversion share one boundary.

Identity collections at operation positions still do not convert: only
resolution reads them, entry by entry.

**Binding.** References are live objects bound to the client that decoded
them, via `DecodeContext.bindReference`. The binder receives decoded
`ReferenceData` (the data-only form of each variant): `app` set from the
contract at every level, ids decoded through the resource table, selector
positions as `Integer`, and containers as nested data. It
never receives wire encodings. Each bound reference type is its data form
plus `Resolvable`, so a bound reference is itself valid encode input. A binder keeps its client state in `#private` fields, non-enumerable
properties, or prototype members. Under the encode strictness rule (D8), an
own enumerable data property that is not a declared field would make the
reference fail to encode. Hydration therefore follows the factory, with no separate
API.

`resolve()` on a bound reference, container, or entry calls
`ClientRuntime.resolve(reference, options)` of the client that decoded it.
That member sends the reference by re-encoding its data through the app's
reference value type, which yields the canonical wire form. It never replays
the wire it received. A reference that fails encoding, including one whose
`app` is another app's at any level, is a `ValidationError` before anything is
sent. Each client sends the wire form where its operations run:

- The **remote** client posts `{ app, reference }` to
  `POST /references/v1/resolve` (the remote route below), with the same
  bearer credential, abort handling, and error-envelope decoding as its RPC
  calls.
- The **local** client calls its runtime's
  `resolveReference(app, reference, context)`, with the same
  `InvocationContext` it builds for `invoke`.

The client decodes the result with the output contract of the operation the
reference resolves as: the one its contract's resource table records for the
reference's cardinality (`resolvingOperationKey`: `get` for a single object,
`list` for a collection). A mismatch is an `UnexpectedValueError`, and
references inside the result bind to the same client.

**Caller-built references.** `@macts/sdk` and `@macts/sdk/local` export `bindReference(client, data)`, which binds reference data the caller built, or a reference bound to another client of the same app, to `client`. It encodes `data` with `t.reference` over the client's contract scope and decodes the result with that client's `DecodeContext`, so the result is indistinguishable from a reference the client decoded, and `resolve()` stays the only hydration API. Binding makes no call. It raises `ValidationError` for everything encoding rejects: a reference to another app, a malformed or other-form field, and a target, container or entry without its resolving operation. Its type admits only the contract's resolvable resource keys and returns the bound variant for that key, form and cardinality. Whether the target exists is learned only at `resolve()`. It is a free function rather than a client member, because a client's members are the app's operations.

**Resolution.** Resolution is a runtime-level call,
`MactsRuntime.resolveReference(app, reference, context)`, executed by the
provider. `reference` is the wire form, the `{"reference": …}` control record
that encoding produces, and `context` is the same `InvocationContext` that
`invoke` takes. A single reference resolves as the target resource's `get`
operation, and a collection reference as its `list` operation. The runtime
reads which operation that is from the registered contract, whose resource
table records it (`ResourceDescriptor.get` and `.list`, chosen when the
contract is generated); it never re-derives the choice from the manifest, so
the contract stays the single source of truth. A reference whose target
resource is absent from the table, or records no resolving operation for the
reference's cardinality, is invalid against the contract and fails with
`ValidationError` at the reference's `resource`. `InvalidSelectionError` is
reserved for an index or range the collection cannot satisfy, which only the
app can tell. `registerContract` checks every recorded id when the
app registers, before anything is added: it must name one of the contract's
operations, and that operation must target the resource that records it.
Otherwise the contract is inconsistent and must be regenerated, and
registration fails with `OperationRegistrationError`, registering nothing.

Resolution runs the full D5 pipeline as that operation, so it can never
bypass policy:

1. The credential is verified, and admission applies.
2. The app's registered contract is found. An unknown app is a
   `ValidationError`, like an unknown operation in `invoke`. An app registered
   from its manifest alone has no resource table and is unknown here.
3. The reference's `resource` (a key of the contract's resource table) and
   `cardinality` are read. They select the operation, as an operation id does
   for `invoke`, so they are checked first. A malformed one, a resource absent
   from the table, or one that records no resolving operation for the
   cardinality is a `ValidationError` at the reference.
4. The caller's key must hold the operation's permission. Only the target
   resource's permission is checked. Container traversal needs no container
   permission, because a container only locates the target and contributes no
   data to the result.
5. The whole reference is validated with
   `t.reference(() => contract, resource, cardinality)`, after the permission
   check and before governance, as in `invoke` (D5, D11). A malformed
   reference is a `ValidationError`, audited as `invalid-input` with no part
   of the reference, and is never put to an approver.
6. Governance, approval, and audit run exactly as for a direct call of the
   operation: the same permission string and the same decision. The audit
   record has the same capability, app, key, and decision as a direct call;
   it differs only in `argsSummary`, which holds the redacted validated
   reference. Nested values in that summary are reduced to a key count, so a
   selector is summarized as an object, and the name that a name selector
   looked up is not recorded. Nothing else marks the record as a resolution.
7. The executor's `resolve` runs (D9).
8. The result is validated against the operation's `output.wire`, as every
   `invoke` result is, unless its output plan is `passthrough` (D11). For an
   identity collection it must also hold exactly one record per entry,
   whatever the plan, which enforces that no entry is silently dropped. A
   mismatch is an `UnexpectedValueError`. A collection is not paged: its
   result is validated as an array of the `list` operation's item type, never
   as its page (`referenceResultType` in `@macts/contracts` states what a
   reference resolves to, and the runtime uses it).

**Parent-scoped resolution.** A reference resolved through an operation that
records a parent resolves as that operation (`get` for a single object, `list`
for a selector collection) within the parent its container names: the
container's `id` is the value of the command's `parent.parameter`, the same
input a direct call takes for the parent scope, and a single reference's own
`id` is the child identifier (D10, command parents). Step 6
rejects a reference without that container, or with one naming another
resource, before the executor runs, so a provider always receives it. The
runtime hands the validated reference to the executor's `resolve` unchanged
(D9); mapping the container to the parent input is the provider's, which
reads the parent from the request's manifest. Container traversal still
needs no container permission (step 4).

Unpaged collection resolution can still be slow on a very large selection:
it reads the whole selection in one executor call, under the same time limit
as any call, where a paged list would read it a page at a time.

**Resolution errors.** A single reference whose identity `id` or name selector
matches nothing raises `TargetNotFoundError`. An index past the end raises
`InvalidSelectionError`. A collection reference resolves to an array that may
be empty. A range past the end raises `InvalidSelectionError`. An identity
collection resolves its entries in order. When an entry's target no longer
exists, it raises `TargetNotFoundError` whose `entryIndex` detail is that
entry's zero-based position; the entry is never silently dropped. An identity
collection with no entries resolves to `[]`.

A reference whose target, container, or entry lacks its resolving operation
is rejected wherever it appears, so no bound reference to it ever exists:

- **Built by an SDK caller.** Encoding rejects it with `ValidationError`
  (D11), so it never reaches the runtime.
- **Sent in a raw HTTP or MCP request.** The runtime's check against
  `input.wire` rejects it with `ValidationError` (D11).
- **Returned by an operation.** This is a defect on our side, never the
  caller's. A contract may declare an output reference position only when its
  target has its resolving operation, which generation enforces (resolvable
  targets, above), so such a reference means the contract is wrong.
  The runtime's check of the result against `output.wire` rejects it with
  `UnexpectedValueError` (step 8 above), and so does the client's decoding.
- **Sent to the resolve route.** A target whose resource is absent from the
  table, or records no resolving operation for the cardinality, fails with
  `ValidationError` at the reference when the operation is selected (step 3
  above). A container or entry whose resource has no `get` fails the
  reference validation with `ValidationError` (step 6 above).

Ownership:

- **Value contracts** owns the types, the wire form, and the codecs.
- **Execution** owns runtime resolution and the remote route.

The remote route lives in its own namespace, separate from RPC operations and
transfers.

**Remote route.** The HTTP server resolves references at
`POST /references/v1/resolve`. `/references/v1` is a top-level namespace
beside `/api/v1`, never under it (D5, HTTP namespaces). The request body is:

```json
{
  "app": "library",
  "reference": {
    "reference": {
      "resource": "Book",
      "form": "identity",
      "cardinality": "one",
      "id": "978-0441013593"
    }
  }
}
```

`app` is the app's route segment, and `reference` is the control record
exactly as encoding produces it. The body has exactly these two fields: an
older server refuses a field it does not know rather than ignoring it, so a
request that depends on a later field never resolves without it. The route
builds the `InvocationContext` as
the RPC routes do: the bearer credential from `Authorization`, the request's
abort signal, and the correlation id from `X-Request-Id`. It then calls
`resolveReference(app, reference, context)`. It shares the RPC routes'
per-client-address limit, one budget per address across both namespaces.

- **Success** is `200 { "result": … }`, the same envelope as an operation
  result. The result is the resolved record for a single reference, and an
  array of records, possibly empty, for a collection reference.
- **Failure** is the D6 envelope, with the same statuses and headers as the
  RPC routes. For example, 401 `UNAUTHENTICATED` carries
  `WWW-Authenticate: Bearer`; 403 is `PERMISSION_DENIED` or `POLICY_DENIED`;
  404 is `TARGET_NOT_FOUND`, keeping `entryIndex`; 400 is
  `INVALID_SELECTION` or `VALIDATION_FAILED`; 502 is `UNEXPECTED_VALUE`.
- **Framing.** A body that is not JSON, is not an object, lacks a string
  `app` or a `reference`, or has any other field is answered 400
  `VALIDATION_FAILED` before the runtime is called, as an unreadable RPC body
  is (D6). Each missing, mistyped, or unknown field is one issue at its path. An unknown app, a
  malformed reference, and a target the contract cannot resolve are the
  runtime's `ValidationError`s.
- **Routing.** The route answers only `POST`. Any other method, and any other
  path under `/references/v1`, is a route miss (404 `NOT_FOUND`), as in the
  RPC namespace. The unauthenticated listings (`/api/v1` and
  `/api/v1/introspect`) list operations only, never this route.

## D8. Binary Transfer Handle Shapes

Defined in `@macts/contracts` (`files/`).

| Shape               | Kind                  | Meaning                                                                                                                                                          | Owner of the bytes                                                                             |
| ------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `FileValue`         | —                     | A file or binary content an operation returned. It has `path?` (the **original Mac path**, when one exists), `existence: { exists, observedAt }`, and `fetch()`. | The app                                                                                        |
| `TemporaryFileCopy` | `'temporary-copy'`    | **Local read result.** A temporary file on the executing Mac, with `path` and `release()`.                                                                       | The caller after `fetch()` resolves; the runtime also removes leftovers per its documented TTL |
| `SignedDownload`    | `'signed-download'`   | **Remote read result.** A `url` and `expiresAt`. A fresh `fetch()` issues a fresh URL.                                                                           | The service                                                                                    |
| `CallerOwnedFile`   | `'caller-owned-file'` | **Local write source.** An existing file on the executing Mac. macts never moves or deletes it.                                                                  | The caller                                                                                     |
| `UploadedFile`      | `'uploaded-file'`     | **Remote write source.** The reference returned after bytes were POSTed to an `UploadTarget` (`url`, `expiresAt`, `maxBytes`), with `uploadId` and `expiresAt`.  | The service, until it is consumed or expires                                                   |

**Types.**

- `FetchedFile = TemporaryFileCopy | SignedDownload`
- `FileSource = CallerOwnedFile | UploadedFile`

**Wire forms.**

- `{"file":{"path"?, "exists", "observedAt": {"date":…}, "grant"}}`
- `{"fileSource":{"kind":"caller-owned-file","path"}}`
- `{"fileSource":{"kind":"uploaded-file","uploadId"}}`

Nested metadata uses the value codec.

**Grants.** `grant` is an opaque, expiring token the runtime issues when an
authorized operation returns the file. It is bound to the authority's subject.
`fetch()` exchanges the grant, together with the invocation credential, for a
`FetchedFile`. There is no fetch-by-arbitrary-path, which would be an
arbitrary file read. A signed URL is a bearer capability scoped to one
transfer with a short expiry, and it is never logged.

**Limits and lifecycle.** Execution chooses and documents the following, with
tests:

- size limits
- TTLs, including URL lifetime
- completion rules: an upload is unusable until fully received, and an expired
  or incomplete upload fails with `TransferError`
- cleanup after use or failure

**Decoding and binding.** `t.file()` decodes the strict `file` wire form
into `FileData` (`path?`, `existence` with `observedAt` as a `Date`, and
`grant`) and passes it to `DecodeContext.bindFile`. The binder keeps the
grant in a closure. `FileValue` has no grant property, enumerable or
otherwise, so serializing, inspecting, or logging a file value cannot reveal
it. Encoding a file value happens only on the runtime side, from `FileData`.
File values are outputs, so a `FileValue` at an input position, or any value
without a grant, is a `ValidationError`.

The native codec cannot issue grants. Its file output is a grant-free
observation, and execution attaches the grant before the `file` wire form
leaves the runtime. Execution specifies that intermediate shape together
with the native file conversion. The native codec never emits a placeholder
grant.

**Encode strictness (references and file sources alike).** Encoding reads a
variant's declared SDK fields through property access, so class instances and
accessors are accepted. It ignores function-valued members and anything that
is not an own enumerable property. It rejects an own enumerable non-function
property that the variant's SDK type does not declare. Declared fields that the
wire form omits, such as an uploaded file's `expiresAt`, are dropped.

**File sources.** Encoding an `UploadedFile` emits only `kind` and `uploadId`.
`expiresAt` stays on the SDK type because it is the upload endpoint's answer
to the caller, but an expiry asserted by the caller would be untrusted. The
transfer store is authoritative for expiry and completion. The runtime
validates input against the wire schema and works on `FileSourceWire`. Its
transfer step resolves `uploadId` against the store and checks that the
upload belongs to the invoking authority's subject. An unknown upload, or
one belonging to another subject, fails as `TransferError` `unknown-transfer`.
An expired upload fails as `expired`. The transfer step then stages the
source for the executor. SDK decoding of a `fileSource` is reachable only
when that step is bypassed, so `t.fileSource().decode` decodes
`caller-owned-file` and rejects `uploaded-file` with an issue ("upload
handles are resolved by the service"). Unknown keys in that wire form are
reported as well. This is the fail-closed behavior.
`@macts/contracts` exports the strict `FileSourceWireSchema` for the
transfer step.

**MCP.** MCP tool results carry only `file` metadata and `FetchedFile` handles.
Bytes are never inlined.

**Path sources.** Authorization of path-based `FileSource`s beyond the
operation's own permission is part of
[#125](https://github.com/mike-north/macts/issues/125). The `kind`
discriminant lets a later rule tell sources apart without changing the shape.

**Value contracts** owns the value schemas and codecs for these shapes.
**Execution** owns the transfer store, the endpoints, and the lifecycle.

## D9. Relationship to the Executor Seam and the Zod Schema Source

**Executor seam ([#101](https://github.com/mike-north/macts/issues/101)).**
`packages/core/src/execution/executor.ts` declares `Executor { provider,
execute(request), resolve(request) }`.

- An `ExecutionRequest` carries:
  - the validated `AppManifest`
  - the operation `target`
  - the `input`, a `WireRecord`, because operation input is always
    record-shaped (D2)
  - the input and output `ValuePlan`s, both required; for a list, the output
    plan is an array of the list's item plan, not its page plan
  - an optional `page` window, for a list that pages (see _Bounded list
    pages_ below)
  - the `resourcePlans`, a `ResourcePlanTable`, required (see _Resource plans_
    below)
  - an optional `signal`

  It carries no authority, because authorization has already happened.

- `execute` resolves to a `WireValue` or throws canonical errors. The runtime
  validates that value against the operation's output contract before any
  adapter emits it (D11).
- `resolve(request)` resolves one reference (D7). A `ResolutionRequest`
  carries the validated `AppManifest`, the `reference` in wire form (already
  validated by `t.reference` over the app contract's resources), the
  `outputPlan` of what it resolves to (the resource's `get` output for
  cardinality `'one'`; for `'many'`, an array of the item plan of its `list`
  output, because resolution is never paged), the required `resourcePlans`,
  and an optional `signal`. Like `ExecutionRequest`, it carries no authority. Container chains
  are evaluated natively and contribute no data to the result. A reference resolved through an
  operation that records a parent always carries that parent's identity container (D7,
  parent-scoped targets), whose `id` the provider passes as the operation's `parent.parameter`. It follows the
  D7 error rules: `TargetNotFoundError` for a missing identity or name match,
  `InvalidSelectionError` for an index or range past the end,
  `TargetNotFoundError` with `entryIndex` for a missing identity-collection
  entry, and `[]` for an empty identity collection.
- The native JXA executor is one implementation. It converts references at
  operation positions, and its `resolve` resolves references, within the
  scope in D7 (native conversion scope): single identity references with no
  container to top-level resources with an identifier, and identity
  collections of them. It fails every other reference as `InternalError`,
  before any automation runs.
- **Resource plans.** `ResourcePlanTable` is
  `Readonly<Record<string, { readonly id?: ValuePlan }>>`, keyed by manifest
  resource key and declared in `@macts/contracts` next to `ValuePlan`. `id` is
  the plan of the resource's identifier value type, the one a reference's `id`
  is wire-encoded by, and is absent for a resource with no identifier. Entries
  are objects, so a later per-resource field does not change the table's
  shape. The table holds plans only: which native property carries an
  identifier, and how an object is found from it, stays manifest knowledge
  inside the executor.
  - `resourcePlanTable(resources)` derives it from an app contract's
    `resources`, so the two cannot disagree. `registerContract` derives it
    once per contract, carries it on every registered operation, and passes
    it on every `ExecutionRequest` and `ResolutionRequest` for that app.
  - `registerContract` fails closed with `OperationRegistrationError` when a
    contract resource is missing from the manifest, or when its identifier
    plan differs from the plan the generator's own type mapping derives from
    the manifest's primary identifier property (`contractResourcePlans`).
    A contract generated from another manifest is refused rather than run
    with identifiers the app would misread.
  - The field is required. A caller without a contract, such as an app
    registered from its manifest alone, passes `EMPTY_RESOURCE_PLAN_TABLE`,
    under which no reference converts.
- The runtime is constructed with an executor
  (`createRuntime({ executor, … })`), and every adapter dispatches through the
  runtime.

This refactor satisfies #101's acceptance criteria:

- the interface lives in `@macts/core`
- the native path implements it
- MCP, CLI, and SDK dispatch through it
- execution adds a stub executor test, runnable in CI, that wires a second
  implementation at startup

**Dispatch through the seam before plans exist.** Plans exist only once
generated descriptors carry value types, which is value contracts work.
Execution must still be able to wire the seam, the stub executor, and dispatch
through `Executor` first, without waiting. `@macts/contracts` therefore exports
`PASSTHROUGH_PLAN`, `{ kind: 'passthrough' }`.

- The plan fields stay required. A caller without derived plans passes
  `PASSTHROUGH_PLAN` explicitly; it never omits a plan.
- The plan means that the value is plain JSON with no wire encoding. The
  codec's decode and encode return their argument unchanged, and plain
  `JSON.stringify` semantics apply. Today's dispatch therefore runs through
  the seam with no behavior change, and without the A2 and A3 guarantees.
- The native executor runs every plan through the codec (D4), passthrough
  included, so a derived plan is never silently ignored. Under passthrough
  the codec converts nothing.
- The runtime does not validate a passthrough result against `output.wire`
  (D11), because that schema does not describe a value with no wire
  encoding. Every other result is validated, whichever executor produced it.
- Generated descriptors never use it. Value contracts replaces each
  passthrough use with derived plans as descriptors land, and removes the
  `passthrough` kind once none remain. A9 acceptance is not met for any
  operation still under passthrough.

It is not `{ kind: 'unknown' }`. An `unknown` position (D3) holds
self-describing wire content, in which every JSON object must be a control
record. Today's request bodies are not encoded that way: a plain record such as
`{"name":"Inbox"}` is a decode error at an `unknown` position. A dynamic plan
would therefore become wrong the moment the codec honors it. Passthrough is
consistent with D3 by sitting outside it: it marks the absence of a wire
encoding, not a third encoding.

The executor is resolved once, at runtime construction. In-process tests pass
one to `createRuntime`. Subprocess tests can set the test-only
`MACTS_TEST_EXECUTOR` to the name of a built-in test executor. It never loads
code, an unknown name fails startup, and an active test executor is announced
on stderr and named as the executor provider in the startup report. It appears
in contributor docs, never in user docs or `--help`. The provider is named in
the startup report only; recording it in audit and approval records is
[#182](https://github.com/mike-north/macts/issues/182). Per-operation routing
is not needed until a second provider coexists. #101's dependency on the
dictionary abstraction ([#100](https://github.com/mike-north/macts/issues/100))
is unaffected: `ExecutionRequest` takes the manifest type that core defines.

**Bounded list pages.** Every list returns one page, `{ items, nextCursor? }`
(D2). Paging bounds the size and the latency of each call; it does not make a
full listing cheaper in total. The runtime owns the protocol and the executor
reads windows:

- The paging inputs are operation inputs, not call options, so every surface
  derives them from the contract: SDK methods take a trailing `page`
  argument, HTTP and MCP callers send `pageSize` and `cursor` in the input,
  and generated CLI list commands take `--page-size` and `--cursor`. The
  generator reserves both names on every list operation and fails on an app
  parameter that uses one.
- A list pages only when its anchor is unique: its resource's primary
  identifier carries a curated `unique: true` claim with `evidence.unique`
  (the app's dictionary describing it as the object's unique identifier, or
  a curated observation). Uniqueness is opt-in and never inferred, from the
  identifier's name or from its targeting: a `byProperty` identifier can be
  unique, and an id the dictionary calls unique can repeat. An identifier
  with no claim, or one claimed `unique: false`, gives a list that never
  pages, as does a resource with no identifier: it reads its whole
  collection as one page.
- A list also pages only on live evidence that the app reads a range of the
  collection: its resource carries `rangeRead: { supported: true }` with
  probe evidence (D10, _Paging needs live range-read evidence_). An app
  whose collection rejects range reads failed every page (Music playlists),
  so the dictionary, which does not say whether ranges work, is never
  enough. A resource whose range read was not observed, or was observed to
  fail (`supported: false`, with the error numbers), gives a list that reads
  its whole collection as one page. One predicate, `listOperationPages` in
  `manifest/identifier.ts`, decides it for the contract generator, the
  generated SDK and CLI, the capability registry's input schemas (which show
  `pageSize` as an integer from 1 to the maximum, and `cursor`, for exactly
  the lists that page), the native list body, and the runtime, which refuses
  to register a contract whose list takes the paging inputs when the
  predicate says it does not page, or the reverse.
- `pageSize` is an integer from 1 to the maximum (D10); anything else is a
  `ValidationError` at `["pageSize"]`, never clamped. Its wire JSON Schema
  states the same bound in the integer text's pattern, so a schema-driven
  caller can refuse a bad size before calling.
- The cursor is opaque and stateless: nothing is stored, it is not signed, and
  it never expires. It holds a format version, the operation id, a digest of
  the call's other inputs, an empty slot for a digest of filter inputs, the
  offset of the next page, and the anchor, the identifier of the last item
  returned. The input digest is taken over the call's validated wire input
  in canonical JSON (keys sorted at every level, paging inputs excluded), so
  a cursor issued through one surface continues through any other for the
  same inputs. It is a consistency check that the caller sent the same query
  again, not a security control. A malformed cursor, an unknown version, or a
  cursor from another operation or for other inputs is a `ValidationError` at
  `["cursor"]`, never `COLLECTION_CHANGED`. These checks need only the input,
  so they are part of input validation (D5 step 3), before governance: such a
  call is audited as `invalid-input`, with no values, and never put to an
  approver. Only whether the anchor still sits where it did is decided during
  execution, by the app (below). Every page runs the full D5 pipeline, so a
  cursor carries no authority. Audit and logs record only `cursor: true`. A
  cursor sent to an operation that declares none fails validation under a
  contract registration, so that call is audited as `invalid-input`; under a
  manifest registration, whose request schema admits keys it does not
  declare, it is counted in `unknownKeys` and never recorded. No message or
  issue repeats a cursor, since its anchor can be user content.
- The runtime hands the executor a half-open window `{ offset, size, anchor? }`
  and an output plan that is an array of the item plan. The executor answers
  `{ items, length, last? }`: the window's items, the collection's length when
  it was read, and the identifier of the last item. The page has a
  `nextCursor` exactly when `offset + size < length`. A result that is not
  of that shape, holds more items than the window's size, or says more items
  remain after an empty page is an `UnexpectedValueError`.
- The native body reads the length, checks the anchor and reads the page in
  one automation process. Inside it, each read is its own app request (the
  length, the anchor, the identifiers, one per property), as below. An offset equal to the length gives an empty page with no
  cursor. The item at `offset - 1` must still have the anchor's identifier;
  if it is missing or different, the read is `COLLECTION_CHANGED`.
- How the body reads a page's items is the resource's page read,
  `rangeRead.read`, chosen per resource from live measurement (D10, _Page
  read chosen per resource_):
  - `range`: each property is read once over the page's items, as a range of
    the collection. The app's range read is zero-based and end-inclusive, and
    an end past the last item fails rather than clamping, so the body
    translates from half-open in one place (`window(start, end)`) and never
    passes a negative position. A page costs what it holds, and the whole
    identifier column is never read per page.
  - `column`: each property is read once over the whole collection, with the
    same count and identity checks an unpaged list makes, and the values are
    cut to the page in one place (`within(values, start, end)`) inside the
    automation process. A page costs what the whole collection costs. Some
    apps answer a range read item by item and a whole-collection read at
    once, so there a column page is far faster than a range page.
  - `range` is the default; a resource reads by `column` only when it
    measured clearly faster (D10, "Page read chosen per resource").
  - The two reads are the same contract: the same requests (the length, the
    anchor before and after, the identifiers before and after, one per
    property), the same page, length and `last`, the same cursor and anchor
    check, the same two-attempt consistency check, and the same
    `COLLECTION_CHANGED`. A collection that no longer reaches the window
    shrank while it was read, a retried changed attempt under either read.
    Under `column` the consistency check covers the whole collection it
    read, so a change anywhere in it during an attempt, not only inside the
    window, makes the attempt read again.
- The anchor check has documented limits: items added or removed after the
  anchor are harmless, any move of the anchor is detected, and a pair of
  compensating moves (one item removed before the anchor and another added
  before it) goes undetected.
- With adjacent duplicates of the anchor's value, a shift by one position
  leaves the same value at `offset - 1`, so the check passes and the page
  silently skips or repeats an item. That is why a list pages only when its
  identifier is claimed unique (above).

**Zod as the single schema source
([#121](https://github.com/mike-north/macts/issues/121), `phases/12`).**
The value library's constructors produce each `ValueType`'s `sdk` and `wire`
zod schemas. The serializable `plan` is derived from the same constructor call,
so there is one composition per field and no independent mapping.

This refactor adopts these items from `phases/12`:

- Enum references resolve to closed `z.enum([...])`.
- `.describe()` carries descriptions on every field.
- One schema is built per command, using the existing CRUD and identifier
  field-selection logic.
- An adapter's input schema (MCP `inputSchema`) is
  `z.toJSONSchema(input.wire, { target: 'draft-7' })` and describes **wire**
  values. Wire schemas are pure validators, with no defaults or transforms, so
  input and output forms coincide. A schema JSON Schema can't represent is an
  error, never an empty schema. An adapter serves the document it derives,
  never a stored one. Every generated descriptor also embeds the document as
  `inputJsonSchema`, for consumers that don't run zod; adapters never read or
  serve it. The generator computes it in process from the value types the
  contract constructs, and `e2e/mcp-contracts`
  (`test/input-json-schema.integration.test.ts`) asserts, for every operation
  of every shipped contract, that it is present and equals the document
  derived from `input.wire`.
- The capability registry that discovery serves still builds its input
  schemas from the manifest, independently of `input.wire`
  ([#188](https://github.com/mike-north/macts/issues/188)). Its MCP tool names
  must equal the adapter's: `e2e/mcp-contracts`
  (`test/tool-name-parity.integration.test.ts`) matches every shipped contract
  operation to its capability by manifest target and asserts that
  `Capability.mcpToolName` equals `toolNameFor(op.id)`.
- The independent server `buildCommandSchema` is retired; the runtime validates
  with descriptor schemas.

These remain in #121, to be re-scoped after the value contracts land:

- the zod → typanion adapter and typanion removal for CLI validators, which
  derive from `sdk` because the CLI parses into SDK values
- deleting `generator/cli/flags.ts`, `manifest/json-schema.ts`, and the
  `zod-to-json-schema` dependency
- the dead `generator/schemas.ts` / `generateSdk` path

## D10. Positions on Precision, Signed Zero, Classification, Dates, and Manifest Evidence

| Topic                                                       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Evidence still needed (owner)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integer domain                                              | Exactly the safe integers, `[-(2^53−1), 2^53−1]` (`INTEGER_LIMITS`), both directions. `Integer` helpers reject values outside that range; there is no implicit clamping. An app's own narrower bounds come from manifest constraints.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Whether any shipped app returns integer-typed values above 2^53 (value contracts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Native integer outside the domain                           | The native encoder fails with a codec error, which becomes `UnexpectedValueError`. The value is not reclassified as a double, because the bridge has already rounded it and wrapping it would be dishonest.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Integer and signed zero                                     | The integer classification has no signed zero. `-0` is a valid safe integer at runtime; encoding normalizes it to `"0"`, and decoding rejects the text `"-0"`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Double and signed zero                                      | Preserved, as `{"double":"-0"}`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Whether the bridge ever hands `-0` through from apps (value contracts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Unknown native classification (`any` / `unknown` positions) | JavaScript numbers in dynamic content encode as `double`. JXA exposes numbers as IEEE doubles, so integer provenance is not observable at this layer, and integrality is never used as evidence. Typed positions take classification from the manifest: `integer` → integer, `number` → double.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Whether the bridge can observe more, such as through `NSNumber` `objCType`. Any refinement must come from observation, not integrality (value contracts).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Date precision                                              | The wire always carries three fractional digits, and SDK `Date` has millisecond resolution. Millisecond preservation through an app is **not promised** until it is measured per app.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Live measurement per app and version, for the vertical-slice apps first (value contracts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Stale-SDK enum members                                      | Output decode rejects an unknown member with `UnexpectedValueError`. Its issue names the field path, the received value, and the known members, and suggests upgrading the app package. Static types stay closed, and input validation rejects non-members.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Native "missing value"                                      | Maps to `null` for nullable fields and to omission for optional non-nullable fields. Absence (`undefined`, or a missing key) is distinct from missing value: it is expressible only as an omitted optional record field, and anywhere else (a required field, a nullable position outside a record, a dynamic root or list element) it is a codec failure, never materialized as `null`. Whether a field is nullable, and whether an update can reset it, comes from per-field claims with evidence in the manifest; see _Nullability and resettability evidence_ below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Observed (macOS 27.2, read-only probe): the app reports a missing value as `null`, dates included (Reminders `dueDate` is `null` on 15 of 412 reminders); missing values are common on fields no dictionary marks. Calendar 27.0 Event `description`, `location`, `recurrence` and `url` (25–27 of 37 events), Attendee `displayName` (45 of 60), alarm `triggerDate` (all relative alarms); Finder 27.2 File `fileType`/`creatorType` (55 of 60); Reminders 7.0 List `color`/`emblem`; Notes 4.13 Attachment `name` empty in 10 of 25; it was the primary identifier, so attachments are now identified by `id`, which was set for all 25 and looks each one up. A first-items sample of one Reminders list missed those 15, which is why sampling is spread; Reminders `dueDate`, `remindMeDate` and `alldayDueDate` carry probe evidence from a read-only scan of all 412 reminders; Reminders `completionDate` and Calendar alarm `triggerInterval` are curated nullable. Remaining: TextEdit, and the other apps (value contracts) |
| Bridge host objects in results                              | Only ordinary records encode as records: tagged `Object` and with a prototype that is `null` or a root prototype. Anything else in a result, such as a path object or an app object reference, is a codec encode failure, which becomes `UnexpectedValueError`; it is never encoded as an empty record. Typed reference results are converted only by the reference codec.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Observed (macOS 27.2): path objects are tagged `Object` but inherit from their own prototype; app objects and object references are functions (Finder's startup disk); records apps return inherit from `Object.prototype` (Finder desktop position). Both host-object cases are covered by native-boundary tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| RGB bridge form                                             | 16-bit channel arrays where the app uses them; normalized `0..1` only where a specific app interface does. The bridge form is selected per app by the plan.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Per-app confirmation (value contracts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Transfer lifecycle defaults                                 | Size limit, TTLs, and cleanup cadence are bounded defaults chosen with tests. Five minutes is illustrative only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Execution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Bounded list page size                                      | Default 25 items, maximum 100, the same on every transport (`PAGE_SIZE_LIMITS` in `@macts/contracts`). A page size outside 1 to 100 is a `ValidationError`, never clamped. The values may be lowered, never raised.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Measured read-only on Reminders (Execution), with each page reading all twelve of a reminder's properties besides its identifier, the worst case for a Reminders page: a page of 25 took 2.8 s quiet and 4.3 s worst of three, so it stays inside the 30 s native timeout even at 8× noise (22 s); a page of 100 took 8.6 s quiet and 9.1 s worst of three, under the 15 s bound, and 8.8 s deep in the list. Paging a 332-item list at the default took 14 pages, 3.6 s at most each and 36 s in total; an 80-item list took 4 pages, 3.5 s at most and 9.7 s in total. Every item appeared exactly once. Re-measure on other apps with large collections (Execution).                                                                                                                                                                                                                                                                                                                                                                 |
| Calendar lists do not page                                  | `calendar.events.list` and `calendar.calendars.list` return their whole collection as one page. An event's `uid` repeats across the occurrences of a recurring event (twelve events sharing one `uid` were observed on one calendar), and calendar names are titles the user chooses, so both identifiers are claimed `unique: false`. With a repeated anchor value the anchor check cannot detect a one-position shift. Events become pageable once a unique per-occurrence key exists ([#217](https://github.com/mike-north/macts/issues/217)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Execution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Paging needs live range-read evidence                       | A list pages only when its resource records `rangeRead.supported: true`, from a live read-only observation of the app reading a range of the collection: a first page at the default size, pages of 2 continued by cursor (or of 1 where no collection held three items), and the anchor check between them. The marker records the app build, macOS version and time (`ResourceRangeReadSchema`). A range read observed to fail is recorded as `supported: false` with its error numbers, and an unobserved resource carries no marker; either way its lists return their whole collection as one page. Observed on macOS 27.2, 2026-11-03: Contacts people, groups, email addresses, phone numbers and addresses, Notes attachments, Photos albums and folders, Reminders lists, reminders and accounts, and Shortcuts folders passed; Music playlists failed every range read with -1708 (Music 1.7.2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Re-observe after an app or macOS update. Not yet passed, so not paged: Photos media items (a page timed out at 30 s even at size 2), Shortcuts shortcuts (the list fails to decode a shortcut's color, paged or not), Automator actions and Xcode projects and schemes (no open document to list them under), and Microsoft Edge and OmniPlan (not installed) (Execution).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Page read chosen per resource                               | A list that pages records how its pages are read, `rangeRead.read: range` or `column` (D9), with the measured cost it was chosen from as its own observation in the evidence, `evidence.cost`, dated by its own `observedAt` because the page is timed apart from the range-read check. The cost records `pageMs`, the first page of `pageSize` items read by range; `columnMs`, the same page read by column; `items`, the size of the collection the page was read from; `runs`, how many times the page was read each way, interleaved, with each time the median of those runs; and `pageSize`, the page size timed, the default. The cost and all six of its fields are required whenever `supported: true`, and forbidden with `supported: false`. `range` is the default, because a range page costs what the page holds and so keeps paging's latency bound whatever the collection's size. `read` is `column` only when the column page took at most three quarters of the range page's time (`columnMs <= 0.75 × pageMs`), and `range` otherwise, ties included; the manifest schema rejects any other `read`. Column gives up the latency bound, so it is chosen only for a clear measured gain. The margin absorbs typical measurement noise, so a small difference keeps `range`; a result near the margin can fall either side when measured again, and the recorded median decides. A column page's cost grows with the size of the whole collection, not the page, so the choice holds at the collection size the evidence records; a collection that grows far past it can make a column page slower than a range page. A property the app cannot read across the items falls back to one read per item over what the failed read covered: under `column` that is every item of the whole collection, not the page's, so such a page costs one request per item of the collection; a recorded `columnMs` reflects that only if the fallback fired while it was measured. Measured on macOS 27.2, 2026-11-03, through the real list body, median of three: Contacts people 15.4 s by range and 1.6 s by column over 295 people (`column`); Reminders reminders 7.1 s by range and 46.2 s by column over the 332 reminders of the largest list (`range`); Notes attachments 1.1 s and 0.2 s over 25 (`column`); Photos albums 0.43 s and 0.24 s over 48 (`column`). The other paged collections held at most three items and timed within the margin of each other, so they read by `range`. Reminders lists sat near the margin: the median of three gave 0.59 s and 0.44 s over 3 (0.73, `column`), and measured again on 2026-11-04 as the median of five, 0.21 s and 0.17 s (0.78), which records `range`. | Re-measure with the range-read observation, and when a collection grows well past its recorded `items` (Execution), with the read-only cost harness `packages/core/src/jxa/page-read-cost.live.test.ts` (`MACTS_LIVE_APPS=1 MACTS_PAGE_COST=1`), which prints the `cost` to record.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

### Nullability and resettability evidence

Each manifest property can carry a `nullable` claim and a `resettable` claim, and each claim must carry its evidence (`evidence.nullable`, `evidence.resettable`). A property with no claim has no evidence, and the defaults below apply. Command parameters can carry a `nullable` claim. Claims and their evidence must survive any rewrite of the manifest, including re-extraction from the app's dictionary; the probe's writers edit only the lines they write, and are tested for it.

**Read positions** are nullable unless there is evidence that they are not. This applies to record fields and to the direct results of other commands. It does not apply to the top level of an operation that reads a resource: a single read never yields `null` (a missing target raises `TargetNotFoundError`, D7), and a collection read yields an array, possibly empty, whose entries are never `null`. A read position is non-null in three cases:

- **Structure.** It is the resource's primary identifier property, which an identity reference cannot be formed without. A nullability claim on it is ignored, and generation reports a diagnostic. An observed null at it is reported as a manifest defect and does not make it nullable. At runtime such an object fails decode, because no identity reference can be formed.
- **Curation.** A manifest author declares it, with a note naming the evidence: an app guarantee, a structural invariant, documentation, or a test.
- **Probe.** The read-only nullability probe observed it non-null in every item it read successfully, across at least 30 items (`NON_NULL_SAMPLE_THRESHOLD`).

Why the default is nullable: evidence of non-null narrows an output from `T | null` to `T`, which no caller needs to change for. A non-null default that real data later contradicts widens an output, which breaks callers every time. The non-null default is also worse than the native behavior: one unobserved missing value fails a whole list read. With no nulls in 30 items, the 95% upper bound on the null rate is about 10% for the sampled collection. The items are the first ones the app returns on one machine, not a random sample, so the bound says nothing exact about other libraries. A probe-based upgrade is therefore a deliberate product choice. If a later null contradicts it, the output widens, which is a breaking change released through a changeset, and until then the read fails with `UnexpectedValueError`.

**Observations outrank claims.** A probe that sees a null sets `nullable: true` and replaces an earlier non-null claim from any source except structure. The probe output and the evidence note report the contradiction. A probe that sees no nulls never removes a `nullable: true` claim from any source, including an earlier probe's observation, and never overrides a curated claim. Only curation can narrow a property that has been observed or declared nullable. A property read that throws is not null evidence: it counts toward neither the null count nor the sample size.

**Probe evidence records** the app bundle id, app version, macOS version, sample size, null count, failed-read count, and observation time. For each resource, it also records the collection path it read and the properties it skipped. The probe records presence only. Values are never returned, logged, or persisted. It never writes app data. It reads at most 60 items per collection within a per-app time budget, at evenly spaced positions across the collection and with a share for each parent collection, so one list or calendar cannot make up the whole sample. For a nested collection it does not enumerate every parent: it looks in evenly spaced parents, 20 at first and twice as many in each later round, until the leaves it has found hold enough items, it has looked in 1,000 collections, or half the call's time limit is spent. It records how many parents it looked in, so a resource with no items found says how much of the store it covered rather than claiming the store is empty. It skips file and data properties and body-like content properties, which can be large or trigger downloads, and it reports what it skipped.

**Input positions** default to non-null, because widening an input later is non-breaking. Create inputs are never nullable in this decision: a property's nullability claim describes what reads return, not what a create accepts, and no claim kind for create inputs exists yet. Adding one later widens an input, which is non-breaking. A command parameter is nullable only with a claim. An update field accepts `null` (reset) only when the property is resettable. Resettability is curated only, with a note naming the verification, because proving it requires writes. Until a property is curated, `null` at its update field is rejected before execution (D11). A4's "explicit `null` means reset where supported" holds because reset that isn't supported is rejected, not attempted.

**No type exemptions.** Missing value is independent of type. A nullable list is `readonly T[] | null` and is never coerced to `[]`. A nullable reference is a reference or `null`. A null at a non-null position is an `UnexpectedValueError` whose issue names the field (D6). This is distinct from the stale-SDK unknown-member issue.

**Scope.** These rules shape the generated contract surface (D2). Generated contracts document each field's nullability and its basis (the source and app version; never an observed value).

### Unsupported properties and probe defects

**A manifest never drops a property the app's dictionary declares.** When the app can't provide a declared property at runtime (because it is unimplemented, obsolete, or always unreadable), the property is marked `unsupported`. The marker records:

- a reason;
- the dictionary's own availability note, when there is one;
- probe evidence in one of two forms:
  - **every read failed:** provenance, the number of items whose read was attempted, the failed-read count (which must equal that number), and the distinct error numbers seen;
  - **the value can't be decoded yet:** provenance, the sample size, and the observed kind counts. Every value read successfully, but none is a kind the declared type expects. This is a temporary state: the generated code would otherwise fail decode on every list read.
- optionally, the tracking issue whose fix removes the marker, such as a missing reference conversion.

A marked property carries no nullability or resettability claim, and a resource's primary identifier can't be marked. **Generated surfaces omit marked properties**, from both reads and inputs. That covers the contract, the SDKs, the MCP tools, the CLI and the capabilities, which all take a resource's usable properties from one shared helper. The embedded manifest keeps the marker, so the omission stays auditable. The marker is curated only: the probe never writes, changes or removes it.

**The probe reports two kinds of manifest defect.** Neither writes a claim, and neither changes the exit status.

- **Every read of a property failed.** This happens when a resource read at least one item, and every read of one property failed. It usually means the property name doesn't match the app, or that the app can't provide the property. The report suggests the marker, with the counts. An identifier that always fails is reported once, as an identifier defect.
- **The declared type contradicts the observed value kind.** The probe classifies each non-null value into a closed set of kind labels:
  - `date`, `number`, `boolean`, `string`;
  - `record`, `list`, `reference`;
  - `other`.

  These labels are not values, and the values-free check rejects anything else. Each declared type maps to the kinds its decoder accepts. A declared type with no mapping is reported as unchecked, never guessed. Mixed results are reported with both counts. A wrong type affects only decoding, not whether a value is present, so the property keeps its nullability claim.

### Native spellings

**A manifest's public spelling is derived; the app's spelling is recorded only where it differs.** Every public name (routes, SDK accessors, tool names, permissions, and the keys of every record returned to a caller) is derived from the manifest's own names by the shared functions: a resource's segment from its plural (D2, `manifest/route.ts`), a property's name from its key. The app's spelling of a collection or a property is a fact about the app, read from its scripting dictionary, so it is not derived from the public name. Its default is the bridge's spelling of the derived name: the plural's lower camel case for a collection, the key for a property. A manifest records the app's spelling only where the app's term differs from that default:

- `resource.native.collection`, the accessor of the resource's collection ("AirPlay devices" is `airplayDevices`);
- `property.native.name`, the property's name in the app ("ANSI black color" is `ansiBlackColor`, "URL" is `url`).

Each record carries dictionary evidence: the source (`dictionary`), the app's bundle identifier, app version and macOS version, and the term exactly as the dictionary writes it. Recording the default is redundant and rejected, as is a native name on a property marked unsupported or a native collection on a resource marked unsupported.

Native bodies resolve every name they address through `resolveCollectionAccessor` and `resolvePropertyAccessor` in `manifest/native-accessor.ts`. A body uses the app's spelling wherever it touches the app (reads, the identifier inside a property match, the record handed to a class constructor, and assignments) and the public key wherever it builds a record for the caller. Get, create and update all return the item's usable properties read this way, so no app spelling reaches the caller: one shared read takes them from a single `properties()` record, by the app's names. It reads on its own, guarded, any usable property the record leaves out (Finder's container record has no `entireContents`), and falls back to a guarded read of each property when the record cannot be read. A list reads differently: it reads each usable property once across the whole collection, by the app's name, and assembles records by position, after checking that every read gave one value per item and that the identifiers, read again after the properties, are unchanged element by element. A resource with no identifier is counted again instead, which catches items added or removed but not items that swap places. A collection that changes while it is read is read once more from the start; if either read finds the identifiers changed (or, for a resource with no identifier, the count), the list fails with `COLLECTION_CHANGED`, never pairing values from different items. When the identifiers are the same on both reads and a property column has the wrong length on both, the app returned something malformed and the list fails with `UnexpectedValueError`; the body raises a different native error for each outcome, the collection-changed marker or the codec's encode error, which the runtime maps to `COLLECTION_CHANGED` and `UnexpectedValueError`. Two transient additions-and-removals in a row that leave the identifiers unchanged both times are reported as `UnexpectedValueError` rather than `COLLECTION_CHANGED`, an accepted misclassification. A paged list reads its window the same way, with the anchor checked in the same request (D9, _Bounded list pages_). A missing value stays `null` at its position. A property the collection cannot report is read item by item, guarded, for that property alone. Neither that fallback nor the guard absorbs a communication failure (the app not running, an invalid connection, no reply, a user cancel, or missing authorization): it fails the list.

The probes (`macts probe`, identifiers and `--nullability`) address the app the same way, through the same two functions, and report every observation under the manifest key, so evidence is recorded against the public name. They never probe a resource marked unsupported, even when asked to: the app has none to read.

### Command parents

**A command's parent is recorded, never guessed.** A command on a nested resource records `parent: { resource, parameter }`: `resource` is the key of the resource whose items hold the command's resource as elements, and `parameter` is the command's own required parameter that carries the parent item's identifier. Calendar's `getEvent` records `{ resource: Calendar, parameter: calendarId }`. The parent is a fact the curator records from the app's dictionary (the parent's class has the child as an element); nothing derives it from a parameter's name or position, or from the hierarchy. The manifest schema rejects a parent resource the manifest does not declare, one marked unsupported on a usable command, and a parameter that is not one of the command's required parameters, naming the command, the field and the value.

Every surface takes the parent from the record. Native bodies address the parent resource's collection (`resolveCollectionAccessor`), the parent item in it by that resource's identifier targeting, the command's resource collection under that item, and a get, update or delete's item in it by the command resource's identifier targeting (D4, command parents); a command with no parent addresses its resource at the application. The generated SDKs, the contract and the CLI take a get, update or delete's parent scope from `parent.parameter`, and the child identifier is the first other required parameter (`resolveIdParams` in `generator/surface.ts`).

**A guard holds every shipped manifest to the rule** (`manifest/command-parents.test.ts`). Every usable list, get, create, update or delete command on a resource the hierarchy nests under another resource, and does not also place at the application (`usableHierarchyChildren` of the top-level entries), records a parent; only those shapes address a collection. A recorded parent must hold the command's resource in the hierarchy. A resource the hierarchy does not place has no parent to record and is not checked. The only exceptions are the nested commands whose parent awaits a design decision, [#173](https://github.com/mike-north/macts/issues/173): Microsoft Edge's `getBookmarkItem`; OmniGraffle's `getGraphic`, `getShape`, `getLine` and `getLayer`; OmniPlan's task, milestone, resource, assignment, dependency, violation and scenario commands; Xcode's `getProject`, `getScheme` and `getRunDestination`; and OmniFocus's `listTasks`, `getTask` and `createTask`. The list is exact: an entry that records a parent, or whose resource becomes a top-level child, fails the guard until it is removed.

### Identifier targeting

**Targeting applies at every level of a nested lookup.** A resource's identifier targeting (the app's `id` specifier by default, or `byProperty`, a match on a property) is how every lookup of one of its items is built, wherever the item is: in the application's collection, as the parent of a command, or as the target of a get, update or delete under that parent (`buildTargetExpression` and `buildNestedTargetExpression` in `jxa/native-scripts.ts` share one lookup). Music playlists and tracks are matched on their persistent ID, the dictionary's "id of the item as a hexadecimal string. This id does not change over time", because a track's numeric `id` belongs to its entry in one playlist: on Music 1.7.2, one track was id 2218 in the library playlist and id 2344 in another, while its persistent ID was the same in both, and ids and persistent IDs of 3 playlists and 1220 playlist tracks were unchanged across a relaunch. A get by persistent ID under the 608-track library playlist took a median of 250 ms through the native executor, most of it starting the automation process; the lookup itself took 17 ms, against 18 ms by numeric id.

**A list's canonical `id` alias never replaces a field.** Results without a typed contract mirror the runtime identifier under `id`, except for a resource with a usable property named `id`, whose own value stays (`resolveCanonicalIdentifierSource` in `manifest/identifier.ts`, which the HTTP client generator also uses for its read types).

### Unsupported resources

**A manifest never drops a resource it declares; a resource the app cannot provide is marked `unsupported`.** The marker records absence evidence in one of two forms. Dictionary evidence, for a collection the app's dictionary does not have, records the source (`dictionary`), the app's bundle identifier, app version and macOS version, the term the manifest expected, and a finding:

- `no-class`: the dictionary declares no class with the resource's code or name;
- `not-an-element`: the class exists, but no class has it as an element, so the app reaches it some other way.

Live evidence, for a resource the dictionary declares but the running app fails every read of, records a read-only observation: the source (`live`), when it was made (an ISO 8601 UTC timestamp), the app's bundle identifier, app version and macOS version, what was addressed (`expression`, in words and never a value), and the error number the app raised. Contacts 14.0 fails every read of an instant message, its identifier included, with `-1700`, so the whole resource is unreadable and marked.

**Generated surfaces omit a marked resource**, with its hierarchy entries and every entry nested under them. Route resolution returns no route for it, whether a command names it, names it among other types, or applies to every resource, so the server router, the runtime's operation registry, the contract's operations, the capabilities and the derived permissions all omit it. The contract's records and inputs, the SDK types and resource clients, the CLI commands and the MCP tools take a manifest's resources and hierarchy from the shared helpers in `manifest/unsupported.ts`. A resource nested only under a marked one keeps its own routes and SDK client, and loses only the hierarchy entries under the marked one. The embedded manifest keeps the marker, so the omission stays auditable. Permission-group entries that only a marked resource's routes required are removed with the marker. The marker is curated, from the dictionary or a live observation: no probe writes or changes it.

**No usable declaration's type names a marked resource.** No generated surface declares a marked resource, so a usable property of a usable resource, or a parameter or the result of a usable command, whose type names one would refer to nothing. The manifest schema rejects it, naming the declaration and the resource; the fix is to change the type, or to mark the property or the command too. A type names a resource as the contract matches type names (`manifest/type-names.ts`: the resource's key, name or plural, in any case, without spaces, dashes or underscores); a bare name or an `{ enum }` that names an enum names the enum, and a name a usable resource also has names the usable one.

### Unsupported commands

**A manifest never drops a command it declares; a command the running app cannot carry out is marked `unsupported`.** The marker records live absence evidence, in the form above: a dictionary cannot show that a command fails, only an observation can. Automator 2.10 has settings and required resources under each action but none at the application, so addressing either collection there raises `-1728` (no such object), and `getSetting` and `getRequiredResource`, which look an item up at the application, are marked.

**A marked command has no route**, and generated surfaces omit it. Route resolution returns no route for it, so the server router, the runtime's operation registry, the contract's operations, the capabilities and the derived permissions all omit it. The SDK clients, the CLI commands and the MCP tools take a manifest's commands from `usableCommands` in `manifest/unsupported.ts`. The embedded manifest keeps the marker, so the omission stays auditable. Permission-group entries that only a marked command's routes required are removed with the marker. The marker is curated from the observation: no probe writes or changes it.

### Top-level hierarchy entries

**A resource that is also an element of the application is a top-level child of the hierarchy**, in addition to any nested entry. The entry is keyed by the resource's public spelling (the lower camel case of its plural), and has the access of its nested entry. Reminders' reminders are elements of both the application and each list, so the hierarchy lists `reminders` at the top level and under `lists`; Automator's actions and variables are elements of both the application and each workflow, so the hierarchy lists `automatorActions` and `variables` at the top level and under `workflows`.

## D11. Validation Placement

Values are validated at every trust boundary, using the same schemas:

| Boundary                      | Check                                                                                                                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client `encode`               | Before any network or native call. It catches casts.                                                                                                                                                                                                                                |
| Runtime against `input.wire`  | Catches raw HTTP and MCP requests.                                                                                                                                                                                                                                                  |
| Runtime against `t.reference` | A reference to resolve, after the permission check and before governance (D7).                                                                                                                                                                                                      |
| Runtime against `output.wire` | Every executor result whose output plan is not `passthrough`, on `invoke` and on resolution, before any adapter (HTTP, MCP, CLI) emits it. It catches executors that don't encode, or encode wrongly. A resolution result also holds one record per identity-collection entry (D7). |
| Native codec inside JXA       | Against the plan, in both directions.                                                                                                                                                                                                                                               |
| Client `decode`               | Against the operation's output contract.                                                                                                                                                                                                                                            |

**Output validation.** The runtime's check of `output.wire` is the same for
every executor: the native executor, a custom one, a remote one, and a test
stub. Whether it applies is decided by the operation's output plan, which the
runtime holds, and never by anything an executor sets or declares about
itself. A `passthrough` result has no wire encoding, so `output.wire` does not
describe it and it is not checked (D9). The identity-collection count check
applies whatever the plan.

A result passes these steps in order:

1. The executor returns its result.
2. The grant-free file observation the native codec produces is replaced by
   the `file` wire form with its grant (D8). A missed grant therefore fails
   the next step, which keeps the file design fail-closed. This step is
   pending the D8 executor wire: until it lands, results go straight from
   step 1 to step 3.
3. The result is validated against `output.wire`.
4. The adapter emits it.

A mismatch is an `UnexpectedValueError`, the same class a client `decode`
raises (D2). Its issues give paths into the result, and messages built from
the issue code and the schema's own expectations, but never a received value:
values may be user content, and the error crosses to remote callers.

Validation failures happen before app mutation. That covers inputs only: an
output mismatch on a mutating operation means the operation ran. The app's
state may have changed, and only the result is unusable. The error message
says so, so a caller never retries a create or a send on the assumption that
nothing happened.

---

# Part C — File Ownership

Each stream owns the files in its column. To change a file the other stream
owns, request it from the owner instead of editing concurrently. Shared files
are listed with a single integration owner.

| Area / path                                                                                                              | Owner                               | Notes                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `packages/contracts/src/values/**`                                                                                       | Value contracts                     | Value types, wire shapes, plans, integer helpers, `UnreachableError`, constructors and codecs |
| `packages/contracts/src/references/**`                                                                                   | Value contracts                     | Types, wire form, codecs                                                                      |
| `packages/contracts/src/files/**`                                                                                        | Value contracts (shapes and codecs) | Execution reviews; handle semantics follow D8                                                 |
| `packages/contracts/src/operations/**`                                                                                   | Value contracts                     | Execution reviews `ClientRuntime`, which it implements                                        |
| `packages/contracts/src/errors/**`, `invocation/**`                                                                      | Execution                           | Value contracts supplies `issues`                                                             |
| `packages/contracts/src/index.ts`, `package.json`                                                                        | Execution (integration owner)       | Each stream adds its module's re-export line; edits are serialized                            |
| `packages/core/src/jxa/native-codec.ts` and new codec modules                                                            | Value contracts                     |                                                                                               |
| `packages/core/src/jxa/executor.ts`                                                                                      | Execution                           | Edited after the codec lands (D4)                                                             |
| `packages/core/src/execution/**`                                                                                         | Execution                           | `Executor` seam                                                                               |
| `packages/core/src/jxa/coercion.ts`, `types/standardized.ts`                                                             | Value contracts                     | Replaced or deleted                                                                           |
| `packages/core/src/manifest/**`                                                                                          | Value contracts                     | Nullability/resettability, constraints                                                        |
| `packages/core/src/generator/**` (incl. `sdk/http-client.ts`, `cli/`, `contract/`, `server/`)                            | Value contracts                     | Execution supplies runtime interfaces and test fixtures                                       |
| `packages/core/src/governance/**`, `permissions/**`                                                                      | Execution                           | Consumed, not forked                                                                          |
| `packages/runtime/**` (new), including moves from `packages/api/src/keys/**` and `packages/api/src/server/governance/**` | Execution                           |                                                                                               |
| `packages/api/src/server/**` (incl. `handlers/rpc.ts`, `handlers/validation.ts`, middleware)                             | Execution                           | `rpc.ts` JXA builders move into the native executor                                           |
| `packages/sdk/**`, `packages/mcp/**`, `packages/cli/**` (handwritten)                                                    | Execution                           |                                                                                               |
| Root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, package export maps                                        | Execution (integration owner)       | Value contracts requests changes                                                              |
| Generated packages (`packages/<app>`, `packages/<app>-server`), API reports of generated packages, generated docs        | Value contracts (generation owner)  | Only via `pnpm generate`; never hand-edited. `pnpm generate:check` fails on any drift (D2)    |
| Value vectors and specimen corpus (expected values)                                                                      | Value contracts                     | e.g. `packages/contracts/src/values/vectors/`                                                 |
| Parity harness, transport, error, authority, and transfer scenarios                                                      | Execution                           | Runs the value vectors through both factories                                                 |

---

## Testing Strategy

This phase ships interfaces only. Its tests pin static guarantees, plus the
small amount of runtime behavior the skeleton has: error class identity and
fields, and the `UnreachableError` message.

| Layer           | What this phase covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type (`tsd`)    | `number` is not assignable to `Integer`, while `Integer` is assignable to `number`; `Rgb` channels and index selectors reject plain numbers. The `UnreachableError` parameter is `never`: exhaustive switches over `ErrorCode`, `ValuePlanKind`, and `SpecialDoubleState` compile, and a residual member is rejected. Dynamic control records narrow by key, and a reference payload is not a file. `ReferenceWire` narrows by form × cardinality, rejects a selector on an identity collection, and nests containers. `ValuePlan.kind` and `FieldPlan.presence` narrow, and the passthrough plan is its own kind. `WireError` narrows `details` by code. `NativeOutcome` and `NativeFailure` discriminate, and `ExecutionRequest` requires both plans and a record input. The registry covers every wire code and excludes `TransportError`. |
| Unit (`vitest`) | Every error class has the right `name`, `code`, `details`, and `cause`, and the `instanceof` chain holds. Each registry entry constructs the class for its own code. `UnreachableError` reports the unexpected value.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Type tests run with `pnpm test:types`, against each package's published
`types` rollup, and CI runs them as their own step. Invalid usage is written
with `expectNotAssignable`, not `expectError`, because `tsc --noEmit` also
compiles the test files.

Expected values in these tests come from this document, not from program
output. The behavioral acceptance in Part A §A9 belongs to the value contracts
and execution work.

## Critical Files

```text
packages/contracts/               new: @macts/contracts
├── src/values/                   integer brand, wire shapes, plans, ValueType, UnreachableError
├── src/references/               reference hierarchy and wire form
├── src/files/                    file value and transfer handle shapes
├── src/invocation/               credential, invocation context, authority
├── src/errors/                   canonical classes, codes, details, registry
└── src/operations/               operation descriptor, app contract, client runtime
packages/core/src/execution/executor.ts   Executor seam
packages/core/src/jxa/native-codec.ts     native codec interface consumed by executor.ts
```

## Success Criteria

- [ ] This document is merged, and every open engineering question in it is
      either decided or assigned to an owner (D10).
- [ ] `@macts/contracts` and the core seam modules compile and are exported
      through package export maps, with durable intent comments.
- [ ] `tsd` and `vitest` tests pin the static guarantees and error identity
      listed above.
- [ ] API reports and a changeset are present, and
      `pnpm build && pnpm lint && pnpm typecheck && pnpm test`,
      `pnpm test:types`, and `pnpm format:check` pass from a clean state.
