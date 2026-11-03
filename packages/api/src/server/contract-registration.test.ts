/**
 * Serving apps registered from their generated contracts.
 *
 * A server built with the `register` option serves each contract-registered
 * operation with the contract's descriptor, so the runtime validates the
 * input against the contract's wire schema (phases/13 D5 step 4, D11) rather
 * than the manifest command's passthrough request schema. Every other step,
 * and every failure envelope, is the same as for a manifest-registered app
 * (D6).
 *
 * The contract below is written by hand with the `@macts/contracts` value
 * constructors for the test calendar manifest, so its id, permission, and
 * target are hand-derived from that manifest: `calendar.events.create`,
 * `calendar:events:create`, command `create` on resource `Event`. Its input is
 * a strict record of a required string `summary` and an optional boolean
 * `allDay`; it deliberately omits the manifest's optional `password`
 * parameter, so a body that the manifest's schema accepts is one the
 * contract's rejects.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D5, D6, D11)
 */

import { describe, expect, it } from 'vitest'
import {
  ValueTypes as t,
  type AnyOperationDescriptor,
  type AppContract,
  type OperationDescriptor,
  type OperationId,
} from '@macts/contracts'
import { OperationRegistrationError } from '@macts/runtime'
import { createMultiServer, type AppRegistrar } from './index.js'
import {
  CALENDAR_MANIFEST,
  NOTES_MANIFEST,
  READER_TOKEN,
  WRITER_TOKEN,
  createRecordingExecutor,
  createTestServer,
  errorBody,
  post,
} from './test-helpers.js'

const eventRecord = t.record({ uid: t.string() })

const createEvent: OperationDescriptor<
  { readonly summary: string; readonly allDay?: boolean },
  { readonly uid: string }
> = {
  id: 'calendar.events.create',
  permission: 'calendar:events:create',
  target: { command: 'create', resource: 'Event' },
  description: 'Create an event',
  input: t.record({ summary: t.string(), allDay: t.optional(t.boolean()) }),
  output: eventRecord,
}

/** A contract for the test calendar manifest covering one operation. */
function calendarContract(operation: AnyOperationDescriptor = createEvent): AppContract<unknown> {
  const operations: Readonly<Record<OperationId, AnyOperationDescriptor>> = {
    [operation.id]: operation,
  }
  return {
    app: 'calendar',
    operations,
    resources: { Event: { name: 'Event', record: eventRecord, id: t.string() } },
    loadManifest: () => Promise.resolve(CALENDAR_MANIFEST),
    bind: () => ({}),
  }
}

/** Register the calendar contract against its manifest. */
function registerCalendar(registrar: AppRegistrar): void {
  registrar.registerContract(calendarContract(), CALENDAR_MANIFEST)
}

describe('an operation marked unavailable', () => {
  // A required input of this create admits no value (phases/13 D7,
  // "Resolvable targets"), so the descriptor marks the operation unavailable.
  const unavailableCreate: AnyOperationDescriptor = {
    ...createEvent,
    unavailable: {
      positions: ['summary'],
      reason: 'Not available: `summary` admits no value, so the operation cannot be called.',
    },
  }
  const register = (registrar: AppRegistrar): void => {
    registrar.registerContract(calendarContract(unavailableCreate), CALENDAR_MANIFEST)
  }

  it('is not routed: a call gets the same 404 as an unknown operation, never reaching the runtime', async () => {
    const { app, verifier, executor } = createTestServer({ manifests: [], register })

    const res = await post(app, 'calendar.events.create', { summary: 'Standup' }, WRITER_TOKEN)
    const unknown = await post(app, 'calendar.events.nope', {}, WRITER_TOKEN)

    expect(res.status).toBe(404)
    expect(await errorBody(res)).toEqual(await errorBody(unknown))
    expect(verifier.calls()).toBe(0)
    expect(executor.requests).toHaveLength(0)
  })

  it('is not listed by introspection', async () => {
    const { app } = createTestServer({ manifests: [], register })

    const res = await app.request('/api/v1/introspect/all')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ apps: [] })
  })
})

describe('a server with contract-registered apps', () => {
  it('validates input against the contract wire schema, not the manifest request schema', async () => {
    const contractServer = createTestServer({ manifests: [], register: registerCalendar })
    const manifestServer = createTestServer({ manifests: [CALENDAR_MANIFEST] })
    const body = { summary: 'Standup', password: 'hunter2' }

    // The manifest declares `password`, so passthrough validation accepts it.
    const passthrough = await post(manifestServer.app, 'calendar.events.create', body, WRITER_TOKEN)
    expect(passthrough.status).toBe(200)

    // The contract does not, and its strict record refuses the unknown field.
    const res = await post(contractServer.app, 'calendar.events.create', body, WRITER_TOKEN)
    expect(res.status).toBe(400)
    expect(await errorBody(res)).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Operation input failed validation.',
        details: {
          issues: [
            { path: [], code: 'unrecognized_keys', message: 'Unrecognized key: "password"' },
          ],
        },
      },
    })
    expect(contractServer.executor.requests).toHaveLength(0)
  })

  it('reports a wrongly typed field at its path', async () => {
    const { app, executor } = createTestServer({ manifests: [], register: registerCalendar })

    const res = await post(app, 'calendar.events.create', { summary: 42 }, WRITER_TOKEN)

    expect(res.status).toBe(400)
    const body = await errorBody(res)
    expect(body.error.code).toBe('VALIDATION_FAILED')
    expect(body.error.details).toMatchObject({ issues: [{ path: ['summary'] }] })
    expect(executor.requests).toHaveLength(0)
  })

  it('dispatches a valid call with the contract descriptor plans', async () => {
    // The result conforms to the event record, which the runtime checks (D11).
    const { app, executor } = createTestServer({
      manifests: [],
      register: registerCalendar,
      executor: createRecordingExecutor(() => Promise.resolve({ uid: 'evt-1' })),
    })

    const res = await post(app, 'calendar.events.create', { summary: 'Standup' }, WRITER_TOKEN)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ result: { uid: 'evt-1' } })
    expect(executor.requests).toHaveLength(1)
    expect(executor.requests[0]).toMatchObject({
      target: { command: 'create', resource: 'Event' },
      input: { summary: 'Standup' },
      inputPlan: createEvent.input.plan,
      outputPlan: createEvent.output.plan,
    })
  })

  it('denies a missing permission with the same envelope as a manifest-registered app', async () => {
    const contractServer = createTestServer({ manifests: [], register: registerCalendar })
    const manifestServer = createTestServer({ manifests: [CALENDAR_MANIFEST] })
    const body = { summary: 'Standup' }

    const fromContract = await post(
      contractServer.app,
      'calendar.events.create',
      body,
      READER_TOKEN
    )
    const fromManifest = await post(
      manifestServer.app,
      'calendar.events.create',
      body,
      READER_TOKEN
    )

    expect(fromContract.status).toBe(403)
    expect(fromManifest.status).toBe(403)
    const contractBody = await errorBody(fromContract)
    expect(contractBody).toEqual(await errorBody(fromManifest))
    expect(contractBody.error.code).toBe('PERMISSION_DENIED')
    expect(contractBody.error.details).toMatchObject({ required: 'calendar:events:create' })
    expect(contractServer.executor.requests).toHaveLength(0)
  })

  it('routes only the operations the contract covers', async () => {
    const { app } = createTestServer({ manifests: [], register: registerCalendar })

    // `calendar.events.list` exists in the manifest but not in the contract.
    const res = await post(app, 'calendar.events.list', {}, WRITER_TOKEN)

    expect(res.status).toBe(404)
  })

  it('lists contract-registered and manifest-registered apps alike', async () => {
    const { app } = createTestServer({ manifests: [NOTES_MANIFEST], register: registerCalendar })

    const health = (await (await app.request('/health')).json()) as { apps: string[] }
    const info = (await (await app.request('/api/v1')).json()) as {
      apps: { name: string; bundleId: string }[]
    }

    expect(health.apps).toEqual(['Notes', 'Calendar'])
    expect(info.apps).toEqual([
      { name: 'Notes', bundleId: 'com.apple.Notes' },
      { name: 'Calendar', bundleId: 'com.apple.iCal' },
    ])
  })

  it('fails construction when a registration the callback does not catch is refused', () => {
    const mismatched = calendarContract({ ...createEvent, permission: 'calendar:events:list' })

    expect(() =>
      createMultiServer([], {
        governance: { policy: { version: '1', defaultDisposition: 'allowed', apps: [], tags: [] } },
        register: (registrar) => {
          registrar.registerContract(mismatched, CALENDAR_MANIFEST)
        },
      })
    ).toThrow(OperationRegistrationError)
  })
})
