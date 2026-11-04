/**
 * Finding a Contacts address within its person, through the local client,
 * with the real native executor.
 *
 * Contacts answers an address id specifier wrongly under a person who holds
 * no address: `person.addresses.byId(id).exists()` is true there for an id
 * that belongs to another person's address, and the specifier reads back that
 * id with the other fields empty, so a lookup by id specifier returns an
 * address the person does not hold instead of failing. Under a person who
 * holds addresses, and for email addresses and phone numbers under any
 * person, the specifier is answered correctly. A match on the address's `id`
 * property (`whose`) finds nothing under a person who holds no address with
 * that id, so Contacts' address lookup is that match (manifest identifier
 * targeting `byProperty`).
 *
 * The bug: an address id from another person, asked for under a person with
 * no addresses, came back from `addresses.get` and from reference resolution
 * as a record. It must be `TargetNotFoundError` naming `Address` (phases/13
 * D7, container scoping: a wrong container fails as a missing target).
 *
 * Each case runs the real generated Contacts contract, the real runtime
 * registration and the real native executor. Only the executor's transport is
 * replaced: it evaluates the composed script against a stand-in Contacts
 * application that answers both lookups as Contacts does, so the get body,
 * the reference table and the resolution body are the shipped ones.
 *
 * @see /System/Applications/Contacts.app/Contents/Resources/Contacts.sdef
 * @see ../../../manifests/contacts/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D7 container scoping, D10 identifier targeting)
 */

import { afterAll, describe, expect, it, vi } from 'vitest'
import { createNativeExecutor, type NativeScript } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import { TargetNotFoundError } from '@macts/contracts'
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
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-address-lookup-'))
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

/** The ids of one stand-in person, and of the addresses it holds. */
interface StandInPerson {
  readonly id: string
  readonly addresses: readonly string[]
}

/** A specifier that names no object, as the automation bridge hands one out. */
const ABSENT = { exists: () => false }

/** The native property record of a stand-in address with `id`. */
function addressRecord(id: string, city: string): Record<string, unknown> {
  return {
    id,
    city,
    street: `${city} street`,
    state: `${city} state`,
    zip: null,
    country: null,
    countryCode: null,
    formattedAddress: `${city} formatted`,
    label: 'home',
  }
}

/**
 * A stand-in Contacts application whose people are found by id specifier,
 * each holding the addresses its entry lists. Its address collections answer
 * both lookups as Contacts does:
 *
 * - `byId(id)` finds a held address; under a person holding no address it
 *   hands out a specifier that claims to exist and reads back `id` with the
 *   other fields empty; under a person holding others it names nothing.
 * - `whose({ id })` holds exactly the held addresses with that id, and its
 *   first element names nothing when there is none.
 */
function standInContacts(persons: readonly StandInPerson[]) {
  const objects = new Map(
    persons.map(({ id: personId, addresses }) => {
      const held = new Map(
        addresses.map((id) => [
          id,
          { exists: () => true, id: () => id, properties: () => addressRecord(id, 'Springfield') },
        ])
      )
      const phantom = (id: unknown) => ({
        exists: () => true,
        id: () => id,
        properties: () => addressRecord(String(id), ''),
      })
      return [
        personId,
        {
          exists: () => true,
          id: () => personId,
          addresses: {
            byId: (id: unknown) => held.get(String(id)) ?? (held.size === 0 ? phantom(id) : ABSENT),
            whose: (match: { readonly id?: unknown }) => {
              const found = [...held.values()].filter((address) => address.id() === match.id)
              return { 0: found[0] ?? ABSENT, length: found.length }
            },
          },
        },
      ]
    })
  )
  return { people: { byId: (id: unknown) => objects.get(String(id)) ?? ABSENT } }
}

/** A person holding one address, and a person holding none. */
const OWNER: StandInPerson = { id: 'p-owner', addresses: ['a-1'] }
const EMPTY: StandInPerson = { id: 'p-empty', addresses: [] }

/** A local Contacts client that may get addresses, over `app`. */
async function contactsClient(app: object, scripts: NativeScript[] = []) {
  const key = await createApiKey({
    name: 'Address lookup test',
    permissions: ['contacts:addresses:get', 'contacts:addresses:list'],
  })
  return createClient(contactsContract, {
    token: key.token,
    governance: { policy: ALLOW_ALL_POLICY },
    executor: createNativeExecutor({ transport: standInTransport(app, scripts) }),
  })
}

/** A reference to the address with `id` within the person with `personId`, as a caller builds one. */
function address(id: string, personId: string) {
  return {
    app: 'contacts',
    resource: 'Address',
    form: 'identity',
    cardinality: 'one',
    id,
    container: {
      app: 'contacts',
      resource: 'Person',
      form: 'identity',
      cardinality: 'one',
      id: personId,
    },
  } as const
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

describe('Contacts addresses.get within a person', () => {
  it('gets an address the person holds', async () => {
    const client = await contactsClient(standInContacts([OWNER, EMPTY]))

    const got = await client.addresses.get('p-owner', 'a-1')

    expect(got).toMatchObject({ id: 'a-1', city: 'Springfield' })
  })

  it('fails with TargetNotFoundError naming Address for another person’s address id under a person with no addresses (regression: came back as a record)', async () => {
    const client = await contactsClient(standInContacts([OWNER, EMPTY]))

    const error = await rejectionOf(client.addresses.get('p-empty', 'a-1'))

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Address' })
  })

  it('fails with TargetNotFoundError naming Person when the person does not exist', async () => {
    const client = await contactsClient(standInContacts([OWNER]))

    const error = await rejectionOf(client.addresses.get('p-missing', 'a-1'))

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Person' })
  })
})

describe('a bound Contacts address reference, resolved within its person', () => {
  it('resolves within the person holding it, matching the address on its id', async () => {
    const scripts: NativeScript[] = []
    const client = await contactsClient(standInContacts([OWNER, EMPTY]), scripts)

    const resolved = await bindReference(client, address('a-1', 'p-owner')).resolve()

    expect(resolved).toMatchObject({ id: 'a-1', city: 'Springfield' })
    // An address is matched on its `id` property within its person, never
    // found by id specifier (manifest identifier targeting `byProperty`).
    expect(scripts[0]?.references['Address']).toEqual({
      id: { kind: 'string' },
      addressing: {
        collection: 'addresses',
        lookup: 'byProperty',
        property: 'id',
        within: 'Person',
      },
    })
  })

  it('fails with TargetNotFoundError naming Address when its container is a person with no addresses (regression: resolved to a record)', async () => {
    const client = await contactsClient(standInContacts([OWNER, EMPTY]))

    const error = await rejectionOf(bindReference(client, address('a-1', 'p-empty')).resolve())

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Address' })
  })

  it('fails with TargetNotFoundError naming Person when its container does not exist', async () => {
    const client = await contactsClient(standInContacts([OWNER]))

    const error = await rejectionOf(bindReference(client, address('a-1', 'p-missing')).resolve())

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Person' })
  })
})
