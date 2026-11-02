/**
 * Unit tests for the runtime's shared SQLite access: the experimental-warning
 * filter applied when `node:sqlite` is loaded, and the transaction helper,
 * including its write-lock mode.
 *
 * @see https://nodejs.org/api/sqlite.html
 * @see https://nodejs.org/api/process.html#processemitwarningwarning-options
 * @see https://www.sqlite.org/lang_transaction.html
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  isSqliteExperimentalWarning,
  loadSqlite,
  MINIMUM_NODE_FOR_SQLITE,
  runInTransaction,
  type SqliteDatabase,
} from './sqlite.js'

/** The exact notice Node 22 and 24 emit the first time `node:sqlite` loads. */
const SQLITE_NOTICE = 'SQLite is an experimental feature and might change at any time'

describe('isSqliteExperimentalWarning', () => {
  describe('recognizes the SQLite experimental notice in every emitWarning shape', () => {
    it('as (message, type)', () => {
      expect(isSqliteExperimentalWarning(SQLITE_NOTICE, 'ExperimentalWarning')).toBe(true)
    })

    it('as (message, { type })', () => {
      expect(isSqliteExperimentalWarning(SQLITE_NOTICE, { type: 'ExperimentalWarning' })).toBe(true)
    })

    it('as an Error named ExperimentalWarning', () => {
      const warning = new Error(SQLITE_NOTICE)
      warning.name = 'ExperimentalWarning'
      expect(isSqliteExperimentalWarning(warning, undefined)).toBe(true)
    })
  })

  describe('lets every other warning through', () => {
    it('an experimental warning about a different feature', () => {
      expect(
        isSqliteExperimentalWarning(
          'WASI is an experimental feature and might change at any time',
          'ExperimentalWarning'
        )
      ).toBe(false)
    })

    it('a non-experimental warning that mentions SQLite', () => {
      expect(isSqliteExperimentalWarning('SQLite database is large', 'CustomWarning')).toBe(false)
      expect(isSqliteExperimentalWarning('SQLite database is large', { type: 'Warning' })).toBe(
        false
      )
    })

    it('a warning with no type (defaults to "Warning")', () => {
      expect(isSqliteExperimentalWarning(SQLITE_NOTICE, undefined)).toBe(false)
    })

    it('an Error with a SQLite message but a different name', () => {
      expect(isSqliteExperimentalWarning(new Error(SQLITE_NOTICE), undefined)).toBe(false)
    })

    it('a non-string, non-Error warning value', () => {
      expect(isSqliteExperimentalWarning(42, 'ExperimentalWarning')).toBe(false)
    })
  })
})

describe('loadSqlite', () => {
  it('returns the built-in module', () => {
    expect(typeof loadSqlite().DatabaseSync).toBe('function')
  })

  it('leaves process.emitWarning exactly as it found it', async () => {
    // A fresh module instance, so the load (and its temporary wrapper) actually
    // runs rather than returning the memoized module.
    vi.resetModules()
    const fresh = await import('./sqlite.js')
    const before = Object.getOwnPropertyDescriptor(process, 'emitWarning')
    expect(before?.value).toBeTypeOf('function')

    fresh.loadSqlite()

    expect(Object.getOwnPropertyDescriptor(process, 'emitWarning')).toEqual(before)
  })
})

describe('runInTransaction', () => {
  let database: SqliteDatabase

  /** Every value currently stored, in insertion order. */
  function storedValues(): string[] {
    const rows = database.prepare('SELECT value FROM items ORDER BY rowid').all()
    return rows.map((row) => String(row['value']))
  }

  beforeEach(() => {
    const { DatabaseSync } = loadSqlite()
    database = new DatabaseSync(':memory:')
    database.exec('CREATE TABLE items (value TEXT NOT NULL UNIQUE)')
    database.prepare('INSERT INTO items (value) VALUES (?)').run('existing')
  })

  afterEach(() => {
    database.close()
  })

  it('commits every statement when the work returns', () => {
    runInTransaction(database, () => {
      database.prepare('INSERT INTO items (value) VALUES (?)').run('a')
      database.prepare('INSERT INTO items (value) VALUES (?)').run('b')
    })

    expect(storedValues()).toEqual(['existing', 'a', 'b'])
  })

  it('returns what the work returns', () => {
    const result = runInTransaction(database, () =>
      database.prepare('DELETE FROM items WHERE value = ?').run('existing')
    )

    expect(Number(result.changes)).toBe(1)
  })

  it('rolls back on throw, leaving the table unchanged', () => {
    const failure = new Error('work failed midway')

    expect(() =>
      runInTransaction(database, () => {
        database.prepare('INSERT INTO items (value) VALUES (?)').run('a')
        database.prepare('DELETE FROM items WHERE value = ?').run('existing')
        throw failure
      })
    ).toThrow(failure)

    expect(storedValues()).toEqual(['existing'])
  })

  it('rolls back when a statement inside the work fails', () => {
    expect(() => {
      runInTransaction(database, () => {
        database.prepare('INSERT INTO items (value) VALUES (?)').run('a')
        // Violates the UNIQUE constraint.
        database.prepare('INSERT INTO items (value) VALUES (?)').run('existing')
      })
    }).toThrow(/UNIQUE/)

    expect(storedValues()).toEqual(['existing'])
  })

  it('leaves the connection usable for a new transaction after a rollback', () => {
    expect(() =>
      runInTransaction(database, () => {
        throw new Error('first attempt fails')
      })
    ).toThrow('first attempt fails')

    runInTransaction(database, () => {
      database.prepare('INSERT INTO items (value) VALUES (?)').run('second')
    })

    expect(storedValues()).toEqual(['existing', 'second'])
  })
})

describe('runInTransaction write locking', () => {
  let directory: string
  let first: SqliteDatabase
  let second: SqliteDatabase

  beforeEach(() => {
    const { DatabaseSync } = loadSqlite()
    directory = mkdtempSync(join(tmpdir(), 'macts-sqlite-'))
    const file = join(directory, 'locking.db')
    first = new DatabaseSync(file)
    first.exec('PRAGMA journal_mode = WAL')
    first.exec('CREATE TABLE items (value TEXT NOT NULL)')
    second = new DatabaseSync(file)
    // Fail at once rather than wait, so a held write lock is observable.
    second.exec('PRAGMA busy_timeout = 0')
  })

  afterEach(() => {
    second.close()
    first.close()
    rmSync(directory, { recursive: true, force: true })
  })

  /** Whether `second` can take the write lock right now. */
  function secondCanWrite(): boolean {
    try {
      second.exec('BEGIN IMMEDIATE')
      second.exec('ROLLBACK')
      return true
    } catch {
      return false
    }
  }

  it('takes no write lock before the first write by default', () => {
    const observed = runInTransaction(first, () => {
      first.prepare('SELECT COUNT(*) FROM items').get()
      return secondCanWrite()
    })
    expect(observed).toBe(true)
  })

  it('takes the write lock when the transaction begins with { immediate: true }', () => {
    const observed = runInTransaction(
      first,
      () => {
        first.prepare('SELECT COUNT(*) FROM items').get()
        return secondCanWrite()
      },
      { immediate: true }
    )
    expect(observed).toBe(false)
    // Released once the transaction ends.
    expect(secondCanWrite()).toBe(true)
  })
})

describe('MINIMUM_NODE_FOR_SQLITE', () => {
  it('equals the minimum Node.js version the package declares in engines.node', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
    ) as { engines: { node: string } }
    // engines.node is a single lower bound of the form ">=X.Y.Z".
    expect(manifest.engines.node).toBe(`>=${MINIMUM_NODE_FOR_SQLITE}`)
  })
})
