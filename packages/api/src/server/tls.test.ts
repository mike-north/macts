import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { loadTlsOptions } from './tls.js'

const MOCK_CERT = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJALRiMLAh0ESAMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnNl
cnZlcjAeFw0yNDAxMDEwMDAwMDBaFw0yNTAxMDEwMDAwMDBaMBExDzANBgNVBAMM
BnNlcnZlcjBcMA0GCSqGSIb3DQEBAQUAAwsAMEgCQQC7o96FCFnHBLemLejLuvTx
-----END CERTIFICATE-----`

const MOCK_KEY = `-----BEGIN PRIVATE KEY-----
MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAu6PehQhZxwS3pi3o
y7r08Q==
-----END PRIVATE KEY-----`

const MOCK_CA = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJALRiMLAh0ESBMBExDzANBgNVBAMMBnNlcnZlcjBcMA0GCSqGSIb
-----END CERTIFICATE-----`

const INVALID_CONTENT = 'this is not a PEM file'

describe('loadTlsOptions', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-tls-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function writeFile(name: string, content: string): string {
    const filePath = path.join(tmpDir, name)
    fs.writeFileSync(filePath, content)
    return filePath
  }

  it('loads valid cert and key files', () => {
    const certPath = writeFile('cert.pem', MOCK_CERT)
    const keyPath = writeFile('key.pem', MOCK_KEY)

    const result = loadTlsOptions({ cert: certPath, key: keyPath })

    expect(result.cert.toString()).toBe(MOCK_CERT)
    expect(result.key.toString()).toBe(MOCK_KEY)
    expect(result.ca).toBeUndefined()
  })

  it('loads cert, key, and CA files', () => {
    const certPath = writeFile('cert.pem', MOCK_CERT)
    const keyPath = writeFile('key.pem', MOCK_KEY)
    const caPath = writeFile('ca.pem', MOCK_CA)

    const result = loadTlsOptions({ cert: certPath, key: keyPath, ca: caPath })

    expect(result.cert.toString()).toBe(MOCK_CERT)
    expect(result.key.toString()).toBe(MOCK_KEY)
    expect(result.ca).toBeDefined()
    expect(result.ca?.toString()).toBe(MOCK_CA)
  })

  it('resolves relative paths', () => {
    const certPath = writeFile('cert.pem', MOCK_CERT)
    const keyPath = writeFile('key.pem', MOCK_KEY)

    // Use relative paths (relative to cwd)
    const relativeCert = path.relative(process.cwd(), certPath)
    const relativeKey = path.relative(process.cwd(), keyPath)

    const result = loadTlsOptions({ cert: relativeCert, key: relativeKey })

    expect(result.cert.toString()).toBe(MOCK_CERT)
    expect(result.key.toString()).toBe(MOCK_KEY)
  })

  it('throws when certificate file does not exist', () => {
    const keyPath = writeFile('key.pem', MOCK_KEY)

    expect(() => loadTlsOptions({ cert: '/nonexistent/cert.pem', key: keyPath })).toThrow(
      'TLS certificate file not found: /nonexistent/cert.pem'
    )
  })

  it('throws when key file does not exist', () => {
    const certPath = writeFile('cert.pem', MOCK_CERT)

    expect(() => loadTlsOptions({ cert: certPath, key: '/nonexistent/key.pem' })).toThrow(
      'TLS key file not found: /nonexistent/key.pem'
    )
  })

  it('throws when CA file does not exist', () => {
    const certPath = writeFile('cert.pem', MOCK_CERT)
    const keyPath = writeFile('key.pem', MOCK_KEY)

    expect(() =>
      loadTlsOptions({ cert: certPath, key: keyPath, ca: '/nonexistent/ca.pem' })
    ).toThrow('TLS CA certificate file not found: /nonexistent/ca.pem')
  })

  it('throws for invalid PEM certificate content', () => {
    const certPath = writeFile('cert.pem', INVALID_CONTENT)
    const keyPath = writeFile('key.pem', MOCK_KEY)

    expect(() => loadTlsOptions({ cert: certPath, key: keyPath })).toThrow(
      `Invalid PEM certificate file: ${certPath}`
    )
  })

  it('throws for invalid PEM key content', () => {
    const certPath = writeFile('cert.pem', MOCK_CERT)
    const keyPath = writeFile('key.pem', INVALID_CONTENT)

    expect(() => loadTlsOptions({ cert: certPath, key: keyPath })).toThrow(
      `Invalid PEM key file: ${keyPath}`
    )
  })

  it('validates cert before key (cert error takes precedence)', () => {
    // If cert file is missing, we get a cert error even if key is also bad
    expect(() =>
      loadTlsOptions({ cert: '/nonexistent/cert.pem', key: '/nonexistent/key.pem' })
    ).toThrow('TLS certificate file not found')
  })

  it('accepts RSA private key format', () => {
    const rsaKey = `-----BEGIN RSA PRIVATE KEY-----
MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAu6PehQhZxwS3pi3o
-----END RSA PRIVATE KEY-----`

    const certPath = writeFile('cert.pem', MOCK_CERT)
    const keyPath = writeFile('key.pem', rsaKey)

    const result = loadTlsOptions({ cert: certPath, key: keyPath })
    expect(result.key.toString()).toBe(rsaKey)
  })

  it('accepts EC private key format', () => {
    const ecKey = `-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIBkg4LVWM9nuwNSk3yByxZpYRTBnVJk30bRpEMgMgTD6oAcGBSuBBAAi
-----END EC PRIVATE KEY-----`

    const certPath = writeFile('cert.pem', MOCK_CERT)
    const keyPath = writeFile('key.pem', ecKey)

    const result = loadTlsOptions({ cert: certPath, key: keyPath })
    expect(result.key.toString()).toBe(ecKey)
  })
})
