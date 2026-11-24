/**
 * Unit tests for how the API-key store opens its database.
 *
 * Opening must set the busy timeout before the first statement that can take a
 * lock, and must route the switch to WAL through the shared
 * {@link retryWhileBusy} helper, because SQLite refuses that switch as busy
 * without waiting when several processes open a fresh database together.
 *
 * @see https://www.sqlite.org/pragma.html#pragma_busy_timeout
 * @see https://www.sqlite.org/wal.html
 * @see https://www.sqlite.org/c3ref/busy_handler.html
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { loadSqlite } from '../storage/sqlite.js'

/** Index range, within the `exec` calls, of the statements each retry ran. */
const retryRanges: { from: number; to: number }[] = []
let execSpy: { mock: { calls: [string][] } } | undefined
const retryCalls: { deadline: number }[] = []

vi.mock('../storage/sqlite.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../storage/sqlite.js')>()
  return {
    ...actual,
    retryWhileBusy: <T>(operation: () => T, options: { deadline: number }): T => {
      retryCalls.push({ deadline: options.deadline })
      const from = execSpy?.mock.calls.length ?? 0
      try {
        return actual.retryWhileBusy(operation, options)
      } finally {
        retryRanges.push({ from, to: execSpy?.mock.calls.length ?? 0 })
      }
    },
  }
})

describe('opening the key store', () => {
  let tempHome: string
  let originalHome: string | undefined
  let storage: typeof import('./storage.js')

  beforeEach(async () => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-keystore-open-'))
    originalHome = process.env['MACTS_HOME']
    process.env['MACTS_HOME'] = tempHome
    retryRanges.length = 0
    execSpy = vi.spyOn(loadSqlite().DatabaseSync.prototype, 'exec')
    retryCalls.length = 0
    vi.resetModules()
    storage = await import('./storage.js')
  })

  afterEach(() => {
    storage.closeKeyStore()
    vi.restoreAllMocks()
    if (originalHome === undefined) {
      delete process.env['MACTS_HOME']
    } else {
      process.env['MACTS_HOME'] = originalHome
    }
    fs.rmSync(tempHome, { recursive: true, force: true })
  })

  it('switches to WAL through the shared busy retry, bounded by the busy timeout (issue #329)', () => {
    const before = Date.now()
    storage.loadKeyMetadata()
    const after = Date.now()

    const statements = (execSpy?.mock.calls ?? []).map(([sql]) => sql)
    const walAt = statements.findIndex((sql) => sql.includes('journal_mode'))
    expect(walAt).toBeGreaterThanOrEqual(0)
    expect(retryRanges).toHaveLength(1)
    // The WAL switch ran inside the retry, and was the only statement it ran.
    expect(retryRanges[0]).toEqual({ from: walAt, to: walAt + 1 })
    expect(retryCalls).toHaveLength(1)
    // The deadline is the 5000 ms busy timeout from a moment during the open.
    const deadline = retryCalls[0]?.deadline ?? 0
    expect(deadline).toBeGreaterThanOrEqual(before + 5000)
    expect(deadline).toBeLessThanOrEqual(after + 5000)
  })

  it('sets the busy timeout before any statement that can take a lock (issue #329)', () => {
    storage.loadKeyMetadata()

    const statements = (execSpy?.mock.calls ?? []).map(([sql]) => sql)
    expect(statements[0]).toContain('busy_timeout')
    expect(statements.length).toBeGreaterThan(1)
  })
})
