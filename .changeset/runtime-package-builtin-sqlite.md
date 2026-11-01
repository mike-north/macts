---
'@macts/runtime': minor
'@macts/api': minor
'@macts/mcp': minor
'@macts/cli': minor
---

Add `@macts/runtime` and store API keys with Node's built-in SQLite

**`@macts/runtime`** is a new package for the Mac-side state and checks that every macts surface shares. It holds:

- **API keys**: minting, verification, revocation, and the on-disk key store, including per-key governance policies. `closeKeyStore()` releases the store's database for a graceful shutdown.
- **Governance loading**: the active host policy, the configured approval provider, per-key policy resolution, and the `GovernanceContext` a call is enforced against, with `resolveGovernanceForRequest`.
- **Shared host state**: `getMactsHome()` and the process-wide logger (`getLogger`, `setLogger`, `createLogger`).

The HTTP server, the MCP server, and the CLI's `api-key` commands now all use it. `@macts/mcp` no longer depends on `@macts/api`.

**The key store uses Node's built-in `node:sqlite`.** Installing macts no longer builds or downloads a native addon. Existing key databases open unchanged. Node.js **22.13.0** or later is now required, because it is the first release that loads `node:sqlite` without a flag. On Node versions that still label SQLite experimental, macts keeps that one-time notice off stderr and leaves every other warning visible.

**Breaking for direct importers of `@macts/api`:**

- The `@macts/api/keys` entry point is removed. Import key management from `@macts/runtime` instead.
- `@macts/api` and `@macts/api/server` no longer re-export key management, the logger, governance policy and approval loading, or the governance context types. Import them from `@macts/runtime`. `requirePolicy` and the HTTP response types stay in `@macts/api`.
