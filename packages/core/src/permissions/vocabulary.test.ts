/**
 * Tests for the single-source operation vocabulary and a drift guard that
 * prevents any surface from re-defining the operation set or re-introducing the
 * phantom `read` *grant* (a coarse `read` used as if it authorized a call).
 *
 * Acceptance-criteria coverage (issue: permission & operation-vocabulary
 * coherence):
 *   - Criterion 1 (single source of truth + drift guard): the `single source`
 *     and `drift guard` suites below.
 *
 * The vocabulary's authority is this module for the fixed coarse set, and the
 * manifest for the app-specific fine-grained set. No other source file may
 * hand-type the coarse CRUD set.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import {
  COARSE_OPERATIONS,
  PURE_COARSE_OPERATIONS,
  WILDCARD,
  isCoarseOperation,
  isPureCoarseOperation,
  getFineOperations,
  getOperationVocabulary,
} from './vocabulary.js'
import type { PermissionsSection } from '../manifest/schemas/app.js'

const THIS_FILE = fileURLToPath(import.meta.url)

/** Representative permissions section, shaped like a real manifest. */
const samplePermissions: PermissionsSection = {
  events: {
    read: ['calendar:events:list', 'calendar:events:get', 'calendar:events:show'],
    create: ['calendar:events:create'],
    write: ['calendar:events:update'],
    delete: ['calendar:events:delete'],
  },
  calendars: {
    read: ['calendar:calendars:list', 'calendar:calendars:get'],
    create: ['calendar:calendars:create'],
  },
}

describe('COARSE_OPERATIONS (single source of truth)', () => {
  it('is exactly the fixed CRUD vocabulary', () => {
    // Derived by hand from the documented coarse alias set: read/create/write/delete.
    expect([...COARSE_OPERATIONS]).toEqual(['read', 'create', 'write', 'delete'])
  })

  it('exposes the wildcard token', () => {
    expect(WILDCARD).toBe('*')
  })
})

describe('isCoarseOperation', () => {
  it('accepts every canonical coarse operation', () => {
    for (const op of COARSE_OPERATIONS) {
      expect(isCoarseOperation(op)).toBe(true)
    }
  })

  it('rejects fine-grained operations', () => {
    // Fine-grained ops come from the manifest, not the coarse vocabulary.
    expect(isCoarseOperation('list')).toBe(false)
    expect(isCoarseOperation('get')).toBe(false)
    expect(isCoarseOperation('show')).toBe(false)
  })

  it('rejects the wildcard token (a wildcard is not coarse)', () => {
    expect(isCoarseOperation('*')).toBe(false)
  })

  it('rejects the empty string', () => {
    expect(isCoarseOperation('')).toBe(false)
  })
})

describe('PURE_COARSE_OPERATIONS / isPureCoarseOperation', () => {
  it('is exactly read and write (grouping-only aliases)', () => {
    // Derived by hand: read/write never name a real command operation, whereas
    // create/delete do, so only read/write are grouping-only.
    expect([...PURE_COARSE_OPERATIONS]).toEqual(['read', 'write'])
  })

  it('treats read and write as pure-coarse', () => {
    expect(isPureCoarseOperation('read')).toBe(true)
    expect(isPureCoarseOperation('write')).toBe(true)
  })

  it('does NOT treat create or delete as pure-coarse (they are real operations)', () => {
    expect(isPureCoarseOperation('create')).toBe(false)
    expect(isPureCoarseOperation('delete')).toBe(false)
  })

  it('does not treat fine-grained operations or wildcards as pure-coarse', () => {
    expect(isPureCoarseOperation('list')).toBe(false)
    expect(isPureCoarseOperation('*')).toBe(false)
  })
})

describe('getFineOperations (manifest is the fine-grained authority)', () => {
  it('extracts the fine-grained operation names declared by a manifest', () => {
    const fine = getFineOperations(samplePermissions)
    // Derived from samplePermissions by hand: the third segment of each value.
    expect([...fine].sort()).toEqual(['create', 'delete', 'get', 'list', 'show', 'update'])
  })

  it('never reports a grouping-only coarse alias (read/write) as fine-grained', () => {
    const fine = getFineOperations(samplePermissions)
    for (const pure of PURE_COARSE_OPERATIONS) {
      // read/write are grouping-only keys, never a real command operation.
      expect(fine.has(pure)).toBe(false)
    }
  })

  it('may report create/delete as fine-grained (they double as real operations)', () => {
    const fine = getFineOperations(samplePermissions)
    // samplePermissions declares calendar:events:create -> operation "create".
    expect(fine.has('create')).toBe(true)
  })

  it('returns an empty set for an empty permissions section', () => {
    expect(getFineOperations({}).size).toBe(0)
  })
})

describe('getOperationVocabulary', () => {
  it('combines the fixed coarse set with the manifest fine-grained set', () => {
    const vocab = getOperationVocabulary(samplePermissions)
    expect([...vocab.coarse]).toEqual(['read', 'create', 'write', 'delete'])
    expect(vocab.fine.has('list')).toBe(true)
    expect(vocab.fine.has('create')).toBe(true)
  })
})

/**
 * Recursively collect TypeScript source files (excluding tests and build
 * output) under a directory.
 */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'temp') continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      out.push(...collectSourceFiles(full))
    } else if (full.endsWith('.ts') && !full.endsWith('.test.ts') && !full.endsWith('.test-d.ts')) {
      out.push(full)
    }
  }
  return out
}

describe('drift guard: operation vocabulary has a single source', () => {
  // The coarse CRUD set must be defined exactly once. We detect a re-definition
  // by searching for the literal array of all four coarse operations in source
  // files other than vocabulary.ts.
  const coarseLiteralPattern = /\[\s*'read'\s*,\s*'create'\s*,\s*'write'\s*,\s*'delete'\s*\]/

  it('only vocabulary.ts defines the coarse operation array literal', () => {
    const coreSrc = join(dirname(THIS_FILE), '..')
    const offenders = collectSourceFiles(coreSrc).filter((file) => {
      if (file === join(dirname(THIS_FILE), 'vocabulary.ts')) return false
      return coarseLiteralPattern.test(readFileSync(file, 'utf8'))
    })
    expect(offenders.map((f) => relative(coreSrc, f))).toEqual([])
  })
})

describe('drift guard: no phantom `read` grant in shipped source or generators', () => {
  // A "phantom read grant" is a permission string ending in `:read` that is
  // presented as a *granted scope* on a key (e.g. in a CLI hint, generated
  // SDK, or example). Such a scope authorizes nothing. Legitimate uses of the
  // word remain (the coarse `read` *alias* expanded via --manifest, the
  // `permissions expand`/`list` demos, doc prose, and risk classes), so this
  // guard targets only the generator-emitted SDK hint, which is the surface an
  // agent copies verbatim.
  it('generator-emitted API-key hints never grant a coarse :read scope', () => {
    const generatorDir = join(dirname(THIS_FILE), '..', 'generator')
    const offenders: string[] = []
    for (const file of collectSourceFiles(generatorDir)) {
      const content = readFileSync(file, 'utf8')
      for (const line of content.split('\n')) {
        if (line.includes('api-key create') && /:read\b/.test(line)) {
          offenders.push(`${relative(generatorDir, file)}: ${line.trim()}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('generator-emitted API-key hints use the real --permission flag', () => {
    // The CLI flag is singular `--permission`; the plural `--permissions` is a
    // dead-end an agent would copy. Guard against that drift.
    const generatorDir = join(dirname(THIS_FILE), '..', 'generator')
    const offenders: string[] = []
    for (const file of collectSourceFiles(generatorDir)) {
      const content = readFileSync(file, 'utf8')
      for (const line of content.split('\n')) {
        if (line.includes('api-key create') && line.includes('--permissions ')) {
          offenders.push(`${relative(generatorDir, file)}: ${line.trim()}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
