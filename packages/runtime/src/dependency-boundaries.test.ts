/**
 * The runtime installs no native addon and references `node:sqlite` from one
 * module only (phases/13, D1).
 *
 * Both persistent stores share the one SQLite load site in
 * `storage/sqlite.ts`, which keeps Node's experimental-warning filter in one
 * place. A second binding, a second load site, or a new runtime dependency
 * would each undo a guarantee, so the package's dependency list is pinned
 * here: adding one is a deliberate change to this test.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D1)
 * @see https://nodejs.org/api/sqlite.html
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = dirname(fileURLToPath(import.meta.url))
const packageRoot = dirname(sourceRoot)

/** Every non-test TypeScript module under `src`, relative to it, with `/` separators. */
function productionModules(): string[] {
  return readdirSync(sourceRoot, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .filter((file) => !/\.test(-d)?\.ts$/.test(file) && !file.endsWith('-test-helpers.ts'))
    .map((file) => file.split(sep).join('/'))
    .sort()
}

describe('dependency boundaries', () => {
  it('declares exactly its existing runtime dependencies, and no optional or peer ones', () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as Record<
      string,
      unknown
    >
    expect(Object.keys(manifest['dependencies'] as Record<string, string>).sort()).toEqual([
      '@macts/contracts',
      '@macts/core',
      'jose',
      'pino',
      'zod',
    ])
    expect(manifest['optionalDependencies']).toBeUndefined()
    expect(manifest['peerDependencies']).toBeUndefined()
  })

  it('references node:sqlite from exactly one module', () => {
    const referencing = productionModules().filter((file) =>
      /['"]node:sqlite['"]/.test(readFileSync(join(sourceRoot, file), 'utf8'))
    )
    expect(referencing).toEqual(['storage/sqlite.ts'])
  })

  it('names no other SQLite binding anywhere in the source', () => {
    const bindings = /['"](better-sqlite3|@photostructure\/sqlite|sqlite3|sql\.js)['"]/
    const offending = productionModules().filter((file) =>
      bindings.test(readFileSync(join(sourceRoot, file), 'utf8'))
    )
    expect(offending).toEqual([])
  })
})
