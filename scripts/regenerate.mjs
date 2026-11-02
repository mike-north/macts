/**
 * Regenerate every generated package from its manifest.
 *
 * For each `manifests/<app>/app.yaml`, runs the macts generator
 * (`--target all`) to produce the client (`packages/<app>`) and server
 * (`packages/<app>-server`) packages, then formats the whole repo with
 * Prettier so the on-disk output matches the committed (formatted) style.
 *
 * This is the single source of truth for "regenerate all artifacts". It is
 * wired into CI as `pnpm generate:check`, which then runs
 * `scripts/check-clean-tree.mjs packages`: any modified, deleted or untracked
 * file under `packages/` fails the check, so committed generated files can
 * never drift from the generator again.
 *
 * The generator owns its output (see `packages/core/src/generator/owned-output.ts`):
 * each package's `.macts-generated.json` records what a run emitted, and a file
 * an earlier run emitted that this run does not is deleted. The CLI's report of
 * those deletions, and of a package whose previous set came from generated
 * headers because it had no record yet, is passed through on stdout.
 *
 * The CLI must be built first (`pnpm build`) — this script invokes the compiled
 * binary at `packages/cli/dist/bin.js`.
 *
 * Generation diagnostics (manifest types the contract describes as `unknown`)
 * are passed through on stderr as the CLI prints them, and the script ends
 * with their total across apps. They do not fail regeneration.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestsDir = join(repoRoot, 'manifests')
const packagesDir = join(repoRoot, 'packages')
const cliBin = join(repoRoot, 'packages', 'cli', 'dist', 'bin.js')

if (!existsSync(cliBin)) {
  console.error(`CLI binary not found at ${cliBin}. Run "pnpm build" first.`)
  process.exit(1)
}

// Under Changesets fixed-versioning, every @macts/* package always shares one
// version. packages/core/package.json is the single source of truth for it —
// read it here so every generated package.json carries the real, current
// version instead of drifting back to the generator's "0.0.0" default on
// every regeneration.
const corePackageJsonPath = join(packagesDir, 'core', 'package.json')
if (!existsSync(corePackageJsonPath)) {
  console.error(`${corePackageJsonPath} not found; cannot determine the workspace version.`)
  process.exit(1)
}
let corePackageJson
try {
  corePackageJson = JSON.parse(readFileSync(corePackageJsonPath, 'utf-8'))
} catch (error) {
  console.error(`Could not parse ${corePackageJsonPath}: ${String(error)}`)
  process.exit(1)
}
const version = corePackageJson.version
if (typeof version !== 'string' || version.length === 0) {
  console.error(`Could not read a valid "version" from ${corePackageJsonPath}.`)
  process.exit(1)
}

/** Discover every app that has a manifest, sorted for deterministic output. */
function discoverManifestApps() {
  return readdirSync(manifestsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(manifestsDir, name, 'app.yaml')))
    .sort()
}

/**
 * The prefix of each diagnostic line the CLI writes to stderr; see
 * `GENERATION_WARNING_PREFIX` in `packages/cli/src/commands/generate.ts`.
 */
const WARNING_PREFIX = 'warning: '

/**
 * The prefixes of the CLI's stdout lines that report owned-output changes; see
 * `PRUNED_FILE_PREFIX` and `BOOTSTRAP_REPORT_PREFIX` in
 * `packages/cli/src/commands/generate.ts`. Every other stdout line is dropped.
 */
const OWNED_OUTPUT_REPORT_PREFIXES = ['pruned ', 'bootstrapped owned-output set from headers: ']

const apps = discoverManifestApps()
console.log(`Regenerating ${String(apps.length)} app(s) from manifests...`)

let diagnosticCount = 0
for (const app of apps) {
  const manifestPath = join(manifestsDir, app, 'app.yaml')
  console.log(`  - ${app}`)
  // stderr is captured, then passed through unchanged, so its warnings can be
  // counted; of stdout, only the owned-output report is passed through.
  const run = spawnSync(
    process.execPath,
    [
      cliBin,
      'generate',
      manifestPath,
      '--out-dir',
      packagesDir,
      '--target',
      'all',
      '--version',
      version,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8' }
  )
  if (run.error !== undefined) throw run.error
  for (const line of run.stdout.split('\n')) {
    if (OWNED_OUTPUT_REPORT_PREFIXES.some((prefix) => line.startsWith(prefix))) {
      console.log(`      ${line.replaceAll(`${repoRoot}/`, '')}`)
    }
  }
  process.stderr.write(run.stderr)
  if (run.status !== 0) {
    console.error(`Generating ${app} failed (exit status ${String(run.status)}).`)
    process.exit(run.status ?? 1)
  }
  diagnosticCount += run.stderr.split('\n').filter((line) => line.startsWith(WARNING_PREFIX)).length
}

console.log('Formatting generated output with Prettier...')
execFileSync('pnpm', ['exec', 'prettier', '--write', '--log-level', 'warn', 'packages'], {
  cwd: repoRoot,
  stdio: 'inherit',
})

console.log(
  `Regeneration complete: ${String(diagnosticCount)} generation diagnostic(s) across apps.`
)
