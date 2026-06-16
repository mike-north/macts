---
'@macts/core': minor
'@macts/cli': patch
---

Wire the real governance policy into capability discovery (CLI + MCP)

`@macts/core` now exports a policy-backed `GovernanceFilter` implementation and a policy file loader:

- **`createPolicyGovernanceFilter(policy)`** — returns a `GovernanceFilter` backed by a parsed `GovernancePolicy`. Translates policy dispositions to discovery dispositions: `allowed` → `allow`, `read-only`/`confirm-first` → `warn` (surface with flag), `forbidden` → `deny`. Uses `findMatchingPolicyRule` to resolve the most specific matching rule per capability's `app:resource:operation` triple; falls back to `policy.defaultDisposition` (fail-closed: `forbidden` by default) when no rule matches.
- **`PolicyGovernanceFilter`** — the class implementing the filter (exported for `instanceof` checks / extension).
- **`loadPolicyFromFile(path)`** — reads and validates a governance policy from a JSON file. Returns a discriminated `LoadPolicyResult`: `{ found: false }` when absent (normal — policy is optional), `{ found: true, error, issues? }` when present but invalid, or `{ found: true, policy }` when valid. Never reads `MACTS_HOME` itself; callers supply the absolute path.

`@macts/cli` now wires the active policy into `capabilities search`, `capabilities inspect`, and the built-in MCP discovery tool:

- Both CLI discovery surfaces and the MCP discovery tool load `$MACTS_HOME/policy.json` on startup. When the file is present and valid, the policy-backed filter is used; when absent, the existing no-op allow-all behaviour is preserved; when present but invalid, a warning is written to stderr and the filter degrades gracefully to allow-all.
