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
 * Output. A complete reference is generated beside `docs/` and replaces it
 * only after documentation and formatting succeed. The models it reads are staged
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
 * Page names. `api-documenter` lowercases page file names and names a page
 * after its member's name alone, so members whose names differ only in case,
 * and declarations that share one name (a class and an interface, a constant
 * and a type), would share a page. The script gives each its own, by a
 * deterministic rule that leaves every other page's name unchanged; see
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
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, relative, resolve } from 'node:path'
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
    entryPoints.push({
      packageName: manifest.name,
      importPath,
      identity,
      model,
      packageDir,
      entryPath,
    })
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
if (entryPoints.length === 0) {
  console.error('no entry points to document')
  process.exit(1)
}

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
 * Page file names that stay distinct when member names differ only in case or
 * one name is declared more than once.
 *
 * `api-documenter` names a page after the path of names leading to its item
 * (`core.coarsepermission.md`), each name lowercased with characters a file
 * name cannot hold replaced by `_`. Two different members can therefore get
 * the same file: the page written last replaces the other, and every link to
 * either opens it. That happens when
 * - two siblings' names differ only in case, such as the function
 *   `coarsePermission` and the interface `CoarsePermission`;
 * - one name has several declarations of different kinds that TypeScript
 *   merges, such as the class and the interface `ArcClient`, or the constant
 *   and the type `Integer`. API Extractor documents each declaration.
 *
 * The rule, applied among the members of one container (an entry point,
 * interface, class, namespace, ...), to the segment of a member's own name:
 * 1. Case. The distinct names that map to the same segment are ordered by
 *    UTF-16 code unit (`CoarsePermission` before `coarsePermission`). The
 *    first keeps the plain segment; the n-th has `-n` appended
 *    (`core.coarsepermission-2.md`).
 * 2. Kind. Among the siblings with exactly the same name, the value-side
 *    declaration (class, enum, function, variable, then namespace, in that
 *    order) keeps the segment; each other kind, normally the type-side
 *    interface or type alias, has `-<kind>` appended, the kind word the page's
 *    heading uses (`arc.arcclient-interface.md`, `contracts.integer-type.md`).
 *    This follows the case suffix (`count-2-type`).
 * 3. Static members have `-static` appended to distinguish them from
 *    instance members of the same name and kind.
 * 4. Overloads keep `api-documenter`'s numbering: every overload after the
 *    first has `_<n - 1>` appended.
 *
 * An instance member whose name and kind no sibling shares keeps the name
 * `api-documenter` gives it, so adding or removing an unrelated export moves
 * no page. The segment carries over to the pages of the member's own members.
 *
 * The suffixes cannot make one sibling's segment equal another's: a segment
 * derived from a TypeScript identifier holds no `-`, and API Extractor keeps
 * the quotes of a string-literal member name (`"content-type"`), which become
 * `_`, so a plain segment that holds `-` ends in `_`, which no suffix does.
 * `api-documenter`'s overload numbering can still meet a sibling's own name
 * (the second overload of `make` and a function `make_1`), and other
 * characters it replaces can make two paths meet, so every page file is also
 * checked to belong to one item only: a second item ends the run instead of
 * replacing a page.
 *
 * `api-documenter` computes every page file and every link to a page through
 * one method, so replacing that method keeps each link pointed at its page.
 * The method is not public API; the run checks each page write and link
 * against the replacement so an incompatible documenter fails closed. For
 * that reason `@microsoft/api-documenter` is pinned to an exact version in the
 * root `package.json` (a manifest cannot hold comments): a release that renamed
 * or stopped using the method would otherwise arrive with a routine install.
 */
async function documentWithDistinctPageNames(inputFolder, outputFolder) {
  // The documenter's own dependencies, so the model classes are the ones it uses.
  const requireTool = createRequire(
    createRequire(join(toolRoot, 'package.json')).resolve('@microsoft/api-documenter/package.json')
  )
  const { MarkdownDocumenter } = requireTool('./lib/documenters/MarkdownDocumenter')
  const { Utilities } = requireTool('./lib/utils/Utilities')
  const { ApiDocumenterCommandLine } = requireTool('./lib/cli/ApiDocumenterCommandLine')
  const { ApiItemKind, ApiParameterListMixin } = requireTool('@microsoft/api-extractor-model')
  const { PackageName, FileSystem } = requireTool('@rushstack/node-core-library')
  if (typeof MarkdownDocumenter.prototype._getFilenameForApiItem !== 'function') {
    throw new Error(
      'this api-documenter version no longer names pages through _getFilenameForApiItem'
    )
  }

  /**
   * The kinds that keep the plain segment when one name is declared as several,
   * first preferred, and the word each kind's page heading uses.
   */
  const KIND_ORDER = [
    ApiItemKind.Class,
    ApiItemKind.Enum,
    ApiItemKind.Function,
    ApiItemKind.Variable,
    ApiItemKind.Namespace,
    ApiItemKind.Interface,
    ApiItemKind.TypeAlias,
  ]
  const KIND_WORDS = {
    [ApiItemKind.Class]: 'class',
    [ApiItemKind.Enum]: 'enum',
    [ApiItemKind.Function]: 'function',
    [ApiItemKind.Variable]: 'variable',
    [ApiItemKind.Namespace]: 'namespace',
    [ApiItemKind.Interface]: 'interface',
    [ApiItemKind.TypeAlias]: 'type',
  }
  const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
  const kindRank = (kind) => {
    const rank = KIND_ORDER.indexOf(kind)
    return rank === -1 ? KIND_ORDER.length : rank
  }

  const safeName = (name) => Utilities.getSafeFilenameForName(name)
  /** The file name segment of one item: its safe name, made distinct from its siblings'. */
  const segment = (item) => {
    const siblings = item.parent?.members ?? []
    const own = safeName(item.displayName)
    const spellings = [
      ...new Set(
        siblings.map((sibling) => sibling.displayName).filter((name) => safeName(name) === own)
      ),
    ].sort(byCodeUnit)
    const rank = spellings.indexOf(item.displayName)
    const kinds = [
      ...new Set(
        siblings
          .filter((sibling) => sibling.displayName === item.displayName)
          .map((sibling) => sibling.kind)
      ),
    ].sort((a, b) => kindRank(a) - kindRank(b) || byCodeUnit(a, b))
    const caseSuffix = rank > 0 ? `-${String(rank + 1)}` : ''
    const kindSuffix =
      kinds.indexOf(item.kind) > 0 ? `-${KIND_WORDS[item.kind] ?? item.kind.toLowerCase()}` : ''
    const staticSuffix = item.isStatic ? '-static' : ''
    return `${own}${caseSuffix}${kindSuffix}${staticSuffix}`
  }
  /** The item each page file was given to, so no file is given to two. */
  const owners = new Map()
  // Destinations named while rendering each page, including repeated links.
  const pageLinks = new Map()
  // A page can recursively write child pages while rendering; keep each
  // write paired with the filename requested for that specific item.
  let namingLink = false
  let frame
  const writePage = MarkdownDocumenter.prototype._writeApiItemPage
  MarkdownDocumenter.prototype._writeApiItemPage = function (item) {
    const parent = frame
    frame = { item, name: undefined, links: [] }
    try {
      return writePage.call(this, item)
    } finally {
      frame = parent
    }
  }
  const writeFile = FileSystem.writeFile
  FileSystem.writeFile = function (path, ...args) {
    if (dirname(path) === outputFolder && (frame === undefined || frame.name !== basename(path))) {
      throw new Error(
        `api-documenter did not name ${basename(path)} through the replaced _getFilenameForApiItem`
      )
    }
    if (dirname(path) === outputFolder) pageLinks.set(basename(path), frame.links)
    return writeFile.call(this, path, ...args)
  }
  // Links must also obtain their destination through the replacement, even
  // when the documenter changes how it renders a page.
  const linkFilename = MarkdownDocumenter.prototype._getLinkFilenameForApiItem
  let calls = 0
  MarkdownDocumenter.prototype._getLinkFilenameForApiItem = function (item) {
    const before = calls
    namingLink = true
    let link
    try {
      link = linkFilename.call(this, item)
    } finally {
      namingLink = false
    }
    if (calls !== before + 1 || link !== `./${lastName}`) {
      throw new Error(
        'api-documenter did not name a link through the replaced _getFilenameForApiItem'
      )
    }
    if (frame === undefined) throw new Error(`link ${link} was named outside a page`)
    frame.links.push(link)
    return link
  }
  let lastName

  MarkdownDocumenter.prototype._getFilenameForApiItem = function (apiItem) {
    calls++
    if (apiItem.kind === ApiItemKind.Model) {
      const previous = owners.get('index.md')
      if (previous !== undefined && previous !== apiItem)
        throw new Error('multiple items would be written to index.md')
      owners.set('index.md', apiItem)
      if (!namingLink && frame?.item === apiItem) frame.name = 'index.md'
      lastName = 'index.md'
      return lastName
    }
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
    const fileName = `${baseName}.md`
    // An entry point shares its package's page and an enum member its enum's.
    const owner =
      apiItem.kind === ApiItemKind.EntryPoint || apiItem.kind === ApiItemKind.EnumMember
        ? apiItem.parent
        : apiItem
    const previous = owners.get(fileName)
    if (previous !== undefined && previous !== owner) {
      throw new Error(
        `${previous.canonicalReference.toString()} and ${owner.canonicalReference.toString()} would both be written to ${fileName}`
      )
    }
    owners.set(fileName, owner)
    if (!namingLink && frame?.item === apiItem) frame.name = fileName
    lastName = fileName
    return fileName
  }

  const documented = await new ApiDocumenterCommandLine().executeAsync([
    'markdown',
    '-i',
    inputFolder,
    '-o',
    outputFolder,
  ])
  // A documenter that stopped naming pages through the replaced method would
  // still succeed, with its own colliding names, so the run must prove the
  // replacement named at least one page.
  if (documented && owners.size === 0) {
    throw new Error(
      'api-documenter did not name any page through the replaced _getFilenameForApiItem, so page names are not guaranteed distinct'
    )
  }
  return { documented, pageLinks }
}

// Build the complete replacement beside the published directory; no failed
// generation step may alter the last successful reference.
const stage = mkdtempSync(join(root, '.docs-stage-'))
let preserveStage = false
let committed = false
const stagedDocs = join(stage, 'docs')
try {
  let result
  try {
    result = await documentWithDistinctPageNames(modelsDir, stagedDocs)
  } catch (error) {
    console.error(
      `api-documenter failed: ${error instanceof Error ? error.message : String(error)}`
    )
    throw error
  }
  if (!result.documented) throw new Error('api-documenter failed')
  const { pageLinks } = result

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
    for (const page of readdirSync(stagedDocs)) {
      const path = join(stagedDocs, page)
      const content = readFileSync(path, 'utf-8')
      let next = content
      for (const { heading, headingText, name, importPath } of replacements) {
        next = next.replace(heading, () => headingText).replace(name, () => importPath)
      }
      if (next !== content) writeFileSync(path, next)
    }
  }

  /**
   * The workspace builds each entry's `src/` path at the corresponding
   * `dist/` path. Inspect its star exports so links follow the source rather
   * than a separate list of package relationships.
   */
  const ts = createRequire(join(toolRoot, 'package.json'))('typescript')
  for (const entry of entryPoints) {
    const source = join(
      entry.packageDir,
      'src',
      relative(join(entry.packageDir, 'dist'), entry.entryPath).replace(/\.d\.[cm]?ts$/, '.ts')
    )
    if (!existsSync(source)) continue
    const tree = ts.createSourceFile(
      source,
      readFileSync(source, 'utf-8'),
      ts.ScriptTarget.Latest,
      true
    )
    const targets = new Set()
    for (const statement of tree.statements) {
      if (
        ts.isExportDeclaration(statement) &&
        !statement.exportClause &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const target = entryPoints.find(
          (candidate) => candidate.importPath === statement.moduleSpecifier.text
        )
        if (target) targets.add(target)
      }
    }
    if (targets.size > 0) {
      const path = join(stagedDocs, `${unscopedName(entry.identity)}.md`)
      const links = [...targets]
        .map((target) => {
          const destination = `./${unscopedName(target.identity)}.md`
          pageLinks.get(basename(path)).push(destination)
          return `- [${target.importPath}](${destination})`
        })
        .join('\n')
      writeFileSync(
        path,
        `${readFileSync(path, 'utf-8')}\n## Re-exports\n\nThis entry point re-exports the public symbols of:\n\n${links}\n`
      )
    }
  }

  const format = spawnSync(
    join(toolRoot, 'node_modules', '.bin', 'prettier'),
    [
      '--config',
      join(toolRoot, 'prettier.config.js'),
      '--log-level',
      'warn',
      '--write',
      stagedDocs,
    ],
    { cwd: root, stdio: 'inherit' }
  )
  if (format.error !== undefined || format.status !== 0) {
    throw new Error(`prettier failed: ${format.error?.message ?? `exit ${String(format.status)}`}`)
  }

  // Compare rendered links with the destinations named for that page. A valid
  // filename alone cannot prove that a link names the intended declaration.
  const markdown = createRequire(join(toolRoot, 'package.json'))('prettier/plugins/markdown')
  // Record relative paths even in unexpected subdirectories, so no staged
  // Markdown page can escape the page-write accounting.
  const stagedPages = (directory, prefix = '') =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      return entry.isDirectory()
        ? stagedPages(join(directory, entry.name), name)
        : entry.isFile() && name.endsWith('.md')
          ? [name]
          : []
    })
  const files = new Set(stagedPages(stagedDocs))
  for (const file of files) {
    if (!pageLinks.has(file)) throw new Error(`unrecorded page ${file}`)
  }
  for (const file of pageLinks.keys()) {
    if (!files.has(file)) throw new Error(`missing recorded page ${file}`)
  }

  /** Extract anchor destinations from HTML nodes, respecting quoted tag attributes and comments. */
  const htmlLinks = (html) => {
    const destinations = []
    // Tags may contain > inside quoted values; comments do not contain tags.
    const tags = /<!--[\s\S]*?(?:-->|$)|<([a-z][\w:-]*)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi
    for (const tag of html.matchAll(tags)) {
      if (tag[1]?.toLowerCase() !== 'a') continue
      const attributes = tag[2] ?? ''
      const attribute = /([^\s=/'">]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s'"=<>`]+)))?/g
      for (const match of attributes.matchAll(attribute)) {
        if (match[1].toLowerCase() === 'href') {
          destinations.push(match[2] ?? match[3] ?? match[4] ?? '')
          break
        }
      }
    }
    return destinations
  }

  for (const file of files) {
    const expected = new Map()
    for (const link of pageLinks.get(file)) {
      expected.set(link, (expected.get(link) ?? 0) + 1)
    }
    const content = readFileSync(join(stagedDocs, file), 'utf-8')
    const tree = await markdown.parsers.markdown.parse(content)
    const definitions = new Map()
    const links = []
    // Markdown reference definitions can follow their uses, so collect the
    // destinations before resolving references.
    const visit = (node) => {
      if (node.type === 'definition') definitions.set(node.identifier, node.url)
      if (node.type === 'link') links.push(node.url)
      if (node.type === 'html') links.push(...htmlLinks(node.value))
      if (node.type === 'linkReference') links.push({ identifier: node.identifier })
      for (const child of node.children ?? []) visit(child)
    }
    visit(tree)
    for (const destination of links) {
      const url =
        typeof destination === 'string' ? destination : definitions.get(destination.identifier)
      if (url === undefined) continue
      const link = url.split('#')[0]
      if (!link.endsWith('.md') || /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(link)) continue
      const target = resolve(stagedDocs, link)
      if (
        dirname(target) !== stagedDocs ||
        !files.has(basename(target)) ||
        !pageLinks.has(basename(target))
      ) {
        throw new Error(`${file}: link ${link} does not name a produced page`)
      }
      const count = expected.get(link) ?? 0
      if (count === 0) throw new Error(`${file}: unexpected link ${link}`)
      expected.set(link, count - 1)
    }
    for (const [link, count] of expected) {
      if (count !== 0) throw new Error(`${file}: missing link ${link}`)
    }
  }

  const backup = join(stage, 'previous')
  const hadDocs = existsSync(docsDir)
  if (hadDocs) renameSync(docsDir, backup)
  try {
    renameSync(stagedDocs, docsDir)
    committed = true
  } catch (error) {
    if (hadDocs) {
      try {
        renameSync(backup, docsDir)
      } catch (restoreError) {
        preserveStage = true
        throw new Error(`could not restore docs from ${backup}: ${String(restoreError)}`)
      }
    }
    throw error
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
} finally {
  if (!preserveStage) {
    try {
      rmSync(stage, { recursive: true, force: true })
    } catch (error) {
      // Once installed, cleanup cannot revoke the new reference; report the
      // recovery directory while preserving a successful exit status.
      if (!committed) throw error
      console.warn(`warning: could not remove ${stage}: ${String(error)}`)
    }
  }
}
