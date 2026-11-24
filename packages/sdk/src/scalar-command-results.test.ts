/**
 * Scalar command results cross the contract, provider codec, runtime and
 * client entry points. All applications are stand-ins; HTTP is routed to an
 * in-process API and never to a socket. No real Mail or Contacts command can
 * run through these fixtures.
 *
 * Mail's `send` (boolean, Mail.sdef) and Contacts' `save` (no result) run
 * through the real generated contracts, clients and CLI. Text and further
 * boolean results run through the stand-in Roster app, whose commands declare
 * text (`currentLabel`, `labelFor`) and boolean (`confirm`, `isAllowed`)
 * results, because no shipped app command takes a person reference and returns
 * those kinds. No claim establishes non-null results, so explicit null remains
 * data.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppManifestSchema, createNativeExecutor, type NativeScript } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import { Integer, UnexpectedValueError, type ObjectReferenceData } from '@macts/contracts'
import { ContactsClient } from '@macts/contacts'
import { contactsContract } from '@macts/contacts/contract'
import { plugin as contactsCli } from '@macts/contacts/cli'
import { MailClient } from '@macts/mail'
import { mailContract } from '@macts/mail/contract'
import { plugin as mailCli } from '@macts/mail/cli'
import { createApp } from '@macts/api/server'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient as localClient } from './local-client.js'
import { createClient as remoteClient } from './remote.js'
import {
  rosterContract,
  ROSTER_MANIFEST,
  ROSTER_PERMISSIONS,
} from './test-support/roster-fixture.js'

// Key storage captures its home at import time; isolation must precede imports.
const { home, previousHome, previousSecret } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-scalar-results-'))
  const previousHome = process.env['MACTS_HOME']
  const previousSecret = process.env['MACTS_API_KEY_SECRET']
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { home, previousHome, previousSecret }
})

/** The only origin accepted by the recording HTTP boundary. */
const ORIGIN = 'http://scalar-results.test'
/** Synthetic input person resolved only inside the Roster stand-in. */
const PERSON: ObjectReferenceData<string, 'Person'> = {
  app: 'roster',
  resource: 'Person',
  form: 'identity',
  cardinality: 'one',
  id: 'person-7',
}
/** Each client exposes the same behavior through its actual declared method signatures. */
interface IScalarCalls {
  readonly name: string
  readonly send: () => Promise<unknown>
  readonly save: () => Promise<unknown>
}
/** The stand-in app's calls, through the clients that can bind a hand-written contract. */
interface IRosterCalls {
  readonly name: string
  readonly property: () => Promise<unknown>
  readonly title: () => Promise<unknown>
  readonly perform: () => Promise<unknown>
  readonly enable: () => Promise<unknown>
}
let clients: readonly IScalarCalls[] = []
let rosterClients: readonly IRosterCalls[] = []
/** Stand-in return value, varied independently of the command's declared output type. */
let result: unknown
const scripts: NativeScript[] = []
const commands: string[] = []
const responses: unknown[] = []

beforeAll(async () => {
  setLogger(createLogger({ level: 'silent' }))
  const person = { exists: () => true, id: () => 'person-7' }
  const outgoing = { exists: () => true, id: () => 7 }
  const absent = { exists: () => false }
  const mail = standInTransport(
    {
      outgoingMessages: { byId: (id: unknown) => (id === 7 ? outgoing : absent) },
      send(item: unknown) {
        expect(item).toBe(outgoing)
        commands.push('mail.send')
        return result
      },
    },
    scripts
  )
  /** Action input conversion must still hand the command its addressed person. */
  const action = (name: string) => (params: Readonly<Record<string, unknown>>) => {
    expect(params['for']).toBe(person)
    commands.push(`roster.${name}`)
    return result
  }
  const roster = standInTransport(
    {
      people: { byId: (id: unknown) => (id === 'person-7' ? person : absent) },
      currentLabel() {
        commands.push('roster.currentLabel')
        return result
      },
      labelFor: action('labelFor'),
      confirm: action('confirm'),
      isAllowed: action('isAllowed'),
    },
    scripts
  )
  const contacts = standInTransport(
    {
      save() {
        commands.push('contacts.save')
        return result
      },
    },
    scripts
  )
  const executor = createNativeExecutor({
    transport: {
      run(script, options) {
        if (script.bundleId === 'com.apple.mail') return mail.run(script, options)
        if (script.bundleId === 'com.apple.AddressBook') return contacts.run(script, options)
        if (script.bundleId === ROSTER_MANIFEST.app.bundleId) return roster.run(script, options)
        throw new Error('Only stand-in Mail, Contacts and Roster are available')
      },
    },
  })
  const { token } = await createApiKey({
    name: 'Scalar result fixtures',
    permissions: [
      'mail:outgoingMessages:send',
      'contacts:app:save',
      ...Object.values(ROSTER_PERMISSIONS),
    ],
  })
  const options = { executor, governance: { policy: ALLOW_ALL_POLICY } }
  const mailManifest = AppManifestSchema.parse(await mailContract.loadManifest())
  const contactsManifest = AppManifestSchema.parse(await contactsContract.loadManifest())
  const rosterManifest = AppManifestSchema.parse(await rosterContract.loadManifest())
  const api = createApp([], {
    ...options,
    cors: false,
    prettyJson: false,
    rateLimit: false,
    register(registrar) {
      registrar.registerContract(mailContract, mailManifest)
      registrar.registerContract(contactsContract, contactsManifest)
      registrar.registerContract(rosterContract, rosterManifest)
    },
  })
  const recordingFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init)
    if (new URL(request.url).origin !== ORIGIN)
      throw new Error('Only the in-process API is permitted')
    const response = await api.fetch(request)
    responses.push(await response.clone().json())
    return response
  }
  vi.stubGlobal('fetch', recordingFetch)
  vi.stubEnv('MACTS_API_KEY', token)
  vi.stubEnv('MACTS_API_URL', ORIGIN)
  const rootMail = new MailClient({ apiKey: token, baseUrl: ORIGIN })
  const rootContacts = new ContactsClient({ apiKey: token, baseUrl: ORIGIN })
  const localMail = localClient(mailContract, { token, ...options })
  const localContacts = localClient(contactsContract, { token, ...options })
  const remoteMail = remoteClient(mailContract, { token, url: ORIGIN, fetch: recordingFetch })
  const remoteContacts = remoteClient(contactsContract, {
    token,
    url: ORIGIN,
    fetch: recordingFetch,
  })
  const localRoster = localClient(rosterContract, { token, ...options })
  const remoteRoster = remoteClient(rosterContract, { token, url: ORIGIN, fetch: recordingFetch })
  clients = [
    {
      name: 'generated',
      send: () => rootMail.outgoingMessages.send(7),
      save: () => rootContacts.save(),
    },
    {
      name: 'local',
      send: () => localMail.outgoingMessages.send(Integer.validate(7)),
      save: () => localContacts.save(),
    },
    {
      name: 'remote',
      send: () => remoteMail.outgoingMessages.send(Integer.validate(7)),
      save: () => remoteContacts.save(),
    },
  ]
  rosterClients = [
    {
      name: 'local',
      property: () => localRoster.currentLabel(),
      title: () => localRoster.labelFor('email', PERSON),
      perform: () => localRoster.confirm('email', PERSON),
      enable: () => localRoster.isAllowed('email', PERSON),
    },
    {
      name: 'remote',
      property: () => remoteRoster.currentLabel(),
      title: () => remoteRoster.labelFor('email', PERSON),
      perform: () => remoteRoster.confirm('email', PERSON),
      enable: () => remoteRoster.isAllowed('email', PERSON),
    },
  ]
})

beforeEach(() => {
  scripts.length = 0
  commands.length = 0
  responses.length = 0
  result = undefined
})
afterAll(async () => {
  closeKeyStore()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  if (previousHome === undefined) delete process.env['MACTS_HOME']
  else process.env['MACTS_HOME'] = previousHome
  if (previousSecret === undefined) delete process.env['MACTS_API_KEY_SECRET']
  else process.env['MACTS_API_KEY_SECRET'] = previousSecret
  const { rm } = await import('node:fs/promises')
  await rm(home, { recursive: true, force: true })
})

describe.each(['generated', 'local', 'remote'])('%s scalar command parity', (name) => {
  /** Resolve after setup, retaining each client's concrete call signatures. */
  const client = () => {
    const found = clients.find((candidate) => candidate.name === name)
    if (found === undefined) throw new Error('Missing client fixture')
    return found
  }
  it('returns false from send as a successful boolean value', async () => {
    result = false
    await expect(client().send()).resolves.toBe(false)
    expect(commands).toHaveLength(1)
    if (name !== 'local') expect(responses).toEqual([{ result: false }])
  })
  it('retains explicit null for send without a non-null evidence claim', async () => {
    result = null
    await expect(client().send()).resolves.toBeNull()
  })
  it('rejects the wrong scalar type from send', async () => {
    result = 'INVALID_SCALAR_SENTINEL'
    await expect(client().send()).rejects.toBeInstanceOf(UnexpectedValueError)
    if (name !== 'local') expect(responses).toMatchObject([{ error: { code: 'UNEXPECTED_VALUE' } }])
  })
  it('retains undefined for a void command', async () => {
    result = false
    await expect(client().save()).resolves.toBeUndefined()
  })
})

describe.each(['local', 'remote'])('%s scalar command parity, stand-in app', (name) => {
  const client = () => {
    const found = rosterClients.find((candidate) => candidate.name === name)
    if (found === undefined) throw new Error('Missing client fixture')
    return found
  }
  it.each(['perform', 'enable'] as const)(
    'returns false from %s as a successful boolean value',
    async (method) => {
      result = false
      await expect(client()[method]()).resolves.toBe(false)
      expect(commands).toHaveLength(1)
      if (name !== 'local') expect(responses).toEqual([{ result: false }])
    }
  )
  it.each(['property', 'title'] as const)(
    'returns text from %s, including empty text',
    async (method) => {
      result = ''
      await expect(client()[method]()).resolves.toBe('')
    }
  )
  it.each(['property', 'title', 'perform', 'enable'] as const)(
    'retains explicit null for %s without a non-null evidence claim',
    async (method) => {
      result = null
      await expect(client()[method]()).resolves.toBeNull()
    }
  )
  it.each(['perform', 'enable'] as const)(
    'rejects the wrong scalar type from %s',
    async (method) => {
      result = 'INVALID_SCALAR_SENTINEL'
      await expect(client()[method]()).rejects.toBeInstanceOf(UnexpectedValueError)
      if (name !== 'local')
        expect(responses).toMatchObject([{ error: { code: 'UNEXPECTED_VALUE' } }])
    }
  )
  it.each(['property', 'title'] as const)('rejects a boolean from %s', async (method) => {
    result = true
    await expect(client()[method]()).rejects.toBeInstanceOf(UnexpectedValueError)
  })
})

/** Run an emitted CLI command with the option values Clipanion supplies. */
async function cli(app: 'mail' | 'contacts', method: 'send' | 'save', json: boolean) {
  const plugin = app === 'mail' ? mailCli : contactsCli
  const path = app === 'mail' ? ['mail', 'outgoingMessages', method] : ['contacts', method]
  const Command = plugin.commands.find((candidate) =>
    candidate.paths?.some((p) => p.join(' ') === path.join(' '))
  )
  if (Command === undefined) throw new Error('Missing generated command')
  const command = new Command()
  let stdout = '',
    stderr = ''
  Object.assign(command, {
    json,
    ...(app === 'mail' ? { outgoingMessageId: '7' } : {}),
    context: {
      stdout: {
        write: (text: string) => {
          stdout += text
        },
      },
      stderr: {
        write: (text: string) => {
          stderr += text
        },
      },
    },
  })
  const code = await command.execute()
  return { code, stdout, stderr }
}

describe.each([false, true])('shipped CLI scalar results (json=%s)', (json) => {
  it('outputs Mail false as data without turning it into a failure or success message', async () => {
    result = false
    const output = await cli('mail', 'send', json)
    expect(output.code).toBe(0)
    expect(output.stderr).toBe('')
    if (json) expect(JSON.parse(output.stdout)).toEqual({ data: false })
    else expect(output.stdout).toBe('false\n')
  })
  it('retains the existing success message for Contacts save', async () => {
    const output = await cli('contacts', 'save', json)
    expect(output.code).toBe(0)
    if (json)
      expect(JSON.parse(output.stdout)).toEqual({
        success: true,
        message: 'save completed successfully',
      })
    else expect(output.stdout).toBe('save completed successfully\n')
  })
  it('does not output data or success when result conversion fails', async () => {
    result = 'INVALID_SCALAR_SENTINEL'
    const output = await cli('mail', 'send', json)
    expect(output.code).toBe(1)
    expect(output.stdout).toBe('')
    expect(output.stderr).not.toContain('INVALID_SCALAR_SENTINEL')
  })
})
