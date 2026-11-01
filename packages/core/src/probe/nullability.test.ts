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
 */

import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { parseManifestYaml } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import {
  APP_VERSION_BODY,
  HEAVY_PROPERTY_NAMES,
  MAX_ITEMS_PER_COLLECTION,
  probeNullability,
  resolveAccessChain,
  type NullabilityProbeEnvironment,
} from './nullability.js'
import type { JxaRunner } from './probe.js'

// ---------------------------------------------------------------------------
// Fake app objects
// ---------------------------------------------------------------------------

/** Thrown by a fake property read, as the bridge throws for an app error. */
const THROWS = Symbol('throws')

type FakeValue = string | number | boolean | null | typeof THROWS

/** Counts how many elements a fake collection handed out. */
interface IndexLog {
  indexed: number
  /** The indices handed out, in order. */
  readonly indices: number[]
}

/**
 * A fake element specifier, shaped like the bridge's: `length` is the element
 * count and `[i]` is one element. It is deliberately not callable, so a probe
 * that calls it (building every element reference, as the bridge does) fails.
 *
 * @param length - The element count, or a function standing in for a
 *   `length` that misbehaves (throws, or is not a number).
 * @param at - The element at an index, made on demand.
 */
function fakeCollection(
  length: number | (() => unknown),
  at: (index: number) => object,
  log: IndexLog = indexLog()
): object {
  return new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'length') return typeof length === 'number' ? length : length()
        if (typeof key === 'string' && /^\d+$/.test(key)) {
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
  return { indexed: 0, indices: [] }
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
    let now = 1_000_000
    const tick = options.msPerTick ?? 0
    const clock = { now: () => (now += tick) }
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
      truncated: false,
      presence: {
        uid: { reads: 3, nulls: 0, failures: 0 },
        // A throwing read is a failure, not an empty value (rule 4).
        title: { reads: 2, nulls: 1, failures: 1 },
        folder: { reads: 3, nulls: 0, failures: 0 },
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

  it('returns counts only: no observed value leaves the app process or reaches the result', async () => {
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
    }
  })

  it('reads no app command and writes nothing: every script only reads', async () => {
    const { runner, scripts } = fakeRunner(fakeApp({ notes: [note(0)] }))
    await probeNullability(MANIFEST, runner, { resources: ['Note'], environment: environment() })
    for (const script of scripts) {
      expect(script).not.toMatch(/\.(make|delete|set|push|close|save|quit)\(|\bmake\(|=\s*app\./)
    }
  })

  it('embeds names as JSON literals, never as code', async () => {
    const hostile = parseManifestYaml(`
version: '1.0'
app: { bundleId: com.example.jotter, name: Jotter, tccEntitlements: [] }
resources:
  Note:
    name: Note
    plural: "Notes'); throw 1; ('"
    description: A note
    properties:
      "x\\"]; throw 1; //": { access: r, type: string, description: Hostile }
enums: {}
hierarchy: { children: {} }
commands: {}
`)
    const { runner } = fakeRunner(fakeApp({}))
    const result = await probeNullability(hostile, runner, { environment: environment() })
    expect(result.resources['Note']?.status).toBe('unreachable')
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
function leaves(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(leaves)
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(leaves)
  return [value]
}

function never(): never {
  throw new Error('unreachable')
}
