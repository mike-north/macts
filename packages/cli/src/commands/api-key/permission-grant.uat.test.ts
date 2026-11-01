/**
 * UAT: camelCase permissions can be granted and used, and mis-cased ones fail
 * with a message that names the permission to use.
 *
 * Keys are created by the real built CLI binary (a subprocess with its own
 * `MACTS_HOME`), then used against the key store that CLI wrote: through the
 * invocation runtime and through the real HTTP server, each with a recording
 * executor so no Mac app runs. A granted call is answered 200 and reaches the
 * executor; a denied call is answered 403 and never does.
 *
 * Permissions are hand-derived from the shipped manifests:
 * `manifests/photos/app.yaml` command `listMediaItems` publishes under its
 * operation name on resource `MediaItems`, whose segment is `mediaItems`, so
 * its route is `photos.mediaItems.list` and its derived permission is
 * `photos:mediaItems:list`, and
 * `manifests/iterm/app.yaml` has application command `splitVertically`, whose
 * derived permission is `iterm:app:splitVertically` (route
 * `iterm.app.splitVertically`).
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2)
 * @see https://github.com/mike-north/macts/issues/153
 * @see https://github.com/mike-north/macts/issues/154
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AppManifest, ExecutionRequest } from '@macts/core'

const execFileAsync = promisify(execFile)

const here = dirname(fileURLToPath(import.meta.url))
// packages/cli/src/commands/api-key -> repo root is five levels up.
const repoRoot = resolve(here, '../../../../..')
const binPath = resolve(here, '../../../dist/bin.js')

const PHOTOS_LIST = 'photos:mediaItems:list'
const ITERM_SPLIT = 'iterm:app:splitVertically'
const PHOTOS_LIST_ROUTE = 'photos.mediaItems.list'
const ITERM_SPLIT_ROUTE = 'iterm.app.splitVertically'

/** An operation id in the `app.resource.operation` form the runtime requires. */
type OperationId = `${string}.${string}.${string}`

interface CliResult {
  stdout: string
  stderr: string
  code: number
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

/** Create a key through the CLI and return its token. */
async function createKeyWithCli(permission: string, extra: string[] = []): Promise<string> {
  const result = await runCli([
    'api-key',
    'create',
    '--name',
    `uat-${permission}`,
    '--permission',
    permission,
    '--json',
    ...extra,
  ])
  expect(result.code, result.stderr).toBe(0)
  const parsed = JSON.parse(result.stdout) as { data: { token: string } }
  return parsed.data.token
}

beforeAll(() => {
  if (!existsSync(binPath)) {
    throw new Error(
      `Built CLI not found at ${binPath}. Run \`pnpm --filter @macts/cli build\` before this UAT.`
    )
  }
})

beforeEach(() => {
  mactsHome = mkdtempSync(join(tmpdir(), 'macts-permission-uat-'))
})

afterEach(() => {
  rmSync(mactsHome, { recursive: true, force: true })
})

describe('macts api-key create (UAT): permission grammar and case', () => {
  it('rejects a mis-cased permission, naming the correct one on stderr', async () => {
    const result = await runCli([
      'api-key',
      'create',
      '--name',
      'miscased',
      '--permission',
      'photos:mediaitems:list',
    ])
    expect(result.code).not.toBe(0)
    expect(result.stderr).toContain('photos:mediaItems:list')
    expect(result.stderr).toContain('letter case')
  })

  it('rejects a malformed permission, naming the closest valid one', async () => {
    const result = await runCli([
      'api-key',
      'create',
      '--name',
      'malformed',
      '--permission',
      'photos:MediaItems:list',
    ])
    expect(result.code).not.toBe(0)
    expect(result.stderr).toContain('Did you mean "photos:mediaItems:list"')
  })

  it('rejects a permission with a dash in the operation segment', async () => {
    const result = await runCli([
      'api-key',
      'create',
      '--name',
      'dashed',
      '--permission',
      'photos:mediaItems:list-all',
    ])
    expect(result.code).not.toBe(0)
    expect(result.stderr).toContain('camelCase')
  })

  it('accepts a well-formed permission no manifest defines, warning on stderr', async () => {
    const result = await runCli([
      'api-key',
      'create',
      '--name',
      'future',
      '--permission',
      'photos:memories:list',
    ])
    expect(result.code, result.stderr).toBe(0)
    expect(result.stderr).toContain('warning:')
    expect(result.stderr).toContain('photos:memories:list')
  })

  it('names the permissions map when a permission is declared there but no route requires it', async () => {
    // manifests/photos/app.yaml lists photos:mediaItems:update under the
    // mediaItems `write` mapping, and no Photos route requires it.
    const result = await runCli([
      'api-key',
      'create',
      '--name',
      'declared-only',
      '--permission',
      'photos:mediaItems:update',
    ])
    expect(result.code, result.stderr).toBe(0)
    expect(result.stderr).toContain(
      'warning: "photos:mediaItems:update" is listed in the photos manifest\'s permissions map, but no photos route requires it yet'
    )
  })

  it('accepts a correctly cased permission without warning', async () => {
    const result = await runCli([
      'api-key',
      'create',
      '--name',
      'ok',
      '--permission',
      PHOTOS_LIST,
      '--manifest',
      join(repoRoot, 'manifests/photos/app.yaml'),
    ])
    expect(result.code, result.stderr).toBe(0)
    expect(result.stderr).not.toContain('warning:')
  })
})

describe('camelCase grants authorize real calls (UAT)', () => {
  let runtimeModule: typeof import('@macts/runtime')
  let apiModule: typeof import('@macts/api')
  let manifests: AppManifest[]

  /** Load runtime and API fresh so they bind to this test's `MACTS_HOME`. */
  async function loadModules(): Promise<void> {
    vi.resetModules()
    process.env['MACTS_HOME'] = mactsHome
    delete process.env['MACTS_API_KEY_SECRET']
    runtimeModule = await import('@macts/runtime')
    apiModule = await import('@macts/api')
    const core = await import('@macts/core')
    manifests = await Promise.all(
      ['photos', 'iterm'].map((app) =>
        core.loadManifest(join(repoRoot, 'manifests', app, 'app.yaml'))
      )
    )
  }

  afterEach(() => {
    runtimeModule.closeKeyStore()
    delete process.env['MACTS_HOME']
  })

  /** A runtime over the real key store whose executor records instead of running apps. */
  function makeRuntime(): {
    invoke: (id: OperationId, input: unknown, token: string) => Promise<unknown>
    requests: ExecutionRequest[]
  } {
    const requests: ExecutionRequest[] = []
    const runtime = runtimeModule.createRuntime({
      executor: {
        provider: 'recording-stub',
        execute(request) {
          requests.push(request)
          return Promise.resolve({ ok: true })
        },
      },
      governance: { policy: runtimeModule.ALLOW_ALL_POLICY },
    })
    for (const manifest of manifests) runtime.registerManifest(manifest)
    return {
      requests,
      invoke: (id, input, token) =>
        runtime.invoke(id, input, { credential: runtimeModule.createBearerCredential(token) }),
    }
  }

  /** POST one operation to the real HTTP server over the real key store and a recording executor. */
  async function postRpc(
    route: string,
    token: string,
    body: string
  ): Promise<{ res: Response; requests: ExecutionRequest[] }> {
    const requests: ExecutionRequest[] = []
    const app = apiModule.createApp(manifests, {
      cors: false,
      logging: false,
      executor: {
        provider: 'recording-stub',
        execute(request) {
          requests.push(request)
          return Promise.resolve({ ok: true })
        },
      },
    })
    const res = await app.request(`/api/v1/rpc/${route}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
    })
    return { res, requests }
  }

  it('a CLI-created photos:mediaItems:list key invokes the operation', async () => {
    const token = await createKeyWithCli(PHOTOS_LIST)
    await loadModules()
    const { invoke, requests } = makeRuntime()

    await expect(invoke(PHOTOS_LIST_ROUTE, {}, token)).resolves.toEqual({ ok: true })
    expect(requests).toHaveLength(1)
  })

  it('a CLI-created iterm:app:splitVertically key invokes the operation', async () => {
    const token = await createKeyWithCli(ITERM_SPLIT, [
      '--manifest',
      join(repoRoot, 'manifests/iterm/app.yaml'),
    ])
    await loadModules()
    const { invoke, requests } = makeRuntime()

    await expect(invoke(ITERM_SPLIT_ROUTE, { withProfile: 'Default' }, token)).resolves.toEqual({
      ok: true,
    })
    expect(requests).toHaveLength(1)
  })

  it('the HTTP server answers 200 to CLI-created camelCase keys', async () => {
    const photosToken = await createKeyWithCli(PHOTOS_LIST)
    const itermToken = await createKeyWithCli(ITERM_SPLIT)
    await loadModules()

    for (const [route, token, input] of [
      [PHOTOS_LIST_ROUTE, photosToken, {}],
      [ITERM_SPLIT_ROUTE, itermToken, { withProfile: 'Default' }],
    ] as const) {
      const { res, requests } = await postRpc(route, token, JSON.stringify(input))
      expect(res.status, route).toBe(200)
      expect(await res.json(), route).toEqual({ result: { ok: true } })
      expect(requests, route).toHaveLength(1)
    }
  })

  it('a key holding a mis-cased permission is denied with a hint naming the correct one', async () => {
    // Minted without a manifest, as a key created before the grammar change was.
    await loadModules()
    const { token } = await runtimeModule.createApiKey({
      name: 'older-key',
      permissions: ['photos:mediaitems:list'],
    })
    const { invoke, requests } = makeRuntime()

    const error: unknown = await invoke(PHOTOS_LIST_ROUTE, {}, token).catch((e: unknown) => e)
    expect(error).toMatchObject({
      code: 'PERMISSION_DENIED',
      details: { required: PHOTOS_LIST },
    })
    const hint = (error as { details: { hint: string } }).details.hint
    expect(hint).toContain('photos:mediaitems:list')
    expect(hint).toContain('Grant "photos:mediaItems:list"')
    expect(requests).toHaveLength(0)

    const http = await postRpc(PHOTOS_LIST_ROUTE, token, '{}')
    expect(http.res.status).toBe(403)
    const body = (await http.res.json()) as {
      error: { code: string; details: { required: string; hint: string } }
    }
    expect(body.error.code).toBe('PERMISSION_DENIED')
    expect(body.error.details.required).toBe(PHOTOS_LIST)
    expect(body.error.details.hint).toContain('Grant "photos:mediaItems:list"')
    expect(http.requests).toHaveLength(0)
  })
})
