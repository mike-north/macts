/**
 * Tests for the governance policy file loader.
 *
 * Verifies that {@link loadPolicyFromFile} correctly handles all three
 * outcomes: file absent, file present but invalid, file present and valid.
 *
 * @see Issue #55 — filter discovery by the declared policy
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { loadPolicyFromFile } from './loader.js'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'macts-loader-test-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

async function writePolicyFile(content: string): Promise<string> {
  const filePath = path.join(tmpDir, 'policy.json')
  await fs.writeFile(filePath, content, 'utf8')
  return filePath
}

// ---------------------------------------------------------------------------
// File absent
// ---------------------------------------------------------------------------

describe('loadPolicyFromFile — file absent', () => {
  it('returns { found: false } when the file does not exist', async () => {
    const result = await loadPolicyFromFile(path.join(tmpDir, 'nonexistent.json'))
    expect(result.found).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// File present but invalid JSON
// ---------------------------------------------------------------------------

describe('loadPolicyFromFile — invalid JSON', () => {
  it('returns found=true with error when the file contains invalid JSON', async () => {
    const filePath = await writePolicyFile('{ this is not json }')
    const result = await loadPolicyFromFile(filePath)
    expect(result.found).toBe(true)
    if (!result.found) return
    expect('error' in result).toBe(true)
    if (!('error' in result)) return
    expect(result.error).toMatch(/not valid JSON/i)
  })
})

// ---------------------------------------------------------------------------
// File present but fails schema validation
// ---------------------------------------------------------------------------

describe('loadPolicyFromFile — invalid schema', () => {
  it('returns found=true with error and issues when policy fails schema validation', async () => {
    // Valid JSON but not a valid policy declaration.
    const filePath = await writePolicyFile(JSON.stringify({ version: 'bad-version' }))
    const result = await loadPolicyFromFile(filePath)
    expect(result.found).toBe(true)
    if (!result.found) return
    expect('error' in result).toBe(true)
    if (!('error' in result)) return
    expect(result.error).toMatch(/invalid/i)
    expect(result.issues).toBeDefined()
    expect(Array.isArray(result.issues)).toBe(true)
    expect((result.issues ?? []).length).toBeGreaterThan(0)
  })

  it('reports ALL validation issues — not just the first one', async () => {
    // Two distinct violations: bad version AND bad defaultDisposition.
    // A loader that short-circuits on the first issue would return only one;
    // this test would catch that regression.
    const filePath = await writePolicyFile(
      JSON.stringify({ version: 'bad', defaultDisposition: 'not-a-disposition' })
    )
    const result = await loadPolicyFromFile(filePath)
    expect(result.found).toBe(true)
    if (!result.found) return
    expect('error' in result).toBe(true)
    if (!('error' in result)) return
    const issues = result.issues ?? []
    // Both violations must be reported — >= 1 is not sufficient.
    expect(issues.length).toBeGreaterThanOrEqual(2)
    const paths = issues.map((i) => i.path)
    expect(paths).toContain('version')
    expect(paths).toContain('defaultDisposition')
  })
})

// ---------------------------------------------------------------------------
// File present and valid
// ---------------------------------------------------------------------------

describe('loadPolicyFromFile — valid policy', () => {
  it('returns found=true with the parsed policy', async () => {
    const declaration = {
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [{ app: 'calendar', disposition: 'allowed' }],
    }
    const filePath = await writePolicyFile(JSON.stringify(declaration))
    const result = await loadPolicyFromFile(filePath)
    expect(result.found).toBe(true)
    if (!result.found) return
    expect('policy' in result).toBe(true)
    if (!('policy' in result)) return
    expect(result.policy.defaultDisposition).toBe('forbidden')
    expect(result.policy.apps).toHaveLength(1)
    expect(result.policy.apps[0]?.app).toBe('calendar')
    expect(result.policy.apps[0]?.disposition).toBe('allowed')
  })

  it('applies policy defaults (defaultDisposition defaults to "forbidden")', async () => {
    // Omit defaultDisposition — schema should default to 'forbidden'.
    const declaration = { version: '1', apps: [] }
    const filePath = await writePolicyFile(JSON.stringify(declaration))
    const result = await loadPolicyFromFile(filePath)
    expect(result.found).toBe(true)
    if (!result.found) return
    expect('policy' in result).toBe(true)
    if (!('policy' in result)) return
    expect(result.policy.defaultDisposition).toBe('forbidden')
  })

  it('round-trips a full policy with multiple app rules', async () => {
    const declaration = {
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [
        {
          app: 'calendar',
          disposition: 'allowed',
          operations: [{ operation: 'delete', disposition: 'confirm-first' }],
        },
        { app: 'reminders', disposition: 'read-only', reason: 'reminders are read-only' },
      ],
    }
    const filePath = await writePolicyFile(JSON.stringify(declaration))
    const result = await loadPolicyFromFile(filePath)
    expect(result.found).toBe(true)
    if (!result.found) return
    expect('policy' in result).toBe(true)
    if (!('policy' in result)) return
    expect(result.policy.apps).toHaveLength(2)
    expect(result.policy.apps[0]?.operations).toHaveLength(1)
    expect(result.policy.apps[1]?.reason).toBe('reminders are read-only')
  })
})
