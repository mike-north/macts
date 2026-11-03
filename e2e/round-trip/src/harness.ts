/**
 * E2E round-trip harness — abstract interface for create→list→delete cycles.
 *
 * The harness decouples the test assertions (what must hold) from the HTTP
 * transport (what talks to the real server). That lets the unit tests in
 * `test/harness.test.ts` drive the harness with a deterministic fake client
 * and verify the invariants without a live server.
 *
 * The live tests in `test/local/` swap in the real `@macts/calendar`
 * `CalendarClient` against the running macts server.
 *
 * @packageDocumentation
 */

/**
 * A minimal view of a Calendar returned by `calendars.list()`.
 *
 * The harness only needs the fields that the round-trip test exercises;
 * extra fields from the real API are ignored by TypeScript's structural
 * typing.
 */
export interface CalendarSummary {
  readonly id?: string | undefined
  readonly name: string
  readonly writable: boolean
}

/**
 * A minimal view of an Event returned by `events.create()` and used to
 * identify the event in `events.list()`.
 */
export interface EventSummary {
  /** Canonical identifier — may be absent if the server does not populate it yet. */
  readonly id?: string | undefined
  /** Event title. */
  readonly summary: string
}

/**
 * Input for creating a test event.
 *
 * `startDate` and `endDate` are `Date` objects, matching `@macts/calendar`'s
 * `EventCreateInput`. The harness constructs them from fixed constants so that
 * test data stays deterministic (no `new Date()` at call-site).
 */
export interface CreateEventInput {
  readonly calendarId: string
  readonly summary: string
  readonly startDate: Date
  readonly endDate: Date
}

/** The paging arguments of a list call: the cursor of the page to read. */
export interface PageArguments {
  readonly cursor?: string
}

/**
 * One page of a list call: its items, and the cursor of the next page when
 * more remain.
 */
export interface ListPage<T> {
  readonly items: readonly T[]
  readonly nextCursor?: string
}

/**
 * A stripped-down view of the Calendar SDK surface the harness uses.
 *
 * Both the real `CalendarClient` and the fake client in unit tests satisfy
 * this interface. Every list returns one page.
 */
export interface CalendarClientFacade {
  readonly calendars: {
    list(page?: PageArguments): Promise<ListPage<CalendarSummary>>
  }
  readonly events: {
    list(calendarId: string, page?: PageArguments): Promise<ListPage<EventSummary>>
    create(input: CreateEventInput): Promise<EventSummary>
  }
}

/**
 * The first item of a paged listing that satisfies `test`, reading pages
 * only until it is found; `undefined` when no item in the whole listing does.
 */
async function findInPages<T>(
  read: (page: PageArguments) => Promise<ListPage<T>>,
  test: (item: T) => boolean
): Promise<T | undefined> {
  let cursor: string | undefined
  do {
    const page = await read(cursor === undefined ? {} : { cursor })
    const found = page.items.find(test)
    if (found !== undefined) return found
    cursor = page.nextCursor
  } while (cursor !== undefined)
  return undefined
}

/**
 * Result of a single round-trip run.
 */
export interface RoundTripResult {
  /** The calendar used for the test. */
  readonly calendarId: string
  readonly calendarName: string
  /** The event that was created. */
  readonly createdEventSummary: string
  /** Whether the created event appeared in the subsequent list. */
  readonly appearedInList: boolean
  /**
   * Whether cleanup was attempted.
   * The delete path is not yet exposed by the generated Calendar SDK (#84),
   * so this is `false` for the initial implementation and will become `true`
   * once `events.delete()` is added.
   */
  readonly cleanupAttempted: boolean
}

/**
 * Run the Calendar create→list round-trip against the supplied client.
 *
 * 1. Lists calendars and selects a writable one; falls back to the first
 *    calendar if none are marked writable.
 * 2. Creates a test event in that calendar.
 * 3. Lists events in the calendar, following each page's cursor, and asserts
 *    the created event appears.
 * 4. Records cleanup status (delete not yet in the SDK — tracked in #84).
 *
 * Throws if:
 * - `calendars.list()` returns no calendars at all.
 * - The selected calendar has no `id` (the regression guard for #30/#81).
 * - `events.create()` throws (server error, identifier mismatch, etc.).
 * - The created event does not appear in the follow-up list.
 *
 * @param client - Either the real `CalendarClient` or a fake for unit tests.
 * @param eventSummary - Title to give the test event (default: tag is included
 *   so cleanup is easy in Calendar.app if the delete path fails).
 */
export async function runCalendarRoundTrip(
  client: CalendarClientFacade,
  eventSummary = '[macts-e2e] round-trip gate test event'
): Promise<RoundTripResult> {
  // 1. Pick a writable calendar, from any page; otherwise the first calendar.
  const target =
    (await findInPages(
      (page) => client.calendars.list(page),
      (c) => c.writable
    )) ?? (await client.calendars.list()).items[0]

  if (!target) {
    throw new Error('FAIL: calendars.list() returned no calendars — is Calendar.app signed in?')
  }

  const calendarId = target.id
  if (!calendarId) {
    // This is the invariant that #30 and #81 broke: the list executor must
    // populate the canonical `id` field (mapped from `calendarIdentifier`).
    // Without it, create cannot be called, and this test fails — which is the
    // exact regression guard this suite exists to provide.
    throw new Error(
      'FAIL: calendars.list() returned a calendar with no `id`. ' +
        'The list executor did not populate the manifest identifier. ' +
        'This is the bug caught by #30 / #81 — the structured path is broken. ' +
        'See packages/calendar/src/resources/calendar.ts and the calendar manifest.'
    )
  }

  // 2. Create a test event.
  // Fixed dates (deterministic — no new Date() in test data per testing rules).
  const startDate = new Date('2099-12-31T10:00:00.000Z')
  const endDate = new Date('2099-12-31T11:00:00.000Z')

  const created = await client.events.create({
    calendarId,
    summary: eventSummary,
    startDate,
    endDate,
  })

  // 3. List events, page by page, and verify the created event appears.
  const appearedInList =
    (await findInPages(
      (page) => client.events.list(calendarId, page),
      (e) => e.summary === eventSummary
    )) !== undefined

  if (!appearedInList) {
    throw new Error(
      `FAIL: event "${eventSummary}" was created (id=${created.id ?? 'unknown'}) ` +
        'but did not appear in the subsequent events.list() call. ' +
        'The create succeeded but list is not returning the new event.'
    )
  }

  // 4. Cleanup note: events.delete() is not yet exposed by the generated SDK.
  // Until it is, the operator must remove the test event from Calendar.app
  // manually. The event summary starts with "[macts-e2e]" to make it easy to
  // spot. Tracked in issue #84.

  return {
    calendarId,
    calendarName: target.name,
    createdEventSummary: eventSummary,
    appearedInList,
    cleanupAttempted: false,
  }
}
