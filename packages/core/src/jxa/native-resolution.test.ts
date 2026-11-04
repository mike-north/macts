/**
 * Reference resolution by the native macOS executor.
 *
 * The provider resolves exactly the references it converts at operation
 * positions, and identity collections of them (phases/13 D7, native
 * conversion scope): a single identity reference to a resource the app finds
 * by its identifier, carrying its container exactly when the resource's get
 * records a parent. Expected outcomes are written by hand from D7 and D9:
 *
 * - the object is found as the resource's get finds it, and read as the get
 *   reads its item; the result is shaped by the request's output plan;
 * - a missing object is `TargetNotFoundError` naming the referenced resource,
 *   with `entryIndex` for an identity collection's entry;
 * - a reference to a resource got within its parent is found within its
 *   container, container first, and a missing container names the parent;
 * - an identity collection resolves its entries in order, and to `[]` when it
 *   has none;
 * - a result that breaks the output plan is `UnexpectedValueError`;
 * - every other form is `InternalError`, and nothing runs.
 *
 * Each case runs the real native executor on the real composed script,
 * evaluated in an isolated context against a stand-in Contacts application
 * that records every use made of it. Contacts finds a person by its id in
 * `people` (manifest identifier targeting `byId`), and its email get records
 * the person as its parent, so an email is found by its id in its person's
 * `emails`.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4, D7, D9)
 */

import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  AppUnavailableError,
  InternalError,
  OperationCancelledError,
  TargetNotFoundError,
  UnexpectedValueError,
  type ReferenceWire,
  type ResourcePlanTable,
  type ValuePlan,
} from '@macts/contracts'
import type { ResolutionRequest } from '../execution/executor.js'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import { runNativeScript } from './executor.js'
import { NATIVE_CODEC, type NativeOutcome, type NativeScript } from './native-codec.js'
import { createNativeExecutor, type NativeTransport } from './native-executor.js'
import { shelfManifest } from '../manifest/test-support/shelf-output-references.js'
import { buildNativeBody, buildResolutionBody, nativeReadKeys } from './native-scripts.js'
import { recorded, standInTransport } from './test-support/stand-in-app.js'

const CONTACTS_MANIFEST = fileURLToPath(
  new URL('../../../../manifests/contacts/app.yaml', import.meta.url)
)

let contacts: AppManifest
beforeAll(async () => {
  contacts = await loadManifest(CONTACTS_MANIFEST)
})

/** Contacts' person and email identifiers are text, as its generated contract says. */
const RESOURCE_PLANS: ResourcePlanTable = {
  Person: { id: { kind: 'string' } },
  Email: { id: { kind: 'string' } },
}

/** A person record's plan, cut down to the fields these cases read. */
const PERSON_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    id: { presence: 'required', value: { kind: 'string' } },
    firstName: { presence: 'optional', value: { kind: 'nullable', value: { kind: 'string' } } },
  },
}

/** What a collection of people resolves to: an array of person records (D9). */
const PEOPLE_PLAN: ValuePlan = { kind: 'array', items: PERSON_PLAN }

/** A single identity reference to the person with `id`. */
function person(id: string): ReferenceWire {
  return { resource: 'Person', form: 'identity', cardinality: 'one', id }
}

/** An identity collection of the people with `ids`, in that order. */
function people(...ids: string[]): ReferenceWire {
  return { resource: 'Person', form: 'identity', cardinality: 'many', entries: ids.map(person) }
}

/** One stand-in person's native property record, and the ids of its emails. */
interface StandInPerson {
  readonly id: unknown
  readonly firstName: string
  readonly emails?: readonly string[]
}

/**
 * A stand-in Contacts application holding `persons`, found by identifier in
 * `people` as the app's own id specifier finds them, recording every use.
 */
function standInContacts(persons: readonly StandInPerson[]) {
  const uses: string[] = []
  const absent = { exists: () => false }
  const objects = new Map(
    persons.map(({ emails = [], ...record }) => {
      const held = new Map(
        emails.map((id) => [
          id,
          { exists: () => true, id: () => id, properties: () => ({ id, label: 'work' }) },
        ])
      )
      return [
        record.id,
        {
          exists: () => true,
          id: () => record.id,
          properties: () => ({ ...record }),
          emails: {
            byId: (id: unknown) => (typeof id === 'string' ? held.get(id) : undefined) ?? absent,
          },
        },
      ]
    })
  )
  const app = {
    includeStandardAdditions: false,
    people: { byId: (id: unknown) => objects.get(id) ?? absent },
  }
  return { app: recorded(app, 'app', uses), uses }
}

const ADA: StandInPerson = { id: 'p-ada', firstName: 'Ada' }
const GRACE: StandInPerson = { id: 'p-grace', firstName: 'Grace' }
const ALAN: StandInPerson = { id: 'p-alan', firstName: 'Alan' }

/** A resolution request against Contacts. */
function resolution(
  reference: ReferenceWire,
  overrides: Partial<ResolutionRequest> = {}
): ResolutionRequest {
  return {
    manifest: contacts,
    reference,
    outputPlan: reference.cardinality === 'one' ? PERSON_PLAN : PEOPLE_PLAN,
    resourcePlans: RESOURCE_PLANS,
    ...overrides,
  }
}

/** Resolve `request` against `app`, recording each script run in `scripts`. */
function resolveAgainst(app: object, request: ResolutionRequest, scripts: NativeScript[] = []) {
  return createNativeExecutor({ transport: standInTransport(app, scripts) }).resolve(request)
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

/** The uses that read a person's properties: the body's record read. */
const propertyReads = (uses: readonly string[]): string[] =>
  uses.filter((use) => use.includes('.properties'))

describe('buildResolutionBody', () => {
  it('reads a single object with exactly the record read of the resource’s get', () => {
    const get = buildNativeBody(contacts, { command: 'getPerson', resource: 'Person' })
    const body = buildResolutionBody(contacts, 'Person', 'one')
    const [binding, ...read] = body.split('\n')

    expect(binding).toBe('var item = args["target"];')
    // The get binds its item by identifier first; from then on the two are
    // the same statements.
    expect(get.endsWith(`\n${read.join('\n')}`)).toBe(true)
  })

  it('reads every object of a collection with the same record read', () => {
    const one = buildResolutionBody(contacts, 'Person', 'one').split('\n').slice(1)
    const many = buildResolutionBody(contacts, 'Person', 'many')

    expect(many).toContain(`function readRecord(item) {\n${one.join('\n')}\n}`)
  })

  it('fails with InternalError for a resource the manifest does not declare', () => {
    expect(() => buildResolutionBody(contacts, 'Account', 'one')).toThrow(InternalError)
  })
})

describe('nativeReadKeys', () => {
  it('reads the same person properties in a get and in a list', () => {
    const person = contacts.resources['Person']
    const keys = nativeReadKeys(contacts, 'Person', person)

    expect([...keys.get].sort()).toEqual([...keys.list].sort())
    expect(keys.get).toContain('id')
    expect(keys.get).toContain('firstName')
  })

  it('has a list read an identifier that is not a usable property, and a get not', () => {
    const keys = nativeReadKeys(contacts, 'Book', {
      name: 'Book',
      plural: 'Books',
      description: 'A book',
      properties: {
        title: { access: 'r', type: 'string', optional: false, description: 'The title' },
      },
      identifiers: [{ property: 'isbn', primary: true }],
    })

    expect(keys).toEqual({ get: ['title'], list: ['title', 'isbn'] })
  })

  it('leaves the fields the output record leaves out unread in a get and in a list (#219)', () => {
    // In the Shelf fixture, Library's currentChapter (parent-scoped get),
    // topAuthor and authors (no get), and series and genre (names not claimed
    // unique) are left out of output, and retiredSeries is unsupported; id and
    // favoriteBook remain.
    const shelf = shelfManifest()
    expect(nativeReadKeys(shelf, 'Library', shelf.resources['Library'])).toEqual({
      get: ['id', 'favoriteBook'],
      list: ['id', 'favoriteBook'],
    })
  })

  it('reads name for a body with no resource', () => {
    expect(nativeReadKeys(contacts, undefined, undefined)).toEqual({
      get: ['name'],
      list: ['name'],
    })
  })
})

describe('resolving a single identity reference', () => {
  it('finds the person as conversion does, then reads it as a get does', async () => {
    const { app, uses } = standInContacts([ADA, GRACE])
    const scripts: NativeScript[] = []

    const result = await resolveAgainst(app, resolution(person('p-grace')), scripts)

    expect(result).toEqual({ id: 'p-grace', firstName: 'Grace' })
    // Found by identifier in `people` and checked to exist before anything
    // else, then read with one property record.
    expect(uses.slice(0, 5)).toEqual([
      'read app.people',
      'read app.people.byId',
      'call app.people.byId',
      'read app.people.byId().exists',
      'call app.people.byId().exists',
    ])
    expect(uses.slice(5, 7)).toEqual([
      'read app.people.byId().properties',
      'call app.people.byId().properties',
    ])
    // The script reads with the resolution body, and its reference table is
    // the one conversion uses: how the app finds a person, by identifier.
    expect(scripts).toHaveLength(1)
    expect(scripts[0]?.body).toBe(buildResolutionBody(contacts, 'Person', 'one'))
    expect(scripts[0]?.outputPlan).toEqual(PERSON_PLAN)
    expect(scripts[0]?.references).toEqual({
      Person: {
        id: { kind: 'string' },
        addressing: { collection: 'people', lookup: 'byId', property: 'id' },
      },
    })
  })

  it('fails with TargetNotFoundError naming the person when none has the identifier, reading nothing', async () => {
    const { app, uses } = standInContacts([ADA])

    const error = await rejectionOf(resolveAgainst(app, resolution(person('p-missing'))))

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.message).toBe('Contacts has no Person matching the reference.')
    expect(error.details).toEqual({ resource: 'Person' })
    expect(propertyReads(uses)).toEqual([])
  })

  it('fails with UnexpectedValueError when the record breaks the output plan', async () => {
    // The person's first name is text where this plan requires an integer.
    const { app } = standInContacts([{ id: 'p-odd', firstName: 'Odd' }])
    const plan: ValuePlan = {
      kind: 'record',
      fields: { firstName: { presence: 'required', value: { kind: 'integer' } } },
    }

    const error = await rejectionOf(
      resolveAgainst(app, resolution(person('p-odd'), { outputPlan: plan }))
    )

    expect(error).toBeInstanceOf(UnexpectedValueError)
    if (!(error instanceof UnexpectedValueError)) return
    expect(error.details).toEqual({
      issues: [{ path: ['firstName'], message: expect.any(String) as string }],
    })
  })

  it('does not run when the signal is already aborted', async () => {
    const run = vi.fn<NativeTransport['run']>()
    const controller = new AbortController()
    controller.abort()

    const error = await rejectionOf(
      createNativeExecutor({ transport: { run } }).resolve(
        resolution(person('p-ada'), { signal: controller.signal })
      )
    )

    expect(error).toBeInstanceOf(OperationCancelledError)
    expect(run).not.toHaveBeenCalled()
  })
})

describe('resolving a reference through its container', () => {
  /** An email record's plan, cut down to the fields these cases read. */
  const EMAIL_PLAN: ValuePlan = {
    kind: 'record',
    fields: {
      id: { presence: 'required', value: { kind: 'string' } },
      label: { presence: 'required', value: { kind: 'string' } },
    },
  }
  /** A single identity reference to the email `id` of the person `personId`. */
  const email = (personId: string, id: string): ReferenceWire => ({
    resource: 'Email',
    form: 'identity',
    cardinality: 'one',
    id,
    container: person(personId),
  })

  it('finds the person, then the email within it, and reads the email', async () => {
    // An email's get records the person as its parent, and a person is
    // top-level, so the email is found within its container.
    const { app, uses } = standInContacts([{ ...ADA, emails: ['e-1'] }, GRACE])

    const result = await resolveAgainst(
      app,
      resolution(email('p-ada', 'e-1'), { outputPlan: EMAIL_PLAN })
    )

    expect(result).toEqual({ id: 'e-1', label: 'work' })
    expect(uses.filter((use) => use.startsWith('call'))).toEqual([
      'call app.people.byId',
      'call app.people.byId().exists',
      'call app.people.byId().emails.byId',
      'call app.people.byId().emails.byId().exists',
      'call app.people.byId().emails.byId().properties',
    ])
  })

  it('fails with TargetNotFoundError naming Person when the person is missing, looking up no email', async () => {
    const { app, uses } = standInContacts([ADA])

    const error = await rejectionOf(
      resolveAgainst(app, resolution(email('p-missing', 'e-1'), { outputPlan: EMAIL_PLAN }))
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Person' })
    expect(uses.filter((use) => use.includes('emails'))).toEqual([])
  })

  it('fails with TargetNotFoundError naming Email when the person has no such email', async () => {
    // e-1 is Grace's email; the reference names Ada as its container.
    const { app } = standInContacts([ADA, { ...GRACE, emails: ['e-1'] }])

    const error = await rejectionOf(
      resolveAgainst(app, resolution(email('p-ada', 'e-1'), { outputPlan: EMAIL_PLAN }))
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Email' })
  })
})

describe('a resolution result that is not JSON', () => {
  // Regression: the message was shared with operations and named "the
  // operation" for a resolution too.
  it.each<[string, unknown, ReferenceWire]>([
    ['NaN', Number.NaN, person('p-ada')],
    ['a function', () => undefined, person('p-ada')],
    ['NaN, for an identity collection', Number.NaN, people('p-ada')],
  ])('refuses %s with InternalError naming the resolution', async (_label, value, reference) => {
    // The transport breaks its contract on purpose, so its mock is untyped.
    const run = vi.fn().mockResolvedValue({ ok: true, value })

    const error = await rejectionOf(
      createNativeExecutor({ transport: { run } }).resolve(resolution(reference))
    )

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.message).toBe('Resolving the reference produced a result that is not valid JSON.')
  })
})

describe('resolving an identity collection', () => {
  it('reads each entry in entry order, in one automation process', async () => {
    const { app } = standInContacts([ADA, GRACE, ALAN])
    const scripts: NativeScript[] = []

    // Entry order differs from the app's own order on purpose.
    const result = await resolveAgainst(
      app,
      resolution(people('p-alan', 'p-ada', 'p-grace')),
      scripts
    )

    expect(result).toEqual([
      { id: 'p-alan', firstName: 'Alan' },
      { id: 'p-ada', firstName: 'Ada' },
      { id: 'p-grace', firstName: 'Grace' },
    ])
    expect(scripts).toHaveLength(1)
    expect(scripts[0]?.body).toBe(buildResolutionBody(contacts, 'Person', 'many'))
  })

  it('keeps a repeated entry once per entry', async () => {
    const { app } = standInContacts([ADA])

    await expect(resolveAgainst(app, resolution(people('p-ada', 'p-ada')))).resolves.toEqual([
      { id: 'p-ada', firstName: 'Ada' },
      { id: 'p-ada', firstName: 'Ada' },
    ])
  })

  it('resolves to [] when it has no entries, without running anything', async () => {
    const run = vi.fn<NativeTransport['run']>()

    await expect(
      createNativeExecutor({ transport: { run } }).resolve(resolution(people()))
    ).resolves.toEqual([])
    expect(run).not.toHaveBeenCalled()
  })

  it('fails with TargetNotFoundError whose entryIndex names the first missing entry, reading nothing', async () => {
    const { app, uses } = standInContacts([ADA, GRACE])

    const error = await rejectionOf(
      resolveAgainst(app, resolution(people('p-ada', 'p-missing', 'p-gone')))
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.message).toBe(
      'Contacts has no Person matching entry 1 of the identity collection.'
    )
    expect(error.details).toEqual({ resource: 'Person', entryIndex: 1 })
    // Every entry is found before any record is read, so nothing was read.
    expect(propertyReads(uses)).toEqual([])
  })

  it('reports entry 0 missing as entryIndex 0', async () => {
    const { app } = standInContacts([ADA])

    const error = await rejectionOf(resolveAgainst(app, resolution(people('p-missing', 'p-ada'))))

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Person', entryIndex: 0 })
  })

  it('fails with UnexpectedValueError when an entry record breaks the item plan', async () => {
    const { app } = standInContacts([ADA, { id: 'p-odd', firstName: 'Odd' }])
    const items: ValuePlan = {
      kind: 'array',
      items: {
        kind: 'record',
        fields: { id: { presence: 'required', value: { kind: 'integer' } } },
      },
    }

    const error = await rejectionOf(
      resolveAgainst(app, resolution(people('p-ada', 'p-odd'), { outputPlan: items }))
    )

    expect(error).toBeInstanceOf(UnexpectedValueError)
    if (!(error instanceof UnexpectedValueError)) return
    expect(error.details).toEqual({
      issues: [{ path: [0, 'id'], message: expect.any(String) as string }],
    })
  })
})

describe('references outside the native conversion scope', () => {
  const byName: ReferenceWire = {
    resource: 'Person',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'name', name: 'Ada' },
  }
  const everyPerson: ReferenceWire = {
    resource: 'Person',
    form: 'selector',
    cardinality: 'many',
    selector: { by: 'every' },
  }
  const personInGroup: ReferenceWire = {
    resource: 'Person',
    form: 'identity',
    cardinality: 'one',
    id: 'p-ada',
    container: { resource: 'Group', form: 'identity', cardinality: 'one', id: 'g-1' },
  }
  const entriesInGroup: ReferenceWire = {
    resource: 'Person',
    form: 'identity',
    cardinality: 'many',
    entries: [person('p-ada'), personInGroup],
  }

  it.each<[string, ReferenceWire, ResourcePlanTable, string]>([
    [
      'a selector reference',
      byName,
      RESOURCE_PLANS,
      'The macOS provider cannot resolve a selector reference to the Contacts resource "Person" yet.',
    ],
    [
      'a selector collection reference',
      everyPerson,
      RESOURCE_PLANS,
      'The macOS provider cannot resolve a selector collection reference to the Contacts resource "Person" yet.',
    ],
    [
      'a reference with a container',
      personInGroup,
      RESOURCE_PLANS,
      'The macOS provider cannot resolve a reference to the Contacts resource "Person" through that container: a reference carries a container only when Contacts finds its resource within another, and then as an identity reference to that resource.',
    ],
    [
      'an identity collection with an entry located through a container',
      entriesInGroup,
      RESOURCE_PLANS,
      'The macOS provider cannot resolve a reference to the Contacts resource "Person" through that container: a reference carries a container only when Contacts finds its resource within another, and then as an identity reference to that resource.',
    ],
    [
      // An email's get records the person as its parent: it is found only
      // within its container, and here it has none.
      'a reference to a resource that is not top-level, without its container',
      { resource: 'Email', form: 'identity', cardinality: 'one', id: 'e-1' },
      RESOURCE_PLANS,
      'The macOS provider cannot resolve a reference to the Contacts resource "Email" without its container: Contacts finds one only within its "Person".',
    ],
    [
      'a reference through a container whose resource has no identifier plan',
      {
        resource: 'Email',
        form: 'identity',
        cardinality: 'one',
        id: 'e-1',
        container: person('p-ada'),
      },
      { Email: { id: { kind: 'string' } } },
      'The macOS provider cannot resolve references to the Contacts resource "Person" yet: Contacts does not find one by its identifier alone.',
    ],
    [
      'a reference to a resource with no identifier plan',
      person('p-ada'),
      { Person: {} },
      'The macOS provider cannot resolve references to the Contacts resource "Person" yet: Contacts does not find one by its identifier alone.',
    ],
    [
      'a reference to a resource with no entry in the resource plans',
      person('p-ada'),
      { Group: { id: { kind: 'string' } } },
      'The macOS provider cannot resolve references to the Contacts resource "Person" yet: Contacts does not find one by its identifier alone.',
    ],
    [
      'an empty identity collection of a resource with no entry in the resource plans',
      people(),
      { Group: { id: { kind: 'string' } } },
      'The macOS provider cannot resolve references to the Contacts resource "Person" yet: Contacts does not find one by its identifier alone.',
    ],
  ])(
    'fails %s with InternalError naming the form, addressing no app',
    async (_label, reference, resourcePlans, message) => {
      const run = vi.fn<NativeTransport['run']>()

      const error = await rejectionOf(
        createNativeExecutor({ transport: { run } }).resolve(
          resolution(reference, { resourcePlans })
        )
      )

      expect(error).toBeInstanceOf(InternalError)
      if (!(error instanceof InternalError)) return
      expect(error.message).toBe(message)
      expect(error.details).toEqual({})
      // No automation process ran, so no app was addressed.
      expect(run).not.toHaveBeenCalled()
    }
  )

  it('reports a reference the codec still refuses as InternalError, not as the caller’s input', async () => {
    // A transport whose codec reports the reference unconvertible although the
    // executor judged it in scope.
    const run = vi.fn<NativeTransport['run']>().mockResolvedValue({
      ok: false,
      failure: {
        source: 'codec',
        direction: 'decode',
        path: ['target'],
        message: 'References to "Person" have no conversion in this codec',
        unsupportedKind: 'reference',
      },
    } satisfies NativeOutcome)

    const error = await rejectionOf(
      createNativeExecutor({ transport: { run } }).resolve(resolution(person('p-ada')))
    )

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.message).toBe(
      'The macOS provider cannot resolve this reference to the Contacts resource "Person" yet.'
    )
    expect(error.details).toEqual({})
  })
})

/** A bundle identifier no app has: the app cannot be found. */
const NOT_INSTALLED_BUNDLE_ID = 'com.example.macts.not-installed'

describe('in the real automation host (no app events)', () => {
  // The resolution body is compiled with the rest of the script, so a body the
  // host cannot compile would fail as "could not be prepared", not as a
  // missing app. An uninstalled app fails at creation, before any event.
  it.skipIf(process.platform !== 'darwin').each([
    ['a single reference', person('p-ada')],
    ['an identity collection', people('p-ada', 'p-grace')],
  ])(
    'compiles the resolution script for %s, which then fails as an app that is not installed',
    async (_label, reference) => {
      const transport: NativeTransport = {
        run: (script, options) =>
          runNativeScript({ ...script, bundleId: NOT_INSTALLED_BUNDLE_ID }, NATIVE_CODEC, {
            timeout: options.timeoutMs,
          }),
      }

      const error = await rejectionOf(
        createNativeExecutor({ transport }).resolve(resolution(reference))
      )

      expect(error).toBeInstanceOf(AppUnavailableError)
      if (!(error instanceof AppUnavailableError)) return
      expect(error.details).toEqual({ app: 'Contacts', reason: 'not-installed' })
    },
    30_000
  )
})
