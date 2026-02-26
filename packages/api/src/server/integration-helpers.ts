/**
 * Shared helpers for integration tests.
 *
 * These helpers create isolated test environments with real auth,
 * real servers, and real macOS app automation via JXA.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { randomUUID } from 'node:crypto'
import type { AppManifest } from '@macts/core'

/**
 * Whether integration tests should run.
 * Set MACTS_INTEGRATION=1 to enable.
 */
export const INTEGRATION = process.env['MACTS_INTEGRATION'] === '1'

/**
 * Generate a short unique test ID for this test run.
 * Uses the first 8 chars of a UUID for readability in app UIs.
 */
export function generateTestId(): string {
  return randomUUID().slice(0, 8)
}

/**
 * Generate a marker-prefixed test name that is globally unique
 * and impossible to collide with real user data.
 */
export function testName(testId: string, suffix: string): string {
  return `__macts_e2e_${testId}_${suffix}`
}

/**
 * Test server instance returned by startTestServer.
 */
export interface TestServerContext {
  /** The Hono app for direct request testing */
  app: Awaited<ReturnType<typeof import('./index.js').createApp>>
  /** API key token for authenticated requests */
  apiKey: string
  /** Cleanup function — call in afterAll */
  cleanup: () => void
}

/**
 * Start a test server with an isolated HOME and API key.
 *
 * Creates an isolated temp directory for key storage so tests
 * don't interfere with real user data.
 *
 * @param manifests - App manifests to serve
 * @param permissions - Permissions for the test API key
 * @returns Test server context
 */
export async function startTestServer(
  manifests: AppManifest | AppManifest[],
  permissions: string[]
): Promise<TestServerContext> {
  const manifestArray = Array.isArray(manifests) ? manifests : [manifests]

  // Create isolated temp directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-integration-'))

  // Override HOME so storage uses temp directory
  const originalHome = process.env['HOME']
  const originalEnvSecret = process.env['MACTS_API_KEY_SECRET']
  process.env['HOME'] = tempDir
  process.env['MACTS_API_KEY_SECRET'] = 'integration-test-secret-must-be-32-chars!!'

  // Dynamic imports to pick up new HOME / secret
  const { createApiKey } = await import('../keys/generator.js')
  const { closeDatabase } = await import('../keys/storage.js')
  const { createApp } = await import('./index.js')

  // Create API key
  const { token } = await createApiKey({
    name: 'integration-test-key',
    permissions,
  })

  // Create app (no server lifecycle, just the Hono app)
  const app = createApp(manifestArray, {
    cors: false,
    logging: false,
  })

  return {
    app,
    apiKey: token,
    cleanup: () => {
      closeDatabase()
      process.env['HOME'] = originalHome
      if (originalEnvSecret !== undefined) {
        process.env['MACTS_API_KEY_SECRET'] = originalEnvSecret
      } else {
        delete process.env['MACTS_API_KEY_SECRET']
      }
      try {
        fs.rmSync(tempDir, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
    },
  }
}

/**
 * Make an authenticated RPC request to the test server.
 */
export async function rpcRequest(
  app: TestServerContext['app'],
  apiKey: string,
  rpcPath: string,
  body: Record<string, unknown> = {}
): Promise<Response> {
  return app.request(`/api/v1/rpc/${rpcPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

/**
 * Make an RPC request and return the parsed result.
 * Throws if the request fails.
 */
export async function rpcResult<T>(
  app: TestServerContext['app'],
  apiKey: string,
  rpcPath: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const res = await rpcRequest(app, apiKey, rpcPath, body)
  if (!res.ok) {
    const error = (await res.json()) as { error?: { code?: string; message?: string } }
    throw new Error(
      `RPC ${rpcPath} failed (${String(res.status)}): ${error.error?.message ?? 'unknown'}`
    )
  }
  const data = (await res.json()) as { result: T }
  return data.result
}

/**
 * Create a reverse-order cleanup stack.
 *
 * Push cleanup functions as you create resources.
 * Call executeAll() in afterAll to clean up in reverse order.
 */
export function createCleanupStack() {
  const fns: (() => Promise<void>)[] = []

  return {
    push(fn: () => Promise<void>) {
      fns.push(fn)
    },
    async executeAll() {
      const errors: unknown[] = []
      for (const fn of fns.reverse()) {
        try {
          await fn()
        } catch (error) {
          errors.push(error)
        }
      }
      if (errors.length > 0) {
        console.warn(
          `Integration test cleanup completed with ${String(errors.length)} error(s):`,
          errors
        )
      }
    },
  }
}
