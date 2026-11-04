/**
 * Native addressing by the app's key specifier (`targeting: byKey`) and of
 * singleton roots, over the Archive fixture (see `archiveManifest`).
 *
 * Expected outcomes are written by hand from phases/13 D4, D7 and D10:
 *
 * - A keyed resource's item is the collection's key specifier applied to the
 *   identifier value, wherever the lookup is made: a get at the application,
 *   a lookup nested under a parent, and a parent found by key. A reference to
 *   a keyed resource is found the same way, and its identifier is read back
 *   from the keyed property; a key that finds nothing is a missing target.
 * - A singleton root's get reads the application property the manifest
 *   names, takes no identifier argument, and fails as a missing target when
 *   the property holds nothing. A root has no reference addressing: no
 *   reference names it yet.
 *
 * The executor cases run the real native executor on the real composed
 * script, in an isolated context, against a stand-in Archive application
 * that records every use made of it.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4, D7, D10)
 */

import { describe, expect, it } from 'vitest'
import {
  TargetNotFoundError,
  type ResourcePlanTable,
  type ValuePlan,
  type WireRecord,
} from '@macts/contracts'
import { archiveManifest } from '../manifest/test-support/archive-key-and-root.js'
import type { NativeScript } from './native-codec.js'
import { createNativeExecutor } from './native-executor.js'
import {
  buildNativeBody,
  buildTargetExpression,
  planNativeInvocation,
  referenceAddressing,
} from './native-scripts.js'
import { recorded, standInTransport } from './test-support/stand-in-app.js'

const manifest = archiveManifest()

/** Archive identifiers are text. Desk has none: no reference names it. */
const RESOURCE_PLANS: ResourcePlanTable = {
  Volume: { id: { kind: 'string' } },
  Entry: { id: { kind: 'string' } },
  Label: { id: { kind: 'string' } },
}

const ENTRY_REF: ValuePlan = { kind: 'reference', resource: 'Entry', cardinality: 'one' }
const text = (): ValuePlan => ({ kind: 'string' })
const nullable = (value: ValuePlan): ValuePlan => ({ kind: 'nullable', value })

/** An entry record's plan. */
const ENTRY_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    location: { presence: 'required', value: text() },
    title: { presence: 'optional', value: nullable(text()) },
    holder: { presence: 'optional', value: nullable(ENTRY_REF) },
  },
}

/** The desk's record plan. */
const DESK_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    clerk: { presence: 'optional', value: nullable(text()) },
    featured: { presence: 'optional', value: nullable(ENTRY_REF) },
  },
}

/** The record plan of a get that takes no input. */
const NO_INPUT: ValuePlan = { kind: 'record', fields: {} }

/** The input plan of a get that takes the text fields `names`. */
function textInput(...names: string[]): ValuePlan {
  return {
    kind: 'record',
    fields: Object.fromEntries(
      names.map((name) => [name, { presence: 'required', value: text() }])
    ),
  }
}

/** One stand-in archive object: it exists, and reports `record` as its properties. */
function object(record: Record<string, unknown>, members: Record<string, unknown> = {}) {
  return { exists: () => true, properties: () => ({ ...record }), ...members }
}

const ABSENT = { exists: () => false }

/**
 * A stand-in Archive application: one volume (`v1`) holding a mark at
 * `/m`, two entries (`/a`, held by `/root`) the entries collection finds by
 * key, a label `l1` on `/a`, and a front desk featuring `/a`, unless
 * `noDesk` leaves the desk property holding nothing.
 */
function standInArchive(options: { noDesk?: boolean } = {}) {
  const uses: string[] = []
  const rootEntry = object({ location: '/root', title: 'Root' }, { location: () => '/root' })
  const label = object({ id: 'l1', text: 'Fragile' })
  const entry = object(
    { location: '/a', title: 'A', holder: rootEntry },
    {
      location: () => '/a',
      labels: { byId: (id: unknown) => (id === 'l1' ? label : ABSENT) },
    }
  )
  const entries = new Map<unknown, unknown>([
    ['/a', entry],
    ['/root', rootEntry],
  ])
  const mark = object({ location: '/m' })
  const volume = object(
    { id: 'v1', title: 'One' },
    { marks: { byName: (key: unknown) => (key === '/m' ? mark : ABSENT) } }
  )
  const app = {
    includeStandardAdditions: false,
    volumes: { byId: (id: unknown) => (id === 'v1' ? volume : ABSENT) },
    entries: { byName: (key: unknown) => entries.get(key) ?? ABSENT },
    frontDesk: options.noDesk === true ? ABSENT : object({ clerk: 'Kim', featured: entry }),
  }
  return { app: recorded(app, 'app', uses), uses }
}

/** Run `command` on `resource` against `app`, recording each script in `scripts`. */
function execute(
  app: object,
  command: string,
  resource: string,
  input: WireRecord,
  plans: { input: ValuePlan; output: ValuePlan },
  scripts: NativeScript[] = []
) {
  return createNativeExecutor({ transport: standInTransport(app, scripts) }).execute({
    manifest,
    target: { command, resource },
    input,
    inputPlan: plans.input,
    outputPlan: plans.output,
    resourcePlans: RESOURCE_PLANS,
  })
}

/** What a call rejected with; fails if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to reject')
}

describe('key targeting in native bodies', () => {
  it('finds an item at the application by the collection key specifier', () => {
    const body = buildNativeBody(manifest, { command: 'getEntry', resource: 'Entry' })
    expect(body).toContain('var itemId = args["location"];')
    expect(body).toContain('var item = app["entries"].byName(itemId);')
  })

  it('finds a keyed item within its parent by the key specifier', () => {
    const body = buildNativeBody(manifest, { command: 'getMark', resource: 'Mark' })
    expect(body).toContain('var parent = app["volumes"].byId(parentId);')
    expect(body).toContain('var item = parent["marks"].byName(itemId);')
  })

  it('finds a parent by its key specifier', () => {
    const body = buildNativeBody(manifest, { command: 'getLabel', resource: 'Label' })
    expect(body).toContain('var parentId = args["entryLocation"];')
    expect(body).toContain('var parent = app["entries"].byName(parentId);')
    expect(body).toContain('var item = parent["labels"].byId(itemId);')
  })

  it('builds the same lookup through the public target expression', () => {
    expect(buildTargetExpression(manifest.resources['Entry'], 'entries', 'key')).toBe(
      'app["entries"].byName(key)'
    )
  })

  it('addresses a reference to a keyed resource by key, reading the keyed property back', () => {
    expect(referenceAddressing(manifest, 'Entry')).toEqual({
      collection: 'entries',
      lookup: 'byKey',
      property: 'location',
    })
  })
})

describe('singleton roots in native bodies', () => {
  it('reads the application property, and takes no identifier argument', () => {
    const plan = planNativeInvocation(manifest, { command: 'getDesk', resource: 'Desk' })
    expect(plan.requiredArguments).toEqual([])
    expect(plan.body).toContain('var item = app["frontDesk"];')
    expect(plan.body).toContain('if (!item.exists()) {')
    expect(plan.body).not.toContain('args[')
    expect(plan.body).not.toContain('desks')
  })

  it('has no reference addressing, since no reference names a root yet', () => {
    expect(referenceAddressing(manifest, 'Desk')).toBeUndefined()
  })
})

describe('the native executor against a stand-in Archive', () => {
  it('gets an entry by key, and reads a reference it holds back as its key', async () => {
    const { app, uses } = standInArchive()

    await expect(
      execute(
        app,
        'getEntry',
        'Entry',
        { location: '/a' },
        {
          input: textInput('location'),
          output: ENTRY_PLAN,
        }
      )
    ).resolves.toEqual({
      location: '/a',
      title: 'A',
      holder: {
        reference: { resource: 'Entry', form: 'identity', cardinality: 'one', id: '/root' },
      },
    })
    expect(uses.slice(0, 3)).toEqual([
      'read app.entries',
      'read app.entries.byName',
      'call app.entries.byName',
    ])
  })

  it('fails a key that finds nothing as a missing target', async () => {
    const { app } = standInArchive()

    const error = await rejectionOf(
      execute(
        app,
        'getEntry',
        'Entry',
        { location: '/missing' },
        {
          input: textInput('location'),
          output: ENTRY_PLAN,
        }
      )
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
  })

  it('gets a label within the entry its parent key finds', async () => {
    const { app } = standInArchive()

    await expect(
      execute(
        app,
        'getLabel',
        'Label',
        { entryLocation: '/a', id: 'l1' },
        {
          input: textInput('entryLocation', 'id'),
          output: {
            kind: 'record',
            fields: {
              id: { presence: 'required', value: text() },
              text: { presence: 'optional', value: nullable(text()) },
            },
          },
        }
      )
    ).resolves.toEqual({ id: 'l1', text: 'Fragile' })
  })

  it('resolves a reference to a keyed resource through the key specifier', async () => {
    const { app, uses } = standInArchive()

    await expect(
      createNativeExecutor({ transport: standInTransport(app) }).resolve({
        manifest,
        reference: { resource: 'Entry', form: 'identity', cardinality: 'one', id: '/a' },
        outputPlan: ENTRY_PLAN,
        resourcePlans: RESOURCE_PLANS,
      })
    ).resolves.toMatchObject({ location: '/a', title: 'A' })
    expect(uses.slice(0, 5)).toEqual([
      'read app.entries',
      'read app.entries.byName',
      'call app.entries.byName',
      'read app.entries.byName().exists',
      'call app.entries.byName().exists',
    ])
  })

  it('fails a reference whose key finds nothing as a missing target', async () => {
    const { app } = standInArchive()

    const error = await rejectionOf(
      createNativeExecutor({ transport: standInTransport(app) }).resolve({
        manifest,
        reference: { resource: 'Entry', form: 'identity', cardinality: 'one', id: '/missing' },
        outputPlan: ENTRY_PLAN,
        resourcePlans: RESOURCE_PLANS,
      })
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
  })

  it('gets the root from its application property, with no input', async () => {
    const { app, uses } = standInArchive()

    await expect(
      execute(app, 'getDesk', 'Desk', {}, { input: NO_INPUT, output: DESK_PLAN })
    ).resolves.toEqual({
      clerk: 'Kim',
      featured: {
        reference: { resource: 'Entry', form: 'identity', cardinality: 'one', id: '/a' },
      },
    })
    expect(uses.slice(0, 3)).toEqual([
      'read app.frontDesk',
      'read app.frontDesk.exists',
      'call app.frontDesk.exists',
    ])
  })

  it('fails the root get as a missing target when the property holds nothing', async () => {
    const { app } = standInArchive({ noDesk: true })

    const error = await rejectionOf(
      execute(app, 'getDesk', 'Desk', {}, { input: NO_INPUT, output: DESK_PLAN })
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
  })
})
