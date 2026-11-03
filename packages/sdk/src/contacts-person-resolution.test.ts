/**
 * Resolving Contacts person references through the local client, with the
 * real native executor.
 *
 * A caller binds reference data it built to a local client with
 * `bindReference`, then calls `resolve()` (phases/13 D7, caller-built
 * references). The local client sends the reference to its runtime, which
 * resolves a single reference as the person get and an identity collection as
 * the person list, and the macOS provider finds each person as it finds one
 * an operation takes as input, then reads it as the person get does.
 *
 * Each case runs with the real generated Contacts contract, the real runtime
 * registration and the real native executor. Only the executor's transport is
 * replaced: it evaluates the composed script against a stand-in Contacts
 * application in an isolated context, so the input plan, reference table,
 * resolution body and output plan are the shipped ones.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D4, D7, D9)
 */

import { afterAll, describe, expect, it, vi } from 'vitest'
import { createNativeExecutor, type NativeScript } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import {
  TargetNotFoundError,
  type IdentityCollectionReferenceData,
  type IdentityReferenceData,
} from '@macts/contracts'
import { contactsContract } from '@macts/contacts/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { bindReference, createClient } from './local.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-person-resolution-'))
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

/** When the stand-in people were created; a fixed instant. */
const CREATED = new Date('2024-01-15T10:30:00.000Z')

/**
 * The native property record of a stand-in person: every person property the
 * Contacts contract declares, as the app reports them, with no value for most.
 */
function personRecord(id: string, firstName: string): Record<string, unknown> {
  return {
    id,
    creationDate: CREATED,
    modificationDate: CREATED,
    nickname: null,
    organization: null,
    maidenName: null,
    suffix: null,
    homePage: null,
    birthDate: null,
    phoneticLastName: null,
    title: null,
    phoneticMiddleName: null,
    department: null,
    name: firstName,
    note: null,
    company: false,
    middleName: null,
    phoneticFirstName: null,
    jobTitle: null,
    lastName: null,
    firstName,
  }
}

/** A stand-in Contacts application whose people are found by identifier in `people`. */
function standInContacts(persons: readonly (readonly [id: string, firstName: string])[]) {
  const absent = { exists: () => false }
  const objects = new Map(
    persons.map(([id, firstName]) => [
      id,
      { exists: () => true, id: () => id, properties: () => personRecord(id, firstName) },
    ])
  )
  return { people: { byId: (id: unknown) => objects.get(String(id)) ?? absent } }
}

/** A local Contacts client that may get and list people, over `app`. */
async function contactsClient(app: object, scripts: NativeScript[] = []) {
  const key = await createApiKey({
    name: 'Person resolution test',
    permissions: ['contacts:people:get', 'contacts:people:list'],
  })
  return createClient(contactsContract, {
    token: key.token,
    governance: { policy: ALLOW_ALL_POLICY },
    executor: createNativeExecutor({ transport: standInTransport(app, scripts) }),
  })
}

/** A reference to the person with `id`, as a caller builds one. */
function person(id: string): IdentityReferenceData<string, 'Person'> {
  return { app: 'contacts', resource: 'Person', form: 'identity', cardinality: 'one', id }
}

/** An identity collection of the people with `ids`, as a caller builds one. */
function people(...ids: string[]): IdentityCollectionReferenceData<string, 'Person'> {
  return {
    app: 'contacts',
    resource: 'Person',
    form: 'identity',
    cardinality: 'many',
    entries: ids.map(person),
  }
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

describe('a bound Contacts person reference, resolved through the local client', () => {
  it('resolves to the person record, decoded by the person get output', async () => {
    const scripts: NativeScript[] = []
    const client = await contactsClient(
      standInContacts([
        ['p-ada', 'Ada'],
        ['p-grace', 'Grace'],
      ]),
      scripts
    )

    const resolved = await bindReference(client, person('p-grace')).resolve()

    expect(resolved).toMatchObject({
      id: 'p-grace',
      firstName: 'Grace',
      creationDate: CREATED,
      nickname: null,
      company: false,
    })
    // One automation process, with the shipped reference table.
    expect(scripts).toHaveLength(1)
    expect(scripts[0]?.references['Person']).toEqual({
      id: { kind: 'string' },
      addressing: { collection: 'people', lookup: 'byId', property: 'id' },
    })
  })

  it('fails with TargetNotFoundError naming the person when none has the identifier', async () => {
    const client = await contactsClient(standInContacts([['p-ada', 'Ada']]))

    const error = await rejectionOf(bindReference(client, person('p-missing')).resolve())

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Person' })
  })
})

describe('a bound identity collection of Contacts people, resolved through the local client', () => {
  it('resolves to the person records in entry order, in one automation process', async () => {
    const scripts: NativeScript[] = []
    const client = await contactsClient(
      standInContacts([
        ['p-ada', 'Ada'],
        ['p-grace', 'Grace'],
      ]),
      scripts
    )

    const resolved = await bindReference(client, people('p-grace', 'p-ada')).resolve()

    expect(resolved).toHaveLength(2)
    expect(resolved).toMatchObject([
      { id: 'p-grace', firstName: 'Grace' },
      { id: 'p-ada', firstName: 'Ada' },
    ])
    expect(scripts).toHaveLength(1)
  })

  it('resolves an empty collection to []', async () => {
    const client = await contactsClient(standInContacts([]))

    await expect(bindReference(client, people()).resolve()).resolves.toEqual([])
  })

  it('fails with TargetNotFoundError whose entryIndex names the missing entry', async () => {
    const client = await contactsClient(standInContacts([['p-ada', 'Ada']]))

    const error = await rejectionOf(bindReference(client, people('p-ada', 'p-missing')).resolve())

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Person', entryIndex: 1 })
  })
})
