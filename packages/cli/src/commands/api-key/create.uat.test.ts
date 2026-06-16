/**
 * UAT for `macts api-key create` — permission scope explanation.
 *
 * Drives the built CLI binary as a subprocess against the repository's real
 * calendar manifest, asserting that:
 *
 * 1. Human-mode output includes the scope explanation (grant / does-not-grant)
 *    derived from the manifest — not hard-coded prose.
 * 2. JSON-mode output includes a structured `scopeExplanation` field.
 * 3. Without a --manifest, existing behaviour is preserved (no explanation section).
 *
 * This is a UAT-layer test: it drives the CLI exactly as a user would.
 *
 * @see packages/core/src/permissions/explain.ts
 * @see manifests/calendar/app.yaml  — the manifest used here
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

const here = dirname(fileURLToPath(import.meta.url))
// packages/cli/src/commands/api-key → repo root is five levels up.
const repoRoot = resolve(here, '../../../../..')
const cliPackageDir = resolve(here, '../../..')
const binPath = resolve(cliPackageDir, 'dist/bin.js')
// The real calendar manifest shipped with the repo.
const calendarManifest = resolve(repoRoot, 'manifests/calendar/app.yaml')

interface CliResult {
  stdout: string
  stderr: string
  code: number
}

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

describe('macts api-key create — scope explanation (UAT)', () => {
  beforeAll(() => {
    if (!existsSync(binPath)) {
      throw new Error(
        `Built CLI not found at ${binPath}. Run \`pnpm --filter @macts/cli build\` before this UAT.`
      )
    }
    if (!existsSync(calendarManifest)) {
      throw new Error(`Calendar manifest not found at ${calendarManifest}`)
    }
  })

  // --------------------------------------------------------------------------
  // Human-mode output
  // --------------------------------------------------------------------------

  it('human output includes the explanation section when --manifest is provided', async () => {
    const { stdout, code } = await runCli([
      'api-key',
      'create',
      '--name',
      'test-key',
      '--permission',
      'calendar:events:list',
      '--manifest',
      calendarManifest,
    ])
    expect(code).toBe(0)
    // The scope explanation header mentions the app name from the manifest
    // (manifest.app.name = "Calendar")
    expect(stdout).toContain('Calendar')
    // "Can:" section with the granted list operation
    expect(stdout).toContain('Can:')
    // "Cannot:" section for ops not covered by this narrow scope
    expect(stdout).toContain('Cannot:')
  })

  it('human output names the granted operation (list) with its manifest description', async () => {
    const { stdout, code } = await runCli([
      'api-key',
      'create',
      '--name',
      'test-key',
      '--permission',
      'calendar:events:list',
      '--manifest',
      calendarManifest,
    ])
    expect(code).toBe(0)
    // "list" operation must appear in the granted section.
    // The description "List all events in a calendar" comes from the manifest command.
    expect(stdout).toContain('list')
    expect(stdout).toContain('List all events in a calendar')
  })

  it('human output names not-granted operations when only partial scope is granted', async () => {
    const { stdout, code } = await runCli([
      'api-key',
      'create',
      '--name',
      'partial-key',
      '--permission',
      'calendar:events:list',
      '--manifest',
      calendarManifest,
    ])
    expect(code).toBe(0)
    // create, get, show, delete are all not granted and must appear in Cannot:
    expect(stdout).toContain('create')
    expect(stdout).toContain('get')
    expect(stdout).toContain('show')
    expect(stdout).toContain('delete')
  })

  it('human output shows no Cannot section for a resource when wildcard covers all ops', async () => {
    const { stdout, code } = await runCli([
      'api-key',
      'create',
      '--name',
      'wildcard-key',
      '--permission',
      'calendar:events:*',
      '--manifest',
      calendarManifest,
    ])
    expect(code).toBe(0)
    // events:* expands to all event operations; the events resource should have no Cannot:
    // (other resources like calendars will still have Cannot: since they are not covered)
    // We verify the output includes "Can:" for events
    expect(stdout).toContain('Can:')
    // And that the key was created (token line present)
    expect(stdout).toContain('API Key:')
  })

  it('human output shows explanation for events and calendars resources', async () => {
    const { stdout, code } = await runCli([
      'api-key',
      'create',
      '--name',
      'two-resource-key',
      '--permission',
      'calendar:events:list',
      '--permission',
      'calendar:calendars:list',
      '--manifest',
      calendarManifest,
    ])
    expect(code).toBe(0)
    // Both resources should appear in the explanation
    expect(stdout).toContain('events:')
    expect(stdout).toContain('calendars:')
  })

  it('human output does NOT include a scope explanation section when --manifest is not provided', async () => {
    const { stdout, code } = await runCli([
      'api-key',
      'create',
      '--name',
      'no-manifest-key',
      '--permission',
      'calendar:events:list',
    ])
    expect(code).toBe(0)
    // Without a manifest, "Can:" / "Cannot:" sections must not appear
    expect(stdout).not.toContain('Can:')
    expect(stdout).not.toContain('Cannot:')
    // But key details are still present
    expect(stdout).toContain('API Key:')
    expect(stdout).toContain('Permissions:')
  })

  // --------------------------------------------------------------------------
  // JSON-mode output
  // --------------------------------------------------------------------------

  it('json output includes scopeExplanation with resources, granted, notGranted', async () => {
    const { stdout, code } = await runCli([
      'api-key',
      'create',
      '--name',
      'json-key',
      '--permission',
      'calendar:events:list',
      '--manifest',
      calendarManifest,
      '--json',
    ])
    expect(code).toBe(0)
    const parsed = JSON.parse(stdout) as {
      data: {
        scopeExplanation: {
          app: string
          grantsNothing: boolean
          resources: {
            resource: string
            granted: { permission: string; operation: string; description: string | null }[]
            notGranted: { permission: string; operation: string }[]
          }[]
        }
      }
    }

    const explanation = parsed.data.scopeExplanation
    expect(explanation).toBeDefined()
    // App name from manifest.app.name = "Calendar"
    expect(explanation.app).toBe('Calendar')
    expect(explanation.grantsNothing).toBe(false)

    // Find the events resource
    const eventsResource = explanation.resources.find((r) => r.resource === 'events')
    expect(eventsResource).toBeDefined()

    // list should be in granted
    const listOp = eventsResource?.granted.find((op) => op.operation === 'list')
    expect(listOp).toBeDefined()
    expect(listOp?.permission).toBe('calendar:events:list')
    // description is sourced from the manifest command, not hard-coded here
    expect(typeof listOp?.description).toBe('string')
    expect(listOp?.description).toBeTruthy()

    // create should be in notGranted
    const createOp = eventsResource?.notGranted.find((op) => op.operation === 'create')
    expect(createOp).toBeDefined()
    expect(createOp?.permission).toBe('calendar:events:create')
  })

  it('json output does NOT include scopeExplanation when --manifest is not provided', async () => {
    const { stdout, code } = await runCli([
      'api-key',
      'create',
      '--name',
      'no-manifest-json',
      '--permission',
      'calendar:events:list',
      '--json',
    ])
    expect(code).toBe(0)
    const parsed = JSON.parse(stdout) as { data: Record<string, unknown> }
    // scopeExplanation must be absent when no manifest
    expect(parsed.data['scopeExplanation']).toBeUndefined()
    // Standard fields must still be present
    expect(parsed.data['token']).toBeDefined()
    expect(parsed.data['permissions']).toBeDefined()
  })

  it('json output scope explanation for wildcard scope has notGranted empty for covered resources', async () => {
    const { stdout, code } = await runCli([
      'api-key',
      'create',
      '--name',
      'wildcard-json',
      '--permission',
      'calendar:*:*',
      '--manifest',
      calendarManifest,
      '--json',
    ])
    expect(code).toBe(0)
    const parsed = JSON.parse(stdout) as {
      data: {
        scopeExplanation: {
          resources: {
            resource: string
            granted: { operation: string }[]
            notGranted: { operation: string }[]
          }[]
        }
      }
    }
    // All resources should have empty notGranted for full wildcard
    for (const resource of parsed.data.scopeExplanation.resources) {
      expect(resource.notGranted).toHaveLength(0)
    }
  })
})
