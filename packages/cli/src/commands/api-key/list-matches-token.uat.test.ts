/**
 * UAT: `macts api-key list` shows the grant the key's token carries.
 *
 * A key's permissions and expiry are signed into its token, and the stored
 * record written at issue is the receipt of that grant; it cannot be edited
 * afterwards. So what `list` reports for a key must equal what `verify` reads
 * out of the key's token. Both run as the real built CLI binary, in a
 * subprocess with its own `MACTS_HOME`.
 *
 * The expanded permissions are hand-derived from the shipped
 * `manifests/calendar/app.yaml` permissions map: `calendar:events:read` groups
 * `calendar:events:list`, `calendar:events:get` and `calendar:events:show`.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1.4 (JWT `exp`, Unix seconds)
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

const here = dirname(fileURLToPath(import.meta.url))
// packages/cli/src/commands/api-key -> repo root is five levels up.
const repoRoot = resolve(here, '../../../../..')
const binPath = resolve(here, '../../../dist/bin.js')
const calendarManifest = join(repoRoot, 'manifests/calendar/app.yaml')

interface CliResult {
  stdout: string
  stderr: string
  code: number
}

/** One key as `macts api-key list --json` reports it. */
interface ListedKey {
  id: string
  name: string
  permissions: string[]
  originalPermissions: string[]
  expiresAt: string | null
  revoked: boolean
}

/** What `macts api-key verify --json` reads from a valid token. */
interface VerifiedToken {
  valid: true
  keyId: string
  name: string | null
  permissions: string[]
  expiresAt: string | null
}

let mactsHome = ''

/** Run the built CLI against the temporary `MACTS_HOME`, from the repo root. */
async function runCli(args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [binPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, MACTS_HOME: mactsHome, MACTS_API_KEY_SECRET: '' },
    })
    return { stdout, stderr, code: 0 }
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; code?: number }
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code ?? 1 }
  }
}

/** Run a `--json` CLI command that must succeed, and return its `data`. */
async function runJson<T>(args: string[]): Promise<T> {
  const result = await runCli([...args, '--json'])
  expect(result.code, result.stderr).toBe(0)
  return (JSON.parse(result.stdout) as { data: T }).data
}

/** Create a key through the CLI; returns its token and id. */
async function createKey(args: string[]): Promise<{ token: string; keyId: string }> {
  return runJson<{ token: string; keyId: string }>(['api-key', 'create', ...args])
}

/** The key `list` reports with id `keyId`. */
async function listedKey(keyId: string): Promise<ListedKey | undefined> {
  const { keys } = await runJson<{ keys: ListedKey[] }>(['api-key', 'list'])
  return keys.find((key) => key.id === keyId)
}

beforeAll(() => {
  if (!existsSync(binPath)) {
    throw new Error(
      `Built CLI not found at ${binPath}. Run \`pnpm --filter @macts/cli build\` before this UAT.`
    )
  }
})

beforeEach(() => {
  mactsHome = mkdtempSync(join(tmpdir(), 'macts-list-token-uat-'))
})

afterEach(() => {
  rmSync(mactsHome, { recursive: true, force: true })
})

describe('macts api-key list (UAT): shows the grant the token carries', () => {
  it('reports the expanded permissions and expiry that verify reads from the token', async () => {
    const { token, keyId } = await createKey([
      '--name',
      'expiring',
      '--permission',
      'calendar:events:read',
      '--manifest',
      calendarManifest,
      '--expires',
      '30d',
    ])

    const verified = await runJson<VerifiedToken>(['api-key', 'verify', token])
    const listed = await listedKey(keyId)

    expect(verified.valid).toBe(true)
    expect(verified.keyId).toBe(keyId)
    // The coarse request is expanded at issue, and the token carries the result.
    expect([...verified.permissions].sort()).toEqual([
      'calendar:events:get',
      'calendar:events:list',
      'calendar:events:show',
    ])
    expect(verified.expiresAt).not.toBeNull()

    expect(listed).toBeDefined()
    expect(listed?.permissions).toEqual(verified.permissions)
    expect(listed?.expiresAt).toBe(verified.expiresAt)
    expect(listed?.name).toBe(verified.name)
    // The request as written is kept alongside the grant it expanded to.
    expect(listed?.originalPermissions).toEqual(['calendar:events:read'])
    expect(listed?.revoked).toBe(false)
  })

  it('reports no expiry for a key whose token has none', async () => {
    const { token, keyId } = await createKey([
      '--name',
      'no-expiry',
      '--permission',
      'calendar:events:list',
    ])

    const verified = await runJson<VerifiedToken>(['api-key', 'verify', token])
    const listed = await listedKey(keyId)

    expect(verified.expiresAt).toBeNull()
    expect(listed?.expiresAt).toBeNull()
    expect(listed?.permissions).toEqual(verified.permissions)
    expect(listed?.permissions).toEqual(['calendar:events:list'])
  })
})
