/**
 * Unit tests for the E2E round-trip harness logic.
 *
 * These tests run in CI against a deterministic fake client — no live server,
 * no Calendar.app, no API key required.
 *
 * The fake client exercises the exact same harness logic that runs against the
 * real CalendarClient in test/local/. If the harness changes, these tests
 * catch it before the live test is run.
 */

import { describe, expect, it } from 'vitest'
import type { CalendarClientFacade, CalendarSummary, EventSummary } from '../src/harness.js'
import { runCalendarRoundTrip } from '../src/harness.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClient(options: {
  calendars: CalendarSummary[]
  events?: EventSummary[]
  createResult?: EventSummary
  createThrows?: Error
}): CalendarClientFacade {
  const { events = [], createResult, createThrows } = options

  return {
    calendars: {
      list() {
        return Promise.resolve(options.calendars)
      },
    },
    events: {
      list(_calendarId: string) {
        return Promise.resolve(events)
      },
      create(_input) {
        if (createThrows) return Promise.reject(createThrows)
        return Promise.resolve(createResult ?? { summary: _input.summary })
      },
    },
  }
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('runCalendarRoundTrip', () => {
  it('returns a result with appearedInList=true when the created event shows up in list', async () => {
    const SUMMARY = '[macts-e2e] round-trip gate test event'
    const client = makeClient({
      calendars: [{ id: 'cal-1', name: 'Work', writable: true }],
      events: [{ id: 'evt-1', summary: SUMMARY }],
      createResult: { id: 'evt-1', summary: SUMMARY },
    })

    const result = await runCalendarRoundTrip(client)

    expect(result.appearedInList).toBe(true)
    expect(result.calendarId).toBe('cal-1')
    expect(result.calendarName).toBe('Work')
    expect(result.createdEventSummary).toBe(SUMMARY)
    expect(result.cleanupAttempted).toBe(false)
  })

  it('uses a custom eventSummary when provided', async () => {
    const CUSTOM = 'my-custom-test-event'
    const client = makeClient({
      calendars: [{ id: 'cal-2', name: 'Personal', writable: true }],
      events: [{ summary: CUSTOM }],
      createResult: { summary: CUSTOM },
    })

    const result = await runCalendarRoundTrip(client, CUSTOM)

    expect(result.createdEventSummary).toBe(CUSTOM)
    expect(result.appearedInList).toBe(true)
  })

  it('picks the first calendar when no writable calendar exists', async () => {
    // Non-writable calendar but has an id — the harness should still proceed.
    const client = makeClient({
      calendars: [{ id: 'cal-ro', name: 'Holidays', writable: false }],
      events: [{ summary: '[macts-e2e] round-trip gate test event' }],
      createResult: { summary: '[macts-e2e] round-trip gate test event' },
    })

    const result = await runCalendarRoundTrip(client)

    expect(result.calendarId).toBe('cal-ro')
    expect(result.appearedInList).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Failure paths (regression guards — these are the exact invariants #30/#81 broke)
// ---------------------------------------------------------------------------

describe('runCalendarRoundTrip failure cases', () => {
  it('throws when calendars.list() returns no calendars', async () => {
    const client = makeClient({ calendars: [] })

    await expect(runCalendarRoundTrip(client)).rejects.toThrow(
      'calendars.list() returned no calendars'
    )
  })

  it('throws when the calendar has no id (regression guard for #30/#81: missing identifier)', async () => {
    // This is the exact bug: list returns calendars but their `id` is absent
    // because the list executor did not populate the manifest identifier.
    const client = makeClient({
      calendars: [{ name: 'Work', writable: true }], // no id!
      events: [],
      createResult: { summary: '[macts-e2e] round-trip gate test event' },
    })

    await expect(runCalendarRoundTrip(client)).rejects.toThrow(
      'calendars.list() returned a calendar with no `id`'
    )
  })

  it('re-throws when events.create() throws (server error, identifier mismatch, etc.)', async () => {
    const createError = new Error('VALIDATION_ERROR: calendarId not found')
    const client = makeClient({
      calendars: [{ id: 'cal-1', name: 'Work', writable: true }],
      events: [],
      createThrows: createError,
    })

    await expect(runCalendarRoundTrip(client)).rejects.toThrow(
      'VALIDATION_ERROR: calendarId not found'
    )
  })

  it('throws when the created event does not appear in events.list()', async () => {
    // Create succeeds but the follow-up list is empty — the event did not land.
    const client = makeClient({
      calendars: [{ id: 'cal-1', name: 'Work', writable: true }],
      events: [], // list returns nothing
      createResult: { id: 'evt-1', summary: '[macts-e2e] round-trip gate test event' },
    })

    await expect(runCalendarRoundTrip(client)).rejects.toThrow(
      'did not appear in the subsequent events.list() call'
    )
  })

  it('prefers writable calendar over non-writable ones', async () => {
    // First calendar is non-writable; second is writable — harness must pick the writable one.
    const client = makeClient({
      calendars: [
        { id: 'cal-ro', name: 'Holidays', writable: false },
        { id: 'cal-rw', name: 'Work', writable: true },
      ],
      events: [{ summary: '[macts-e2e] round-trip gate test event' }],
      createResult: { summary: '[macts-e2e] round-trip gate test event' },
    })

    const result = await runCalendarRoundTrip(client)

    // Must have picked the writable one.
    expect(result.calendarId).toBe('cal-rw')
  })
})
