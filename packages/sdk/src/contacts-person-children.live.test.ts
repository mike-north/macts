/**
 * LOCALLY-AUTOMATABLE live check that Contacts email addresses, phone numbers
 * and addresses are found and resolved within their person, against the real
 * app. NOT run in CI.
 *
 * ## What this tests
 *
 * An email, phone or address is got within its person, so a reference to one
 * carries that person as its container, and resolving it looks the item up
 * within the container (phases/13 D7, container scoping). Through
 * `@macts/sdk/local`'s `createClient`, with the default native executor, the
 * suite takes the first listed person holding at least one of each, and for
 * each kind:
 *
 *   1. lists them under the person, and gets the first by its id within the
 *      person, which reads back the same id;
 *   2. resolves an identity reference to it, with the person as container, to
 *      the record with the same id;
 *   3. resolves the same reference within another person, which fails as
 *      `TargetNotFoundError` naming the item's resource;
 *   4. resolves it within a person id no person has, which fails as
 *      `TargetNotFoundError` naming `Person`.
 *
 * It also checks the address lookup Contacts answers wrongly by id specifier:
 * an address id held by one person, asked for under a person holding no
 * address, fails as `TargetNotFoundError` naming `Address`, from both
 * `addresses.get` and resolution, rather than coming back as a record.
 *
 * Every call is a read. Nothing is created, changed or deleted, and no action
 * that acts on a person is called. Assertions compare identifiers as
 * booleans, and errors by class and resource, so a failure never prints a
 * name, value or identifier; only counts and booleans are logged.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with Contacts.app, holding a person
 *   with at least one email address, phone number and address, another
 *   person, and a person holding no address.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control Contacts, and Contacts access. The first run raises one-time
 *   prompts that only a person at the Mac can answer; until they are
 *   answered, calls hang and then fail with a timeout.
 * - The records come from the personal data on this Mac.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * Listing Contacts people can take most of the executor's 30 s limit, so run
 * this file on its own, not beside other Contacts live files:
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/sdk exec vitest run src/contacts-person-children.live.test.ts
 * ```
 *
 * @see /System/Applications/Contacts.app/Contents/Resources/Contacts.sdef
 * @see ../../../manifests/contacts/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D7 container scoping, resolvable targets)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { contactsContract, type ContactsClient } from '@macts/contacts/contract'
import { Integer, MactsError } from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { bindReference, createClient } from './local.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/** Per-test limit: a cold app launch plus the executor's own 30 s limit, several times. */
const LIVE_TEST_TIMEOUT_MS = 180_000

/**
 * Limit for finding the people the checks use: one page of people, then the
 * three child lists of each person until one holds all three.
 */
const SCAN_TIMEOUT_MS = 600_000

/** How many people to look through: the size of the one page of people read. */
const PERSON_SCAN_LIMIT = 60

/** A person id no Contacts person has: a fixed UUID-shaped value. */
const MISSING_PERSON_ID = '00000000-0000-4000-8000-000000000000'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The suite mints its key there
// and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-person-children-live-'))
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

/** The kinds of item a person holds that these checks cover, by client key and resource. */
const CHILDREN = [
  ['emails', 'Email'],
  ['phones', 'Phone'],
  ['addresses', 'Address'],
] as const

/** A record's `id`, when it has one. */
function idOf(record: unknown): unknown {
  return typeof record === 'object' && record !== null && 'id' in record ? record.id : undefined
}

/**
 * How a call settled, as names only: `resolved` when it returned, otherwise
 * the error's class and the resource its details name. Never a value.
 */
async function outcomeOf(call: () => Promise<unknown>): Promise<string> {
  try {
    await call()
    return 'resolved'
  } catch (error) {
    if (!(error instanceof MactsError)) return 'non-macts error'
    const details: unknown = error.details
    const resource =
      typeof details === 'object' && details !== null && 'resource' in details
        ? String(details.resource)
        : 'none'
    return `${error.name} naming ${resource}`
  }
}

/** A reference to the `resource` item with `id`, within the person with `personId`. */
function within<R extends (typeof CHILDREN)[number][1]>(resource: R, id: string, personId: string) {
  return {
    app: 'contacts',
    resource,
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

describe.skipIf(!liveAppsEnabled)(
  'Contacts emails, phones and addresses within a person, against Contacts.app (local only)',
  () => {
    let contacts: ContactsClient
    /** The first listed person holding an email, a phone and an address. */
    let holder: string | undefined
    /** Another listed person. */
    let other: string | undefined
    /** A listed person holding no address. */
    let noAddress: string | undefined

    beforeAll(async () => {
      const key = await createApiKey({
        name: 'Live Contacts person children test',
        permissions: [
          'contacts:people:list',
          ...CHILDREN.flatMap(([key]) => [`contacts:${key}:list`, `contacts:${key}:get`]),
        ],
      })
      contacts = createClient(contactsContract, {
        token: key.token,
        governance: { policy: ALLOW_ALL_POLICY },
      })
      const people = await contacts.people.list({ pageSize: Integer.validate(PERSON_SCAN_LIMIT) })
      let scanned = 0
      for (const { id } of people.items) {
        if (holder !== undefined && noAddress !== undefined) break
        scanned += 1
        const counts = await Promise.all(
          CHILDREN.map(async ([key]) => (await contacts[key].list(id)).items.length)
        )
        if (holder === undefined && counts.every((count) => count > 0)) holder = id
        if (noAddress === undefined && counts[2] === 0) noAddress = id
      }
      other = people.items.find(({ id }) => id !== holder)?.id
      console.info(
        `people listed: ${String(people.items.length)}, scanned: ${String(scanned)}; ` +
          `holder found: ${String(holder !== undefined)}, other found: ${String(other !== undefined)}, ` +
          `person with no address found: ${String(noAddress !== undefined)}`
      )
    }, SCAN_TIMEOUT_MS)

    it.each(CHILDREN)(
      'gets and resolves the first of the %s of a person within that person only',
      async (key, resource) => {
        if (holder === undefined) return
        const personId = holder
        const listed = await contacts[key].list(personId)
        const ids = listed.items.map((item) => item.id)
        const first = ids[0]
        if (first === undefined) return
        console.info(
          `${resource}: ${String(ids.length)} listed, ids unique: ${String(new Set(ids).size === ids.length)}, ` +
            `ids prefixed by the person id: ${String(ids.filter((id) => id.startsWith(personId)).length)}`
        )

        const got = await contacts[key].get(personId, first)
        expect(idOf(got) === first).toBe(true)

        const resolved = await bindReference(contacts, within(resource, first, personId)).resolve()
        expect(idOf(resolved) === first).toBe(true)

        if (other !== undefined) {
          const otherPerson = other
          expect(
            await outcomeOf(() =>
              bindReference(contacts, within(resource, first, otherPerson)).resolve()
            )
          ).toBe(`TargetNotFoundError naming ${resource}`)
        }
        expect(
          await outcomeOf(() =>
            bindReference(contacts, within(resource, first, MISSING_PERSON_ID)).resolve()
          )
        ).toBe('TargetNotFoundError naming Person')
      },
      LIVE_TEST_TIMEOUT_MS
    )

    it(
      'finds no address under a person holding none for an address id another person holds',
      async () => {
        if (holder === undefined || noAddress === undefined) return
        const empty = noAddress
        const first = (await contacts.addresses.list(holder)).items[0]?.id
        if (first === undefined) return

        expect(await outcomeOf(() => contacts.addresses.get(empty, first))).toBe(
          'TargetNotFoundError naming Address'
        )
        expect(
          await outcomeOf(() => bindReference(contacts, within('Address', first, empty)).resolve())
        ).toBe('TargetNotFoundError naming Address')
      },
      LIVE_TEST_TIMEOUT_MS
    )
  }
)
