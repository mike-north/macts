---
'@macts/core': minor
'@macts/api': minor
---

Let an API key carry its own governance policy, composed with the host policy so it can only tighten

An API key can now carry a governance policy document of its own (the same `PolicySchema` shape as the host policy). A narrowly-scoped key — one issued to a single agent, say — can be held to a stricter bar than the machine-wide default without editing the host policy file. The invariant is structural: **a key policy can only ever tighten, and can never grant what the host policy withholds.**

**`@macts/core` — layered composition:**

- `evaluateLayeredPolicy({ hostPolicy, keyPolicy?, permission, risk })` evaluates each layer independently through the existing evaluator and returns the stricter result as a `LayeredPolicyEvaluation` — a `PolicyEvaluation` plus `layer` (`'host'` | `'key'`), each layer's own evaluation, and the composed restrictions.
- Composition happens at the **decision** level, after risk class is applied, where the tightening lattice is a true total order: `denied` > `confirm-first` > `allowed`. A deny at either layer denies and is never escalated into an approval request; a `confirm-first` at either layer holds the call rather than letting it through silently; `allowed` requires both layers to allow. Composing declared _dispositions_ instead would be unsound — `read-only` and `confirm-first` swap strictness with the operation's risk class, so a `confirm-first` key policy would turn a host `read-only` denial of a mutating call into an approvable hold. `compareDispositionStrictness` still ships as a declarative ordering for policy authoring and inspection, documented as not being the composition rule.
- `composeRestrictions` composes path/URL restrictions as **union of denies, intersection of allows**. Allow lists stay as one conjunctive group per constraining layer (a candidate must satisfy every group), because flattening two allow lists over opaque patterns into one list would widen them. `composedRestrictionsPermit` evaluates a candidate against the composed set using a caller-supplied pattern matcher.
- `enforceCall` accepts an optional `keyPolicy` and returns the layered evaluation, so every enforcement decision reports which layer governed it. With no key policy the evaluation — decision, matched rule, and reason string alike — is the host policy's own, unchanged.

**`@macts/api` — per-request resolution:**

- An API key's policy is stored alongside its metadata in the key store, keyed by key id, encrypted at rest: `setKeyPolicy`, `getKeyPolicy`, `deleteKeyPolicy`, `listKeyPolicyIds`. A policy is validated on write, and a stored policy that cannot be read back raises `KeyPolicyError` rather than being silently dropped (dropping it would widen the key back to the host policy alone). A key's policy is removed with the key — whether the key is deleted individually or dropped by a bulk `saveKeyMetadata` replacement — so a future key issued with the same id can never inherit it.
- `GovernanceContext` gains an optional `keyPolicies` resolver, and `resolveGovernanceForRequest` resolves the applying policy **per request** from `apiKeyPayload.sub` — the host policy is machine-wide and can be bound once, but which key policy applies depends on who authenticated. `createKeyPolicyResolver` / `createStoredKeyPolicyResolver` cache per key id with a short TTL and an explicit `invalidate` that holds even against a load already in flight, so tightening a key's policy takes effect immediately; a resolver failure fails the request closed with a 500 rather than falling back to the host policy.
- A `confirm-first` hold now carries the layer that produced it all the way to the approval provider: `ApprovalRequest.layer` reports `'host'` or `'key'`, which is the data a provider declaring `supportsDistinctRouting` routes on. A host denial is still never escalated — the provider is not consulted for a call the host policy already refused. The `202` pending-approval response (no provider configured) likewise names the layer in `pendingApproval.layer`.
- `ApprovalLayer` is now an alias of `PolicyLayer` so the approval seam and the policy layer cannot drift into two spellings of the same idea.

Keys with no policy of their own are entirely unaffected: same decisions, same reasons, same response bodies.
