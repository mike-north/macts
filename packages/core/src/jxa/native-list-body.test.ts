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
  PASSTHROUGH_PLAN,
  TargetNotFoundError,
  UnexpectedValueError,
  AppOperationError,
  type OperationTarget,
  type ValuePlan,
  WIRE_KEYS,
  type WireRecord,
} from '@macts/contracts'
import { parseManifestYaml } from '../manifest/loader.js'
import { composeNativeScript } from './executor.js'
import { NATIVE_CODEC, NATIVE_CODEC_ERROR_NAME } from './native-codec.js'
import { createNativeExecutor, type NativeTransport } from './native-executor.js'
import { buildNativeBody } from './native-scripts.js'
import { parseNativeOutcome } from './test-support/native-harness.js'
import { buildPerItemListBody } from './test-support/per-item-list-body.js'

/** Dictionary evidence for a recorded native spelling; its content is not under test. */
const EVIDENCE =
  "{ source: dictionary, bundleId: com.example.planner, appVersion: '1.0', osVersion: '27.2', term: t }"

/**
 * A planner app whose names exercise every list shape:
 *
 * - `Task`, listed under a `Shelf` matched by name, is identified by `uID`
 *   (app `uid`), lives in the collection the app spells `todos`, and has a
 *   property the app spells differently (`uRL`, app `url`).
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
      - { property: uID, primary: true }
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

function readFailure(): Error {
  return Object.assign(new Error('The app could not read the property.'), {
    errorNumber: READ_FAILED,
  })
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
          if (failing.includes(key)) throw readFailure()
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

/**
 * A collection specifier over `rows`: callable to list its items, `length`
 * to count them, and each of the app's property names (`names`) to read that
 * property across every item, empty or not.
 */
function fakeCollection(
  initialRows: readonly Row[],
  faults: Faults,
  requests: string[],
  names: ReadonlySet<string>
): object {
  // The collection as it is now; `reorder` and `grow` change it between requests.
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
  }
  const list = (): object[] => {
    const current = rows
    const items = current.map((row) => {
      const addressed =
        faults.specifiersByUid === true
          ? (current.find((r) => r['uid'] === row['uid']) ?? row)
          : row
      return fakeItem(addressed, faults, requests)
    })
    completed('list')
    return faults.shortItems === true ? items.slice(0, -1) : items
  }
  return new Proxy(list, {
    get(target, key, receiver) {
      if (key === 'length') {
        const count = rows.length
        completed('count')
        return count
      }
      if (typeof key !== 'string' || !names.has(key)) {
        return Reflect.get(target, key, receiver) as unknown
      }
      return () => {
        if (faults.bulk?.includes(key) === true) {
          completed(`column ${key}`)
          throw readFailure()
        }
        const values = rows.map((row) => (Object.hasOwn(row, key) ? row[key] : null))
        completed(`column ${key}`)
        return faults.short?.includes(key) === true ? values.slice(0, -1) : values
      }
    },
  })
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
      })
    )
    expect(errorOf(result)).toBeInstanceOf(AppOperationError)
  })
})

/** The codec error a list fails with when its collection kept changing while it was read. */
function expectCollectionChanged(error: unknown): void {
  expect(error).toBeInstanceOf(UnexpectedValueError)
  expect(error).toMatchObject({
    details: {
      issues: [
        {
          path: [],
          message:
            'The collection changed while it was being read, so the records cannot be assembled.',
        },
      ],
    },
  })
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

  it('fails with a codec error when items swap places during every read', async () => {
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
  it('fails with a codec error when a read across the collection gives too few values', async () => {
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
    // The list stops at the misaligned read.
    expect(batchedRequests.at(-1)).toBe('column url')
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

  it('fails with a codec error when items keep joining during every read', async () => {
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
