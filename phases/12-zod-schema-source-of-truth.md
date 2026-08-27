# Phase 12: Zod as the Source of Truth for Generated Schemas

## Goal

Collapse the generator's three independently hand-written manifest-to-validator
code paths — zod (runtime SDK validation), JSON Schema (MCP tool inputs), and
typanion (CLI flag validation) — into one: a single generated zod schema per
manifest command, with the other two derived from it mechanically instead of
re-implemented. Remove the now-unnecessary `zod-to-json-schema` dependency in
the same pass, since it is both unused in production and already broken
against zod v4.

This phase does not touch runtime JXA execution, the manifest schema itself,
or the CRUD-derivation domain logic (which properties belong on a `create` vs
an `update` vs a `get`, how identifiers are injected). It changes only how
that domain logic's output gets turned into three different validator
formats.

## Problem Statement

A single manifest property (say, `Event.status`, declared in
`manifests/calendar/app.yaml:131-134` as `type: { enum: EventStatus }`, which
parses into the `PropertyType` value `{ enum: 'EventStatus' }` — an enum
reference carried as a string) currently flows through three independent
hand-written switch statements, each of which maps manifest `PropertyType` to a
different target format:

1. **Zod** — `propertyTypeToZod()` in
   `packages/core/src/generator/sdk/http-client.ts:369-419`. Emits the
   `<Resource>Schema` object in `packages/<app>/src/types.ts` (e.g.
   `packages/calendar/src/types.ts:222`, `CalendarSchema`;
   `packages/calendar/src/types.ts:232`, `EventSchema`).
2. **JSON Schema** — `propertyTypeToJsonSchemaType()` in
   `packages/core/src/generator/mcp/tools.ts:22-71`, invoked by
   `propertyToJsonSchema()` (line 79) and `parametersToJsonSchema()` (line 97)
   inside `generateResourceOperationSchema()` (lines 134-201). Emits the
   `inputSchema` literal embedded in every generated
   `packages/<app>-server/src/mcp/tools/*.ts` file (e.g.
   `packages/calendar-server/src/mcp/tools/calendars.ts`).
3. **Typanion** — `generatePropertyFlags()` (lines 608-641) and
   `generateParameterFlag()` (lines 643-664) in
   `packages/core/src/generator/cli/commands.ts`. Emits `t.isEnum([...])`
   validators on `Option.String(...)` flags in generated
   `packages/<app>/src/cli/commands/**/*.ts` files.

`zod ^4.3.6` is a hard dependency of every `@macts/<app>` package (58 files
across the repo import it). `typanion` is only a **peer** dependency of
`@macts/<app>` (see `packages/core/src/generator/client/index.ts:236-245`) —
it, and `clipanion`, are optional unless a consumer installs the CLI surface.

### This has already caused real drift, not just hypothetical drift

The `status` field on `Event` is declared in the manifest as an enum
(`manifests/calendar/app.yaml:131-134`, referencing `EventStatus` at line
305). Compare how each of the three surfaces treats it today:

| Surface                                                                     | Generated validator                                                    | Enforces exact values? |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------- |
| Zod (`packages/calendar/src/types.ts:240`)                                  | `status: z.string()`                                                   | No                     |
| MCP tool (`packages/calendar-server/src/mcp/tools/events.ts:111-114`)       | `{ description: 'Event status', type: 'string' }`                      | No                     |
| CLI (`packages/calendar/src/cli/commands/calendars/events/create.ts:30-34`) | `validator: t.isEnum(['cancelled', 'confirmed', 'none', 'tentative'])` | Yes                    |

Only the CLI path resolves the manifest's `enum` reference to its concrete
member list (`getTypeInfo()` / `ctx.getEnum()` in
`packages/core/src/generator/cli/flags.ts:102-111`, mirrored inline in
`commands.ts:618-627`). Both `propertyTypeToJsonSchemaType()` (tools.ts:65-67)
and `propertyTypeToZod()` (http-client.ts, the `'enum' in type` branch) treat
an enum-typed **resource property** as a bare string. Today, an AI agent
calling `macts__calendar__events_create` gets no indication from the tool's
`inputSchema` that `status` accepts only four values, and the SDK's own
runtime validation (`EventSchema.parse(...)`, if it were ever called on
write) would accept `status: 'anything'`. Only the CLI actually rejects a bad
value, and it does so with knowledge the other two surfaces don't have,
despite all three deriving from the same manifest field.

### Descriptions are asymmetric too

Every generated `inputSchema` property and CLI flag carries the manifest's
`description` text (see `propertyToJsonSchema()` at tools.ts:79-89 and every
`Option.String(..., { description: ... })` call). The generated zod schema
does not: `propertyTypeToZod()` never calls `.describe()`, so
`EventSchema.shape.status` carries no description at all. A schema meant to
be "the same information, three times" is not even the same information once
you look past the type.

### The `@macts/api` HTTP layer is a fourth, independent instance of the same pattern

Beyond the three surfaces in scope for this phase,
`packages/api/src/server/handlers/validation.ts:28-59` (`buildCommandSchema`)
builds yet another ad hoc zod schema for HTTP request validation, at server
**startup**, directly from the manifest's `Command` type — with its own
`string | number | boolean | date` switch that has no `enum` or `array` case
at all (an array- or enum-typed parameter silently falls through to
`z.string()`). This isn't in scope to fix here (see Non-Goals), but it's
further evidence that "derive a validator from a manifest property/parameter
type" is a systemic pattern being reimplemented ad hoc, not a one-off
between three files.

### Root cause

There is no shared function anywhere in the codebase that goes "manifest
`PropertyType` → single canonical representation." Instead there are at
least four independent switch statements over the same `PropertyType` union —
`PrimitiveType | { array: PropertyType } | { resource: string } | { enum: string }`
(`packages/core/src/manifest/schemas/property.ts:29-49`), where `PrimitiveType`
itself spans eleven members: `string`, `number`, `integer`, `boolean`, `date`,
`data`, `any`, `file`, `point`, `rect`, `rgb` — each extended or fixed in
isolation. Adding a manifest feature (say, a `pattern`
or `min`/`max` constraint) would require updating all of them by hand, with
no compiler or test forcing the others to follow.

## Proposed Design

Make the generated **zod schema** the only place manifest types are
interpreted. Concretely:

1. **One generated zod object schema per manifest command.** For a
   resource-scoped CRUD command (`list` / `get` / `create` / `update` /
   `delete`), this schema is built by the same field-selection algorithm
   `generateResourceOperationSchema()` already implements today (identifier
   injection for `get`/`update`/`delete`, writable-property inclusion for
   `create`/`update`, required-field rules) — but the function's _output_
   changes from an assembled JSON Schema literal (`Record<string, unknown>`
   with `type`/`properties`/`required`) to an assembled zod shape
   (`Record<string, z.ZodType>` passed to `z.object(...)`, or equivalently
   generated code text building `z.object({...})`). For an app-level command
   (`switchView`, `reloadCalendars`), the schema is built directly from
   `command.parameters` the same way `generateAppCommandSchema()` does today.
   This is the "genuine domain logic" called out in the background — it must
   survive unchanged; only its output type changes.
2. **Enum-typed properties/parameters resolve to `z.enum([...])`**, not
   `z.string()`, closing the drift documented above. This requires
   `propertyTypeToZod()` (and the per-command builder above) to resolve the
   `enum` reference against `ctx.getEnum()`, exactly as the CLI generator
   already does — reusing that resolution logic rather than re-deriving it a
   third time.
3. **Descriptions travel with the schema** via `.describe(prop.description)`
   on every field, so a schema built this way already carries what
   `inputSchema.properties.<name>.description` needs today.
4. **MCP `inputSchema` derives from the zod schema via `z.toJSONSchema()`**,
   not from a parallel hand-built object.
5. **CLI flag validators derive from the same zod schema** via a
   zod → typanion adapter (see Typanion Elimination below), not from a
   parallel `t.isEnum([...])` construction.
6. **Runtime request validation** (in the SDK's `create()`/`update()` calls,
   wherever it exists today or is added) uses the same schema directly —
   there is nothing to derive, it already is the validator.

This makes "one manifest command → one zod schema → two derived artifacts"
the actual data flow, instead of "one manifest command → three
re-interpretations of the manifest."

## Decision: Embed the Derived JSON Schema at Generation Time, or Import Zod and Derive at Server Startup?

Two ways to get `inputSchema` into the generated
`packages/<app>-server/src/mcp/tools/*.ts` files:

**Option A — Embed (generation-time derivation).** The generator calls
`z.toJSONSchema(schema)` while running (inside `pnpm generate` /
`scripts/regenerate.mjs`), against the same in-memory zod schema object it
just built, and writes the resulting plain object as a JSON Schema literal
into the generated file — structurally identical to what
`packages/calendar-server/src/mcp/tools/calendars.ts:16-20` contains today.
The generated `-server` file still has no zod import and no runtime cost.

**Option B — Runtime derivation.** The generated `-server` file imports the
zod schema (e.g. from `@macts/calendar`) and calls `z.toJSONSchema(schema)`
itself, at plugin-registration time, to produce `inputSchema` on every
process start.

**Recommendation: Option A (embed at generation time).**

- **The "can never drift" argument does not favor Option B.** Both options
  call the exact same function (`z.toJSONSchema`) against the exact same zod
  object; the only question is _when_ that call happens. Drift is already
  prevented by construction in Option A, because the JSON Schema literal is
  produced from the zod schema, not hand-written independently — the same
  guarantee Option B offers. What actually prevents _stale_ embedded output
  (e.g. someone hand-editing a generated file, or the manifest changing
  without regeneration) is `scripts/regenerate.mjs`'s CI idempotence check
  (`pnpm generate:check`, which runs `regenerate.mjs && git diff --exit-code`)
  — a mechanism orthogonal to embed-vs-runtime.
- **Cost.** Option B adds a real per-process-start cost (walking the zod
  schema's internal representation to build JSON Schema) to every MCP server
  launch, for output that is static for the lifetime of a release. Option A
  pays that cost once, at generation time, and never again.
- **Dependency surface.** The background material for this phase raises "a
  new zod dependency in every `-server` package" as Option B's cost. In
  practice this is smaller than it sounds:
  `packages/calendar-server/package.json` already depends on
  `@macts/calendar` (its `dependencies` block lists `@macts/api`,
  `@macts/core`, `@macts/types`, `@macts/calendar`), and `@macts/calendar`
  depends on `zod`. Zod is already in every `-server` package's dependency
  graph transitively. What Option B actually costs is turning that into a
  **direct** dependency and a **direct import** inside the tool files
  themselves — which matters because `@macts/types` (where
  `McpToolDefinition` lives) is explicitly designed so that "packages which
  need to describe an MCP plugin ... can do so without taking a dependency
  on the `@macts/mcp` server implementation"
  (`packages/types/src/index.ts:4-7`). Keeping the generated tool files free
  of a zod import at the point of tool _definition_ (as opposed to tool
  _handler_, which already imports the SDK client) preserves that same
  spirit: a tool definition file should be inert data, not a place that runs
  schema-derivation code.
- **Rejected alternative, stated plainly:** Option B's only real advantage
  is that it removes one step from "regenerate and commit" — there's nothing
  to keep in sync if the schema is derived live. That advantage is real but
  small next to a startup-cost regression across roughly 35 server packages,
  for a correctness guarantee Option A already has by construction.

## Decision: JSON Schema Draft — Keep Draft 7, or Move to Draft 2020-12?

`McpToolDefinition.inputSchema`'s doc comment
(`packages/types/src/index.ts:87-94`) currently reads:

> JSON Schema for the tool's input parameters. ... Use JSON Schema Draft 7
> syntax.
> @see https://json-schema.org/draft-07/json-schema-release-notes.html

and the `JsonSchema` interface's own doc comment (line 30) says "MCP uses
JSON Schema Draft 7." `zod-to-json-schema` (the library being removed) was
configured with `target: 'jsonSchema7'`
(`packages/core/src/manifest/json-schema.ts:33`). Zod's native
`z.toJSONSchema()` defaults to Draft 2020-12
(`$schema: "https://json-schema.org/draft/2020-12/schema"`), but accepts
`{ target: 'draft-7' }` to reproduce the Draft 7 shape
(`$schema: "http://json-schema.org/draft-07/schema#"`).

**Recommendation: pin `z.toJSONSchema(schema, { target: 'draft-7' })`,
preserving the currently documented contract.**

- The manifest's property model — plain objects, string/number/boolean
  primitives, string enums, arrays of primitives — does not use any keyword
  that differs semantically between Draft 7 and 2020-12 (no
  `prefixItems`/tuple validation, no `unevaluatedProperties`, no dynamic
  references). The only observable difference in the generated output is the
  `$schema` URI itself. Moving to 2020-12 buys nothing for this manifest
  shape today.
- `McpToolDefinition.inputSchema` is a public type in `@macts/types`, and its
  doc comment is a documented contract, not an implementation detail.
  Changing the emitted draft without a compelling reason changes what every
  downstream consumer (including any tool that validates `inputSchema`
  against Draft 7's meta-schema) can assume, for a change with no present
  benefit.
- **Rejected alternative:** default to 2020-12 (i.e., call
  `z.toJSONSchema()` with no `target` option) on the grounds that it's "the
  more current spec." This is a real, defensible position for a
  greenfield MCP server, but here it is a breaking change to a shipped,
  documented interface with no MCP-ecosystem-driven forcing function behind
  it — there's no indication that MCP clients require or prefer 2020-12 over
  Draft 7 today. Revisit if that changes; until then, keep the interface's
  documented behavior stable and just change how the Draft 7 output is
  produced (from `zod-to-json-schema` to native `z.toJSONSchema`).

## Removing `zod-to-json-schema`

`zod-to-json-schema@^3.25.1` is declared as a dependency of
`packages/core/package.json` (line 47) and used in exactly two places:

- `packages/core/src/manifest/json-schema.ts` — `toJsonSchema()` (lines
  17-42) and `toJsonSchemaWithDefinitions()` (lines 44-59). Both require
  `schema as any` plus
  `// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument`
  (lines 30-31, 53-54) to compile, because the library predates zod v4's
  type surface.
- `packages/core/src/manifest/json-schema.test.ts` — the only caller of
  either function anywhere in the repository. Neither function is exported
  from `packages/core/src/index.ts`, so there is no production code path
  that reaches them.

**The test file already documents that the library is broken against zod
v4, not just unused.** Nineteen of its twenty-some test cases carry the
comment `// Currently returns minimal schema due to Zod v4 compatibility
issue` and assert nothing more specific than `expect(jsonSchema).toBeDefined()`
/ `expect(typeof jsonSchema).toBe('object')` — the module-level comment
(`json-schema.test.ts:6-11`) states plainly that "there's a compatibility
issue where the library returns minimal schemas (just `$schema` field)."
This is exactly the kind of tautological assertion the project's testing
rules prohibit (see Testing Strategy below): the suite passes today
regardless of whether `toJsonSchema()` produces a correct `type`,
`properties`, or `required` — because it isn't asserting any of those. This
is not a healthy, low-priority utility to keep around; it is silently
broken production code with a test suite constructed so it can't fail.

**Plan:**

1. Delete `packages/core/src/manifest/json-schema.ts` and
   `packages/core/src/manifest/json-schema.test.ts`. Nothing production-facing
   references either function, and their replacement (`z.toJSONSchema`,
   called directly at each generation call site described above) needs no
   wrapper module — it's a single stdlib call, not something worth
   re-abstracting behind `toJsonSchema()`'s thin options object.
2. Remove `"zod-to-json-schema": "^3.25.1"` from
   `packages/core/package.json`.
3. Do **not** try to "repoint" `toJsonSchemaWithDefinitions()` at a real
   caller. Its only distinguishing feature (`$refStrategy: 'root'`, producing
   `$defs`) has no user in this codebase, and the manifest's schemas don't
   have the kind of shared substructure that would benefit from `$ref`
   extraction. If a future need for referenced/shared JSON Schema
   definitions arises, it should be designed against that concrete need
   (which resource types actually recur across tool inputs) rather than
   speculatively resurrected now.

## Typanion Elimination

`clipanion`'s `Option.String(...)` accepts a `validator` typed as typanion's
`StrictValidator<U, V>`
(`node_modules/clipanion/lib/advanced/options/String.d.ts`, imported from
`typanion`). Verified from `typanion@3.14.0`'s own type definitions
(`typanion/lib/types.d.ts:12-17`):

```typescript
export declare type StrictTest<U, V extends U> = (value: U, test?: ValidationState) => value is V
export declare type Trait<Type> = { __trait: Type }
export declare type StrictValidator<U, V extends U> = StrictTest<U, V> & Trait<V>
```

`StrictValidator` is a callable **intersected with** a phantom `Trait<V>`
marker property (`__trait`) that exists only in the type system — no runtime
value has it. A zod-schema-backed predicate function is a plain function; it
can satisfy the `StrictTest<U, V>` call shape, but it can never structurally
satisfy `& Trait<V>` (there is no `__trait` property to infer from), so
producing a `StrictValidator` from a zod schema requires an explicit cast
(`as unknown as StrictValidator<U, V>`) at the adapter boundary. This is
expected and acceptable — it is a single, centralized cast in one adapter
function, not a cast repeated at each of the ~18 generated call sites that
use `t.isEnum(...)` today (verified count: `rg 't\.isEnum\(' packages -g
'*.ts'` outside the generator and its tests currently returns 18 matches
across `calendar`, `microsoft-word`, `omnifocus`, and `omniplan`).

**The real tradeoff is error-message quality, not typing.** Clipanion's
`applyValidator()` (`clipanion/lib/advanced/options/utils.js:42-58`) calls
`validator(value, { errors, coercions, coercion })` and, on failure, throws
`formatError('Invalid value for ${name}', errors)` — the `errors` array the
validator itself populated. Typanion's built-in predicates (`t.isEnum`,
`t.isNumber`, etc.) push a specific, human-readable message into
`state.errors` when they reject a value (e.g. `t.isEnum` reports which value
was seen and which values were expected). A naive zod adapter written as:

```typescript
function zodValidator<T>(schema: z.ZodType<T>): StrictValidator<unknown, T> {
  return ((value: unknown): value is T =>
    schema.safeParse(value).success) as unknown as StrictValidator<unknown, T>
}
```

never touches the `ValidationState` parameter at all. It still works — the
boolean return value is all clipanion strictly requires — but on rejection
`errors` stays empty and the user sees a bare `Invalid value for --status`
with no indication of what was expected, a real regression from today's
`t.isEnum(['cancelled', 'confirmed', 'none', 'tentative'])`, which typanion
formats with the invalid value and the full allowed list.

**Recommendation:** write the adapter to consume the `ValidationState`
argument and push a zod-derived message into `state.errors` on failure,
using `schema.safeParse(value)` and mapping `result.error.issues` into
readable strings (e.g. `` `Expected one of: ${allowed.join(', ')}` `` for an
enum, or the issue's own `message` for other cases) before returning
`false`. This is a few lines in one shared adapter
(`packages/core/src/generator/cli/zod-validator.ts` or similar, imported by
every generated CLI file exactly like `import * as t from 'typanion'` is
today), not a design compromise — it reaches parity with typanion's
messages by construction rather than by accident. Verify parity with an
integration test that runs a generated command with a bad `--status` value
through clipanion's real `Command.from()`/`.execute()` path and asserts the
printed error names the allowed values, not just that it exits non-zero.

## Migration Plan

Each step is independently shippable — build, lint, test, and
`pnpm generate:check` all pass at every step — so the migration can land as a
sequence of ordinary PRs rather than one large cutover.

1. **Add a shared `PropertyType → zod` resolver that handles `enum`
   correctly**, extending `propertyTypeToZod()`
   (`packages/core/src/generator/sdk/http-client.ts`) to resolve
   `{ enum: X }` against the manifest's enum table (reusing the same
   `ctx.getEnum()` pattern already proven in
   `packages/core/src/generator/cli/flags.ts:102-111`) and emit
   `z.enum([...])` plus `.describe(prop.description)` on every field. Add
   `CreateInput`/`UpdateInput` zod schemas next to the existing
   `<Resource>Schema` (currently the SDK generates zod only for the read
   shape — `CreateInput`/`UpdateInput` are TypeScript-only interfaces today).
   Regenerate all packages (`pnpm generate`) and confirm the diff is
   additive only (new/changed schema bodies, no behavior change to existing
   consumers) — this step changes runtime validation strictness (enum
   values now rejected) so it should ship alone and be called out in the
   changeset.
2. **Add the per-command zod schema builder.** Introduce a function
   (e.g. `generateCommandInputSchema()`) that reimplements
   `generateResourceOperationSchema()`'s and `generateAppCommandSchema()`'s
   field-selection algorithm against the zod resolver from step 1, returning
   a `z.object(...)` shape instead of a JSON Schema literal. Do not wire it
   into any generated output yet — cover it with schema-shape tests only
   (see Testing Strategy).
3. **Switch MCP `inputSchema` generation to derive from the new builder.**
   Replace `generateResourceOperationSchema()` / `generateAppCommandSchema()`
   call sites in `packages/core/src/generator/mcp/tools.ts` with
   "build zod schema (step 2), then `z.toJSONSchema(schema, { target: 'draft-7' })`, embed the result" (Decision 1). Regenerate; diff every
   `packages/<app>-server/src/mcp/tools/*.ts` file and confirm the emitted
   JSON Schema is unchanged except where step 1 fixed a real gap (enum
   constraints now present). This is the step that touches all ~35
   `-server` packages.
4. **Switch CLI flag generation to derive from the same zod schema**,
   replacing `generatePropertyFlags()` / `generateParameterFlag()` in
   `packages/core/src/generator/cli/commands.ts` with the zod → typanion
   adapter from the Typanion Elimination section. Regenerate; diff every
   `packages/<app>/src/cli/commands/**/*.ts` file. This is the step that
   touches all ~35 client packages. Delete the now-fully-superseded
   `packages/core/src/generator/cli/flags.ts` (`propertyToFlag`,
   `parameterToFlag`) in the same PR — it already has zero callers today
   (verified: `rg 'propertyToFlag|parameterToFlag' packages -g '*.ts'`
   matches only its own file and its test), so this is a pure deletion, not
   a behavior change.
5. **Remove `zod-to-json-schema`** per the plan above (delete
   `json-schema.ts`/`json-schema.test.ts`, drop the dependency). This has no
   generated-output dependency on steps 1-4 and can land at any point once
   its status as dead code is confirmed — doing it last just keeps the
   "changing generator internals" PRs and the "deleting a dependency" PR
   easy to review independently.
6. **Regenerate and commit everything, once, in a dedicated PR** containing
   only the `pnpm generate` diff, after steps 1-4 have each been reviewed
   against a hand-picked sample (Calendar is the natural default — it's the
   phase 5 vertical-slice app and covers enums, nested objects, and both
   resource- and app-level commands).

Two adjacent, already-dead code paths were found during verification and are
explicitly **not** part of this migration, to avoid conflating "the live
generator" with "code that merely still compiles": `packages/core/src/generator/schemas.ts`

- `generate.ts`'s `generateSdk()`/`writeSdk()` (a second, unused SDK generator
  producing a different multi-file package shape than what
  `packages/core/src/generator/sdk/http-client.ts` actually emits — not invoked
  by `scripts/regenerate.mjs`'s `generate --target all` path) and
  `packages/core/src/generator/cli/flags.ts` (superseded by inline logic in
  `commands.ts`, addressed in step 4 above). Confirming these are genuinely
  unreachable (no test relies on `generateSdk` producing real package output,
  nothing imports `flags.ts`'s exports) is worth doing before this migration
  starts, so nobody mistakes updating the dead path for having fixed the live
  one.

## Testing Strategy

Per this repository's testing rules, no test in this migration may assert
against output the implementation itself produced (no
`toMatchSnapshot()`/`toMatchInlineSnapshot()`, no `loadExpected()` fixture
comparisons, no "run the generator, save its output, assert equality with
that saved output forever after"). Every assertion must trace to a written
spec: the JSON Schema Draft 7 specification, zod's documented `toJSONSchema`
behavior, or the manifest schema (`packages/core/src/manifest/schemas/*.ts`)
that already governs what a `PropertyType` can be.

- **Unit — zod resolver (`propertyTypeToZod`).** For each `PropertyType`
  variant, assert the _shape_ of the produced schema by exercising it, not
  by inspecting generated source text: e.g. for `{ enum: 'EventStatus' }`,
  assert `schema.safeParse('cancelled').success === true` and
  `schema.safeParse('bogus').success === false` — both facts follow directly
  from the manifest's own `EventStatus` enum definition
  (`manifests/calendar/app.yaml:305-`), not from anything the generator
  "decided." For `{ array: 'number' }`, assert `schema.safeParse([1,
2]).success === true` and `schema.safeParse(['x']).success === false`.
- **Unit — JSON Schema derivation.** Do not compare the derived JSON Schema
  object to a captured fixture. Instead assert individual keywords against
  what the Draft 7 spec (linked via `@see` at the top of the test file, per
  this repo's test-format-references convention) defines them to mean: a
  required string property must produce `{ type: 'string' }` under
  `properties.<name>` (JSON Schema Draft 7 §6.25, "type") and its name must
  appear in the sibling `required` array (§6.17); an enum-typed property must
  produce `{ enum: [...exact manifest values...] }` (§6.23), where "exact
  manifest values" is asserted against the manifest fixture used in the
  test, not against a snapshot of prior output.
- **Unit — zod → typanion adapter.** Assert the adapter's returned function
  satisfies typanion's own `StrictTest` contract behaviorally: given a valid
  value it returns `true`; given an invalid one it returns `false` **and**
  populates `state.errors` with at least one message (asserting `errors`
  is non-empty and mentions the rejected value or the allowed set — not
  matching an exact string, which would be a snapshot in disguise).
- **Integration — CLI flag validation end-to-end.** Run a generated command
  class through clipanion's real `Cli.from([...]).run([...])` (not a mocked
  `Command`) with a bad enum value on the command line, and assert the
  process exits non-zero and the captured stderr contains each of the
  enum's allowed values — this is the layer that actually exercises the
  `ValidationState`/`formatError` interaction described in Typanion
  Elimination, which no unit test of the adapter alone can prove end to end.
- **Integration — MCP tool input validation end-to-end.** Instantiate a
  generated `McpToolDefinition` and call its `handler` (or the MCP server's
  request-dispatch path, if validation happens there) with a payload
  violating the schema (missing required field, wrong enum value) and assert
  a validation error is surfaced before the handler's business logic would
  have run — proving `inputSchema` is actually enforced, not merely present
  as documentation.
- **UAT — regenerate idempotence.** This already exists
  (`pnpm generate:check` in `scripts/regenerate.mjs`, gated in CI behind
  `git diff --exit-code`) and should continue to be the backstop that
  catches "committed generated output no longer matches what the generator
  produces from the manifest" for this migration specifically — it is not a
  substitute for the structural tests above, since it only proves
  generator-output stability, not correctness against the JSON Schema or
  zod specs.
- **What NOT to do, concretely:** the file this migration deletes,
  `packages/core/src/manifest/json-schema.test.ts`, is the negative example.
  Its ~19 `expect(jsonSchema).toBeDefined()` assertions pass unconditionally
  regardless of whether the schema is correct, which is exactly how a
  genuine zod-v4 incompatibility went unnoticed in a file with "test" in its
  name. Every new test this migration adds should be able to answer "what
  specific wrong output would make this test fail?" with something other
  than "if the function threw."

## Risks and Non-Goals

**Risks:**

- Step 1 (enum values become enforced in the zod schema) is a genuine
  behavior change for any code path that calls `.parse()`/`.safeParse()` on
  a generated `<Resource>Schema` today with a value that would newly be
  rejected. Ship it in its own changeset and call it out explicitly, since
  it is a correctness fix (closing the drift documented above) but is
  observable to any existing caller relying on the looser behavior.
- The zod → typanion adapter's cast (`as unknown as StrictValidator<U, V>`)
  is inherently unchecked by the type system at the point of the cast. Its
  correctness rests entirely on the behavioral tests described above
  (return-type/predicate agreement, `ValidationState` population), not on
  anything TypeScript itself verifies — this is a place where the tests
  _are_ the type safety.
- `packages/api`'s independent `buildCommandSchema()` (see Problem
  Statement) means that, even after this migration, one more manifest-to-zod
  mapping will remain unconsolidated. Leaving it as-is is a deliberate,
  scoped choice (see Non-Goals) but it means "one manifest command → one
  schema" will not yet be true end-to-end across every surface in the repo.

**Non-Goals:**

- **Replacing clipanion.** This was considered and rejected. Clipanion is
  not merely a validator library that typanion happens to plug into — it is
  the CLI framework itself and the plugin contract every generated
  `@macts/<app>` package implements (`CliPlugin.commands: readonly
CommandClass[]`). Eliminating typanion changes how a flag's _value_ gets
  validated; it has no bearing on command routing, parsing, `--help`
  generation, or the plugin interface, all of which are clipanion's job and
  out of scope here.
- **Consolidating `@macts/api`'s `buildCommandSchema()`** onto the same
  per-command zod schema this phase introduces. It is a natural follow-on
  (see Risks) but touches a different package with different runtime
  constraints (schemas built once at HTTP server startup from live manifest
  objects, not generated code) and deserves its own scoped phase.
- **Extending the manifest's property model** (adding `pattern`, `min`/`max`,
  `format`, or similar constraints not currently expressible). This phase
  makes the existing property model's three (four, if you count `@macts/api`)
  representations converge; it does not grow what the model can express.
- **Touching `packages/<app>/src/capabilities.ts`'s independently hand-rolled
  governance `inputSchema` metadata.** It serves a different purpose (surfacing
  risk/permission information for the governance layer, not request
  validation) and was not audited in depth for this phase; it is a
  candidate for a similar convergence exercise later, not a claim this phase
  makes about it now.

## Dependencies

- Phase 1 (Manifest Schema) — the `PropertyType`/`Command`/`Enum` shapes this
  migration reads are defined there and unchanged by this phase.
- Phase 4 (SDK Generation) / Phase 6 (CLI Infrastructure) / Phase 7 (MCP
  Infrastructure) — this phase modifies the generators those phases built,
  not their public contracts (`CliPlugin`, `McpPlugin`, `McpToolDefinition`).

## Critical Files

```
packages/core/src/
├── generator/
│   ├── sdk/
│   │   └── http-client.ts        # propertyTypeToZod() — extend for enum + describe()
│   ├── mcp/
│   │   └── tools.ts              # generateResourceOperationSchema() — retarget to zod + z.toJSONSchema()
│   ├── cli/
│   │   ├── commands.ts           # generatePropertyFlags/generateParameterFlag — retarget to zod adapter
│   │   └── flags.ts              # dead code — delete in the same PR that removes its call-alike in commands.ts
│   └── ...
└── manifest/
    ├── json-schema.ts            # delete — zod-to-json-schema wrapper, unused + broken against zod v4
    └── json-schema.test.ts       # delete — tautological tests over the above

packages/types/src/
└── index.ts                      # McpToolDefinition.inputSchema doc comment — confirm Draft 7 wording stays accurate

packages/api/src/server/handlers/
└── validation.ts                 # buildCommandSchema() — NOT touched by this phase; flagged as future follow-on
```

## Success Criteria

- [ ] `propertyTypeToZod()` resolves `{ enum: X }` to `z.enum([...])` with
      `.describe()` on every generated field
- [ ] A per-command zod schema builder exists and is covered by shape-level
      tests (not snapshot tests) for every `PropertyType` variant
- [ ] Every generated `packages/<app>-server/src/mcp/tools/*.ts` file's
      `inputSchema` is produced by `z.toJSONSchema(schema, { target: 'draft-7' })`
      against the command's zod schema, with no hand-built JSON Schema object
      remaining in the generator
- [ ] Every generated CLI enum flag's `validator` is produced by the zod →
      typanion adapter, and a clipanion end-to-end test proves rejected
      values still produce a message naming the allowed values
- [ ] `packages/core/src/generator/cli/flags.ts` and
      `packages/core/src/manifest/json-schema.ts` (+ its test) are deleted
- [ ] `zod-to-json-schema` no longer appears in any `package.json` in the
      repository
- [ ] `pnpm generate:check` passes (generated output matches manifests,
      idempotently) after every step of the migration plan
- [ ] The Calendar app's generated output (client + server) is hand-reviewed
      end to end at least once as the representative sample before the
      remaining ~34 apps are regenerated in bulk
