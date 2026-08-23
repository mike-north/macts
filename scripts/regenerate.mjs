/**
 * Regenerate every generated package from its manifest.
 *
 * For each `manifests/<app>/app.yaml`, runs the macts generator
 * (`--target all`) to produce the client (`packages/<app>`) and server
 * (`packages/<app>-server`) packages, then formats the whole repo with
 * Prettier so the on-disk output matches the committed (formatted) style.
 *
 * This is the single source of truth for "regenerate all artifacts". It is
 * wired into CI behind a `git diff --exit-code` idempotence guard so committed
 * generated files can never drift from the generator again.
 *
 * The CLI must be built first (`pnpm build`) — this script invokes the compiled
 * binary at `packages/cli/dist/bin.js`.
 */

import { execFileSync } from 'node:child_process'
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
const corePackageJson = JSON.parse(readFileSync(corePackageJsonPath, 'utf-8'))
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

const apps = discoverManifestApps()
console.log(`Regenerating ${String(apps.length)} app(s) from manifests...`)

for (const app of apps) {
  const manifestPath = join(manifestsDir, app, 'app.yaml')
  console.log(`  - ${app}`)
  execFileSync(
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
    { stdio: ['ignore', 'ignore', 'inherit'] }
  )
}

console.log('Formatting generated output with Prettier...')
execFileSync('pnpm', ['exec', 'prettier', '--write', '--log-level', 'warn', 'packages'], {
  cwd: repoRoot,
  stdio: 'inherit',
})

console.log('Regeneration complete.')
