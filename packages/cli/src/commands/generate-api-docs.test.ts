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

/**
 * A doc model declaring one public function, `<fn>`, in package `@x/<name>`.
 * Every package API Extractor documents, root or subpath entry, is named after
 * its package.
 */
function docModel(name: string, fn: string): string {
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
        members: [
          {
            kind: 'Function',
            canonicalReference: `${pkg}!${fn}:function(1)`,
            docComment: `/**\n * Does ${fn}.\n */\n`,
            excerptTokens: [
              { kind: 'Content', text: `export declare function ${fn}(): ` },
              { kind: 'Content', text: 'void' },
              { kind: 'Content', text: ';' },
            ],
            returnTypeTokenRange: { startIndex: 1, endIndex: 2 },
            releaseTag: 'Public',
            overloadIndex: 1,
            parameters: [],
            name: fn,
          },
        ],
      },
    ],
  })
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

/** The page files `docs/` holds. */
async function pages(): Promise<string[]> {
  return readdir(join(workspace, 'docs'))
}

function git(...args: string[]): void {
  const run = spawnSync('git', args, { cwd: workspace, env: GIT_ENV, encoding: 'utf-8' })
  if (run.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${run.stderr}`)
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
  workspace = await mkdtemp(join(tmpdir(), 'macts-api-docs-'))
})

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true })
})

describe('generate-api-docs', () => {
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
