/**
 * TLS configuration utilities for HTTPS support.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * TLS configuration options using file paths.
 */
export interface TlsOptions {
  /** Path to PEM-encoded certificate file */
  cert: string
  /** Path to PEM-encoded private key file */
  key: string
  /** Optional path to PEM-encoded CA certificate file */
  ca?: string
}

/**
 * Loaded TLS certificate and key buffers ready for use with HTTPS server.
 */
export interface LoadedTlsOptions {
  cert: Buffer
  key: Buffer
  ca?: Buffer
}

/**
 * Load and validate TLS certificate and key files.
 *
 * Resolves file paths, reads files, and performs basic PEM format validation.
 *
 * @param options - TLS file path options
 * @returns Loaded certificate and key buffers
 * @throws If any file is missing or not in valid PEM format
 */
export function loadTlsOptions(options: TlsOptions): LoadedTlsOptions {
  const certPath = path.resolve(options.cert)
  const keyPath = path.resolve(options.key)

  if (!fs.existsSync(certPath)) {
    throw new Error(`TLS certificate file not found: ${certPath}`)
  }
  if (!fs.existsSync(keyPath)) {
    throw new Error(`TLS key file not found: ${keyPath}`)
  }

  const cert = fs.readFileSync(certPath)
  const key = fs.readFileSync(keyPath)

  if (!cert.toString().includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error(`Invalid PEM certificate file: ${certPath}`)
  }
  if (!key.toString().includes('-----BEGIN')) {
    throw new Error(`Invalid PEM key file: ${keyPath}`)
  }

  const result: LoadedTlsOptions = { cert, key }

  if (options.ca) {
    const caPath = path.resolve(options.ca)
    if (!fs.existsSync(caPath)) {
      throw new Error(`TLS CA certificate file not found: ${caPath}`)
    }
    result.ca = fs.readFileSync(caPath)
  }

  return result
}
