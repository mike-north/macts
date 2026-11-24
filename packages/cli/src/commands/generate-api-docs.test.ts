/**
 * UAT for `scripts/generate-api-docs.mjs` and the `docs/` staleness check in
 * `pnpm generate:check`.
 *
 * `docs/` holds the generated API reference. Three properties keep it
 * honest: regeneration documents exactly the workspace's current entry points,
 * so a page for an API, entry point or package that no longer exists cannot
 * survive; every entry point, the root and each subpath, gets its own pages
 * under its import path; and the clean-tree check covers `docs/`, so a
 * committed page that differs from a fresh regeneration fails CI. These tests
 * run the real script and check as subprocesses against a scratch workspace.
 *
 * @see https://github.com/mike-north/macts/issues/335
 * @see https://api-extractor.com/pages/commands/api-documenter_markdown/
 * @see https://api-extractor.com/pages/configs/api-extractor_json/
 * @see https://nodejs.org/api/packages.html#subpath-exports
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const REPO_ROOT = resolve(process.cwd(), '../..')
const DOCS_SCRIPT = join(REPO_ROOT, 'scripts', 'generate-api-docs.mjs')
const CHECK_SCRIPT = join(REPO_ROOT, 'scripts', 'check-clean-tree.mjs')

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'macts test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'macts test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
}

let workspace: string

/** One member of a planted doc model, as API Extractor records it. */
type ModelMember = Record<string, unknown>

/**
 * A doc model for package `@x/<name>` whose entry point declares `members`.
 * Every package API Extractor documents, root or subpath entry, is named after
 * its package.
 */
function packageModel(name: string, members: ModelMember[]): string {
  const pkg = `@x/${name}`
  return JSON.stringify({
    metadata: {
      toolPackage: '@microsoft/api-extractor',
      toolVersion: '7.56.3',
      schemaVersion: 1011,
      oldestForwardsCompatibleVersion: 1001,
      tsdocConfig: {
        $schema: 'https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json',
        noStandardTags: false,
        tagDefinitions: [],
      },
    },
    kind: 'Package',
    canonicalReference: `${pkg}!`,
    docComment: '',
    name: pkg,
    preserveMemberOrder: false,
    members: [
      {
        kind: 'EntryPoint',
        canonicalReference: `${pkg}!`,
        name: '',
        preserveMemberOrder: false,
        members,
      },
    ],
  })
}

/**
 * A public function `<fn>` of package `@x/<name>`. Its return type is `void`,
 * or a reference to another declaration (`returns.reference` is that
 * declaration's canonical reference).
 */
function functionMember(
  name: string,
  fn: string,
  returns?: { text: string; reference: string }
): ModelMember {
  return {
    kind: 'Function',
    canonicalReference: `@x/${name}!${fn}:function(1)`,
    docComment: `/**\n * Does ${fn}.\n */\n`,
    excerptTokens: [
      { kind: 'Content', text: `export declare function ${fn}(): ` },
      returns === undefined
        ? { kind: 'Content', text: 'void' }
        : { kind: 'Reference', text: returns.text, canonicalReference: returns.reference },
      { kind: 'Content', text: ';' },
    ],
    returnTypeTokenRange: { startIndex: 1, endIndex: 2 },
    releaseTag: 'Public',
    overloadIndex: 1,
    parameters: [],
    name: fn,
  }
}

/** A public interface `<type>` of package `@x/<name>`, with one `size` property. */
function interfaceMember(name: string, type: string): ModelMember {
  return {
    kind: 'Interface',
    canonicalReference: `@x/${name}!${type}:interface`,
    docComment: `/**\n * Describes ${type}.\n */\n`,
    excerptTokens: [{ kind: 'Content', text: `export interface ${type} ` }],
    releaseTag: 'Public',
    name: type,
    preserveMemberOrder: false,
    members: [
      {
        kind: 'PropertySignature',
        canonicalReference: `@x/${name}!${type}#size:member`,
        docComment: '',
        excerptTokens: [
          { kind: 'Content', text: 'size: ' },
          { kind: 'Content', text: 'number' },
          { kind: 'Content', text: ';' },
        ],
        isReadonly: false,
        isOptional: false,
        releaseTag: 'Public',
        name: 'size',
        propertyTypeTokenRange: { startIndex: 1, endIndex: 2 },
      },
    ],
    extendsTokenRanges: [],
  }
}

/** A public type alias `<type> = <aliased>` of package `@x/<name>`. */
function typeAliasMember(name: string, type: string, aliased: string): ModelMember {
  return {
    kind: 'TypeAlias',
    canonicalReference: `@x/${name}!${type}:type`,
    docComment: `/**\n * Aliases ${aliased}.\n */\n`,
    excerptTokens: [
      { kind: 'Content', text: `export type ${type} = ` },
      { kind: 'Content', text: aliased },
      { kind: 'Content', text: ';' },
    ],
    releaseTag: 'Public',
    name: type,
    typeTokenRange: { startIndex: 1, endIndex: 2 },
  }
}

/**
 * One overload of a public function `<fn>` of package `@x/<name>`, taking one
 * parameter `a` of type `<param>`. API Extractor numbers a function's
 * overloads from 1 in declaration order (`overloadIndex`).
 */
function overloadMember(
  name: string,
  fn: string,
  overloadIndex: number,
  param: string
): ModelMember {
  return {
    kind: 'Function',
    canonicalReference: `@x/${name}!${fn}:function(${String(overloadIndex)})`,
    docComment: `/**\n * Does ${fn} with a ${param}.\n */\n`,
    excerptTokens: [
      { kind: 'Content', text: `export declare function ${fn}(a: ` },
      { kind: 'Content', text: param },
      { kind: 'Content', text: '): void;' },
    ],
    returnTypeTokenRange: { startIndex: 0, endIndex: 0 },
    releaseTag: 'Public',
    overloadIndex,
    parameters: [
      {
        parameterName: 'a',
        parameterTypeTokenRange: { startIndex: 1, endIndex: 2 },
        isOptional: false,
      },
    ],
    name: fn,
  }
}

/** A public class `<cls>` of package `@x/<name>`, with one `spin()` method. */
function classMember(name: string, cls: string): ModelMember {
  return {
    kind: 'Class',
    canonicalReference: `@x/${name}!${cls}:class`,
    docComment: `/**\n * Builds ${cls}.\n */\n`,
    excerptTokens: [{ kind: 'Content', text: `export declare class ${cls} ` }],
    releaseTag: 'Public',
    isAbstract: false,
    name: cls,
    preserveMemberOrder: false,
    members: [
      {
        kind: 'Method',
        canonicalReference: `@x/${name}!${cls}#spin:member(1)`,
        docComment: '',
        excerptTokens: [
          { kind: 'Content', text: 'spin(): ' },
          { kind: 'Content', text: 'void' },
          { kind: 'Content', text: ';' },
        ],
        isStatic: false,
        returnTypeTokenRange: { startIndex: 1, endIndex: 2 },
        releaseTag: 'Public',
        isProtected: false,
        overloadIndex: 1,
        parameters: [],
        isOptional: false,
        isAbstract: false,
        name: 'spin',
      },
    ],
    implementsTokenRanges: [],
  }
}

/** A public constant `<variable>: number` of package `@x/<name>`. */
function variableMember(name: string, variable: string): ModelMember {
  return {
    kind: 'Variable',
    canonicalReference: `@x/${name}!${variable}:var`,
    docComment: `/**\n * Holds ${variable}.\n */\n`,
    excerptTokens: [
      { kind: 'Content', text: `${variable}: ` },
      { kind: 'Content', text: 'number' },
    ],
    isReadonly: true,
    releaseTag: 'Public',
    name: variable,
    variableTypeTokenRange: { startIndex: 1, endIndex: 2 },
  }
}

/** A doc model declaring one public function, `<fn>`, in package `@x/<name>`. */
function docModel(name: string, fn: string): string {
  return packageModel(name, [functionMember(name, fn)])
}

/** One subpath entry point of a planted package, such as `./local`. */
interface PlantedSubpath {
  /** The subpath, without its leading `./` (`local`). */
  path: string
  /** The function its doc model declares, or `undefined` for no doc model. */
  fn: string | undefined
  /** Whether its config writes a doc model; a config without one still writes an API report. */
  docModel?: boolean
  /** Whether the package's `exports` declares the subpath. */
  exported?: boolean
}

/**
 * Plant a package that runs API Extractor: an `api-extractor.json` for its
 * root entry and an `api-extractor.<path>.json` for each subpath, its
 * `exports`, and each entry's doc model when given.
 */
async function plantPackage(
  name: string,
  fn: string | undefined,
  subpaths: PlantedSubpath[] = []
): Promise<void> {
  const dir = join(workspace, 'packages', name)
  await mkdir(join(dir, 'temp'), { recursive: true })
  const exportsField: Record<string, { types: string; import: string }> = {
    '.': { types: `./dist/${name}.d.ts`, import: './dist/index.js' },
  }
  for (const subpath of subpaths) {
    if (subpath.exported !== false) {
      exportsField[`./${subpath.path}`] = {
        types: `./dist/${subpath.path}/index.d.ts`,
        import: `./dist/${subpath.path}/index.js`,
      }
    }
  }
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      name: `@x/${name}`,
      exports: exportsField,
      scripts: { 'api-extractor': 'api-extractor run' },
    })
  )
  // Like every package here, the root config is the shared base as is.
  await copyFile(
    join(REPO_ROOT, 'api-extractor.base.json'),
    join(workspace, 'api-extractor.base.json')
  )
  await writeFile(
    join(dir, 'api-extractor.json'),
    JSON.stringify({ extends: '../../api-extractor.base.json' })
  )
  if (fn !== undefined) await writeFile(join(dir, 'temp', `${name}.api.json`), docModel(name, fn))
  for (const subpath of subpaths) {
    await writeFile(
      join(dir, `api-extractor.${subpath.path}.json`),
      JSON.stringify({
        extends: '../../api-extractor.base.json',
        mainEntryPointFilePath: `<projectFolder>/dist/${subpath.path}/index.d.ts`,
        apiReport: { enabled: true, reportFileName: `${subpath.path}.api.md` },
        docModel:
          subpath.docModel === false
            ? { enabled: false }
            : { enabled: true, apiJsonFilePath: `<projectFolder>/temp/${subpath.path}.api.json` },
      })
    )
    if (subpath.fn !== undefined) {
      await writeFile(join(dir, 'temp', `${subpath.path}.api.json`), docModel(name, subpath.fn))
    }
  }
}

function generate(
  args: string[] = ['--root', workspace],
  cwd?: string
): { status: number | null; stderr: string } {
  const run = spawnSync(process.execPath, [DOCS_SCRIPT, ...args], { cwd, encoding: 'utf-8' })
  return { status: run.status, stderr: run.stderr }
}

/**
 * Run the script with a module preloaded (`--import`) that changes the
 * documenter the script loads, to stand in for a documenter release that no
 * longer names pages through the method the script replaces. The preload shares
 * the script's module cache, so the change is in place before the script reads
 * the documenter.
 */
async function generateWithDocumenterChange(change: string): Promise<{
  status: number | null
  stderr: string
}> {
  const preload = join(workspace, 'documenter-change.mjs')
  await writeFile(
    preload,
    `import { createRequire } from 'node:module'
const requireRoot = createRequire(${JSON.stringify(join(REPO_ROOT, 'package.json'))})
const requireTool = createRequire(requireRoot.resolve('@microsoft/api-documenter/package.json'))
const { MarkdownDocumenter } = requireTool('./lib/documenters/MarkdownDocumenter')
const original = MarkdownDocumenter.prototype._getFilenameForApiItem
${change}
`
  )
  const nodeOptions =
    `${process.env['NODE_OPTIONS'] ?? ''} --import ${JSON.stringify(preload)}`.trim()
  const run = spawnSync(process.execPath, [DOCS_SCRIPT, '--root', workspace], {
    encoding: 'utf-8',
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
  })
  return { status: run.status, stderr: run.stderr }
}

/** The page files `docs/` holds. */
async function pages(): Promise<string[]> {
  return readdir(join(workspace, 'docs'))
}

/** The text of one generated page. */
async function page(file: string): Promise<string> {
  return readFile(join(workspace, 'docs', file), 'utf-8')
}

/** The page a markdown link with exactly `text` points at, in `content`. */
function linkTarget(content: string, text: string): string | undefined {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\[${escaped}\\]\\(\\./([^)]+\\.md)\\)`).exec(content)?.[1]
}

function git(...args: string[]): void {
  const run = spawnSync('git', args, { cwd: workspace, env: GIT_ENV, encoding: 'utf-8' })
  if (run.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${run.stderr}`)
}

/**
 * The page a link with exactly `text` points at within one `## <section>` of
 * `content` (an entry page's `Classes`, `Interfaces`, ... table).
 */
function sectionLinkTarget(content: string, section: string, text: string): string | undefined {
  const start = content.indexOf(`\n## ${section}\n`)
  if (start === -1) return undefined
  const end = content.indexOf('\n## ', start + 1)
  return linkTarget(content.slice(start, end === -1 ? undefined : end), text)
}

/** Every page a link whose text matches `text` points at, in `content`. */
function linkTargets(content: string, text: RegExp): string[] {
  return [...content.matchAll(new RegExp(`\\[${text.source}\\]\\(\\./([^)]+\\.md)\\)`, 'g'))].map(
    (match) => match[1] ?? ''
  )
}

/** Run the tree check over `docs` in the scratch workspace. */
function checkDocs(): { status: number | null; stderr: string } {
  const run = spawnSync(process.execPath, [CHECK_SCRIPT, 'docs'], {
    cwd: workspace,
    env: GIT_ENV,
    encoding: 'utf-8',
  })
  return { status: run.status, stderr: run.stderr }
}

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'macts api docs-'))
})

afterEach(async () => {
  expect((await readdir(workspace)).filter((name) => name.startsWith('.docs-stage-'))).toEqual([])
  await rm(workspace, { recursive: true, force: true })
})

describe('generate-api-docs', () => {
  it('rejects an unrecorded page without replacing the reference', async () => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
const fs = (await import('node:fs')).default
const execute = MarkdownDocumenter.prototype.generateFiles
MarkdownDocumenter.prototype.generateFiles = function (...args) {
  const result = execute.apply(this, args)
  fs.writeFileSync(this._outputFolder + '/unaccounted.md', '# Extra\\n')
  return result
}`)
    expect(result.status, result.stderr).toBe(1)
    expect(result.stderr).toContain('unaccounted.md')
    expect(await pages()).toEqual(['kept.md'])
    expect(await page('kept.md')).toBe('original bytes\n')
  })

  it('rejects a recorded page that is missing from staging', async () => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
const fs = (await import('node:fs')).default
const execute = MarkdownDocumenter.prototype.generateFiles
MarkdownDocumenter.prototype.generateFiles = function (...args) {
  const result = execute.apply(this, args)
  fs.unlinkSync(this._outputFolder + '/widgets.spin.md')
  return result
}`)
    expect(result.status, result.stderr).toBe(1)
    expect(result.stderr).toContain('widgets.spin.md')
    expect(await pages()).toEqual(['kept.md'])
  })

  it.each([
    ['inline double quoted', '<a href="./widgets.spin.md">extra</a>'],
    ['block single quoted', "<div>\n<A HREF='./widgets.spin.md#part'>extra</A>\n</div>"],
  ])('rejects an unaccounted %s HTML link', async (_label, html) => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
const fs = (await import('node:fs')).default
const execute = MarkdownDocumenter.prototype.generateFiles
MarkdownDocumenter.prototype.generateFiles = function (...args) {
  const result = execute.apply(this, args)
  fs.appendFileSync(this._outputFolder + '/widgets.md', ${JSON.stringify(`\n${html}\n`)})
  return result
}`)
    expect(result.status, result.stderr).toBe(1)
    expect(result.stderr).toContain('./widgets.spin.md')
    expect(await pages()).toEqual(['kept.md'])
    expect(await page('kept.md')).toBe('original bytes\n')
  })

  it.each([
    ['encoded dot', '<a href="./widgets.spin&#46;md">extra</a>'],
    ['encoded fragment', '<a href="./widgets.spin.md&#35;part">extra</a>'],
    ['numeric reference without semicolon', '<a href="./widgets.spin&#46md">extra</a>'],
    ['Markdown query', '[extra](./widgets.spin.md?view=1)'],
    ['HTML query', '<a href="./widgets.spin.md?view=1">extra</a>'],
    ['root relative path', '[extra](/docs/widgets.spin.md)'],
    ['non Markdown path', '[extra](./asset.txt)'],
    ['uppercase extension', '[extra](./widgets.spin.MD)'],
  ])('rejects an unaccounted local destination: %s', async (_label, content) => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
const fs = (await import('node:fs')).default
const execute = MarkdownDocumenter.prototype.generateFiles
MarkdownDocumenter.prototype.generateFiles = function (...args) {
  const result = execute.apply(this, args)
  fs.appendFileSync(this._outputFolder + '/widgets.md', ${JSON.stringify(`\n${content}\n`)})
  return result
}`)
    expect(result.status, result.stderr).toBe(1)
    expect(await pages()).toEqual(['kept.md'])
    expect(await page('kept.md')).toBe('original bytes\n')
  })

  it.each(['https&colon;//example.com/missing.md', 'https&#58//example.com/missing.md'])(
    'accepts the encoded external HTML destination %s',
    async (destination) => {
      await plantPackage('widgets', 'spin')
      const result = await generateWithDocumenterChange(`
const fs = (await import('node:fs')).default
const execute = MarkdownDocumenter.prototype.generateFiles
MarkdownDocumenter.prototype.generateFiles = function (...args) {
  const result = execute.apply(this, args)
  fs.appendFileSync(this._outputFolder + '/widgets.md', ${JSON.stringify(`\n<a href="${destination}">external</a>\n`)})
  return result
}`)
      expect(result.status, result.stderr).toBe(0)
    }
  )

  it('rejects a staged symlink without replacing the reference', async () => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
const fs = (await import('node:fs')).default
const execute = MarkdownDocumenter.prototype.generateFiles
MarkdownDocumenter.prototype.generateFiles = function (...args) {
  const result = execute.apply(this, args)
  fs.symlinkSync('widgets.spin.md', this._outputFolder + '/extra.md')
  return result
}`)
    expect(result.status, result.stderr).toBe(1)
    expect(result.stderr).toContain('extra.md')
    expect(await pages()).toEqual(['kept.md'])
    expect(await page('kept.md')).toBe('original bytes\n')
  })

  it('ignores HTML examples in code and external or fragment links', async () => {
    await plantPackage('widgets', 'spin')
    const content =
      '\n`<a href="./missing.md">example</a>`\n\n```html\n<a href="./missing.md">example</a>\n```\n\n<a href="https://example.com/missing.md">external</a> <a href="#part">fragment</a>\n'
    const result = await generateWithDocumenterChange(`
const fs = (await import('node:fs')).default
const execute = MarkdownDocumenter.prototype.generateFiles
MarkdownDocumenter.prototype.generateFiles = function (...args) {
  const result = execute.apply(this, args)
  fs.appendFileSync(this._outputFolder + '/widgets.md', ${JSON.stringify(content)})
  return result
}`)
    expect(result.status, result.stderr).toBe(0)
    expect(await page('widgets.md')).toContain('https://example.com/missing.md')
  })

  it('reports an empty workspace before attempting documentation', async () => {
    await mkdir(join(workspace, 'packages'))
    const result = generate()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('no entry points to document')
  })

  it('warns and retains the previous pages if cleanup fails after installation', async () => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
const fs = (await import('node:fs')).default
const { syncBuiltinESMExports } = await import('node:module')
const remove = fs.rmSync
fs.rmSync = function (path, ...args) {
  if (String(path).includes('.docs-stage-') && fs.existsSync(String(path) + '/previous')) throw new Error('injected cleanup failure')
  return remove.call(this, path, ...args)
}
syncBuiltinESMExports()`)
    const stages = (await readdir(workspace)).filter((name) => name.startsWith('.docs-stage-'))
    try {
      expect(result.status, result.stderr).toBe(0)
      expect(await page('widgets.spin.md')).toContain('spin()')
      expect(stages).toHaveLength(1)
      const stage = stages[0]
      if (stage === undefined) throw new Error('missing retained stage')
      expect(result.stderr).toContain('warning')
      expect(result.stderr).toContain(stage)
      expect(await readFile(join(workspace, stage, 'previous', 'kept.md'), 'utf-8')).toBe(
        'original bytes\n'
      )
    } finally {
      for (const stage of stages) await rm(join(workspace, stage), { recursive: true, force: true })
    }
  })

  it('rejects a breadcrumb emitted without the naming method', async () => {
    await plantPackage('widgets', undefined)
    const cls = classMember('widgets', 'Gizmo')
    const instance = (cls['members'] as ModelMember[])[0]
    if (instance === undefined) throw new Error('missing fixture method')
    cls['members'] = [
      instance,
      {
        ...instance,
        isStatic: true,
        canonicalReference: '@x/widgets!Gizmo.spin:member(1)',
        excerptTokens: [
          { kind: 'Content', text: 'static spin(): ' },
          { kind: 'Content', text: 'void' },
          { kind: 'Content', text: ';' },
        ],
      },
    ]
    await writeFile(
      join(workspace, 'packages/widgets/temp/widgets.api.json'),
      packageModel('widgets', [cls])
    )
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
const tsdoc_1 = requireTool('@microsoft/tsdoc')
const api_extractor_model_1 = requireTool('@microsoft/api-extractor-model')
const breadcrumb = MarkdownDocumenter.prototype._writeBreadcrumb.toString()
const edited = breadcrumb.replace(
  'urlDestination: this._getLinkFilenameForApiItem(hierarchyItem)',
  "urlDestination: (!skipped && hierarchyItem === apiItem && apiItem.isStatic ? (skipped = true, './' + original.call(this, hierarchyItem)) : this._getLinkFilenameForApiItem(hierarchyItem))"
)
if (edited === breadcrumb) throw new Error('breadcrumb fixture did not modify the documenter')
MarkdownDocumenter.prototype._writeBreadcrumb = new Function('tsdoc_1', 'api_extractor_model_1', 'original', 'let skipped=false; return function ' + edited)(tsdoc_1, api_extractor_model_1, original)`)
    expect(result.status, result.stderr).toBe(1)
    expect(result.stderr).toContain('widgets.gizmo.spin-static.md')
    expect(await pages()).toEqual(['kept.md'])
    expect(await page('kept.md')).toBe('original bytes\n')
  })

  it('preserves existing pages when the documenter fails after writing', async () => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
const execute = MarkdownDocumenter.prototype.generateFiles
MarkdownDocumenter.prototype.generateFiles = function (...args) {
  execute.apply(this, args)
  throw new Error('injected documenter failure')
}`)
    expect(result.status).toBe(1)
    expect(await pages()).toEqual(['kept.md'])
    expect(await page('kept.md')).toBe('original bytes\n')
  })

  it('preserves existing pages when formatting fails', async () => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
const childProcess = (await import('node:child_process')).default
const { syncBuiltinESMExports } = await import('node:module')
const spawn = childProcess.spawnSync
childProcess.spawnSync = function (command, ...args) {
  if (String(command).endsWith('/prettier')) return { status: 1 }
  return spawn.call(this, command, ...args)
}
syncBuiltinESMExports()`)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('prettier failed')
    expect(await pages()).toEqual(['kept.md'])
    expect(await page('kept.md')).toBe('original bytes\n')
  })

  it('rejects a package named index without replacing existing pages', async () => {
    await plantPackage('index', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = generate()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('index.md')
    expect(await pages()).toEqual(['kept.md'])
    expect(await page('kept.md')).toBe('original bytes\n')
  })

  it('links entry points to packages whose exports they re-export', async () => {
    await plantPackage('widgets', 'spin', [{ path: 'local', fn: 'spin' }])
    await plantPackage('shapes', 'outline')
    await mkdir(join(workspace, 'packages', 'widgets', 'src'))
    await writeFile(
      join(workspace, 'packages', 'widgets', 'src', 'index.ts'),
      "export * from '@x/shapes'\n"
    )
    await mkdir(join(workspace, 'packages', 'widgets', 'src', 'local'))
    await writeFile(
      join(workspace, 'packages', 'widgets', 'src', 'local', 'index.ts'),
      "export * from '@x/shapes'\n"
    )
    expect(generate().status).toBe(0)
    expect(linkTarget(await page('widgets.md'), '@x/shapes')).toBe('shapes.md')
    expect(linkTarget(await page('widgets_local.md'), '@x/shapes')).toBe('shapes.md')
  })

  it('gives static and instance methods distinct linked pages', async () => {
    await plantPackage('widgets', undefined)
    const cls = classMember('widgets', 'Gizmo')
    const instance = (cls['members'] as ModelMember[])[0]
    if (instance === undefined) throw new Error('missing fixture method')
    const staticMethod = {
      ...instance,
      isStatic: true,
      canonicalReference: '@x/widgets!Gizmo.spin:member(1)',
      excerptTokens: [
        { kind: 'Content', text: 'static spin(): ' },
        { kind: 'Content', text: 'void' },
        { kind: 'Content', text: ';' },
      ],
    }
    cls['members'] = [instance, staticMethod]
    await writeFile(
      join(workspace, 'packages', 'widgets', 'temp', 'widgets.api.json'),
      packageModel('widgets', [cls])
    )
    expect(generate().status).toBe(0)
    const targets = linkTargets(await page('widgets.gizmo.md'), /spin\([^)]*\)/).sort()
    expect(targets).toEqual(['widgets.gizmo.spin-static.md', 'widgets.gizmo.spin.md'])
    expect(await page('widgets.gizmo.spin-static.md')).toContain('static spin()')
    expect(await page('widgets.gizmo.spin.md')).toContain('spin()')
  })

  it('rejects a documenter that bypasses the replacement for file names', async () => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
let inLink = false
const link = MarkdownDocumenter.prototype._getLinkFilenameForApiItem
MarkdownDocumenter.prototype._getLinkFilenameForApiItem = function (...args) {
  inLink = true
  try { return link.apply(this, args) } finally { inLink = false }
}
const write = MarkdownDocumenter.prototype._writeApiItemPage
MarkdownDocumenter.prototype._writeApiItemPage = function (item) {
  const replacement = this._getFilenameForApiItem
  this._getFilenameForApiItem = function (target) {
    return (inLink ? replacement : original).call(this, target)
  }
  try { return write.call(this, item) } finally { this._getFilenameForApiItem = replacement }
}`)
    expect(result.status).toBe(1)
    expect(await pages()).toEqual(['kept.md'])
  })

  it('rejects a documenter that bypasses the replacement for links', async () => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
MarkdownDocumenter.prototype._getLinkFilenameForApiItem = function (item) {
  return './' + original.call(this, item)
}`)
    expect(result.status).toBe(1)
    expect(await pages()).toEqual(['kept.md'])
    expect(await page('kept.md')).toBe('original bytes\n')
  })

  it('restores the previous reference if the new directory cannot be installed', async () => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const result = await generateWithDocumenterChange(`
const fs = (await import('node:fs')).default
const { syncBuiltinESMExports } = await import('node:module')
const rename = fs.renameSync
let rejected = false
fs.renameSync = function (from, to) {
  if (!rejected && String(from).includes('.docs-stage-') && String(from).endsWith('/docs')) {
    rejected = true
    throw new Error('injected rename failure')
  }
  return rename.call(this, from, to)
}
syncBuiltinESMExports()`)
    expect(result.status).toBe(1)
    expect(await pages()).toEqual(['kept.md'])
    expect(await page('kept.md')).toBe('original bytes\n')
    expect((await readdir(workspace)).filter((name) => name.startsWith('.docs-stage-'))).toEqual([])
  })

  it('writes a page for each public export of each package', async () => {
    await plantPackage('widgets', 'spin')

    expect(generate().status).toBe(0)

    expect(await readdir(join(workspace, 'docs'))).toContain('widgets.spin.md')
  })

  it('removes a page for an export that no longer exists', async () => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'), { recursive: true })
    await writeFile(join(workspace, 'docs', 'widgets.retired.md'), 'retired\n')

    expect(generate().status).toBe(0)

    const written = await pages()
    expect(written).not.toContain('widgets.retired.md')
    expect(written).toContain('widgets.spin.md')
  })

  it('writes no pages for a doc model left in the root temp/ by a package that no longer exists (stale page regression, issue 335)', async () => {
    await plantPackage('widgets', 'spin')
    // An earlier run staged this model; its package has since been removed.
    await mkdir(join(workspace, 'temp'), { recursive: true })
    await writeFile(join(workspace, 'temp', 'gadgets.api.json'), docModel('gadgets', 'whirr'))

    expect(generate().status).toBe(0)

    const written = await pages()
    expect(written).toContain('widgets.spin.md')
    expect(written.filter((page) => page.startsWith('gadgets'))).toEqual([])
  })

  it('documents each subpath entry point under its import path, apart from the root entry', async () => {
    // Both entries export `spin`; each must keep its own page.
    await plantPackage('widgets', 'spin', [{ path: 'local', fn: 'spin' }])

    expect(generate().status).toBe(0)

    const written = await pages()
    expect(written).toContain('widgets.spin.md')
    const index = await readFile(join(workspace, 'docs', 'index.md'), 'utf-8')
    const entry = /\[@x\/widgets\/local\]\(\.\/([^)]+)\)/.exec(index)?.[1]
    if (entry === undefined) throw new Error(`no @x/widgets/local entry in the index:\n${index}`)
    const entryPage = await readFile(join(workspace, 'docs', entry), 'utf-8')
    expect(entryPage).toContain('## @x/widgets/local')
    const member = /\[spin\(\)\]\(\.\/([^)]+)\)/.exec(entryPage)?.[1]
    if (member === undefined) throw new Error(`no spin() member on the entry page:\n${entryPage}`)
    expect(member).not.toBe('widgets.spin.md')
    const memberPage = await readFile(join(workspace, 'docs', member), 'utf-8')
    expect(memberPage).toContain('[@x/widgets/local]')
    // The page identity names files only; no text presents it as a package.
    expect(memberPage).not.toMatch(/@x\/widgets\\?_local/)
  })

  it('gives members whose names differ only in case a page each, linked from every page that names them (case-only collision regression, issue 335)', async () => {
    await plantPackage('widgets', undefined)
    await writeFile(
      join(workspace, 'packages', 'widgets', 'temp', 'widgets.api.json'),
      packageModel('widgets', [
        functionMember('widgets', 'widget', {
          text: 'Widget',
          reference: '@x/widgets!Widget:interface',
        }),
        interfaceMember('widgets', 'Widget'),
        functionMember('widgets', 'spin'),
      ])
    )

    expect(generate().status).toBe(0)

    const entry = await page('widgets.md')
    const fnPage = linkTarget(entry, 'widget()')
    const typePage = linkTarget(entry, 'Widget')
    if (fnPage === undefined || typePage === undefined) {
      throw new Error(`the entry page does not link both members:\n${entry}`)
    }
    expect(fnPage).not.toBe(typePage)
    expect(await page(fnPage)).toMatch(/^## widget\(\) function$/m)
    expect(await page(typePage)).toMatch(/^## Widget interface$/m)
    // A page that names the other member links to that member's own page.
    expect(linkTarget(await page(fnPage), 'Widget')).toBe(typePage)
    // The interface's own members are named under the interface's page.
    const sizePage = linkTarget(await page(typePage), 'size')
    if (sizePage === undefined) throw new Error('the interface page does not link its property')
    expect(await page(sizePage)).toMatch(/^## Widget\.size property$/m)
    // The rule: the spellings sort by code unit; the first keeps the name
    // api-documenter gives it, the second has `-2` appended. A member whose
    // name no other shares keeps its name.
    expect(typePage).toBe('widgets.widget.md')
    expect(fnPage).toBe('widgets.widget-2.md')
    expect(linkTarget(entry, 'spin()')).toBe('widgets.spin.md')
  })

  it('gives each declaration of a merged name a page of its own, linked from every page that names it (same-name declaration merge regression, issue 335)', async () => {
    await plantPackage('widgets', undefined)
    await writeFile(
      join(workspace, 'packages', 'widgets', 'temp', 'widgets.api.json'),
      packageModel('widgets', [
        // A class and an interface named `Gizmo`, as every app client is declared.
        classMember('widgets', 'Gizmo'),
        interfaceMember('widgets', 'Gizmo'),
        // A function whose name differs only in case from the merged pair.
        functionMember('widgets', 'gizmo'),
        // A constant and a type named `count`, with an interface `Count`.
        variableMember('widgets', 'count'),
        typeAliasMember('widgets', 'count', 'number'),
        interfaceMember('widgets', 'Count'),
        functionMember('widgets', 'build', {
          text: 'Gizmo',
          reference: '@x/widgets!Gizmo:class',
        }),
        functionMember('widgets', 'describe', {
          text: 'Gizmo',
          reference: '@x/widgets!Gizmo:interface',
        }),
        functionMember('widgets', 'tally', { text: 'count', reference: '@x/widgets!count:type' }),
      ])
    )

    expect(generate().status).toBe(0)

    const entry = await page('widgets.md')
    const classPage = sectionLinkTarget(entry, 'Classes', 'Gizmo')
    const interfacePage = sectionLinkTarget(entry, 'Interfaces', 'Gizmo')
    const variablePage = sectionLinkTarget(entry, 'Variables', 'count')
    const typePage = sectionLinkTarget(entry, 'Type Aliases', 'count')
    // The rule: a value-side declaration (class, function, variable, enum,
    // namespace) keeps the plain name; a type-side declaration of the same
    // name (interface, type alias) has its kind appended. The case rule
    // applies first: `Count` sorts before `count`, which has `-2` appended.
    expect(classPage).toBe('widgets.gizmo.md')
    expect(interfacePage).toBe('widgets.gizmo-interface.md')
    expect(linkTarget(entry, 'gizmo()')).toBe('widgets.gizmo-2.md')
    expect(sectionLinkTarget(entry, 'Interfaces', 'Count')).toBe('widgets.count.md')
    expect(variablePage).toBe('widgets.count-2.md')
    expect(typePage).toBe('widgets.count-2-type.md')
    expect(await page('widgets.gizmo.md')).toMatch(/^## Gizmo class$/m)
    expect(await page('widgets.gizmo-interface.md')).toMatch(/^## Gizmo interface$/m)
    expect(await page('widgets.gizmo-2.md')).toMatch(/^## gizmo\(\) function$/m)
    expect(await page('widgets.count.md')).toMatch(/^## Count interface$/m)
    expect(await page('widgets.count-2.md')).toMatch(/^## count variable$/m)
    expect(await page('widgets.count-2-type.md')).toMatch(/^## count type$/m)
    // A reference to one declaration links to that declaration's page.
    expect(linkTarget(await page(linkTarget(entry, 'build()') ?? ''), 'Gizmo')).toBe(classPage)
    expect(linkTarget(await page(linkTarget(entry, 'describe()') ?? ''), 'Gizmo')).toBe(
      interfacePage
    )
    expect(linkTarget(await page(linkTarget(entry, 'tally()') ?? ''), 'count')).toBe(typePage)
    // Each declaration's members are documented under, and link back to, it.
    const spinPage = linkTarget(await page('widgets.gizmo.md'), 'spin()')
    expect(spinPage).toBe('widgets.gizmo.spin.md')
    const spin = await page('widgets.gizmo.spin.md')
    expect(spin).toMatch(/^## Gizmo\.spin\(\) method$/m)
    expect(linkTarget(spin, 'Gizmo')).toBe(classPage)
    const sizePage = linkTarget(await page('widgets.gizmo-interface.md'), 'size')
    expect(sizePage).toBe('widgets.gizmo-interface.size.md')
    const size = await page('widgets.gizmo-interface.size.md')
    expect(size).toMatch(/^## Gizmo\.size property$/m)
    expect(linkTarget(size, 'Gizmo')).toBe(interfacePage)
  })

  it('gives each overload of a function a page of its own, numbered after the first, also when its name collides by case', async () => {
    await plantPackage('widgets', undefined)
    await writeFile(
      join(workspace, 'packages', 'widgets', 'temp', 'widgets.api.json'),
      packageModel('widgets', [
        overloadMember('widgets', 'make', 1, 'number'),
        overloadMember('widgets', 'make', 2, 'string'),
        interfaceMember('widgets', 'Make'),
        overloadMember('widgets', 'twist', 1, 'number'),
        overloadMember('widgets', 'twist', 2, 'string'),
      ])
    )

    expect(generate().status).toBe(0)

    const entry = await page('widgets.md')
    // api-documenter numbers every overload after the first `_<n - 1>`; the
    // case rule gives `make` (after `Make`) the segment `make-2`.
    expect(linkTargets(entry, /twist\([^)]*\)/).sort()).toEqual([
      'widgets.twist.md',
      'widgets.twist_1.md',
    ])
    expect(linkTargets(entry, /make\([^)]*\)/).sort()).toEqual([
      'widgets.make-2.md',
      'widgets.make-2_1.md',
    ])
    expect(sectionLinkTarget(entry, 'Interfaces', 'Make')).toBe('widgets.make.md')
    expect(await page('widgets.twist.md')).toContain('twist(a: number)')
    expect(await page('widgets.twist_1.md')).toContain('twist(a: string)')
    expect(await page('widgets.make-2.md')).toContain('make(a: number)')
    expect(await page('widgets.make-2_1.md')).toContain('make(a: string)')
    expect(await page('widgets.make.md')).toMatch(/^## Make interface$/m)
  })

  it('fails, naming the page, instead of writing two members to one page', async () => {
    await plantPackage('widgets', undefined)
    // The second overload of `make` is named `make_1`, as is the function `make_1`.
    await writeFile(
      join(workspace, 'packages', 'widgets', 'temp', 'widgets.api.json'),
      packageModel('widgets', [
        overloadMember('widgets', 'make', 1, 'number'),
        overloadMember('widgets', 'make', 2, 'string'),
        functionMember('widgets', 'make_1'),
      ])
    )

    await mkdir(join(workspace, 'docs'))
    await writeFile(join(workspace, 'docs', 'kept.md'), 'original bytes\n')
    const { status, stderr } = generate()

    expect(status).toBe(1)
    expect(stderr).toContain('widgets.make_1.md')
    expect(await pages()).toEqual(['kept.md'])
    expect(await page('kept.md')).toBe('original bytes\n')
  })

  it('fails when this api-documenter version no longer has the method that names pages', async () => {
    await plantPackage('widgets', 'weave')

    const { status, stderr } = await generateWithDocumenterChange(
      'delete MarkdownDocumenter.prototype._getFilenameForApiItem'
    )

    expect(status).toBe(1)
    expect(stderr).toContain('no longer names pages through _getFilenameForApiItem')
  })

  it('fails when api-documenter never names a page through the replaced method', async () => {
    await plantPackage('widgets', 'weave')

    // The documenter keeps its own method; the script's replacement is ignored.
    const { status, stderr } = await generateWithDocumenterChange(
      `Object.defineProperty(MarkdownDocumenter.prototype, '_getFilenameForApiItem', {
  configurable: true,
  get: () => original,
  set: () => undefined,
})`
    )

    expect(status).toBe(1)
    expect(stderr).toContain('through the replaced _getFilenameForApiItem')
  })

  it("links a subpath member to the subpath's own declaration of a name the root entry also declares", async () => {
    await plantPackage('widgets', undefined, [{ path: 'local', fn: undefined }])
    const temp = join(workspace, 'packages', 'widgets', 'temp')
    await writeFile(
      join(temp, 'widgets.api.json'),
      packageModel('widgets', [
        typeAliasMember('widgets', 'Size', 'string'),
        interfaceMember('widgets', 'Shape'),
      ])
    )
    // API Extractor names a subpath model after its package, so the subpath's
    // reference to its own `Size` reads `@x/widgets!Size`, like the root's.
    await writeFile(
      join(temp, 'local.api.json'),
      packageModel('widgets', [
        typeAliasMember('widgets', 'Size', 'number'),
        functionMember('widgets', 'measure', { text: 'Size', reference: '@x/widgets!Size:type' }),
        // `Shape` is declared by the root entry only.
        functionMember('widgets', 'outline', {
          text: 'Shape',
          reference: '@x/widgets!Shape:interface',
        }),
      ])
    )

    expect(generate().status).toBe(0)

    const index = await page('index.md')
    const entryFile = linkTarget(index, '@x/widgets/local')
    if (entryFile === undefined)
      throw new Error(`no @x/widgets/local entry in the index:\n${index}`)
    const entry = await page(entryFile)
    const subpathSize = linkTarget(entry, 'Size')
    const measure = linkTarget(entry, 'measure()')
    if (subpathSize === undefined || measure === undefined) {
      throw new Error(`the subpath entry page does not link its members:\n${entry}`)
    }
    expect(linkTarget(await page('widgets.md'), 'Size')).not.toBe(subpathSize)
    expect(linkTarget(await page(measure), 'Size')).toBe(subpathSize)
    // A reference to a name only the root entry declares links to the root's page.
    const outline = linkTarget(entry, 'outline()')
    if (outline === undefined)
      throw new Error(`the subpath entry page does not link outline():\n${entry}`)
    expect(linkTarget(await page(outline), 'Shape')).toBe('widgets.shape.md')
    expect(await page('widgets.shape.md')).toMatch(/^## Shape interface$/m)
  })

  it('fails, naming the config, when an entry point writes an API report but no doc model', async () => {
    await plantPackage('widgets', 'spin', [{ path: 'local', fn: undefined, docModel: false }])

    const { status, stderr } = generate()

    expect(status).toBe(1)
    expect(stderr).toContain('packages/widgets/api-extractor.local.json')
  })

  it('fails, naming the config, when an entry point matches no subpath the package exports', async () => {
    await plantPackage('widgets', 'spin', [{ path: 'local', fn: 'spin', exported: false }])

    const { status, stderr } = generate()

    expect(status).toBe(1)
    expect(stderr).toContain('packages/widgets/api-extractor.local.json')
  })

  it('fails, naming the model, when a subpath entry point has no doc model', async () => {
    await plantPackage('widgets', 'spin', [{ path: 'local', fn: undefined }])

    const { status, stderr } = generate()

    expect(status).toBe(1)
    expect(stderr).toContain('packages/widgets/temp/local.api.json')
  })

  it('stops with a usage error, writing nothing, when --root has no directory', async () => {
    await plantPackage('widgets', 'spin')

    const { status, stderr } = generate(['--root'], workspace)

    expect(status).toBe(2)
    expect(stderr).toContain('Usage:')
    expect(existsSync(join(workspace, 'docs'))).toBe(false)
    expect(existsSync(join(workspace, 'temp'))).toBe(false)
  })

  it.each([
    ['--root=<dir>', (dir: string) => [`--root=${dir}`]],
    ['an unknown flag', (dir: string) => ['--root', dir, '--verbose']],
    ['a stray argument', (dir: string) => [dir]],
    ['an empty directory', () => ['--root', '']],
    ['a flag in place of the directory', () => ['--root', '--verbose']],
  ])('stops with a usage error, writing nothing, given %s', async (_case, args) => {
    await plantPackage('widgets', 'spin')

    const { status, stderr } = generate(args(workspace), workspace)

    expect(status).toBe(2)
    expect(stderr).toContain('Usage:')
    expect(existsSync(join(workspace, 'docs'))).toBe(false)
    expect(existsSync(join(workspace, 'temp'))).toBe(false)
  })

  it('leaves the command-line and MCP packages out of the reference', async () => {
    await plantPackage('widgets', 'spin')
    await plantPackage('cli', 'run')
    await plantPackage('mcp', 'serve')

    expect(generate().status).toBe(0)

    const written = await pages()
    expect(written).toContain('widgets.spin.md')
    expect(written.filter((page) => page.startsWith('cli') || page.startsWith('mcp'))).toEqual([])
  })

  it('fails, naming the package, when a package has no doc model', async () => {
    await plantPackage('widgets', 'spin')
    await plantPackage('gadgets', undefined)

    const { status, stderr } = generate()

    expect(status).toBe(1)
    expect(stderr).toContain('packages/gadgets/temp/gadgets.api.json')
  })

  it('does not delete the existing pages when a doc model is missing', async () => {
    await plantPackage('gadgets', undefined)
    await mkdir(join(workspace, 'docs'), { recursive: true })
    await writeFile(join(workspace, 'docs', 'kept.md'), 'kept\n')

    expect(generate().status).toBe(1)

    expect(existsSync(join(workspace, 'docs', 'kept.md'))).toBe(true)
  })

  it('writes pages already in the repository Prettier format', async () => {
    await plantPackage('widgets', 'spin')
    generate()

    const check = spawnSync(
      join(REPO_ROOT, 'node_modules', '.bin', 'prettier'),
      ['--config', join(REPO_ROOT, 'prettier.config.js'), '--check', join(workspace, 'docs')],
      { encoding: 'utf-8' }
    )
    expect(check.status, check.stdout + check.stderr).toBe(0)
  })

  it('is deterministic: two runs write identical pages', async () => {
    await plantPackage('widgets', 'spin')
    generate()
    const first = await readFile(join(workspace, 'docs', 'widgets.spin.md'), 'utf-8')
    generate()

    expect(await readFile(join(workspace, 'docs', 'widgets.spin.md'), 'utf-8')).toBe(first)
  })
})

describe('docs staleness check', () => {
  async function commitFreshDocs(): Promise<void> {
    await plantPackage('widgets', 'spin')
    await writeFile(join(workspace, '.gitignore'), 'temp/\npackages/*/temp/\n')
    generate()
    git('init', '--quiet')
    git('add', '.')
    git('commit', '--quiet', '-m', 'initial')
  }

  it('passes on a freshly regenerated tree', async () => {
    await commitFreshDocs()

    generate()

    expect(checkDocs()).toEqual({ status: 0, stderr: '' })
  })

  it('fails, naming the page, when a committed page differs from a fresh regeneration', async () => {
    await commitFreshDocs()
    // The committed copy goes stale: it no longer matches what the doc model yields.
    await writeFile(join(workspace, 'docs', 'widgets.spin.md'), 'altered\n')
    git('commit', '--quiet', '-am', 'stale page')

    generate()
    const { status, stderr } = checkDocs()

    expect(status).toBe(1)
    expect(stderr).toContain('modified  docs/widgets.spin.md')
  })

  it('names the command that regenerates API reports and docs when the check fails', async () => {
    await commitFreshDocs()
    await writeFile(join(workspace, 'docs', 'widgets.spin.md'), 'altered\n')

    const { status, stderr } = checkDocs()

    expect(status).toBe(1)
    // `pnpm generate` rewrites generated packages; API reports and docs/ come
    // from `pnpm api-docs:full` (build, API Extractor, then the pages).
    expect(stderr).toContain('`pnpm generate` (generated packages)')
    expect(stderr).toContain('`pnpm api-docs:full` (API reports and docs)')
  })

  it('fails, naming the page, when the API gained an export the committed docs lack', async () => {
    await commitFreshDocs()
    await writeFile(
      join(workspace, 'packages', 'widgets', 'temp', 'widgets.api.json'),
      docModel('widgets', 'twirl')
    )

    generate()
    const { status, stderr } = checkDocs()

    expect(status).toBe(1)
    expect(stderr).toContain('untracked docs/widgets.twirl.md')
    expect(stderr).toContain('deleted   docs/widgets.spin.md')
  })
})

describe('generate:check', () => {
  it('regenerates the API reference and checks docs alongside packages', async () => {
    const pkg = JSON.parse(await readFile(join(REPO_ROOT, 'package.json'), 'utf-8')) as {
      scripts: Record<string, string>
    }
    expect(pkg.scripts['generate:check']).toBe(
      'node scripts/regenerate.mjs && pnpm api-extractor && pnpm api-docs && node scripts/check-clean-tree.mjs packages docs'
    )
    expect(pkg.scripts['api-docs']).toBe('node scripts/generate-api-docs.mjs')
  })
})
