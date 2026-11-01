/**
 * UAT: `macts --serve` serves every installed app from its generated contract.
 *
 * The real built CLI runs as a subprocess with a temporary macts home whose
 * plugins directory holds the real built `@macts/notes-server` and
 * `@macts/notes`. `MACTS_TEST_EXECUTOR=stub` selects the built-in test
 * executor, so no app is automated and every dispatched call answers with
 * the target and input that reached the executor. Keys are minted by the CLI
 * itself, into the same macts home the server verifies against. Everything is
 * asserted over real HTTP.
 *
 * Expected values are hand-derived:
 *
 * - From the Notes contract (`packages/notes/src/contract/index.ts`): operation
 *   `notes.notes.list` requires `notes:notes:list`, targets command `list` on
 *   resource `Note`, and takes `t.record({})`, a record with no fields, whose
 *   wire schema is a strict object (phases/13 D2), so an extra key is an
 *   `unrecognized_keys` issue at the root. The manifest's passthrough request
 *   schema accepts extra keys, so that issue can only come from the contract.
 * - From phases/13 D6: failures use the `{ "error": { code, message,
 *   details } }` envelope; a missing permission is 403 `PERMISSION_DENIED`
 *   whose details name the required permission and a hint; invalid input is
 *   400 `VALIDATION_FAILED` with `details.issues`. Success is `200 { result }`.
 * - From phases/13 D9: the test executor is selected by name, announced on
 *   stderr, reported as its provider, and an unknown name fails startup.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D2, D5, D6, D9, D11)
 * @see ../../../packages/notes/src/contract/index.ts
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createKey,
  createMactsHome,
  freePort,
  runCli,
  startServe,
  type MactsHome,
  type ServeProcess,
} from '../src/harness.js'

/** Building keys and starting the server spawns several Node processes. */
const SETUP_TIMEOUT_MS = 60_000

let home: MactsHome
let server: ServeProcess
let grantedToken: string
let otherToken: string

beforeAll(async () => {
  home = createMactsHome()
  grantedToken = await createKey(home, 'notes:notes:list')
  otherToken = await createKey(home, 'notes:accounts:list')
  server = await startServe(home, await freePort(), { MACTS_TEST_EXECUTOR: 'stub' })
}, SETUP_TIMEOUT_MS)

afterAll(async () => {
  await server.stop()
  home.dispose()
})

/** POST an operation with a bearer token over real HTTP. */
async function call(
  operation: string,
  body: unknown,
  token: string
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${server.url}/api/v1/rpc/${operation}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return { status: res.status, json: await res.json() }
}

describe('macts --serve (UAT): startup', () => {
  it('reports the installed app and the test executor provider', () => {
    expect(server.stdout()).toContain('Serving 1 app(s):\n  notes\n')
    expect(server.stdout()).toContain('Executor: test-stub\n')
  })

  it('warns on stderr that the test executor is active', () => {
    expect(server.stderr()).toContain(
      'Warning: MACTS_TEST_EXECUTOR=stub is set: operations run on the built-in test executor (provider "test-stub"), and no app is automated. This is for tests only.\n'
    )
  })

  it('lists the app on the unauthenticated health endpoint', async () => {
    const res = await fetch(`${server.url}/health`)
    expect(await res.json()).toMatchObject({ status: 'ok', apps: ['Notes'] })
  })
})

describe('macts --serve (UAT): operations', () => {
  it('dispatches a granted call to the executor and answers { result }', async () => {
    const { status, json } = await call('notes.notes.list', {}, grantedToken)

    expect(status).toBe(200)
    expect(json).toEqual({
      result: {
        executor: 'test-stub',
        target: { command: 'list', resource: 'Note' },
        input: {},
      },
    })
  })

  it('denies a key without the permission with 403 PERMISSION_DENIED and a hint', async () => {
    const { status, json } = await call('notes.notes.list', {}, otherToken)

    expect(status).toBe(403)
    expect(json).toMatchObject({
      error: {
        code: 'PERMISSION_DENIED',
        message: expect.any(String) as unknown,
        details: { required: 'notes:notes:list', hint: expect.any(String) as unknown },
      },
    })
    const hint = (json as { error: { details: { hint: string } } }).error.details.hint
    expect(hint).toContain('notes:notes:list')
  })

  it('rejects input the contract refuses with 400 VALIDATION_FAILED and its issues', async () => {
    const { status, json } = await call('notes.notes.list', { bogus: 1 }, grantedToken)

    expect(status).toBe(400)
    expect(json).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Operation input failed validation.',
        details: {
          issues: [{ path: [], code: 'unrecognized_keys', message: 'Unrecognized key: "bogus"' }],
        },
      },
    })
  })
})

describe('macts --serve (UAT): test executor selection', () => {
  it('fails startup with a non-zero exit for an unknown test executor name', async () => {
    const result = await runCli(home, ['--serve', '--port', String(await freePort())], {
      MACTS_TEST_EXECUTOR: 'bogus',
    })

    expect(result.code).not.toBe(0)
    expect(result.stderr).toContain(
      'Failed to start HTTP server: MACTS_TEST_EXECUTOR is set to "bogus", which is not a built-in test executor.'
    )
    expect(result.stdout).not.toContain('macts API server running')
  })
})
