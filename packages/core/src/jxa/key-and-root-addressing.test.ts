/**
 * Native addressing by the app's key specifier (`targeting: byKey`), of
 * singleton roots (`roots`), over the Archive fixture
 * (see `archiveManifest`).
 *
 * Expected outcomes are written by hand from phases/13 D4, D7 and D10:
 *
 * - A keyed resource's item is the collection's key specifier applied to the
 *   identifier value, wherever the lookup is made: a get at the application,
 *   a lookup nested under a parent, and a parent found by key. A reference to
 *   a keyed resource is found the same way, and its identifier is read back
 *   from the keyed property; a key that finds nothing is a missing target.
 * - A singleton root is found by its kind: the application property the kind
 *   names. A get of a kind whose property holds nothing on this Mac fails as a
 *   missing target, never an empty record. A list returns one record per kind
 *   whose property holds an object, skipping a kind the app reports missing
 *   (-1728) and failing on any other error. Every record carries its `kind`.
 *   A reference by kind resolves to that object, in a resolution and as an
 *   operation's input; an object read from the app cannot be encoded as a
 *   reference to a root, since nothing on it says which kind it is.
 *
 * The executor cases run the real native executor on the real composed
 * script, in an isolated context, against a stand-in Archive application
 * that records every use made of it.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4, D7, D10)
 */

import { describe, expect, it } from 'vitest'
import {
  AppOperationError,
  InternalError,
  TargetNotFoundError,
  type ResourcePlanTable,
  type ValuePlan,
  type WireRecord,
} from '@macts/contracts'
import { parseManifestYaml } from '../manifest/loader.js'
import {
  ARCHIVE_MANIFEST_YAML,
  archiveManifest,
} from '../manifest/test-support/archive-key-and-root.js'
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

const DESK_KIND: ValuePlan = { kind: 'enum', members: ['front', 'back'] }

/** Archive identifiers are text, but a desk's is its kind. */
const RESOURCE_PLANS: ResourcePlanTable = {
  Volume: { id: { kind: 'string' } },
  Entry: { id: { kind: 'string' } },
  Label: { id: { kind: 'string' } },
  Desk: { id: DESK_KIND },
}

const ENTRY_REF: ValuePlan = { kind: 'reference', resource: 'Entry', cardinality: 'one' }
const DESK_REF: ValuePlan = { kind: 'reference', resource: 'Desk', cardinality: 'one' }
const text = (): ValuePlan => ({ kind: 'string' })
const nullable = (value: ValuePlan): ValuePlan => ({ kind: 'nullable', value })

/** An entry record's plan: every field is declared present, as the contract declares it. */
const ENTRY_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    location: { presence: 'required', value: text() },
    title: { presence: 'required', value: nullable(text()) },
    holder: { presence: 'required', value: nullable(ENTRY_REF) },
  },
}

/** A desk record's plan. */
const DESK_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    kind: { presence: 'required', value: DESK_KIND },
    clerk: { presence: 'required', value: nullable(text()) },
    featured: { presence: 'required', value: nullable(ENTRY_REF) },
  },
}

/** The input plan of a get that takes the fields `names`, of plan `value`. */
function inputOf(value: ValuePlan, ...names: string[]): ValuePlan {
  return {
    kind: 'record',
    fields: Object.fromEntries(names.map((name) => [name, { presence: 'required', value }])),
  }
}

/** A failure the app raises, carrying its native error number. */
function appError(errorNumber: number): Error {
  return Object.assign(new Error('The app failed.'), { errorNumber })
}

/** A member that fails with `errorNumber` whenever it is read. */
function failing(errorNumber: number) {
  return () => {
    throw appError(errorNumber)
  }
}

/**
 * One stand-in archive object: it exists, and reports `record` as its
 * property record, which need not hold every property it can report.
 */
function object(record: Record<string, unknown>, members: Record<string, unknown> = {}) {
  return { exists: () => true, properties: () => ({ ...record }), ...members }
}

const ABSENT = { exists: () => false }
const NO_SUCH_OBJECT = { exists: failing(-1728) }

/** How the stand-in app holds each desk: present (the default), or as a failing object. */
interface DeskOptions {
  readonly front?: object
  readonly back?: object
}

/**
 * A stand-in Archive application: one volume (`v1`) holding a mark at `/m`,
 * two entries (`/a`, held by `/root`) the entries collection finds by key, a
 * label `l1` on `/a`, a front desk featuring `/a`, and a back desk. Each desk
 * can be replaced (`desks`) by one the app reports missing or failing.
 */
function standInArchive(options: { desks?: DeskOptions } = {}) {
  const uses: string[] = []
  const rootEntry = object(
    { location: '/root', title: 'Root', holder: null },
    { location: () => '/root' }
  )
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
  const rang: unknown[] = []
  const app = {
    includeStandardAdditions: false,
    volumes: { byId: (id: unknown) => (id === 'v1' ? volume : ABSENT) },
    entries: { byName: (key: unknown) => entries.get(key) ?? ABSENT },
    frontDesk:
      options.desks?.front ?? object({ clerk: 'Kim', featured: entry }, { name: () => 'Front' }),
    backDesk: options.desks?.back ?? object({ clerk: 'Lee', featured: null }),
    // Ringing answers with the desk rung, so a test can see what encoding it does.
    ring: (params: { desk?: unknown }) => {
      rang.push(params.desk)
      return params.desk
    },
  }
  return { app: recorded(app, 'app', uses), uses, rang, desks: app }
}

/** Run `command` on `resource` against `app`, recording each script in `scripts`. */
function execute(
  app: object,
  command: string,
  resource: string | undefined,
  input: WireRecord,
  plans: { input: ValuePlan; output: ValuePlan },
  scripts: NativeScript[] = []
) {
  return createNativeExecutor({ transport: standInTransport(app, scripts) }).execute({
    manifest,
    target: resource === undefined ? { command } : { command, resource },
    input,
    inputPlan: plans.input,
    outputPlan: plans.output,
    resourcePlans: RESOURCE_PLANS,
  })
}

/** Resolve `reference` against `app`, reading records of plan `outputPlan`. */
function resolve(app: object, reference: WireRecord['reference'], outputPlan: ValuePlan) {
  return createNativeExecutor({ transport: standInTransport(app) }).resolve({
    manifest,
    reference: reference as never,
    outputPlan,
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

/** The wire form of an identity reference to `resource` by `id`. */
function ref(resource: string, id: string) {
  return { reference: { resource, form: 'identity', cardinality: 'one', id } } as const
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
  it('gets a root by its kind argument, through the application property it names', () => {
    const plan = planNativeInvocation(manifest, { command: 'getDesk', resource: 'Desk' })
    expect(plan.requiredArguments).toEqual(['kind'])
    expect(plan.body).toContain('var roots = {"front":"frontDesk","back":"backDesk"};')
    expect(plan.body).toContain('var item = app[roots[itemKind]];')
    expect(plan.body).toContain('obj["kind"] = itemKind;')
    expect(plan.body).not.toContain('desks')
  })

  it('addresses a reference to a root by the property its kind names', () => {
    expect(referenceAddressing(manifest, 'Desk')).toEqual({
      lookup: 'byRoot',
      roots: { front: 'frontDesk', back: 'backDesk' },
    })
  })

  it('finds no root in a collection', () => {
    expect(() => buildTargetExpression(manifest.resources['Desk'], 'desks', 'kind')).toThrow(
      InternalError
    )
  })
})

describe('key targeting against a stand-in Archive', () => {
  it('gets an entry by key, and reads a reference it holds back as its key', async () => {
    const { app, uses } = standInArchive()

    await expect(
      execute(
        app,
        'getEntry',
        'Entry',
        { location: '/a' },
        {
          input: inputOf(text(), 'location'),
          output: ENTRY_PLAN,
        }
      )
    ).resolves.toEqual({
      location: '/a',
      title: 'A',
      holder: ref('Entry', '/root'),
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
        { input: inputOf(text(), 'location'), output: ENTRY_PLAN }
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
          input: inputOf(text(), 'entryLocation', 'id'),
          output: {
            kind: 'record',
            fields: {
              id: { presence: 'required', value: text() },
              text: { presence: 'required', value: nullable(text()) },
            },
          },
        }
      )
    ).resolves.toEqual({ id: 'l1', text: 'Fragile' })
  })

  it('resolves a reference to a keyed resource through the key specifier', async () => {
    const { app, uses } = standInArchive()

    await expect(resolve(app, ref('Entry', '/a').reference, ENTRY_PLAN)).resolves.toMatchObject({
      location: '/a',
      title: 'A',
    })
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

    const error = await rejectionOf(resolve(app, ref('Entry', '/missing').reference, ENTRY_PLAN))

    expect(error).toBeInstanceOf(TargetNotFoundError)
  })
})

describe('singleton roots against a stand-in Archive', () => {
  const getDesk = (app: object, kind: string, input: ValuePlan = inputOf(DESK_KIND, 'kind')) =>
    execute(app, 'getDesk', 'Desk', { kind }, { input, output: DESK_PLAN })
  const listDesks = (app: object) =>
    execute(
      app,
      'listDesks',
      'Desk',
      {},
      { input: { kind: 'record', fields: {} }, output: { kind: 'array', items: DESK_PLAN } }
    )

  it('gets the desk of a kind from the application property it names', async () => {
    const { app, uses } = standInArchive()

    await expect(getDesk(app, 'back')).resolves.toEqual({
      kind: 'back',
      clerk: 'Lee',
      featured: null,
    })
    expect(uses.slice(0, 3)).toEqual([
      'read app.backDesk',
      'read app.backDesk.exists',
      'call app.backDesk.exists',
    ])
    expect(uses).not.toContain('read app.frontDesk')
  })

  it.each([
    ['reports it missing', ABSENT],
    ['reports no such object (-1728)', NO_SUCH_OBJECT],
  ])(
    'fails the get of a kind whose property holds nothing on this Mac, when the app %s',
    async (_case, back) => {
      const { app } = standInArchive({ desks: { back } })

      const error = await rejectionOf(getDesk(app, 'back'))

      expect(error).toBeInstanceOf(TargetNotFoundError)
      expect((error as TargetNotFoundError).message).toContain('Desk')
    }
  )

  it('fails a kind the resource does not have as a missing target, without reading the app', async () => {
    const { app, uses } = standInArchive()

    const error = await rejectionOf(getDesk(app, 'side', inputOf(text(), 'kind')))

    expect(error).toBeInstanceOf(TargetNotFoundError)
    expect(uses.filter((use) => use.includes('Desk'))).toEqual([])
  })

  it('lists one record per kind, in the order the kinds are declared', async () => {
    const { app } = standInArchive()

    await expect(listDesks(app)).resolves.toEqual([
      { kind: 'front', clerk: 'Kim', featured: ref('Entry', '/a') },
      { kind: 'back', clerk: 'Lee', featured: null },
    ])
  })

  it.each([
    ['reports it missing', ABSENT],
    ['reports no such object (-1728)', NO_SUCH_OBJECT],
  ])('skips a kind whose property holds nothing, when the app %s', async (_case, back) => {
    const { app } = standInArchive({ desks: { back } })

    await expect(listDesks(app)).resolves.toEqual([
      { kind: 'front', clerk: 'Kim', featured: ref('Entry', '/a') },
    ])
  })

  it('fails the list when a kind fails other than as missing', async () => {
    const { app } = standInArchive({ desks: { back: { exists: failing(-1700) } } })

    const error = await rejectionOf(listDesks(app))

    expect(error).toBeInstanceOf(AppOperationError)
  })

  it('gets and lists a root with one kind, as it would any other', async () => {
    // The Archive source with the back desk's kind removed.
    const oneKind = parseManifestYaml(
      ARCHIVE_MANIFEST_YAML.replace(/\n {6}back:\n(?: {8}.*\n)+/, '\n')
    )
    expect(oneKind.enums['DeskKind']?.values).toEqual([{ name: 'front', value: 'front' }])
    const frontOnly: ValuePlan = { kind: 'enum', members: ['front'] }
    const plans = {
      ...RESOURCE_PLANS,
      Desk: { id: frontOnly },
    }
    const deskPlan: ValuePlan = {
      kind: 'record',
      fields: {
        kind: { presence: 'required', value: frontOnly },
        clerk: { presence: 'required', value: nullable(text()) },
        featured: { presence: 'required', value: nullable(ENTRY_REF) },
      },
    }
    const { app } = standInArchive()
    const executor = createNativeExecutor({ transport: standInTransport(app) })
    const run = (command: string, input: WireRecord, inputPlan: ValuePlan, outputPlan: ValuePlan) =>
      executor.execute({
        manifest: oneKind,
        target: { command, resource: 'Desk' },
        input,
        inputPlan,
        outputPlan,
        resourcePlans: plans,
      })

    await expect(
      run('getDesk', { kind: 'front' }, inputOf(frontOnly, 'kind'), deskPlan)
    ).resolves.toEqual({ kind: 'front', clerk: 'Kim', featured: ref('Entry', '/a') })
    await expect(
      run('listDesks', {}, { kind: 'record', fields: {} }, { kind: 'array', items: deskPlan })
    ).resolves.toEqual([{ kind: 'front', clerk: 'Kim', featured: ref('Entry', '/a') }])
  })

  it('resolves a reference by kind to the record its get returns', async () => {
    const { app } = standInArchive()

    await expect(resolve(app, ref('Desk', 'back').reference, DESK_PLAN)).resolves.toEqual({
      kind: 'back',
      clerk: 'Lee',
      featured: null,
    })
  })

  it('resolves an identity collection of kinds, each record with its own kind', async () => {
    const { app } = standInArchive()

    await expect(
      resolve(
        app,
        {
          resource: 'Desk',
          form: 'identity',
          cardinality: 'many',
          entries: [ref('Desk', 'back').reference, ref('Desk', 'front').reference],
        } as never,
        { kind: 'array', items: DESK_PLAN }
      )
    ).resolves.toEqual([
      { kind: 'back', clerk: 'Lee', featured: null },
      { kind: 'front', clerk: 'Kim', featured: ref('Entry', '/a') },
    ])
  })

  it('fails a reference to a kind whose property holds nothing as a missing target', async () => {
    const { app } = standInArchive({ desks: { back: ABSENT } })

    const error = await rejectionOf(resolve(app, ref('Desk', 'back').reference, DESK_PLAN))

    expect(error).toBeInstanceOf(TargetNotFoundError)
  })

  it('accepts a reference by kind as input, handing the app that desk', async () => {
    const { app, rang, desks } = standInArchive()

    await execute(
      app,
      'ring',
      undefined,
      { desk: ref('Desk', 'front') },
      { input: inputOf(DESK_REF, 'desk'), output: { kind: 'passthrough' } }
    )

    expect(rang).toHaveLength(1)
    expect((rang[0] as { name: () => string }).name()).toBe('Front')
    expect(desks.frontDesk).toBeDefined()
  })

  it('does not encode an object the app returns as a reference to a root', async () => {
    const { app } = standInArchive()

    const error = await rejectionOf(
      execute(
        app,
        'ring',
        undefined,
        { desk: ref('Desk', 'front') },
        { input: inputOf(DESK_REF, 'desk'), output: DESK_REF }
      )
    )

    expect(error).toBeInstanceOf(InternalError)
  })
})

/**
 * Where key targeting and singleton roots meet references that carry their
 * container (phases/13 D7, container scoping): the container is looked up by
 * the parent's own targeting, and the child within it by the child's. A label
 * is found by id within the entry its key finds; a mark by key within the
 * volume its id finds.
 */
describe('containers found by key targeting', () => {
  const LABEL_REF: ValuePlan = { kind: 'reference', resource: 'Label', cardinality: 'one' }
  const LABEL_PLAN: ValuePlan = {
    kind: 'record',
    fields: {
      id: { presence: 'required', value: text() },
      text: { presence: 'required', value: nullable(text()) },
    },
  }
  const MARK_PLAN: ValuePlan = {
    kind: 'record',
    fields: { location: { presence: 'required', value: text() } },
  }
  const PLANS: ResourcePlanTable = { ...RESOURCE_PLANS, Mark: { id: text() } }

  /** A reference to `resource` by `id`, within the container `container`. */
  function contained(resource: string, id: string, container: ReturnType<typeof ref>) {
    return {
      reference: {
        resource,
        form: 'identity',
        cardinality: 'one',
        id,
        container: container.reference,
      },
    } as const
  }

  /** Resolve `reference` against `app` with Mark in the resource table. */
  function resolveWithin(app: object, reference: unknown, outputPlan: ValuePlan) {
    return createNativeExecutor({ transport: standInTransport(app) }).resolve({
      manifest,
      reference: reference as never,
      outputPlan,
      resourcePlans: PLANS,
    })
  }

  it('addresses a label within its entry, whose own addressing is by key', () => {
    expect(referenceAddressing(manifest, 'Label')).toEqual({
      collection: 'labels',
      lookup: 'byId',
      property: 'id',
      within: 'Entry',
    })
    expect(referenceAddressing(manifest, 'Entry')?.lookup).toBe('byKey')
  })

  it('addresses a keyed mark within its volume', () => {
    expect(referenceAddressing(manifest, 'Mark')).toEqual({
      collection: 'marks',
      lookup: 'byKey',
      property: 'location',
      within: 'Volume',
    })
  })

  it('resolves a label by looking its entry up by key, then the label by id within it', async () => {
    const { app, uses } = standInArchive()

    await expect(
      resolveWithin(app, contained('Label', 'l1', ref('Entry', '/a')).reference, LABEL_PLAN)
    ).resolves.toEqual({ id: 'l1', text: 'Fragile' })
    expect(uses.slice(0, 9)).toEqual([
      'read app.entries',
      'read app.entries.byName',
      'call app.entries.byName',
      'read app.entries.byName().exists',
      'call app.entries.byName().exists',
      'read app.entries.byName().labels',
      'read app.entries.byName().labels.byId',
      'call app.entries.byName().labels.byId',
      'read app.entries.byName().labels.byId().exists',
    ])
  })

  it('resolves a mark by looking its volume up by id, then the mark by key within it', async () => {
    const { app, uses } = standInArchive()

    await expect(
      resolveWithin(app, contained('Mark', '/m', ref('Volume', 'v1')).reference, MARK_PLAN)
    ).resolves.toEqual({ location: '/m' })
    expect(uses).toContain('call app.volumes.byId().marks.byName')
  })

  it('fails a label whose entry key finds nothing as a missing entry, looking up no label', async () => {
    const { app, uses } = standInArchive()

    const error = await rejectionOf(
      resolveWithin(app, contained('Label', 'l1', ref('Entry', '/missing')).reference, LABEL_PLAN)
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    expect((error as TargetNotFoundError).message).toContain('Entry')
    expect(uses.some((use) => use.includes('labels'))).toBe(false)
  })

  it('emits a label read through an entry with that entry as its container, by its key', async () => {
    // The Archive source with an entry field referencing a label on that entry.
    const pinnedManifest = parseManifestYaml(
      ARCHIVE_MANIFEST_YAML.replace(
        '        description: The entry that holds this one\n',
        [
          '        description: The entry that holds this one',
          '      pinned:',
          '        access: r',
          '        type: { resource: Label }',
          '        description: The label pinned to the entry',
          '',
        ].join('\n')
      )
    )
    const label = object({ id: 'l1', text: 'Fragile' }, { id: () => 'l1' })
    const pinnedEntry = (pinned: unknown) =>
      object({ location: '/a', title: 'A', holder: null, pinned }, { location: () => '/a' })
    const get = (pinned: unknown) =>
      createNativeExecutor({
        transport: standInTransport({
          includeStandardAdditions: false,
          entries: { byName: (key: unknown) => (key === '/a' ? pinnedEntry(pinned) : ABSENT) },
        }),
      }).execute({
        manifest: pinnedManifest,
        target: { command: 'getEntry', resource: 'Entry' },
        input: { location: '/a' },
        inputPlan: inputOf(text(), 'location'),
        outputPlan: {
          kind: 'record',
          fields: {
            location: { presence: 'required', value: text() },
            title: { presence: 'required', value: nullable(text()) },
            holder: { presence: 'required', value: nullable(ENTRY_REF) },
            pinned: { presence: 'required', value: nullable(LABEL_REF) },
          },
        },
        resourcePlans: PLANS,
      })

    await expect(get(label)).resolves.toEqual({
      location: '/a',
      title: 'A',
      holder: null,
      pinned: contained('Label', 'l1', ref('Entry', '/a')),
    })
    // The app reports no pinned label: a missing value stays null.
    await expect(get(null)).resolves.toMatchObject({ pinned: null })
  })
})

/**
 * A singleton root is held by the application itself, so it is never found
 * within a container and never is one: the manifest schema rejects a command
 * that records a root as its parent. A manifest that skipped validation is
 * the only way to record one, and the provider refuses it as a macts defect
 * rather than looking a root up, or encoding one, through a container.
 */
describe('a singleton root on either side of a container', () => {
  it('is refused as a broken invariant, naming the root', () => {
    const getDesk = manifest.commands['getDesk']
    if (getDesk === undefined) throw new Error('Archive has a desk get')
    const label = manifest.resources['Label']
    if (label === undefined) throw new Error('Archive has a label')
    // Skips validation: a slip got within a desk.
    const slipWithinDesk: typeof manifest = {
      ...manifest,
      resources: { ...manifest.resources, Slip: { ...label, name: 'Slip', plural: 'Slips' } },
      commands: {
        ...manifest.commands,
        getSlip: {
          ...getDesk,
          resourceType: 'Slip',
          parent: { resource: 'Desk', parameter: 'deskKind' },
        },
      },
    }
    // Skips validation: the desk got within an entry.
    const deskWithinEntry: typeof manifest = {
      ...manifest,
      commands: {
        ...manifest.commands,
        getDesk: { ...getDesk, parent: { resource: 'Entry', parameter: 'entryKey' } },
      },
    }

    expect(() => referenceAddressing(slipWithinDesk, 'Slip')).toThrow(InternalError)
    expect(() => referenceAddressing(slipWithinDesk, 'Slip')).toThrow(
      'The macOS provider cannot use the singleton root "Desk" as a container.'
    )
    expect(() => referenceAddressing(deskWithinEntry, 'Desk')).toThrow(InternalError)
    expect(() => referenceAddressing(deskWithinEntry, 'Desk')).toThrow(
      'The macOS provider cannot find the singleton root "Desk" within a container.'
    )
  })
})
