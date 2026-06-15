---
'@macts/core': minor
'@macts/cli': patch
'@macts/mcp': patch
'@macts/api': patch
---

Fix generated CLI and MCP code so the whole workspace passes strict `pnpm typecheck`

The code generators emitted argument casts that strict TypeScript rejects, so every
generated app package failed type checking. The generators now emit sound, precise
assertions and all app packages have been regenerated from their manifests.

**Generator fixes (`@macts/core`):**

- Generated CLI `create` commands assert the SDK's exact `*CreateInput` type instead of
  the unsound `as Record<string, unknown>` (which strict mode rejected, including for
  inputs with no writable fields).
- Generated CLI and MCP command/tool handlers assert each argument to the SDK method's
  exact parameter type (`Parameters<typeof method>[i]`) instead of the bare `as unknown`
  cast, which is assignable to no concrete parameter type.
- A command parameter named `path` no longer produces a class field that shadows
  Clipanion's `Command.path` member; it is renamed (e.g. `browsePath`) while keeping the
  `--path` flag.
- Self-nested resource hierarchies (and commands whose parameter is the resource's own
  ID) no longer emit a duplicate identifier for the resource-ID option.
- MCP tools no longer synthesize an implicit identifier for custom resource commands
  (e.g. `show`), and the generic resource-command handler now passes every parameter
  positionally to match the SDK signature.
- MCP array parameters emit `items` as a JSON Schema object instead of a bare type
  string.
- Resource client files now import enum types referenced by resource command parameters
  (e.g. `SaveFormat`).

**Other fixes:**

- `pnpm typecheck` now runs in CI, after `pnpm build`, so this class of error cannot
  regress unnoticed.
- Fixed strict-mode type errors in `@macts/api`, `@macts/cli`, and `@macts/mcp` plugin
  and middleware tests.
