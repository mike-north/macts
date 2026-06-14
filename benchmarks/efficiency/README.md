# @macts-bench/efficiency

A reproducible harness that measures the load-bearing thesis behind macts:

> The safe path must also be the easy path.

It runs a small, representative set of desktop tasks **two ways** and captures, per
task per path, the tokens consumed, model round-trips, wall-clock time, success,
and retries. From those measurements it emits a machine-readable JSON report and a
human-readable markdown summary generated from the same data.

This is a **private, unpublished** workspace package. It is not part of the
`@macts/*` release set and ships no public API.

---

## The two paths

| Path               | What it is                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `raw-computer-use` | An agent driving the UI by pixels — a screenshot → reason → click/type loop. One model turn per cycle. |
| `macts`            | Structured automation through typed, permissioned capabilities.                                        |

### What the `macts` path stands in for (and why)

The spike scope frames the macts path as **capability discovery + composed
code-mode execution**. Those two runtimes are downstream of this benchmark in the
build sequence and are **not implemented yet**. So this harness does not build
them. Instead it measures the _ceiling_ of the structured approach using today's
building blocks, with two explicit stand-ins:

- **Discovery → explicit capability selection.** Each task declares the
  `@macts/*` capabilities it composes (e.g. `calendar.events.create`). An authored
  composed script selects the matching typed SDK calls. A future discovery runner
  will resolve these from the capability registry instead.
- **Code-mode → one hand-authored composed script.** The macts runner performs
  all of a task's typed operations in **one** model round-trip — the agent plans
  once and emits a single composed execution rather than looping. A future
  code-mode runtime will sandbox-execute agent-authored TypeScript in its place.

Both runners implement the **same `Runner` interface**. That is the point: the
macts runner can be swapped for a real discovery + code-mode runner later with
**no change** to the harness, metrics, or report code.

---

## Layout

```
benchmarks/efficiency/
├── src/
│   ├── types.ts              # Runner contract + report schema (v1)
│   ├── tasks/
│   │   ├── schema.ts         # Zod validation for task definitions (trust boundary)
│   │   └── registry.ts       # The default representative task set (data)
│   ├── metrics.ts            # Pure aggregation: summaries + comparison
│   ├── report.ts             # Pure JSON build + markdown render (same data)
│   ├── harness.ts            # Orchestrator: tasks × runners, error→failure capture
│   ├── runners/
│   │   ├── agent.ts          # ModelDriver seam + UsageMeter (token/turn accounting)
│   │   ├── environment.ts    # Live-config resolution + LiveEnvironmentError
│   │   ├── raw-computer-use.ts  # RawComputerUseRunner (live)
│   │   ├── macts.ts          # MactsRunner (live)
│   │   └── scripted.ts       # ScriptedRunner (deterministic, tests only)
│   └── bin/bench.ts          # `macts-bench` CLI
└── test/
    ├── *.test.ts             # CI-automatable unit tests (pure logic + runner seams)
    └── local/                # Locally-automatable live run (NOT run in CI)
```

---

## Adding a task

Tasks are plain data validated by a Zod schema, so no harness code changes are
needed. Add an entry to `src/tasks/registry.ts` (or load an external JSON set
through `parseTaskSet`). Each task declares:

- `id` — stable, kebab-case, unique.
- `intent` — one-line user goal.
- `apps` — bundle identifiers the task touches (documents the live requirement).
- `operationClass` — `read` / `write` / `delete` / `send` / `execute` / `system-change`.
- `mactsCapabilities` — the typed capabilities the structured path composes.
- `notes` — optional preconditions / expected end state / cleanup.

The validator rejects malformed entries (bad id casing, empty `apps`/capabilities,
unknown operation classes, duplicate ids, unknown keys).

---

## Running it

```bash
# From the repo root
pnpm --filter @macts-bench/efficiency bench
# Optional flags:
pnpm --filter @macts-bench/efficiency bench --out ./benchmark-results --max-retries 2
```

This writes `report.json` (schema v1) and `report.md` to the output directory
(default `./benchmark-results`, gitignored).

### Without a live environment (e.g. CI, a dev box)

By default the CLI constructs the real runners with **no live dependencies**. In
that case every task is recorded as a clean failure citing the missing live
environment, and the report is an honest "awaiting a live run". **No numbers are
fabricated.** This is intentional — the spike must surface the real measurement
gap rather than invent a result.

---

## What requires a live Mac (and cannot run in CI)

Producing real numbers requires all of:

1. A live macOS desktop with the target apps installed and signed in
   (Calendar, Finder, Mail, Reminders for the default set).
2. The **macts API server** running locally (the macts SDKs are HTTP clients that
   call it; default `http://localhost:8372`).
3. A **macts API key** scoped to the capabilities under test.
4. A **computer-use / tool-using model** API key for token + turn accounting.

GitHub Actions runners cannot drive desktop apps, and passing real model
credentials to CI would incur token costs at API rates. Per the team's testing
policy, the live run is therefore a **locally-automatable** test
(`test/local/`) — an operator kicks it off and it runs to a deterministic
pass/fail with no human judgment during execution — gated outside CI rather than
forced into it.

### Environment variables

| Variable              | Required | Purpose                                                      |
| --------------------- | -------- | ------------------------------------------------------------ |
| `BENCH_MODEL_API_KEY` | yes      | Credentials for the computer-use / agent model.              |
| `MACTS_API_KEY`       | yes      | macts API key authorizing the scoped capabilities.           |
| `MACTS_BASE_URL`      | no       | macts API server base URL (default `http://localhost:8372`). |

### Wiring the live runners

The runner _logic_ is dependency-injected; a live run supplies those deps:

- **`RawComputerUseRunner`** takes `{ driver, screen, maxTurns }`:
  - `driver: ModelDriver` — wraps the computer-use model; each `step` is one model
    round-trip reporting its token usage.
  - `screen: ScreenController` — `screenshot()` (e.g. `screencapture`) and
    `perform(action)` (synthetic click/type).
- **`MactsRunner`** takes `{ config, scripts, planningUsage }`:
  - `config: LiveConfig` — from `resolveLiveConfig(process.env)`.
  - `scripts` — a map of task id → `ComposedScript`, each authored to perform that
    task's typed `@macts/*` SDK calls against the live server (the code-mode
    stand-in). Scripts must not call a model.
  - `planningUsage` — token usage of the single planning turn that emits the
    composed script, measured from the real model call.

Then run the default task set both ways via `runBenchmark([raw, macts], DEFAULT_TASKS)`
and render with `renderMarkdown(report)`. The `test/local/` suite is the intended
home for this wiring; it is skipped automatically whenever the live env vars are
absent (including in CI).

### Validation seal

Because the live run cannot gate CI directly, attest it locally with
[attest-it](https://github.com/mike-north/attest-it) and let CI verify the seal,
per the team testing policy (ENG_TEAM_INSTRUCTIONS §6). The seal invalidates when
the runner sources change, so a stale attestation cannot pass.

---

## Metrics & report schema (v1)

Per `(task, runner)` the harness captures `RunMetrics`: `totalTokens`, `turns`,
`wallClockMs`, `success`, `retries`. A runner that fails still reports the
tokens/turns it consumed before failing; a runner that _throws_ (an
infrastructure fault — server down, missing key) is caught and recorded as a
failure with `retries === maxRetries` and the error message as `failureReason`.

`buildReport` aggregates these into per-path `RunnerSummary` objects and a
head-to-head `Comparison`:

- `tokenRatio` / `turnRatio` = `raw / macts` — a value **> 1** means macts is
  cheaper / fewer round-trips. `null` when a denominator is zero.
- `successRateDelta` = `macts − raw` — **> 0** means macts is more reliable.

The JSON report (`schemaVersion: 1`) and the markdown summary are produced from
the **same** `BenchmarkReport`, so they can never disagree.

---

## Initial findings

**Awaiting a live run.** This environment has no Mac with the target apps, no
running macts API server, and no model credentials, so the harness cannot produce
real token/round-trip/reliability numbers. The committed harness deliberately
reports failures-pending-live-environment rather than fabricated figures.

What the harness already encodes as the structural hypothesis to be confirmed by
a live run:

- **Round-trips.** The macts path is designed to complete in a **single** model
  turn (plan once, emit one composed execution), whereas the raw path needs one
  turn per screenshot/act cycle (default budget 40). The expected round-trip
  reduction is therefore large.
- **Tokens.** Each raw turn re-ingests a screenshot and re-reasons over a
  high-entropy pixel observation; the macts path pays one planning turn plus
  zero-token typed SDK calls. The expected token reduction tracks the round-trip
  reduction.
- **Reliability.** Typed calls against the app's object model avoid the
  mis-click / wrong-target failure modes of pixel driving, so the macts path is
  expected to show a higher success rate and fewer retries.

These are hypotheses the harness exists to **measure**, not claims. Run the live
benchmark to fill in the numbers, and record the finding (including any task where
macts does **not** yet win — that is a product signal, not a failure).

```

```
