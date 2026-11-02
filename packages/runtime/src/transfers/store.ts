/**
 * The transfer store: the service's persistent, subject-bound record of
 * binary transfers (phases/13, D8).
 *
 * It holds four kinds of transfer, each with a lifetime and an owner:
 *
 * - **File grants** — issued when an authorized operation returns a file, and
 *   exchanged by the same subject, until they expire, for a fetched file.
 * - **Uploads** — slots a remote caller sends bytes into before an operation
 *   writes them to an app. An upload is bound to the subject that created it,
 *   usable once complete, and consumable exactly once.
 * - **Download links** — short-lived bearer capabilities that deliver one
 *   granted file over HTTP.
 * - **Temporary copies** — files materialized for a local read. The store
 *   mints each copy's path; the caller writes the copy there and releases
 *   it, and the store removes it when abandoned.
 *
 * ## Guarantees
 *
 * - **Subject binding.** A grant or upload presented by any subject other
 *   than the one it was issued to fails exactly like an unknown one
 *   (`TransferError` `unknown-transfer`, same message), so identifiers cannot
 *   be probed. Download links are the exception by design: a link *is* the
 *   capability, so redeeming one takes no subject.
 * - **Expiry.** Every transfer expires at a fixed instant computed from the
 *   store's clock when it is issued. A transfer is usable strictly before its
 *   expiry; at `expiresAt` it is already expired.
 * - **Single use.** Consuming an upload is recorded before anything else is
 *   decided, so any later consume of that id fails with `unknown-transfer`,
 *   whatever the first call's outcome.
 * - **No secrets at rest or in errors.** Tokens are 32 random bytes and only
 *   their SHA-256 digests are stored. No error message contains a token, an
 *   upload id, or the path of uploaded bytes: a filesystem failure while
 *   staging or releasing bytes is reported as a generic `Error` whose
 *   `cause` keeps the original for local diagnosis only (never surface a
 *   `cause` to a caller). The store does no logging at all.
 * - **Confined deletion.** The store deletes only files it named: upload
 *   bytes at `uploads/<uploadId>`, and temporary copies at paths it minted
 *   directly inside the canonical copies directory. A copy is deleted only
 *   if it is still a regular file there; a symlink or directory found in its
 *   place is never followed or removed.
 * - **Bounded.** Upload size, outstanding uploads, and outstanding upload
 *   bytes per subject are limited (see `limits.ts`).
 *
 * ## Cleanup
 *
 * {@link TransferStore.sweep} removes expired records and the files behind
 * them. It runs when a store is opened and, opportunistically, at most once a
 * minute after a mutating call. Once swept, an expired transfer is unknown.
 * A file that is already gone is not an error; a file that cannot be
 * deleted keeps its record so a later sweep retries it.
 *
 * The store moves no bytes over the network and makes no authorization
 * decision beyond subject binding: callers verify the credential and the
 * operation's permission first, and pass the authority's subject in.
 *
 * @packageDocumentation
 */

import { randomUUID } from 'node:crypto'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { RateLimitedError, TransferError } from '@macts/contracts'
import { getMactsHome } from '../paths.js'
import { runInTransaction, type SqliteDatabase, type SqliteRow } from '../storage/sqlite.js'
import { readChunks, type UploadByteSource } from './byte-source.js'
import {
  canonicalCopiesDirectory,
  FILE_MODE,
  integerColumn,
  openTransferDatabase,
  optionalIntegerColumn,
  optionalTextColumn,
  textColumn,
  transferPaths,
  type TransferPaths,
} from './database.js'
import { resolveTransferLimits, type TransferLimits } from './limits.js'
import { hashToken, mintToken } from './tokens.js'

/** Minimum time between opportunistic sweeps: one minute. */
const SWEEP_INTERVAL_MS = 60_000

/** A file an authorized operation returned, as recorded by a grant. */
export interface GrantedFile {
  /** The app whose operation returned the file. */
  readonly app: string
  /** The original path on the executing Mac, when the content has one. */
  readonly path?: string
  /** When the operation observed the file. */
  readonly observedAt: Date
}

/** A freshly issued file grant. */
export interface IssuedFileGrant {
  /** The opaque grant token. Shown once; the store keeps only its digest. */
  readonly token: string
  /** When the grant can no longer be exchanged. */
  readonly expiresAt: Date
}

/** What a valid grant entitles its subject to fetch. */
export interface FileGrantRecord extends GrantedFile {
  /** When the grant can no longer be exchanged. */
  readonly expiresAt: Date
}

/** Options for {@link TransferStore.createUpload}. */
export interface CreateUploadOptions {
  /**
   * The media type the caller says its bytes have. A hint only: it is never
   * verified, and consumers may ignore it.
   */
  readonly contentType?: string
}

/** A freshly created upload slot. */
export interface CreatedUpload {
  /** Identifier of the upload, bound to the subject that created it. */
  readonly uploadId: string
  /**
   * Largest accepted upload, in bytes. The subject's outstanding-bytes bound
   * can reject a write sooner.
   */
  readonly maxBytes: number
  /** When the upload stops accepting bytes and can no longer be consumed. */
  readonly expiresAt: Date
}

/** Options for {@link TransferStore.receiveUpload}. */
export interface ReceiveUploadOptions {
  /** Abandons the receive when aborted; the partial bytes are deleted. */
  readonly signal?: AbortSignal
}

/** A completely received upload. */
export interface ReceivedUpload {
  /** Identifier of the upload. */
  readonly uploadId: string
  /** Bytes received. */
  readonly size: number
  /** When the upload can no longer be consumed. */
  readonly expiresAt: Date
}

/** A consumed upload's staged bytes, owned by the consuming call. */
export interface ConsumedUpload {
  /** Path of the staged bytes on the executing Mac. Never log it. */
  readonly path: string
  /** The caller's media type hint, when one was given. */
  readonly contentType?: string
  /** Size of the staged bytes. */
  readonly size: number
  /**
   * Delete the staged bytes. Call it once the consuming operation finishes,
   * whether it succeeded or failed. Safe to call more than once.
   */
  release(): Promise<void>
}

/** A freshly issued download link token. */
export interface IssuedDownloadLink {
  /** The opaque link token: a bearer capability. Never log it. */
  readonly token: string
  /** When the link stops delivering the file. */
  readonly expiresAt: Date
}

/** The file a download link delivers. */
export interface DownloadLinkTarget {
  /** The app whose operation returned the file. */
  readonly app: string
  /** The original path on the executing Mac, when the content has one. */
  readonly path?: string
}

/** Options for {@link TransferStore.allocateTemporaryCopy}. */
export interface AllocateTemporaryCopyOptions {
  /**
   * File name extension for the copy, such as `.pdf`, so apps and tools that
   * go by extension recognize it: a `.` followed by 1 to 16 ASCII letters or
   * digits.
   */
  readonly extension?: string
}

/** A temporary copy the store minted, under the store's lifecycle. */
export interface AllocatedTemporaryCopy {
  /**
   * Where to write the copy: a new, empty, owner-only regular file with a
   * random name, directly inside the store's canonical copies directory.
   * The path is canonical (no symlinks), so it compares equal to its own
   * `realpath`.
   */
  readonly path: string
  /** When the sweep may remove the copy if it has not been released. */
  readonly expiresAt: Date
  /**
   * Delete the copy and forget it. Safe to call more than once. Only a
   * regular file at {@link AllocatedTemporaryCopy.path} is deleted: a symlink
   * or directory found there instead is neither followed nor removed.
   */
  release(): Promise<void>
}

/** Options for {@link createTransferStore}. */
export interface CreateTransferStoreOptions {
  /** The macts home the store lives under. Default: {@link getMactsHome}. */
  readonly home?: string
  /** The clock every lifetime is computed from. Default: the system clock. */
  readonly now?: () => Date
  /** Overrides for individual bounds; the rest keep their defaults. */
  readonly limits?: Partial<TransferLimits>
}

/**
 * The persistent, subject-bound record of binary transfers. See the module
 * documentation for its guarantees.
 */
export interface TransferStore {
  /** The bounds this store enforces. */
  readonly limits: TransferLimits

  /**
   * Issue a grant for a file an authorized operation returned to `subject`.
   * The grant is reusable until it expires.
   */
  issueGrant(subject: string, file: GrantedFile): Promise<IssuedFileGrant>

  /**
   * Look up a grant presented by `subject`.
   *
   * @throws TransferError `unknown-transfer` when the token is unknown or was
   *   issued to another subject (indistinguishably), `expired` when it has
   *   expired.
   */
  redeemGrant(subject: string, token: string): Promise<FileGrantRecord>

  /**
   * Create an upload slot for `subject`.
   *
   * @throws RateLimitedError when the subject already has the maximum number
   *   of outstanding uploads; `retryAfterSeconds` is the time until its
   *   oldest outstanding upload expires.
   */
  createUpload(subject: string, options?: CreateUploadOptions): Promise<CreatedUpload>

  /**
   * Receive an upload's bytes and mark it complete. An upload is received
   * once; an interrupted receive (the source throws or the signal aborts)
   * deletes the partial bytes and leaves the upload awaiting bytes again.
   * If the process ends mid-receive, nothing can reset the upload: it stays
   * `receiving` (unreceivable, and holding one of the subject's outstanding
   * slots) until it expires and the sweep removes it with its partial bytes.
   *
   * @throws TransferError `unknown-transfer` when the upload is unknown,
   *   belongs to another subject, was already received (or is being
   *   received), or was consumed meanwhile; `expired` when it expires before
   *   the last byte arrives; `too-large` when the bytes exceed the upload's
   *   limit or the subject's outstanding-bytes limit, which also marks the
   *   upload failed. In every case the partial bytes are deleted.
   * @throws The source's own error, or the signal's reason, when the receive
   *   is interrupted.
   * @throws Error "The transfer store could not stage the upload." when
   *   writing the bytes to disk fails; the filesystem error is its `cause`.
   */
  receiveUpload(
    subject: string,
    uploadId: string,
    bytes: UploadByteSource,
    options?: ReceiveUploadOptions
  ): Promise<ReceivedUpload>

  /**
   * Consume a completely received upload for one operation. The consumption
   * is recorded first, so the id is spent whatever this call's outcome.
   *
   * @throws TransferError `unknown-transfer` when the upload is unknown,
   *   belongs to another subject, or was already consumed; `expired` when it
   *   has expired; `incomplete` when its bytes were not completely received.
   */
  consumeUpload(subject: string, uploadId: string): Promise<ConsumedUpload>

  /**
   * Exchange a grant presented by `subject` for a fresh download link to its
   * file. Every call issues a new link.
   *
   * @throws TransferError as {@link TransferStore.redeemGrant}.
   */
  issueDownloadLink(subject: string, grantToken: string): Promise<IssuedDownloadLink>

  /**
   * Resolve a download link to the file it delivers. The link is the bearer
   * capability, so no subject is involved.
   *
   * @throws TransferError `unknown-transfer` when the token is unknown,
   *   `expired` when the link has expired.
   */
  redeemDownloadLink(token: string): Promise<DownloadLinkTarget>

  /**
   * Mint a temporary copy for a local read by `subject`: the store creates an
   * empty file at a fresh path of its own choosing and records it. The
   * caller writes the copy's bytes there and releases it when done; the
   * sweep removes it after its lifetime. The store never accepts a
   * caller-chosen path, so it can only ever delete files it named.
   *
   * @throws RangeError when `options.extension` is not a `.` followed by 1 to
   *   16 ASCII letters or digits.
   * @throws Error "The transfer store could not create a temporary copy."
   *   when creating the file fails; the filesystem error is its `cause`.
   */
  allocateTemporaryCopy(
    subject: string,
    options?: AllocateTemporaryCopyOptions
  ): Promise<AllocatedTemporaryCopy>

  /**
   * Remove expired grants, download links, and uploads (with their bytes),
   * released and long-abandoned consumed uploads, and expired temporary
   * copies (files and records).
   */
  sweep(): Promise<void>

  /** Close the database. Safe to call more than once; later calls fail. */
  close(): void
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** The one message per kind for an unknown transfer: never says why. */
const UNKNOWN = {
  grant: 'Unknown file grant.',
  upload: 'Unknown upload.',
  link: 'Unknown download link.',
} as const

/** The one message per kind for an expired transfer. */
const EXPIRED = {
  grant: 'The file grant has expired.',
  upload: 'The upload has expired.',
  link: 'The download link has expired.',
} as const

type TransferKind = keyof typeof UNKNOWN

function unknownTransfer(kind: TransferKind): TransferError {
  return new TransferError(UNKNOWN[kind], { reason: 'unknown-transfer' })
}

function expiredTransfer(kind: TransferKind): TransferError {
  return new TransferError(EXPIRED[kind], { reason: 'expired' })
}

function incompleteUpload(): TransferError {
  return new TransferError('The upload has not been completely received.', {
    reason: 'incomplete',
  })
}

function isTooLarge(error: unknown): boolean {
  return error instanceof TransferError && error.details.reason === 'too-large'
}

// ---------------------------------------------------------------------------
// Argument checks (programming errors, not transfer outcomes)
// ---------------------------------------------------------------------------

function assertSubject(subject: string): void {
  if (typeof subject !== 'string' || subject.length === 0) {
    throw new TypeError('A transfer subject must be a non-empty string.')
  }
}

function assertGrantedFile(file: GrantedFile): void {
  if (typeof file.app !== 'string' || file.app.length === 0) {
    throw new TypeError('A granted file must name its app.')
  }
  if (file.path !== undefined && typeof file.path !== 'string') {
    throw new TypeError('A granted file path must be a string.')
  }
  if (!(file.observedAt instanceof Date) || Number.isNaN(file.observedAt.getTime())) {
    throw new TypeError('A granted file must carry a valid observedAt date.')
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/** Write every byte of `chunk` at the handle's current position. */
async function writeAll(handle: fsp.FileHandle, chunk: Uint8Array): Promise<void> {
  let offset = 0
  while (offset < chunk.length) {
    const { bytesWritten } = await handle.write(chunk, offset, chunk.length - offset)
    offset += bytesWritten
  }
}

/** Delete a file, treating "already gone" as success. */
async function removeFile(file: string): Promise<void> {
  await fsp.rm(file, { force: true })
}

/**
 * Run a filesystem step whose errors would name a staged file, replacing any
 * failure with a generic message. The original error stays as `cause`, for
 * local diagnosis only.
 */
async function withoutPath<T>(step: () => Promise<T>, message: string): Promise<T> {
  try {
    return await step()
  } catch (cause) {
    throw new Error(message, { cause })
  }
}

/** A minted copy's extension: `.` and 1–16 ASCII letters or digits. */
const COPY_EXTENSION = /^\.[A-Za-z0-9]{1,16}$/

/** A minted copy's file name: a random UUID and an optional extension. */
const COPY_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[A-Za-z0-9]{1,16})?$/

/**
 * How many bytes a receive reserves against the subject's outstanding budget
 * at a time: 1 MiB.
 *
 * Each reservation is a write-locked, synced transaction. Reserving per chunk
 * would mean about 1,600 of them for a 100 MiB upload in 64 KiB chunks,
 * stalling every other writer of the store meanwhile. Reserving in 1 MiB
 * steps makes that about 100, while keeping full durability (unlike
 * `synchronous = NORMAL`, which could lose a recorded consumption on power
 * loss and so weaken single use). The per-upload size check still runs
 * before every write. A step is clamped to the subject's remaining budget,
 * so a receive never rejects itself for headroom it reserved; another
 * concurrent receive by the same subject can see up to one step of that
 * headroom as used.
 */
const RESERVATION_STEP_BYTES = 1024 * 1024

/**
 * A release function that runs `work` at most once successfully: concurrent
 * and repeated calls share the in-flight attempt, and a failed attempt can be
 * retried.
 */
function onceSuccessful(work: () => Promise<void>): () => Promise<void> {
  let attempt: Promise<void> | undefined
  return () => {
    attempt ??= work().catch((error: unknown) => {
      attempt = undefined
      throw error
    })
    return attempt
  }
}

/** Whether `error` is a filesystem "no such file or directory". */
function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

/** Message for any filesystem failure while writing an upload's bytes. */
const STAGE_FAILED = 'The transfer store could not stage the upload.'

function tooLargeForUpload(maxBytes: number): TransferError {
  return new TransferError(`The upload exceeds its limit of ${String(maxBytes)} bytes.`, {
    reason: 'too-large',
  })
}

class SqliteTransferStore implements TransferStore {
  readonly limits: TransferLimits

  readonly #database: SqliteDatabase
  readonly #paths: TransferPaths
  /** Canonical path of the copies directory; every minted copy is directly inside it. */
  readonly #copies: string
  readonly #now: () => Date
  #closed = false
  #lastSweepAt: number | undefined

  constructor(
    database: SqliteDatabase,
    paths: TransferPaths,
    copies: string,
    now: () => Date,
    limits: TransferLimits
  ) {
    this.#database = database
    this.#paths = paths
    this.#copies = copies
    this.#now = now
    this.limits = limits
  }

  // -- shared helpers -------------------------------------------------------

  /** The current instant in epoch milliseconds, from the injected clock. */
  #nowMs(): number {
    const instant = this.#now().getTime()
    if (!Number.isFinite(instant)) {
      throw new Error('The transfer store clock returned an invalid date.')
    }
    return instant
  }

  #assertOpen(): void {
    if (this.#closed) {
      throw new Error('The transfer store is closed.')
    }
  }

  #uploadFile(uploadId: string): string {
    return path.join(this.#paths.uploads, uploadId)
  }

  /**
   * Run a mutating call, then sweep if none has run for
   * {@link SWEEP_INTERVAL_MS} (or the clock went back).
   *
   * The sweep runs after the call so the call reports on the records it
   * found: a transfer that expired a moment ago is `expired` to this call,
   * and `unknown-transfer` only once a sweep has removed it. A failed
   * opportunistic sweep never changes the call's outcome; the next one
   * retries.
   */
  async #thenSweepIfDue<T>(call: () => T | Promise<T>): Promise<T> {
    try {
      return await call()
    } finally {
      if (!this.#closed) {
        try {
          const now = this.#nowMs()
          const last = this.#lastSweepAt
          if (last === undefined || now - last >= SWEEP_INTERVAL_MS || now < last) {
            await this.sweep()
          }
        } catch {
          // Cleanup is retried by the next sweep; the call's result stands.
        }
      }
    }
  }

  /**
   * Run `work` in one transaction that takes the write lock at the start.
   * Every store transaction reads and then writes based on what it read, so
   * concurrent stores on the same home queue for the lock rather than fail
   * on upgrading a concurrent read.
   */
  #transaction<T>(work: () => T): T {
    return runInTransaction(this.#database, work, { immediate: true })
  }

  #getRow(sql: string, ...params: (string | number)[]): SqliteRow | undefined {
    return this.#database.prepare(sql).get(...params)
  }

  #run(sql: string, ...params: (string | number | null)[]): void {
    this.#database.prepare(sql).run(...params)
  }

  // -- grants ---------------------------------------------------------------

  issueGrant(subject: string, file: GrantedFile): Promise<IssuedFileGrant> {
    return this.#thenSweepIfDue(() => this.#issueGrant(subject, file))
  }

  #issueGrant(subject: string, file: GrantedFile): IssuedFileGrant {
    this.#assertOpen()
    assertSubject(subject)
    assertGrantedFile(file)

    const expiresAt = this.#nowMs() + this.limits.fileGrantTtlMs
    const token = mintToken()
    this.#run(
      `INSERT INTO grants (token_hash, subject, app, path, observed_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      hashToken(token),
      subject,
      file.app,
      file.path ?? null,
      file.observedAt.getTime(),
      expiresAt
    )
    return { token, expiresAt: new Date(expiresAt) }
  }

  /** Synchronous grant lookup shared by redemption and link issue. */
  #findGrant(subject: string, token: string): FileGrantRecord {
    const row = this.#getRow('SELECT * FROM grants WHERE token_hash = ?', hashToken(token))
    if (row === undefined || textColumn(row, 'subject') !== subject) {
      throw unknownTransfer('grant')
    }
    const expiresAt = integerColumn(row, 'expires_at')
    if (this.#nowMs() >= expiresAt) {
      throw expiredTransfer('grant')
    }
    const filePath = optionalTextColumn(row, 'path')
    return {
      app: textColumn(row, 'app'),
      ...(filePath === undefined ? {} : { path: filePath }),
      observedAt: new Date(integerColumn(row, 'observed_at')),
      expiresAt: new Date(expiresAt),
    }
  }

  redeemGrant(subject: string, token: string): Promise<FileGrantRecord> {
    return Promise.resolve().then(() => {
      this.#assertOpen()
      assertSubject(subject)
      return this.#findGrant(subject, token)
    })
  }

  // -- uploads --------------------------------------------------------------

  createUpload(subject: string, options: CreateUploadOptions = {}): Promise<CreatedUpload> {
    return this.#thenSweepIfDue(() => this.#createUpload(subject, options))
  }

  #createUpload(subject: string, options: CreateUploadOptions): CreatedUpload {
    this.#assertOpen()
    assertSubject(subject)

    const now = this.#nowMs()
    const { maxUploadBytes, maxOutstandingUploadsPerSubject, uploadTtlMs } = this.limits
    const uploadId = randomUUID()
    const expiresAt = now + uploadTtlMs

    this.#transaction(() => {
      const outstanding = this.#getRow(
        `SELECT COUNT(*) AS count, MIN(expires_at) AS oldest FROM uploads
         WHERE subject = ? AND consumed_at IS NULL AND expires_at > ?`,
        subject,
        now
      )
      const count = outstanding === undefined ? 0 : integerColumn(outstanding, 'count')
      if (count >= maxOutstandingUploadsPerSubject && outstanding !== undefined) {
        const oldest = integerColumn(outstanding, 'oldest')
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest - now) / 1000))
        throw new RateLimitedError(
          `Too many outstanding uploads. Try again in ${String(retryAfterSeconds)} seconds.`,
          { retryAfterSeconds }
        )
      }
      this.#run(
        `INSERT INTO uploads (upload_id, subject, content_type, max_bytes, created_at, expires_at, state)
         VALUES (?, ?, ?, ?, ?, ?, 'awaiting')`,
        uploadId,
        subject,
        options.contentType ?? null,
        maxUploadBytes,
        now,
        expiresAt
      )
    })
    return { uploadId, maxBytes: maxUploadBytes, expiresAt: new Date(expiresAt) }
  }

  /**
   * Claim an upload for receiving: it must be the subject's, unconsumed,
   * unexpired, and awaiting bytes. Returns its stored limit and expiry.
   */
  #beginReceive(subject: string, uploadId: string): { maxBytes: number; expiresAt: number } {
    const now = this.#nowMs()
    return this.#transaction(() => {
      const row = this.#getRow('SELECT * FROM uploads WHERE upload_id = ?', uploadId)
      if (
        row === undefined ||
        textColumn(row, 'subject') !== subject ||
        optionalIntegerColumn(row, 'consumed_at') !== undefined
      ) {
        throw unknownTransfer('upload')
      }
      const expiresAt = integerColumn(row, 'expires_at')
      if (now >= expiresAt) {
        throw expiredTransfer('upload')
      }
      if (textColumn(row, 'state') !== 'awaiting') {
        throw unknownTransfer('upload')
      }
      this.#run(
        `UPDATE uploads SET state = 'receiving', received_bytes = 0 WHERE upload_id = ?`,
        uploadId
      )
      return { maxBytes: integerColumn(row, 'max_bytes'), expiresAt }
    })
  }

  /**
   * Reserve room against the subject's outstanding budget for this receive
   * to reach at least `needed` bytes, and return the new reservation (see
   * {@link RESERVATION_STEP_BYTES}). Recording it lets concurrent receives by
   * the same subject see it. Throws when the upload vanished, was consumed,
   * expired, or `needed` would exceed the subject's budget.
   */
  #reserveBytes(subject: string, uploadId: string, maxBytes: number, needed: number): number {
    const now = this.#nowMs()
    return this.#transaction(() => {
      this.#assertStillReceiving(uploadId, now)
      const others = this.#getRow(
        `SELECT COALESCE(SUM(received_bytes), 0) AS total FROM uploads
         WHERE subject = ? AND upload_id <> ? AND consumed_at IS NULL AND expires_at > ?`,
        subject,
        uploadId,
        now
      )
      const othersTotal = others === undefined ? 0 : integerColumn(others, 'total')
      const budget = this.limits.maxOutstandingUploadBytesPerSubject
      if (othersTotal + needed > budget) {
        throw new TransferError(
          `The upload would exceed the limit of ${String(budget)} bytes across this caller's outstanding uploads.`,
          { reason: 'too-large' }
        )
      }
      const reservation = Math.min(maxBytes, needed + RESERVATION_STEP_BYTES, budget - othersTotal)
      this.#run('UPDATE uploads SET received_bytes = ? WHERE upload_id = ?', reservation, uploadId)
      return reservation
    })
  }

  /** Within a transaction: the upload is still being received and unexpired. */
  #assertStillReceiving(uploadId: string, now: number): void {
    const row = this.#getRow(
      'SELECT state, consumed_at, expires_at FROM uploads WHERE upload_id = ?',
      uploadId
    )
    if (
      row === undefined ||
      optionalIntegerColumn(row, 'consumed_at') !== undefined ||
      textColumn(row, 'state') !== 'receiving'
    ) {
      throw unknownTransfer('upload')
    }
    if (now >= integerColumn(row, 'expires_at')) {
      throw expiredTransfer('upload')
    }
  }

  receiveUpload(
    subject: string,
    uploadId: string,
    bytes: UploadByteSource,
    options: ReceiveUploadOptions = {}
  ): Promise<ReceivedUpload> {
    return this.#thenSweepIfDue(() => this.#receiveUpload(subject, uploadId, bytes, options))
  }

  async #receiveUpload(
    subject: string,
    uploadId: string,
    bytes: UploadByteSource,
    options: ReceiveUploadOptions
  ): Promise<ReceivedUpload> {
    this.#assertOpen()
    assertSubject(subject)

    const { maxBytes, expiresAt } = this.#beginReceive(subject, uploadId)
    const file = this.#uploadFile(uploadId)
    let handle: fsp.FileHandle | undefined
    let received = 0
    let reserved = 0
    try {
      await withoutPath(() => removeFile(file), STAGE_FAILED)
      handle = await withoutPath(() => fsp.open(file, 'wx', FILE_MODE), STAGE_FAILED)
      const opened = handle
      for await (const chunk of readChunks(bytes, options.signal)) {
        const next = received + chunk.length
        if (this.#nowMs() >= expiresAt) {
          throw expiredTransfer('upload')
        }
        if (next > maxBytes) {
          throw tooLargeForUpload(maxBytes)
        }
        if (next > reserved) {
          reserved = this.#reserveBytes(subject, uploadId, maxBytes, next)
        }
        await withoutPath(() => writeAll(opened, chunk), STAGE_FAILED)
        received = next
      }
      handle = undefined
      await withoutPath(() => opened.close(), STAGE_FAILED)

      const now = this.#nowMs()
      this.#transaction(() => {
        this.#assertStillReceiving(uploadId, now)
        this.#run(
          `UPDATE uploads SET state = 'complete', received_bytes = ? WHERE upload_id = ?`,
          received,
          uploadId
        )
      })
      return { uploadId, size: received, expiresAt: new Date(expiresAt) }
    } catch (error) {
      await handle?.close().catch(() => undefined)
      await removeFile(file).catch(() => undefined)
      if (!this.#closed) {
        try {
          // Only an upload this receive still holds is settled: one consumed
          // or swept meanwhile is left as it is.
          this.#run(
            `UPDATE uploads SET state = ?, received_bytes = 0
             WHERE upload_id = ? AND state = 'receiving'`,
            isTooLarge(error) ? 'failed' : 'awaiting',
            uploadId
          )
        } catch {
          // The caller needs the original failure, not this one. An upload
          // left `receiving` expires and is swept like any other.
        }
      }
      throw error
    }
  }

  consumeUpload(subject: string, uploadId: string): Promise<ConsumedUpload> {
    return this.#thenSweepIfDue(() => this.#consumeUpload(subject, uploadId))
  }

  async #consumeUpload(subject: string, uploadId: string): Promise<ConsumedUpload> {
    this.#assertOpen()
    assertSubject(subject)

    const now = this.#nowMs()
    // Decided inside one transaction that always commits the consumption;
    // the outcome is thrown only after the commit.
    const outcome = this.#transaction(() => {
      const row = this.#getRow('SELECT * FROM uploads WHERE upload_id = ?', uploadId)
      if (
        row === undefined ||
        textColumn(row, 'subject') !== subject ||
        optionalIntegerColumn(row, 'consumed_at') !== undefined
      ) {
        throw unknownTransfer('upload')
      }
      let failure: TransferError | undefined
      if (now >= integerColumn(row, 'expires_at')) {
        failure = expiredTransfer('upload')
      } else if (textColumn(row, 'state') !== 'complete') {
        failure = incompleteUpload()
      }
      // A failed consume has no caller to release the bytes, so it is
      // released here and its bytes removed below.
      this.#run(
        'UPDATE uploads SET consumed_at = ?, released = ? WHERE upload_id = ?',
        now,
        failure === undefined ? 0 : 1,
        uploadId
      )
      return { row, failure }
    })

    const file = this.#uploadFile(uploadId)
    if (outcome.failure !== undefined) {
      // Best effort: a file that cannot be deleted now is retried by the sweep.
      await removeFile(file).catch(() => undefined)
      throw outcome.failure
    }

    const contentType = optionalTextColumn(outcome.row, 'content_type')
    return {
      path: file,
      ...(contentType === undefined ? {} : { contentType }),
      size: integerColumn(outcome.row, 'received_bytes'),
      release: onceSuccessful(async () => {
        await withoutPath(
          () => removeFile(file),
          'The transfer store could not delete the staged upload.'
        )
        if (!this.#closed) {
          this.#run('UPDATE uploads SET released = 1 WHERE upload_id = ?', uploadId)
        }
      }),
    }
  }

  // -- download links -------------------------------------------------------

  issueDownloadLink(subject: string, grantToken: string): Promise<IssuedDownloadLink> {
    return this.#thenSweepIfDue(() => this.#issueDownloadLink(subject, grantToken))
  }

  #issueDownloadLink(subject: string, grantToken: string): IssuedDownloadLink {
    this.#assertOpen()
    assertSubject(subject)

    const grant = this.#findGrant(subject, grantToken)
    const expiresAt = this.#nowMs() + this.limits.downloadLinkTtlMs
    const token = mintToken()
    this.#run(
      'INSERT INTO download_links (token_hash, app, path, expires_at) VALUES (?, ?, ?, ?)',
      hashToken(token),
      grant.app,
      grant.path ?? null,
      expiresAt
    )
    return { token, expiresAt: new Date(expiresAt) }
  }

  redeemDownloadLink(token: string): Promise<DownloadLinkTarget> {
    return Promise.resolve().then(() => {
      this.#assertOpen()
      const row = this.#getRow(
        'SELECT app, path, expires_at FROM download_links WHERE token_hash = ?',
        hashToken(token)
      )
      if (row === undefined) {
        throw unknownTransfer('link')
      }
      if (this.#nowMs() >= integerColumn(row, 'expires_at')) {
        throw expiredTransfer('link')
      }
      const filePath = optionalTextColumn(row, 'path')
      return {
        app: textColumn(row, 'app'),
        ...(filePath === undefined ? {} : { path: filePath }),
      }
    })
  }

  // -- temporary copies -----------------------------------------------------

  allocateTemporaryCopy(
    subject: string,
    options: AllocateTemporaryCopyOptions = {}
  ): Promise<AllocatedTemporaryCopy> {
    return this.#thenSweepIfDue(() => this.#allocateTemporaryCopy(subject, options))
  }

  async #allocateTemporaryCopy(
    subject: string,
    options: AllocateTemporaryCopyOptions
  ): Promise<AllocatedTemporaryCopy> {
    this.#assertOpen()
    assertSubject(subject)
    const { extension } = options
    if (extension !== undefined && !COPY_EXTENSION.test(extension)) {
      throw new RangeError(
        'A temporary copy extension must be a "." followed by 1 to 16 ASCII letters or digits.'
      )
    }

    const copyPath = path.join(this.#copies, `${randomUUID()}${extension ?? ''}`)
    await withoutPath(async () => {
      const created = await fsp.open(copyPath, 'wx', FILE_MODE)
      await created.close()
    }, 'The transfer store could not create a temporary copy.')

    const expiresAt = this.#nowMs() + this.limits.temporaryCopyTtlMs
    try {
      this.#run(
        'INSERT INTO temporary_copies (path, subject, expires_at) VALUES (?, ?, ?)',
        copyPath,
        subject,
        expiresAt
      )
    } catch (error) {
      await removeFile(copyPath).catch(() => undefined)
      throw error
    }
    return {
      path: copyPath,
      expiresAt: new Date(expiresAt),
      release: onceSuccessful(async () => {
        await withoutPath(
          () => this.#removeCopy(copyPath),
          'The transfer store could not delete the temporary copy.'
        )
        if (!this.#closed) {
          this.#run('DELETE FROM temporary_copies WHERE path = ?', copyPath)
        }
      }),
    }
  }

  /**
   * Delete a minted temporary copy, refusing anything else.
   *
   * Only a path directly inside the canonical copies directory, with a name
   * the store mints, that is still a regular file is deleted. A symlink or
   * directory in its place is neither followed nor removed (`'refused'`):
   * the record can be forgotten, but nothing outside the store is touched.
   * `unlink` never follows a symlink, so a swap after the check is harmless.
   *
   * @returns `'removed'` when the copy is gone (including when it already
   *   was), `'refused'` when the path is not one the store may delete.
   */
  async #removeCopy(copyPath: string): Promise<'removed' | 'refused'> {
    if (path.dirname(copyPath) !== this.#copies || !COPY_NAME.test(path.basename(copyPath))) {
      return 'refused'
    }
    try {
      const stats = await fsp.lstat(copyPath)
      if (!stats.isFile()) {
        return 'refused'
      }
      await fsp.unlink(copyPath)
    } catch (error) {
      if (!isMissingFile(error)) {
        throw error
      }
    }
    return 'removed'
  }

  // -- lifecycle ------------------------------------------------------------

  async sweep(): Promise<void> {
    this.#assertOpen()
    const now = this.#nowMs()
    this.#lastSweepAt = now

    this.#transaction(() => {
      this.#run('DELETE FROM grants WHERE expires_at <= ?', now)
      this.#run('DELETE FROM download_links WHERE expires_at <= ?', now)
    })

    // Uploads: expired unconsumed ones, released ones, and consumed ones
    // abandoned past their retention. Files first; a record is deleted only
    // once its file is gone.
    const retainedSince = now - this.limits.consumedUploadRetentionMs
    const uploadIds = this.#database
      .prepare(
        `SELECT upload_id FROM uploads
         WHERE released = 1
            OR (consumed_at IS NULL AND expires_at <= ?)
            OR (consumed_at IS NOT NULL AND consumed_at <= ?)`
      )
      .all(now, retainedSince)
      .map((row) => textColumn(row, 'upload_id'))
    const uploadResults = await Promise.allSettled(
      uploadIds.map((uploadId) => removeFile(this.#uploadFile(uploadId)))
    )

    const copyPaths = this.#database
      .prepare('SELECT path FROM temporary_copies WHERE expires_at <= ?')
      .all(now)
      .map((row) => textColumn(row, 'path'))
    const copyResults = await Promise.allSettled(copyPaths.map((copy) => this.#removeCopy(copy)))

    this.#assertOpen()
    this.#transaction(() => {
      uploadIds.forEach((uploadId, index) => {
        if (uploadResults[index]?.status === 'fulfilled') {
          this.#run('DELETE FROM uploads WHERE upload_id = ?', uploadId)
        }
      })
      copyPaths.forEach((copy, index) => {
        // Removed or refused alike, the record goes; a copy that could not be
        // deleted keeps its record for the next sweep.
        if (copyResults[index]?.status === 'fulfilled') {
          this.#run('DELETE FROM temporary_copies WHERE path = ?', copy)
        }
      })
    })
  }

  close(): void {
    if (this.#closed) {
      return
    }
    this.#closed = true
    this.#database.close()
  }
}

/**
 * Open the transfer store under `options.home` (default: the macts home),
 * creating its directories and database when absent, and sweep it.
 *
 * Several stores, in one process or several, may be open on the same home at
 * once; the database serializes their changes.
 *
 * @throws RangeError when a limit override is not a positive integer.
 * @throws Error when the store's database was created by a newer macts, or
 *   has a schema version this macts does not recognize; nothing is changed.
 */
export async function createTransferStore(
  options: CreateTransferStoreOptions = {}
): Promise<TransferStore> {
  const limits = resolveTransferLimits(options.limits)
  const paths = transferPaths(options.home ?? getMactsHome())
  const now = options.now ?? ((): Date => new Date())
  const database = openTransferDatabase(paths)
  let store: SqliteTransferStore
  try {
    store = new SqliteTransferStore(database, paths, canonicalCopiesDirectory(paths), now, limits)
  } catch (error) {
    database.close()
    throw error
  }
  try {
    await store.sweep()
  } catch (error) {
    store.close()
    throw error
  }
  return store
}
