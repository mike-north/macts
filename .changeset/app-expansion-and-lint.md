---
'@macts/core': minor
'@macts/cli': minor
'@macts/mcp': patch
'@macts/api': patch
---

Add 12 new macOS app packages, fix all lint errors, and add plugin discovery e2e tests

**New apps (12):**
- Shortcuts, Automator, Photos, Xcode, Microsoft Edge, Microsoft Word, OmniFocus, OmniGraffle, OmniPlan, Alfred 5, Bluetooth File Exchange, System Information

**Generator improvements:**
- Fix code generators to emit lint-clean TypeScript (no-invalid-void-type, no-explicit-any, restrict-template-expressions, no-unnecessary-condition, no-useless-escape)
- Generated code now uses `rpc<undefined>` instead of `rpc<void>`, `as unknown` instead of `as any`, and proper template literal interpolation

**Infrastructure lint fixes:**
- Fix all ESLint errors across @macts/core, @macts/cli, @macts/mcp, @macts/api
- Replace deprecated Zod v4 APIs (.passthrough → .loose, .datetime → z.iso.datetime)
- Add isValidCachedPlugin type guard to CLI cache for consistency with MCP cache

**Plugin discovery e2e tests:**
- Add e2e tests for CLI and MCP plugin discovery using fixturify-project
- Add unit tests for CLI plugin manager, cache, and path utilities
- Add MCP path utility tests
- Add cross-system integration test validating CLI/MCP coexistence
- Add cache integration tests (fast path, invalidation)

**Manifest fixes:**
- Fix duplicate enum values in mail (kerberos5, md5) and music (mP3CD, m3U, m3U8) manifests
- Fix Script Editor manifest name for correct package directory naming

**Documentation:**
- Add comprehensive manifests/README.md documenting YAML schema and permissions model
- Add CONTRIBUTING.md with guidelines for adding new macOS app packages
- Update root README.md with current package names and full supported apps table

**Infrastructure:**
- Remove Verdaccio registry from .npmrc
- Add fixturify-project devDependency for e2e test fixtures
- Add scratch/ to .gitignore
