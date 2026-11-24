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
import { MECHANISM_TERMS } from '@macts/core'

const execFileAsync = promisify(execFile)

const here = dirname(fileURLToPath(import.meta.url))
// packages/cli/src/commands/capabilities → repo root is five levels up.
const repoRoot = resolve(here, '../../../../..')
const cliPackageDir = resolve(here, '../../..')
const binPath = resolve(cliPackageDir, 'dist/bin.js')

/** Automation-mechanism terminology that must never leak: core's one shared definition. */
const BANNED = MECHANISM_TERMS

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
      data: { results: { name: string; call: string; risk: string; score: number }[] }
    }
    expect(parsed.data.results.length).toBeGreaterThan(0)
    // The top match for this intent should be the create-event capability.
    expect(parsed.data.results[0]?.name).toBe('calendar.events.create')
    expect(parsed.data.results[0]?.call).toContain('macts calendar calendars events create')
    expect(parsed.data.results[0]?.risk).toBe('write')
  })

  it('search JSON output includes a numeric score for each result', async () => {
    // Regression: governedDiscoverySearch previously dropped the lexical score,
    // so the CLI JSON output was missing the `score` field. Verify it is present
    // and is a positive number for matched results.
    const { stdout, code } = await runCli([
      'capabilities',
      'search',
      'create calendar event',
      '--json',
    ])
    expect(code).toBe(0)
    const parsed = JSON.parse(stdout) as {
      data: { results: { score: unknown }[] }
    }
    expect(parsed.data.results.length).toBeGreaterThan(0)
    for (const result of parsed.data.results) {
      expect(typeof result.score).toBe('number')
      expect(result.score).toBeGreaterThan(0)
    }
  })

  it('search human output includes the call snippet', async () => {
    const { stdout, code } = await runCli(['capabilities', 'search', 'list calendars'])
    expect(code).toBe(0)
    expect(stdout).toContain('calendar.calendars.list')
    expect(stdout).toContain('call: macts calendar calendars list')
  })

  it('search caps results at a valid --limit', async () => {
    const { stdout, code } = await runCli([
      'capabilities',
      'search',
      'calendar',
      '--limit',
      '1',
      '--json',
    ])
    expect(code).toBe(0)
    const parsed = JSON.parse(stdout) as { data: { results: unknown[] } }
    expect(parsed.data.results).toHaveLength(1)
  })

  it('search falls back to the default for an invalid --limit (foo → not empty)', async () => {
    // Regression: an invalid --limit must not reach slice(0, NaN) and silently
    // return zero results; it falls back to the default limit instead.
    const { stdout, code } = await runCli([
      'capabilities',
      'search',
      'create calendar event',
      '--limit',
      'foo',
      '--json',
    ])
    expect(code).toBe(0)
    const parsed = JSON.parse(stdout) as { data: { results: unknown[] } }
    expect(parsed.data.results.length).toBeGreaterThan(0)
  })

  it('search rejects a non-positive --limit, falling back to the default', async () => {
    const { stdout, code } = await runCli([
      'capabilities',
      'search',
      'create calendar event',
      '--limit',
      '0',
      '--json',
    ])
    expect(code).toBe(0)
    const parsed = JSON.parse(stdout) as { data: { results: unknown[] } }
    expect(parsed.data.results.length).toBeGreaterThan(0)
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

  it('inspect names no CLI call for an operation the CLI has no command for', async () => {
    // The generated Calendar CLI registers no command for an event delete.
    const json = await runCli(['capabilities', 'inspect', 'calendar.events.delete', '--json'])
    expect(json.code).toBe(0)
    const parsed = JSON.parse(json.stdout) as { data: { call: unknown; mcpTool: string } }
    expect(parsed.data.call).toBeNull()
    expect(parsed.data.mcpTool).toBe('macts__calendar__events_delete')

    const human = await runCli(['capabilities', 'inspect', 'calendar.events.delete'])
    expect(human.code).toBe(0)
    expect(human.stdout).toContain(
      'Call:        (no CLI command; MCP tool macts__calendar__events_delete)'
    )
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

  // These capabilities' dictionary text names the mechanism (a keyword its
  // syntax makes optional, or a language that shares its name), so they are
  // where a leak would show; the shipped manifests say what each input is.
  it.each(['music.app.count', 'tv.app.make', 'script-editor.documents.create'])(
    'never leaks automation-mechanism terminology when inspecting %s',
    async (name) => {
      const inspect = await runCli(['capabilities', 'inspect', name, '--json'])
      expect(inspect.code).toBe(0)
      expect(inspect.stdout).toContain(name)
      expect(inspect.stdout).not.toMatch(BANNED)
      expect(inspect.stderr).not.toMatch(BANNED)
    }
  )

  it.each(['count elements', 'make a new element', 'create a script document'])(
    'never leaks automation-mechanism terminology when searching for %s',
    async (intent) => {
      const search = await runCli(['capabilities', 'search', intent, '--limit', '50', '--json'])
      expect(search.code).toBe(0)
      expect(search.stdout).not.toMatch(BANNED)
      expect(search.stderr).not.toMatch(BANNED)
    }
  )

  // Mail's "perform mail action with messages" is a handler Mail sends to a
  // user's script when a rule or menu item runs it, as its dictionary says; the
  // shipped manifest marks it unsupported, so discovery never offers it. Mail's
  // `checkForNewMail`, an operation Mail carries out, stays discoverable.
  it('never offers a handler the app sends to scripts', async () => {
    const handler = 'mail.app.performMailActionWithMessages'
    const search = await runCli([
      'capabilities',
      'search',
      'perform mail action with messages',
      '--limit',
      '50',
      '--json',
    ])
    expect(search.code).toBe(0)
    const parsed = JSON.parse(search.stdout) as { data: { results: { name: string }[] } }
    expect(parsed.data.results.map((result) => result.name)).not.toContain(handler)

    const inspect = await runCli(['capabilities', 'inspect', handler])
    expect(inspect.code).toBe(1)
    expect(inspect.stderr).toMatch(/unknown capability/i)

    const usable = await runCli(['capabilities', 'inspect', 'mail.app.checkForNewMail', '--json'])
    expect(usable.code).toBe(0)
  })
})
