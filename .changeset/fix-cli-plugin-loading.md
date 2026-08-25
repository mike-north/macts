---
'@macts/cli': patch
---

Fix CLI plugins failing to load entirely

Every `@macts/<app>` plugin package failed to load: the loader resolved the
plugin's `./cli` subpath with a CJS `require.resolve()`, which only matches
the `"require"` export condition, but every generated `@macts/<app>` package
is ESM-only and declares only `"types"`/`"import"` conditions. Resolution
threw `ERR_PACKAGE_PATH_NOT_EXPORTED` for every plugin, unconditionally,
before a single command was registered.

The loader now resolves the `./cli` export itself by reading the installed
package's `package.json` `exports` map directly (honoring the `"import"`
condition, with a `"default"` fallback) and dynamically importing the
resolved file by URL, rather than going through Node's CJS resolver. The
existing development-mode fallback (plain module resolution when no managed
plugins directory is present) is unchanged.

Separately, `bin.ts` no longer decides whether a plugin is "not installed"
by checking whether its error message contains the substring
`"Cannot find package"` — a genuinely broken (but installed) plugin can
produce that same substring, so this silently swallowed real failures and
made "installed but broken" indistinguishable from "not installed" (users
saw no warning and no error, just a missing command). `PluginLoadError` now
carries a structural `reason: 'not-installed' | 'load-error'` field (see the
new `PluginLoadFailureReason`/`LoadPluginResult` types) that the loader
determines directly (a missing package directory vs. any other failure), and
`bin.ts` branches on that field instead of pattern-matching the message.
