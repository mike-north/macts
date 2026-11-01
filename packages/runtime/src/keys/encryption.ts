/**
 * Encryption utilities for API key data at rest.
 *
 * Uses AES-256-GCM for authenticated encryption, with keys derived
 * from the signing secret via HKDF.
 *
 * @packageDocumentation
 */

import * as crypto from 'node:crypto'

/** IV length for AES-GCM (12 bytes / 96 bits as recommended by NIST) */
const IV_LENGTH = 12

/** Authentication tag length for AES-GCM */
const AUTH_TAG_LENGTH = 16

/** HKDF info string for key derivation context separation */
const HKDF_INFO = 'macts-api-key-encryption'

/** HKDF salt (fixed, non-secret — provides domain separation) */
const HKDF_SALT = Buffer.from('macts-encryption-salt-v1', 'utf-8')

/**
 * Derive a 256-bit encryption key from the signing secret using HKDF.
 *
 * HKDF (HMAC-based Key Derivation Function) is used to derive a separate
 * encryption key from the signing secret, ensuring key separation between
 * JWT signing and data encryption.
 *
 * @param signingSecret - The signing secret to derive from
 * @returns 32-byte derived key
 */
export function deriveEncryptionKey(signingSecret: string): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', signingSecret, HKDF_SALT, HKDF_INFO, 32))
}

/**
 * Encrypt plaintext using AES-256-GCM.
 *
 * Output format: base64(IV || authTag || ciphertext)
 * - IV: 12 bytes (randomly generated)
 * - authTag: 16 bytes
 * - ciphertext: variable length
 *
 * @param plaintext - The string to encrypt
 * @param key - 32-byte encryption key (from deriveEncryptionKey)
 * @returns Base64-encoded encrypted payload
 */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Pack: IV + authTag + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted])
  return packed.toString('base64')
}

/**
 * Decrypt an AES-256-GCM encrypted payload.
 *
 * @param ciphertext - Base64-encoded encrypted payload (from encrypt)
 * @param key - 32-byte encryption key (same key used for encryption)
 * @returns Decrypted plaintext string
 * @throws Error if the key is wrong, data is corrupted, or format is invalid
 */
export function decrypt(ciphertext: string, key: Buffer): string {
  const packed = Buffer.from(ciphertext, 'base64')

  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext: too short')
  }

  const iv = packed.subarray(0, IV_LENGTH)
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

  return decrypted.toString('utf-8')
}
