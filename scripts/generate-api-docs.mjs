/**
 * Regenerate the API reference pages under `docs/` from the API Extractor
 * doc models (`packages/<name>/temp/<name>.api.json`).
 *
 * `docs/` is wholly generated: a run replaces it. `api-documenter` only adds
 * and overwrites pages, so a page for an API that no longer exists would
 * survive a plain run; this script removes the previous output first, which is
 * what makes the committed pages exactly the current public API.
 *
 * The pages are formatted with the repository's Prettier configuration, as
 * every committed file is, so the regenerated output matches the committed
 * pages byte for byte and `pnpm format:check` passes on it.
 *
 * The command-line (`cli`) and MCP (`mcp`) packages are not part of the
 * library reference and are left out.
 *
 * Every package that runs API Extractor must have produced its doc model
 * before this script runs (`pnpm api-extractor`). A missing model ends the run
 * instead of silently dropping that package's pages, because a partial `docs/`
 * is indistinguishable from a deliberate removal.
 *
 * Usage: `node scripts/generate-api-docs.mjs [--root <dir>]`. `--root` selects
 * the workspace to read and write (default: this repository); the
 * `api-documenter` binary always comes from this repository.
 *
 * Exit status: 0 on success, 1 when a doc model is missing or generation fails.
 */

import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const rootFlag = args.indexOf('--root')
const root = rootFlag === -1 ? toolRoot : resolve(args[rootFlag + 1] ?? '')

/** Packages whose doc models are not published as library reference pages. */
const EXCLUDED_FROM_DOCS = new Set(['cli', 'mcp'])

const packagesDir = join(root, 'packages')
const modelsDir = join(root, 'temp')
const docsDir = join(root, 'docs')

/** The unscoped package name API Extractor uses to name a doc model. */
function unscopedName(packageName) {
  return packageName.replace(/^@[^/]+\//, '')
}

const models = []
const missing = []
for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const manifestPath = join(packagesDir, entry.name, 'package.json')
  if (!existsSync(manifestPath)) continue
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  if (manifest.scripts?.['api-extractor'] === undefined) continue
  const name = unscopedName(manifest.name)
  const model = join(packagesDir, entry.name, 'temp', `${name}.api.json`)
  if (existsSync(model)) models.push({ name, model })
  else missing.push(model)
}

if (missing.length > 0) {
  console.error('Missing API Extractor doc models; run `pnpm api-extractor` first:')
  for (const path of missing) console.error(`  ${path}`)
  process.exit(1)
}

rmSync(modelsDir, { recursive: true, force: true })
rmSync(docsDir, { recursive: true, force: true })
mkdirSync(modelsDir, { recursive: true })
for (const { name, model } of models) {
  if (!EXCLUDED_FROM_DOCS.has(name)) copyFileSync(model, join(modelsDir, `${name}.api.json`))
}

const run = spawnSync(
  join(toolRoot, 'node_modules', '.bin', 'api-documenter'),
  ['markdown', '-i', modelsDir, '-o', docsDir],
  { cwd: root, stdio: 'inherit' }
)
if (run.error !== undefined || run.status !== 0) {
  console.error(`api-documenter failed: ${run.error?.message ?? `exit ${String(run.status)}`}`)
  process.exit(1)
}

const format = spawnSync(
  join(toolRoot, 'node_modules', '.bin', 'prettier'),
  ['--config', join(toolRoot, 'prettier.config.js'), '--log-level', 'warn', '--write', docsDir],
  { cwd: root, stdio: 'inherit' }
)
if (format.error !== undefined || format.status !== 0) {
  console.error(`prettier failed: ${format.error?.message ?? `exit ${String(format.status)}`}`)
  process.exit(1)
}
