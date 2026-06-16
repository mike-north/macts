---
'@macts/core': minor
---

Add governance policy enforcement at call time

`@macts/core` now enforces a declared governance policy at capability call time, bridging the policy declaration (from the governance foundation) to the `app:resource:operation` permission model.

**`governance/enforcement.ts`** — the enforcement engine:

- `enforceCall(options)` — checks a capability invocation against the active `GovernancePolicy`, returns an `EnforcementDecision` with outcome (`allowed` | `denied` | `pending-approval`) plus a human-readable reason naming the violated rule and exact permission.
- `resolveDisposition(policy, app, resource, operation)` — resolves the effective `PolicyDisposition` for a concrete triple, using `findMatchingPolicyRule`; falls back to `policy.defaultDisposition` (fail-closed: defaults to `forbidden`).

Disposition semantics enforced:

- `allowed` → call proceeds.
- `read-only` → only `read`-risk-class operations are permitted; any other risk class is denied.
- `confirm-first` → returns `pending-approval` signal for the caller to gate on human confirmation (approval flow is a separate concern).
- `forbidden` → call is denied with a reason naming the rule and permission.
- Unspecified (no matching rule) → `policy.defaultDisposition` applies, keeping the boundary fail-closed by default.

Every decision is written to the injected `AuditWriter` (same writer from the foundation), so the audit trail is unconditional and testable without I/O.
