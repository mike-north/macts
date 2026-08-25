/**
 * Regression coverage for `loadPlugin`'s development-mode fallback — the
 * branch used when there is no managed plugins directory (i.e.
 * `getPluginResolutionPath()` returns null), which resolves
 * `${packageName}/cli` via ordinary Node module resolution rather than the
 * hand-rolled `resolveCliEntryUrl`. This is also the path a direct caller of
 * the public `loadPlugin` export hits (see the `index.ts` module doc example
 * `const result = await loadPlugin('@macts/calendar')`), independent of the
 * managed-plugins-directory machinery entirely.
 *
 * Bug: a single try/catch wrapped around both resolving AND executing
 * `${packageName}/cli` classified any `ERR_MODULE_NOT_FOUND` thrown from
 * either step as `reason: 'not-installed'`. That misclassifies a package
 * that IS installed but has a missing transitive dependency — e.g.
 * `clipanion` absent from its own `node_modules` tree, a known real scenario
 * for these plugin packages (see `real-install.uat.test.ts`). In that case
 * the inner `import` inside the package's OWN code throws
 * `ERR_MODULE_NOT_FOUND` for that inner specifier, and the outer catch
 * wrongly reported the whole package as "not installed" — which
 * `bin.ts` deliberately treats as unworthy of a warning (see `bin.ts`'s
 * `if (error.reason === 'not-installed') continue`), silently hiding a
 * genuine breakage.
 *
 * This test runs in a real, separate `node` subprocess (rather than calling
 * `loadPlugin` in-process via vitest) for two reasons:
 *
 *  1. It needs a package that resolves through GENUINE Node module
 *     resolution (not `fixturify-project`'s node_modules-shaped fixtures,
 *     which `loadPlugin`'s managed-directory branch reads directly rather
 *     than resolving through Node) — see `e2e.test.ts`'s module doc for the
 *     general rationale.
 *  2. `import.meta.resolve`, which the fix uses to separate resolution from
 *     execution, is not implemented by vitest's `vite-node` SSR module
 *     runner (as of vitest 3.2.4 / vite 7.3.1 — vite's `import.meta.resolve`
 *     module-runner support requires the consumer to opt in via a
 *     `createImportMeta` hook vitest does not yet wire up), so calling it
 *     in-process under vitest throws
 *     `TypeError: __vite_ssr_import_meta__.resolve is not a function`
 *     regardless of correctness. A genuine `node` subprocess has no such
 *     limitation.
 *
 * @see https://nodejs.org/api/esm.html#importmetaresolvespecifier
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const CLI_PACKAGE_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const DIST_INDEX_PATH = join(CLI_PACKAGE_DIR, 'dist', 'index.js')

const FIXTURE_PACKAGE_NAME = 'uat-dev-fallback-broken'
// A real (git-ignored) node_modules directory of this very package, so that
// ordinary Node module resolution — which the fallback path under test
// relies on — genuinely finds this fixture, the same way it would find any
// other dependency declared for `@macts/cli`.
const FIXTURE_PACKAGE_DIR = join(CLI_PACKAGE_DIR, 'node_modules', '@macts', FIXTURE_PACKAGE_NAME)

/**
 * Run `loadPlugin(packageName)` (from the real built `dist/index.js`) in a
 * fresh `node` subprocess, returning its JSON-serialized `LoadPluginResult`.
 */
function loadPluginInSubprocess(packageName: string): {
  success: boolean
  reason?: string
  error?: string
} {
  const script = `
    const mod = await import(${JSON.stringify(pathToFileURL(DIST_INDEX_PATH).href)});
    const result = await mod.loadPlugin(${JSON.stringify(packageName)});
    process.stdout.write(JSON.stringify(result));
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf-8',
  })
  if (result.status !== 0) {
    throw new Error(`subprocess failed: ${result.stderr || result.stdout}`)
  }
  return JSON.parse(result.stdout) as { success: boolean; reason?: string; error?: string }
}

describe('loadPlugin development-mode fallback', () => {
  beforeAll(() => {
    if (!existsSync(DIST_INDEX_PATH)) {
      throw new Error(
        `${DIST_INDEX_PATH} does not exist. Run "pnpm build" in packages/cli (or at the workspace root) before running this test.`
      )
    }

    mkdirSync(join(FIXTURE_PACKAGE_DIR, 'cli'), { recursive: true })
    writeFileSync(
      join(FIXTURE_PACKAGE_DIR, 'package.json'),
      JSON.stringify({
        name: `@macts/${FIXTURE_PACKAGE_NAME}`,
        version: '1.0.0',
        type: 'module',
        exports: { './cli': './cli/index.js' },
      })
    )
    // This package IS genuinely installed and resolvable — the bug is
    // entirely in how the subsequent failure of one of ITS OWN imports gets
    // classified, not in resolving this package itself.
    writeFileSync(
      join(FIXTURE_PACKAGE_DIR, 'cli', 'index.js'),
      [
        "import 'this-inner-dependency-does-not-exist-anywhere'",
        "export const plugin = { name: 'broken', description: 'broken', commands: [] };",
        '',
      ].join('\n')
    )
  })

  afterAll(() => {
    rmSync(FIXTURE_PACKAGE_DIR, { recursive: true, force: true })
  })

  it('classifies a resolvable package whose own import throws ERR_MODULE_NOT_FOUND as load-error, not not-installed', () => {
    const result = loadPluginInSubprocess(`@macts/${FIXTURE_PACKAGE_NAME}`)

    expect(result.success).toBe(false)
    // The package itself resolved fine; the failure originates from
    // executing its code (an inner import it cannot satisfy). That is a
    // load-time break in an installed package, never "not installed".
    expect(result.reason).toBe('load-error')
    expect(result.error).toContain('this-inner-dependency-does-not-exist-anywhere')
  })

  it('classifies a package that genuinely cannot be resolved as not-installed', () => {
    const result = loadPluginInSubprocess('@macts/uat-dev-fallback-does-not-exist-at-all')

    expect(result.success).toBe(false)
    expect(result.reason).toBe('not-installed')
  })
})
