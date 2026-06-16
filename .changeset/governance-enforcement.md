---
'@macts/core': minor
'@macts/api': minor
---

Enforce the declared governance policy at capability call time

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
