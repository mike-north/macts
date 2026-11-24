/**
 * UAT for `scripts/generate-api-docs.mjs` and the `docs/` staleness check in
 * `pnpm generate:check`.
 *
 * `docs/` holds the generated API reference. Two properties keep it honest:
 * regeneration replaces the whole directory, so a page for an API that no
 * longer exists cannot survive, and the clean-tree check covers `docs/`, so a
 * committed page that differs from a fresh regeneration fails CI. These tests
 * run the real script and check as subprocesses against a scratch workspace.
 *
 * @see https://github.com/mike-north/macts/issues/335
 * @see https://api-extractor.com/pages/commands/api-documenter_markdown/
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
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

/** A doc model declaring one public function, `<fn>`, in package `@x/<name>`. */
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

/** Plant a package that runs API Extractor, with its doc model when given. */
async function plantPackage(name: string, fn: string | undefined): Promise<void> {
  const dir = join(workspace, 'packages', name)
  await mkdir(join(dir, 'temp'), { recursive: true })
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({ name: `@x/${name}`, scripts: { 'api-extractor': 'api-extractor run' } })
  )
  if (fn !== undefined) await writeFile(join(dir, 'temp', `${name}.api.json`), docModel(name, fn))
}

function generate(): { status: number | null; stderr: string } {
  const run = spawnSync(process.execPath, [DOCS_SCRIPT, '--root', workspace], {
    encoding: 'utf-8',
  })
  return { status: run.status, stderr: run.stderr }
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

  it('removes a page for an export that no longer exists (stale page regression, issue 335)', async () => {
    await plantPackage('widgets', 'spin')
    await mkdir(join(workspace, 'docs'), { recursive: true })
    await writeFile(join(workspace, 'docs', 'widgets.retired.md'), 'retired\n')

    expect(generate().status).toBe(0)

    const pages = await readdir(join(workspace, 'docs'))
    expect(pages).not.toContain('widgets.retired.md')
    expect(pages).toContain('widgets.spin.md')
  })

  it('leaves the command-line and MCP packages out of the reference', async () => {
    await plantPackage('widgets', 'spin')
    await plantPackage('cli', 'run')
    await plantPackage('mcp', 'serve')

    expect(generate().status).toBe(0)

    const pages = await readdir(join(workspace, 'docs'))
    expect(pages).toContain('widgets.spin.md')
    expect(pages.filter((page) => page.startsWith('cli.') || page.startsWith('mcp.'))).toEqual([])
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
