---
'@macts/core': minor
---

Add the governance policy declaration and audit-record foundation

`@macts/core` now exports a domain-agnostic governance module that supplies the decision-invariant building blocks for the trust boundary:

- **Governance policy declaration** — a Zod schema, types, and a `parsePolicy(unknown)` parser that validates at the trust boundary via `.safeParse()` and returns structured, path-tagged issues instead of throwing. The declaration models apps and operations as `allowed` / `read-only` / `confirm-first` / `forbidden`, with separate path/URL allow and deny restrictions and sensitivity tags. Unspecified apps/operations default to a fail-closed `forbidden` boundary, and unknown keys are rejected.
- **Structured audit records** — a typed, immutable `AuditRecord` (capability, args summary, app, API-key id, timestamp, decision, optional reason) plus a pure `createAuditRecord` constructor and a deterministic `serializeAuditRecord` that emits a JSON-safe form with an ISO-8601 timestamp. Timestamps are caller-injected, so records are fully deterministic.
- **Argument-redaction helper** (`redactArgs`) — sanitises raw capability-call arguments before they enter an audit record. Sensitive key names (password, token, secret, apiKey, api_key, authorization, key, credential — compared case-insensitively) are replaced with a stable `[redacted]` placeholder; non-sensitive values are summarised safely (large objects/arrays truncated to a size hint). Callers may extend the default sensitive-key list.
- **Durable audit-record writer** (`createFileAuditWriter`) — appends serialised audit records to a JSON-lines (NDJSON) file at an explicitly-provided path. Parent directories are created automatically; errors are surfaced, never swallowed. The writer accepts a plain absolute path and never resolves a home directory or reads environment variables — home-dir wiring belongs to the caller layer.
- **Governance-policy wildcard matcher** (`findMatchingPolicyRule`, `appPatternMatches`, `operationPatternMatches`) — resolves which policy rule governs a concrete `app:resource:operation` capability, using the same "wildcard in pattern position matches any concrete value" semantic as the existing permission-system matcher. First-match-wins in declaration order.

This is decision-invariant scaffolding. It deliberately does not compile declarations to `app:resource:operation` permissions, wire approval gates, filter discovery, or build full enforcement — those await the governance-policy design decision.
