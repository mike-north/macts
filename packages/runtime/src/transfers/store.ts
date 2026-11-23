/**
 * The transfer store: the service's persistent, subject-bound record of
 * binary transfers (phases/13, D8).
 *
 * It holds two kinds of transfer, each with a lifetime:
 *
 * - **File grants** — issued when an authorized operation returns a file, and
 *   exchanged by the same subject, until they expire, for a fetched file.
 * - **Download links** — short-lived bearer capabilities that deliver one
 *   granted file over HTTP.
 *
 * ## Guarantees
 *
 * - **Subject binding.** A grant presented by any subject other than the one
 *   it was issued to fails exactly like an unknown one (`TransferError`
 *   `unknown-transfer`, same message), so tokens cannot be probed. Download
 *   links are the exception by design: a link *is* the capability, so
 *   redeeming one takes no subject.
 * - **Expiry.** Every transfer expires at a fixed instant computed from the
 *   store's clock when it is issued. A transfer is usable strictly before its
 *   expiry; at `expiresAt` it is already expired.
 * - **No secrets at rest or in errors.** Tokens are 32 random bytes and only
 *   their SHA-256 digests are stored. No error message contains a token. The
 *   store does no logging at all.
 *
 * ## Cleanup
 *
 * {@link TransferStore.sweep} removes expired records. It runs when a store
 * is opened and, opportunistically, at most once a minute after a mutating
 * call. Once swept, an expired transfer is unknown.
 *
 * The store moves no bytes over the network and makes no authorization
 * decision beyond subject binding: callers verify the credential and the
 * operation's permission first, and pass the authority's subject in.
 *
 * @packageDocumentation
 */

import { TransferError } from '@macts/contracts'
import { getMactsHome } from '../paths.js'
import { runInTransaction, type SqliteDatabase, type SqliteRow } from '../storage/sqlite.js'
import {
  integerColumn,
  openTransferDatabase,
  optionalTextColumn,
  textColumn,
  transferPaths,
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

  /** Remove expired grants and download links. */
  sweep(): Promise<void>

  /** Close the database. Safe to call more than once; every other method fails once the store is closed. */
  close(): void
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** The one message per kind for an unknown transfer: never says why. */
const UNKNOWN = {
  grant: 'Unknown file grant.',
  link: 'Unknown download link.',
} as const

/** The one message per kind for an expired transfer. */
const EXPIRED = {
  grant: 'The file grant has expired.',
  link: 'The download link has expired.',
} as const

type TransferKind = keyof typeof UNKNOWN

function unknownTransfer(kind: TransferKind): TransferError {
  return new TransferError(UNKNOWN[kind], { reason: 'unknown-transfer' })
}

function expiredTransfer(kind: TransferKind): TransferError {
  return new TransferError(EXPIRED[kind], { reason: 'expired' })
}

// ---------------------------------------------------------------------------
// Argument checks (programming errors, not transfer outcomes)
// ---------------------------------------------------------------------------

function assertSubject(subject: string): void {
  if (typeof subject !== 'string' || subject.length === 0) {
    throw new TypeError('A transfer subject must be a non-empty string.')
  }
}

function assertToken(token: string): void {
  if (typeof token !== 'string' || token.length === 0) {
    throw new TypeError('A transfer token must be a non-empty string.')
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

class SqliteTransferStore implements TransferStore {
  readonly limits: TransferLimits

  readonly #database: SqliteDatabase
  readonly #now: () => Date
  #closed = false
  #lastSweepAt: number | undefined

  constructor(database: SqliteDatabase, now: () => Date, limits: TransferLimits) {
    this.#database = database
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

  /**
   * Run a mutating call, then sweep if none has run for
   * {@link SWEEP_INTERVAL_MS} (or the clock went back).
   *
   * The sweep runs after the call so the call reports on the records it
   * found: a transfer that expired a moment ago is `expired` to this call,
   * and `unknown-transfer` only once a sweep has removed it. A failed
   * opportunistic sweep never changes the call's outcome. The sweep time is
   * recorded when a sweep starts, so a failed sweep is retried after the
   * next full interval rather than by the next mutating call.
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
          // Cleanup is retried at the next due sweep; the call's result stands.
        }
      }
    }
  }

  /**
   * Run `work` in one transaction that takes the write lock at the start.
   * Taking the write lock up front makes concurrent stores on the same home
   * queue for it rather than fail when a read transaction later tries to
   * upgrade to a write.
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
      assertToken(token)
      return this.#findGrant(subject, token)
    })
  }

  // -- download links -------------------------------------------------------

  issueDownloadLink(subject: string, grantToken: string): Promise<IssuedDownloadLink> {
    return this.#thenSweepIfDue(() => this.#issueDownloadLink(subject, grantToken))
  }

  #issueDownloadLink(subject: string, grantToken: string): IssuedDownloadLink {
    this.#assertOpen()
    assertSubject(subject)
    assertToken(grantToken)

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
      assertToken(token)
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

  // -- lifecycle ------------------------------------------------------------

  sweep(): Promise<void> {
    return Promise.resolve().then(() => {
      this.#assertOpen()
      const now = this.#nowMs()
      this.#lastSweepAt = now
      this.#transaction(() => {
        this.#run('DELETE FROM grants WHERE expires_at <= ?', now)
        this.#run('DELETE FROM download_links WHERE expires_at <= ?', now)
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
 * creating its directory and database when absent, and sweep it.
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
  const store = new SqliteTransferStore(openTransferDatabase(paths), now, limits)
  try {
    await store.sweep()
  } catch (error) {
    store.close()
    throw error
  }
  return store
}
