# macts Strategy: Execution Plan for the Pivot

**Status:** Active
**Owner:** Product
**Last updated:** June 14, 2026
**Canonical thesis:** [`VISION.md`](./VISION.md)

This document turns the [vision memo](./VISION.md) into the execution plan the
engineering team works against: the North Star, the architecture model, the
epics, their sequencing, and how we measure success. Read `VISION.md` first for
the _why_; this doc is the _what_ and _in what order_.

---

## North Star

> **The safe path must also be the easy path.**

When a desktop AI agent is about to drive an application, the most reliable,
most token-efficient, most governable way to get the job done must also be the
_least-effort_ way. If composing a typed, permissioned macts capability is more
expensive or more fragile than screenshotting and clicking, agents will push
pixels and we will have failed — no matter how elegant the rest of the system
is.

Every epic is judged against this sentence. (Vision memo §4.4.)

## The shift

macts is no longer "TypeScript SDKs for macOS automation." It is a **trusted
local automation substrate** that lets agents **discover, compose, permission,
reuse, and govern** structured automations across desktop apps — and, when a
capability is missing, **generate** a new one rather than fall back to pixels.

From _"the agent figures out how to use the app every time"_ to _"the agent
discovers or creates a stable capability, gets it permissioned, and reuses it
safely."_

## Architecture model

Two halves. The **engine** does deterministic work up front so the
**engagement layer** can be semantic, permissioned, and token-efficient.

```text
ENGINE  (deterministic, self-extending)          ENGAGEMENT LAYER  (domain-agnostic)
  source dictionary                                 1. Discover     — find a typed capability for an intent
      ↓  deterministic codegen                       2. Govern       — boundaries, permissions, audit (AgentRC)
  manifest (lossless-plus, source of truth)          3. Compose      — code-mode: one execution, N operations
      ↓                                              4. Reuse        — recipes/skills that compound over time
  semantic SDK / CLI / MCP / HTTP API

  Providers into the engine:
    macts   → macOS apps (AppleScript/JXA dictionaries)   ← today
    webacts → web / Chrome (structured extension bridge)  ← future (@webacts/* reserved)
```

**Why this is the moat:** breadth (74 packages today) is not the asset — the
_transform_ is. Deterministic codegen converts an app's scripting dictionary
into a semantic, granularly-permissioned, context-window-friendly interface.
The packages are its current output. Because the transform is deterministic and
agent-invokable, the substrate **extends itself**: an agent that hits an
unsupported app runs the engine to mint a new capability instead of puppeting
the UI.

**Domain-agnostic engagement layer:** the four engagement capabilities must not
hard-code macOS assumptions. macOS-specific behavior sits behind a thin
**provider seam** so `@webacts/*` (Chrome) can plug in later without a rewrite.
We prove the seam on macOS first; we do **not** build webacts speculatively.

## Epics

| Epic                                    | Scope                                                                                                                                                | Vision §             | Status                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------- |
| **Spike · Efficiency benchmark**        | Reproducible harness: same task set via raw computer-use vs. macts discovery + code-mode. Measure tokens, round-trips, reliability.                  | §4.4, §5             | **Greenlit (do first)** |
| **0 · Positioning**                     | Reframe README to "agent-ready APIs"; add security-model and agent-use-case sections.                                                                | §12, roadmap P1      | Greenlit (quick win)    |
| **A · Discovery + Risk Classification** | Manifest-derived capability registry tagged read/write/delete/send/execute/system-change; `macts capabilities search/inspect`; MCP discovery tool.   | §7.1–7.2, P2         | **Greenlit**            |
| **B · Trust & Governance (AgentRC)**    | `.agentrc` + org policy spec; compile-to-permissions; human-readable permission negotiation; audit log; approval gates; discovery filtering.         | §6, §7.3, §10, P3+P6 | **Greenlit**            |
| **C · Code-mode Runtime**               | Sandboxed agent-authored TS against `@macts/*` — one execution, N operations — bounded by Epic B.                                                    | §5.1, §14            | **Greenlit**            |
| **F · Agent-driven Generation**         | Runtime, local-first: unsupported app → inspect dictionary → mint a **local private capability** → permission it → use now. Upstream PR is optional. | §9.4, P5             | **Greenlit**            |
| **D · Recipes / Skills + Steering**     | Named, inspectable, permissioned recipes that double as governance artifacts; plus the §9 agent decision-ladder steering content.                    | §4.5, §9, P4         | Backlog                 |
| **G · webacts provider seam**           | Keep the engagement layer domain-agnostic; spike the Chrome bridge. Design the seam now, build later.                                                | §8, P7               | Backlog                 |

## Sequencing

1. **Benchmark spike runs first and gates the rest.** If macts is not measurably
   cheaper and more reliable than raw computer-use on a representative task set,
   we fix that before building breadth. This is the §4.4 thesis under test.
2. **Runtime core (A, B, C, F) is the first wave.** B (governance) ships
   alongside C (code-mode): we do not ship "agents run scripts" without
   boundaries.
3. **Epic 0 (positioning)** is a cheap parallel win that sets the narrative.
4. **D and G compound on the core** and are specced but not started until the
   core is real and the benchmark validates the thesis.

## Success metrics

The North Star is measurable. The benchmark spike establishes baselines; every
epic moves at least one of these:

- **Token efficiency** — tokens to complete a representative task via macts vs.
  raw computer-use. Target: a large, defensible reduction.
- **Round-trips** — model turns per task. Code-mode should collapse N
  operations into one execution.
- **Reliability** — task success rate and retry count. Structured calls should
  beat pixel-driving on both.
- **Governability** — share of agent actions that are scoped, logged, and
  attributable to a named capability + API key (vs. ambient screen control).
- **Self-extension** — an agent can take an unsupported app to a usable local
  capability without a human writing code.

## Non-goals (for now)

- Building `@webacts/*` before the macOS engagement layer is proven.
- Cloud dependency for automation — execution stays local-first.
- Ambient "control my whole Mac" access — narrow default, explicit escalation.
- Leaking AppleScript/JXA through any surface (a standing product principle).

## Operating model

Product breaks the strategy into GitHub issues (epics and their sub-tasks). The
engineering team picks up greenlit issues and executes against
[`ENG_TEAM_INSTRUCTIONS.md`](./ENG_TEAM_INSTRUCTIONS.md), which defines repo
conventions, architecture invariants, and the definition of done.
