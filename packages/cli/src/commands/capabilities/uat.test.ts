/**
 * UAT for `macts capabilities search` / `inspect`.
 *
 * Drives the real built CLI binary as a subprocess against the repository's
 * real manifests, asserting on stdout/stderr shape and exit codes exactly as a
 * user would experience them. Critically verifies no AppleScript/JXA terminology
 * leaks into any output.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

const here = dirname(fileURLToPath(import.meta.url))
// packages/cli/src/commands/capabilities → repo root is five levels up.
const repoRoot = resolve(here, '../../../../..')
const cliPackageDir = resolve(here, '../../..')
const binPath = resolve(cliPackageDir, 'dist/bin.js')

/** Regex matching any automation-mechanism terminology that must never leak. */
const BANNED = /applescript|jxa|osascript|javascript for automation/i

interface CliResult {
  stdout: string
  stderr: string
  code: number
}

/** Run the built CLI from the repo root so manifests/ auto-detects via cwd. */
async function runCli(args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [binPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env },
    })
    return { stdout, stderr, code: 0 }
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; code?: number }
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code ?? 1 }
  }
}

describe('macts capabilities (UAT)', () => {
  beforeAll(() => {
    // The standard verify order builds before testing; fail loudly with a clear
    // hint if the built binary is missing rather than silently skipping.
    if (!existsSync(binPath)) {
      throw new Error(
        `Built CLI not found at ${binPath}. Run \`pnpm --filter @macts/cli build\` before this UAT.`
      )
    }
  })

  it('search returns ranked results with a call snippet (JSON)', async () => {
    const { stdout, code } = await runCli([
      'capabilities',
      'search',
      'create calendar event',
      '--json',
    ])
    expect(code).toBe(0)
    // The JSON formatter wraps payloads in a top-level `data` object.
    const parsed = JSON.parse(stdout) as {
      data: { results: { name: string; call: string; risk: string }[] }
    }
    expect(parsed.data.results.length).toBeGreaterThan(0)
    // The top match for this intent should be the create-event capability.
    expect(parsed.data.results[0]?.name).toBe('calendar.events.create')
    expect(parsed.data.results[0]?.call).toContain('macts calendar calendars events create')
    expect(parsed.data.results[0]?.risk).toBe('write')
  })

  it('search human output includes the call snippet', async () => {
    const { stdout, code } = await runCli(['capabilities', 'search', 'list calendars'])
    expect(code).toBe(0)
    expect(stdout).toContain('calendar.calendars.list')
    expect(stdout).toContain('call: macts calendar calendars list')
  })

  it('search with no match suggests generating a new capability (not UI fallback)', async () => {
    const { stdout, code } = await runCli(['capabilities', 'search', 'zzzznomatch qqqq', '--json'])
    expect(code).toBe(0)
    const parsed = JSON.parse(stdout) as { data: { results: unknown[]; nextMove: string } }
    expect(parsed.data.results).toEqual([])
    expect(parsed.data.nextMove).toBe('generate-capability')
    expect(stdout).not.toMatch(/pixel|screenshot|click/i)
  })

  it('inspect returns schema, permission, risk, and app dependency (JSON)', async () => {
    const { stdout, code } = await runCli([
      'capabilities',
      'inspect',
      'calendar.events.create',
      '--json',
    ])
    expect(code).toBe(0)
    const parsed = JSON.parse(stdout) as {
      data: {
        risk: string
        permission: string
        appBundleId: string
        inputSchema: { type: string }
      }
    }
    expect(parsed.data.risk).toBe('write')
    expect(parsed.data.permission).toBe('calendar:events:create')
    expect(parsed.data.appBundleId).toBe('com.apple.iCal')
    expect(parsed.data.inputSchema.type).toBe('object')
  })

  it('inspect fails with a non-zero exit for an unknown capability', async () => {
    const { stderr, code } = await runCli(['capabilities', 'inspect', 'calendar.events.frobnicate'])
    expect(code).toBe(1)
    expect(stderr).toMatch(/unknown capability/i)
  })

  it('never leaks automation-mechanism terminology in any output', async () => {
    const search = await runCli(['capabilities', 'search', 'send a message'])
    const inspect = await runCli(['capabilities', 'inspect', 'calendar.events.create'])
    expect(search.stdout).not.toMatch(BANNED)
    expect(search.stderr).not.toMatch(BANNED)
    expect(inspect.stdout).not.toMatch(BANNED)
    expect(inspect.stderr).not.toMatch(BANNED)
  })
})
