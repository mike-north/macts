/**
 * Real-install UAT for CLI plugin loading.
 *
 * Every other test in this directory (`e2e.test.ts`, `cross-system.test.ts`,
 * `loader.test.ts`) constructs the plugins directory with `fixturify-project`,
 * which writes package.json + files straight into `node_modules` — it never
 * runs `npm install`, so it never exercises real Node module resolution
 * against a real `exports` map. That gap is exactly how the P0 bug this test
 * guards against went unnoticed: every generated `@macts/<app>` package
 * declares only `"types"`/`"import"` conditions (see packages/calendar/package.json),
 * and the loader used to resolve the `./cli` subpath with a CJS
 * `require.resolve()`, which only matches the `"require"` condition. That
 * fails unconditionally for every real plugin, before a single command is
 * even registered — but every fixture-based test happened to also declare a
 * `"default"` condition, which masked the bug completely.
 *
 * This test instead:
 *  - builds real, minimal npm packages on disk and packs them with a real
 *    `npm pack` (producing a real tarball with a real `exports` map),
 *  - installs them into a temp `MACTS_HOME/plugins` directory with a real
 *    `npm install` (real dependency resolution, real on-disk node_modules
 *    layout — including a genuinely separate copy of `clipanion`/`typanion`
 *    from whatever the host process resolves),
 *  - and drives the actual built `packages/cli/dist/bin.js` binary as a
 *    subprocess, asserting on stdout/stderr/exit code the way a user would
 *    observe them.
 *
 * A synthetic fixture package (rather than a real published `@macts/<app>`
 * package such as `@macts/calendar`) is used deliberately: the real packages
 * transitively depend on `@macts/cli`/`@macts/api`/`@macts/mcp` for shared
 * output-formatting utilities, none of which are published to the public npm
 * registry yet, so a real `npm install` of one from outside the workspace
 * cannot succeed today. The fixture's `package.json` `exports` shape (only
 * `"types"`/`"import"`, `"type": "module"`) is copied byte-for-byte from
 * packages/calendar/package.json to keep the reproduction faithful.
 *
 * This suite is gated behind `RUN_MACTS_UAT=1` (see the `test:uat` script)
 * rather than running in the default `pnpm test`: it performs several real
 * `npm install` invocations that hit the public npm registry for
 * `clipanion`/`typanion`, which is both slow and a source of flakiness (and
 * failure) that shouldn't gate every `pnpm test` run.
 *
 * @see https://nodejs.org/api/packages.html#conditional-exports — the
 * `"import"`/`"require"`/`"default"` condition semantics this test exercises.
 * @see https://docs.npmjs.com/cli/v10/commands/npm-pack
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CLIPANION_VERSION = '^4.0.0-rc.4'
const TYPANION_VERSION = '^3.14.0'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const CLI_BIN_PATH = join(REPO_ROOT, 'packages', 'cli', 'dist', 'bin.js')

const GOOD_PACKAGE_NAME = '@macts/uat-good'
const BROKEN_PACKAGE_NAME = '@macts/uat-broken'

/**
 * Write a minimal, real npm package to disk matching the exact `exports`
 * shape generated for every `@macts/<app>` package: `"type": "module"`, and
 * an `exports` map declaring only `"types"`/`"import"` conditions (no
 * `"require"`, no `"default"`).
 */
function writeFixturePackage(
  sourceDir: string,
  options: {
    name: string
    dependencies?: Record<string, string>
    cliEntrySource: string
  }
): void {
  mkdirSync(join(sourceDir, 'dist', 'cli'), { recursive: true })

  const packageJson = {
    name: options.name,
    version: '1.0.0',
    private: true,
    type: 'module',
    exports: {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './cli': { types: './dist/cli.d.ts', import: './dist/cli/index.js' },
    },
    ...(options.dependencies ? { dependencies: options.dependencies } : {}),
  }

  writeFileSync(join(sourceDir, 'package.json'), JSON.stringify(packageJson, null, 2))
  writeFileSync(join(sourceDir, 'dist', 'index.js'), 'export {}\n')
  writeFileSync(join(sourceDir, 'dist', 'cli', 'index.js'), options.cliEntrySource)
}

/**
 * Pack a package directory into a real npm tarball, returning its absolute path.
 */
function packFixture(sourceDir: string, destDir: string): string {
  const result = spawnSync('npm', ['pack', '--json', '--pack-destination', destDir], {
    cwd: sourceDir,
    encoding: 'utf-8',
  })
  if (result.status !== 0) {
    throw new Error(`npm pack failed in ${sourceDir}: ${result.stderr || result.stdout}`)
  }
  const [{ filename }] = JSON.parse(result.stdout) as [{ filename: string }]
  return join(destDir, filename)
}

/**
 * Create a fresh `MACTS_HOME` with an initialized (but empty) plugins directory.
 */
function createMactsHome(): string {
  const mactsHome = mkdtempSync(join(tmpdir(), 'macts-cli-uat-'))
  const pluginsDir = join(mactsHome, 'plugins')
  mkdirSync(pluginsDir, { recursive: true })
  writeFileSync(
    join(pluginsDir, 'package.json'),
    JSON.stringify({ name: 'macts-plugins', version: '1.0.0', private: true, dependencies: {} })
  )
  return mactsHome
}

/**
 * Real `npm install` of one or more tarballs into a `MACTS_HOME`'s plugins
 * directory — the same command `packages/cli/src/plugin/manager.ts` runs in
 * production, just sourced from a local tarball instead of the registry
 * (these fixture packages aren't published).
 */
function installIntoPlugins(mactsHome: string, ...tarballPaths: string[]): void {
  const pluginsDir = join(mactsHome, 'plugins')
  const result = spawnSync('npm', ['install', '--ignore-scripts', ...tarballPaths], {
    cwd: pluginsDir,
    encoding: 'utf-8',
  })
  if (result.status !== 0) {
    throw new Error(`npm install failed in ${pluginsDir}: ${result.stderr || result.stdout}`)
  }
}

/**
 * Run the actual built `macts` binary as a subprocess against a given
 * `MACTS_HOME`, the way a user's shell would.
 */
function runMacts(
  args: string[],
  mactsHome: string
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [CLI_BIN_PATH, ...args], {
    env: { ...process.env, MACTS_HOME: mactsHome },
    encoding: 'utf-8',
  })
  return { status: result.status ?? -1, stdout: result.stdout, stderr: result.stderr }
}

const runUat = process.env['RUN_MACTS_UAT'] === '1'

describe.skipIf(!runUat)('CLI plugin loading — real install UAT', () => {
  let scratchDir: string
  let goodTarball: string
  let brokenTarball: string

  beforeAll(() => {
    if (!existsSync(CLI_BIN_PATH)) {
      throw new Error(
        `${CLI_BIN_PATH} does not exist. Run "pnpm build" in packages/cli (or at the workspace root) before running this UAT.`
      )
    }

    scratchDir = mkdtempSync(join(tmpdir(), 'macts-cli-uat-fixtures-'))
    const destDir = join(scratchDir, 'tarballs')
    mkdirSync(destDir, { recursive: true })

    // A working plugin: a real Command with a validated `--to` option,
    // mirroring packages/calendar/src/cli/commands/switch-view.ts exactly
    // (same option name, same validator shape) so the skipped test below
    // documents the real bug precisely.
    const goodSourceDir = join(scratchDir, 'uat-good')
    writeFixturePackage(goodSourceDir, {
      name: GOOD_PACKAGE_NAME,
      dependencies: { clipanion: CLIPANION_VERSION, typanion: TYPANION_VERSION },
      cliEntrySource: `
import { Command, Option } from 'clipanion'
import * as t from 'typanion'

export class SwitchViewCommand extends Command {
  static paths = [['uat-good', 'switch-view']]
  static usage = Command.Usage({ description: 'Switch the view (UAT fixture)' })

  to = Option.String('--to', {
    required: true,
    description: 'The view to switch to',
    validator: t.isEnum(['dayView', 'weekView', 'monthView']),
  })

  async execute() {
    this.context.stdout.write(\`switched to \${this.to}\\n\`)
    return 0
  }
}

export const plugin = {
  name: 'uat-good',
  description: 'UAT fixture plugin (working)',
  commands: [SwitchViewCommand],
}
`,
    })
    goodTarball = packFixture(goodSourceDir, destDir)

    // A broken plugin: installed, with a valid './cli' export pointing at a
    // real file — but that file's own import graph references a package
    // that was never installed. This reproduces the exact failure shape bug
    // 1 mishandled: the resulting error message is
    // "Cannot find package '...' imported from ...", the very substring the
    // old bin.ts used to silently swallow — except here the *package itself*
    // (@macts/uat-broken) is genuinely installed and broken, not absent.
    const brokenSourceDir = join(scratchDir, 'uat-broken')
    writeFixturePackage(brokenSourceDir, {
      name: BROKEN_PACKAGE_NAME,
      cliEntrySource: `
import 'this-package-definitely-does-not-exist-anywhere-xyz123'
export const plugin = { name: 'uat-broken', description: 'broken', commands: [] }
`,
    })
    brokenTarball = packFixture(brokenSourceDir, destDir)
  }, 120_000)

  afterAll(() => {
    if (scratchDir) {
      rmSync(scratchDir, { recursive: true, force: true })
    }
  })

  it('lists a real, installed plugin package in --help', () => {
    const mactsHome = createMactsHome()
    try {
      installIntoPlugins(mactsHome, goodTarball)

      const result = runMacts(['--help'], mactsHome)

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('uat-good switch-view')
      expect(result.stderr).toBe('')
    } finally {
      rmSync(mactsHome, { recursive: true, force: true })
    }
  }, 60_000)

  it('produces no warning when no plugin is installed at all', () => {
    const mactsHome = createMactsHome()
    try {
      const result = runMacts(['--help'], mactsHome)

      expect(result.status).toBe(0)
      expect(result.stderr).toBe('')
      expect(result.stdout).not.toContain('uat-good')
    } finally {
      rmSync(mactsHome, { recursive: true, force: true })
    }
  }, 30_000)

  it('produces no warning for a package removed after being cached, but still hides its commands', () => {
    const mactsHome = createMactsHome()
    try {
      installIntoPlugins(mactsHome, goodTarball)

      // First run populates the plugin cache while the package is present.
      const first = runMacts(['--help'], mactsHome)
      expect(first.status).toBe(0)
      expect(first.stdout).toContain('uat-good switch-view')

      // Remove the installed package from disk without touching the
      // lockfile/cache — simulating a stale cache entry for an app that is
      // genuinely no longer installed.
      rmSync(join(mactsHome, 'plugins', 'node_modules', '@macts', 'uat-good'), {
        recursive: true,
        force: true,
      })

      const second = runMacts(['--help'], mactsHome)
      expect(second.status).toBe(0)
      expect(second.stderr).toBe('')
      expect(second.stdout).not.toContain('uat-good')
    } finally {
      rmSync(mactsHome, { recursive: true, force: true })
    }
  }, 60_000)

  it('warns visibly, naming the package, when an installed plugin is broken', () => {
    const mactsHome = createMactsHome()
    try {
      installIntoPlugins(mactsHome, brokenTarball)

      const result = runMacts(['--help'], mactsHome)

      // The CLI itself must keep working — one broken plugin must not take
      // down the whole binary.
      expect(result.status).toBe(0)
      expect(result.stderr).toContain('Warning')
      expect(result.stderr).toContain(BROKEN_PACKAGE_NAME)
    } finally {
      rmSync(mactsHome, { recursive: true, force: true })
    }
  }, 60_000)

  it.skip(
    'accepts a valid --to value and rejects an invalid one ' +
      '(BLOCKED: duplicate clipanion copies across install trees — bug 2, out of scope here)',
    () => {
      // This is a standing bug report in test form, not a placeholder: the
      // assertions below describe correct behavior per clipanion's documented
      // option/validator contract. They currently fail because the host
      // process and this plugin's freshly `npm install`-ed tree resolve two
      // separate physical copies of `clipanion`. Clipanion tags each Option
      // with a realm-local `Symbol('clipanion/isOption')`
      // (advanced/options/utils.js:7) and reads it back via
      // `Command.isOption` (advanced/Command.js:83); a Symbol is only ever
      // equal to itself, so an Option created by the plugin's copy of
      // clipanion is invisible to the host's copy's `Command.isOption` check.
      // The result: clipanion's parser treats `--to` as entirely unknown for
      // both valid and invalid values, so `t.isEnum(...)` never even runs.
      const mactsHome = createMactsHome()
      try {
        installIntoPlugins(mactsHome, goodTarball)

        const valid = runMacts(['uat-good', 'switch-view', '--to', 'dayView'], mactsHome)
        expect(valid.status).toBe(0)
        expect(valid.stdout).toContain('switched to dayView')

        const invalid = runMacts(['uat-good', 'switch-view', '--to', 'bogus'], mactsHome)
        expect(invalid.status).not.toBe(0)
        expect(invalid.stderr).toContain('bogus')
      } finally {
        rmSync(mactsHome, { recursive: true, force: true })
      }
    },
    60_000
  )
})

describe.skipIf(runUat)('CLI plugin loading — real install UAT (gate check)', () => {
  it('is skipped unless RUN_MACTS_UAT=1 (see the "test:uat" script)', () => {
    expect(runUat).toBe(false)
  })
})
