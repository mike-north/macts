/**
 * Unit tests for the runtime's shared SQLite access: the experimental-warning
 * filter applied when `node:sqlite` is loaded, the transaction helper,
 * including its write-lock mode, and the bounded retry of statements SQLite
 * refuses as busy without waiting.
 *
 * @see https://nodejs.org/api/sqlite.html
 * @see https://nodejs.org/api/process.html#processemitwarningwarning-options
 * @see https://www.sqlite.org/lang_transaction.html
 * @see https://www.sqlite.org/c3ref/busy_handler.html
 * @see https://www.sqlite.org/rescode.html#busy
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  isSqliteBusyError,
  isSqliteExperimentalWarning,
  loadSqlite,
  MINIMUM_NODE_FOR_SQLITE,
  retryWhileBusy,
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

/**
 * An error shaped like the one `node:sqlite` throws for a failed statement:
 * `errcode` is SQLite's result code, whose low byte is the primary code
 * (`SQLITE_BUSY` is 5).
 */
function sqliteError(errcode: number, message: string): Error {
  return Object.assign(new Error(message), { code: 'ERR_SQLITE_ERROR', errcode })
}

/**
 * A clock and a sleep that advances it, so retry timing is observed without
 * waiting. `slept` records every requested pause.
 */
function fakeClock(start: number): {
  now: () => number
  sleep: (ms: number) => void
  slept: number[]
} {
  let current = start
  const slept: number[] = []
  return {
    now: () => current,
    sleep: (ms: number) => {
      slept.push(ms)
      current += ms
    },
    slept,
  }
}

describe('isSqliteBusyError', () => {
  it('recognizes SQLITE_BUSY (5)', () => {
    expect(isSqliteBusyError(sqliteError(5, 'database is locked'))).toBe(true)
  })

  it('recognizes an extended busy code by its primary code (SQLITE_BUSY_RECOVERY, 261)', () => {
    expect(isSqliteBusyError(sqliteError(261, 'database is locked'))).toBe(true)
  })

  it('does not treat other SQLite errors as busy (SQLITE_LOCKED is 6, SQLITE_ERROR is 1)', () => {
    expect(isSqliteBusyError(sqliteError(6, 'database table is locked'))).toBe(false)
    expect(isSqliteBusyError(sqliteError(1, 'no such table: missing'))).toBe(false)
  })

  it('does not treat errors without a numeric errcode as busy', () => {
    expect(isSqliteBusyError(new Error('database is locked'))).toBe(false)
    expect(isSqliteBusyError({ errcode: '5' })).toBe(false)
    expect(isSqliteBusyError(undefined)).toBe(false)
  })
})

describe('retryWhileBusy', () => {
  const START = 1_000_000
  const BUDGET_MS = 5000

  it('returns the first result without pausing when the operation succeeds at once', () => {
    const clock = fakeClock(START)
    const operation = vi.fn(() => 'done')

    expect(retryWhileBusy(operation, { deadline: START + BUDGET_MS, ...clock })).toBe('done')
    expect(operation).toHaveBeenCalledTimes(1)
    expect(clock.slept).toEqual([])
  })

  it('retries a busy failure until the operation succeeds, pausing between attempts', () => {
    const clock = fakeClock(START)
    const failures = 3
    let calls = 0
    const operation = vi.fn(() => {
      calls += 1
      if (calls <= failures) {
        throw sqliteError(5, 'database is locked')
      }
      return 'wal'
    })

    expect(retryWhileBusy(operation, { deadline: START + BUDGET_MS, ...clock })).toBe('wal')
    expect(operation).toHaveBeenCalledTimes(failures + 1)
    // One pause after each busy failure, each a short positive wait.
    expect(clock.slept).toHaveLength(failures)
    for (const pause of clock.slept) {
      expect(pause).toBeGreaterThan(0)
      expect(pause).toBeLessThan(BUDGET_MS)
    }
    expect(clock.now()).toBeLessThan(START + BUDGET_MS)
  })

  it('rethrows the busy error itself once the deadline passes, never waiting beyond it', () => {
    const clock = fakeClock(START)
    const busy = sqliteError(5, 'database is locked')
    const operation = vi.fn((): never => {
      throw busy
    })

    let thrown: unknown
    try {
      retryWhileBusy(operation, { deadline: START + BUDGET_MS, ...clock })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBe(busy)
    // It kept retrying across the budget, then stopped exactly at the deadline:
    // the pauses add up to the budget and no pause reaches past it.
    expect(operation.mock.calls.length).toBeGreaterThan(1)
    expect(clock.slept.reduce((total, pause) => total + pause, 0)).toBe(BUDGET_MS)
    expect(clock.now()).toBe(START + BUDGET_MS)
  })

  it('makes exactly one attempt when the deadline has already passed', () => {
    const clock = fakeClock(START)
    const busy = sqliteError(5, 'database is locked')
    const operation = vi.fn((): never => {
      throw busy
    })

    expect(() => retryWhileBusy(operation, { deadline: START, ...clock })).toThrow(busy)
    expect(operation).toHaveBeenCalledTimes(1)
    expect(clock.slept).toEqual([])
  })

  it('rethrows any other error at once, without retrying', () => {
    const clock = fakeClock(START)
    const other = sqliteError(1, 'no such table: missing')
    const operation = vi.fn((): never => {
      throw other
    })

    expect(() => retryWhileBusy(operation, { deadline: START + BUDGET_MS, ...clock })).toThrow(
      other
    )
    expect(operation).toHaveBeenCalledTimes(1)
    expect(clock.slept).toEqual([])
  })
})

describe('retryWhileBusy with a real busy database', () => {
  let directory: string
  let holder: SqliteDatabase
  let waiter: SqliteDatabase

  beforeEach(() => {
    const { DatabaseSync } = loadSqlite()
    directory = mkdtempSync(join(tmpdir(), 'macts-sqlite-busy-'))
    const file = join(directory, 'busy.db')
    holder = new DatabaseSync(file)
    holder.exec('CREATE TABLE items (value TEXT NOT NULL)')
    waiter = new DatabaseSync(file)
    // Fail at once rather than wait, so SQLite reports the lock as SQLITE_BUSY.
    waiter.exec('PRAGMA busy_timeout = 0')
  })

  afterEach(() => {
    waiter.close()
    holder.close()
    rmSync(directory, { recursive: true, force: true })
  })

  it("recognizes node:sqlite's busy error and succeeds once the lock is released", () => {
    holder.exec('BEGIN EXCLUSIVE')
    const failures: unknown[] = []
    let released = false

    retryWhileBusy(
      () => {
        try {
          waiter.exec('BEGIN IMMEDIATE')
        } catch (error) {
          failures.push(error)
          throw error
        }
      },
      {
        deadline: Date.now() + 5000,
        // The other connection releases its lock during the first pause.
        sleep: () => {
          if (!released) {
            holder.exec('ROLLBACK')
            released = true
          }
        },
      }
    )
    waiter.exec('ROLLBACK')

    expect(failures).toHaveLength(1)
    expect(isSqliteBusyError(failures[0])).toBe(true)
  })
})
