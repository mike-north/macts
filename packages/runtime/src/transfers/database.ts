/**
 * On-disk layout and schema of the transfer store.
 *
 * Everything lives under `<home>/transfers/`:
 *
 * - `transfers.db` — the SQLite database of grants, download links, uploads,
 *   and temporary copies;
 * - `uploads/<uploadId>` — the received bytes of each upload;
 * - `copies/<uuid>[.ext]` — temporary copies. The store mints every copy's
 *   path itself, directly inside the canonical (symlink-free) path of this
 *   directory, so it only ever deletes regular files it named.
 *
 * Directories are private to the user (0700) and files are readable only by
 * the user (0600): uploaded bytes are caller content, and the database maps
 * subjects to the files they were granted. Modes are reasserted on every open
 * so a directory created by an older or misconfigured process is tightened.
 *
 * Timestamps are integer milliseconds since the Unix epoch. Tokens are never
 * stored, only their SHA-256 digests (see `tokens.ts`).
 *
 * ## Schema version
 *
 * The schema version lives in `PRAGMA user_version`. Opening a database never
 * rewrites a version it did not just create: a fresh database (version 0)
 * gets the schema and this version in one transaction; a database at this
 * version is used as it is; any other version — in particular one written by
 * a newer macts — is refused, so an older install can never downgrade or
 * half-migrate a newer store.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  loadSqlite,
  runInTransaction,
  type SqliteDatabase,
  type SqliteRow,
} from '../storage/sqlite.js'

/** Mode for every directory the store creates: owner-only access. */
export const DIRECTORY_MODE = 0o700

/** Mode for every file the store creates: owner read/write only. */
export const FILE_MODE = 0o600

/**
 * How long, in milliseconds, a statement waits for another connection's lock
 * before failing. The service and the CLI can open the same store at once.
 */
const BUSY_TIMEOUT_MS = 5000

/** Schema version this code creates and understands, kept in `PRAGMA user_version`. */
export const TRANSFER_SCHEMA_VERSION = 1

/** Where each part of a store lives under its home. */
export interface TransferPaths {
  /** `<home>/transfers` */
  readonly root: string
  /** `<home>/transfers/transfers.db` */
  readonly database: string
  /** `<home>/transfers/uploads` */
  readonly uploads: string
  /** `<home>/transfers/copies` */
  readonly copies: string
}

/** Resolve the store's paths under `home`. */
export function transferPaths(home: string): TransferPaths {
  const root = path.join(path.resolve(home), 'transfers')
  return {
    root,
    database: path.join(root, 'transfers.db'),
    uploads: path.join(root, 'uploads'),
    copies: path.join(root, 'copies'),
  }
}

/** Create `directory` (and missing parents) and make it owner-only. */
function ensurePrivateDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: DIRECTORY_MODE })
  fs.chmodSync(directory, DIRECTORY_MODE)
}

/**
 * Create the database file owner-only before SQLite opens it. SQLite gives
 * its `-wal` and `-shm` companions the database file's mode, so they are
 * owner-only too.
 */
function ensurePrivateFile(file: string): void {
  fs.closeSync(fs.openSync(file, 'a', FILE_MODE))
  fs.chmodSync(file, FILE_MODE)
}

/**
 * Tables:
 *
 * - `grants` — a file an authorized operation returned, exchangeable by its
 *   subject until `expires_at`.
 * - `download_links` — a bearer capability delivering one file until
 *   `expires_at`; it records the file, not the subject.
 * - `uploads` — one upload slot. `state` is where its bytes are: `awaiting`
 *   (none yet, or a receive was interrupted), `receiving`, `complete`, or
 *   `failed` (rejected as too large). `consumed_at` is set by the one consume
 *   an upload allows; `released` once its bytes have been deleted after use.
 * - `temporary_copies` — a copy the store minted for a local read, removed
 *   when released or after `expires_at`.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS grants (
    token_hash TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    app TEXT NOT NULL,
    path TEXT,
    observed_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_grants_expires_at ON grants(expires_at);

  CREATE TABLE IF NOT EXISTS download_links (
    token_hash TEXT PRIMARY KEY,
    app TEXT NOT NULL,
    path TEXT,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_download_links_expires_at ON download_links(expires_at);

  CREATE TABLE IF NOT EXISTS uploads (
    upload_id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    content_type TEXT,
    max_bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('awaiting', 'receiving', 'complete', 'failed')),
    received_bytes INTEGER NOT NULL DEFAULT 0,
    consumed_at INTEGER,
    released INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_uploads_subject ON uploads(subject, consumed_at, expires_at);

  CREATE TABLE IF NOT EXISTS temporary_copies (
    path TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`

/** The database's `PRAGMA user_version`. */
function readSchemaVersion(database: SqliteDatabase): number {
  const row = database.prepare('PRAGMA user_version').get()
  return row === undefined ? 0 : integerColumn(row, 'user_version')
}

/**
 * Refuse a database whose schema version this code does not understand.
 *
 * @throws Error naming both versions: a newer database needs a newer macts,
 *   and any other unknown version is not a transfer store this code wrote.
 */
function assertKnownSchemaVersion(version: number): void {
  if (version === 0 || version === TRANSFER_SCHEMA_VERSION) {
    return
  }
  if (version > TRANSFER_SCHEMA_VERSION) {
    throw new Error(
      `The transfer store was created by a newer version of macts (schema version ${String(version)}); ` +
        `this version understands schema version ${String(TRANSFER_SCHEMA_VERSION)} and cannot open it. ` +
        'Upgrade macts to use it.'
    )
  }
  throw new Error(
    `The transfer store has schema version ${String(version)}, which this version of macts ` +
      `does not recognize (it understands schema version ${String(TRANSFER_SCHEMA_VERSION)}), so it cannot open it.`
  )
}

/**
 * Create the schema in a fresh database, or check an existing one's version.
 *
 * The fresh-database step runs in one immediate transaction and re-reads the
 * version once it holds the write lock, so two processes opening a new home
 * at once create the schema exactly once.
 */
function prepareSchema(database: SqliteDatabase): void {
  const version = readSchemaVersion(database)
  assertKnownSchemaVersion(version)
  if (version === TRANSFER_SCHEMA_VERSION) {
    return
  }
  runInTransaction(
    database,
    () => {
      const current = readSchemaVersion(database)
      assertKnownSchemaVersion(current)
      if (current === 0) {
        database.exec(SCHEMA)
        database.exec(`PRAGMA user_version = ${String(TRANSFER_SCHEMA_VERSION)}`)
      }
    },
    { immediate: true }
  )
}

/**
 * Prepare the directories and open the database, creating the schema when
 * the database is fresh.
 *
 * The busy timeout is set before anything that takes a lock (switching to
 * WAL, creating the schema), so a process opening the store while another
 * holds the lock waits instead of failing.
 *
 * @throws Error when the database's schema version is not one this code
 *   understands (see the module documentation); the database is closed and
 *   left untouched.
 */
export function openTransferDatabase(paths: TransferPaths): SqliteDatabase {
  ensurePrivateDirectory(paths.root)
  ensurePrivateDirectory(paths.uploads)
  ensurePrivateDirectory(paths.copies)
  ensurePrivateFile(paths.database)

  const { DatabaseSync } = loadSqlite()
  const database = new DatabaseSync(paths.database)
  try {
    database.exec(`PRAGMA busy_timeout = ${String(BUSY_TIMEOUT_MS)}`)
    database.exec('PRAGMA journal_mode = WAL')
    prepareSchema(database)
  } catch (error) {
    database.close()
    throw error
  }
  return database
}

/** The directories the store deletes files in, as canonical paths. */
export interface CanonicalTransferDirectories {
  /** Canonical `<home>/transfers/uploads`. */
  readonly uploads: string
  /** Canonical `<home>/transfers/copies`. */
  readonly copies: string
}

/**
 * The canonical paths of the uploads and copies directories: every symlink
 * in them resolved (on macOS, `/var/…` becomes `/private/var/…`). Upload
 * bytes and temporary copies live directly inside them, and the store only
 * ever deletes paths directly inside them.
 */
export function canonicalDirectories(paths: TransferPaths): CanonicalTransferDirectories {
  return { uploads: fs.realpathSync(paths.uploads), copies: fs.realpathSync(paths.copies) }
}

/**
 * Read a column the schema declares `TEXT NOT NULL`.
 *
 * @throws Error when the stored value is not text, which means the database
 *   was altered outside the store.
 */
export function textColumn(row: SqliteRow, column: string): string {
  const value = row[column]
  if (typeof value !== 'string') {
    throw new Error(`Transfer store column ${column} holds a non-text value.`)
  }
  return value
}

/** Read a nullable `TEXT` column; `NULL` becomes `undefined`. */
export function optionalTextColumn(row: SqliteRow, column: string): string | undefined {
  const value = row[column]
  return value === null || value === undefined ? undefined : textColumn(row, column)
}

/**
 * Read a column the schema declares `INTEGER NOT NULL`.
 *
 * @throws Error when the stored value is not a safe integer.
 */
export function integerColumn(row: SqliteRow, column: string): number {
  const value = row[column]
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`Transfer store column ${column} holds a non-integer value.`)
  }
  return value
}

/** Read a nullable `INTEGER` column; `NULL` becomes `undefined`. */
export function optionalIntegerColumn(row: SqliteRow, column: string): number | undefined {
  const value = row[column]
  return value === null || value === undefined ? undefined : integerColumn(row, column)
}
