/**
 * Regenerate the API reference pages under `docs/` from the API Extractor
 * doc models of every entry point in the workspace.
 *
 * Entry points. A package publishes one entry point per subpath in its
 * `exports` (`@macts/sdk` and `@macts/sdk/local`, `@macts/arc` and
 * `@macts/arc/contract`, ...). Each has its own API Extractor config in the
 * package directory (`api-extractor.json` for the root, `api-extractor.*.json`
 * for a subpath), its own API report and its own doc model. A config's
 * `mainEntryPointFilePath` names the declarations of the module a subpath
 * loads, so the script matches it against the `exports` targets to learn the
 * subpath's import path. A config that writes an API report must also write a
 * doc model, so every reported entry point gets pages; a config that matches
 * no `exports` subpath, or a missing doc model, ends the run.
 *
 * Page identity. `api-documenter` renders one package per doc model, names
 * pages after the package (`sdk.createclient.md`), and only reads a model's
 * first entry point, so a subpath model cannot share its package's identity
 * without its pages colliding with the root entry's. Each subpath model is
 * therefore given a distinct identity before documenting: `@macts/sdk/local`
 * becomes `@macts/sdk_local` (pages `sdk_local.*.md`; `_` never occurs in a
 * package name here, so these cannot collide with another package), and the
 * references to its own exports are renamed with it so links stay within the
 * entry point. After documenting, that identity is replaced in the pages by
 * the real import path, which is what readers import.
 *
 * Output. `api-documenter` empties its output folder on every run, so `docs/`
 * always holds exactly the documented models. The models it reads are staged
 * in the root `temp/`, which this script resets first: a model left there by
 * an earlier run, for a package or entry point that no longer exists, would
 * otherwise come back as pages.
 *
 * The pages are formatted with the repository's Prettier configuration, as
 * every committed file is, so the regenerated output matches the committed
 * pages byte for byte and `pnpm format:check` passes on it.
 *
 * The command-line (`cli`) and MCP (`mcp`) packages are not part of the
 * library reference and are left out.
 *
 * Every entry point must have produced its doc model before this script runs
 * (`pnpm api-extractor`). A missing model ends the run before anything is
 * deleted, instead of silently dropping that entry point's pages, because a
 * partial `docs/` is indistinguishable from a deliberate removal.
 *
 * Page names. `api-documenter` lowercases page file names, so members whose
 * names differ only in case would share a page. The script gives each its own,
 * by a deterministic rule that leaves every other page's name unchanged; see
 * `documentWithDistinctPageNames`.
 *
 * Usage: `node scripts/generate-api-docs.mjs [--root <dir>]`. `--root` selects
 * the workspace to read and write (default: this repository); any other
 * argument is a usage error. `api-documenter` always comes from this
 * repository.
 *
 * Exit status: 0 on success, 1 when an entry point cannot be documented or
 * generation fails, 2 on a usage error.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { ExtractorConfig } = createRequire(join(toolRoot, 'package.json'))(
  '@microsoft/api-extractor'
)

/**
 * The command line: nothing, or exactly `--root <dir>`. Anything else (an
 * unknown flag, `--root=<dir>`, a missing or empty directory) is a usage error
 * reported before anything is read or written, so a mistyped root can never
 * fall back to regenerating this repository's own `docs/`.
 */
function parseRoot(args) {
  if (args.length === 0) return toolRoot
  const [flag, value] = args
  if (args.length === 2 && flag === '--root' && value !== '' && !value.startsWith('--')) {
    return resolve(value)
  }
  console.error('Usage: node scripts/generate-api-docs.mjs [--root <dir>]')
  console.error(`Unexpected arguments: ${args.join(' ')}`)
  process.exit(2)
}
const root = parseRoot(process.argv.slice(2))

/** Packages whose doc models are not published as library reference pages. */
const EXCLUDED_FROM_DOCS = new Set(['cli', 'mcp'])

const packagesDir = join(root, 'packages')
const modelsDir = join(root, 'temp')
const docsDir = join(root, 'docs')

/** The unscoped package name API Extractor uses to name a doc model. */
function unscopedName(packageName) {
  return packageName.replace(/^@[^/]+\//, '')
}

/** Expand the API Extractor path tokens this workspace's configs use. */
function expandTokens(value, packageDir, packageName) {
  return resolve(
    value
      .replaceAll('<projectFolder>', packageDir)
      .replaceAll('<unscopedPackageName>', unscopedName(packageName))
      .replaceAll('<packageName>', packageName)
  )
}

/** The runtime module a conditional or plain `exports` target loads. */
function exportTarget(target) {
  if (typeof target === 'string') return target
  if (target === null || typeof target !== 'object') return undefined
  return exportTarget(target.import ?? target.default)
}

/**
 * The `exports` subpath (`.`, `./local`, ...) whose module the declarations at
 * `entryPath` describe: `dist/local.d.ts` describes `./dist/local.js`. A
 * package without `exports` has only its root, the module `main` names.
 */
function subpathFor(entryPath, packageDir, manifest) {
  const declared = relative(packageDir, entryPath).replace(/\.d\.([cm]?)ts$/, '.$1js')
  const exportsField = manifest.exports ?? manifest.main
  const subpaths = typeof exportsField === 'string' ? { '.': exportsField } : (exportsField ?? {})
  for (const [subpath, target] of Object.entries(subpaths)) {
    const module = exportTarget(target)
    if (module !== undefined && relative(packageDir, join(packageDir, module)) === declared)
      return subpath
  }
  return undefined
}

/** One entry point to document: its doc model and the identity its pages carry. */
const entryPoints = []
const problems = []
const missing = []
for (const entry of readdirSync(packagesDir, { withFileTypes: true }).sort((a, b) =>
  a.name.localeCompare(b.name)
)) {
  if (!entry.isDirectory()) continue
  const packageDir = join(packagesDir, entry.name)
  const manifestPath = join(packageDir, 'package.json')
  if (!existsSync(manifestPath)) continue
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  if (manifest.scripts?.['api-extractor'] === undefined) continue
  if (EXCLUDED_FROM_DOCS.has(unscopedName(manifest.name))) continue
  const configs = readdirSync(packageDir)
    .filter((file) => /^api-extractor(\.[^.]+)?\.json$/.test(file))
    .sort()
  for (const configFile of configs) {
    const configPath = join(packageDir, configFile)
    let config
    try {
      config = ExtractorConfig.loadFile(configPath)
    } catch (error) {
      problems.push(`${configPath}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (config.docModel?.enabled !== true) {
      if (config.apiReport?.enabled === true) {
        problems.push(
          `${configPath}: writes an API report but no doc model, so its entry point would have no pages`
        )
      }
      continue
    }
    const entryPath = expandTokens(config.mainEntryPointFilePath, packageDir, manifest.name)
    const subpath = subpathFor(entryPath, packageDir, manifest)
    if (subpath === undefined) {
      problems.push(`${configPath}: its entry point matches no subpath in the package's "exports"`)
      continue
    }
    const model = expandTokens(config.docModel.apiJsonFilePath, packageDir, manifest.name)
    if (!existsSync(model)) {
      missing.push(model)
      continue
    }
    const importPath = subpath === '.' ? manifest.name : `${manifest.name}/${subpath.slice(2)}`
    const identity =
      subpath === '.' ? manifest.name : `${manifest.name}_${subpath.slice(2).replaceAll('/', '_')}`
    entryPoints.push({ packageName: manifest.name, importPath, identity, model })
  }
}

const identities = new Map()
for (const { identity, importPath } of entryPoints) {
  const pageName = unscopedName(identity)
  if (identities.has(pageName)) {
    problems.push(
      `${importPath} and ${identities.get(pageName)} would both be documented as "${pageName}"`
    )
  }
  identities.set(pageName, importPath)
}

if (missing.length > 0) {
  console.error('Missing API Extractor doc models; run `pnpm api-extractor` first:')
  for (const path of missing) console.error(`  ${path}`)
}
for (const problem of problems) console.error(problem)
if (missing.length > 0 || problems.length > 0) process.exit(1)

/**
 * A subpath doc model under its own identity. Every reference API Extractor
 * wrote as `<package>!<name>` for one of this entry point's exports is renamed
 * with it; references to other entry points keep pointing at them.
 */
function withIdentity(model, packageName, identity) {
  const exported = new Set((model.members?.[0]?.members ?? []).map((member) => member.name))
  const prefix = `${packageName}!`
  const rename = (reference) => {
    if (!reference.startsWith(prefix)) return reference
    const name = /^[^:.#]*/.exec(reference.slice(prefix.length))?.[0] ?? ''
    return exported.has(name) ? `${identity}!${reference.slice(prefix.length)}` : reference
  }
  const visit = (node) => {
    if (Array.isArray(node)) return node.map(visit)
    if (node === null || typeof node !== 'object') return node
    const copy = {}
    for (const [key, value] of Object.entries(node)) {
      copy[key] =
        key === 'canonicalReference' && typeof value === 'string' ? rename(value) : visit(value)
    }
    return copy
  }
  return { ...visit(model), name: identity, canonicalReference: `${identity}!` }
}

rmSync(modelsDir, { recursive: true, force: true })
mkdirSync(modelsDir, { recursive: true })
for (const { packageName, identity, model } of entryPoints) {
  const parsed = JSON.parse(readFileSync(model, 'utf-8'))
  const staged = identity === packageName ? parsed : withIdentity(parsed, packageName, identity)
  writeFileSync(join(modelsDir, `${unscopedName(identity)}.api.json`), JSON.stringify(staged))
}

/**
 * Page file names that stay distinct when member names differ only in case.
 *
 * `api-documenter` names a page after the path of names leading to its item
 * (`core.coarsepermission.md`), each name lowercased with characters a file
 * name cannot hold replaced by `_`. Two siblings whose names differ only in
 * case, such as the function `coarsePermission` and the interface
 * `CoarsePermission`, therefore get the same file: the page written last
 * replaces the other, and every link to either opens it.
 *
 * The rule: among the members of one container (an entry point, interface,
 * class, namespace, ...), the distinct names that map to the same file name
 * segment are ordered by UTF-16 code unit (`CoarsePermission` before
 * `coarsePermission`). The first keeps the plain segment; the n-th has `-n`
 * appended (`core.coarsepermission-2.md`). `-` never occurs in a segment
 * derived from a TypeScript identifier, so a suffixed name cannot meet another
 * member's. A member whose segment no sibling shares keeps the name
 * `api-documenter` gives it, so adding or removing an unrelated export moves
 * no page. The segment carries over to the pages of the member's own members.
 *
 * `api-documenter` computes every page file and every link to a page through
 * one method, so replacing that method keeps each link pointed at its page.
 * The method is not public API; if it is missing, the run fails instead of
 * silently writing colliding pages.
 */
function documentWithDistinctPageNames(inputFolder, outputFolder) {
  // The documenter's own dependencies, so the model classes are the ones it uses.
  const requireTool = createRequire(
    createRequire(join(toolRoot, 'package.json')).resolve('@microsoft/api-documenter/package.json')
  )
  const { MarkdownDocumenter } = requireTool(
    './lib/documenters/MarkdownDocumenter'
  )
  const { Utilities } = requireTool('./lib/utils/Utilities')
  const { ApiDocumenterCommandLine } = requireTool(
    './lib/cli/ApiDocumenterCommandLine'
  )
  const { ApiItemKind, ApiParameterListMixin } = requireTool('@microsoft/api-extractor-model')
  const { PackageName } = requireTool('@rushstack/node-core-library')
  if (typeof MarkdownDocumenter.prototype._getFilenameForApiItem !== 'function') {
    throw new Error('this api-documenter version no longer names pages through _getFilenameForApiItem')
  }

  const safeName = (name) => Utilities.getSafeFilenameForName(name)
  /** The file name segment of one item: its safe name, made distinct from its siblings'. */
  const segment = (item) => {
    const own = safeName(item.displayName)
    const spellings = [
      ...new Set(
        (item.parent?.members ?? [])
          .map((sibling) => sibling.displayName)
          .filter((name) => safeName(name) === own)
      ),
    ].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    const rank = spellings.indexOf(item.displayName)
    return rank > 0 ? `${own}-${String(rank + 1)}` : own
  }
  MarkdownDocumenter.prototype._getFilenameForApiItem = function (apiItem) {
    if (apiItem.kind === ApiItemKind.Model) return 'index.md'
    let baseName = ''
    for (const item of apiItem.getHierarchy()) {
      switch (item.kind) {
        case ApiItemKind.Model:
        case ApiItemKind.EntryPoint:
        case ApiItemKind.EnumMember:
          break
        case ApiItemKind.Package:
          baseName = safeName(PackageName.getUnscopedName(item.displayName))
          break
        default: {
          let name = segment(item)
          // Overloads share a name; `api-documenter` numbers all but the first.
          if (ApiParameterListMixin.isBaseClassOf(item) && item.overloadIndex > 1) {
            name += `_${String(item.overloadIndex - 1)}`
          }
          baseName += `.${name}`
        }
      }
    }
    return `${baseName}.md`
  }

  return new ApiDocumenterCommandLine().executeAsync([
    'markdown',
    '-i',
    inputFolder,
    '-o',
    outputFolder,
  ])
}

let documented
try {
  documented = await documentWithDistinctPageNames(modelsDir, docsDir)
} catch (error) {
  console.error(`api-documenter failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
if (!documented) {
  console.error('api-documenter failed')
  process.exit(1)
}

/**
 * Present each subpath under its import path instead of its page identity.
 * `api-documenter` writes markdown, so the identity can appear with its
 * punctuation escaped (`@macts/sdk\_local`), and its lines end in CRLF until
 * Prettier normalizes them.
 */
const subpathEntries = entryPoints.filter(({ identity, packageName }) => identity !== packageName)
if (subpathEntries.length > 0) {
  /** A pattern for `text` as markdown may render it, each punctuation mark optionally escaped. */
  const markdownPattern = (text) =>
    [...text].map((char) => (/[A-Za-z0-9]/.test(char) ? char : `\\\\?\\${char}`)).join('')
  const replacements = subpathEntries.map(({ identity, importPath }) => ({
    heading: new RegExp(`^## ${markdownPattern(unscopedName(identity))} package(?=\\r?$)`, 'gm'),
    headingText: `## ${importPath} entry point`,
    name: new RegExp(`${markdownPattern(identity)}(?![\\w.-])`, 'g'),
    importPath,
  }))
  for (const page of readdirSync(docsDir)) {
    const path = join(docsDir, page)
    const content = readFileSync(path, 'utf-8')
    let next = content
    for (const { heading, headingText, name, importPath } of replacements) {
      next = next.replace(heading, () => headingText).replace(name, () => importPath)
    }
    if (next !== content) writeFileSync(path, next)
  }
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
