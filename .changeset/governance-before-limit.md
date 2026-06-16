---
'@macts/core': patch
'@macts/cli': patch
'@macts/mcp': patch
---

Fix governance filter applied after --limit slice, causing under-filled results

Previously, `searchCapabilities` sliced results to `--limit` before governance was applied, so denied capabilities in the top-N left gaps instead of being backfilled from lower-ranked allowed matches. A search for "top 10" could silently return fewer than 10 results when a real policy denied some.

- Add `governedDiscoverySearch` to `@macts/core` — the correct all-in-one entry point for discovery surfaces: applies governance to the **full** ranked match set, then slices to `limit`. A request for N results now returns N _allowed_ results, with backfilling from lower-ranked capabilities.
- Add `filter?: GovernanceFilter` option to `SearchCapabilitiesOptions` so `searchCapabilities` can also apply governance before slicing.
- Update CLI (`macts capabilities search`) and MCP discovery tool to use `governedDiscoverySearch`.
- Add regression tests: partial-denial-under-limit (verifies backfilling) and all-denied (verifies `governance-blocked` vs `no-match` distinction is preserved).
