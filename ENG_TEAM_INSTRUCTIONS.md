# Engineering Team Instructions

Standing guidance for engineers (human and agent) picking up work on macts.
Read this before starting any issue. For _why_ we are building this, read
[`VISION.md`](./VISION.md); for _what and in what order_, read
[`STRATEGY.md`](./STRATEGY.md).

---

## 1. Mission

macts is a **trusted local automation substrate** for AI agents. The North Star
governs every decision:

> **The safe path must also be the easy path.**

If your change makes the structured, permissioned, auditable path _slower,
chattier, or more fragile_ than an agent driving the UI by pixels, it is wrong —
revisit it. Optimize relentlessly for token efficiency, reliability, and
governability at the same time.

## 2. How work reaches you

- Work is dispatched as **GitHub issues**. Each issue states scope, acceptance
  criteria, dependencies, and whether it is **greenlit** or **backlog**. Only
  start greenlit issues.
- If an issue is ambiguous, under-specified, or you discover it conflicts with
  another in-flight issue, **stop and ask in the issue thread** before building.
  Do not guess at product intent.
- Keep scope tight to the issue. File a follow-up issue for adjacent
  improvements rather than expanding the diff.

## 3. Product principles (non-negotiable)

1. **AppleScript and JXA are invisible.** They are implementation details. No
   macts surface — SDK, CLI, MCP, HTTP API, docs, error messages — may expose
   AppleScript/JXA terminology, syntax, or mental model. If a user could open an
   issue saying "I don't understand the AppleScript part," we failed.
2. **SDKs feel hand-crafted.** Generated surfaces must read like an idiomatic
   SDK a senior engineer designed for that app — not mechanical bindings.
   Compare against an app's official API where one exists.
3. **Manifests are lossless-plus.** The manifest is the single source of truth
   from which every surface is generated. It must carry _more_ than the source
   dictionary (runtime-probed types, risk classification, permissions, app
   metadata, confidence scores, open questions).
4. **Agent-driven, human-reviewed.** Capability extraction is agent-driven with
   human review. Output carries confidence scores and structured open questions
   so reviewers know where to focus.
5. **No contributor (or agent) has every app.** Real-application tests cannot
   run in CI. Use validation seals (see Testing) so locally-run automated tests
   gate CI without CI needing the app installed.

## 4. Architecture invariants

- **Engine vs. engagement layer** (see `STRATEGY.md`). The engine
  (dictionary → manifest → generated surfaces) is deterministic. The engagement
  layer (Discover / Govern / Compose / Reuse) sits on top.
- **Manifest is the source of truth.** Never hand-edit a generated app package
  to add behavior. Change the manifest or the generator, then regenerate.
  Generated packages (`packages/<app>`, `packages/<app>-server`) are outputs.
- **Hand-written vs. generated.** Infrastructure packages (`@macts/core`,
  `@macts/cli`, `@macts/mcp`, `@macts/api`) are hand-written. App packages are
  generated from `manifests/<app>/app.yaml`. A client package
  (`@macts/<app>`) bundles SDK + CLI plugin; a server package
  (`@macts/<app>-server`) bundles HTTP API + MCP plugin.
- **One manifest → every surface.** New per-app capability data belongs in the
  manifest schema and the generators, so SDK, CLI, MCP, API, and discovery
  metadata all stay coherent.
- **Domain-agnostic engagement layer.** Do not hard-code macOS assumptions into
  Discover/Govern/Compose/Reuse code. macOS specifics live behind a provider
  seam so `@webacts/*` (web/Chrome) can plug in later. Do not build webacts
  speculatively.
- **Permissions are capability-scoped.** Enforcement uses the
  `app:resource:operation` model. Default to narrow access; require explicit
  escalation. Sensitive operations (send, delete, execute, system-change, read
  private data) must be classifiable and gateable.

## 5. Repo conventions

- **Package manager:** `pnpm` (v10, see `packageManager`). Never `npx`/`npm`.
  Use `pnpm exec <bin>` or `./node_modules/.bin/<bin>`, never `pnpm dlx tsc`.
- **Monorepo:** `nx` orchestrates targets. `pnpm build|test|lint|typecheck`
  run across packages; filter with `pnpm --filter @macts/<pkg> <target>`.
- **TypeScript:** strict (`tsconfig.base.json`), `noEmitOnError`. In libraries
  avoid `esModuleInterop`, `allowSyntheticDefaultImports`, `skipLibCheck`. Use
  `@ts-expect-error` (with a reason), never `@ts-ignore`.
- **Build:** app packages build with `tsup`. Run `tsc` before `api-extractor`
  (it consumes `.d.ts`).
- **Linting/format:** ESLint flat config (`eslint.config.js`); Prettier owns
  formatting (`eslint-config-prettier` is last in extends — do not add
  formatting rules to ESLint). Run `pnpm format` before pushing; CI runs
  `format:check`.
- **API surface:** every library uses `@microsoft/api-extractor@^7` +
  `@microsoft/api-documenter`. `package.json#types` points at the rollup. Commit
  `/api-report` and generated `/docs`; `/temp` is gitignored. Run
  `api-extractor run --local` in dev, `api-extractor run` (no `--local`) in CI.
- **Versioning:** Changesets. `@macts/*` is **fixed + linked** — every
  publishable change needs a changeset; the whole scope versions together. Never
  set `"changelog": false`.
- **Versions in code:** never hard-code a version literal. Source it from
  `package.json`.

## 6. Testing

Follow a multi-layer strategy — do not default to "unit tests only."

- **Unit** for pure logic; **integration** wherever you mocked a dependency in a
  unit test (exercise the real one somewhere); **e2e** for multi-step flows;
  **UAT** for anything user-visible (CLI output, MCP tool shape, exit codes).
- **Runner:** `vitest` for runtime behavior; `tsd` for type behavior. Utility
  types need positive + negative + edge `tsd` coverage.
- **Negative tests** for validation, error paths, boundaries, parsing, and
  permission/governance logic. Skip only what the type system already
  guarantees.
- **Bug fixes ship a regression test** that fails pre-fix and references the bug.
- **Spec-first assertions.** Derive expected values from the spec/manifest, by
  hand — never from current program output. No snapshot/gold-master as a
  correctness mechanism.
- **Real-app tests** can't run in CI: gate them with locally-run validation
  seals (attest-it) that CI enforces and that invalidate when relevant files
  change.
- **Fixed dates** in test data — no `new Date()`/`Date.now()`; use
  `vi.useFakeTimers()` for time-dependent behavior.

## 7. Git & PRs

- **Branch off `main`** (never commit to `main` directly); prefer a git
  worktree under `.worktrees/`. Branch names may use internal labels.
- **Commit author:** this is a personal repo —
  `Mike North <michael.l.north@gmail.com>`. Always set `--author`. Never add AI
  attribution trailers (`Co-authored-by`, `Assisted-by`, etc.).
- **No internal concepts in public content.** Keep epic numbers, phase labels,
  and agent attribution out of commits, PR descriptions, code comments, and
  docs. Use outcome-focused language. (Branch names are exempt.)
- **PRs** target `main`, link the issue, and — when CLI/MCP/API user-visible
  output changes — include before/after diff blocks in the description.
- Split obviously-distinct concerns into separate commits at the file level.

## 8. Definition of Done

An issue is done when **all** hold:

1. Acceptance criteria in the issue are met.
2. `pnpm build && pnpm lint && pnpm typecheck && pnpm test` pass from a clean
   state.
3. New/changed behavior has tests at the right layer(s), including negative and
   (for fixes) regression tests.
4. Public API changes are reflected in `api-extractor` reports and a changeset
   exists.
5. No AppleScript/JXA leaks through any user-facing surface.
6. Generated packages were produced by regenerating from manifests, not
   hand-edited.
7. Docs/README updated if user-visible behavior changed.
8. The change keeps the safe path the easy path — it does not regress token
   efficiency, reliability, or governability.

## 9. Anti-patterns (do not do)

- Hand-editing generated app packages instead of fixing the manifest/generator.
- Leaking AppleScript/JXA concepts into any surface.
- Adding macOS-specific assumptions to the engagement layer.
- Snapshot/gold-master tests as a correctness check.
- Broad, ambient permissions where a narrow capability scope would do.
- Hard-coded version strings.
- Expanding an issue's scope instead of filing a follow-up.
