/**
 * Behavior of list bodies against a stand-in app: what a list returns, how
 * many requests it makes, and how it fails.
 *
 * A list reads each property once across the collection and assembles records
 * by index. These tests run that body through the native executor, with the
 * executor's own script composition and the real in-process codec, inside a
 * `node:vm` context whose app is a stand-in. The same data is also listed by
 * the per-item body lists used before (`test-support/per-item-list-body.ts`),
 * and the two decoded results must be deeply equal: the batched read changes
 * how a list reads, not what it returns. The one exception is items that share
 * an identifier, which the per-item read could not tell apart.
 *
 * The stand-in models the automation bridge as the live apps behave:
 *
 * - calling a collection (`col()`) lists its item specifiers;
 * - reading a property of a collection (`col["name"]()`) gives one value per
 *   item, in item order, with `null` where an item has no value;
 * - `col.length` counts the items;
 * - an item's `properties()` record holds every property, with `null` where it
 *   has no value, and fails when the item cannot report one of them (a
 *   Calendar calendar's record fails on its `calendarIdentifier`);
 * - a name the app does not have is `undefined`, so calling it throws.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4)
 * @see https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/OSX10-10.html
 *   (element arrays: calling one lists its elements, reading a property of
 *   one reads that property of every element)
 */

import { createContext, runInContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  EMPTY_RESOURCE_PLAN_TABLE,
  PASSTHROUGH_PLAN,
  TargetNotFoundError,
  UnexpectedValueError,
  AppOperationError,
  AppAuthorizationRequiredError,
  AppUnavailableError,
  CollectionChangedError,
  InvalidSelectionError,
  type OperationTarget,
  type ValuePlan,
  WIRE_KEYS,
  type WireRecord,
} from '@macts/contracts'
import { parseManifestYaml } from '../manifest/loader.js'
import { composeNativeScript } from './executor.js'
import { NATIVE_CODEC, NATIVE_CODEC_ERROR_NAME } from './native-codec.js'
import type { PageWindow } from '../execution/executor.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import { PAGE_READS, type PageRead } from '../manifest/schemas/resource.js'
import { createNativeExecutor, type NativeTransport } from './native-executor.js'
import { buildNativeBody, COMMUNICATION_FAILURE_ERROR_NUMBERS } from './native-scripts.js'
import { parseNativeOutcome } from './test-support/native-harness.js'
import { buildPerItemListBody } from './test-support/per-item-list-body.js'

/** Dictionary evidence for a recorded native spelling; its content is not under test. */
const EVIDENCE =
  "{ source: dictionary, bundleId: com.example.planner, appVersion: '1.0', osVersion: '27.2', term: t }"

/**
 * A planner app whose names exercise every list shape:
 *
 * - `Task`, listed under a `Shelf` matched by name, is identified by `uID`
 *   (app `uid`), claimed unique so its list pages, lives in the collection
 *   the app spells `todos`, and has a property the app spells differently
 *   (`uRL`, app `url`).
 * - `Folder` is matched on `name` because its declared identifier
 *   `folderKey` fails at run time, so `folderKey` is never read and, with
 *   identifier aliases, mirrors `name`.
 * - `Memo` declares no identifier, so its list is counted.
 */
const PLANNER_YAML = `
version: '1.0'
app:
  name: Planner
  bundleId: com.example.planner
resources:
  Shelf:
    name: Shelf
    plural: Shelves
    description: A shelf
    properties:
      name: { access: rw, description: The name }
    identifiers:
      - { property: name, primary: true, targeting: byProperty }
  Task:
    name: Task
    plural: Tasks
    description: A task
    native:
      collection: todos
      evidence: ${EVIDENCE}
    properties:
      title: { access: rw, description: The title }
      done: { access: rw, type: boolean, description: Done }
      priority: { access: rw, type: integer, description: Priority }
      uRL:
        access: rw
        description: The link
        native: { name: url, evidence: ${EVIDENCE} }
      secret: { access: r, description: A property the app may fail to report }
      uID:
        access: r
        description: The identifier
        native: { name: uid, evidence: ${EVIDENCE} }
    identifiers:
      - property: uID
        primary: true
        unique: true
        evidence: { unique: { source: curated, note: Every task has its own uid } }
    rangeRead:
      supported: true
      read: range
      evidence:
        source: probe
        observedAt: '2026-01-15T10:30:00.000Z'
        bundleId: com.example.planner
        appVersion: '1.0'
        osVersion: '27.2'
        cost:
          observedAt: '2026-01-15T10:30:00.000Z'
          pageMs: 400
          columnMs: 900
          items: 120
          runs: 5
          pageSize: 25
  Folder:
    name: Folder
    plural: Folders
    description: A folder
    properties:
      name: { access: rw, description: The name }
      folderKey: { access: r, description: The declared identifier }
      color: { access: rw, description: The color }
    identifiers:
      - { property: folderKey, primary: true, targeting: byProperty, runtimeProperty: name }
  Memo:
    name: Memo
    plural: Memos
    description: A memo
    properties:
      text: { access: rw, description: The text }
hierarchy:
  children: {}
commands:
  listTasks:
    name: list
    description: list tasks
    scope: resource
    resourceType: Task
    parent: { resource: Shelf, parameter: shelfId }
    parameters: [{ name: shelfId, type: string, description: shelf, required: true }]
  list: { name: list, description: list, scope: resource, resourceType: Folder, parameters: [] }
  listMemos: { name: list, description: list memos, scope: resource, resourceType: Memo, parameters: [] }
`

const planner = parseManifestYaml(PLANNER_YAML)
const TASKS: OperationTarget = { command: 'listTasks', resource: 'Task' }
const FOLDERS: OperationTarget = { command: 'list', resource: 'Folder' }
const MEMOS: OperationTarget = { command: 'listMemos', resource: 'Memo' }
const SHELF_INPUT: WireRecord = { shelfId: 'Home' }

/** The error number the stand-in raises for a read the app cannot answer. */
const READ_FAILED = -10000

// ---------------------------------------------------------------------------
// Stand-in app
// ---------------------------------------------------------------------------

/** One item as the app holds it, keyed by the app's names; `null` is no value. */
type Row = Readonly<Record<string, unknown>>

/** Reads the stand-in collection cannot answer, by the app's property names. */
interface Faults {
  /** Reading the property across the collection fails. */
  readonly bulk?: readonly string[]
  /** The error number a `bulk` read fails with; {@link READ_FAILED} by default. */
  readonly bulkErrorNumber?: number
  /** The error number a `perItem` read fails with; {@link READ_FAILED} by default. */
  readonly perItemErrorNumber?: number
  /**
   * Reading the property of one item fails, and so does that item's whole
   * `properties()` record, which includes it.
   */
  readonly perItem?: readonly string[]
  /** Reading the property across the collection gives one value too few. */
  readonly short?: readonly string[]
  /** Listing the item specifiers gives one item too few. */
  readonly shortItems?: boolean
  /**
   * Listed item specifiers address each item by its `uid`, so items that
   * share one all resolve to the first of them, as Calendar's events do.
   */
  readonly specifiersByUid?: boolean
  /** The collection's items swap places right after a request (see {@link Change}). */
  readonly reorder?: Change
  /** An item joins the collection right after a request (see {@link Change}). */
  readonly grow?: Change & { readonly row: Row }
  /** Any other change to the collection right after a request (see {@link Change}). */
  readonly mutate?: Change & { readonly change: (rows: readonly Row[]) => readonly Row[] }
}

/**
 * A change to the collection while a body reads it: applied right after the
 * request `after` (as logged in {@link FakeApp.requests}) completes, the first
 * time only or every time.
 */
interface Change {
  readonly after: string
  readonly times: 'once' | 'always'
}

/** A stand-in app and the log of every request a body made to it. */
interface FakeApp {
  readonly app: object
  /** Each request, in order: `list`, `count`, `column <name>`, `properties`, `item <name>`. */
  readonly requests: string[]
}

function readFailure(errorNumber = READ_FAILED): Error {
  return Object.assign(new Error('The app could not read the property.'), { errorNumber })
}

/** An item specifier answering only to the app's names in `row`. */
function fakeItem(row: Row, faults: Faults, requests: string[]): object {
  const failing = faults.perItem ?? []
  return new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'properties') {
          return () => {
            requests.push('properties')
            if (failing.some((name) => Object.hasOwn(row, name))) throw readFailure()
            return { ...row }
          }
        }
        if (typeof key !== 'string' || !Object.hasOwn(row, key)) return undefined
        return () => {
          requests.push(`item ${key}`)
          if (failing.includes(key)) throw readFailure(faults.perItemErrorNumber)
          return row[key]
        }
      },
    }
  )
}

/** Every property name the planner app has, in its own spelling. */
const PLANNER_NAMES: readonly string[] = [
  'title',
  'done',
  'priority',
  'url',
  'secret',
  'uid',
  'name',
  'folderKey',
  'color',
  'text',
]

/** The native error a range the collection does not reach fails with. */
function invalidRange(): Error {
  return Object.assign(new Error('Invalid index.'), { errorNumber: -1719 })
}

/**
 * A collection specifier over `rows`: callable to list its items, `length`
 * to count them, each of the app's property names (`names`) to read that
 * property across every item, empty or not, and `slice(start, end)` to
 * address a range of it.
 *
 * A range behaves as the app's does: positions are zero-based and the end is
 * included, the range is evaluated when it is read (so it sees the collection
 * as it is then), and a range that runs past the last item fails with -1719
 * rather than clamping. A negative or fractional position fails the test
 * outright: the app gives odd windows for those, so a body must never pass
 * one. Requests through a range are logged with its positions, for example
 * `[3..5] column uid`.
 */
function fakeCollection(
  initialRows: readonly Row[],
  faults: Faults,
  requests: string[],
  names: ReadonlySet<string>
): object {
  // The collection as it is now; `reorder`, `grow`, and `mutate` change it between requests.
  let rows: readonly Row[] = initialRows
  const applied = new Set<Change>()
  const due = (change: Change | undefined, request: string): change is Change =>
    change?.after === request && (change.times === 'always' || !applied.has(change))
  /** Log `request`, then apply any change due after it. */
  const completed = (request: string): void => {
    requests.push(request)
    if (due(faults.reorder, request)) {
      applied.add(faults.reorder)
      rows = [...rows].reverse()
    }
    if (due(faults.grow, request)) {
      applied.add(faults.grow)
      rows = [...rows, faults.grow.row]
    }
    if (due(faults.mutate, request)) {
      applied.add(faults.mutate)
      rows = faults.mutate.change(rows)
    }
  }
  /** A collection whose items are `view()` when a request is made, logged under `label`. */
  const collection = (label: string, view: () => readonly Row[]): object => {
    /** Run one request: log it (even when it fails) and apply due changes after it. */
    const request = <T>(name: string, read: (current: readonly Row[]) => T): T => {
      try {
        return read(view())
      } finally {
        completed(`${label}${name}`)
      }
    }
    const list = (): object[] =>
      request('list', (current) => {
        const items = current.map((row) => {
          const addressed =
            faults.specifiersByUid === true
              ? (current.find((r) => r['uid'] === row['uid']) ?? row)
              : row
          return fakeItem(addressed, faults, requests)
        })
        return faults.shortItems === true ? items.slice(0, -1) : items
      })
    return new Proxy(list, {
      get(target, key, receiver) {
        if (key === 'length') return request('count', (current) => current.length)
        if (key === 'slice') {
          return (first: number, last: number) => {
            for (const position of [first, last]) {
              if (!Number.isInteger(position) || position < 0) {
                throw new Error(`slice was given the position ${String(position)}`)
              }
            }
            return collection(`${label}[${String(first)}..${String(last)}] `, () => {
              const current = view()
              if (last >= current.length || first > last) throw invalidRange()
              return current.slice(first, last + 1)
            })
          }
        }
        if (typeof key !== 'string' || !names.has(key)) {
          return Reflect.get(target, key, receiver) as unknown
        }
        return () =>
          request(`column ${key}`, (current) => {
            if (faults.bulk?.includes(key) === true) throw readFailure(faults.bulkErrorNumber)
            const values = current.map((row) => (Object.hasOwn(row, key) ? row[key] : null))
            return faults.short?.includes(key) === true ? values.slice(0, -1) : values
          })
      },
    })
  }
  return collection('', () => rows)
}

/**
 * The planner app holding `rows` in every collection, answering to `names`. Tasks are reached
 * through the shelf named `Home`; any other shelf name matches nothing.
 */
function fakePlanner(
  rows: readonly Row[],
  faults: Faults = {},
  names: readonly string[] = PLANNER_NAMES
): FakeApp {
  const requests: string[] = []
  const collection = fakeCollection(rows, faults, requests, new Set(names))
  const shelf = (present: boolean): object => ({
    exists: () => present,
    get todos() {
      requests.push('shelf todos')
      return collection
    },
  })
  const app = {
    shelves: {
      whose: (query: Readonly<Record<string, unknown>>) => [shelf(query['name'] === 'Home')],
    },
    folders: collection,
    memos: collection,
  }
  return { app, requests }
}

// ---------------------------------------------------------------------------
// Running a list through the executor
// ---------------------------------------------------------------------------

/**
 * A transport that runs the composed native script in a fresh `node:vm`
 * context whose `Application(...)` is `app`. With `body`, the script runs that
 * body in place of the one the executor planned.
 */
function vmTransport(app: object, body?: string): NativeTransport {
  return {
    run: (script) => {
      const context = createContext({
        ObjC: { import: () => undefined },
        Application: () => app,
      })
      const composed = composeNativeScript(
        body === undefined ? script : { ...script, body },
        NATIVE_CODEC
      )
      const stdout: unknown = runInContext(composed, context)
      return Promise.resolve(parseNativeOutcome(String(stdout)))
    },
  }
}

/** How a list ended: its decoded records, or the error it was rejected with. */
type Settled =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: unknown }

async function settle(promise: Promise<unknown>): Promise<Settled> {
  try {
    return { ok: true, value: await promise }
  } catch (error) {
    return { ok: false, error }
  }
}

/**
 * List `target` through the executor with the batched body it plans, then
 * again over the same data with the per-item reference body.
 */
async function listBoth(
  target: OperationTarget,
  rows: readonly Row[],
  options: { faults?: Faults; input?: WireRecord; outputPlan?: ValuePlan } = {}
): Promise<{ batched: Settled; perItem: Settled; batchedRequests: string[] }> {
  const outputPlan = options.outputPlan ?? PASSTHROUGH_PLAN
  const request = {
    manifest: planner,
    target,
    input: options.input ?? {},
    inputPlan: PASSTHROUGH_PLAN,
    outputPlan,
    resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
  }
  const batchedApp = fakePlanner(rows, options.faults)
  const batched = await settle(
    createNativeExecutor({ transport: vmTransport(batchedApp.app) }).execute(request)
  )
  const reference = buildPerItemListBody(planner, target, outputPlan.kind === 'passthrough')
  const perItem = await settle(
    createNativeExecutor({
      transport: vmTransport(fakePlanner(rows, options.faults).app, reference),
    }).execute(request)
  )
  return { batched, perItem, batchedRequests: batchedApp.requests }
}

/** The decoded records of a list that must have succeeded. */
function recordsOf(settled: Settled): unknown {
  if (!settled.ok) throw new Error(`the list failed: ${String(settled.error)}`)
  return settled.value
}

/** The error of a list that must have failed. */
function errorOf(settled: Settled): unknown {
  if (settled.ok) throw new Error('the list succeeded')
  return settled.error
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/** Three tasks keyed by the app's names, each with a distinct value per property. */
const TASK_ROWS: readonly Row[] = [
  { title: 'Plan', done: false, priority: 1, url: 'https://a.example', secret: 's1', uid: 'T1' },
  { title: 'Build', done: true, priority: 5, url: 'https://b.example', secret: 's2', uid: 'T2' },
  { title: 'Ship', done: false, priority: 9, url: 'https://c.example', secret: 's3', uid: 'T3' },
]

const FOLDER_ROWS: readonly Row[] = [
  { name: 'Inbox', folderKey: 'K1', color: 'red' },
  { name: 'Archive', folderKey: 'K2', color: 'blue' },
]

/** A typed output for tasks: every property optional and nullable, as manifests derive. */
const TASK_LIST_PLAN: ValuePlan = {
  kind: 'array',
  items: {
    kind: 'record',
    fields: {
      title: { value: { kind: 'nullable', value: { kind: 'string' } }, presence: 'optional' },
      done: { value: { kind: 'nullable', value: { kind: 'boolean' } }, presence: 'optional' },
      priority: { value: { kind: 'nullable', value: { kind: 'integer' } }, presence: 'optional' },
      uRL: { value: { kind: 'nullable', value: { kind: 'string' } }, presence: 'optional' },
      secret: { value: { kind: 'nullable', value: { kind: 'string' } }, presence: 'optional' },
      uID: { value: { kind: 'string' }, presence: 'required' },
    },
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('list bodies read each property once across the collection', () => {
  it('lists several items keyed by public names, deeply equal to the per-item read', async () => {
    const { batched, perItem } = await listBoth(TASKS, TASK_ROWS, { input: SHELF_INPUT })
    expect(recordsOf(batched)).toEqual([
      {
        title: 'Plan',
        done: false,
        priority: 1,
        uRL: 'https://a.example',
        secret: 's1',
        uID: 'T1',
        id: 'T1',
      },
      {
        title: 'Build',
        done: true,
        priority: 5,
        uRL: 'https://b.example',
        secret: 's2',
        uID: 'T2',
        id: 'T2',
      },
      {
        title: 'Ship',
        done: false,
        priority: 9,
        uRL: 'https://c.example',
        secret: 's3',
        uID: 'T3',
        id: 'T3',
      },
    ])
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
  })

  it('decodes a typed list deeply equal to the per-item read', async () => {
    const { batched, perItem } = await listBoth(TASKS, TASK_ROWS, {
      input: SHELF_INPUT,
      outputPlan: TASK_LIST_PLAN,
    })
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
    // A typed output carries no `id` alias.
    expect(recordsOf(batched)).toEqual(
      TASK_ROWS.map((row) => ({
        title: row['title'],
        done: row['done'],
        priority: { [WIRE_KEYS.integer]: String(row['priority']) },
        uRL: row['url'],
        secret: row['secret'],
        uID: row['uid'],
      }))
    )
  })

  it('makes one request per property, whatever the item count, and none per item', async () => {
    const many: Row[] = Array.from({ length: 50 }, (_, i) => ({
      title: `t${String(i)}`,
      done: i % 2 === 0,
      priority: i,
      url: `https://${String(i)}.example`,
      secret: `s${String(i)}`,
      uid: `T${String(i)}`,
    }))
    const { batched, perItem, batchedRequests } = await listBoth(TASKS, many, {
      input: SHELF_INPUT,
    })
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
    // The identifier read counts the items; then one read per other property,
    // each by the app's name; then exactly one more identifier read, which
    // confirms no item moved meanwhile.
    expect(batchedRequests).toEqual([
      'shelf todos',
      'column uid',
      'column title',
      'column done',
      'column priority',
      'column url',
      'column secret',
      'column uid',
    ])
  })

  it('returns an empty list for a collection with no items', async () => {
    const { batched, perItem, batchedRequests } = await listBoth(TASKS, [], { input: SHELF_INPUT })
    expect(recordsOf(batched)).toEqual([])
    expect(recordsOf(perItem)).toEqual([])
    expect(batchedRequests).not.toContain('list')
  })
})

describe('list bodies: a missing value keeps its position', () => {
  const rows: readonly Row[] = [
    { title: 'Plan', done: false, priority: 1, url: 'https://a.example', secret: 's1', uid: 'T1' },
    { title: null, done: true, priority: null, url: 'https://b.example', secret: 's2', uid: 'T2' },
    { title: 'Ship', done: false, priority: 9, url: null, secret: 's3', uid: 'T3' },
  ]

  it('maps a missing value in the middle of a column to null, with its neighbors aligned', async () => {
    const { batched, perItem } = await listBoth(TASKS, rows, { input: SHELF_INPUT })
    expect(recordsOf(batched)).toEqual([
      {
        title: 'Plan',
        done: false,
        priority: 1,
        uRL: 'https://a.example',
        secret: 's1',
        uID: 'T1',
        id: 'T1',
      },
      {
        title: null,
        done: true,
        priority: null,
        uRL: 'https://b.example',
        secret: 's2',
        uID: 'T2',
        id: 'T2',
      },
      { title: 'Ship', done: false, priority: 9, uRL: null, secret: 's3', uID: 'T3', id: 'T3' },
    ])
    // The per-item record reports a missing value as a null field too.
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
  })

  it('keeps a missing value as null through a typed contract, as the per-item read did', async () => {
    const { batched, perItem } = await listBoth(TASKS, rows, {
      input: SHELF_INPUT,
      outputPlan: TASK_LIST_PLAN,
    })
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
    const records = recordsOf(batched) as readonly Readonly<Record<string, unknown>>[]
    expect(records[1]).toMatchObject({ title: null, priority: null, uID: 'T2' })
    expect(records[2]).toMatchObject({ uRL: null, uID: 'T3' })
  })
})

describe('list bodies: items that share an identifier', () => {
  it('gives each item its own values where the per-item read repeated the first', async () => {
    // Regression: Calendar lists events by their uid, and several events can
    // share one, so reading each through its specifier reached the first of
    // them every time.
    const rows: readonly Row[] = [
      {
        title: 'First',
        done: false,
        priority: 1,
        url: 'https://a.example',
        secret: 's1',
        uid: 'R',
      },
      {
        title: 'Second',
        done: true,
        priority: 2,
        url: 'https://b.example',
        secret: 's2',
        uid: 'R',
      },
    ]
    const { batched, perItem } = await listBoth(TASKS, rows, {
      faults: { specifiersByUid: true },
      input: SHELF_INPUT,
    })
    expect(recordsOf(batched)).toEqual([
      {
        title: 'First',
        done: false,
        priority: 1,
        uRL: 'https://a.example',
        secret: 's1',
        uID: 'R',
        id: 'R',
      },
      {
        title: 'Second',
        done: true,
        priority: 2,
        uRL: 'https://b.example',
        secret: 's2',
        uID: 'R',
        id: 'R',
      },
    ])
    const repeated = (recordsOf(perItem) as readonly unknown[])[0]
    expect(recordsOf(perItem)).toEqual([repeated, repeated])
  })
})

describe('list bodies: a property the app cannot read across the collection', () => {
  it('falls back to reading that property per item, while the others stay one request each', async () => {
    const faults: Faults = { bulk: ['secret'] }
    const { batched, perItem, batchedRequests } = await listBoth(TASKS, TASK_ROWS, {
      faults,
      input: SHELF_INPUT,
    })
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
    expect(recordsOf(batched)).toEqual(
      expect.arrayContaining([expect.objectContaining({ secret: 's2', uID: 'T2' })])
    )
    expect(batchedRequests).toEqual([
      'shelf todos',
      'column uid',
      'column title',
      'column done',
      'column priority',
      'column url',
      'column secret',
      'list',
      'item secret',
      'item secret',
      'item secret',
      'column uid',
    ])
  })

  it('omits a property the app can read neither across the collection nor per item', async () => {
    // Like a Calendar calendar's calendarIdentifier: the item's whole record
    // fails too, so the per-item read falls back to per-field reads.
    const faults: Faults = { bulk: ['secret'], perItem: ['secret'] }
    const { batched, perItem } = await listBoth(TASKS, TASK_ROWS, { faults, input: SHELF_INPUT })
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
    expect(recordsOf(batched)).toEqual(
      TASK_ROWS.map((row) => ({
        title: row['title'],
        done: row['done'],
        priority: row['priority'],
        uRL: row['url'],
        uID: row['uid'],
        id: row['uid'],
      }))
    )
  })
})

describe('list bodies: a failed request is never taken for an unreadable property', () => {
  // Each communication failure and the error the executor classifies it as.
  const FAILURES = [
    [COMMUNICATION_FAILURE_ERROR_NUMBERS.appNotRunning, AppUnavailableError],
    [COMMUNICATION_FAILURE_ERROR_NUMBERS.connectionInvalid, AppUnavailableError],
    [COMMUNICATION_FAILURE_ERROR_NUMBERS.noReply, AppUnavailableError],
    [COMMUNICATION_FAILURE_ERROR_NUMBERS.userCancelled, AppOperationError],
    [COMMUNICATION_FAILURE_ERROR_NUMBERS.notAuthorized, AppAuthorizationRequiredError],
  ] as const

  it.each(FAILURES)(
    'fails the list when a read across the collection fails with %i, instead of falling back',
    async (errorNumber, errorClass) => {
      const { batched, batchedRequests } = await listBoth(TASKS, TASK_ROWS, {
        faults: { bulk: ['secret'], bulkErrorNumber: errorNumber },
        input: SHELF_INPUT,
      })
      expect(errorOf(batched)).toBeInstanceOf(errorClass)
      // No per-item read was tried, and no records were returned without `secret`.
      expect(batchedRequests).not.toContain('list')
      expect(batchedRequests.at(-1)).toBe('column secret')
    }
  )

  it.each(FAILURES)(
    'fails the list when a guarded per-item read fails with %i, instead of omitting the field',
    async (errorNumber, errorClass) => {
      const { batched } = await listBoth(TASKS, TASK_ROWS, {
        faults: { bulk: ['secret'], perItem: ['secret'], perItemErrorNumber: errorNumber },
        input: SHELF_INPUT,
      })
      expect(errorOf(batched)).toBeInstanceOf(errorClass)
    }
  )

  it.each(FAILURES)(
    'fails the list when the identifier read across the collection fails with %i, without reading per item',
    async (errorNumber, errorClass) => {
      const { batched, batchedRequests } = await listBoth(TASKS, TASK_ROWS, {
        faults: { bulk: ['uid'], bulkErrorNumber: errorNumber },
        input: SHELF_INPUT,
      })
      expect(errorOf(batched)).toBeInstanceOf(errorClass)
      expect(batchedRequests).toEqual(['shelf todos', 'column uid'])
    }
  )

  it('still falls back to per-item reads for a property that fails only across the collection (-1741)', async () => {
    // A Notes note's body fails across the collection with -1741 and reads per item.
    const { batched, perItem, batchedRequests } = await listBoth(TASKS, TASK_ROWS, {
      faults: { bulk: ['secret'], bulkErrorNumber: -1741 },
      input: SHELF_INPUT,
    })
    expect(recordsOf(batched)).toEqual(taskRecords(TASK_ROWS))
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
    expect(batchedRequests).toContain('item secret')
  })

  it('still omits a property that fails both ways with a number other than a communication failure', async () => {
    const { batched, perItem } = await listBoth(TASKS, TASK_ROWS, {
      faults: {
        bulk: ['secret'],
        perItem: ['secret'],
        bulkErrorNumber: -1728,
        perItemErrorNumber: -1700,
      },
      input: SHELF_INPUT,
    })
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
    expect(recordsOf(batched)).toEqual(
      taskRecords(TASK_ROWS).map(({ secret: _secret, ...rest }) => rest)
    )
  })
})

describe('list bodies: the identifier read is never guarded', () => {
  it('fails the list when the identifier can be read neither across the collection nor per item', async () => {
    const faults: Faults = { bulk: ['uid'], perItem: ['uid'] }
    const { batched, perItem } = await listBoth(TASKS, TASK_ROWS, { faults, input: SHELF_INPUT })
    for (const settled of [batched, perItem]) {
      const error = errorOf(settled)
      expect(error).toBeInstanceOf(AppOperationError)
      expect(error).toMatchObject({ details: { appErrorCode: READ_FAILED } })
    }
  })

  it('reads the identifier per item, unguarded, when only the read across the collection fails', async () => {
    const faults: Faults = { bulk: ['uid'] }
    const { batched, perItem, batchedRequests } = await listBoth(TASKS, TASK_ROWS, {
      faults,
      input: SHELF_INPUT,
    })
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
    expect(batchedRequests.slice(0, 6)).toEqual([
      'shelf todos',
      'column uid',
      'list',
      'item uid',
      'item uid',
      'item uid',
    ])
  })

  it('fails the list when the identifier names a property the app does not have', async () => {
    // A misconfigured identifier must surface, never yield records without ids.
    const rows = TASK_ROWS.map(({ uid: _uid, ...rest }) => rest)
    const { app } = fakePlanner(
      rows,
      {},
      PLANNER_NAMES.filter((name) => name !== 'uid')
    )
    const result = await settle(
      createNativeExecutor({ transport: vmTransport(app) }).execute({
        manifest: planner,
        target: TASKS,
        input: SHELF_INPUT,
        inputPlan: PASSTHROUGH_PLAN,
        outputPlan: PASSTHROUGH_PLAN,
        resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
      })
    )
    expect(errorOf(result)).toBeInstanceOf(AppOperationError)
  })
})

/**
 * The error a list fails with when its collection changed while it was read:
 * a changed collection, retryable, with no details (an identifier that
 * revealed the change may be user content).
 */
function expectCollectionChanged(error: unknown): void {
  expect(error).toBeInstanceOf(CollectionChangedError)
  expect(error).toMatchObject({ code: 'COLLECTION_CHANGED', details: {} })
}

/** The passthrough records the planner lists for task rows, in row order. */
function taskRecords(rows: readonly Row[]): readonly Readonly<Record<string, unknown>>[] {
  return rows.map((row) => ({
    title: row['title'],
    done: row['done'],
    priority: row['priority'],
    uRL: row['url'],
    secret: row['secret'],
    uID: row['uid'],
    id: row['uid'],
  }))
}

describe('list bodies: items that move while the list is read', () => {
  it('reads again from the start when items swap places, and pairs every value with its item', async () => {
    // The items reverse right after the first identifier read, so the
    // properties are read in the new order while the identifiers hold the
    // old one. Equal lengths hide that; the second identifier read does not.
    const { batched, batchedRequests } = await listBoth(TASKS, TASK_ROWS, {
      faults: { reorder: { after: 'column uid', times: 'once' } },
      input: SHELF_INPUT,
    })
    expect(recordsOf(batched)).toEqual(taskRecords([...TASK_ROWS].reverse()))
    const attempt = [
      'column uid',
      'column title',
      'column done',
      'column priority',
      'column url',
      'column secret',
      'column uid',
    ]
    expect(batchedRequests).toEqual(['shelf todos', ...attempt, ...attempt])
  })

  it('fails as a changed collection when items swap places during every read', async () => {
    const { batched, batchedRequests } = await listBoth(TASKS, TASK_ROWS, {
      faults: { reorder: { after: 'column uid', times: 'always' } },
      input: SHELF_INPUT,
    })
    expectCollectionChanged(errorOf(batched))
    // Two attempts of two identifier reads each, never a third attempt.
    expect(batchedRequests.filter((request) => request === 'column uid')).toHaveLength(4)
  })

  it('lists the items afresh for a per-item read when the read starts again', async () => {
    // `secret` is read per item. An item joins right after the first item
    // list, so the first attempt's identifier check fails; the second attempt
    // must list four items, not reuse the three-item list, or the new item
    // would lose its secret.
    const added: Row = {
      title: 'Test',
      done: false,
      priority: 3,
      url: 'https://d.example',
      secret: 's4',
      uid: 'T4',
    }
    const { batched, batchedRequests } = await listBoth(TASKS, TASK_ROWS, {
      faults: { bulk: ['secret'], grow: { after: 'list', times: 'once', row: added } },
      input: SHELF_INPUT,
    })
    expect(recordsOf(batched)).toEqual(taskRecords([...TASK_ROWS, added]))
    expect(batchedRequests.filter((request) => request === 'list')).toHaveLength(2)
  })
})

describe('list bodies: every read must cover the same items', () => {
  it('fails as an unexpected value when a read gives too few values in both attempts while the identifiers stay the same', async () => {
    const { batched, batchedRequests } = await listBoth(TASKS, TASK_ROWS, {
      faults: { short: ['url'] },
      input: SHELF_INPUT,
    })
    const error = errorOf(batched)
    expect(error).toBeInstanceOf(UnexpectedValueError)
    expect(error).toMatchObject({
      details: {
        issues: [
          {
            path: [],
            message:
              'Reading the property "uRL" gave 2 values for 3 items, so the records cannot be assembled.',
          },
        ],
      },
    })
    // Each attempt stops reading columns at the misaligned read, then reads
    // the identifiers again to tell a changed collection from an
    // inconsistent answer; they are the same, so the app answered
    // inconsistently, and no third attempt is made.
    const attempt = [
      'column uid',
      'column title',
      'column done',
      'column priority',
      'column url',
      'column uid',
    ]
    expect(batchedRequests).toEqual(['shelf todos', ...attempt, ...attempt])
  })

  it('fails as a changed collection when the first attempt saw the identifiers change and the second a misaligned read', async () => {
    // Attempt 1: the items reverse after the first identifier read, so its
    // second identifier read differs. Attempt 2: the identifiers hold, but
    // `url` is short again. Either attempt seeing a change makes the whole
    // list a changed collection.
    const { batched } = await listBoth(TASKS, TASK_ROWS, {
      faults: { short: ['url'], reorder: { after: 'column uid', times: 'once' } },
      input: SHELF_INPUT,
    })
    expectCollectionChanged(errorOf(batched))
  })

  it('fails with a codec error when the item list does not match the identifiers', async () => {
    const { batched } = await listBoth(TASKS, TASK_ROWS, {
      faults: { bulk: ['secret'], shortItems: true },
      input: SHELF_INPUT,
    })
    const error = errorOf(batched)
    expect(error).toBeInstanceOf(UnexpectedValueError)
    expect(error).toMatchObject({
      details: {
        issues: [
          {
            path: [],
            message:
              'Reading the items gave 2 values for 3 items, so the records cannot be assembled.',
          },
        ],
      },
    })
  })

  it('throws the codec marker the executor classifies as an unexpected value', () => {
    const body = buildNativeBody(planner, TASKS)
    const { app } = fakePlanner(TASK_ROWS, { short: ['title'] })
    const compiled: unknown = runInContext(
      `(function (app, args) {\n${body}\n})`,
      createContext({})
    )
    if (typeof compiled !== 'function') throw new Error('the body did not compile')
    let thrown: unknown
    try {
      Reflect.apply(compiled, undefined, [app, SHELF_INPUT])
    } catch (error) {
      thrown = error
    }
    expect(thrown).toEqual({
      name: NATIVE_CODEC_ERROR_NAME,
      direction: 'encode',
      path: [],
      message:
        'Reading the property "title" gave 2 values for 3 items, so the records cannot be assembled.',
    })
  })
})

describe('list bodies: identifier targeting by a working property', () => {
  it('never reads the declared identifier, and mirrors the working one into it', async () => {
    const { batched, perItem, batchedRequests } = await listBoth(FOLDERS, FOLDER_ROWS)
    expect(recordsOf(batched)).toEqual([
      { color: 'red', name: 'Inbox', id: 'Inbox', folderKey: 'Inbox' },
      { color: 'blue', name: 'Archive', id: 'Archive', folderKey: 'Archive' },
    ])
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
    expect(batchedRequests).toEqual(['column name', 'column color', 'column name'])
  })

  it('leaves the declared identifier absent from a typed list', async () => {
    const plan: ValuePlan = {
      kind: 'array',
      items: {
        kind: 'record',
        fields: {
          name: { value: { kind: 'string' }, presence: 'required' },
          folderKey: { value: { kind: 'string' }, presence: 'optional' },
          color: { value: { kind: 'nullable', value: { kind: 'string' } }, presence: 'optional' },
        },
      },
    }
    const { batched, perItem } = await listBoth(FOLDERS, FOLDER_ROWS, { outputPlan: plan })
    expect(recordsOf(batched)).toEqual([
      { color: 'red', name: 'Inbox' },
      { color: 'blue', name: 'Archive' },
    ])
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
  })
})

describe('list bodies: a resource with no identifier', () => {
  it('counts the items, reads each property once, then counts again', async () => {
    const rows: readonly Row[] = [{ text: 'a' }, { text: null }, { text: 'c' }]
    const { batched, perItem, batchedRequests } = await listBoth(MEMOS, rows)
    expect(recordsOf(batched)).toEqual([{ text: 'a' }, { text: null }, { text: 'c' }])
    expect(recordsOf(batched)).toEqual(recordsOf(perItem))
    expect(batchedRequests).toEqual(['count', 'column text', 'count'])
  })

  it('reads again from the start when an item joins during the read', async () => {
    const rows: readonly Row[] = [{ text: 'a' }, { text: 'b' }]
    const { batched, batchedRequests } = await listBoth(MEMOS, rows, {
      faults: { grow: { after: 'column text', times: 'once', row: { text: 'c' } } },
    })
    expect(recordsOf(batched)).toEqual([{ text: 'a' }, { text: 'b' }, { text: 'c' }])
    expect(batchedRequests).toEqual([
      'count',
      'column text',
      'count',
      'count',
      'column text',
      'count',
    ])
  })

  it('fails as a changed collection when items keep joining during every read', async () => {
    const rows: readonly Row[] = [{ text: 'a' }, { text: 'b' }]
    const { batched, batchedRequests } = await listBoth(MEMOS, rows, {
      faults: { grow: { after: 'column text', times: 'always', row: { text: 'n' } } },
    })
    expectCollectionChanged(errorOf(batched))
    // Read twice, never a third time.
    expect(batchedRequests.filter((request) => request === 'column text')).toHaveLength(2)
  })

  it('returns an empty list when the count is zero', async () => {
    const { batched, perItem } = await listBoth(MEMOS, [])
    expect(recordsOf(batched)).toEqual([])
    expect(recordsOf(perItem)).toEqual([])
  })
})

describe('list bodies: a parent that does not exist', () => {
  it('fails as a missing target without reading the collection, as the per-item read did', async () => {
    const { batched, perItem, batchedRequests } = await listBoth(TASKS, TASK_ROWS, {
      input: { shelfId: 'Nowhere' },
    })
    expect(errorOf(batched)).toBeInstanceOf(TargetNotFoundError)
    expect(errorOf(perItem)).toBeInstanceOf(TargetNotFoundError)
    expect(batchedRequests).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Paged lists
// ---------------------------------------------------------------------------

/** Seven tasks, enough for several pages; each has its own identifier and title. */
const SEVEN_TASKS: readonly Row[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((uid, i) => ({
  title: `Task ${String(i + 1)}`,
  done: false,
  priority: i,
  url: null,
  secret: null,
  uid,
}))

/** A page window result as the executor returns it for a paged list. */
interface WindowResult {
  readonly items: readonly Readonly<Record<string, unknown>>[]
  readonly length: number
  readonly last?: string | number
}

function isWindowResult(value: unknown): value is WindowResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray(value.items) &&
    'length' in value &&
    typeof value.length === 'number'
  )
}

/**
 * The planner app with its tasks read by `read`, with measured costs that
 * agree with that choice.
 */
function plannerReading(read: PageRead): AppManifest {
  const manifest = structuredClone(planner)
  const tasks = manifest.resources['Task']
  if (tasks?.rangeRead?.supported !== true) throw new Error('fixture tasks do not page')
  const { evidence } = tasks.rangeRead
  if (evidence.cost === undefined) throw new Error('fixture tasks record no page cost')
  const times = read === 'column' ? { pageMs: 900, columnMs: 400 } : { pageMs: 400, columnMs: 900 }
  tasks.rangeRead = {
    ...tasks.rangeRead,
    read,
    evidence: { ...evidence, cost: { ...evidence.cost, ...times } },
  }
  return manifest
}

/** The planner app for each page read. */
const PLANNERS: Readonly<Record<PageRead, AppManifest>> = {
  range: plannerReading('range'),
  column: plannerReading('column'),
}

/**
 * How the stand-in logs the read of the property `name` (the app's name) that
 * a page makes over the positions `first` to `last`, inclusive: by range, a
 * read of exactly that range; by column, a read of the whole collection.
 */
function pageRequest(read: PageRead, first: number, last: number, name: string): string {
  return read === 'range' ? `[${String(first)}..${String(last)}] column ${name}` : `column ${name}`
}

/** Read one page window of the tasks through the executor, against `app`, by `read`. */
async function readWindow(
  app: FakeApp,
  page: PageWindow,
  read: PageRead,
  outputPlan: ValuePlan = PASSTHROUGH_PLAN
): Promise<Settled> {
  return settle(
    createNativeExecutor({ transport: vmTransport(app.app) }).execute({
      manifest: PLANNERS[read],
      target: TASKS,
      input: SHELF_INPUT,
      inputPlan: PASSTHROUGH_PLAN,
      outputPlan,
      resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
      page,
    })
  )
}

/** The window result of a paged read that must have succeeded. */
function windowOf(settled: Settled): WindowResult {
  const value = recordsOf(settled)
  if (!isWindowResult(value)) throw new Error('the paged read did not return a window result')
  return value
}

/**
 * Page through the tasks of `app` as a caller continuing from each page's
 * last item would: the next window starts after the items returned and is
 * anchored on the last of them, until `offset + size` reaches the length.
 */
async function pageThrough(app: FakeApp, size: number, read: PageRead): Promise<WindowResult[]> {
  const pages: WindowResult[] = []
  let page: PageWindow = { offset: 0, size }
  for (;;) {
    const result = windowOf(await readWindow(app, page, read))
    pages.push(result)
    if (page.offset + size >= result.length) return pages
    if (result.last === undefined) throw new Error('a page with more remaining had no last item')
    page = { offset: page.offset + result.items.length, size, anchor: result.last }
  }
}

/** The task identifiers of a window's records, in order. */
function uidsOf(result: WindowResult): unknown[] {
  return result.items.map((item) => item['uID'])
}

describe('paged list bodies: which lists may page', () => {
  it.each([
    { label: 'whose identifier makes no uniqueness claim', target: FOLDERS },
    { label: 'whose resource has no identifier', target: MEMOS },
  ])('refuses to build a paged body for a list $label', ({ target }) => {
    expect(() => buildNativeBody(planner, target, { paged: true })).toThrow(
      'A list cannot be paged unless its primary identifier is claimed unique and its collection is known to read ranges.'
    )
  })

  it('refuses to build a paged body for a unique identifier whose range read is not recorded', () => {
    const unobserved = structuredClone(planner)
    const tasks = unobserved.resources['Task']
    if (tasks === undefined) throw new Error('fixture has no Task resource')
    delete tasks.rangeRead
    expect(() => buildNativeBody(unobserved, TASKS, { paged: true })).toThrow(
      'A list cannot be paged unless its primary identifier is claimed unique and its collection is known to read ranges.'
    )
  })

  it('builds a paged body for a list whose identifier is claimed unique and whose range reads passed', () => {
    expect(buildNativeBody(planner, TASKS, { paged: true })).toContain('anchorHolds')
  })
})

/** The properties of a task a page reads besides its identifier, in the app's spelling. */
const TASK_PROPERTY_READS = ['title', 'done', 'priority', 'url', 'secret'] as const

/** Thirty tasks, enough for a page of the default size with more after it. */
const THIRTY_TASKS: readonly Row[] = Array.from({ length: 30 }, (_unused, i) => ({
  title: `Task ${String(i + 1)}`,
  done: false,
  priority: i,
  url: null,
  secret: null,
  uid: `T${String(i + 1)}`,
}))

describe.each(PAGE_READS)('paged list bodies read by %s: the requests a page makes', (read) => {
  // The page-cost regression: a page must cost a fixed number of requests,
  // one per property and the fixed length, anchor and identifier reads,
  // whatever its size and however the app answers each read. A read that
  // went item by item would grow with the page.
  const fixed = (continuing: boolean): number =>
    // The parent, the length, the identifiers before and after the properties,
    // and for a continuing page the anchor before and after the reads.
    1 + 1 + 2 + (continuing ? 2 : 0)

  it.each([2, 25])(
    'reads a first page of %i in one request per property plus the fixed reads, and none per item',
    async (size) => {
      const app = fakePlanner(THIRTY_TASKS)
      const result = windowOf(await readWindow(app, { offset: 0, size }, read))
      expect(result.items).toHaveLength(size)
      expect(app.requests).toHaveLength(fixed(false) + TASK_PROPERTY_READS.length)
      expect(app.requests.filter((request) => request.startsWith('item '))).toEqual([])
      expect(app.requests).toEqual([
        'shelf todos',
        'count',
        pageRequest(read, 0, size - 1, 'uid'),
        ...TASK_PROPERTY_READS.map((name) => pageRequest(read, 0, size - 1, name)),
        pageRequest(read, 0, size - 1, 'uid'),
      ])
    }
  )

  it.each([2, 25])(
    'reads a continuing page of %i in the same requests plus the anchor before and after',
    async (size) => {
      const app = fakePlanner(THIRTY_TASKS)
      const result = windowOf(await readWindow(app, { offset: 3, size, anchor: 'T3' }, read))
      expect(result.items).toHaveLength(size)
      expect(app.requests).toHaveLength(fixed(true) + TASK_PROPERTY_READS.length)
      expect(app.requests).toEqual([
        'shelf todos',
        'count',
        pageRequest(read, 2, 2, 'uid'),
        pageRequest(read, 3, 3 + size - 1, 'uid'),
        ...TASK_PROPERTY_READS.map((name) => pageRequest(read, 3, 3 + size - 1, name)),
        pageRequest(read, 3, 3 + size - 1, 'uid'),
        pageRequest(read, 2, 2, 'uid'),
      ])
    }
  )
})

describe('paged list bodies: what each page read covers', () => {
  it('by range, reads only the window, never the whole collection', async () => {
    const app = fakePlanner(THIRTY_TASKS)
    windowOf(await readWindow(app, { offset: 3, size: 25, anchor: 'T3' }, 'range'))
    expect(app.requests.filter((request) => request.startsWith('column '))).toEqual([])
  })

  it('by column, reads the whole collection, never a range', async () => {
    const app = fakePlanner(THIRTY_TASKS)
    windowOf(await readWindow(app, { offset: 3, size: 25, anchor: 'T3' }, 'column'))
    expect(app.requests.filter((request) => request.startsWith('['))).toEqual([])
  })

  it('gives the same page either way', async () => {
    const page = { offset: 3, size: 4, anchor: 'T3' }
    const byRange = windowOf(await readWindow(fakePlanner(SEVEN_TASKS), page, 'range'))
    const byColumn = windowOf(await readWindow(fakePlanner(SEVEN_TASKS), page, 'column'))
    expect(byColumn).toEqual(byRange)
    expect(uidsOf(byColumn)).toEqual(['T4', 'T5', 'T6', 'T7'])
  })
})

describe.each(PAGE_READS)('paged list bodies read by %s: an unchanged collection', (read) => {
  it('pages together hold every item exactly once, and only the last page reaches the end', async () => {
    const app = fakePlanner(SEVEN_TASKS)
    const pages = await pageThrough(app, 3, read)
    expect(pages.map(uidsOf)).toEqual([['T1', 'T2', 'T3'], ['T4', 'T5', 'T6'], ['T7']])
    expect(pages.map((page) => page.length)).toEqual([7, 7, 7])
    expect(pages.map((page) => page.last)).toEqual(['T3', 'T6', 'T7'])
  })

  it('returns the same records a whole-collection read gives for the same items, through a typed plan', async () => {
    const app = fakePlanner(TASK_ROWS)
    const result = windowOf(await readWindow(app, { offset: 0, size: 25 }, read, TASK_LIST_PLAN))
    const whole = await listBoth(TASKS, TASK_ROWS, {
      input: SHELF_INPUT,
      outputPlan: TASK_LIST_PLAN,
    })
    expect(result.items).toEqual(recordsOf(whole.batched))
    expect(result.length).toBe(3)
  })

  it('returns a window from the middle of the collection with its values aligned', async () => {
    const app = fakePlanner(SEVEN_TASKS)
    const result = windowOf(await readWindow(app, { offset: 2, size: 3, anchor: 'T2' }, read))
    expect(result.items).toEqual([
      { title: 'Task 3', done: false, priority: 2, uRL: null, secret: null, uID: 'T3', id: 'T3' },
      { title: 'Task 4', done: false, priority: 3, uRL: null, secret: null, uID: 'T4', id: 'T4' },
      { title: 'Task 5', done: false, priority: 4, uRL: null, secret: null, uID: 'T5', id: 'T5' },
    ])
    expect(result).toMatchObject({ length: 7, last: 'T5' })
  })

  it('reads the first page with no anchor read', async () => {
    const app = fakePlanner(SEVEN_TASKS)
    windowOf(await readWindow(app, { offset: 0, size: 3 }, read))
    expect(app.requests).toEqual([
      'shelf todos',
      'count',
      pageRequest(read, 0, 2, 'uid'),
      ...TASK_PROPERTY_READS.map((name) => pageRequest(read, 0, 2, name)),
      pageRequest(read, 0, 2, 'uid'),
    ])
  })

  it('reads an exact last page up to the last item, never past it', async () => {
    const app = fakePlanner(SEVEN_TASKS.slice(0, 6))
    const result = windowOf(await readWindow(app, { offset: 3, size: 3, anchor: 'T3' }, read))
    expect(uidsOf(result)).toEqual(['T4', 'T5', 'T6'])
    expect(result.length).toBe(6)
    expect(result.last).toBe('T6')
    expect(app.requests).toContain(pageRequest(read, 3, 5, 'title'))
  })

  it('shortens a page the collection ends inside to the items that remain', async () => {
    const app = fakePlanner(SEVEN_TASKS)
    const result = windowOf(await readWindow(app, { offset: 6, size: 3, anchor: 'T6' }, read))
    expect(uidsOf(result)).toEqual(['T7'])
    expect(result).toMatchObject({ length: 7, last: 'T7' })
    expect(app.requests).toContain(pageRequest(read, 6, 6, 'title'))
  })

  it('returns an empty page with no cursor anchor, reading no items, when the window starts one past the last item', async () => {
    const app = fakePlanner(SEVEN_TASKS.slice(0, 6))
    const result = windowOf(await readWindow(app, { offset: 6, size: 3, anchor: 'T6' }, read))
    expect(result).toEqual({ items: [], length: 6 })
    expect(app.requests).toEqual(['shelf todos', 'count', pageRequest(read, 5, 5, 'uid')])
  })

  it('reads every page of one item', async () => {
    const app = fakePlanner(SEVEN_TASKS)
    const pages = await pageThrough(app, 1, read)
    expect(pages.map(uidsOf)).toEqual([['T1'], ['T2'], ['T3'], ['T4'], ['T5'], ['T6'], ['T7']])
    expect(app.requests).toContain(pageRequest(read, 4, 4, 'title'))
  })

  it('returns an empty page for an empty collection', async () => {
    const app = fakePlanner([])
    const result = windowOf(await readWindow(app, { offset: 0, size: 25 }, read))
    expect(result).toEqual({ items: [], length: 0 })
  })
})

describe.each(PAGE_READS)(
  'paged list bodies read by %s: the collection changes between pages',
  (read) => {
    const added = (uid: string): Row => ({
      title: `Added ${uid}`,
      done: false,
      priority: 0,
      url: null,
      secret: null,
      uid,
    })

    it('an item inserted right after the anchor is read on the next page, with nothing skipped or repeated', async () => {
      const app = fakePlanner(SEVEN_TASKS, {
        mutate: {
          after: pageRequest(read, 0, 2, 'uid'),
          times: 'once',
          change: (rows) => [...rows.slice(0, 3), added('N1'), ...rows.slice(3)],
        },
      })
      // The insert lands during the first page's first identifier read, after
      // the anchor T3, so it shifts nothing the first page returns.
      const first = windowOf(await readWindow(app, { offset: 0, size: 3 }, read))
      expect(uidsOf(first)).toEqual(['T1', 'T2', 'T3'])
      const second = windowOf(await readWindow(app, { offset: 3, size: 3, anchor: 'T3' }, read))
      expect(uidsOf(second)).toEqual(['N1', 'T4', 'T5'])
    })

    it('an item removed after the anchor is harmless', async () => {
      const shrunk = fakePlanner(SEVEN_TASKS.filter((row) => row['uid'] !== 'T5'))
      const second = windowOf(await readWindow(shrunk, { offset: 3, size: 3, anchor: 'T3' }, read))
      expect(uidsOf(second)).toEqual(['T4', 'T6', 'T7'])
    })

    it('fails as a changed collection when the anchor was deleted', async () => {
      const app = fakePlanner(SEVEN_TASKS.filter((row) => row['uid'] !== 'T3'))
      expectCollectionChanged(
        errorOf(await readWindow(app, { offset: 3, size: 3, anchor: 'T3' }, read))
      )
      // Detected by the anchor check, before any item of the window is read.
      expect(app.requests).toEqual(['shelf todos', 'count', pageRequest(read, 2, 2, 'uid')])
    })

    it('fails as a changed collection when the anchor moved', async () => {
      const app = fakePlanner([...SEVEN_TASKS].reverse())
      expectCollectionChanged(
        errorOf(await readWindow(app, { offset: 3, size: 3, anchor: 'T3' }, read))
      )
    })

    it('fails as a changed collection when the collection shrank below the anchor', async () => {
      const app = fakePlanner(SEVEN_TASKS.slice(0, 2))
      expectCollectionChanged(
        errorOf(await readWindow(app, { offset: 3, size: 3, anchor: 'T3' }, read))
      )
      // The length already shows the anchor's position is gone; no item is read.
      expect(app.requests).toEqual(['shelf todos', 'count'])
    })

    it('fails as a changed collection when the anchor read fails because the collection shrank after it was counted', async () => {
      const app = fakePlanner(SEVEN_TASKS, {
        mutate: { after: 'count', times: 'once', change: (rows) => rows.slice(0, 2) },
      })
      expectCollectionChanged(
        errorOf(await readWindow(app, { offset: 3, size: 3, anchor: 'T3' }, read))
      )
    })

    it('fails as a changed collection, never as an invalid selection, when the window is gone because the collection shrank during the read', async () => {
      // Three items go after every anchor check (and, by column, after every
      // identifier read), so in each attempt the window computed from the
      // length just read runs past the end.
      const app = fakePlanner(SEVEN_TASKS, {
        mutate: {
          after: pageRequest(read, 2, 2, 'uid'),
          times: 'always',
          change: (rows) => rows.slice(0, Math.max(0, rows.length - 3)),
        },
      })
      const error = errorOf(await readWindow(app, { offset: 3, size: 3, anchor: 'T3' }, read))
      expect(error).not.toBeInstanceOf(InvalidSelectionError)
      expectCollectionChanged(error)
    })

    it('fails as a changed collection when the anchor moves while the page is read', async () => {
      // Everything before the window reverses after the page's titles are
      // read: the page's own items stay put, but the anchor no longer sits just
      // before them, which the check after the reads detects.
      const app = fakePlanner(SEVEN_TASKS, {
        mutate: {
          after: pageRequest(read, 3, 5, 'title'),
          times: 'once',
          change: (rows) => [...rows.slice(0, 3).reverse(), ...rows.slice(3)],
        },
      })
      expectCollectionChanged(
        errorOf(await readWindow(app, { offset: 3, size: 3, anchor: 'T3' }, read))
      )
    })
  }
)

describe.each(PAGE_READS)(
  'paged list bodies read by %s: reads that disagree within a page',
  (read) => {
    it('fails as a changed collection when the page identifiers change in both attempts', async () => {
      const app = fakePlanner(SEVEN_TASKS, {
        mutate: {
          after: pageRequest(read, 0, 2, 'uid'),
          times: 'always',
          change: (rows) => [...rows.slice(0, 3).reverse(), ...rows.slice(3)],
        },
      })
      expectCollectionChanged(errorOf(await readWindow(app, { offset: 0, size: 3 }, read)))
    })

    it('fails as an unexpected value when a read is short in both attempts while the identifiers hold', async () => {
      // By range the short read is the page's; by column it is the whole
      // collection's, so even a value missing past the window is caught.
      const app = fakePlanner(SEVEN_TASKS, { short: ['title'] })
      const error = errorOf(await readWindow(app, { offset: 0, size: 3 }, read))
      const counts = read === 'range' ? '2 values for 3 items' : '6 values for 7 items'
      expect(error).toBeInstanceOf(UnexpectedValueError)
      expect(error).toMatchObject({
        details: {
          issues: [
            {
              path: [],
              message: `Reading the property "title" gave ${counts}, so the records cannot be assembled.`,
            },
          ],
        },
      })
    })

    it('reads the page again when its identifiers change once, and returns the consistent read', async () => {
      const app = fakePlanner(SEVEN_TASKS, {
        mutate: {
          after: pageRequest(read, 0, 2, 'title'),
          times: 'once',
          change: (rows) =>
            [rows[1], rows[0], ...rows.slice(2)].flatMap((row) => (row ? [row] : [])),
        },
      })
      const result = windowOf(await readWindow(app, { offset: 0, size: 3 }, read))
      expect(uidsOf(result)).toEqual(['T2', 'T1', 'T3'])
    })

    it('falls back to per-item reads for a property that fails across the items, and keeps the page aligned', async () => {
      const app = fakePlanner(SEVEN_TASKS, { bulk: ['title'] })
      const result = windowOf(await readWindow(app, { offset: 2, size: 3, anchor: 'T2' }, read))
      expect(result.items.map((item) => item['title'])).toEqual(['Task 3', 'Task 4', 'Task 5'])
      expect(uidsOf(result)).toEqual(['T3', 'T4', 'T5'])
    })
  }
)

describe('paged list bodies: what can page', () => {
  it('refuses to page a resource with no identifier, before anything runs', async () => {
    const { app, requests } = fakePlanner([{ text: 'a' }])
    const result = await settle(
      createNativeExecutor({ transport: vmTransport(app) }).execute({
        manifest: planner,
        target: MEMOS,
        input: {},
        inputPlan: PASSTHROUGH_PLAN,
        outputPlan: PASSTHROUGH_PLAN,
        resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
        page: { offset: 0, size: 25 },
      })
    )
    expect(errorOf(result)).toMatchObject({ code: 'INTERNAL' })
    expect(requests).toEqual([])
  })
})
