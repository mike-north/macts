/**
 * Opaque transfer tokens: file grants and download links.
 *
 * A token is the only proof a caller holds, so it carries 256 bits of
 * randomness and nothing else: no subject, no path, no expiry. The store
 * keeps only its SHA-256 digest, so the database (or a copy of it) never
 * yields a usable token. A presented token is looked up by its digest.
 *
 * @packageDocumentation
 */

import { createHash, randomBytes } from 'node:crypto'

/** Random bytes per token: 32 (256 bits), base64url-encoded to 43 characters. */
const TOKEN_BYTES = 32

/** Mint a fresh opaque token. */
export function mintToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

/**
 * The digest a token is stored and looked up under: lowercase hex SHA-256 of
 * its UTF-8 text. Any string hashes, so a malformed token simply matches
 * nothing.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}
