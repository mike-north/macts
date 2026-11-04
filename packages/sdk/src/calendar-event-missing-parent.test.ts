/**
 * Calendar event update and delete under a calendar that does not exist,
 * through the local client, with the real generated Calendar contract and the
 * real native executor.
 *
 * Calendar's manifest records Calendar as the parent of `updateEvent` and
 * `deleteEvent`, carried by `calendarId`, and finds a calendar by its name
 * (phases/13 D10, command parents). An operation whose parent is missing fails
 * as a missing object that names the parent's resource, never the operation's
 * own (phases/13 D6), and nothing under any calendar is written or deleted.
 * An event missing from a calendar that exists names Event instead.
 *
 * Each case runs with only the executor's transport replaced: the composed
 * script is evaluated against a stand-in Calendar in an isolated context, so
 * the body, input and output plans and the codec are the shipped ones. The
 * stand-in records every calendar and event lookup it serves and every write
 * or delete made to one of its events.
 *
 * @see ../../../manifests/calendar/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D6, D10)
 */

import { afterAll, describe, expect, it, vi } from 'vitest'
import { createNativeExecutor } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import { TargetNotFoundError } from '@macts/contracts'
import { calendarContract } from '@macts/calendar/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-calendar-missing-parent-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

setLogger(createLogger({ level: 'silent' }))

afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(mactsHome, { recursive: true, force: true })
})

/** What a call rejected with; fails if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to reject')
}

/** The `details` of a `TargetNotFoundError`; fails for any other error. */
function missingResourceOf(error: unknown): unknown {
  expect(error).toBeInstanceOf(TargetNotFoundError)
  return error instanceof TargetNotFoundError ? error.details : undefined
}

/** When the stand-in event starts and ends; fixed instants. */
const START = new Date('2024-01-15T10:00:00.000Z')
const END = new Date('2024-01-15T11:00:00.000Z')

/** The one calendar the stand-in holds, by name, and the one event in it, by uid. */
const CALENDAR = 'Work'
const EVENT = 'E1'

/**
 * The native property record of the stand-in event: every event property the
 * contract declares, keyed by the app's name for it.
 */
function eventRecord(summary: string): Record<string, unknown> {
  return {
    summary,
    description: null,
    location: null,
    startDate: START,
    endDate: END,
    alldayEvent: false,
    recurrence: null,
    status: 'confirmed',
    sequence: 0,
    stampDate: null,
    excludedDates: [],
    uid: EVENT,
    url: null,
  }
}

/**
 * The stand-in event: its record, and every write or delete made to it
 * appended to `writes` as `set <property>` or `delete`.
 */
function standInEvent(writes: string[]): object {
  const record = eventRecord('Planning')
  return new Proxy(
    {
      exists: () => true,
      properties: () => record,
      delete: () => {
        writes.push('delete')
      },
    },
    {
      set(_target, key, value: unknown) {
        writes.push(`set ${String(key)}`)
        record[String(key)] = value
        return true
      },
    }
  )
}

/**
 * A stand-in Calendar holding one calendar, {@link CALENDAR}, with one event,
 * {@link EVENT}. A calendar is found by a name query and an event by its uid
 * within its calendar, as the manifest records; each lookup is appended to
 * `lookups`. A name or uid it does not hold gives a specifier that does not
 * exist and has nothing under it.
 */
function standInCalendar(lookups: string[], writes: string[]): object {
  const missing = { exists: () => false }
  const event = standInEvent(writes)
  const calendar = {
    exists: () => true,
    events: {
      byId(id: unknown) {
        lookups.push(`calendars[${CALENDAR}].events.byId(${String(id)})`)
        return id === EVENT ? event : missing
      },
    },
  }
  return {
    calendars: {
      whose(query: Readonly<Record<string, unknown>>) {
        lookups.push(`calendars.whose(name: ${String(query['name'])})`)
        return [query['name'] === CALENDAR ? calendar : missing]
      },
    },
  }
}

/** A local Calendar client over the stand-in, allowed to update and delete events. */
async function calendarClient(lookups: string[], writes: string[]) {
  const key = await createApiKey({
    name: 'Calendar missing parent test',
    permissions: ['calendar:events:update', 'calendar:events:delete'],
  })
  return createClient(calendarContract, {
    token: key.token,
    governance: { policy: ALLOW_ALL_POLICY },
    executor: createNativeExecutor({
      transport: standInTransport(standInCalendar(lookups, writes)),
    }),
  })
}

describe('Calendar event update, within its calendar through the local client', () => {
  it('updates the event in the calendar it names', async () => {
    const lookups: string[] = []
    const writes: string[] = []
    const client = await calendarClient(lookups, writes)
    const updated = await client.events.update(CALENDAR, EVENT, { summary: 'Review' })
    expect(updated).toMatchObject({ uid: EVENT, summary: 'Review', startDate: START })
    expect(lookups).toEqual([
      `calendars.whose(name: ${CALENDAR})`,
      `calendars[${CALENDAR}].events.byId(${EVENT})`,
    ])
    expect(writes).toEqual(['set summary'])
  })

  it('fails with TargetNotFoundError naming Calendar when the calendar is missing, and writes nothing', async () => {
    const lookups: string[] = []
    const writes: string[] = []
    const client = await calendarClient(lookups, writes)
    const error = await rejectionOf(client.events.update('Nope', EVENT, { summary: 'Review' }))
    expect(missingResourceOf(error)).toEqual({ resource: 'Calendar' })
    // No event is looked up in a calendar that does not exist.
    expect(lookups).toEqual(['calendars.whose(name: Nope)'])
    expect(writes).toEqual([])
  })

  it('fails with TargetNotFoundError naming Event for an event its calendar does not have', async () => {
    const writes: string[] = []
    const client = await calendarClient([], writes)
    const error = await rejectionOf(client.events.update(CALENDAR, 'E9', { summary: 'Review' }))
    expect(missingResourceOf(error)).toEqual({ resource: 'Event' })
    expect(writes).toEqual([])
  })
})

describe('Calendar event delete, within its calendar through the local client', () => {
  it('deletes the event in the calendar it names', async () => {
    const lookups: string[] = []
    const writes: string[] = []
    const client = await calendarClient(lookups, writes)
    await expect(client.events.delete(CALENDAR, EVENT)).resolves.toBeUndefined()
    expect(lookups).toEqual([
      `calendars.whose(name: ${CALENDAR})`,
      `calendars[${CALENDAR}].events.byId(${EVENT})`,
    ])
    expect(writes).toEqual(['delete'])
  })

  it('fails with TargetNotFoundError naming Calendar when the calendar is missing, and deletes nothing', async () => {
    const lookups: string[] = []
    const writes: string[] = []
    const client = await calendarClient(lookups, writes)
    const error = await rejectionOf(client.events.delete('Nope', EVENT))
    expect(missingResourceOf(error)).toEqual({ resource: 'Calendar' })
    expect(lookups).toEqual(['calendars.whose(name: Nope)'])
    expect(writes).toEqual([])
  })

  it('fails with TargetNotFoundError naming Event for an event its calendar does not have', async () => {
    const writes: string[] = []
    const client = await calendarClient([], writes)
    const error = await rejectionOf(client.events.delete(CALENDAR, 'E9'))
    expect(missingResourceOf(error)).toEqual({ resource: 'Event' })
    expect(writes).toEqual([])
  })
})
