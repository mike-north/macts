/**
 * Opening the transfer store's database: the schema-version rule and
 * waiting for another process's lock.
 *
 * A fresh database gets the schema and version 1 in one transaction; a
 * database at version 1 is used as it is; any other version (a newer macts's,
 * or one this code never wrote) is refused and left untouched. The busy
 * timeout is in force before the first statement that needs a lock.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D8)
 * @see https://www.sqlite.org/pragma.html#pragma_user_version
 * @see https://www.sqlite.org/pragma.html#pragma_busy_timeout
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadSqlite, type SqliteDatabase } from '../storage/sqlite.js'
import { createTransferStore } from './store.js'

/** Run `work` on a raw connection to the store's database file. */
function withRawDatabase<T>(home: string, work: (database: SqliteDatabase) => T): T {
  const { DatabaseSync } = loadSqlite()
  const database = new DatabaseSync(join(home, 'transfers', 'transfers.db'))
  try {
    return work(database)
  } finally {
    database.close()
  }
}

function schemaVersion(home: string): number {
  return withRawDatabase(home, (database) =>
    Number(database.prepare('PRAGMA user_version').get()?.['user_version'])
  )
}

function tableNames(home: string): string[] {
  return withRawDatabase(home, (database) =>
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => String(row['name']))
  )
}

describe('transfer database schema version', () => {
  let home: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'macts-transfers-db-'))
  })

  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
  })

  it('creates the schema at version 1 in a fresh database', async () => {
    const store = await createTransferStore({ home })
    store.close()

    expect(schemaVersion(home)).toBe(1)
    expect(tableNames(home)).toEqual(['download_links', 'grants', 'temporary_copies', 'uploads'])
  })

  it('touches nothing in a database already at version 1', async () => {
    ;(await createTransferStore({ home })).close()
    withRawDatabase(home, (database) => {
      database.exec('DROP INDEX idx_grants_expires_at')
    })
    ;(await createTransferStore({ home })).close()

    // Re-running the schema would have recreated the index.
    const indexes = withRawDatabase(home, (database) =>
      database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?")
        .all('idx_grants_expires_at')
    )
    expect(indexes).toEqual([])
    expect(schemaVersion(home)).toBe(1)
  })

  it('refuses a database created by a newer macts, leaving its version as it was', async () => {
    ;(await createTransferStore({ home })).close()
    withRawDatabase(home, (database) => {
      database.exec('PRAGMA user_version = 2')
    })

    await expect(createTransferStore({ home })).rejects.toThrow(
      /created by a newer version of macts \(schema version 2\).*cannot open it/
    )
    expect(schemaVersion(home)).toBe(2)
  })

  it('refuses a version this macts never wrote, leaving it as it was', async () => {
    // Version 1 is the first, so no version between 0 and it exists; a
    // negative version stands in for any version this code does not know.
    ;(await createTransferStore({ home })).close()
    withRawDatabase(home, (database) => {
      database.exec('PRAGMA user_version = -1')
    })

    await expect(createTransferStore({ home })).rejects.toThrow(
      /schema version -1, which this version of macts does not recognize/
    )
    expect(schemaVersion(home)).toBe(-1)
  })
})

describe('opening while another process holds the lock', () => {
  let home: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'macts-transfers-lock-'))
  })

  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
  })

  it('waits for the lock on a fresh home instead of failing', async () => {
    mkdirSync(join(home, 'transfers'), { mode: 0o700 })
    const databaseFile = join(home, 'transfers', 'transfers.db')
    // A separate process creates the database file and holds an exclusive
    // lock on it for a moment, as a concurrently opening process would.
    const holder = spawn(
      process.execPath,
      [
        '--no-warnings',
        '--input-type=module',
        '-e',
        [
          `const { DatabaseSync } = process.getBuiltinModule('node:sqlite')`,
          `const database = new DatabaseSync(${JSON.stringify(databaseFile)})`,
          `database.exec('BEGIN EXCLUSIVE')`,
          `process.stdout.write('locked\\n')`,
          `setTimeout(() => { database.exec('ROLLBACK'); database.close() }, 400)`,
        ].join('\n'),
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] }
    )
    const exited = new Promise<number | null>((resolve) => holder.on('exit', resolve))
    await new Promise<void>((resolve, reject) => {
      holder.stdout.on('data', (data: Buffer) => {
        if (data.toString().includes('locked')) resolve()
      })
      holder.on('error', reject)
    })

    const store = await createTransferStore({ home })
    store.close()

    expect(await exited).toBe(0)
    expect(schemaVersion(home)).toBe(1)
  })
})
