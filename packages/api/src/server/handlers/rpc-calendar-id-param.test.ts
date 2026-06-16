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
    it('accepts { id } and binds `var id` + byId(id) in JXA', async () => {
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.events.getEvent',
        { id: 'EVENT-123' }
      )
      // Reaches the executor (no validation rejection).
      expect(status).toBe(200)
      // Binds the request param `id` and looks up by it — never the property `uid`.
      expect(capturedJxaCode).toContain('var id =')
      expect(capturedJxaCode).toContain('"EVENT-123"')
      expect(capturedJxaCode).toContain('byId(id)')
      expect(capturedJxaCode).not.toContain('byId(uid)')
      expect(capturedJxaCode).not.toContain('var uid =')
    })

    it('rejects a body keyed by the property name `uid` with VALIDATION_ERROR', async () => {
      // The request schema validates the command param `id`; sending `uid`
      // omits the required `id` and must be rejected. This is exactly what the
      // regression would have made the SDK do.
      const { status, responseBody } = await callRpc(calendarManifest, 'calendar.events.getEvent', {
        uid: 'EVENT-123',
      })
      const body = responseBody as { error: { code: string } }
      expect(status).toBe(400)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('get (Calendar) — request param is `id` (not the `calendarIdentifier` property)', () => {
    it('accepts { id } and binds `var id` + byId(id) in JXA', async () => {
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.calendars.get',
        {
          id: 'CAL-456',
        }
      )
      expect(status).toBe(200)
      expect(capturedJxaCode).toContain('var id =')
      expect(capturedJxaCode).toContain('"CAL-456"')
      expect(capturedJxaCode).toContain('byId(id)')
      expect(capturedJxaCode).not.toContain('byId(calendarIdentifier)')
      expect(capturedJxaCode).not.toContain('var calendarIdentifier =')
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

  describe('listEvents — parent param is `calendarId`, scoped JXA uses byId(calendarId)', () => {
    it('binds `var calendarId` and scopes the collection to the parent', async () => {
      const { status, capturedJxaCode } = await callRpc(
        calendarManifest,
        'calendar.events.listEvents',
        { calendarId: 'CAL-789' }
      )
      expect(status).toBe(200)
      expect(capturedJxaCode).toContain('var calendarId =')
      expect(capturedJxaCode).toContain('"CAL-789"')
      // Scoped to the parent calendar's events collection.
      expect(capturedJxaCode).toContain('byId(calendarId)')
      expect(capturedJxaCode).toContain('.events()')
    })
  })
})
