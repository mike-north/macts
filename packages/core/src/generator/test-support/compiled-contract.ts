/**
 * Test-only support for compiling a generated contract in a temporary
 * package and calling the client it binds.
 *
 * A temporary package gets a strict tsconfig extending the workspace base, a
 * link to the workspace `@macts/contracts`, and is compiled with the
 * workspace TypeScript compiler, so a generated contract is checked exactly
 * as a consumer of the published packages would check it.
 *
 * Paths are resolved from the working directory, which vitest sets to the
 * core package root.
 *
 * This module is not exported from the package.
 */

import { spawnSync } from 'node:child_process'
import { mkdir, symlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const PACKAGE_ROOT = process.cwd()
/** The workspace root. */
export const REPO_ROOT = resolve(PACKAGE_ROOT, '../..')
const CONTRACTS_PACKAGE = resolve(PACKAGE_ROOT, '../contracts')
const TSC = resolve(PACKAGE_ROOT, 'node_modules/typescript/bin/tsc')

/** A strict tsconfig for a temporary package that resolves `@macts/contracts`. */
export function tsconfig(include: readonly string[], noEmit: boolean): string {
  return JSON.stringify({
    extends: join(REPO_ROOT, 'tsconfig.base.json'),
    compilerOptions: {
      rootDir: '.',
      outDir: 'dist',
      noEmit,
      declaration: false,
      declarationMap: false,
      sourceMap: false,
      typeRoots: [join(REPO_ROOT, 'node_modules', '@types')],
      types: ['node'],
    },
    include,
  })
}

/** Link the workspace `@macts/contracts` into a temporary package. */
export async function linkContracts(dir: string): Promise<void> {
  await mkdir(join(dir, 'node_modules', '@macts'), { recursive: true })
  await symlink(CONTRACTS_PACKAGE, join(dir, 'node_modules', '@macts', 'contracts'), 'dir')
}

/** Type-check (and, unless `noEmit`, compile) a temporary package. */
export function runTsc(dir: string): { status: number | null; output: string } {
  const tsc = spawnSync(process.execPath, [TSC, '-p', join(dir, 'tsconfig.json')], {
    encoding: 'utf-8',
  })
  return { status: tsc.status, output: `${tsc.stdout}${tsc.stderr}` }
}

/** The own enumerable members of the object at `path` under `root`. */
export function objectAt(root: unknown, path: readonly string[]): Record<string, unknown> {
  let current: unknown = root
  for (const key of path) {
    if (typeof current !== 'object' || current === null) throw new Error(`no ${path.join('.')}`)
    current = Reflect.get(current, key)
  }
  if (typeof current !== 'object' || current === null) throw new Error(`no ${path.join('.')}`)
  return Object.fromEntries(Object.entries(current))
}

/** Call the client method at `path` (e.g. `['notes', 'get']`) with `args`. */
export async function call(
  client: unknown,
  path: readonly string[],
  ...args: unknown[]
): Promise<unknown> {
  const owner = objectAt(client, path.slice(0, -1))
  const method = owner[path[path.length - 1] ?? '']
  if (typeof method !== 'function') throw new Error(`no method ${path.join('.')}`)
  const result: unknown = await Reflect.apply(method, owner, args)
  return result
}
