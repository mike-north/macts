/**
 * Contacts' rollover actions given a person reference, through the local
 * client.
 *
 * `actionTitle`, `performAction` and `shouldEnableAction` take a single person
 * reference at `for`. The macOS provider converts it: the native script finds
 * the person the reference names and passes that object to the app's command.
 * A person that does not exist fails as a missing target before any command
 * runs, and a reference form the provider cannot convert yet fails as an
 * internal error, never as the caller's invalid input.
 *
 * Each call runs through the local client with the real generated Contacts
 * contract, the real runtime registration and the real native executor. Only
 * the executor's transport is replaced: it evaluates the composed script
 * against a stand-in Contacts application in an isolated context, so the
 * script's input plan, reference table and command body are the shipped ones.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D4, D7, D9)
 */

import { createContext, runInContext } from 'node:vm'
import { afterAll, describe, expect, it, vi } from 'vitest'
import {
  NATIVE_CODEC,
  createNativeExecutor,
  runNativeScript,
  type NativeScript,
  type NativeTransport,
} from '@macts/core'
import { composeNativeScript, parseNativeOutcome } from '@macts/core/testing'
import {
  AppUnavailableError,
  InternalError,
  TargetNotFoundError,
  toWireErrorEnvelope,
  type ObjectReferenceData,
  type OperationId,
} from '@macts/contracts'
import { contactsContract } from '@macts/contacts/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local-client.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-person-reference-'))
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

/** The identifier of the one person the stand-in app has. */
const PERSON_ID = 'p-1'

/** A reference to the stand-in app's person, as a caller builds one. */
const PERSON: ObjectReferenceData<string, 'Person'> = {
  app: 'contacts',
  resource: 'Person',
  form: 'identity',
  cardinality: 'one',
  id: PERSON_ID,
}

/** The actions whose required `for` is a person. */
const ACTIONS = [
  { method: 'performAction', id: 'contacts.app.performAction' },
  { method: 'actionTitle', id: 'contacts.app.actionTitle' },
  { method: 'shouldEnableAction', id: 'contacts.app.shouldEnableAction' },
] as const

/** One command the stand-in app received: its name and its parameters. */
interface ReceivedCommand {
  readonly name: string
  readonly params: Readonly<Record<string, unknown>>
}

/**
 * A stand-in Contacts application with one person, found by identifier in its
 * `people` collection as the app's own id specifier finds it. Every command it
 * receives is recorded; finding a person is not a command.
 */
function standInContacts() {
  const commands: ReceivedCommand[] = []
  const person = { exists: () => true, id: () => PERSON_ID, name: () => 'Ada' }
  const absent = { exists: () => false }
  const command =
    (name: string, result: unknown) =>
    (params: Readonly<Record<string, unknown>>): unknown => {
      commands.push({ name, params })
      return result
    }
  const app = {
    people: { byId: (id: unknown) => (id === PERSON_ID ? person : absent) },
    actionTitle: command('actionTitle', 'Title'),
    performAction: command('performAction', true),
    shouldEnableAction: command('shouldEnableAction', true),
  }
  return { app, person, commands }
}

/**
 * A transport that evaluates the composed script against `app` in an isolated
 * context, and keeps every script it ran in `scripts`.
 */
function standInTransport(app: object, scripts: NativeScript[] = []): NativeTransport {
  return {
    run(script) {
      scripts.push(script)
      const context = createContext({
        ObjC: { import: () => undefined },
        Application: () => app,
      })
      const stdout: unknown = runInContext(composeNativeScript(script, NATIVE_CODEC), context)
      const outcome = parseNativeOutcome(String(stdout))
      if (typeof outcome === 'string') throw new Error(`malformed outcome: ${outcome}`)
      return Promise.resolve(outcome)
    },
  }
}

/** A Contacts client allowed to call `id`, whose executor uses `transport`. */
async function contactsClient(id: OperationId, transport: NativeTransport) {
  const permission = contactsContract.operations[id]?.permission
  if (permission === undefined) throw new Error(`no ${id} operation`)
  const key = await createApiKey({ name: 'Person reference test', permissions: [permission] })
  return createClient(contactsContract, {
    token: key.token,
    governance: { policy: ALLOW_ALL_POLICY },
    executor: createNativeExecutor({ transport }),
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

describe('a Contacts action given a person reference', () => {
  it('actionTitle passes the addressed person to the command and decodes its result', async () => {
    const { app, person, commands } = standInContacts()
    const scripts: NativeScript[] = []
    const client = await contactsClient('contacts.app.actionTitle', standInTransport(app, scripts))

    // The contract declares no result for actionTitle, so the call resolves
    // to no value whatever the command returned.
    await expect(client.actionTitle('value', PERSON)).resolves.toBeUndefined()
    expect(commands).toHaveLength(1)
    expect(commands[0]?.name).toBe('actionTitle')
    expect(commands[0]?.params['with']).toBe('value')
    // The command received the app's own person object, not the wire form.
    expect(commands[0]?.params['for']).toBe(person)

    // The script ran the contract's input plan, and its reference table says
    // how the app finds a person: by identifier in `people`, a string.
    expect(scripts).toHaveLength(1)
    expect(scripts[0]?.inputPlan).toEqual(
      contactsContract.operations['contacts.app.actionTitle']?.input.plan
    )
    expect(scripts[0]?.references).toEqual({
      Person: {
        id: { kind: 'string' },
        addressing: { collection: 'people', lookup: 'byId', property: 'id' },
      },
    })
  })

  it.each(ACTIONS)('$method passes the addressed person to the command', async ({ method, id }) => {
    const { app, person, commands } = standInContacts()
    const client = await contactsClient(id, standInTransport(app))

    await client[method]('value', PERSON)

    expect(commands.map((received) => received.name)).toEqual([method])
    expect(commands[0]?.params['for']).toBe(person)
  })

  it('fails with TargetNotFoundError naming the person when none has the identifier', async () => {
    const { app, commands } = standInContacts()
    const client = await contactsClient('contacts.app.actionTitle', standInTransport(app))

    const error = await rejectionOf(client.actionTitle('value', { ...PERSON, id: 'p-missing' }))

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.message).toBe('Contacts has no Person matching the reference at `for`.')
    expect(error.details).toEqual({ resource: 'Person' })
    // The person was found missing before any command was sent.
    expect(commands).toEqual([])
  })

  // Regression: a reference the codec cannot convert was blamed on the caller
  // as invalid input (ValidationError). It is an internal error, and no
  // command is sent.
  it.each(ACTIONS)(
    '$method fails with InternalError, not ValidationError, for a selector person reference',
    async ({ method, id }) => {
      const { app, commands } = standInContacts()
      const client = await contactsClient(id, standInTransport(app))
      const byName: ObjectReferenceData<string, 'Person'> = {
        app: 'contacts',
        resource: 'Person',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Ada' },
      }

      const error = await rejectionOf(client[method]('value', byName))

      expect(error).toBeInstanceOf(InternalError)
      if (!(error instanceof InternalError)) return
      expect(error.message).toBe(
        `The Contacts operation "${method}" takes a reference at \`for\` that the macOS provider cannot convert yet.`
      )
      expect(error.details).toEqual({})
      // A remote caller receives this message verbatim and nothing else: not
      // the codec's own text, which stays in the local cause.
      expect(toWireErrorEnvelope(error)).toEqual({
        error: { code: 'INTERNAL', message: error.message, details: {} },
      })
      expect(commands).toEqual([])
    }
  )
})

/** A bundle identifier no app has: the app cannot be found. */
const NOT_INSTALLED_BUNDLE_ID = 'com.example.macts.not-installed'

// Replaces the check that a reference input failed with InternalError in the
// real automation process for an app that is not installed. It pins existing
// behaviour: the application object is created before the input is decoded,
// so a missing app is reported as missing whatever the input holds, and
// nothing is sent to any app.
describe('a Contacts action for an app that is not installed, in the real automation host (pins the existing AppUnavailableError; replaces the InternalError check for references)', () => {
  it.skipIf(process.platform !== 'darwin').each([
    ['a person reference it can convert', PERSON],
    [
      'a person reference it cannot convert yet',
      {
        app: 'contacts',
        resource: 'Person',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Ada' },
      } satisfies ObjectReferenceData<string, 'Person'>,
    ],
  ])(
    'fails with AppUnavailableError (not-installed), not InternalError, given %s',
    async (_label, reference) => {
      const client = await contactsClient('contacts.app.actionTitle', {
        run: (script, options) =>
          runNativeScript({ ...script, bundleId: NOT_INSTALLED_BUNDLE_ID }, NATIVE_CODEC, {
            timeout: options.timeoutMs,
          }),
      })

      const error = await rejectionOf(client.actionTitle('value', reference))

      expect(error).toBeInstanceOf(AppUnavailableError)
      expect(error).not.toBeInstanceOf(InternalError)
      if (!(error instanceof AppUnavailableError)) return
      expect(error.code).toBe('APP_UNAVAILABLE')
      expect(error.details).toEqual({ app: 'Contacts', reason: 'not-installed' })
    },
    30_000
  )
})
