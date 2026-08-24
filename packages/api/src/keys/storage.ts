/**
 * Storage utilities for API key management.
 *
 * Handles:
 * - Signing secret storage and generation (file-based)
 * - Key metadata storage for listing and revocation (SQLite)
 * - Optional per-key governance policies, keyed by key id (SQLite)
 *
 * Uses SQLite for key metadata to provide:
 * - Atomic transactions
 * - Concurrent access safety
 * - Efficient queries by key ID
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs/promises'
import * as fsSync from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import Database from 'better-sqlite3'
import type { ApiKeyMetadata, GovernancePolicy } from '@macts/core'
import { parsePolicy } from '@macts/core'
import { getLogger } from '../logger.js'
import { getMactsHome } from '../paths.js'
import { deriveEncryptionKey, encrypt, decrypt } from './encryption.js'

/**
 * Default directory for macts configuration.
 *
 * Resolved via {@link getMactsHome} so the signing secret and key database
 * live in the same place as plugins and other configuration: `MACTS_HOME`
 * when set, otherwise `~/.macts` (via `os.homedir()`). Never a cwd-relative
 * `./~/.macts`, which the previous `process.env['HOME'] ?? '~'` fallback
 * produced when `HOME` was unset.
 */
const MACTS_DIR = getMactsHome()

/** Directory for secrets */
const SECRETS_DIR = path.join(MACTS_DIR, 'secrets')

/** File path for API key signing secret */
const SECRET_FILE = path.join(SECRETS_DIR, 'api-key-secret')

/** File path for SQLite database */
const DB_FILE = path.join(MACTS_DIR, 'api-keys.db')

/** Legacy JSON file path (for migration) */
const LEGACY_JSON_FILE = path.join(MACTS_DIR, 'api-keys.json')

/** Environment variable for overriding the signing secret */
const SECRET_ENV_VAR = 'MACTS_API_KEY_SECRET'

/** Singleton database instance */
let db: Database.Database | null = null

/** Cached signing secret (indefinite per-process cache) */
let cachedSigningSecret: string | null = null

/** Cached encryption key derived from signing secret */
let cachedEncryptionKey: Buffer | null = null

/** Current schema version (bump when adding migrations) */
const SCHEMA_VERSION = 1

/**
 * Database row type for key metadata.
 */
interface KeyRow {
  id: string
  name: string
  permissions: string // JSON array or encrypted blob
  original_permissions: string // JSON array or encrypted blob
  created_at: number // Unix timestamp in milliseconds
  expires_at: number | null // Unix timestamp in milliseconds, or null
  revoked: number // 0 or 1
  key_prefix: string // plaintext or encrypted blob
  encrypted: number // 0 or 1
}

/**
 * Ensure the macts directory exists.
 */
function ensureMactsDir(): void {
  if (!fsSync.existsSync(MACTS_DIR)) {
    fsSync.mkdirSync(MACTS_DIR, { recursive: true, mode: 0o700 })
  }
}

/**
 * Get or create the database connection.
 */
function getDb(): Database.Database {
  if (db) {
    return db
  }

  ensureMactsDir()

  db = new Database(DB_FILE)

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL')

  // Create table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      permissions TEXT NOT NULL,
      original_permissions TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER,
      revoked INTEGER NOT NULL DEFAULT 0,
      key_prefix TEXT NOT NULL,
      encrypted INTEGER NOT NULL DEFAULT 0
    )
  `)

  // Create index for efficient revocation checks
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_api_keys_revoked ON api_keys(id, revoked)
  `)

  // Per-key governance policies, keyed by the key id (`ApiKeyPayload.sub`) and
  // stored in the same database as the key metadata they belong to, so a key and
  // its policy are always written, read, and deleted through one store.
  //
  // No `user_version` migration is needed: `CREATE TABLE IF NOT EXISTS` runs on
  // every open, so a database created before per-key policies existed picks the
  // table up the next time it is opened. Deleting a key deletes its policy (see
  // {@link deleteKeyMetadata}) rather than leaving an orphan behind.
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_key_policies (
      key_id TEXT PRIMARY KEY,
      policy TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      encrypted INTEGER NOT NULL DEFAULT 1
    )
  `)

  // Run schema migrations
  migrateSchema(db)

  // Migrate from legacy JSON if it exists
  migrateFromJson(db)

  return db
}

/**
 * Run schema migrations based on user_version pragma.
 */
function migrateSchema(database: Database.Database): void {
  const currentVersion =
    (database.pragma('user_version') as { user_version: number }[])[0]?.user_version ?? 0

  if (currentVersion < 1) {
    // Migration 1: Add encrypted column if it doesn't exist
    const columns = database.prepare("PRAGMA table_info('api_keys')").all() as {
      name: string
    }[]
    const hasEncrypted = columns.some((col) => col.name === 'encrypted')
    if (!hasEncrypted) {
      database.exec('ALTER TABLE api_keys ADD COLUMN encrypted INTEGER NOT NULL DEFAULT 0')
    }

    database.pragma(`user_version = ${String(SCHEMA_VERSION)}`)
  }
}

/**
 * Get the encryption key, deriving it from the cached signing secret.
 *
 * The signing secret must already be cached (via getSigningSecret)
 * before calling any storage functions that need encryption.
 * Falls back to reading from file synchronously if not cached.
 */
function getEncryptionKey(): Buffer {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey
  }

  if (!cachedSigningSecret) {
    // Try to load synchronously from env or file
    const envSecret = process.env[SECRET_ENV_VAR]
    if (envSecret) {
      cachedSigningSecret = envSecret
    } else {
      try {
        cachedSigningSecret = fsSync.readFileSync(SECRET_FILE, 'utf-8').trim()
      } catch {
        // Generate and store a new secret synchronously
        ensureMactsDir()
        fsSync.mkdirSync(SECRETS_DIR, { recursive: true, mode: 0o700 })
        cachedSigningSecret = crypto.randomBytes(32).toString('base64')
        fsSync.writeFileSync(SECRET_FILE, cachedSigningSecret, { mode: 0o600 })
      }
    }
  }

  cachedEncryptionKey = deriveEncryptionKey(cachedSigningSecret)
  return cachedEncryptionKey
}

/**
 * Encrypt sensitive fields for a key row before writing to the database.
 */
function encryptRow(
  permissions: string,
  originalPermissions: string,
  keyPrefix: string
): {
  permissions: string
  originalPermissions: string
  keyPrefix: string
} {
  const key = getEncryptionKey()
  return {
    permissions: encrypt(permissions, key),
    originalPermissions: encrypt(originalPermissions, key),
    keyPrefix: encrypt(keyPrefix, key),
  }
}

/**
 * Decrypt sensitive fields from a key row after reading from the database.
 * If the row is not encrypted (encrypted === 0), returns values as-is.
 */
function decryptRow(row: KeyRow): KeyRow {
  if (row.encrypted === 0) {
    return row
  }
  const key = getEncryptionKey()
  return {
    ...row,
    permissions: decrypt(row.permissions, key),
    original_permissions: decrypt(row.original_permissions, key),
    key_prefix: decrypt(row.key_prefix, key),
  }
}

/**
 * Auto-migrate an unencrypted row to encrypted form.
 * Called lazily on read when an unencrypted row is encountered.
 */
function autoEncryptRow(database: Database.Database, row: KeyRow): KeyRow {
  if (row.encrypted === 1) {
    return row
  }

  const encrypted = encryptRow(row.permissions, row.original_permissions, row.key_prefix)

  database
    .prepare(
      `UPDATE api_keys SET
        permissions = ?,
        original_permissions = ?,
        key_prefix = ?,
        encrypted = 1
      WHERE id = ?`
    )
    .run(encrypted.permissions, encrypted.originalPermissions, encrypted.keyPrefix, row.id)

  return {
    ...row,
    permissions: encrypted.permissions,
    original_permissions: encrypted.originalPermissions,
    key_prefix: encrypted.keyPrefix,
    encrypted: 1,
  }
}

/**
 * Migrate data from legacy JSON file to SQLite.
 */
function migrateFromJson(database: Database.Database): void {
  if (!fsSync.existsSync(LEGACY_JSON_FILE)) {
    return
  }

  try {
    const data = fsSync.readFileSync(LEGACY_JSON_FILE, 'utf-8')
    const storage = JSON.parse(data) as { keys?: ApiKeyMetadata[] }

    if (!storage.keys || storage.keys.length === 0) {
      // Empty file, just remove it
      fsSync.unlinkSync(LEGACY_JSON_FILE)
      return
    }

    // Check if we've already migrated (table has data)
    const count = database.prepare('SELECT COUNT(*) as count FROM api_keys').get() as {
      count: number
    }
    if (count.count > 0) {
      // Already have data, don't migrate again but remove legacy file
      fsSync.unlinkSync(LEGACY_JSON_FILE)
      return
    }

    // Insert all keys in a transaction (encrypted)
    const insert = database.prepare(`
      INSERT OR IGNORE INTO api_keys
      (id, name, permissions, original_permissions, created_at, expires_at, revoked, key_prefix, encrypted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `)

    const insertMany = database.transaction((keys: ApiKeyMetadata[]) => {
      for (const key of keys) {
        const encrypted = encryptRow(
          JSON.stringify(key.permissions),
          JSON.stringify(key.originalPermissions),
          key.keyPrefix
        )
        insert.run(
          key.id,
          key.name,
          encrypted.permissions,
          encrypted.originalPermissions,
          new Date(key.createdAt).getTime(),
          key.expiresAt ? new Date(key.expiresAt).getTime() : null,
          key.revoked ? 1 : 0,
          encrypted.keyPrefix
        )
      }
    })

    insertMany(storage.keys)

    // Remove legacy file after successful migration
    fsSync.unlinkSync(LEGACY_JSON_FILE)
  } catch (err) {
    // If migration fails, leave the JSON file and continue
    // Log the error so users know something went wrong
    getLogger().error({ err }, 'Failed to migrate API keys from JSON to SQLite')
    getLogger().error({ path: LEGACY_JSON_FILE }, 'Your keys are still in this location')
    getLogger().error('Please report this issue if it persists.')
  }
}

/**
 * Convert a database row to ApiKeyMetadata.
 * Handles decryption of encrypted rows transparently.
 */
function rowToMetadata(row: KeyRow): ApiKeyMetadata {
  const decrypted = decryptRow(row)
  return {
    id: decrypted.id,
    name: decrypted.name,
    permissions: JSON.parse(decrypted.permissions) as string[],
    originalPermissions: JSON.parse(decrypted.original_permissions) as string[],
    createdAt: new Date(decrypted.created_at),
    expiresAt: decrypted.expires_at !== null ? new Date(decrypted.expires_at) : undefined,
    revoked: decrypted.revoked === 1,
    keyPrefix: decrypted.key_prefix,
  }
}

/**
 * Close the database connection.
 * Call this when shutting down to ensure clean closure.
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

// =============================================================================
// Signing Secret Storage (file-based)
// =============================================================================

/**
 * Ensure the secrets directory exists with appropriate permissions.
 */
async function ensureSecretsDir(): Promise<void> {
  await fs.mkdir(SECRETS_DIR, { recursive: true, mode: 0o700 })
}

/**
 * Generate a new cryptographically secure signing secret.
 *
 * @returns 256-bit secret as base64 string
 */
export function generateSecret(): string {
  return crypto.randomBytes(32).toString('base64')
}

/**
 * Get the signing secret, generating one if it doesn't exist.
 *
 * Priority:
 * 1. Environment variable MACTS_API_KEY_SECRET
 * 2. File at ~/.macts/secrets/api-key-secret
 * 3. Generate new secret and store in file
 *
 * @returns The signing secret
 */
export async function getSigningSecret(): Promise<string> {
  // Return cached secret if available
  if (cachedSigningSecret) {
    return cachedSigningSecret
  }

  // Check environment variable first
  const envSecret = process.env[SECRET_ENV_VAR]
  if (envSecret) {
    cachedSigningSecret = envSecret
    return envSecret
  }

  // Try to read from file
  try {
    const secret = await fs.readFile(SECRET_FILE, 'utf-8')
    const trimmed = secret.trim()
    cachedSigningSecret = trimmed
    return trimmed
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err
    }
  }

  // Generate new secret
  await ensureSecretsDir()
  const secret = generateSecret()
  await fs.writeFile(SECRET_FILE, secret, { mode: 0o600 })
  cachedSigningSecret = secret
  return secret
}

/**
 * Set a custom signing secret.
 *
 * @param secret - The secret to store
 */
export async function setSigningSecret(secret: string): Promise<void> {
  await ensureSecretsDir()
  await fs.writeFile(SECRET_FILE, secret, { mode: 0o600 })
  cachedSigningSecret = secret
  cachedEncryptionKey = null // Invalidate derived key
}

// =============================================================================
// Key Metadata Storage (SQLite)
// =============================================================================

/**
 * Load all key metadata from storage.
 *
 * @returns Array of key metadata
 */
export function loadKeyMetadata(): ApiKeyMetadata[] {
  const database = getDb()
  const rows = database.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as KeyRow[]
  return rows.map((row) => {
    const migrated = autoEncryptRow(database, row)
    return rowToMetadata(migrated)
  })
}

/**
 * Save key metadata to storage (replaces all keys).
 *
 * Note: This is provided for API compatibility but is less efficient than
 * individual operations. Prefer addKeyMetadata, updateKeyMetadata, etc.
 *
 * @param keys - Array of key metadata to save
 */
export function saveKeyMetadata(keys: ApiKeyMetadata[]): void {
  const database = getDb()

  const deleteAll = database.prepare('DELETE FROM api_keys')
  const insert = database.prepare(`
    INSERT INTO api_keys
    (id, name, permissions, original_permissions, created_at, expires_at, revoked, key_prefix, encrypted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `)

  const replaceAll = database.transaction((keysToSave: ApiKeyMetadata[]) => {
    deleteAll.run()
    for (const key of keysToSave) {
      const encrypted = encryptRow(
        JSON.stringify(key.permissions),
        JSON.stringify(key.originalPermissions),
        key.keyPrefix
      )
      insert.run(
        key.id,
        key.name,
        encrypted.permissions,
        encrypted.originalPermissions,
        key.createdAt.getTime(),
        key.expiresAt ? key.expiresAt.getTime() : null,
        key.revoked ? 1 : 0,
        encrypted.keyPrefix
      )
    }
  })

  replaceAll(keys)
}

/**
 * Add key metadata to storage.
 *
 * @param metadata - Key metadata to add
 */
export function addKeyMetadata(metadata: ApiKeyMetadata): void {
  const database = getDb()

  const insert = database.prepare(`
    INSERT INTO api_keys
    (id, name, permissions, original_permissions, created_at, expires_at, revoked, key_prefix, encrypted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `)

  const encrypted = encryptRow(
    JSON.stringify(metadata.permissions),
    JSON.stringify(metadata.originalPermissions),
    metadata.keyPrefix
  )

  insert.run(
    metadata.id,
    metadata.name,
    encrypted.permissions,
    encrypted.originalPermissions,
    metadata.createdAt.getTime(),
    metadata.expiresAt ? metadata.expiresAt.getTime() : null,
    metadata.revoked ? 1 : 0,
    encrypted.keyPrefix
  )
}

/**
 * Update key metadata by ID.
 *
 * @param keyId - Key ID to update
 * @param updates - Partial metadata to merge
 * @returns Updated metadata, or undefined if not found
 */
export function updateKeyMetadata(
  keyId: string,
  updates: Partial<ApiKeyMetadata>
): ApiKeyMetadata | undefined {
  const database = getDb()

  // Get existing key
  const existingRow = database.prepare('SELECT * FROM api_keys WHERE id = ?').get(keyId) as
    | KeyRow
    | undefined

  if (!existingRow) {
    return undefined
  }

  // Decrypt existing row to get current plaintext values for merging
  const existing = decryptRow(existingRow)

  // Merge updates (all values are plaintext at this point)
  const mergedPermissions =
    updates.permissions !== undefined ? JSON.stringify(updates.permissions) : existing.permissions
  const mergedOriginalPermissions =
    updates.originalPermissions !== undefined
      ? JSON.stringify(updates.originalPermissions)
      : existing.original_permissions
  const mergedKeyPrefix = updates.keyPrefix ?? existing.key_prefix

  // Encrypt the merged values
  const encrypted = encryptRow(mergedPermissions, mergedOriginalPermissions, mergedKeyPrefix)

  const updatedName = updates.name ?? existing.name
  const updatedCreatedAt =
    updates.createdAt !== undefined ? updates.createdAt.getTime() : existing.created_at
  const updatedExpiresAt =
    updates.expiresAt !== undefined ? updates.expiresAt.getTime() : existing.expires_at
  const updatedRevoked =
    updates.revoked !== undefined ? (updates.revoked ? 1 : 0) : existing.revoked

  // Update in database (always write as encrypted)
  database
    .prepare(
      `
    UPDATE api_keys SET
      name = ?,
      permissions = ?,
      original_permissions = ?,
      created_at = ?,
      expires_at = ?,
      revoked = ?,
      key_prefix = ?,
      encrypted = 1
    WHERE id = ?
  `
    )
    .run(
      updatedName,
      encrypted.permissions,
      encrypted.originalPermissions,
      updatedCreatedAt,
      updatedExpiresAt,
      updatedRevoked,
      encrypted.keyPrefix,
      keyId
    )

  // Return metadata from plaintext values (avoid extra decrypt)
  return {
    id: existing.id,
    name: updatedName,
    permissions: JSON.parse(mergedPermissions) as string[],
    originalPermissions: JSON.parse(mergedOriginalPermissions) as string[],
    createdAt: new Date(updatedCreatedAt),
    expiresAt: updatedExpiresAt !== null ? new Date(updatedExpiresAt) : undefined,
    revoked: updatedRevoked === 1,
    keyPrefix: mergedKeyPrefix,
  }
}

/**
 * Get key metadata by ID.
 *
 * @param keyId - Key ID to find
 * @returns Key metadata, or undefined if not found
 */
export function getKeyMetadata(keyId: string): ApiKeyMetadata | undefined {
  const database = getDb()
  const row = database.prepare('SELECT * FROM api_keys WHERE id = ?').get(keyId) as
    | KeyRow
    | undefined

  if (!row) {
    return undefined
  }

  const migrated = autoEncryptRow(database, row)
  return rowToMetadata(migrated)
}

/**
 * Revoke a key by ID.
 *
 * @param keyId - Key ID to revoke
 * @returns True if key was found and revoked
 */
export function revokeKey(keyId: string): boolean {
  const database = getDb()
  const result = database.prepare('UPDATE api_keys SET revoked = 1 WHERE id = ?').run(keyId)
  return result.changes > 0
}

/**
 * Delete key metadata by ID.
 *
 * @param keyId - Key ID to delete
 * @returns True if key was found and deleted
 */
export function deleteKeyMetadata(keyId: string): boolean {
  const database = getDb()
  const deleteBoth = database.transaction((id: string) => {
    // A key's policy is part of the key; deleting one without the other would
    // leave a governance document with nothing to govern.
    database.prepare('DELETE FROM api_key_policies WHERE key_id = ?').run(id)
    return database.prepare('DELETE FROM api_keys WHERE id = ?').run(id)
  })
  const result = deleteBoth(keyId)
  return result.changes > 0
}

/**
 * Check if a key ID has been revoked.
 *
 * This is an optimized query that only checks revocation status.
 *
 * @param keyId - Key ID to check
 * @returns True if the key exists and is revoked
 */
export function isKeyRevoked(keyId: string): boolean {
  const database = getDb()
  const row = database.prepare('SELECT revoked FROM api_keys WHERE id = ?').get(keyId) as
    | { revoked: number }
    | undefined

  return row?.revoked === 1
}

// =============================================================================
// Per-Key Governance Policy Storage (SQLite)
// =============================================================================

/**
 * Database row type for a per-key governance policy.
 */
interface KeyPolicyRow {
  key_id: string
  policy: string // JSON document, encrypted when `encrypted` is 1
  updated_at: number // Unix timestamp in milliseconds
  encrypted: number // 0 or 1
}

/**
 * Thrown when a stored per-key policy cannot be read back as a valid policy
 * document.
 *
 * Surfaced rather than swallowed: silently dropping an unreadable key policy
 * would fall back to the host policy alone, which is *wider* than what the
 * operator declared for that key. A key policy that cannot be read is a hard
 * error, and callers fail the request closed.
 */
export class KeyPolicyError extends Error {
  constructor(
    /** The key id whose policy could not be read. */
    public readonly keyId: string,
    message: string
  ) {
    super(`Invalid stored governance policy for API key "${keyId}": ${message}`)
    this.name = 'KeyPolicyError'
  }
}

/**
 * Store (or replace) the governance policy attached to an API key.
 *
 * The policy is validated before it is written, so an invalid document can
 * never reach the database, and is encrypted at rest with the same derived key
 * as the rest of the key metadata.
 *
 * @param keyId - The key id (`ApiKeyPayload.sub`) the policy belongs to.
 * @param policy - The governance policy document to attach.
 * @param updatedAt - When the policy was set. Injected so callers (and tests)
 *   control the clock; defaults to now.
 * @throws {@link KeyPolicyError} when `policy` is not a valid policy document.
 */
export function setKeyPolicy(
  keyId: string,
  policy: GovernancePolicy,
  updatedAt: Date = new Date()
): void {
  const validated = parsePolicy(policy)
  if (!validated.success) {
    const summary = validated.issues.map((i) => `${i.path}: ${i.message}`).join('; ')
    throw new KeyPolicyError(keyId, summary)
  }

  const database = getDb()
  const encrypted = encrypt(JSON.stringify(validated.data), getEncryptionKey())

  database
    .prepare(
      `INSERT INTO api_key_policies (key_id, policy, updated_at, encrypted)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(key_id) DO UPDATE SET policy = excluded.policy, updated_at = excluded.updated_at, encrypted = 1`
    )
    .run(keyId, encrypted, updatedAt.getTime())
}

/**
 * Read the governance policy attached to an API key.
 *
 * @param keyId - The key id (`ApiKeyPayload.sub`) to look up.
 * @returns The stored policy, or `undefined` when the key has none (the common
 *   case — a per-key policy is opt-in, and its absence means the host policy
 *   alone governs).
 * @throws {@link KeyPolicyError} when a policy is stored but cannot be
 *   decrypted, parsed, or validated.
 */
export function getKeyPolicy(keyId: string): GovernancePolicy | undefined {
  const database = getDb()
  const row = database.prepare('SELECT * FROM api_key_policies WHERE key_id = ?').get(keyId) as
    | KeyPolicyRow
    | undefined

  if (!row) {
    return undefined
  }

  let document: string
  try {
    document = row.encrypted === 1 ? decrypt(row.policy, getEncryptionKey()) : row.policy
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new KeyPolicyError(keyId, `could not be decrypted: ${message}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(document) as unknown
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new KeyPolicyError(keyId, `not valid JSON: ${message}`)
  }

  const result = parsePolicy(parsed)
  if (!result.success) {
    throw new KeyPolicyError(keyId, result.issues.map((i) => `${i.path}: ${i.message}`).join('; '))
  }
  return result.data
}

/**
 * Remove the governance policy attached to an API key.
 *
 * The key itself is untouched; it simply falls back to the host policy alone.
 *
 * @param keyId - The key id (`ApiKeyPayload.sub`) whose policy to remove.
 * @returns True when a policy was found and removed.
 */
export function deleteKeyPolicy(keyId: string): boolean {
  const database = getDb()
  const result = database.prepare('DELETE FROM api_key_policies WHERE key_id = ?').run(keyId)
  return result.changes > 0
}

/**
 * List the key ids that currently carry their own governance policy.
 *
 * Reads only the ids, so it never has to decrypt policy documents — enough for
 * management surfaces to show which keys are individually governed.
 *
 * @returns Key ids with a stored policy, most recently updated first.
 */
export function listKeyPolicyIds(): string[] {
  const database = getDb()
  const rows = database
    .prepare('SELECT key_id FROM api_key_policies ORDER BY updated_at DESC')
    .all() as { key_id: string }[]
  return rows.map((row) => row.key_id)
}

/**
 * Generate a unique key ID.
 *
 * @returns Unique key ID prefixed with "key_"
 */
export function generateKeyId(): string {
  return `key_${crypto.randomBytes(12).toString('base64url')}`
}

// =============================================================================
// Process Cleanup
// =============================================================================

/**
 * Global symbol to track cleanup handler registration across module reloads.
 * This ensures we don't register multiple handlers even if the module is re-imported.
 */
const CLEANUP_REGISTERED_KEY = Symbol.for('macts.storage.cleanupRegistered')

/**
 * Register cleanup handlers for graceful shutdown.
 * Ensures database is properly closed when process exits.
 * Safe to call multiple times - only registers once per process.
 */
function registerCleanupHandlers(): void {
  if (typeof process === 'undefined') {
    return
  }

  // Use global symbol to track registration across module reloads (in tests)
  const globalObj = globalThis as Record<symbol, boolean>
  if (globalObj[CLEANUP_REGISTERED_KEY]) {
    return
  }
  globalObj[CLEANUP_REGISTERED_KEY] = true

  process.on('exit', () => {
    closeDatabase()
  })

  // Handle SIGINT (Ctrl+C) and SIGTERM gracefully
  const handleSignal = (): void => {
    closeDatabase()
    process.exit(0)
  }

  process.on('SIGINT', handleSignal)
  process.on('SIGTERM', handleSignal)
}

// Register cleanup handlers when module is loaded
registerCleanupHandlers()
