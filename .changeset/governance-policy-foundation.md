---
'@macts/core': minor
---

Add the governance policy declaration and audit-record foundation

`@macts/core` now exports a domain-agnostic governance module that supplies the decision-invariant building blocks for the trust boundary:

- **Governance policy declaration** — a Zod schema, types, and a `parsePolicy(unknown)` parser that validates at the trust boundary via `.safeParse()` and returns structured, path-tagged issues instead of throwing. The declaration models apps and operations as `allowed` / `read-only` / `confirm-first` / `forbidden`, with separate path/URL allow and deny restrictions and sensitivity tags. Unspecified apps/operations default to a fail-closed `forbidden` boundary, and unknown keys are rejected.
- **Structured audit records** — a typed, immutable `AuditRecord` (capability, args summary, app, API-key id, timestamp, decision, optional reason) plus a pure `createAuditRecord` constructor and a deterministic `serializeAuditRecord` that emits a JSON-safe form with an ISO-8601 timestamp. Timestamps are caller-injected, so records are fully deterministic.

This is decision-invariant scaffolding. It deliberately does not compile declarations to `app:resource:operation` permissions, wire approval gates, filter discovery, or persist records — those await the governance-policy design decision.
