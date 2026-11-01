/**
 * UAT for the tree check behind `pnpm generate:check`.
 *
 * `generate:check` regenerates every package, then runs
 * `scripts/check-clean-tree.mjs packages`. These tests run that script as a
 * subprocess inside a scratch git repository, so they check exactly what CI
 * sees: the exit status, and the paths named on stderr. A plain `git diff`
 * misses an untracked or deleted generated file; the check must not.
 *
 * @see https://github.com/mike-north/macts/issues/179
 * @see https://git-scm.com/docs/git-status#_porcelain_format_version_1
 */

import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const REPO_ROOT = resolve(process.cwd(), '../..')
const CHECK_SCRIPT = join(REPO_ROOT, 'scripts', 'check-clean-tree.mjs')

/**
 * A git environment isolated from the developer's own configuration (hooks,
 * signing, identity), so commits in the scratch repository always succeed.
 */
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'macts test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'macts test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
}

let repo: string

function git(...args: string[]): void {
  const run = spawnSync('git', args, { cwd: repo, env: GIT_ENV, encoding: 'utf-8' })
  if (run.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${run.stderr}`)
}

async function plant(path: string, content: string): Promise<void> {
  await mkdir(dirname(join(repo, path)), { recursive: true })
  await writeFile(join(repo, path), content, 'utf-8')
}

/** Run the check over `packages` in the scratch repository. */
function check(): { status: number | null; stderr: string } {
  const run = spawnSync(process.execPath, [CHECK_SCRIPT, 'packages'], {
    cwd: repo,
    env: GIT_ENV,
    encoding: 'utf-8',
  })
  return { status: run.status, stderr: run.stderr }
}

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), 'macts-generate-check-'))
  git('init', '--quiet')
  await plant('.gitignore', 'dist/\nnode_modules/\n')
  await plant('packages/widgets/.macts-generated.json', '{"files": ["src/index.ts"]}\n')
  await plant('packages/widgets/src/index.ts', 'export {}\n')
  await plant('README.md', '# scratch\n')
  git('add', '.')
  git('commit', '--quiet', '-m', 'initial')
})

afterEach(async () => {
  await rm(repo, { recursive: true, force: true })
})

describe('generate:check', () => {
  it('runs the tree check over packages after regenerating', async () => {
    const pkg = JSON.parse(await readFile(join(REPO_ROOT, 'package.json'), 'utf-8')) as {
      scripts: Record<string, string>
    }
    expect(pkg.scripts['generate:check']).toBe(
      'node scripts/regenerate.mjs && node scripts/check-clean-tree.mjs packages'
    )
  })
})

describe('check-clean-tree', () => {
  it('passes on a clean tree', () => {
    expect(check()).toEqual({ status: 0, stderr: '' })
  })

  it('fails on a planted untracked file and names it', async () => {
    await plant('packages/widgets/src/cli/commands/widgets/stale.ts', 'export {}\n')

    const { status, stderr } = check()

    expect(status).toBe(1)
    expect(stderr).toContain('untracked packages/widgets/src/cli/commands/widgets/stale.ts')
  })

  it('fails on a deleted file and names it', async () => {
    await unlink(join(repo, 'packages/widgets/src/index.ts'))

    const { status, stderr } = check()

    expect(status).toBe(1)
    expect(stderr).toContain('deleted   packages/widgets/src/index.ts')
  })

  it('fails on a modified file, names it, and shows the diff', async () => {
    await plant('packages/widgets/.macts-generated.json', '{"files": []}\n')

    const { status, stderr } = check()

    expect(status).toBe(1)
    expect(stderr).toContain('modified  packages/widgets/.macts-generated.json')
    expect(stderr).toContain('+{"files": []}')
  })

  it('ignores changes outside packages', async () => {
    await plant('README.md', '# changed\n')
    await plant('scratch/notes.md', 'notes\n')

    expect(check().status).toBe(0)
  })

  it('ignores files the repository ignores, such as build output', async () => {
    await plant('packages/widgets/dist/index.js', 'export {}\n')

    expect(check().status).toBe(0)
  })

  it('fails to run, rather than passing, outside a git repository', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'macts-generate-check-outside-'))
    try {
      const run = spawnSync(process.execPath, [CHECK_SCRIPT, 'packages'], {
        cwd: outside,
        env: { ...GIT_ENV, GIT_CEILING_DIRECTORIES: dirname(outside) },
        encoding: 'utf-8',
      })
      expect(run.status).toBe(2)
    } finally {
      await rm(outside, { recursive: true, force: true })
    }
  })

  it('fails to run without a path', () => {
    const run = spawnSync(process.execPath, [CHECK_SCRIPT], { cwd: repo, encoding: 'utf-8' })
    expect(run.status).toBe(2)
    expect(run.stderr).toContain('Usage:')
  })
})
