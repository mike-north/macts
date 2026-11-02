/**
 * UAT: `macts --serve` serves every installed app from its generated contract.
 *
 * The real built CLI runs as a subprocess with a temporary macts home whose
 * plugins directory holds two real built app pairs: `@macts/notes-server` with
 * `@macts/notes`, and `@macts/reminders-server` with `@macts/reminders`.
 * `MACTS_TEST_EXECUTOR=stub` selects the built-in test
 * executor, so no app is automated and every dispatched call answers as an
 * app with no objects would: a list yields `[]`. Keys are minted by the CLI
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
 * - From the Reminders contract (`packages/reminders/src/contract/index.ts`):
 *   operation `reminders.lists.list` requires `reminders:lists:list`, targets
 *   command `list` on resource `List`, and takes `t.record({})`.
 * - From phases/13 D6: failures use the `{ "error": { code, message,
 *   details } }` envelope; a missing permission is 403 `PERMISSION_DENIED`
 *   whose details name the required permission and a hint; invalid input is
 *   400 `VALIDATION_FAILED` with `details.issues`. Success is `200 { result }`.
 * - From the Notes contract: `notes.notes.get` requires `notes:notes:get`,
 *   targets command `get` on resource `Note`, and takes `{ name }`. The test
 *   executor has no objects, so it fails a get with `TargetNotFoundError`
 *   naming the resource, which phases/13 D6 maps to 404 `TARGET_NOT_FOUND`.
 * - From phases/13 D11: the runtime validates every result against the
 *   operation's output contract before the HTTP adapter emits it, so a list
 *   result reaches the caller only when it conforms; `[]` always does.
 * - From phases/13 D9: the test executor is selected by name, announced on
 *   stderr, named as the executor provider in the startup report, and an
 *   unknown name fails startup. It appears in contributor docs, never in user
 *   docs or `--help`, so neither the built CLI's help nor the shipped READMEs
 *   mention it.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D2, D5, D6, D9, D11)
 * @see ../../../packages/notes/src/contract/index.ts
 * @see ../../../packages/reminders/src/contract/index.ts
 */

import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  SHIPPED_READMES,
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
let remindersToken: string
let getterToken: string
let otherToken: string

beforeAll(async () => {
  home = createMactsHome()
  grantedToken = await createKey(home, 'notes:notes:list')
  remindersToken = await createKey(home, 'reminders:lists:list')
  getterToken = await createKey(home, 'notes:notes:get')
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
  it('reports every installed app and the test executor provider', () => {
    expect(server.stdout()).toContain('Serving 2 app(s):\n  notes\n  reminders\n')
    expect(server.stdout()).toContain('Executor: test-stub\n')
  })

  it('warns on stderr that the test executor is active', () => {
    expect(server.stderr()).toContain(
      'Warning: MACTS_TEST_EXECUTOR=stub is set: operations run on the built-in test executor (provider "test-stub"), and no app is automated. This is for tests only.\n'
    )
  })

  it('lists the app on the unauthenticated health endpoint', async () => {
    const res = await fetch(`${server.url}/health`)
    expect(await res.json()).toMatchObject({ status: 'ok', apps: ['Notes', 'Reminders'] })
  })
})

describe('macts --serve (UAT): operations', () => {
  it('dispatches a granted call to the executor and answers { result }', async () => {
    const { status, json } = await call('notes.notes.list', {}, grantedToken)

    expect(status).toBe(200)
    expect(json).toEqual({ result: [] })
  })

  it('dispatches a granted call to a second installed app', async () => {
    // The key holds only the Reminders permission, so a 200 proves the call
    // was routed to the Reminders operation and dispatched.
    const { status, json } = await call('reminders.lists.list', {}, remindersToken)

    expect(status).toBe(200)
    expect(json).toEqual({ result: [] })
  })

  it('answers a get with 404 TARGET_NOT_FOUND, since the test executor automates no app', async () => {
    // A get needs an existing object; the stub has none, so the call reaches
    // the executor and fails with the canonical not-found envelope.
    const { status, json } = await call('notes.notes.get', { name: 'Groceries' }, getterToken)

    expect(status).toBe(404)
    expect(json).toEqual({
      error: {
        code: 'TARGET_NOT_FOUND',
        message: 'The test executor automates no app, so the target does not exist.',
        details: { resource: 'Note' },
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

describe('macts --serve (UAT): the test executor stays out of user docs', () => {
  it.each([['--help'], ['--serve', '-h']])('is not mentioned by `macts %s`', async (...args) => {
    const result = await runCli(home, args)

    expect(result.code).toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain('--serve')
    expect(`${result.stdout}${result.stderr}`).not.toContain('MACTS_TEST_EXECUTOR')
  })

  it.each(SHIPPED_READMES)('is not mentioned in %s', (readme) => {
    expect(readFileSync(readme, 'utf-8')).not.toContain('MACTS_TEST_EXECUTOR')
  })
})
