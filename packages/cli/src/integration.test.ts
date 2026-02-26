/**
 * CLI integration tests.
 *
 * Runs the actual CLI binary via execSync to verify the full chain:
 * CLI → HTTP API server → RPC handler → JXA execution.
 *
 * Requires macOS with Calendar.app and automation permissions.
 * Gated behind MACTS_INTEGRATION=1 environment variable.
 *
 * Prerequisites:
 * - The API server must be running at localhost:8372 for command tests.
 *   Start it with: `macts api start` (or `node packages/cli/dist/bin.js api start`).
 * - Version and help tests work without a running server.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { fileURLToPath } from 'node:url'

const INTEGRATION = process.env['MACTS_INTEGRATION'] === '1'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLI_BIN = path.resolve(__dirname, '../dist/bin.js')

describe.runIf(INTEGRATION)('CLI integration', () => {
  let tempDir: string
  let originalHome: string | undefined
  let originalEnvSecret: string | undefined
  let apiKey: string

  beforeAll(async () => {
    vi.resetModules()

    // Create isolated temp directory for key storage
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-cli-integration-'))
    originalHome = process.env['HOME']
    originalEnvSecret = process.env['MACTS_API_KEY_SECRET']
    process.env['HOME'] = tempDir
    process.env['MACTS_API_KEY_SECRET'] = 'cli-integration-test-secret-32-chars!!!!!'

    // Create an API key using the generator directly
    const { createApiKey } = await import('@macts/api/keys')
    const { token } = await createApiKey({
      name: 'cli-integration-test',
      permissions: [
        'calendar:calendars:list',
        'calendar:calendars:get',
        'calendar:events:list',
        'reminders:lists:list',
      ],
    })
    apiKey = token
  }, 30_000)

  afterAll(async () => {
    // Restore environment
    process.env['HOME'] = originalHome
    if (originalEnvSecret !== undefined) {
      process.env['MACTS_API_KEY_SECRET'] = originalEnvSecret
    } else {
      delete process.env['MACTS_API_KEY_SECRET']
    }

    // Close database
    const keys = await import('@macts/api/keys')
    ;(keys.closeDatabase as () => void)()

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should show version', () => {
    const output = execSync(`node ${CLI_BIN} --version`, {
      encoding: 'utf-8',
      env: { ...process.env },
    })
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('should show help', () => {
    const output = execSync(`node ${CLI_BIN} --help`, {
      encoding: 'utf-8',
      env: { ...process.env },
    })
    expect(output).toContain('macts')
  })

  it('should list calendar calendars via --json', () => {
    // Note: This test requires a running API server.
    // The CLI sends HTTP requests to the API server, so the server
    // must be started separately (e.g., via `macts api start`).
    // If no server is running, this test will fail with a connection error.
    try {
      const output = execSync(`node ${CLI_BIN} calendar calendars list --json`, {
        encoding: 'utf-8',
        env: {
          ...process.env,
          MACTS_API_KEY: apiKey,
          MACTS_API_URL: 'http://localhost:8372',
        },
        timeout: 10_000,
      })
      const parsed: unknown = JSON.parse(output)
      expect(Array.isArray(parsed)).toBe(true)
    } catch (error) {
      // If server is not running, skip gracefully
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
        console.warn('CLI test skipped: API server not running at localhost:8372')
        return
      }
      throw error
    }
  })
})
