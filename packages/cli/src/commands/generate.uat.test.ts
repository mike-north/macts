/**
 * UAT for `macts generate`: generation diagnostics.
 *
 * Drives the real built CLI binary as a subprocess against a small manifest
 * written to a temporary directory, as a user would run it. A manifest type
 * the generated contract cannot resolve is described as `unknown`; the CLI
 * must report it on stderr as a warning naming the app, the manifest
 * position, and the declared type, and still succeed.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D2 (generated contracts)
 */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

const here = dirname(fileURLToPath(import.meta.url))
const binPath = resolve(here, '../../dist/bin.js')

/** A manifest whose `Note.layout` names a resource the manifest does not declare. */
function sketchpadManifest(layoutType: string): string {
  return `version: '1.0'
app:
  bundleId: com.example.sketchpad
  name: Sketchpad
  tccEntitlements: []
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    properties:
      uid:
        access: r
        type: string
        description: The note's identifier
      layout:
        access: r
        type: ${layoutType}
        description: How the note is laid out
    identifiers:
      - property: uid
        primary: true
enums: {}
hierarchy:
  children: {}
commands:
  listNotes:
    name: list
    description: List notes
    scope: resource
    resourceType: Note
`
}

interface CliResult {
  readonly stdout: string
  readonly stderr: string
  readonly code: number
}

async function runCli(args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [binPath, ...args])
    return { stdout, stderr, code: 0 }
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; code?: number }
    return { stdout: failure.stdout ?? '', stderr: failure.stderr ?? '', code: failure.code ?? 1 }
  }
}

describe('macts generate (UAT): diagnostics', () => {
  let dir = ''

  beforeAll(() => {
    if (!existsSync(binPath)) {
      throw new Error(
        `Built CLI not found at ${binPath}. Run \`pnpm --filter @macts/cli build\` before this UAT.`
      )
    }
  })

  afterEach(async () => {
    if (dir !== '') await rm(dir, { recursive: true, force: true })
    dir = ''
  })

  async function generate(layoutType: string): Promise<CliResult> {
    dir = await mkdtemp(join(tmpdir(), 'macts-generate-uat-'))
    const manifestPath = join(dir, 'app.yaml')
    await writeFile(manifestPath, sketchpadManifest(layoutType))
    return runCli(['generate', manifestPath, '--out-dir', join(dir, 'out'), '--target', 'all'])
  }

  it('warns on stderr about an unresolved type, and exits 0', async () => {
    const result = await generate('{ resource: page layout }')

    expect(result.code).toBe(0)
    expect(result.stderr).toBe(
      'warning: sketchpad: resources.Note.properties.layout: the type {"resource":"page layout"} ' +
        'names no resource or enum, so the contract describes it as unknown.\n'
    )
    expect(result.stdout).not.toContain('warning')
    // The packages are still written: a diagnostic is a tolerated fallback.
    expect(existsSync(join(dir, 'out', 'sketchpad', 'src', 'contract', 'index.ts'))).toBe(true)
  }, 60_000)

  it('prints no warning when every type resolves', async () => {
    const result = await generate('string')

    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
  }, 60_000)
})
