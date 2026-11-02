/**
 * Tests for the read-only nullability probe.
 *
 * The probe's automation-process body is executed for real, in an isolated
 * `node:vm` context, against fake app objects shaped like the automation
 * bridge's: a collection is an element specifier with a `length` and indexed
 * elements, and a property is a function returning its value (null for the
 * app's "missing value") or throwing. So these tests exercise the counting, the item cap, the deadline,
 * and the nested-hierarchy walk that run inside the app process, not a model
 * of them.
 *
 * Expected counts are derived by hand from each fixture.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (native missing value; per-field evidence)
 * @see https://github.com/mike-north/macts/issues/165 (the app's own spelling; unsupported markers)
 */

import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { loadManifest, parseManifestYaml } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import {
  APP_VERSION_BODY,
  HEAVY_PROPERTY_NAMES,
  MAX_CALL_MS,
  MAX_ITEMS_PER_COLLECTION,
  MAX_PARENT_VISITS,
  PARENT_SCAN_TIME_SHARE,
  PARENT_SPREAD,
  probeNullability,
  resolveAccessChain,
  type NullabilityProbeEnvironment,
} from './nullability.js'
import type { JxaRunner } from './probe.js'
import { mergeNullabilityObservations } from './nullability-merge.js'
import { isValueKind } from '../manifest/value-kinds.js'

// ---------------------------------------------------------------------------
// Fake app objects
// ---------------------------------------------------------------------------

/** Thrown by a fake property read, as the bridge throws for an app error. */
const THROWS = Symbol('throws')

/**
 * What a fake property read returns: a value (an object specifier is a
 * function, as in the bridge), null for the app's "missing value", or
 * {@link THROWS}.
 */
type FakeValue = string | number | boolean | null | object | typeof THROWS

/** Counts how many elements a fake collection handed out, and its length reads. */
interface IndexLog {
  indexed: number
  /** The indices handed out, in order. */
  readonly indices: number[]
  /** How many times the collection's `length` was read. */
  lengthReads: number
}

/**
 * A fake element specifier, shaped like the bridge's: `length` is the element
 * count and `[i]` is one element. It is deliberately not callable, so a probe
 * that calls it (building every element reference, as the bridge does) fails.
 *
 * @param length - The element count, or a function standing in for a
 *   `length` that misbehaves (throws, or is not a number).
 * @param at - The element at an index, made on demand.
 * @param onAccess - Called on every `length` read and element access, e.g. to
 *   advance a fake clock as a slow app would.
 */
function fakeCollection(
  length: number | (() => unknown),
  at: (index: number) => object,
  log: IndexLog = indexLog(),
  onAccess: (access: 'length' | 'index') => void = () => undefined
): object {
  return new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'length') {
          log.lengthReads++
          onAccess('length')
          return typeof length === 'number' ? length : length()
        }
        if (typeof key === 'string' && /^\d+$/.test(key)) {
          onAccess('index')
          log.indexed++
          log.indices.push(Number(key))
          return at(Number(key))
        }
        return undefined
      },
    }
  )
}

function indexLog(): IndexLog {
  return { indexed: 0, indices: [], lengthReads: 0 }
}

/**
 * The evenly spaced indices the probe must read from a collection of `n`
 * items with a quota of `quota`, by the sampling rule: `floor(k * n / m)` for
 * `k = 0..m-1`, `m = min(n, quota)`.
 */
function spreadIndices(n: number, quota: number): number[] {
  const m = Math.min(n, quota)
  return Array.from({ length: m }, (_, k) => Math.floor((k * n) / m))
}

/** A fake element specifier over a fixed list of elements. */
function elementsOf(elements: readonly object[]): object {
  return fakeCollection(elements.length, (index) => elements[index] ?? never())
}

/**
 * A fake app object: each property is an accessor, each collection an element
 * specifier (a list is wrapped with {@link elementsOf}).
 */
function item(
  properties: Readonly<Record<string, FakeValue>>,
  collections: Readonly<Record<string, readonly object[] | object>> = {}
): object {
  const object: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(properties)) {
    object[name] = () => {
      if (value === THROWS) throw new Error('AppleEvent handler failed.')
      return value
    }
  }
  for (const [name, elements] of Object.entries(collections)) {
    object[name] = Array.isArray(elements) ? elementsOf(elements) : elements
  }
  return object
}

/** A fake application with top-level collections. */
function fakeApp(collections: Readonly<Record<string, readonly object[] | object>>): object {
  return item({}, collections)
}

/** Values that must never leave the probe. */
const SECRET = 'SECRET-VALUE'

interface FakeRunnerOptions {
  readonly version?: string | null
  /** Milliseconds the fake in-process clock advances per `Date.now()` call. */
  readonly msPerTick?: number
  /** Reject calls whose body mentions this accessor. */
  readonly failOn?: string
  /** Called after each probe call, e.g. to advance the outer clock. */
  readonly afterCall?: () => void
  /**
   * A clock the fake app advances itself, read by the body's `Date.now()`
   * (with `msPerTick` added per call). Shared across calls when given.
   */
  readonly appClock?: { now: number }
}

interface FakeRunner {
  readonly runner: JxaRunner
  /** Every body the runner received. */
  readonly scripts: string[]
  /** Every value a probe body returned. */
  readonly returned: unknown[]
}

/** A runner that runs each body against `app` in an isolated context. */
function fakeRunner(app: object, options: FakeRunnerOptions = {}): FakeRunner {
  const scripts: string[] = []
  const returned: unknown[] = []
  const runner: JxaRunner = (bundleId, body) => {
    expect(bundleId).toBe('com.example.jotter')
    scripts.push(body)
    if (body === APP_VERSION_BODY) {
      return options.version === null
        ? Promise.reject(new Error('unavailable'))
        : Promise.resolve(options.version ?? '2.1')
    }
    if (options.failOn !== undefined && body.includes(JSON.stringify(options.failOn))) {
      return Promise.reject(Object.assign(new Error('timed out'), { killed: true }))
    }
    const appClock = options.appClock ?? { now: 1_000_000 }
    const tick = options.msPerTick ?? 0
    const clock = { now: () => (appClock.now += tick) }
    const value: unknown = runInNewContext(`(function (app) {${body}})(app)`, {
      app,
      Date: clock,
    })
    // What the automation process returns crosses as JSON.
    const crossed: unknown = JSON.parse(JSON.stringify(value))
    returned.push(crossed)
    options.afterCall?.()
    return Promise.resolve(crossed)
  }
  return { runner, scripts, returned }
}

/** An environment with fixed provenance and a controllable clock. */
function environment(clock: { now: number } = { now: 0 }): NullabilityProbeEnvironment {
  return {
    osVersion: () => Promise.resolve('27.2'),
    observedAt: () => '2026-10-31T12:00:00.000Z',
    clock: () => clock.now,
  }
}

// ---------------------------------------------------------------------------
// Fixture manifest
// ---------------------------------------------------------------------------

/**
 * Notes are top level; Events are nested under Calendars; Ghosts are in no
 * hierarchy and the app has no such collection.
 */
const MANIFEST: AppManifest = parseManifestYaml(`
version: '1.0'
app:
  bundleId: com.example.jotter
  name: Jotter
  tccEntitlements: []
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    identifiers:
      - property: uid
        primary: true
    properties:
      uid: { access: r, type: string, description: Id }
      title: { access: rw, type: string, description: Title }
      folder: { access: r, type: { resource: Calendar }, description: Folder }
      body: { access: rw, type: string, description: Body }
      attachment: { access: r, type: file, description: Attachment }
      scans: { access: r, type: { array: data }, description: Scans }
      secretive: { access: r, type: string, description: Excluded by the caller }
  Calendar:
    name: Calendar
    plural: Calendars
    description: A calendar
    properties:
      name: { access: r, type: string, description: Name }
      labels: { access: r, type: { array: string }, description: Labels }
      pinned: { access: r, type: { array: { resource: Note } }, description: Pinned notes }
      upcoming: { access: r, type: { array: { enum: Events } }, description: Resolves to Event }
  Event:
    name: Event
    plural: Events
    description: An event
    properties:
      summary: { access: rw, type: string, description: Summary }
      location: { access: rw, type: string, description: Location }
  Ghost:
    name: Ghost
    plural: Ghosts
    description: Not reachable
    properties:
      name: { access: r, type: string, description: Name }
enums: {}
hierarchy:
  children:
    notes: { resource: Note, access: rw }
    calendars:
      resource: Calendar
      access: rw
      children:
        events: { resource: Event, access: rw }
commands: {}
`)

/** A note with a title, set unless `title` says otherwise. */
function note(index: number, title: FakeValue = `${SECRET}-${String(index)}`): object {
  return item({
    uid: `uid-${SECRET}-${String(index)}`,
    title,
    folder: SECRET,
    body: SECRET,
    attachment: SECRET,
    scans: SECRET,
    secretive: SECRET,
  })
}

function event(location: FakeValue): object {
  return item({ summary: SECRET, location })
}

function calendar(events: readonly object[]): object {
  return item({ name: SECRET, labels: SECRET, pinned: SECRET, upcoming: SECRET }, { events })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveAccessChain', () => {
  it('finds a top-level resource, a nested one by its parents, and falls back to top level', () => {
    expect(resolveAccessChain(MANIFEST, 'Note')).toEqual(['Note'])
    expect(resolveAccessChain(MANIFEST, 'Event')).toEqual(['Calendar', 'Event'])
    expect(resolveAccessChain(MANIFEST, 'Ghost')).toEqual(['Ghost'])
  })
})

describe('probeNullability: the presence matrix', () => {
  it('counts reads, empty reads, and failed reads per property of a top-level collection', async () => {
    // Note 0: all set. Note 1: title missing. Note 2: title read throws.
    const { runner } = fakeRunner(fakeApp({ notes: [note(0), note(1, null), note(2, THROWS)] }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Note'],
      skipProperties: ['secretive'],
      environment: environment(),
    })
    expect(result.resources['Note']).toEqual({
      resource: 'Note',
      accessPath: 'notes',
      status: 'probed',
      itemsRead: 3,
      sampledParents: 1,
      parentsScanned: 1,
      truncated: false,
      presence: {
        // Each value found is counted by kind: every fake value is text.
        uid: { reads: 3, nulls: 0, failures: 0, kinds: { string: 3 } },
        // A throwing read is a failure, not an empty value (rule 4).
        title: { reads: 2, nulls: 1, failures: 1, kinds: { string: 1 } },
        folder: { reads: 3, nulls: 0, failures: 0, kinds: { string: 3 } },
      },
      skipped: [
        { property: 'body', reason: 'heavy' },
        { property: 'attachment', reason: 'file' },
        { property: 'scans', reason: 'file' },
        { property: 'secretive', reason: 'excluded' },
      ],
    })
  })

  it('reaches a nested resource through its parents, in order, and records the path', async () => {
    const app = fakeApp({
      calendars: [calendar([event('Room 1'), event(null)]), calendar([]), calendar([event(null)])],
    })
    const { runner } = fakeRunner(app)
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Event'],
      environment: environment(),
    })
    expect(result.resources['Event']).toMatchObject({
      accessPath: 'calendars/events',
      status: 'probed',
      itemsRead: 3,
      presence: {
        summary: { reads: 3, nulls: 0, failures: 0 },
        location: { reads: 3, nulls: 2, failures: 0 },
      },
    })
  })

  it('reports a resource under a hierarchy link that names no resource as unreachable, guessing no accessor for the link (#165)', async () => {
    const manifest: AppManifest = {
      ...MANIFEST,
      hierarchy: {
        children: {
          folders: {
            resource: 'Folder',
            access: 'rw',
            children: { notes: { resource: 'Note', access: 'rw' } },
          },
        },
      },
    }
    const { runner, scripts } = fakeRunner(fakeApp({ notes: [note(0)] }))
    const result = await probeNullability(manifest, runner, {
      resources: ['Note'],
      environment: environment(),
    })
    // The link is named by its key, never spelled as a guessed `Folders` accessor.
    expect(result.resources['Note']).toMatchObject({
      accessPath: 'Folder/notes',
      status: 'unreachable',
      itemsRead: 0,
    })
    // Only the version is read: the unresolvable resource is never addressed.
    expect(scripts).toEqual([APP_VERSION_BODY])
  })

  it('reports an unreachable resource and moves on to the next', async () => {
    const { runner } = fakeRunner(fakeApp({ notes: [note(0)] }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Ghost', 'Note'],
      environment: environment(),
    })
    expect(result.resources['Ghost']).toMatchObject({
      accessPath: 'ghosts',
      status: 'unreachable',
      itemsRead: 0,
      presence: {},
    })
    expect(result.resources['Note']?.status).toBe('probed')
  })

  it('reports an empty collection as no-items', async () => {
    const { runner } = fakeRunner(fakeApp({ notes: [] }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Note'],
      environment: environment(),
    })
    expect(result.resources['Note']).toMatchObject({ status: 'no-items', itemsRead: 0 })
  })

  it('reports a failed call as an error, without its message, and moves on', async () => {
    const { runner } = fakeRunner(fakeApp({ notes: [note(0)], calendars: [] }), {
      failOn: 'notes',
    })
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Note', 'Calendar'],
      environment: environment(),
    })
    expect(result.resources['Note']).toMatchObject({
      status: 'error',
      note: 'The probe of this resource timed out.',
    })
    expect(result.resources['Calendar']?.status).toBe('no-items')
  })
})

describe('probeNullability: limits', () => {
  const many = (n: number): object[] => Array.from({ length: n }, (_, i) => note(i))

  it(`reads at most ${String(MAX_ITEMS_PER_COLLECTION)} items, and caps a larger request`, async () => {
    for (const maxItems of [undefined, 100]) {
      const { runner } = fakeRunner(fakeApp({ notes: many(100) }))
      const result = await probeNullability(MANIFEST, runner, {
        resources: ['Note'],
        ...(maxItems === undefined ? {} : { maxItems }),
        environment: environment(),
      })
      expect(result.resources['Note']?.itemsRead).toBe(60)
      expect(result.resources['Note']?.presence['uid']).toEqual({
        reads: 60,
        nulls: 0,
        failures: 0,
        kinds: { string: 60 },
      })
    }
  })

  it('reads fewer items on request, across parents in a nested walk', async () => {
    const app = fakeApp({
      calendars: [calendar([event('a'), event('b')]), calendar([event('c'), event('d')])],
    })
    const { runner } = fakeRunner(app)
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Event'],
      maxItems: 3,
      environment: environment(),
    })
    expect(result.resources['Event']?.itemsRead).toBe(3)
  })

  it('skips the remaining resources once the budget is spent, without reading them', async () => {
    const clock = { now: 0 }
    const { runner, scripts } = fakeRunner(fakeApp({ notes: [note(0)], calendars: [] }), {
      afterCall: () => {
        clock.now += 1_500
      },
    })
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Note', 'Calendar', 'Event'],
      budgetMs: 1_000,
      environment: environment(clock),
    })
    expect(result.resources['Note']?.status).toBe('probed')
    expect(result.resources['Calendar']).toMatchObject({ status: 'budget', itemsRead: 0 })
    expect(result.resources['Event']).toMatchObject({ status: 'budget', itemsRead: 0 })
    // The version read and the one Note call only.
    expect(scripts).toHaveLength(2)
  })

  it('stops reading items inside a call when its time is up, and says so', async () => {
    // Each Date.now() in the app process advances 10 s; the call's limit is
    // 25 s, so it reads items while the clock is below the deadline.
    const { runner } = fakeRunner(fakeApp({ notes: many(10) }), { msPerTick: 10_000 })
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Note'],
      environment: environment(),
    })
    // Deadline = t0 + 10 s (first tick) + 25 s; checks run at +20 s and +30 s
    // (read), then +40 s (stop).
    expect(result.resources['Note']).toMatchObject({
      status: 'probed',
      itemsRead: 2,
      truncated: true,
    })
  })
})

describe('probeNullability: index access', () => {
  it('reads a huge collection by index, touching only the items it reads', async () => {
    const log = indexLog()
    const notes = fakeCollection(10_000, (index) => note(index), log)
    const { runner } = fakeRunner(fakeApp({ notes }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Note'],
      environment: environment(),
    })
    expect(result.resources['Note']).toMatchObject({ status: 'probed', itemsRead: 60 })
    expect(log.indexed).toBe(60)
  })

  it('gives each parent an equal quota, so every parent is sampled', async () => {
    // Five calendars of 50 events: a quota of ceil(60 / 5) = 12 each.
    const parents = indexLog()
    const children = indexLog()
    const calendarOf = (): object =>
      item({ name: SECRET }, { events: fakeCollection(50, () => event('x'), children) })
    const calendars = fakeCollection(5, calendarOf, parents)
    const { runner } = fakeRunner(fakeApp({ calendars }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Event'],
      environment: environment(),
    })
    expect(result.resources['Event']).toMatchObject({
      status: 'probed',
      itemsRead: 60,
      sampledParents: 5,
    })
    // Each calendar's length is read once to find the parents; nothing more.
    expect(parents.indices).toEqual([0, 1, 2, 3, 4])
    // 0, 4, 8, 12, 16, 20, 25, 29, 33, 37, 41, 45 (floor(k * 50 / 12)) in each.
    const perParent = [0, 4, 8, 12, 16, 20, 25, 29, 33, 37, 41, 45]
    expect(spreadIndices(50, 12)).toEqual(perParent)
    expect(children.indices).toEqual([1, 2, 3, 4, 5].flatMap(() => perParent))
  })

  it('samples both of two unequal parents, 30 items from each', async () => {
    const large = indexLog()
    const small = indexLog()
    const calendars = [
      item({ name: SECRET }, { events: fakeCollection(332, () => event('x'), large) }),
      item({ name: SECRET }, { events: fakeCollection(80, () => event(null), small) }),
    ]
    const { runner } = fakeRunner(fakeApp({ calendars }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Event'],
      environment: environment(),
    })
    expect(result.resources['Event']).toMatchObject({
      status: 'probed',
      itemsRead: 60,
      sampledParents: 2,
      // Every event of the small calendar has no location: 30 of 60.
      presence: { location: { reads: 60, nulls: 30, failures: 0 } },
    })
    expect(large.indices).toEqual(spreadIndices(332, 30))
    expect(small.indices).toEqual(spreadIndices(80, 30))
    expect(small.indices.slice(0, 4)).toEqual([0, 2, 5, 8])
  })

  it('reads exactly the evenly spaced indices of one collection', async () => {
    const log = indexLog()
    const notes = fakeCollection(10, (index) => note(index), log)
    const { runner } = fakeRunner(fakeApp({ notes }))
    await probeNullability(MANIFEST, runner, {
      resources: ['Note'],
      maxItems: 4,
      environment: environment(),
    })
    // floor(k * 10 / 4) for k = 0..3.
    expect(log.indices).toEqual([0, 2, 5, 7])
  })

  it('reads every item of a collection no larger than its quota, in order', async () => {
    const log = indexLog()
    const notes = fakeCollection(3, (index) => note(index), log)
    const { runner } = fakeRunner(fakeApp({ notes }))
    await probeNullability(MANIFEST, runner, { resources: ['Note'], environment: environment() })
    expect(log.indices).toEqual([0, 1, 2])
  })

  // Regression: a first-N sample read only the start of one large, uniform
  // list (in Reminders, 58 completed reminders with every date set) and
  // missed the empty values further on.
  it('sees empty values that appear only late in a large collection', async () => {
    const notes = fakeCollection(332, (index) => note(index, index >= 100 ? null : 'set'))
    const { runner } = fakeRunner(fakeApp({ notes }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Note'],
      environment: environment(),
    })
    // floor(k * 332 / 60) >= 100 for k >= 19: 41 of the 60 sampled titles are empty.
    expect(result.resources['Note']?.presence['title']).toEqual({
      reads: 60,
      nulls: 41,
      failures: 0,
      kinds: { string: 19 },
    })
  })

  it('spreads over the parents when there are more parents than the cap', async () => {
    const parents = indexLog()
    const children = indexLog()
    const calendarOf = (): object =>
      item({ name: SECRET }, { events: fakeCollection(10, () => event('x'), children) })
    const calendars = fakeCollection(5, calendarOf, parents)
    const { runner } = fakeRunner(fakeApp({ calendars }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Event'],
      maxItems: 3,
      environment: environment(),
    })
    // Parents floor(k * 5 / 3) = 0, 1, 3, one item (index 0) each.
    expect(result.resources['Event']).toMatchObject({ itemsRead: 3, sampledParents: 3 })
    expect(children.indices).toEqual([0, 0, 0])
  })

  it('skips empty parents when sharing the quota', async () => {
    const calendars = [calendar([]), calendar([event(null), event('x')]), calendar([])]
    const { runner } = fakeRunner(fakeApp({ calendars }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Event'],
      environment: environment(),
    })
    expect(result.resources['Event']).toMatchObject({
      itemsRead: 2,
      sampledParents: 1,
      presence: { location: { reads: 2, nulls: 1, failures: 0 } },
    })
  })

  it('reports a collection whose length throws or is not a number as unreachable', async () => {
    const lengths: (() => unknown)[] = [
      () => {
        throw new Error('no such element')
      },
      () => 'many',
    ]
    for (const length of lengths) {
      const { runner } = fakeRunner(fakeApp({ notes: fakeCollection(length, note) }))
      const result = await probeNullability(MANIFEST, runner, {
        resources: ['Note'],
        environment: environment(),
      })
      expect(result.resources['Note']).toMatchObject({ status: 'unreachable', itemsRead: 0 })
    }
  })

  it('skips a parent whose child collection has no usable length, and reads the rest', async () => {
    const broken = item(
      { name: SECRET },
      {
        events: fakeCollection(
          () => {
            throw new Error('no such element')
          },
          () => event('x')
        ),
      }
    )
    const { runner } = fakeRunner(
      fakeApp({ calendars: [broken, calendar([event(null), event('Room 2')])] })
    )
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Event'],
      environment: environment(),
    })
    expect(result.resources['Event']).toMatchObject({
      status: 'probed',
      itemsRead: 2,
      presence: { location: { reads: 2, nulls: 1, failures: 0 } },
    })
  })
})

// ---------------------------------------------------------------------------
// The parent pre-scan
// ---------------------------------------------------------------------------

/** Calendars hold events, events hold alarms: a resource two levels down. */
const DEEP_MANIFEST: AppManifest = parseManifestYaml(`
version: '1.0'
app:
  bundleId: com.example.jotter
  name: Jotter
  tccEntitlements: []
resources:
  Calendar:
    name: Calendar
    plural: Calendars
    description: A calendar
    properties:
      name: { access: r, type: string, description: Name }
  Event:
    name: Event
    plural: Events
    description: An event
    properties:
      summary: { access: rw, type: string, description: Summary }
  Alarm:
    name: Alarm
    plural: Alarms
    description: An alarm
    properties:
      trigger: { access: r, type: string, description: Trigger }
enums: {}
hierarchy:
  children:
    calendars:
      resource: Calendar
      access: rw
      children:
        events:
          resource: Event
          access: rw
          children:
            alarms: { resource: Alarm, access: rw }
commands: {}
`)

/** What a deep fake app's collections handed out, level by level. */
interface DeepLogs {
  readonly calendars: IndexLog
  /** Every calendar's events collection, together. */
  readonly events: IndexLog
  /** Every event's alarms collection, together. */
  readonly alarms: IndexLog
}

interface DeepAppOptions {
  readonly calendars: number
  readonly eventsPerCalendar: number
  /** Whether the event at an index (within its calendar) has one alarm. */
  readonly hasAlarm: (eventIndex: number) => boolean
  /** Advances a fake clock on each collection access or alarm property read. */
  readonly onAccess?: (access: 'length' | 'index' | 'read') => void
}

/** A fake app of calendars, their events, and the events' alarms, made on demand. */
function deepApp(options: DeepAppOptions): { app: object; logs: DeepLogs } {
  const logs: DeepLogs = { calendars: indexLog(), events: indexLog(), alarms: indexLog() }
  const onAccess = options.onAccess ?? (() => undefined)
  const alarm = (): object => ({
    trigger: () => {
      onAccess('read')
      return SECRET
    },
  })
  const eventAt = (index: number): object =>
    item(
      { summary: SECRET },
      { alarms: fakeCollection(options.hasAlarm(index) ? 1 : 0, alarm, logs.alarms, onAccess) }
    )
  const calendarAt = (): object =>
    item(
      { name: SECRET },
      { events: fakeCollection(options.eventsPerCalendar, eventAt, logs.events, onAccess) }
    )
  const app = fakeApp({
    calendars: fakeCollection(options.calendars, calendarAt, logs.calendars, onAccess),
  })
  return { app, logs }
}

describe('probeNullability: the parent pre-scan', () => {
  it('has the limits the derivations below assume', () => {
    expect(PARENT_SPREAD).toBe(20)
    expect(MAX_PARENT_VISITS).toBe(1_000)
    expect(PARENT_SCAN_TIME_SHARE).toBe(0.5)
    expect(MAX_CALL_MS).toBe(25_000)
  })

  it('looks in evenly spaced parents only, not every parent', async () => {
    // 1,000 calendars of 5 events. The first round visits floor(k * 1000 / 20)
    // = every 50th calendar; their 20 * 5 = 100 events fill the cap of 60, so
    // the scan stops there. Each gets a quota of ceil(60 / 20) = 3 events.
    const parents = indexLog()
    const children = indexLog()
    const calendarOf = (): object =>
      item({ name: SECRET }, { events: fakeCollection(5, () => event('x'), children) })
    const { runner } = fakeRunner(
      fakeApp({ calendars: fakeCollection(1_000, calendarOf, parents) })
    )
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Event'],
      environment: environment(),
    })
    expect(result.resources['Event']).toMatchObject({
      status: 'probed',
      itemsRead: 60,
      sampledParents: 20,
      parentsScanned: 20,
      truncated: false,
    })
    expect(parents.indices).toEqual(Array.from({ length: 20 }, (_, k) => k * 50))
    expect(children.lengthReads).toBe(20)
    // floor(k * 5 / 3) = 0, 1, 3 in each.
    expect(children.indices).toEqual(Array.from({ length: 20 }, () => [0, 1, 3]).flat())
  })

  it('looks in further parents, round by round, until it finds items, visiting each once', async () => {
    // 100 calendars; only calendar 1 has events (10). Round 1 (m = 20) visits
    // the multiples of 5; round 2 (m = 40) adds floor(2.5k), still not 1;
    // round 3 (m = 80) adds floor(1.25k), which includes 1 (k = 1). Its 10
    // events are fewer than 60, so round 4 (m = 160 >= 100) visits the rest.
    const parents = indexLog()
    const calendarAt = (index: number): object =>
      calendar(index === 1 ? Array.from({ length: 10 }, () => event(null)) : [])
    const app = fakeApp({ calendars: fakeCollection(100, calendarAt, parents) })
    const first = fakeRunner(app)
    const result = await probeNullability(MANIFEST, first.runner, {
      resources: ['Event'],
      environment: environment(),
    })
    expect(result.resources['Event']).toMatchObject({
      status: 'probed',
      itemsRead: 10,
      sampledParents: 1,
      parentsScanned: 100,
      presence: { location: { reads: 10, nulls: 10, failures: 0 } },
    })
    // Every calendar exactly once, though the rounds overlap.
    expect([...parents.indices].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 100 }, (_, k) => k)
    )
    // Round 1 first: floor(k * 100 / 20) = 0, 5, ..., 95.
    expect(parents.indices.slice(0, 20)).toEqual(Array.from({ length: 20 }, (_, k) => k * 5))

    // The same app state picks the same parents and items.
    const again = indexLog()
    const second = fakeRunner(fakeApp({ calendars: fakeCollection(100, calendarAt, again) }))
    await probeNullability(MANIFEST, second.runner, {
      resources: ['Event'],
      environment: environment(),
    })
    expect(again.indices).toEqual(parents.indices)
  })

  it('spreads over the parents found in index order, whichever round found them', async () => {
    // 40 calendars; calendar 38 and every odd calendar hold one event. A cap
    // of 3. Round 1 (m = 20) visits the even calendars and finds only 38;
    // one event is short of 3, so round 2 (m = 40) visits the odd ones: 21
    // parents in all, more than the cap. In index order they are 1, 3, ...,
    // 37, 38, 39; floor(k * 21 / 3) = 0, 7, 14 picks calendars 1, 15, 29.
    const sampled: number[] = []
    const calendarAt = (index: number): object =>
      item(
        { name: SECRET },
        {
          events: fakeCollection(index === 38 || index % 2 === 1 ? 1 : 0, () => {
            sampled.push(index)
            return event('x')
          }),
        }
      )
    const { runner } = fakeRunner(fakeApp({ calendars: fakeCollection(40, calendarAt) }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Event'],
      maxItems: 3,
      environment: environment(),
    })
    expect(result.resources['Event']).toMatchObject({
      itemsRead: 3,
      sampledParents: 3,
      parentsScanned: 40,
    })
    expect(sampled).toEqual([1, 15, 29])
  })

  // Regression: the pre-scan read the length of every event's alarms in
  // every calendar before reading any item, so on a large calendar store the
  // call's time ran out with nothing read.
  it('finds sparse items two levels down within the visit limit', async () => {
    // 50 calendars of 400 events; an event has an alarm when index % 37 = 36.
    //
    // Round 1 (m = 20): calendars floor(2.5k) = 0, 2, 5, 7, 10, 12, ...; in
    // each, events 20k. 20k = 36 (mod 37) needs k = 24, so none has an alarm.
    // Visits: 20 events lengths + 400 alarms lengths = 420.
    //
    // Round 2 (m = 40): calendars floor(1.25k), 4 in each block of 5 (5j to
    // 5j + 3), of which 5j and 5j + 2 were in round 1. Events 10k; 10k = 36
    // (mod 37) needs k = 11, so event 110 has the alarm in every calendar
    // visited. A round-1 calendar adds its 20 odd multiples of 10 (20 visits);
    // a new one, its events length and 40 alarms lengths (41). A block of 5
    // costs 20 + 41 + 20 + 41 = 122 visits, for 4 alarms.
    //
    // 420 + 4 blocks (488) = 908. Then calendar 20 (20, to 928), calendar 21
    // (41, to 969), calendar 22 (20, to 989): 3 more alarms. Calendar 23 gets
    // its events length and 10 alarms lengths (events 0 to 90) before the
    // 1,000th visit stops the scan, short of event 110.
    //
    // So 16 + 3 = 19 alarms, one per parent.
    const { app, logs } = deepApp({
      calendars: 50,
      eventsPerCalendar: 400,
      hasAlarm: (index) => index % 37 === 36,
    })
    const { runner } = fakeRunner(app)
    const result = await probeNullability(DEEP_MANIFEST, runner, {
      resources: ['Alarm'],
      environment: environment(),
    })
    expect(result.resources['Alarm']).toMatchObject({
      accessPath: 'calendars/events/alarms',
      status: 'probed',
      itemsRead: 19,
      sampledParents: 19,
      parentsScanned: 400 + 4 * 120 + 20 + 40 + 20 + 10,
      truncated: false,
      presence: { trigger: { reads: 19, nulls: 0, failures: 0, kinds: { string: 19 } } },
    })
    expect(result.resources['Alarm']?.note).toBeUndefined()
    // The calendars' length once; the events lengths of the 20 + 10
    // calendars visited; the alarms lengths of the 970 events visited.
    expect(logs.calendars.lengthReads).toBe(1)
    expect(logs.events.lengthReads).toBe(30)
    expect(logs.alarms.lengthReads).toBe(970)
    expect(logs.events.lengthReads + logs.alarms.lengthReads).toBe(MAX_PARENT_VISITS)
    // Each alarm found is read once, at index 0.
    expect(logs.alarms.indices).toEqual(Array.from({ length: 19 }, () => 0))
  })

  it('says a scan that stopped at its limit found no items in the parents it looked in', async () => {
    // As above, with no alarms at all: the same 1,000 visits, 970 of them
    // to alarms collections.
    const { app } = deepApp({ calendars: 50, eventsPerCalendar: 400, hasAlarm: () => false })
    const { runner } = fakeRunner(app)
    const result = await probeNullability(DEEP_MANIFEST, runner, {
      resources: ['Alarm'],
      environment: environment(),
    })
    expect(result.resources['Alarm']).toMatchObject({
      status: 'no-items',
      itemsRead: 0,
      parentsScanned: 970,
      truncated: false,
      note: 'no items in the 970 parents scanned; the scan stops after 1000 collections',
    })
    const merged = mergeNullabilityObservations(DEEP_MANIFEST, result)
    expect(merged.resources[0]?.block).toMatchObject({
      status: 'no-items',
      parentsScanned: 970,
      note: 'no items in the 970 parents scanned; the scan stops after 1000 collections',
    })
  })

  it('says nothing more when a scan that looked in every parent found no items', async () => {
    const { runner } = fakeRunner(fakeApp({ calendars: [calendar([]), calendar([])] }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Event'],
      environment: environment(),
    })
    expect(result.resources['Event']).toMatchObject({ status: 'no-items', parentsScanned: 2 })
    expect(result.resources['Event']?.note).toBeUndefined()
  })

  it('samples what it found when the time for the pre-scan runs out: not truncated, with a note', async () => {
    // Each length read takes 100 ms; the scan may use half of the 25 s limit.
    // The calendars' length takes the clock to 100; visit v starts while
    // 100 + (v - 1) * 100 < 12,500, so 124 visits run. Round 1 costs 21 per
    // calendar (events length, 20 alarms lengths): calendars 0, 2, 5, 7, 10
    // (105) and calendar 12's events length and its first 18 events
    // (0 to 340). Alarms on every 40th event: 10 in each full calendar (0 to
    // 360), 9 in calendar 12 (0 to 320). The sample costs no time and reads
    // all 59, so it is complete: only the scan was cut short, which the note
    // records.
    const appClock = { now: 0 }
    const { app } = deepApp({
      calendars: 50,
      eventsPerCalendar: 400,
      hasAlarm: (index) => index % 40 === 0,
      onAccess: (access) => {
        if (access === 'length') appClock.now += 100
      },
    })
    const { runner } = fakeRunner(app, { appClock })
    const result = await probeNullability(DEEP_MANIFEST, runner, {
      resources: ['Alarm'],
      environment: environment(),
    })
    expect(result.resources['Alarm']).toMatchObject({
      status: 'probed',
      itemsRead: 59,
      sampledParents: 59,
      parentsScanned: 5 * 20 + 18,
      truncated: false,
      note: 'the parent scan stopped at the time limit after 118 parents',
    })
    expect(appClock.now).toBe(12_500)
    const merged = mergeNullabilityObservations(DEEP_MANIFEST, result)
    expect(merged.resources[0]?.block).toMatchObject({
      status: 'probed',
      itemsRead: 59,
      note: 'the parent scan stopped at the time limit after 118 parents',
    })
  })

  it('notes both cuts when the time runs out in the pre-scan and again in the sample', async () => {
    // As above (59 alarms in 118 parents, the scan ending at 12,500 ms), but
    // reading an alarm's trigger takes 500 ms. Item k (from 0) starts while
    // 12,500 + 500k < 25,000, so items 0 to 24 are read: 25 items.
    const appClock = { now: 0 }
    const { app } = deepApp({
      calendars: 50,
      eventsPerCalendar: 400,
      hasAlarm: (index) => index % 40 === 0,
      onAccess: (access) => {
        if (access === 'length') appClock.now += 100
        if (access === 'read') appClock.now += 500
      },
    })
    const { runner } = fakeRunner(app, { appClock })
    const result = await probeNullability(DEEP_MANIFEST, runner, {
      resources: ['Alarm'],
      environment: environment(),
    })
    expect(result.resources['Alarm']).toMatchObject({
      status: 'probed',
      itemsRead: 25,
      sampledParents: 25,
      parentsScanned: 118,
      truncated: true,
      note: 'the parent scan stopped at the time limit after 118 parents',
    })
    expect(appClock.now).toBe(25_000)
    const merged = mergeNullabilityObservations(DEEP_MANIFEST, result)
    expect(merged.resources[0]?.block.note).toBe(
      'the parent scan stopped at the time limit after 118 parents; the sample stopped at the time limit after 25 items'
    )
  })

  it('reports a pre-scan that ran out of time before any item as budget, not truncated', async () => {
    // As above with no alarms: the same 124 visits, 118 of them to alarms
    // collections, all empty. No item was read, so whether there are any is
    // unknown.
    const appClock = { now: 0 }
    const { app } = deepApp({
      calendars: 50,
      eventsPerCalendar: 400,
      hasAlarm: () => false,
      onAccess: (access) => {
        if (access === 'length') appClock.now += 100
      },
    })
    const { runner } = fakeRunner(app, { appClock })
    const result = await probeNullability(DEEP_MANIFEST, runner, {
      resources: ['Alarm'],
      environment: environment(),
    })
    expect(result.resources['Alarm']).toMatchObject({
      status: 'budget',
      itemsRead: 0,
      parentsScanned: 118,
      truncated: false,
    })
    expect(result.resources['Alarm']?.note).toBeUndefined()
    const merged = mergeNullabilityObservations(DEEP_MANIFEST, result)
    expect(merged.resources[0]?.block).toMatchObject({
      status: 'budget',
      note: 'no items found in the 118 parents scanned before the time limit',
    })
  })

  it('returns well inside the call limit when every access to the app is slow', async () => {
    // Every length read, element access and property read takes 50 ms, and
    // every event has an alarm. The calendars' length takes the clock to 50;
    // a visit costs 100 (an element and its child's length), so visit v
    // starts while 50 + (v - 1) * 100 < 12,500: 125 visits, to 12,550. That
    // is calendars 0, 2, 5, 7, 10 (105) and calendar 12's events length and
    // 19 alarms lengths: 119 parents, each with an alarm. Spread over 60 of
    // them, one alarm each, at 100 ms (the element and its trigger): 60
    // items, to 12,550 + 6,000 = 18,550. The sample is complete; the scan
    // was cut short.
    const appClock = { now: 0 }
    const { app } = deepApp({
      calendars: 50,
      eventsPerCalendar: 400,
      hasAlarm: () => true,
      onAccess: () => {
        appClock.now += 50
      },
    })
    const { runner } = fakeRunner(app, { appClock })
    const result = await probeNullability(DEEP_MANIFEST, runner, {
      resources: ['Alarm'],
      environment: environment(),
    })
    expect(result.resources['Alarm']).toMatchObject({
      status: 'probed',
      itemsRead: 60,
      sampledParents: 60,
      parentsScanned: 119,
      truncated: false,
      note: 'the parent scan stopped at the time limit after 119 parents',
    })
    expect(appClock.now).toBe(18_550)
    expect(appClock.now).toBeLessThan(MAX_CALL_MS)
  })
})

describe('probeNullability: what it reads and returns', () => {
  it('never puts a skipped property in any script', async () => {
    const { runner, scripts } = fakeRunner(fakeApp({ notes: [note(0)] }))
    await probeNullability(MANIFEST, runner, {
      resources: ['Note'],
      skipProperties: ['secretive'],
      environment: environment(),
    })
    for (const script of scripts) {
      for (const name of ['body', 'attachment', 'scans', 'secretive']) {
        expect(script).not.toContain(JSON.stringify(name))
      }
    }
    expect(HEAVY_PROPERTY_NAMES).toContain('body')
  })

  it('reads the primary identifier even when its name is on the heavy list or excluded', async () => {
    const manifest = parseManifestYaml(`
version: '1.0'
app: { bundleId: com.example.jotter, name: Jotter, tccEntitlements: [] }
resources:
  Snippet:
    name: Snippet
    plural: Snippets
    description: A snippet identified by its text
    identifiers:
      - property: text
        primary: true
    properties:
      text: { access: r, type: string, description: The snippet's text }
      body: { access: r, type: string, description: Heavy, not the identifier }
enums: {}
hierarchy: { children: {} }
commands: {}
`)
    expect(HEAVY_PROPERTY_NAMES).toContain('text')
    const snippets = [item({ text: SECRET, body: SECRET }), item({ text: null, body: SECRET })]
    for (const skipProperties of [[], ['text']]) {
      const { runner, scripts } = fakeRunner(fakeApp({ snippets }))
      const result = await probeNullability(manifest, runner, {
        skipProperties,
        environment: environment(),
      })
      expect(result.resources['Snippet']).toMatchObject({
        status: 'probed',
        itemsRead: 2,
        presence: { text: { reads: 2, nulls: 1, failures: 0 } },
        skipped: [{ property: 'body', reason: 'heavy' }],
      })
      expect(scripts.some((script) => script.includes(JSON.stringify('text')))).toBe(true)
    }
  })

  it('skips lists of references by type, and never puts them in any script', async () => {
    const { runner, scripts } = fakeRunner(fakeApp({ calendars: [calendar([])] }))
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Calendar'],
      environment: environment(),
    })
    expect(result.resources['Calendar']).toMatchObject({
      status: 'probed',
      itemsRead: 1,
      // A list of plain values is read.
      presence: {
        name: { reads: 1, nulls: 0, failures: 0 },
        labels: { reads: 1, nulls: 0, failures: 0 },
      },
      skipped: [
        { property: 'pinned', reason: 'references' },
        // `{ enum: Events }` names no enum, so it resolves to the Event resource.
        { property: 'upcoming', reason: 'references' },
      ],
    })
    for (const script of scripts) {
      expect(script).not.toContain(JSON.stringify('pinned'))
      expect(script).not.toContain(JSON.stringify('upcoming'))
    }
  })

  it('skips a property marked unsupported, and never puts it in any script', async () => {
    const manifest = parseManifestYaml(`
version: '1.0'
app: { bundleId: com.example.jotter, name: Jotter, tccEntitlements: [] }
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    identifiers:
      - property: uid
        primary: true
    properties:
      uid: { access: r, type: string, description: Id }
      title: { access: rw, type: string, description: Title }
      locked:
        access: r
        type: boolean
        description: Whether the note is locked
        unsupported:
          reason: Jotter does not implement locking.
          evidence:
            source: probe
            observedAt: '2026-10-30T12:00:00.000Z'
            bundleId: com.example.jotter
            appVersion: '2.1'
            osVersion: '27.2'
            sampleSize: 40
            failedReads: 40
            errorNumbers: [-1728]
enums: {}
hierarchy: { children: {} }
commands: {}
`)
    const { runner, scripts } = fakeRunner(
      fakeApp({ notes: [item({ uid: 'n-0', title: SECRET, locked: true })] })
    )
    const result = await probeNullability(manifest, runner, { environment: environment() })
    expect(result.resources['Note']).toMatchObject({
      status: 'probed',
      itemsRead: 1,
      presence: {
        uid: { reads: 1, nulls: 0, failures: 0 },
        title: { reads: 1, nulls: 0, failures: 0 },
      },
      skipped: [{ property: 'locked', reason: 'unsupported' }],
    })
    expect(result.resources['Note']?.presence).not.toHaveProperty('locked')
    for (const script of scripts) {
      expect(script).not.toContain(JSON.stringify('locked'))
    }
  })

  it('returns counts and kind labels only: no observed value leaves the app process or reaches the result', async () => {
    const { runner, returned } = fakeRunner(
      fakeApp({ notes: [note(0), note(1, null)], calendars: [calendar([event(SECRET)])] })
    )
    const result = await probeNullability(MANIFEST, runner, { environment: environment() })
    expect(JSON.stringify(returned)).not.toContain(SECRET)
    expect(JSON.stringify(result)).not.toContain(SECRET)
    for (const value of returned) {
      expect(
        leaves(value).every((leaf) => typeof leaf === 'number' || typeof leaf === 'boolean')
      ).toBe(true)
      // The only text is in keys, and the only keys under `kinds` are labels.
      for (const kinds of kindsRecords(value)) {
        expect(Object.keys(kinds).every((label) => isValueKind(label))).toBe(true)
      }
    }
    expect(returned.some((value) => kindsRecords(value).length > 0)).toBe(true)
  })

  it('reads no app command and writes nothing: every script only reads', async () => {
    const { runner, scripts } = fakeRunner(fakeApp({ notes: [note(0)] }))
    await probeNullability(MANIFEST, runner, { resources: ['Note'], environment: environment() })
    for (const script of scripts) {
      expect(script).not.toMatch(/\.(make|delete|set|push|close|save|quit)\(|\bmake\(|=\s*app\./)
    }
  })

  it('embeds names as JSON literals, never as code', async () => {
    const parsed = parseManifestYaml(`
version: '1.0'
app: { bundleId: com.example.jotter, name: Jotter, tccEntitlements: [] }
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    properties:
      "x\\"]; throw 1; //": { access: r, type: string, description: Hostile }
enums: {}
hierarchy: { children: {} }
commands: {}
`)
    // The schema rejects a plural that is not a Pascal case identifier, so the
    // hostile plural is set after parsing: the probe must still embed it as
    // data if a manifest ever reaches it unvalidated.
    const note = parsed.resources['Note']
    if (note === undefined) throw new Error('fixture has no Note')
    const hostile: AppManifest = {
      ...parsed,
      resources: { Note: { ...note, plural: "Notes'); throw 1; ('" } },
    }
    const { runner } = fakeRunner(fakeApp({}))
    const result = await probeNullability(hostile, runner, { environment: environment() })
    expect(result.resources['Note']?.status).toBe('unreachable')
  })
})

describe('probeNullability: value kinds', () => {
  const KINDS_MANIFEST = parseManifestYaml(`
version: '1.0'
app: { bundleId: com.example.jotter, name: Jotter, tccEntitlements: [] }
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    properties:
      when: { access: r, type: string, description: Declared text, holds dates }
      size: { access: r, type: integer, description: A number }
      done: { access: r, type: boolean, description: A flag }
      title: { access: r, type: string, description: Text }
      bounds: { access: r, type: rect, description: A record }
      tags: { access: r, type: { array: string }, description: A list }
      folder: { access: r, type: { resource: Note }, description: A reference }
      odd: { access: r, type: any, description: A host object }
      mixed: { access: r, type: string, description: Text or a date }
      blank: { access: r, type: string, description: Never set }
enums: {}
hierarchy: { children: {} }
commands: {}
`)

  /** A host object: tagged \`Object\` but with its own prototype, like a path object. */
  class HostObject {
    readonly secret = SECRET
  }

  /** A note whose values have every kind; dates and records come from this realm, not the probe's. */
  function kindsNote(index: number): object {
    return item({
      when: new Date(Date.UTC(2026, 9, index + 1)),
      size: index,
      done: index % 2 === 0,
      title: SECRET,
      bounds: { x: 0, y: 0, width: index, height: index },
      tags: [SECRET],
      // An object specifier is callable.
      folder: () => SECRET,
      odd: new HostObject(),
      mixed: index === 0 ? new Date(Date.UTC(2026, 0, 1)) : SECRET,
      blank: null,
    })
  }

  it('counts each value found by kind, and returns only labels and counts', async () => {
    const { runner, returned } = fakeRunner(fakeApp({ notes: [0, 1, 2].map(kindsNote) }))
    const result = await probeNullability(KINDS_MANIFEST, runner, { environment: environment() })
    const presence = result.resources['Note']?.presence
    expect(presence).toEqual({
      when: { reads: 3, nulls: 0, failures: 0, kinds: { date: 3 } },
      size: { reads: 3, nulls: 0, failures: 0, kinds: { number: 3 } },
      done: { reads: 3, nulls: 0, failures: 0, kinds: { boolean: 3 } },
      title: { reads: 3, nulls: 0, failures: 0, kinds: { string: 3 } },
      bounds: { reads: 3, nulls: 0, failures: 0, kinds: { record: 3 } },
      tags: { reads: 3, nulls: 0, failures: 0, kinds: { list: 3 } },
      folder: { reads: 3, nulls: 0, failures: 0, kinds: { reference: 3 } },
      odd: { reads: 3, nulls: 0, failures: 0, kinds: { other: 3 } },
      mixed: { reads: 3, nulls: 0, failures: 0, kinds: { date: 1, string: 2 } },
      // No value found: no kind data.
      blank: { reads: 3, nulls: 3, failures: 0 },
    })
    expect(JSON.stringify(returned)).not.toContain(SECRET)
    expect(JSON.stringify(returned)).not.toContain('2026')
    expect(JSON.stringify(result)).not.toContain(SECRET)
  })
})

describe('probeNullability: the values-free guard on what the body returns', () => {
  /** A runner whose probe call returns `counts` for one property, `title`, of one item. */
  function returning(entry: unknown): JxaRunner {
    return (_bundleId, body) =>
      Promise.resolve(
        body === APP_VERSION_BODY
          ? '2.1'
          : {
              reachable: true,
              itemsRead: 1,
              sampledParents: 1,
              parentsScanned: 1,
              scanLimited: false,
              scanTimedOut: false,
              truncated: false,
              counts: { title: entry },
            }
      )
  }
  const TITLE_MANIFEST = parseManifestYaml(`
version: '1.0'
app: { bundleId: com.example.jotter, name: Jotter, tccEntitlements: [] }
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    properties:
      title: { access: r, type: string, description: Title }
enums: {}
hierarchy: { children: {} }
commands: {}
`)

  async function probeWith(entry: unknown) {
    const result = await probeNullability(TITLE_MANIFEST, returning(entry), {
      environment: environment(),
    })
    return result.resources['Note']
  }

  it('accepts every kind label, with counts that sum to the values found', async () => {
    const kinds = {
      date: 1,
      number: 1,
      boolean: 1,
      string: 1,
      record: 1,
      list: 1,
      reference: 1,
      other: 1,
    }
    const note = await probeWith({ reads: 9, nulls: 1, failures: 0, kinds })
    expect(note?.status).toBe('probed')
    expect(note?.presence['title']).toEqual({ reads: 9, nulls: 1, failures: 0, kinds })
  })

  it('accepts no kinds when every read found no value', async () => {
    const note = await probeWith({ reads: 1, nulls: 1, failures: 0, kinds: {} })
    expect(note?.presence['title']).toEqual({ reads: 1, nulls: 1, failures: 0 })
  })

  it.each([
    ['a value in place of a label', { [SECRET]: 1 }],
    ['an unknown label', { text: 1 }],
    ['a value in place of a count', { string: SECRET }],
    ['a zero count', { string: 1, date: 0 }],
    ['a fractional count', { string: 0.5, date: 0.5 }],
    ['counts that do not sum to the values found', { string: 2 }],
    ['a list of labels', ['string']],
  ])('rejects %s, reporting an error and no value', async (_case, kinds) => {
    const note = await probeWith({ reads: 1, nulls: 0, failures: 0, kinds })
    expect(note?.status).toBe('error')
    expect(note?.presence).toEqual({})
    expect(JSON.stringify(note)).not.toContain(SECRET)
  })

  it('rejects counts with no kinds at all, and more empty reads than reads', async () => {
    expect((await probeWith({ reads: 1, nulls: 0, failures: 0 }))?.status).toBe('error')
    expect((await probeWith({ reads: 1, nulls: 2, failures: 0, kinds: {} }))?.status).toBe('error')
  })
})

describe('probeNullability: provenance', () => {
  it("records the app's version, the macOS version, the bundle id, and the timestamp", async () => {
    const { runner } = fakeRunner(fakeApp({ notes: [] }), { version: '4.11' })
    const result = await probeNullability(MANIFEST, runner, {
      resources: ['Note'],
      environment: environment(),
    })
    expect(result).toMatchObject({
      bundleId: 'com.example.jotter',
      appName: 'Jotter',
      appVersion: '4.11',
      osVersion: '27.2',
      observedAt: '2026-10-31T12:00:00.000Z',
    })
  })

  it('fails when the app version cannot be read, since every observation needs it', async () => {
    const { runner } = fakeRunner(fakeApp({}), { version: null })
    await expect(
      probeNullability(MANIFEST, runner, { environment: environment() })
    ).rejects.toThrow('Could not read the version of Jotter')
  })
})

/** Every primitive leaf of a JSON value. */
/** Every `kinds` record in a value returned by the probe body. */
function kindsRecords(value: unknown): object[] {
  if (typeof value !== 'object' || value === null) return []
  const entries: [string, unknown][] = Object.entries(value)
  return entries.flatMap(([key, inner]): object[] =>
    key === 'kinds' && typeof inner === 'object' && inner !== null
      ? [inner, ...kindsRecords(inner)]
      : kindsRecords(inner)
  )
}

function leaves(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(leaves)
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(leaves)
  return [value]
}

function never(): never {
  throw new Error('unreachable')
}

describe("probeNullability: the app's own spelling (issue #165)", () => {
  // The shipped manifests record where the app's spelling differs from the
  // derived one: Music's AirPlay devices are `airplayDevices`, not the derived
  // `airPlayDevices`, and Google Chrome's tab `uRL` is `url`. A probe that used
  // the derived names would find no AirPlay devices and count every url read
  // as failed: exactly the evidence an unsupported marker is taken from.
  const manifestAt = (app: string): Promise<AppManifest> =>
    loadManifest(fileURLToPath(new URL(`../../../../manifests/${app}/app.yaml`, import.meta.url)))

  /**
   * A fake object that records every name read from it. A name in
   * `collections` is an element specifier; any other name is a property
   * accessor returning a set value.
   */
  function recording(
    reads: string[],
    collections: Readonly<Record<string, readonly object[]>> = {}
  ): object {
    return new Proxy(
      {},
      {
        get(_target, key) {
          if (typeof key !== 'string') return undefined
          reads.push(key)
          const elements = collections[key]
          return elements === undefined ? () => SECRET : elementsOf(elements)
        },
      }
    )
  }

  /** A runner that answers the version read and runs every other body against `app`. */
  function runnerFor(app: object): JxaRunner {
    return (_bundleId, body) => {
      if (body === APP_VERSION_BODY) return Promise.resolve('1.0')
      const value: unknown = runInNewContext(`(function (app) {${body}})(app)`, {
        app,
        Date: { now: () => 1_000_000 },
      })
      return Promise.resolve(JSON.parse(JSON.stringify(value)))
    }
  }

  it('reads a collection by the spelling the manifest records', async () => {
    const manifest = await manifestAt('music')
    const appReads: string[] = []
    const app = recording(appReads, { airplayDevices: [recording([])] })
    const result = await probeNullability(manifest, runnerFor(app), {
      resources: ['AirPlayDevice'],
      environment: environment(),
    })
    expect(appReads).toContain('airplayDevices')
    expect(appReads).not.toContain('airPlayDevices')
    expect(result.resources['AirPlayDevice']?.accessPath).toBe('airplayDevices')
    expect(result.resources['AirPlayDevice']?.itemsRead).toBe(1)
  })

  it('reads a property by the spelling the manifest records and reports it under its key', async () => {
    // A bookmark item is reached through its folder (the manifest's hierarchy).
    const manifest = await manifestAt('google-chrome')
    const itemReads: string[] = []
    const app = recording([], {
      bookmarkFolders: [recording([], { bookmarkItems: [recording(itemReads)] })],
    })
    const result = await probeNullability(manifest, runnerFor(app), {
      resources: ['BookmarkItem'],
      environment: environment(),
    })
    expect(itemReads).toContain('url')
    expect(itemReads).not.toContain('uRL')
    const bookmark = result.resources['BookmarkItem']
    expect(bookmark?.accessPath).toBe('bookmarkFolders/bookmarkItems')
    // One item read, and its url read succeeded: one read, no failures.
    expect(bookmark?.presence['uRL']).toMatchObject({ reads: 1, nulls: 0, failures: 0 })
    expect(Object.keys(bookmark?.presence ?? {})).not.toContain('url')
  })

  it('never probes a resource the manifest marks unsupported, even when asked to', async () => {
    // Screen Sharing's dictionary has no connection class, so its manifest
    // marks Connection unsupported.
    const manifest = await manifestAt('screen-sharing')
    const appReads: string[] = []
    const result = await probeNullability(manifest, runnerFor(recording(appReads)), {
      resources: ['Connection'],
      environment: environment(),
    })
    expect(result.resources).toEqual({})
    expect(appReads).not.toContain('connections')
  })
})
