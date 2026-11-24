/**
 * Temporary copies: files materialized for a local read. The store mints
 * every copy's path itself, the caller writes and releases the copy, and the
 * sweep removes abandoned ones. The store deletes only regular files it
 * named, directly inside its canonical copies directory.
 *
 * Expected values come from phases/13 D8 ("TemporaryFileCopy", "Limits and
 * lifecycle") and the documented limits: a temporary copy is kept at most 60
 * minutes.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D8)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { loadSqlite } from '../storage/sqlite.js'
import { ALICE, MINUTE, rejectionOf, useTransferStore } from './transfer-test-helpers.js'

/**
 * Paths whose `unlink` the filesystem is made to refuse, with the error code
 * it refuses with and whether the path is a directory by then (the swap the
 * refusal stands for). Everything else passes through to the real
 * `node:fs/promises`.
 */
const refusedUnlinks = vi.hoisted(
  () => new Map<string, { code: string; becomesDirectory: boolean }>()
)

/**
 * Paths whose `lstat` fails with the given code once an `unlink` of the same
 * path has been refused: the follow-up check the store makes to tell a
 * directory swap from an undeletable file, failing for a reason other than
 * the path being absent.
 */
const failingLstats = vi.hoisted(() => new Map<string, string>())

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs/promises')>()
  /** Paths whose unlink was refused, so only the follow-up `lstat` fails. */
  const refused = new Set<string>()
  return {
    ...real,
    lstat: (file: Parameters<typeof real.lstat>[0], ...rest: unknown[]) => {
      const code = failingLstats.get(String(file))
      if (code !== undefined && refused.has(String(file))) {
        return Promise.reject(Object.assign(new Error(`${code}: lstat failed`), { code }))
      }
      return (real.lstat as (...args: unknown[]) => Promise<unknown>)(file, ...rest)
    },
    unlink: async (file: Parameters<typeof real.unlink>[0]) => {
      const refusal = refusedUnlinks.get(String(file))
      if (refusal === undefined) {
        return real.unlink(file)
      }
      if (refusal.becomesDirectory) {
        await real.unlink(file)
        await real.mkdir(file)
      }
      refused.add(String(file))
      throw Object.assign(new Error(`${refusal.code}: refused`), { code: refusal.code })
    },
  }
})

const UUID_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** The copies directory as the filesystem resolves it (on macOS, under /private). */
function canonicalCopies(home: string): string {
  return realpathSync(join(home, 'transfers', 'copies'))
}

/** Record a temporary copy straight in the database, bypassing the store's API. */
function recordCopyDirectly(home: string, copyPath: string, expiresAt: Date): void {
  const { DatabaseSync } = loadSqlite()
  const database = new DatabaseSync(join(home, 'transfers', 'transfers.db'))
  try {
    database
      .prepare('INSERT INTO temporary_copies (path, subject, expires_at) VALUES (?, ?, ?)')
      .run(copyPath, ALICE, expiresAt.getTime())
  } finally {
    database.close()
  }
}

describe('allocateTemporaryCopy', () => {
  const fixture = useTransferStore()

  it('mints an empty owner-only file with a random name in the canonical copies directory', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)

    expect(dirname(copy.path)).toBe(canonicalCopies(fixture.home))
    expect(basename(copy.path)).toMatch(UUID_NAME)
    expect(statSync(copy.path).isFile()).toBe(true)
    expect(statSync(copy.path).size).toBe(0)
    expect(statSync(copy.path).mode & 0o777).toBe(0o600)
  })

  it('returns a canonical path, equal to its own realpath', async () => {
    // tmpdir() is under /var on macOS, which is a symlink to /private/var.
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    expect(realpathSync(copy.path)).toBe(copy.path)
  })

  it('expires 60 minutes from now', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    expect(copy.expiresAt).toEqual(new Date('2026-01-15T11:00:00.000Z'))
  })

  it('mints a different path every time', async () => {
    const first = await fixture.store.allocateTemporaryCopy(ALICE)
    const second = await fixture.store.allocateTemporaryCopy(ALICE)
    expect(first.path).not.toBe(second.path)
  })

  it('appends a valid extension', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE, { extension: '.pdf' })
    expect(basename(copy.path)).toMatch(/^[0-9a-f-]{36}\.pdf$/)
    expect(dirname(copy.path)).toBe(canonicalCopies(fixture.home))
  })

  it.each([
    'pdf',
    '.',
    '..',
    '../escape',
    '.a/b',
    '.a\\b',
    '.p d',
    '.pdf\0',
    '.é',
    '.abcdefghijklmnopq', // 17 characters after the dot
  ])('rejects the extension %j without creating a file', async (extension) => {
    await expect(fixture.store.allocateTemporaryCopy(ALICE, { extension })).rejects.toThrow(
      RangeError
    )
    expect(readdirSync(canonicalCopies(fixture.home))).toEqual([])
  })

  it('takes no caller-chosen path, and exposes no copies directory', () => {
    expect('registerTemporaryCopy' in fixture.store).toBe(false)
    expect('temporaryCopyDirectory' in fixture.store).toBe(false)
  })
})

describe('temporary copy release', () => {
  const fixture = useTransferStore()

  it('deletes the copy and is idempotent', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    writeFileSync(copy.path, 'copied bytes')

    await Promise.all([copy.release(), copy.release()])
    expect(existsSync(copy.path)).toBe(false)
    await expect(copy.release()).resolves.toBeUndefined()
  })

  it('succeeds when the copy is already gone', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    unlinkSync(copy.path)
    await expect(copy.release()).resolves.toBeUndefined()
  })

  it.skipIf(process.getuid?.() === 0)(
    'reports a failed delete without naming the copy, and can be retried',
    async () => {
      const copy = await fixture.store.allocateTemporaryCopy(ALICE)
      const copies = canonicalCopies(fixture.home)
      chmodSync(copies, 0o500)
      let error: unknown
      try {
        error = await rejectionOf(copy.release())
      } finally {
        chmodSync(copies, 0o700)
      }

      expect(error).toBeInstanceOf(Error)
      if (!(error instanceof Error)) return
      expect(error.message).toBe('The transfer store could not delete the temporary copy.')
      expect(error.message).not.toContain(basename(copy.path))
      expect(error.cause).toBeInstanceOf(Error)

      await expect(copy.release()).resolves.toBeUndefined()
      expect(existsSync(copy.path)).toBe(false)
    }
  )
})

/**
 * Regression: confinement used to be lexical. A caller-supplied path through
 * a symlinked subdirectory of `copies/` (`copies/evil -> /outside`,
 * registering `copies/evil/precious`) let the sweep delete
 * `/outside/precious`. The store now mints every path and deletes only
 * regular files directly inside the canonical copies directory.
 */
describe('temporary copy confinement', () => {
  const fixture = useTransferStore()
  let outside = ''
  let precious = ''

  beforeEach(() => {
    outside = mkdtempSync(join(tmpdir(), 'macts-outside-store-'))
    precious = join(outside, 'precious')
    writeFileSync(precious, 'must survive')
  })

  afterEach(() => {
    rmSync(outside, { recursive: true, force: true })
  })

  it('never deletes through a symlinked subdirectory of the copies directory', async () => {
    const lexicalCopies = join(fixture.home, 'transfers', 'copies')
    symlinkSync(outside, join(lexicalCopies, 'evil'))
    // The paths the old, caller-path API accepted, in lexical and canonical
    // form, as they would be on record.
    const expiry = new Date('2026-01-15T11:00:00.000Z')
    recordCopyDirectly(fixture.home, join(lexicalCopies, 'evil', 'precious'), expiry)
    recordCopyDirectly(
      fixture.home,
      join(canonicalCopies(fixture.home), 'evil', 'precious'),
      expiry
    )

    fixture.clock.advance(61 * MINUTE)
    await fixture.store.sweep()

    expect(readFileSync(precious, 'utf8')).toBe('must survive')
    expect(lstatSync(join(lexicalCopies, 'evil')).isSymbolicLink()).toBe(true)
  })

  it('neither follows nor removes a symlink that replaced a minted copy, on release', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    unlinkSync(copy.path)
    symlinkSync(precious, copy.path)

    await expect(copy.release()).resolves.toBeUndefined()

    expect(readFileSync(precious, 'utf8')).toBe('must survive')
    expect(lstatSync(copy.path).isSymbolicLink()).toBe(true)
  })

  it('neither follows nor removes a symlink that replaced a minted copy, on sweep', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    unlinkSync(copy.path)
    symlinkSync(outside, copy.path)

    fixture.clock.advance(61 * MINUTE)
    await fixture.store.sweep()

    expect(readFileSync(precious, 'utf8')).toBe('must survive')
    expect(lstatSync(copy.path).isSymbolicLink()).toBe(true)
  })

  it('leaves a directory that replaced a minted copy in place', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    unlinkSync(copy.path)
    mkdirSync(copy.path)
    writeFileSync(join(copy.path, 'inner'), 'kept')

    fixture.clock.advance(61 * MINUTE)
    await fixture.store.sweep()

    expect(readFileSync(join(copy.path, 'inner'), 'utf8')).toBe('kept')
  })
})

/**
 * A minted copy can be swapped for a directory between the store's check and
 * its `unlink`; the filesystem then refuses the unlink (EISDIR on Linux, EPERM
 * on macOS). That is the same outcome as finding the directory at the check:
 * the store refuses to delete it and forgets the record, rather than failing
 * every release and sweep until someone removes the directory.
 */
describe.each(['EPERM', 'EISDIR'])(
  'a minted copy swapped for a directory just before it is deleted (%s)',
  (code) => {
    const fixture = useTransferStore()

    afterEach(() => {
      refusedUnlinks.clear()
    })

    function recordedCopies(home: string): number {
      const { DatabaseSync } = loadSqlite()
      const database = new DatabaseSync(join(home, 'transfers', 'transfers.db'), { readOnly: true })
      try {
        const row = database.prepare('SELECT COUNT(*) AS count FROM temporary_copies').get()
        return Number(row?.['count'])
      } finally {
        database.close()
      }
    }

    it('release() succeeds and forgets the record', async () => {
      const copy = await fixture.store.allocateTemporaryCopy(ALICE)
      refusedUnlinks.set(copy.path, { code, becomesDirectory: true })
      await expect(copy.release()).resolves.toBeUndefined()
      expect(recordedCopies(fixture.home)).toBe(0)
      expect(lstatSync(copy.path).isDirectory()).toBe(true)
    })

    it('the sweep forgets the record instead of failing', async () => {
      const copy = await fixture.store.allocateTemporaryCopy(ALICE)
      fixture.clock.advance(61 * MINUTE)
      refusedUnlinks.set(copy.path, { code, becomesDirectory: true })
      await expect(fixture.store.sweep()).resolves.toBeUndefined()
      expect(recordedCopies(fixture.home)).toBe(0)
    })
  }
)

/**
 * `unlink` of a regular file can also be refused (EPERM) by an immutable flag
 * or a sandbox denial. The file is still there holding the caller's content,
 * so the failure is reported generically and the record is kept: a later
 * sweep retries, and the copy is never left on disk without a record.
 */
describe.each(['EPERM', 'EISDIR'])(
  'a minted copy that stays a regular file when its deletion is refused (%s)',
  (code) => {
    const fixture = useTransferStore()

    afterEach(() => {
      refusedUnlinks.clear()
    })

    function recordedCopies(home: string): number {
      const { DatabaseSync } = loadSqlite()
      const database = new DatabaseSync(join(home, 'transfers', 'transfers.db'), { readOnly: true })
      try {
        const row = database.prepare('SELECT COUNT(*) AS count FROM temporary_copies').get()
        return Number(row?.['count'])
      } finally {
        database.close()
      }
    }

    it('release() rejects generically, keeping the record and the file', async () => {
      const copy = await fixture.store.allocateTemporaryCopy(ALICE)
      writeFileSync(copy.path, 'user content')
      refusedUnlinks.set(copy.path, { code, becomesDirectory: false })
      const error = await rejectionOf(copy.release())
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe(
        'The transfer store could not delete the temporary copy.'
      )
      expect((error as Error).cause).toMatchObject({ code })
      expect(recordedCopies(fixture.home)).toBe(1)
      expect(readFileSync(copy.path, 'utf8')).toBe('user content')
    })

    it('the sweep keeps the record for the next sweep', async () => {
      const copy = await fixture.store.allocateTemporaryCopy(ALICE)
      writeFileSync(copy.path, 'user content')
      fixture.clock.advance(61 * MINUTE)
      refusedUnlinks.set(copy.path, { code, becomesDirectory: false })
      await fixture.store.sweep()
      expect(recordedCopies(fixture.home)).toBe(1)
      refusedUnlinks.clear()
      await fixture.store.sweep()
      expect(recordedCopies(fixture.home)).toBe(0)
      expect(existsSync(copy.path)).toBe(false)
    })
  }
)

/**
 * When a refused `unlink` is followed by an `lstat` that fails for a reason
 * other than the path being absent (an I/O error), the copy's state is
 * unknown: it may still hold the caller's content. The failure is reported
 * and the record is kept, rather than the copy being treated as refused and
 * forgotten.
 */
describe('a minted copy whose state is unknown after its deletion is refused (EIO)', () => {
  const fixture = useTransferStore()

  afterEach(() => {
    refusedUnlinks.clear()
    failingLstats.clear()
  })

  function recordedCopies(home: string): number {
    const { DatabaseSync } = loadSqlite()
    const database = new DatabaseSync(join(home, 'transfers', 'transfers.db'), { readOnly: true })
    try {
      const row = database.prepare('SELECT COUNT(*) AS count FROM temporary_copies').get()
      return Number(row?.['count'])
    } finally {
      database.close()
    }
  }

  it('release() rejects and keeps the record and the file', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    writeFileSync(copy.path, 'user content')
    refusedUnlinks.set(copy.path, { code: 'EPERM', becomesDirectory: false })
    failingLstats.set(copy.path, 'EIO')

    const error = await rejectionOf(copy.release())

    expect((error as Error).message).toBe('The transfer store could not delete the temporary copy.')
    expect(recordedCopies(fixture.home)).toBe(1)
    expect(readFileSync(copy.path, 'utf8')).toBe('user content')
  })

  it('the sweep keeps the record for the next sweep', async () => {
    const copy = await fixture.store.allocateTemporaryCopy(ALICE)
    writeFileSync(copy.path, 'user content')
    fixture.clock.advance(61 * MINUTE)
    refusedUnlinks.set(copy.path, { code: 'EPERM', becomesDirectory: false })
    failingLstats.set(copy.path, 'EIO')

    await fixture.store.sweep()
    expect(recordedCopies(fixture.home)).toBe(1)

    refusedUnlinks.clear()
    failingLstats.clear()
    await fixture.store.sweep()
    expect(recordedCopies(fixture.home)).toBe(0)
    expect(existsSync(copy.path)).toBe(false)
  })
})
