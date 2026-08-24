/**
 * Tests for MCP API key authentication.
 *
 * `@macts/api/keys` resolves its storage directory (signing secret,
 * revocation database) from `MACTS_HOME` at module-load time, so each test
 * points `MACTS_HOME` at a fresh temp directory and re-imports both
 * `@macts/api/keys` and `./auth.js` via `vi.resetModules()` before use. This
 * mirrors the pattern in `packages/api/src/keys/storage-home-resolution.test.ts`.
 *
 * @see packages/api/src/server/middleware/auth.ts for the error-code/response
 *   semantics this module mirrors.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { IncomingMessage } from 'node:http'

let originalMactsHome: string | undefined
let originalApiKey: string | undefined
const tempDirs: string[] = []

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-mcp-auth-'))
  tempDirs.push(dir)
  return dir
}

/** Load fresh copies of `@macts/api/keys` and `./auth.js` under the current env. */
async function loadModules(): Promise<{
  keys: typeof import('@macts/api/keys')
  auth: typeof import('./auth.js')
}> {
  vi.resetModules()
  const keys = await import('@macts/api/keys')
  const auth = await import('./auth.js')
  return { keys, auth }
}

/** Build a minimal fake `IncomingMessage` with the given Authorization header. */
function fakeRequest(authorization?: string): IncomingMessage {
  return {
    headers: authorization === undefined ? {} : { authorization },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal test double, only `.headers` is read
  } as any as IncomingMessage
}

beforeEach(() => {
  originalMactsHome = process.env['MACTS_HOME']
  originalApiKey = process.env['MACTS_API_KEY']
  delete process.env['MACTS_API_KEY']
  process.env['MACTS_HOME'] = makeTempDir()
})

afterEach(() => {
  if (originalMactsHome === undefined) {
    delete process.env['MACTS_HOME']
  } else {
    process.env['MACTS_HOME'] = originalMactsHome
  }
  if (originalApiKey === undefined) {
    delete process.env['MACTS_API_KEY']
  } else {
    process.env['MACTS_API_KEY'] = originalApiKey
  }

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) {
      try {
        fs.rmSync(dir, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors.
      }
    }
  }
})

describe('requireStartupApiKey', () => {
  it('resolves when MACTS_API_KEY is a valid key', async () => {
    const { keys, auth } = await loadModules()
    const { token } = await keys.createApiKey({
      name: 'startup-test',
      permissions: ['calendar:events:list'],
    })
    process.env['MACTS_API_KEY'] = token

    await expect(auth.requireStartupApiKey()).resolves.toBeUndefined()
  })

  it('throws with remediation naming MACTS_API_KEY when unset', async () => {
    const { auth } = await loadModules()
    delete process.env['MACTS_API_KEY']

    await expect(auth.requireStartupApiKey()).rejects.toThrow(/MACTS_API_KEY/)
    await expect(auth.requireStartupApiKey()).rejects.toThrow(/macts api-key create/)
    await expect(auth.requireStartupApiKey()).rejects.toThrow(/--disable-api-key-validation/)
  })

  it('throws for a malformed token (wrong prefix)', async () => {
    const { auth } = await loadModules()
    process.env['MACTS_API_KEY'] = 'not_a_macts_key'

    await expect(auth.requireStartupApiKey()).rejects.toThrow(/MACTS_API_KEY/)
  })

  it('throws mentioning expiration for an expired key', async () => {
    const { keys, auth } = await loadModules()
    const { token } = await keys.createApiKey(
      {
        name: 'expired-test',
        permissions: ['calendar:events:list'],
        expires: -1, // already expired
      },
      undefined
    )
    process.env['MACTS_API_KEY'] = token

    await expect(auth.requireStartupApiKey()).rejects.toThrow(/expired/i)
  })

  it('throws mentioning revocation for a revoked key', async () => {
    const { keys, auth } = await loadModules()
    const { token, keyId } = await keys.createApiKey({
      name: 'revoked-test',
      permissions: ['calendar:events:list'],
    })
    keys.revokeKey(keyId)
    process.env['MACTS_API_KEY'] = token

    await expect(auth.requireStartupApiKey()).rejects.toThrow(/revoked/i)
  })
})

describe('authenticateHttpRequest', () => {
  it('returns ok:true with the payload for a valid token', async () => {
    const { keys, auth } = await loadModules()
    const { token } = await keys.createApiKey({
      name: 'http-test',
      permissions: ['calendar:events:list'],
    })

    const result = await auth.authenticateHttpRequest(fakeRequest(`Bearer ${token}`))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.permissions).toContain('calendar:events:list')
    }
  })

  it('returns MISSING_AUTHORIZATION 401 when no header is present', async () => {
    const { auth } = await loadModules()
    const result = await auth.authenticateHttpRequest(fakeRequest())

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(401)
      expect(result.body.error.code).toBe('MISSING_AUTHORIZATION')
    }
  })

  it('returns INVALID_AUTH_SCHEME for a non-Bearer scheme', async () => {
    const { auth } = await loadModules()
    const result = await auth.authenticateHttpRequest(fakeRequest('Basic xyz'))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.body.error.code).toBe('INVALID_AUTH_SCHEME')
    }
  })

  it('returns INVALID_SIGNATURE for a tampered token', async () => {
    const { keys, auth } = await loadModules()
    const { token } = await keys.createApiKey({
      name: 'tamper-test',
      permissions: ['calendar:events:list'],
    })
    const tampered = token.slice(0, -5) + 'xxxxx'

    const result = await auth.authenticateHttpRequest(fakeRequest(`Bearer ${tampered}`))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.body.error.code).toBe('INVALID_SIGNATURE')
    }
  })

  it('returns INVALID_FORMAT for a token missing the macts_sk_ prefix', async () => {
    const { auth } = await loadModules()
    const result = await auth.authenticateHttpRequest(fakeRequest('Bearer not_a_macts_key'))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.body.error.code).toBe('INVALID_FORMAT')
    }
  })
})
