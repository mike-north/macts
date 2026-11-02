/**
 * Tests for resolving an installed package's subpath export, including Node's
 * exports sugar for the `.` export.
 *
 * @see https://nodejs.org/api/packages.html#subpath-exports
 * @see https://nodejs.org/api/packages.html#exports-sugar
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { declaresExport, resolvePackageExport } from './package-exports.js'

let packageDir: string

beforeEach(() => {
  packageDir = mkdtempSync(join(tmpdir(), 'macts-package-exports-'))
  writeFileSync(join(packageDir, 'index.js'), 'export {}\n')
})

afterEach(() => {
  rmSync(packageDir, { recursive: true, force: true })
})

/** Write the package's package.json with the given `exports` field. */
function writeExports(exportsField: unknown): unknown {
  const pkg = { name: '@macts/example', type: 'module', exports: exportsField }
  writeFileSync(join(packageDir, 'package.json'), JSON.stringify(pkg))
  return pkg
}

const INDEX_URL = (): string => pathToFileURL(join(packageDir, 'index.js')).href

describe('resolvePackageExport', () => {
  it('resolves the "." entry of a subpath exports map', () => {
    writeExports({ '.': { types: './index.d.ts', import: './index.js' } })
    expect(resolvePackageExport(packageDir, '@macts/example', '.')).toEqual({
      found: true,
      url: INDEX_URL(),
    })
  })

  // Exports sugar: a string `exports` field is the "." export.
  it('resolves "." from a string exports field', () => {
    writeExports('./index.js')
    expect(resolvePackageExport(packageDir, '@macts/example', '.')).toEqual({
      found: true,
      url: INDEX_URL(),
    })
  })

  // Exports sugar: a conditions object with no "." keys is the "." export.
  it('resolves "." from a top-level conditions object', () => {
    writeExports({ types: './index.d.ts', import: './index.js' })
    expect(resolvePackageExport(packageDir, '@macts/example', '.')).toEqual({
      found: true,
      url: INDEX_URL(),
    })
  })

  it('does not resolve a named subpath from exports sugar', () => {
    writeExports('./index.js')
    expect(resolvePackageExport(packageDir, '@macts/example', './cli')).toMatchObject({
      found: false,
      reason: 'load-error',
    })
  })

  it('reports a "." export whose target file is missing', () => {
    writeExports({ '.': { import: './dist/index.js' } })
    const result = resolvePackageExport(packageDir, '@macts/example', '.')
    expect(result).toMatchObject({ found: false, reason: 'load-error' })
    expect(result.found ? '' : result.error).toContain('points to a missing file')
  })

  it('rejects a target that escapes the package directory', () => {
    mkdirSync(join(packageDir, 'sub'))
    writeExports({ '.': { import: '../outside.js' } })
    const result = resolvePackageExport(packageDir, '@macts/example', '.')
    expect(result.found ? '' : result.error).toContain('is invalid')
  })
})

describe('declaresExport', () => {
  it('treats both sugar forms as declaring "."', () => {
    expect(declaresExport({ exports: './index.js' }, '.')).toBe(true)
    expect(declaresExport({ exports: { import: './index.js' } }, '.')).toBe(true)
  })

  it('does not treat a subpath map without "." as declaring "."', () => {
    expect(declaresExport({ exports: { './cli': './cli.js' } }, '.')).toBe(false)
  })

  it('does not treat a package without exports as declaring "."', () => {
    expect(declaresExport({ name: '@macts/example' }, '.')).toBe(false)
  })
})
