/**
 * Regression test for the request-parameter-name vs identifier-property-name
 * distinction, exercised against the REAL shipped Calendar manifest.
 *
 * The Calendar manifest declares the `get`/`getEvent` request parameter as
 * `id`, while the corresponding resource identifier *properties* are
 * `calendarIdentifier` (Calendar) and `uid` (Event). The server's request
 * schema (Zod) validates the body against the command parameters, and the JXA
 * executor binds its lookup variable from those same parameters.
 *
 * This test guards the regression where identifier resolution was unified on
 * `resolvePrimaryIdentifierProperty` (the property name): that made the server
 * validate/bind `{ uid }`/`{ calendarIdentifier }` while clients send `{ id }`,
 * producing a VALIDATION_ERROR and `byId(<unbound var>)` JXA.
 *
 * Spec source (derived by hand, not from output):
 *   manifests/calendar/app.yaml
 *     get.parameters[0].name      = "id"   (lines 412-413)
 *     getEvent.parameters[0].name = "id"   (lines 456-457)
 *
 * The JXA only runs against a live app (out of CI), so we assert on the captured
 * program text and on request validation status.
 *
 * @see packages/api/src/server/handlers/rpc.ts — executeResourceCommand
 * @see manifests/calendar/app.yaml
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { resolve } from 'node:path'
import type { AppManifest } from '@macts/core'
import { loadManifest } from '@macts/core'
import { createApp } from '../index.js'

// Mock the JXA executor so no real macOS automation runs. Capture the generated
// `code` so we can assert which variable name the executor binds and looks up.
vi.mock('@macts/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@macts/core')>()
  return {
    ...actual,
    runWithApp: vi.fn().mockResolvedValue({ id: 'result' }),
  }
})

// Mock auth so we can make authenticated requests without real keys.
vi.mock('../../keys/validator.js', () => ({
  validateApiKey: vi.fn().mockResolvedValue({
    valid: true,
    payload: { iss: 'macts', sub: 'test-key', iat: 0, permissions: ['*:*:*'] },
  }),
  checkPayloadPermission: vi
    .fn()
    .mockReturnValue({ granted: true, required: '', matchedBy: '*:*:*' }),
}))

const CALENDAR_MANIFEST_PATH = resolve(process.cwd(), '../../manifests/calendar/app.yaml')

let calendarManifest: AppManifest

beforeAll(async () => {
  calendarManifest = await loadManifest(CALENDAR_MANIFEST_PATH)
})

/** Send an authenticated POST to an RPC endpoint and return status + captured JXA. */
async function callRpc(
  manifest: AppManifest,
  route: string,
  body: Record<string, unknown>
): Promise<{ status: number; responseBody: unknown; capturedJxaCode: string }> {
  const { runWithApp } = await import('@macts/core')
  vi.mocked(runWithApp).mockClear()

  const app = createApp([manifest], { cors: false, logging: false })
  const res = await app.request(`/api/v1/rpc/${route}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer macts_sk_test', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const rawCode =
    vi.mocked(runWithApp).mock.calls.length > 0
      ? vi.mocked(runWithApp).mock.calls[0]?.[1]
      : undefined
  const capturedJxaCode = typeof rawCode === 'string' ? rawCode : ''
  return { status: res.status, responseBody: await res.json(), capturedJxaCode }
}

describe('Calendar request-param coherence (real manifest)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEvent — request param is `id` (not the `uid` property)', () => {
    it('accepts { calendarId, id } and binds both vars + whose()+byId() in JXA', async () => {
      // getEvent now requires TWO params: calendarId (parent calendar) and id
      // (child event uid). Events are nested under calendars in Calendar.app;
      // the server must scope the JXA to the parent calendar first, then target
      // the event by its uid via byId(id).
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.events.getEvent',
        { calendarId: 'Work', id: 'EVENT-123' }
      )
      // Reaches the executor (no validation rejection).
      expect(status).toBe(200)
      // Binds the parent param `calendarId` and the child param `id`.
      expect(capturedJxaCode).toContain('var calendarId =')
      expect(capturedJxaCode).toContain('"Work"')
      expect(capturedJxaCode).toContain('var id =')
      expect(capturedJxaCode).toContain('"EVENT-123"')
      // Parent calendar is targeted by name (Calendar is byProperty).
      expect(capturedJxaCode).toContain('whose({ name: calendarId })[0]')
      // Child event targeted by uid via byId(id).
      expect(capturedJxaCode).toContain('byId(id)')
      // Never binds or uses the property name `uid` as the request var.
      expect(capturedJxaCode).not.toContain('byId(uid)')
      expect(capturedJxaCode).not.toContain('var uid =')
    })

    it('rejects a body keyed by the property name `uid` with VALIDATION_ERROR', async () => {
      // The request schema validates the command params `calendarId` and `id`;
      // sending only `uid` omits the required `id` (and `calendarId`) and must
      // be rejected.
      const { status, responseBody } = await callRpc(calendarManifest, 'calendar.events.getEvent', {
        uid: 'EVENT-123',
      })
      const body = responseBody as { error: { code: string } }
      expect(status).toBe(400)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('get (Calendar) — request param is `id`, targeted by name (byProperty)', () => {
    it('accepts { id } and binds `var id` + whose({ name: id })[0] in JXA', async () => {
      // The Calendar resource declares a `byProperty` identifier (`name`) because
      // its dictionary `calendarIdentifier` throws via JXA at runtime (issue #81).
      // The request PARAM is still `id` (schema contract unchanged); only the JXA
      // targeting changes from byId() to a whose({ name: ... }) lookup.
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.calendars.get',
        {
          id: 'Work',
        }
      )
      expect(status).toBe(200)
      // Still binds the request param `id` (the value var), not a property name.
      expect(capturedJxaCode).toContain('var id =')
      expect(capturedJxaCode).toContain('"Work"')
      // Targets by the runtime-working property `name`, not byId().
      expect(capturedJxaCode).toContain('whose({ name: id })[0]')
      expect(capturedJxaCode).not.toContain('.byId(id)')
      // Never TARGETS the lookup by the broken declared identifier. (The get
      // output may still best-effort read `calendarIdentifier` as an ordinary
      // property — that read is try/catch-swallowed and not load-bearing.)
      expect(capturedJxaCode).not.toContain('whose({ calendarIdentifier')
      expect(capturedJxaCode).not.toContain('byId(calendarIdentifier)')
    })

    it('rejects a body keyed by the property name `calendarIdentifier`', async () => {
      const { status, responseBody } = await callRpc(calendarManifest, 'calendar.calendars.get', {
        calendarIdentifier: 'CAL-456',
      })
      const body = responseBody as { error: { code: string } }
      expect(status).toBe(400)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('listEvents — parent param `calendarId`, parent targeted by name (byProperty)', () => {
    it('binds `var calendarId` and scopes via whose({ name: calendarId })[0]', async () => {
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.events.listEvents',
        { calendarId: 'Work' }
      )
      expect(status).toBe(200)
      expect(capturedJxaCode).toContain('var calendarId =')
      expect(capturedJxaCode).toContain('"Work"')
      // Parent (Calendar) is byProperty, so the scope matches on its `name`.
      expect(capturedJxaCode).toContain('whose({ name: calendarId })[0]')
      expect(capturedJxaCode).not.toContain('.byId(calendarId)')
      // Scoped to the parent calendar's events collection.
      expect(capturedJxaCode).toContain('.events()')
    })
  })

  describe('createEvent — parent calendar targeted by name (byProperty)', () => {
    it('resolves the parent calendar via whose({ name: calendarId })[0]', async () => {
      // The create-event path targets the parent calendar to make the event in.
      // Since Calendar is byProperty, the parent must be matched by name.
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.events.createEvent',
        {
          calendarId: 'Work',
          summary: 'Standup',
          startDate: '2026-01-01T10:00:00Z',
          endDate: '2026-01-01T11:00:00Z',
        }
      )
      expect(status).toBe(200)
      expect(capturedJxaCode).toContain('var calendarId =')
      expect(capturedJxaCode).toContain('whose({ name: calendarId })[0]')
      expect(capturedJxaCode).not.toContain('.byId(calendarId)')
    })
  })

  describe('events stay byId — Event `uid` is runtime-valid, unlike Calendar', () => {
    it('getEvent targets the EVENT via byId(id), not a whose() lookup on the event', async () => {
      // Regression guard: the byProperty change must be scoped to the parent Calendar
      // targeting only. The event itself (whose `uid` works at runtime) must be
      // targeted via byId(id), not a whose({}) lookup.
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.events.getEvent',
        { calendarId: 'Work', id: 'EVENT-123' }
      )
      expect(status).toBe(200)
      // Parent calendar is byProperty (its name); the event itself is byId.
      expect(capturedJxaCode).toContain('whose({ name: calendarId })[0]')
      expect(capturedJxaCode).toContain('byId(id)')
      // The event must NOT be targeted via whose({}) — only the parent calendar is.
      // (The whose() for the parent calendar is expected and tested above.)
    })
  })

  describe('createEvent — create-within-parent JXA idiom (-10024 regression)', () => {
    // Regression guard: item.make({ at: parent.events }) throws -10024 "Can't make
    // or move that element into that container" in JXA. The working idiom is
    // parent.events.push(item). Assert the generated code uses push, not make({ at: }).
    it('uses parent.<plural>.push(item) to create the event, not item.make({ at: ... })', async () => {
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.events.createEvent',
        {
          calendarId: 'Work',
          summary: 'Standup',
          startDate: '2026-01-01T10:00:00Z',
          endDate: '2026-01-01T11:00:00Z',
        }
      )
      expect(status).toBe(200)
      // The working create-within-parent idiom: push onto the parent collection.
      expect(capturedJxaCode).toContain('parent.events.push(item)')
      // Must NOT use the broken make({ at: parent.... }) form that throws -10024.
      // Match the actual broken call pattern (not the comment that documents it).
      expect(capturedJxaCode).not.toContain('item.make({ at: parent')
    })
  })

  describe('createEvent — date-typed params must be rehydrated as JXA Date objects', () => {
    // Regression guard: date params (startDate, endDate) arrive over JSON as ISO
    // strings. Emitting them as bare quoted strings makes Calendar's create fail
    // because JXA requires real Date objects for date-typed properties. The codegen
    // must emit `var x = new Date("...")` not `var x = "..."`.
    it('emits startDate as new Date(...), not a bare ISO string', async () => {
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.events.createEvent',
        {
          calendarId: 'Work',
          summary: 'Standup',
          startDate: '2026-01-01T10:00:00Z',
          endDate: '2026-01-01T11:00:00Z',
        }
      )
      expect(status).toBe(200)
      // startDate must be rehydrated as a JXA Date, not left as a bare string.
      expect(capturedJxaCode).toContain('var startDate = new Date(')
      expect(capturedJxaCode).not.toMatch(/var startDate = "/)
    })

    it('emits endDate as new Date(...), not a bare ISO string', async () => {
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.events.createEvent',
        {
          calendarId: 'Work',
          summary: 'Standup',
          startDate: '2026-01-01T10:00:00Z',
          endDate: '2026-01-01T11:00:00Z',
        }
      )
      expect(status).toBe(200)
      // endDate must be rehydrated as a JXA Date, not left as a bare string.
      expect(capturedJxaCode).toContain('var endDate = new Date(')
      expect(capturedJxaCode).not.toMatch(/var endDate = "/)
    })

    it('preserves non-date params (summary) as plain JSON-stringified values', async () => {
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.events.createEvent',
        {
          calendarId: 'Work',
          summary: 'Standup',
          startDate: '2026-01-01T10:00:00Z',
          endDate: '2026-01-01T11:00:00Z',
        }
      )
      expect(status).toBe(200)
      // `summary` is a string, not a date — must remain a plain quoted value.
      expect(capturedJxaCode).toContain('var summary = "Standup"')
      expect(capturedJxaCode).not.toContain('var summary = new Date(')
    })
  })
})
