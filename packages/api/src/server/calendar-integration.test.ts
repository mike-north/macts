/**
 * Integration tests for Calendar.app via the macts API server.
 *
 * Requires macOS with Calendar.app running and automation permissions.
 * Gated behind MACTS_INTEGRATION=1 environment variable.
 *
 * Tests run sequentially within the suite because later tests depend
 * on resources created by earlier tests (e.g., events need a calendar).
 *
 * Safety: Only creates objects with the __macts_e2e_ prefix.
 * All test data is cleaned up in afterAll via a LIFO cleanup stack.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { loadManifest } from '@macts/core'
import {
  INTEGRATION,
  generateTestId,
  testName,
  startTestServer,
  rpcRequest,
  rpcResult,
  createCleanupStack,
  type TestServerContext,
} from './integration-helpers.js'

const TEST_ID = generateTestId()
const cleanup = createCleanupStack()

let ctx: TestServerContext

describe.runIf(INTEGRATION)('Calendar.app integration', () => {
  // Track created resource IDs for cleanup
  let testCalendarId: string
  let testEventId: string

  beforeAll(async () => {
    vi.resetModules()

    const manifest = await loadManifest(
      new URL('../../../../manifests/calendar/app.yaml', import.meta.url).pathname
    )

    ctx = await startTestServer(manifest, [
      'calendar:calendars:list',
      'calendar:calendars:get',
      'calendar:calendars:create',
      'calendar:calendars:delete',
      'calendar:calendars:reload',
      'calendar:events:list',
      'calendar:events:get',
      'calendar:events:create',
      'calendar:events:delete',
      'calendar:events:show',
      'calendar:app:switchView',
      'calendar:app:viewCalendar',
    ])
  }, 30_000)

  afterAll(async () => {
    // Cleanup stack is LIFO: last-pushed items (events) are deleted first,
    // then earlier items (calendars) — maintaining parent-child ordering.
    await cleanup.executeAll()

    // Safety sweep: delete any calendars matching our test prefix that
    // the cleanup stack may have missed (e.g., if a test created a resource
    // but failed before pushing its cleanup function).
    try {
      const calendars = await rpcResult<{ calendarIdentifier: string; name: string }[]>(
        ctx.app,
        ctx.apiKey,
        'calendar.calendars.list'
      )
      for (const cal of calendars) {
        if (cal.name.startsWith(`__macts_e2e_${TEST_ID}_`)) {
          try {
            await rpcResult(ctx.app, ctx.apiKey, 'calendar.calendars.delete', {
              calendarIdentifier: cal.calendarIdentifier,
            })
          } catch {
            // Best effort
          }
        }
      }
    } catch {
      // Safety sweep is non-critical
    }

    ctx.cleanup()
  })

  it('should create a test calendar', async () => {
    const calName = testName(TEST_ID, 'calendar')
    const result = await rpcResult<Record<string, unknown>>(
      ctx.app,
      ctx.apiKey,
      'calendar.calendars.create',
      { name: calName }
    )

    expect(result).toBeDefined()
    testCalendarId = result['calendarIdentifier'] as string
    expect(testCalendarId).toBeDefined()
    expect(typeof testCalendarId).toBe('string')

    // Push to LIFO cleanup stack — will be deleted after events
    cleanup.push(async () => {
      await rpcResult(ctx.app, ctx.apiKey, 'calendar.calendars.delete', {
        calendarIdentifier: testCalendarId,
      })
    })
  })

  it('should list calendars and include the test calendar', async () => {
    const calendars = await rpcResult<{ name: string; calendarIdentifier: string }[]>(
      ctx.app,
      ctx.apiKey,
      'calendar.calendars.list'
    )

    expect(Array.isArray(calendars)).toBe(true)
    const found = calendars.find((c) => c.calendarIdentifier === testCalendarId)
    expect(found).toBeDefined()
    expect(found?.name).toBe(testName(TEST_ID, 'calendar'))
  })

  it('should get the test calendar by ID', async () => {
    const calendar = await rpcResult<{
      name: string
      calendarIdentifier: string
      writable: boolean
    }>(ctx.app, ctx.apiKey, 'calendar.calendars.get', {
      calendarIdentifier: testCalendarId,
    })

    expect(calendar.calendarIdentifier).toBe(testCalendarId)
    expect(calendar.name).toBe(testName(TEST_ID, 'calendar'))
    expect(calendar.writable).toBe(true)
  })

  it('should create an event in the test calendar', async () => {
    const now = new Date()
    const later = new Date(now.getTime() + 60 * 60 * 1000) // +1 hour

    const result = await rpcResult<Record<string, unknown>>(
      ctx.app,
      ctx.apiKey,
      'calendar.events.create',
      {
        calendarId: testCalendarId,
        summary: testName(TEST_ID, 'event'),
        startDate: now.toISOString(),
        endDate: later.toISOString(),
      }
    )

    expect(result).toBeDefined()
    testEventId = result['uid'] as string
    expect(testEventId).toBeDefined()
    expect(typeof testEventId).toBe('string')

    // Push to LIFO cleanup stack — will be deleted before the calendar
    cleanup.push(async () => {
      await rpcResult(ctx.app, ctx.apiKey, 'calendar.events.delete', {
        uid: testEventId,
      })
    })
  })

  it('should list events and include the test event', async () => {
    const events = await rpcResult<{ uid: string; summary: string }[]>(
      ctx.app,
      ctx.apiKey,
      'calendar.events.list',
      { calendarId: testCalendarId }
    )

    expect(Array.isArray(events)).toBe(true)
    const found = events.find((e) => e.uid === testEventId)
    expect(found).toBeDefined()
    expect(found?.summary).toBe(testName(TEST_ID, 'event'))
  })

  it('should get the event by ID', async () => {
    const event = await rpcResult<{ uid: string; summary: string }>(
      ctx.app,
      ctx.apiKey,
      'calendar.events.get',
      { uid: testEventId }
    )

    expect(event.uid).toBe(testEventId)
    expect(event.summary).toBe(testName(TEST_ID, 'event'))
  })

  it('should delete the event', async () => {
    await rpcResult(ctx.app, ctx.apiKey, 'calendar.events.delete', {
      uid: testEventId,
    })

    // Verify the event is no longer in the list
    const events = await rpcResult<{ uid: string }[]>(ctx.app, ctx.apiKey, 'calendar.events.list', {
      calendarId: testCalendarId,
    })
    const found = events.find((e) => e.uid === testEventId)
    expect(found).toBeUndefined()

    // Verify get-by-ID also fails for the deleted event
    await expect(
      rpcResult(ctx.app, ctx.apiKey, 'calendar.events.get', { uid: testEventId })
    ).rejects.toThrow()
  })

  it('should reload calendars without error (smoke)', async () => {
    await rpcResult(ctx.app, ctx.apiKey, 'calendar.app.reloadCalendars')
  })

  it('should switch view without error (smoke)', async () => {
    await rpcResult(ctx.app, ctx.apiKey, 'calendar.app.switchView', {
      to: 'weekView',
    })
  })

  // --- Negative tests ---

  it('should reject get with a non-existent calendar ID', async () => {
    await expect(
      rpcResult(ctx.app, ctx.apiKey, 'calendar.calendars.get', {
        calendarIdentifier: 'nonexistent-calendar-id-12345',
      })
    ).rejects.toThrow(/Command execution failed/)
  })

  it('should reject create event with missing required fields', async () => {
    const res = await rpcRequest(ctx.app, ctx.apiKey, 'calendar.events.create', {
      // Missing calendarId, summary, startDate, endDate
    })
    expect(res.status).toBe(400)
  })

  it('should handle unicode calendar names', async () => {
    const calName = testName(TEST_ID, '日本語カレンダー')
    const result = await rpcResult<Record<string, unknown>>(
      ctx.app,
      ctx.apiKey,
      'calendar.calendars.create',
      { name: calName }
    )

    const createdId = result['calendarIdentifier'] as string
    expect(createdId).toBeDefined()

    // Push cleanup
    cleanup.push(async () => {
      await rpcResult(ctx.app, ctx.apiKey, 'calendar.calendars.delete', {
        calendarIdentifier: createdId,
      })
    })

    // Verify it can be listed
    const calendars = await rpcResult<{ name: string; calendarIdentifier: string }[]>(
      ctx.app,
      ctx.apiKey,
      'calendar.calendars.list'
    )
    const found = calendars.find((c) => c.calendarIdentifier === createdId)
    expect(found).toBeDefined()
    expect(found?.name).toBe(calName)

    // Verify it can be retrieved by ID
    const fetched = await rpcResult<{ name: string; calendarIdentifier: string }>(
      ctx.app,
      ctx.apiKey,
      'calendar.calendars.get',
      { calendarIdentifier: createdId }
    )
    expect(fetched.name).toBe(calName)
  })

  it('should handle long calendar names', async () => {
    const longSuffix = 'a'.repeat(500)
    const calName = testName(TEST_ID, longSuffix)
    const result = await rpcResult<Record<string, unknown>>(
      ctx.app,
      ctx.apiKey,
      'calendar.calendars.create',
      { name: calName }
    )

    const createdId = result['calendarIdentifier'] as string
    expect(createdId).toBeDefined()

    cleanup.push(async () => {
      await rpcResult(ctx.app, ctx.apiKey, 'calendar.calendars.delete', {
        calendarIdentifier: createdId,
      })
    })
  })

  it('should reject create event with invalid date format', async () => {
    await expect(
      rpcResult(ctx.app, ctx.apiKey, 'calendar.events.create', {
        calendarId: testCalendarId,
        summary: testName(TEST_ID, 'bad-date'),
        startDate: 'not-a-date',
        endDate: 'also-not-a-date',
      })
    ).rejects.toThrow(/Command execution failed/)
  })

  it('should handle concurrent event creates', async () => {
    // Create a fresh calendar for concurrency test
    const calName = testName(TEST_ID, 'concurrent')
    const calResult = await rpcResult<Record<string, unknown>>(
      ctx.app,
      ctx.apiKey,
      'calendar.calendars.create',
      { name: calName }
    )
    const concurrentCalId = calResult['calendarIdentifier'] as string

    cleanup.push(async () => {
      await rpcResult(ctx.app, ctx.apiKey, 'calendar.calendars.delete', {
        calendarIdentifier: concurrentCalId,
      })
    })

    const now = new Date()
    const later = new Date(now.getTime() + 60 * 60 * 1000)

    // Create 3 events simultaneously
    const creates = await Promise.all(
      [1, 2, 3].map((i) =>
        rpcResult<Record<string, unknown>>(ctx.app, ctx.apiKey, 'calendar.events.create', {
          calendarId: concurrentCalId,
          summary: testName(TEST_ID, `concurrent-${String(i)}`),
          startDate: now.toISOString(),
          endDate: later.toISOString(),
        })
      )
    )

    // All should succeed and have unique UIDs
    const uids = creates.map((r) => r['uid'] as string)
    expect(uids).toHaveLength(3)
    expect(new Set(uids).size).toBe(3)

    // Push cleanup for all events
    for (const uid of uids) {
      cleanup.push(async () => {
        await rpcResult(ctx.app, ctx.apiKey, 'calendar.events.delete', { uid })
      })
    }

    // Verify all appear in list
    const events = await rpcResult<{ uid: string }[]>(
      ctx.app,
      ctx.apiKey,
      'calendar.events.list',
      { calendarId: concurrentCalId }
    )
    for (const uid of uids) {
      expect(events.find((e) => e.uid === uid)).toBeDefined()
    }
  })
})
