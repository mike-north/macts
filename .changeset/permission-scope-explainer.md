---
'@macts/core': minor
'@macts/cli': minor
---

Add human-readable permission scope explainer. Given a set of granted permission patterns and an app manifest, `explainScope` produces a structured breakdown of granted and not-granted operations (with manifest-derived descriptions) for each resource. `renderScopeExplanation` renders this as plain-text prose. Both are exported from `@macts/core`. The `api-key create` CLI command now prints the grant/does-not-grant explanation when `--manifest` is provided.
