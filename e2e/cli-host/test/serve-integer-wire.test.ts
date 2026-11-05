/**
 * UAT: the host `macts --serve` starts validates the generated legacy HTTP
 * client's integer ids against the app's contract (#207).
 *
 * `macts --serve` registers every installed app from its generated contract
 * (`registerInstalledApps`, `packages/cli/src/host/installed-apps.ts`), not
 * from its manifest alone, so a request's input is checked against the
 * contract's `input.wire`. That wire takes an integer only in its tagged form,
 * `{ integer: "<digits>" }` (phases/13 D3). A manifest-only registration
 * (`buildDeclaredInputSchema`, `packages/runtime/src/operations/request-schema.ts`)
 * would instead take a bare JSON number, so the two bodies below tell the
 * paths apart: the served host admits the tagged one and rejects the bare one.
 *
 * The real built CLI runs as a subprocess serving every workspace app, with
 * the built-in test executor (`MACTS_TEST_EXECUTOR=stub`), which has no
 * objects. The real built OmniPlan HTTP client calls it over real HTTP.
 * Expected outcomes are hand-derived:
 *
 * - OmniPlan's `omniplan.tasks.get` requires `omniplan:tasks:get` and takes
 *   `{ id }`, an integer (`packages/omniplan/src/contract/index.ts`).
 * - A body the contract admits reaches the executor, which fails the get with
 *   `TargetNotFoundError`: 404 `TARGET_NOT_FOUND` (phases/13 D6). The client
 *   raises the canonical `TargetNotFoundError`; explicit raw RPC retains `OmniPlanError`.
 * - A body it does not admit fails before the executor with 400
 *   `VALIDATION_FAILED`, whose issue is at `id`.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D3, D5, D6)
 * @see https://github.com/mike-north/macts/issues/207
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TargetNotFoundError } from '@macts/contracts'
import { OmniPlanClient, OmniPlanError } from '@macts/omniplan'
import {
  createKey,
  createMactsHome,
  freePort,
  startServe,
  type MactsHome,
  type ServeProcess,
} from '../src/harness.js'

/** Building the key and starting the server spawns several Node processes. */
const SETUP_TIMEOUT_MS = 60_000

let home: MactsHome
let server: ServeProcess
let token: string

beforeAll(async () => {
  home = createMactsHome('all-workspace-apps')
  token = await createKey(home, 'omniplan:tasks:get')
  server = await startServe(home, await freePort(), { MACTS_TEST_EXECUTOR: 'stub' })
}, SETUP_TIMEOUT_MS)

afterAll(async () => {
  await server.stop()
  home.dispose()
})

/** POST `body` to `omniplan.tasks.get` over real HTTP with the granted key. */
async function getTask(body: unknown): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${server.url}/api/v1/rpc/omniplan.tasks.get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return { status: res.status, json: await res.json() }
}

describe('macts --serve (UAT): an integer id from the legacy HTTP client (#207)', () => {
  // Bug #207: the client sent the id as text, which the served contract
  // rejects. Its body now passes validation and reaches the app, which has no
  // such task.
  it('admits the legacy client get by an integer id, so it reaches the app (bug #207)', async () => {
    const client = new OmniPlanClient({ apiKey: token, baseUrl: server.url })
    const failure = await client.tasks.get('42').then(
      () => undefined,
      (error: unknown) => error
    )
    expect(failure).toBeInstanceOf(TargetNotFoundError)
    expect(failure).toMatchObject({ code: 'TARGET_NOT_FOUND' })
  })

  it('preserves the app-specific error for explicit raw wire RPC', async () => {
    const client = new OmniPlanClient({ apiKey: token, baseUrl: server.url })
    await expect(
      client.http.rpc('omniplan.tasks.get', { id: { integer: '42' } })
    ).rejects.toBeInstanceOf(OmniPlanError)
  })

  // The tagged body the client sends reaches the executor, as above.
  it('admits the tagged integer form', async () => {
    const { status, json } = await getTask({ id: { integer: '42' } })
    expect(status).toBe(404)
    expect(json).toMatchObject({ error: { code: 'TARGET_NOT_FOUND' } })
  })

  // The bare number a manifest-only registration would take is refused: the
  // host validates against the contract.
  it.each([
    ['a bare number, as manifest-only registration takes it', 42],
    ['text, as the client sent it before the fix', '42'],
  ])('rejects the id as %s, before the app is called', async (_label, id) => {
    const { status, json } = await getTask({ id })
    expect(status).toBe(400)
    expect(json).toMatchObject({
      error: { code: 'VALIDATION_FAILED', details: { issues: [{ path: ['id'] }] } },
    })
  })
})
