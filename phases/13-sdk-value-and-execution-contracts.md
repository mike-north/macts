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
@macts/mcp         stdio / HTTP MCP adapter → runtime, types
@macts/cli         → sdk, runtime (key administration), api, mcp

@macts/types       plugin registration descriptions (unchanged; no @macts deps)
@macts/<app>       generated contract + SDK types + CLI plugin → contracts
@macts/<app>-server  generated adapter registration → api, mcp, @macts/<app>
```

The graph is acyclic. `@macts/mcp` stops depending on `@macts/api`; it imports
only `validateApiKey` today, which moves to the runtime.

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

Either way, the packed-install UAT below also installs `@macts/sdk` alone and
asserts that the installed tree contains no native addon.

**Resolution.** Option 1 was taken. The revocation and key store runs on
`node:sqlite`. `engines.node` is `>=22.13.0`, the first release that loads
`node:sqlite` without a flag. Node 22 and 24 print an `ExperimentalWarning` the
first time the module loads; the runtime filters that one warning at its single
load site and suppresses no other warning. No native addon exists anywhere in
macts, so the remote entry point cannot pull one in.

**Why a separate contracts package.** Generated app packages, the core native
provider, the runtime, and the remote client all need the same value types and
error classes. Putting them in `@macts/sdk` would create the cycle
sdk → runtime → core → sdk. Putting them in `@macts/types` would turn a
package defined as zero-runtime type descriptions into a runtime package.
`@macts/contracts` is an implementation-layer package: application code
imports from `@macts/sdk`, and generated code imports from `@macts/contracts`.

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

| Field                          | Meaning                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `id: OperationId`              | The existing route string, e.g. `calendar.events.listEvents`. It is the HTTP RPC path segment and the basis for MCP tool names. |
| `permission: PermissionString` | e.g. `calendar:events:list`                                                                                                     |
| `target: OperationTarget`      | `{ command, resource? }`: manifest keys the provider uses to locate the command                                                 |
| `description`                  | Text describing the operation                                                                                                   |
| `input: ValueType<Input>`      | Always record-shaped                                                                                                            |
| `output: ValueType<Output>`    | The operation's result                                                                                                          |

Every asynchronous client call that reaches the runtime (`invoke`, a
reference's `resolve`, and a file value's `fetch`) accepts one shared
`CallOptions { signal? }`. A call that later needs its own option extends that
type instead of redeclaring cancellation.

When an app is registered, the runtime asserts that each descriptor's
`permission` equals the permission derived from the manifest command, and
fails closed on a mismatch. A stale or tampered package therefore cannot widen
authority.

**`AppContract<Client>`** has these members:

| Member                                 | Meaning                                                                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app`                                  | Route segment                                                                                                                                                                            |
| `operations`                           | All operation descriptors, keyed by `OperationId`                                                                                                                                        |
| `resources`                            | Per-resource record value type plus the operation ids used to resolve references                                                                                                         |
| `loadManifest(): Promise<unknown>`     | A lazy dynamic import of the generated manifest module. It is called only by the Mac-side runtime, which validates the result with `AppManifestSchema`, so remote clients never load it. |
| `bind(runtime: ClientRuntime): Client` | A generated, fully type-checked function that maps positional SDK methods onto `runtime.invoke(descriptor, inputRecord)`                                                                 |

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

   References and files are part of `DynamicWireValue`, but until the
   reference and file value types (D7, D8) and their `DecodeContext` binding
   exist, the dynamic wire schema and codecs reject `{"reference":…}` and
   `{"file":…}` inside dynamic content as not representable there, and the
   derived JSON Schema does not advertise them. The follow-up that adds those
   value types decides whether dynamic content admits them.

## D4. Native Codec Interface and Executor Consumption

The native codec runs **inside the JXA process**. It converts wire values to
native values for arguments, and native results to wire values, before
`JSON.stringify`. Its interface lives in `packages/core/src/jxa/native-codec.ts`.

- **`NativeCodec { prelude: string }`** — JXA source that declares exactly two
  top-level bindings, both holding functions, and no other globals. They are
  named by the exported constants `NATIVE_DECODE_FUNCTION` (`__mactsDecode`)
  and `NATIVE_ENCODE_FUNCTION` (`__mactsEncode`). `NATIVE_CODEC` is the
  implementation.
  - `__mactsDecode(wire, plan)` returns native values. Dates become `Date`,
    integer text becomes a number, double states become `NaN`, `Infinity`, or
    `-0`, and app-specific bridge forms are produced where the plan says so.
  - `__mactsEncode(native, plan)` returns JSON-safe wire values. The output
    contains no raw `NaN`, `Infinity`, or `-0` numbers, no `Date` objects, and
    no `undefined` own properties. Absent optional fields are omitted.
  - Under a `passthrough` plan (D9), both return their argument unchanged.
  - Under a `none` plan, `__mactsEncode` returns `null` whatever the native
    result was, and `__mactsDecode` returns `undefined` (D3).
  - Both throw an object with `name: 'MactsCodecError'`, plus `direction`,
    `path`, and `message`, when a value violates the plan.
- **`NativeScript`** — `{ bundleId, body, input, inputPlan, outputPlan }`.
  - `input` is a `WireRecord`, because operation input is always
    record-shaped (D2).
  - `body` is a JXA function body invoked as `(app, args)`. `args` is the
    decoded input record.
  - Arguments are never interpolated into source text.
  - The bodies that `rpc.ts` builds today move into the native executor and
    read `args.<name>`.
- **`NativeOutcome`** — `{ ok: true, value: WireValue } | { ok: false, failure: NativeFailure }`.
  A `NativeFailure` takes one of two forms:
  - `{ source: 'app', message, errorNumber? }`: raised by the app or the bridge.
  - `{ source: 'codec', direction, path, message }`: raised by the codec.

**How `executor.ts` consumes it.** The executor gains a function that runs a
`NativeScript` with a `NativeCodec` and resolves to a `NativeOutcome`. It
replaces the inline `JSON.stringify(result)` wrapper with this composition:

```js
ObjC.import('stdlib');
/* codec.prelude */
var __mactsOutcome = (function () {
  try {
    var args = __mactsDecode(/* JSON input */, /* JSON inputPlan */);
    var value = (function (app, args) { /* body */ })(Application(/* bundleId */), args);
    return { ok: true, value: __mactsEncode(value, /* JSON outputPlan */) };
  } catch (e) {
    return { ok: false, failure: /* describe(e): codec marker → codec, else app with e.errorNumber */ };
  }
})();
JSON.stringify(__mactsOutcome);
```

The embedded input, plans, and bundle ID are JSON text, which is valid
JavaScript. The script is passed to `osascript` without shell interpolation
(`execFile` with an argument vector, or stdin), so values never cross a shell.

The native `Executor` maps a `NativeOutcome` failure to canonical errors:

- App and bridge failures map to the D6 table, using `errorNumber`.
- A codec `encode` failure maps to `UnexpectedValueError`.
- A codec `decode` failure maps to `ValidationError`. Input was already
  validated against `wire`, so this indicates a bridge-form defect.

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
  it to every call. MCP adapters attach the credential configured for the
  session to every tool call; they no longer rely on a startup-only check.
- **`Authority`** — `{ subject, displayName?, permissions, expiresAt? }`. This
  is what verification derives. `subject` is today's `apiKeyPayload.sub` and is
  the sole audit attribution key. An `Authority` never holds the secret.

**Pipeline.** The runtime is the only place that turns a credential into
authority, in both modes. Adapters translate protocol context into an
`InvocationContext` and nothing more. Each step reuses an existing mechanism:

| Step                                                                                                 | Reuses                                                                                                     | Failure                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Verify credential → `Authority`                                                                   | `validateApiKey`, moved unchanged to the runtime                                                           | `AuthenticationError` with `reason`: `missing`, `malformed` (`INVALID_FORMAT`, `MALFORMED_PAYLOAD`), `invalid` (`INVALID_SIGNATURE`), `expired`, `revoked`                                                                                                  |
| 2. Permission check against `descriptor.permission`, using the manifest command's permission history | `checkPayloadPermission` / `hasPermission`                                                                 | `PermissionDeniedError` (`required`, `hint`, `changelog`)                                                                                                                                                                                                   |
| 3. Governance: `resolveGovernanceForRequest(governance, authority.subject)` → `enforceCall`          | Audit context `{ apiKeyId: subject, argsSummary: redactArgs(wire input), timestamp: clock(), approvalId }` | `PolicyDeniedError`. With no approval gate, a confirm-first hold raises `ApprovalPendingError`. With a gate, the runtime calls `seekApproval` then `recordApprovalDecision`; a rejection, a timeout, or a failure to record raises `ApprovalRejectedError`. |
| 4. Input validation against `descriptor.input.wire`                                                  | —                                                                                                          | `ValidationError`. This catches raw wire requests and casts that bypassed client-side `encode`.                                                                                                                                                             |
| 5. `executor.execute(...)`                                                                           | —                                                                                                          | Canonical errors from the provider; any non-canonical throw becomes `InternalError`                                                                                                                                                                         |

The step order is today's order. Fail-closed rules carry over unchanged: a
resolver failure, an `enforceCall` failure, or an audit-write failure denies
the call. Steps 1–3 also govern reference resolution and file fetch, which are
read-risk calls (D7, D8). Execution owns the pipeline.

Locality changes only where the pipeline runs. In remote mode the client
presents the credential over HTTP and the service runs the same pipeline.
There is no local shortcut that skips steps 1–3.

## D6. Structured Error Registry, Wire Codec, and Reconstruction

Defined in `@macts/contracts` (`errors/`). Every canonical class extends the
abstract `MactsError<Code>` and carries:

- `code`: a closed `ErrorCode` literal
- `details`: typed per code by `ErrorDetailsByCode`
- `message`
- `cause`, which is local only and never serialized

`AnyMactsError` is the union of all classes. A `switch (error.code)` over it
narrows `details`.

| Class                           | `code`                       | Distinct meaning                                                                                                                   | Default HTTP                     |
| ------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `ValidationError`               | `VALIDATION_FAILED`          | Caller input violated the operation contract (`issues[]`)                                                                          | 400                              |
| `UnexpectedValueError`          | `UNEXPECTED_VALUE`           | An app result violated the contract. This includes an enum member the SDK does not know and an out-of-policy integer (`issues[]`). | 502                              |
| `AuthenticationError`           | `UNAUTHENTICATED`            | Credential missing or unusable (`reason`)                                                                                          | 401                              |
| `PermissionDeniedError`         | `PERMISSION_DENIED`          | Credential lacks the required permission                                                                                           | 403                              |
| `PolicyDeniedError`             | `POLICY_DENIED`              | Governance policy forbids the call (`permission`, `layer`)                                                                         | 403                              |
| `ApprovalPendingError`          | `APPROVAL_PENDING`           | Held for confirmation with nobody to ask; not executed                                                                             | 409                              |
| `ApprovalRejectedError`         | `APPROVAL_REJECTED`          | Held, put to a human, and not approved (`state`)                                                                                   | 403                              |
| `TargetNotFoundError`           | `TARGET_NOT_FOUND`           | A singular target does not exist                                                                                                   | 404                              |
| `FileNotFoundError`             | `FILE_NOT_FOUND`             | A referenced file does not exist or disappeared                                                                                    | 404                              |
| `InvalidSelectionError`         | `INVALID_SELECTION`          | A range or index selection is invalid for the collection                                                                           | 400                              |
| `AppUnavailableError`           | `APP_UNAVAILABLE`            | The app is not installed or cannot be reached                                                                                      | 503                              |
| `AppAuthorizationRequiredError` | `APP_AUTHORIZATION_REQUIRED` | macOS has not authorized automating the app. This is distinct from macts permission denial.                                        | 503                              |
| `AppOperationError`             | `APP_OPERATION_FAILED`       | The app reported a failure not covered above (`appErrorCode?`)                                                                     | 502                              |
| `OperationTimeoutError`         | `TIMEOUT`                    | The operation exceeded its time budget                                                                                             | 504                              |
| `OperationCancelledError`       | `CANCELLED`                  | The caller aborted the operation                                                                                                   | n/a (the caller stopped waiting) |
| `TransferError`                 | `TRANSFER_FAILED`            | A transfer expired, was incomplete, was too large, or is unknown                                                                   | 400 / 410 / 413                  |
| `InternalError`                 | `INTERNAL`                   | An unexpected macts failure, with a sanitized message                                                                              | 500                              |
| `TransportError`                | `TRANSPORT_FAILED`           | **Client-side only.** The service was unreachable, sent an invalid response, or uses a different protocol.                         | n/a                              |

**Wire codec.** An error response body is
`{ "error": { "code", "message", "details" } }`. The error envelope is protocol
metadata with its own per-code schemas, not the value codec. Its fields are
strings, booleans, and small integers, which JSON represents exactly.

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

**Binding.** References are live objects bound to the client that decoded
them, via `DecodeContext.bindReference`. Hydration therefore follows the
factory, with no separate API. Resolution is a runtime-level call executed by
the provider. A single reference requires the resource's `get` permission, and
a collection reference requires the resource's `list` permission. A resource
with no corresponding operation is not resolvable, and its references fail
with `InvalidSelectionError`.

Ownership:

- **Value contracts** owns the types, the wire form, and the codecs.
- **Execution** owns runtime resolution and the remote route.

The remote route lives in its own namespace, separate from RPC operations and
transfers.

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
execute(request) }`.

- An `ExecutionRequest` carries:
  - the validated `AppManifest`
  - the operation `target`
  - the `input`, a `WireRecord`, because operation input is always
    record-shaped (D2)
  - the input and output `ValuePlan`s, both required
  - an optional `signal`

  It carries no authority, because authorization has already happened.

- `execute` resolves to a `WireValue` or throws canonical errors.
- The native JXA executor is one implementation.
- The runtime is constructed with an executor (`createRuntime({ executor, … })`),
  and every adapter dispatches through the runtime.

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
- Until the codec lands, the native executor accepts only `PASSTHROUGH_PLAN`
  and fails with `InternalError` for any other plan, so a derived plan is
  never silently ignored.
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

The executor is resolved at runtime construction. Per-operation routing is not
needed until a second provider coexists. #101's dependency on the dictionary
abstraction ([#100](https://github.com/mike-north/macts/issues/100)) is
unaffected: `ExecutionRequest` takes the manifest type that core defines.

**Zod as the single schema source ([#121](https://github.com/mike-north/macts/issues/121), `phases/12`).**
The value library's constructors produce each `ValueType`'s `sdk` and `wire`
zod schemas. The serializable `plan` is derived from the same constructor call,
so there is one composition per field and no independent mapping.

This refactor adopts these items from `phases/12`:

- Enum references resolve to closed `z.enum([...])`.
- `.describe()` carries descriptions on every field.
- One schema is built per command, using the existing CRUD and identifier
  field-selection logic.
- MCP `inputSchema` is derived at generation time with
  `z.toJSONSchema(wire, { target: 'draft-7' })` and embedded (Option A). It
  describes **wire** values.
- The independent server `buildCommandSchema` is retired; the runtime validates
  with descriptor schemas.

These remain in #121, to be re-scoped after the value contracts land:

- the zod → typanion adapter and typanion removal for CLI validators, which
  derive from `sdk` because the CLI parses into SDK values
- deleting `generator/cli/flags.ts`, `manifest/json-schema.ts`, and the
  `zod-to-json-schema` dependency
- the dead `generator/schemas.ts` / `generateSdk` path

## D10. Positions on Precision, Signed Zero, Classification, and Dates

| Topic                                                       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Evidence still needed (owner)                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Integer domain                                              | Exactly the safe integers, `[-(2^53−1), 2^53−1]` (`INTEGER_LIMITS`), both directions. `Integer` helpers reject values outside that range; there is no implicit clamping. An app's own narrower bounds come from manifest constraints.                                                                                                                                                                                                                                                                                                                             | Whether any shipped app returns integer-typed values above 2^53 (value contracts)                                                                                                                                                                                                                                  |
| Native integer outside the domain                           | The native encoder fails with a codec error, which becomes `UnexpectedValueError`. The value is not reclassified as a double, because the bridge has already rounded it and wrapping it would be dishonest.                                                                                                                                                                                                                                                                                                                                                       | —                                                                                                                                                                                                                                                                                                                  |
| Integer and signed zero                                     | The integer classification has no signed zero. `-0` is a valid safe integer at runtime; encoding normalizes it to `"0"`, and decoding rejects the text `"-0"`.                                                                                                                                                                                                                                                                                                                                                                                                    | —                                                                                                                                                                                                                                                                                                                  |
| Double and signed zero                                      | Preserved, as `{"double":"-0"}`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Whether the bridge ever hands `-0` through from apps (value contracts)                                                                                                                                                                                                                                             |
| Unknown native classification (`any` / `unknown` positions) | JavaScript numbers in dynamic content encode as `double`. JXA exposes numbers as IEEE doubles, so integer provenance is not observable at this layer, and integrality is never used as evidence. Typed positions take classification from the manifest: `integer` → integer, `number` → double.                                                                                                                                                                                                                                                                   | Whether the bridge can observe more, such as through `NSNumber` `objCType`. Any refinement must come from observation, not integrality (value contracts).                                                                                                                                                          |
| Date precision                                              | The wire always carries three fractional digits, and SDK `Date` has millisecond resolution. Millisecond preservation through an app is **not promised** until it is measured per app.                                                                                                                                                                                                                                                                                                                                                                             | Live measurement per app and version, for the vertical-slice apps first (value contracts)                                                                                                                                                                                                                          |
| Stale-SDK enum members                                      | Output decode rejects an unknown member with `UnexpectedValueError`. Its issue names the field path, the received value, and the known members, and suggests upgrading the app package. Static types stay closed, and input validation rejects non-members.                                                                                                                                                                                                                                                                                                       | —                                                                                                                                                                                                                                                                                                                  |
| Native "missing value"                                      | Maps to `null` for nullable fields and to omission for optional non-nullable fields. Absence (`undefined`, or a missing key) is distinct from missing value: it is expressible only as an omitted optional record field, and anywhere else (a required field, a nullable position outside a record, a dynamic root or list element) it is a codec failure, never materialized as `null`. Because the manifest has no nullability today, the value contracts work adds nullability and resettability to the manifest property model, with evidence-based defaults. | Per-field evidence (value contracts)                                                                                                                                                                                                                                                                               |
| Bridge host objects in results                              | Only ordinary records encode as records: tagged `Object` and with a prototype that is `null` or a root prototype. Anything else in a result, such as a path object or an app object reference, is a codec encode failure, which becomes `UnexpectedValueError`; it is never encoded as an empty record. Typed reference results are converted only by the reference codec.                                                                                                                                                                                        | Observed (macOS 27.2): path objects are tagged `Object` but inherit from their own prototype; app objects and object references are functions (Finder's startup disk); records apps return inherit from `Object.prototype` (Finder desktop position). Both host-object cases are covered by native-boundary tests. |
| RGB bridge form                                             | 16-bit channel arrays where the app uses them; normalized `0..1` only where a specific app interface does. The bridge form is selected per app by the plan.                                                                                                                                                                                                                                                                                                                                                                                                       | Per-app confirmation (value contracts)                                                                                                                                                                                                                                                                             |
| Transfer lifecycle defaults                                 | Size limit, TTLs, and cleanup cadence are bounded defaults chosen with tests. Five minutes is illustrative only.                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Execution                                                                                                                                                                                                                                                                                                          |

## D11. Validation Placement

Values are validated at every trust boundary, using the same schemas:

| Boundary                     | Check                                                |
| ---------------------------- | ---------------------------------------------------- |
| Client `encode`              | Before any network or native call. It catches casts. |
| Runtime against `input.wire` | Catches raw HTTP and MCP requests.                   |
| Native codec inside JXA      | Against the plan, in both directions.                |
| Client `decode`              | Against the operation's output contract.             |

Validation failures happen before app mutation.

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
| `packages/core/src/generator/**` (incl. `sdk/http-client.ts`, `mcp/`, `cli/`, `server/`)                                 | Value contracts                     | Execution supplies runtime interfaces and test fixtures                                       |
| `packages/core/src/governance/**`, `permissions/**`                                                                      | Execution                           | Consumed, not forked                                                                          |
| `packages/runtime/**` (new), including moves from `packages/api/src/keys/**` and `packages/api/src/server/governance/**` | Execution                           |                                                                                               |
| `packages/api/src/server/**` (incl. `handlers/rpc.ts`, `handlers/validation.ts`, middleware)                             | Execution                           | `rpc.ts` JXA builders move into the native executor                                           |
| `packages/sdk/**`, `packages/mcp/**`, `packages/cli/**` (handwritten)                                                    | Execution                           |                                                                                               |
| Root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, package export maps                                        | Execution (integration owner)       | Value contracts requests changes                                                              |
| Generated packages (`packages/<app>`, `packages/<app>-server`), API reports of generated packages, generated docs        | Value contracts (generation owner)  | Only via `pnpm generate`; never hand-edited                                                   |
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
