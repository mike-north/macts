/**
 * Uploads: subject-bound slots a remote caller sends bytes into, usable once
 * completely received, and consumable exactly once.
 *
 * Expected values come from phases/13 D8 ("File sources", "Limits and
 * lifecycle") and the documented limits: an upload lives 15 minutes, accepts
 * at most 100 MiB, and a subject may hold 16 outstanding uploads and 512 MiB
 * of outstanding received bytes. A transfer is expired at its `expiresAt`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D8)
 */

import { describe, expect, it } from 'vitest'
import { chmodSync, existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { RateLimitedError } from '@macts/contracts'
import { loadSqlite } from '../storage/sqlite.js'
import {
  ALICE,
  BOB,
  MINUTE,
  chunks,
  expectIndistinguishable,
  expectRateLimited,
  expectTransferError,
  filledChunks,
  rejectionOf,
  useTransferStore,
} from './transfer-test-helpers.js'

/** The `received_bytes` an upload has on record, read straight from the database. */
function recordedBytes(home: string, uploadId: string): number {
  const { DatabaseSync } = loadSqlite()
  const database = new DatabaseSync(join(home, 'transfers', 'transfers.db'), { readOnly: true })
  try {
    const row = database
      .prepare('SELECT received_bytes FROM uploads WHERE upload_id = ?')
      .get(uploadId)
    return Number(row?.['received_bytes'])
  } finally {
    database.close()
  }
}

/** Upload files currently on disk under the fixture's home. */
function stagedFiles(home: string): string[] {
  return readdirSync(join(home, 'transfers', 'uploads'))
}

/**
 * A source that yields `first`, then waits until the test calls `release`
 * before yielding `second` and ending. Lets a test act mid-receive.
 */
function pausedSource(first: Uint8Array, second?: Uint8Array) {
  let resume: () => void = () => undefined
  let yieldedFirst: () => void = () => undefined
  const firstYielded = new Promise<void>((resolve) => {
    yieldedFirst = resolve
  })
  const gate = new Promise<void>((resolve) => {
    resume = resolve
  })
  async function* source(): AsyncGenerator<Uint8Array> {
    yield first
    yieldedFirst()
    await gate
    if (second !== undefined) {
      yield second
    }
  }
  return {
    source: source(),
    firstYielded,
    release: () => {
      resume()
    },
  }
}

describe('createUpload', () => {
  const fixture = useTransferStore()

  it('creates an upload that accepts 100 MiB and expires 15 minutes from now', async () => {
    const upload = await fixture.store.createUpload(ALICE)

    expect(upload.uploadId).toMatch(/^[0-9a-f-]{36}$/)
    expect(upload.maxBytes).toBe(104_857_600)
    expect(upload.expiresAt).toEqual(new Date('2026-01-15T10:15:00.000Z'))
  })

  it('creates a distinct id each time', async () => {
    const first = await fixture.store.createUpload(ALICE)
    const second = await fixture.store.createUpload(ALICE)
    expect(first.uploadId).not.toBe(second.uploadId)
  })

  it('allows 16 outstanding uploads per subject and rate-limits the 17th until the oldest expires', async () => {
    await fixture.store.createUpload(ALICE) // expires 10:15:00.000
    fixture.clock.advance(MINUTE)
    for (let i = 0; i < 15; i++) {
      await fixture.store.createUpload(ALICE)
    }
    fixture.clock.set('2026-01-15T10:05:00.250Z')

    const error = await expectRateLimited(fixture.store.createUpload(ALICE))
    // 10:15:00.000 − 10:05:00.250 = 599.75 s, rounded up.
    expect(error.details).toEqual({ retryAfterSeconds: 600 })
    expect(error.code).toBe('RATE_LIMITED')
  })

  it('reports at least one second when the oldest upload is about to expire', async () => {
    for (let i = 0; i < 16; i++) {
      await fixture.store.createUpload(ALICE)
    }
    fixture.clock.set('2026-01-15T10:14:59.800Z')
    const error = await expectRateLimited(fixture.store.createUpload(ALICE))
    expect(error.details.retryAfterSeconds).toBe(1)
  })

  it('counts outstanding uploads per subject', async () => {
    for (let i = 0; i < 16; i++) {
      await fixture.store.createUpload(ALICE)
    }
    await expect(fixture.store.createUpload(BOB)).resolves.toMatchObject({ maxBytes: 104_857_600 })
  })

  it('stops counting an upload once it is consumed or expired', async () => {
    const uploads = []
    for (let i = 0; i < 16; i++) {
      uploads.push(await fixture.store.createUpload(ALICE))
    }
    const [first] = uploads
    if (first === undefined) throw new Error('no upload created')
    await fixture.store.receiveUpload(ALICE, first.uploadId, chunks('x'))
    await fixture.store.consumeUpload(ALICE, first.uploadId)
    await expect(fixture.store.createUpload(ALICE)).resolves.toBeDefined()

    await expect(fixture.store.createUpload(ALICE)).rejects.toBeInstanceOf(RateLimitedError)
    fixture.clock.set('2026-01-15T10:15:00.000Z')
    await expect(fixture.store.createUpload(ALICE)).resolves.toBeDefined()
  })
})

describe('receiveUpload', () => {
  const fixture = useTransferStore()

  it('writes the bytes, completes the upload, and reports its size', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)

    const received = await fixture.store.receiveUpload(ALICE, uploadId, chunks('hello ', 'world'))

    expect(received).toEqual({
      uploadId,
      size: 11,
      expiresAt: new Date('2026-01-15T10:15:00.000Z'),
    })
    const consumed = await fixture.store.consumeUpload(ALICE, uploadId)
    expect(readFileSync(consumed.path, 'utf8')).toBe('hello world')
  })

  it('accepts a web ReadableStream', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('from a web stream'))
        controller.close()
      },
    })
    await expect(fixture.store.receiveUpload(ALICE, uploadId, stream)).resolves.toMatchObject({
      size: 17,
    })
  })

  it('accepts a Node.js readable stream of Buffers', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    // How Readable's async iterator is typed depends on the Node.js type
    // definitions and TypeScript version in use; at run time it is an async
    // iterable of Buffers, which is what this test establishes.
    const stream = Readable.from([
      Buffer.from('abc'),
      Buffer.from('def'),
    ]) as unknown as AsyncIterable<Uint8Array>
    await expect(fixture.store.receiveUpload(ALICE, uploadId, stream)).resolves.toMatchObject({
      size: 6,
    })
  })

  it('accepts an empty upload', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    await expect(fixture.store.receiveUpload(ALICE, uploadId, chunks())).resolves.toMatchObject({
      size: 0,
    })
  })

  it('treats another subject exactly like an unknown upload id', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)

    const wrongSubject = await expectTransferError(
      fixture.store.receiveUpload(BOB, uploadId, chunks('x')),
      'unknown-transfer'
    )
    const unknown = await expectTransferError(
      fixture.store.receiveUpload(BOB, 'no-such-upload', chunks('x')),
      'unknown-transfer'
    )
    expectIndistinguishable(wrongSubject, unknown)
    // The owner's upload is untouched.
    await expect(fixture.store.receiveUpload(ALICE, uploadId, chunks('x'))).resolves.toMatchObject({
      size: 1,
    })
  })

  it('fails with unknown-transfer when the upload was already received', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    await fixture.store.receiveUpload(ALICE, uploadId, chunks('first'))

    const twice = await expectTransferError(
      fixture.store.receiveUpload(ALICE, uploadId, chunks('second')),
      'unknown-transfer'
    )
    const unknown = await expectTransferError(
      fixture.store.receiveUpload(ALICE, 'no-such-upload', chunks('x')),
      'unknown-transfer'
    )
    expectIndistinguishable(twice, unknown)
    const consumed = await fixture.store.consumeUpload(ALICE, uploadId)
    expect(readFileSync(consumed.path, 'utf8')).toBe('first')
  })

  it('accepts bytes one millisecond before expiry and fails with expired exactly at expiresAt', async () => {
    const early = await fixture.store.createUpload(ALICE)
    const late = await fixture.store.createUpload(ALICE)

    fixture.clock.set(new Date(early.expiresAt.getTime() - 1))
    await expect(
      fixture.store.receiveUpload(ALICE, early.uploadId, chunks('x'))
    ).resolves.toMatchObject({ size: 1 })

    fixture.clock.set(late.expiresAt)
    await expectTransferError(
      fixture.store.receiveUpload(ALICE, late.uploadId, chunks('x')),
      'expired'
    )
  })

  it('fails with expired when the upload expires mid-stream, leaving no partial file', async () => {
    const { uploadId, expiresAt } = await fixture.store.createUpload(ALICE)
    const paused = pausedSource(new Uint8Array([1]), new Uint8Array([2]))
    const receiving = fixture.store.receiveUpload(ALICE, uploadId, paused.source)
    await paused.firstYielded
    fixture.clock.set(expiresAt)
    paused.release()

    await expectTransferError(receiving, 'expired')
    expect(stagedFiles(fixture.home)).toEqual([])
  })

  describe('size limits', () => {
    const limited = useTransferStore({
      maxUploadBytes: 10,
      maxOutstandingUploadBytesPerSubject: 16,
    })

    it('cancels a web stream that sends too much', async () => {
      const { uploadId } = await limited.store.createUpload(ALICE)
      let cancelled = false
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new Uint8Array(6))
        },
        cancel() {
          cancelled = true
        },
      })

      await expectTransferError(limited.store.receiveUpload(ALICE, uploadId, stream), 'too-large')
      expect(cancelled).toBe(true)
      expect(stagedFiles(limited.home)).toEqual([])
    })

    it('accepts exactly maxBytes', async () => {
      const { uploadId } = await limited.store.createUpload(ALICE)
      await expect(
        limited.store.receiveUpload(ALICE, uploadId, filledChunks(2, 5))
      ).resolves.toMatchObject({ size: 10 })
    })

    it('stops at the first byte beyond maxBytes, deletes the partial file, and fails the upload', async () => {
      const { uploadId, maxBytes } = await limited.store.createUpload(ALICE)
      expect(maxBytes).toBe(10)

      await expectTransferError(
        limited.store.receiveUpload(ALICE, uploadId, filledChunks(2, 6)),
        'too-large'
      )

      expect(stagedFiles(limited.home)).toEqual([])
      // A failed upload cannot be received again, and is not complete.
      await expectTransferError(
        limited.store.receiveUpload(ALICE, uploadId, chunks('x')),
        'unknown-transfer'
      )
      await expectTransferError(limited.store.consumeUpload(ALICE, uploadId), 'incomplete')
    })

    it("rejects a write that would exceed the subject's outstanding bytes, leaving no partial file", async () => {
      const first = await limited.store.createUpload(ALICE)
      const second = await limited.store.createUpload(ALICE)
      const third = await limited.store.createUpload(ALICE)
      await limited.store.receiveUpload(ALICE, first.uploadId, filledChunks(1, 10))
      // 10 + 6 = 16: exactly the outstanding budget.
      await limited.store.receiveUpload(ALICE, second.uploadId, filledChunks(1, 6))

      await expectTransferError(
        limited.store.receiveUpload(ALICE, third.uploadId, filledChunks(1, 1)),
        'too-large'
      )
      expect(stagedFiles(limited.home).sort()).toEqual([first.uploadId, second.uploadId].sort())
    })

    it('frees outstanding bytes when an upload is consumed, and counts per subject', async () => {
      const first = await limited.store.createUpload(ALICE)
      await limited.store.receiveUpload(ALICE, first.uploadId, filledChunks(1, 10))

      const bobs = await limited.store.createUpload(BOB)
      await expect(
        limited.store.receiveUpload(BOB, bobs.uploadId, filledChunks(1, 10))
      ).resolves.toMatchObject({ size: 10 })

      await limited.store.consumeUpload(ALICE, first.uploadId)
      const next = await limited.store.createUpload(ALICE)
      await expect(
        limited.store.receiveUpload(ALICE, next.uploadId, filledChunks(1, 10))
      ).resolves.toMatchObject({ size: 10 })
    })
  })

  it('rethrows an aborted signal, deletes the partial file, and lets the upload be received again', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    const controller = new AbortController()
    // Never yields a second chunk: only the abort can end the receive.
    const paused = pausedSource(new TextEncoder().encode('partial'))
    const receiving = fixture.store.receiveUpload(ALICE, uploadId, paused.source, {
      signal: controller.signal,
    })
    await paused.firstYielded
    const reason = new Error('client went away')
    controller.abort(reason)

    await expect(receiving).rejects.toBe(reason)
    expect(stagedFiles(fixture.home)).toEqual([])

    await expect(
      fixture.store.receiveUpload(ALICE, uploadId, chunks('whole'))
    ).resolves.toMatchObject({ size: 5 })
  })

  it('abandons a stalled web stream when the signal aborts, and cancels it', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    const controller = new AbortController()
    let cancelled = false
    let sentFirst: () => void = () => undefined
    const firstSent = new Promise<void>((resolve) => {
      sentFirst = resolve
    })
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        streamController.enqueue(new Uint8Array([1, 2, 3]))
        sentFirst()
        // Never enqueues more and never closes: only the abort ends the read.
      },
      cancel() {
        cancelled = true
      },
    })
    const receiving = fixture.store.receiveUpload(ALICE, uploadId, stream, {
      signal: controller.signal,
    })
    await firstSent
    await new Promise((resolve) => setImmediate(resolve))
    const reason = new Error('client went away')
    controller.abort(reason)

    await expect(receiving).rejects.toBe(reason)
    expect(stagedFiles(fixture.home)).toEqual([])
    await new Promise((resolve) => setImmediate(resolve))
    expect(cancelled).toBe(true)
  })

  it('fails at once for an already-aborted signal, writing nothing', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    const reason = new Error('aborted before start')
    await expect(
      fixture.store.receiveUpload(ALICE, uploadId, chunks('x'), {
        signal: AbortSignal.abort(reason),
      })
    ).rejects.toBe(reason)
    expect(stagedFiles(fixture.home)).toEqual([])
  })

  it('rethrows a failing stream, deletes the partial file, and leaves the upload incomplete', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    const failure = new Error('connection reset')
    async function* failing(): AsyncGenerator<Uint8Array> {
      yield new TextEncoder().encode('partial')
      await Promise.resolve()
      throw failure
    }

    await expect(fixture.store.receiveUpload(ALICE, uploadId, failing())).rejects.toBe(failure)

    expect(stagedFiles(fixture.home)).toEqual([])
    await expectTransferError(fixture.store.consumeUpload(ALICE, uploadId), 'incomplete')
  })

  it('reserves the outstanding budget in 1 MiB steps while receiving, and records the exact size', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    const paused = pausedSource(new Uint8Array(10), new Uint8Array(5))
    const receiving = fixture.store.receiveUpload(ALICE, uploadId, paused.source)
    await paused.firstYielded

    // 10 bytes received so far, reserved up to 10 + 1 MiB.
    expect(recordedBytes(fixture.home, uploadId)).toBe(10 + 1_048_576)
    paused.release()
    await expect(receiving).resolves.toMatchObject({ size: 15 })
    expect(recordedBytes(fixture.home, uploadId)).toBe(15)
  })

  it.skipIf(process.getuid?.() === 0)(
    'reports a staging failure without the uploads path or the upload id, and keeps the upload receivable',
    async () => {
      const { uploadId } = await fixture.store.createUpload(ALICE)
      const uploads = join(fixture.home, 'transfers', 'uploads')
      chmodSync(uploads, 0o500)
      let error: unknown
      try {
        error = await rejectionOf(fixture.store.receiveUpload(ALICE, uploadId, chunks('x')))
      } finally {
        chmodSync(uploads, 0o700)
      }

      expect(error).toBeInstanceOf(Error)
      if (!(error instanceof Error)) return
      expect(error.message).toBe('The transfer store could not stage the upload.')
      expect(error.message).not.toContain(uploads)
      expect(error.message).not.toContain(uploadId)
      // The filesystem error is kept for local diagnosis only.
      expect(error.cause).toBeInstanceOf(Error)

      await expect(
        fixture.store.receiveUpload(ALICE, uploadId, chunks('retry'))
      ).resolves.toMatchObject({ size: 5 })
    }
  )

  it('rejects a chunk that is not a Uint8Array, leaving no partial file', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    async function* wrongType(): AsyncGenerator {
      yield new Uint8Array([1])
      await Promise.resolve()
      yield 'not bytes'
    }
    const error = await rejectionOf(
      fixture.store.receiveUpload(ALICE, uploadId, wrongType() as AsyncIterable<Uint8Array>)
    )
    expect(error).toBeInstanceOf(TypeError)
    expect(stagedFiles(fixture.home)).toEqual([])
  })

  it('stops with unknown-transfer when the upload is consumed mid-stream, leaving no partial file', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    const paused = pausedSource(new Uint8Array([1]), new Uint8Array([2]))
    const receiving = fixture.store.receiveUpload(ALICE, uploadId, paused.source)
    await paused.firstYielded

    await expectTransferError(fixture.store.consumeUpload(ALICE, uploadId), 'incomplete')
    paused.release()

    await expectTransferError(receiving, 'unknown-transfer')
    expect(stagedFiles(fixture.home)).toEqual([])
  })
})

describe('consumeUpload', () => {
  const fixture = useTransferStore()

  /** Create and fully receive an upload for `subject`. */
  async function completedUpload(subject: string, contentType?: string): Promise<string> {
    const { uploadId } = await fixture.store.createUpload(
      subject,
      contentType === undefined ? {} : { contentType }
    )
    await fixture.store.receiveUpload(subject, uploadId, chunks('payload'))
    return uploadId
  }

  it('hands over the staged bytes with their size and content type hint', async () => {
    const uploadId = await completedUpload(ALICE, 'application/pdf')

    const consumed = await fixture.store.consumeUpload(ALICE, uploadId)

    // The canonical path: on macOS the temp home is under /var -> /private/var.
    expect(consumed.path).toBe(
      join(realpathSync(join(fixture.home, 'transfers', 'uploads')), uploadId)
    )
    expect(consumed.size).toBe(7)
    expect(consumed.contentType).toBe('application/pdf')
    expect(readFileSync(consumed.path, 'utf8')).toBe('payload')
  })

  it('omits contentType when the caller gave none', async () => {
    const consumed = await fixture.store.consumeUpload(ALICE, await completedUpload(ALICE))
    expect(consumed).not.toHaveProperty('contentType')
  })

  it('is single-use: a second consume fails exactly like an unknown id', async () => {
    const uploadId = await completedUpload(ALICE)
    await fixture.store.consumeUpload(ALICE, uploadId)

    const second = await expectTransferError(
      fixture.store.consumeUpload(ALICE, uploadId),
      'unknown-transfer'
    )
    const unknown = await expectTransferError(
      fixture.store.consumeUpload(ALICE, 'no-such-upload'),
      'unknown-transfer'
    )
    expectIndistinguishable(second, unknown)
  })

  it('spends the id even when the first consume fails', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    await expectTransferError(fixture.store.consumeUpload(ALICE, uploadId), 'incomplete')
    await expectTransferError(fixture.store.consumeUpload(ALICE, uploadId), 'unknown-transfer')
  })

  it('treats another subject exactly like an unknown id, without spending the upload', async () => {
    const uploadId = await completedUpload(ALICE)

    const wrongSubject = await expectTransferError(
      fixture.store.consumeUpload(BOB, uploadId),
      'unknown-transfer'
    )
    const unknown = await expectTransferError(
      fixture.store.consumeUpload(BOB, 'no-such-upload'),
      'unknown-transfer'
    )
    expectIndistinguishable(wrongSubject, unknown)
    await expect(fixture.store.consumeUpload(ALICE, uploadId)).resolves.toMatchObject({ size: 7 })
  })

  it('fails with incomplete for an upload whose bytes never arrived', async () => {
    const { uploadId } = await fixture.store.createUpload(ALICE)
    await expectTransferError(fixture.store.consumeUpload(ALICE, uploadId), 'incomplete')
  })

  it('is usable one millisecond before expiry and expired exactly at expiresAt', async () => {
    const early = await completedUpload(ALICE)
    const late = await completedUpload(ALICE)
    const expiresAt = new Date('2026-01-15T10:15:00.000Z')

    fixture.clock.set(new Date(expiresAt.getTime() - 1))
    await expect(fixture.store.consumeUpload(ALICE, early)).resolves.toMatchObject({ size: 7 })

    fixture.clock.set(expiresAt)
    await expectTransferError(fixture.store.consumeUpload(ALICE, late), 'expired')
    // The expired upload's bytes are removed with it.
    expect(existsSync(join(fixture.home, 'transfers', 'uploads', late))).toBe(false)
  })

  it('release() deletes the staged bytes and is idempotent', async () => {
    const consumed = await fixture.store.consumeUpload(ALICE, await completedUpload(ALICE))

    await Promise.all([consumed.release(), consumed.release()])
    expect(existsSync(consumed.path)).toBe(false)
    await expect(consumed.release()).resolves.toBeUndefined()
  })

  it.skipIf(process.getuid?.() === 0)(
    'release() reports a failed delete without the uploads path or the upload id, and can be retried',
    async () => {
      const uploadId = await completedUpload(ALICE)
      const consumed = await fixture.store.consumeUpload(ALICE, uploadId)
      const uploads = join(fixture.home, 'transfers', 'uploads')
      chmodSync(uploads, 0o500)
      let error: unknown
      try {
        error = await rejectionOf(consumed.release())
      } finally {
        chmodSync(uploads, 0o700)
      }

      expect(error).toBeInstanceOf(Error)
      if (!(error instanceof Error)) return
      expect(error.message).toBe('The transfer store could not delete the staged upload.')
      expect(error.message).not.toContain(uploads)
      expect(error.message).not.toContain(uploadId)
      expect(error.cause).toBeInstanceOf(Error)

      await expect(consumed.release()).resolves.toBeUndefined()
      expect(existsSync(consumed.path)).toBe(false)
    }
  )

  it('release() succeeds when the bytes are already gone', async () => {
    const consumed = await fixture.store.consumeUpload(ALICE, await completedUpload(ALICE))
    await fixture.store.sweep()
    fixture.clock.advance(30 * MINUTE)
    await fixture.store.sweep()
    expect(existsSync(consumed.path)).toBe(false)
    await expect(consumed.release()).resolves.toBeUndefined()
  })
})
