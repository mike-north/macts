/**
 * Commands that take a person reference, through the local client.
 *
 * The stand-in Roster app's `labelFor`, `confirm` and `isAllowed` take a single
 * person reference at `for`. The macOS provider converts it: the native script finds
 * the person the reference names and passes that object to the app's command.
 * A person that does not exist fails as a missing target before any command
 * runs, and a reference form the provider cannot convert yet fails as an
 * internal error, never as the caller's invalid input.
 *
 * Each call runs through the local client with the stand-in Roster contract
 * (no real app command takes a required person reference), the real runtime
 * registration and the real native executor. Only the executor's transport is
 * replaced: it evaluates the composed script against a stand-in application in
 * an isolated context, so the
 * script's input plan, reference table and command body are the shipped ones.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D4, D7, D9)
 */

import { afterAll, describe, expect, it, vi } from 'vitest'
import {
  NATIVE_CODEC,
  createNativeExecutor,
  runNativeScript,
  type NativeScript,
  type NativeTransport,
} from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import {
  AppUnavailableError,
  InternalError,
  TargetNotFoundError,
  toWireErrorEnvelope,
  type OperationId,
} from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local-client.js'
import { rosterContract, type RosterPersonReference } from './test-support/roster-fixture.js'

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
const PERSON: RosterPersonReference = {
  app: 'roster',
  resource: 'Person',
  form: 'identity',
  cardinality: 'one',
  id: PERSON_ID,
}

/** The actions whose required `for` is a person. */
const ACTIONS = [
  { method: 'confirm', id: 'roster.app.confirm' },
  { method: 'labelFor', id: 'roster.app.labelFor' },
  { method: 'isAllowed', id: 'roster.app.isAllowed' },
] as const

/** One command the stand-in app received: its name and its parameters. */
interface ReceivedCommand {
  readonly name: string
  readonly params: Readonly<Record<string, unknown>>
}

/**
 * A stand-in Roster application with one person, found by identifier in its
 * `people` collection as the app's own id specifier finds it. Every command it
 * receives is recorded; finding a person is not a command.
 */
function standInRoster() {
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
    labelFor: command('labelFor', 'Title'),
    confirm: command('confirm', true),
    isAllowed: command('isAllowed', true),
  }
  return { app, person, commands }
}

/** A Roster client allowed to call `id`, whose executor uses `transport`. */
async function rosterClient(id: OperationId, transport: NativeTransport) {
  const permission = rosterContract.operations[id]?.permission
  if (permission === undefined) throw new Error(`no ${id} operation`)
  const key = await createApiKey({ name: 'Person reference test', permissions: [permission] })
  return createClient(rosterContract, {
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

describe('a Roster command given a person reference', () => {
  it('labelFor passes the addressed person to the command and decodes its result', async () => {
    const { app, person, commands } = standInRoster()
    const scripts: NativeScript[] = []
    const client = await rosterClient('roster.app.labelFor', standInTransport(app, scripts))

    // The command's text result must survive addressing.
    await expect(client.labelFor('value', PERSON)).resolves.toBe('Title')
    expect(commands).toHaveLength(1)
    expect(commands[0]?.name).toBe('labelFor')
    expect(commands[0]?.params['with']).toBe('value')
    // The command received the app's own person object, not the wire form.
    expect(commands[0]?.params['for']).toBe(person)

    // The script ran the contract's input plan, and its reference table says
    // how the app finds a person: by identifier in `people`, a string.
    expect(scripts).toHaveLength(1)
    expect(scripts[0]?.inputPlan).toEqual(
      rosterContract.operations['roster.app.labelFor']?.input.plan
    )
    expect(scripts[0]?.references).toEqual({
      Person: {
        id: { kind: 'string' },
        addressing: { collection: 'people', lookup: 'byId', property: 'id' },
      },
    })
  })

  it.each(ACTIONS)('$method passes the addressed person to the command', async ({ method, id }) => {
    const { app, person, commands } = standInRoster()
    const client = await rosterClient(id, standInTransport(app))

    await client[method]('value', PERSON)

    expect(commands.map((received) => received.name)).toEqual([method])
    expect(commands[0]?.params['for']).toBe(person)
  })

  it('fails with TargetNotFoundError naming the person when none has the identifier', async () => {
    const { app, commands } = standInRoster()
    const client = await rosterClient('roster.app.labelFor', standInTransport(app))

    const error = await rejectionOf(client.labelFor('value', { ...PERSON, id: 'p-missing' }))

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.message).toBe('Roster has no Person matching the reference at `for`.')
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
      const { app, commands } = standInRoster()
      const client = await rosterClient(id, standInTransport(app))
      const byName: RosterPersonReference = {
        app: 'roster',
        resource: 'Person',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Ada' },
      }

      const error = await rejectionOf(client[method]('value', byName))

      expect(error).toBeInstanceOf(InternalError)
      if (!(error instanceof InternalError)) return
      expect(error.message).toBe(
        `The Roster operation "${method}" takes a reference at \`for\` that the macOS provider cannot convert yet.`
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
describe('a Roster command for an app that is not installed, in the real automation host (pins the existing AppUnavailableError; replaces the InternalError check for references)', () => {
  it.skipIf(process.platform !== 'darwin').each([
    ['a person reference it can convert', PERSON],
    [
      'a person reference it cannot convert yet',
      {
        app: 'roster',
        resource: 'Person',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Ada' },
      } satisfies RosterPersonReference,
    ],
  ])(
    'fails with AppUnavailableError (not-installed), not InternalError, given %s',
    async (_label, reference) => {
      const client = await rosterClient('roster.app.labelFor', {
        run: (script, options) =>
          runNativeScript({ ...script, bundleId: NOT_INSTALLED_BUNDLE_ID }, NATIVE_CODEC, {
            timeout: options.timeoutMs,
          }),
      })

      const error = await rejectionOf(client.labelFor('value', reference))

      expect(error).toBeInstanceOf(AppUnavailableError)
      expect(error).not.toBeInstanceOf(InternalError)
      if (!(error instanceof AppUnavailableError)) return
      expect(error.code).toBe('APP_UNAVAILABLE')
      expect(error.details).toEqual({ app: 'Roster', reason: 'not-installed' })
    },
    30_000
  )
})
