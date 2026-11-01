/**
 * Tests for the two entry points' shape: what each exports, and that the
 * built remote entry never loads the Mac-side runtime.
 *
 * phases/13 D1 fixes both: `@macts/sdk` and `@macts/sdk/local` re-export the
 * same contract bindings (one identity per error class), and the root entry
 * imports only `@macts/contracts`, so a remote client never loads native
 * execution. The isolation check inspects the built `dist` import graph,
 * because that, not the source, is what an installed package loads.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D1)
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as contracts from '@macts/contracts'
import * as remote from './index.js'
import * as local from './local.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(packageRoot, 'dist')

/** Every module specifier a built ESM file imports or re-exports, statically or dynamically. */
function specifiersOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ]
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1] ?? ''))
}

/**
 * The bare package specifiers reachable from a built entry file, following
 * relative imports (shared chunks) transitively.
 */
function packagesReachableFrom(entry: string): Set<string> {
  const packages = new Set<string>()
  const seen = new Set<string>()
  const queue = [join(dist, entry)]
  while (queue.length > 0) {
    const file = queue.pop()
    if (file === undefined || seen.has(file)) continue
    seen.add(file)
    for (const specifier of specifiersOf(file)) {
      if (specifier.startsWith('.')) {
        queue.push(resolve(dirname(file), specifier))
      } else {
        packages.add(specifier)
      }
    }
  }
  return packages
}

/** Read the package manifest. */
function packageJson(): {
  exports: Record<string, { types: string; import: string }>
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
} {
  return JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as ReturnType<
    typeof packageJson
  >
}

describe('entry points: exports', () => {
  it('re-export every public symbol of @macts/contracts as the same binding', () => {
    for (const [name, value] of Object.entries(contracts)) {
      expect(remote, name).toHaveProperty(name)
      expect(local, name).toHaveProperty(name)
      expect((remote as Record<string, unknown>)[name], name).toBe(value)
      expect((local as Record<string, unknown>)[name], name).toBe(value)
    }
  })

  it('export the same error class bindings, so instanceof works across them', () => {
    const error = new local.TargetNotFoundError('gone', {})
    expect(remote.TargetNotFoundError).toBe(local.TargetNotFoundError)
    expect(error).toBeInstanceOf(remote.TargetNotFoundError)
    expect(error).toBeInstanceOf(remote.MactsError)
  })

  it('each export a createClient factory of their own', () => {
    expect(typeof remote.createClient).toBe('function')
    expect(typeof local.createClient).toBe('function')
    expect(remote.createClient).not.toBe(local.createClient)
  })

  it('map both subpaths to built files', () => {
    const { exports } = packageJson()
    expect(Object.keys(exports).sort()).toEqual(['.', './local'])
    for (const target of Object.values(exports)) {
      expect(existsSync(join(packageRoot, target.import)), target.import).toBe(true)
    }
  })

  it('depend on no app package and declare no peer dependencies', () => {
    const { dependencies = {}, peerDependencies } = packageJson()
    expect(Object.keys(dependencies).sort()).toEqual([
      '@macts/contracts',
      '@macts/core',
      '@macts/runtime',
    ])
    expect(peerDependencies).toBeUndefined()
  })
})

describe('entry points: built import graph', () => {
  it('the remote entry reaches only @macts/contracts, never the runtime or core', () => {
    const reachable = packagesReachableFrom('index.js')

    expect([...reachable].sort()).toEqual(['@macts/contracts'])
  })

  it('the local entry reaches the runtime and core', () => {
    const reachable = packagesReachableFrom('local.js')

    expect(reachable).toContain('@macts/runtime')
    expect(reachable).toContain('@macts/core')
    expect(reachable).toContain('@macts/contracts')
  })
})
