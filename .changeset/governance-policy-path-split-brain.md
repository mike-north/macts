---
'@macts/core': patch
'@macts/api': patch
'@macts/cli': patch
---

Fix governance policy-path split-brain: enforcement and discovery now read the same file

Enforcement (`@macts/api`) and discovery (`@macts/cli`) previously resolved the
active policy from different paths — enforcement used
`<macts-home>/governance/policy.json` while discovery used
`<macts-home>/policy.json`. A policy placed in one location had no effect on the
other, silently undermining governance.

**`@macts/core`** — new `resolveActivePolicyPath(home)` exported from the
governance barrel. This is the single source of truth for where the active policy
lives on disk: `<home>/governance/policy.json`. Both the enforcement layer and
the discovery layer now call this function instead of building the path
themselves, so they always read the same file.

**`@macts/api`** — `getActivePolicyPath()` in
`server/governance/active-policy.ts` now delegates to `resolveActivePolicyPath`
from `@macts/core` instead of joining the path inline.

**`@macts/cli`** — `getPolicyFilePath()` in
`commands/capabilities/policy.ts` now delegates to `resolveActivePolicyPath`
from `@macts/core` instead of joining to `policy.json` at the home root.

**Canonical path:** `<macts-home>/governance/policy.json` (unchanged from
enforcement; the discovery path was the one that was wrong).
