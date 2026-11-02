/**
 * Integration: both client factories against the real generated contracts.
 *
 * The contracts are the ones `@macts/notes` and `@macts/calendar` ship at their
 * `/contract` subpaths, registered against the real manifests under
 * `manifests/`. Only the executor is a recording stub, so no app runs. Keys
 * are real, minted in a temporary `MACTS_HOME`.
 *
 * Every expected value is written by hand from the manifests and phases/13:
 *
 * - Notes' `getAttachment` command has `routeName: get`, so the operation is
 *   `notes.attachments.get`, permission `notes:attachments:get`, target
 *   `{ command: 'getAttachment', resource: 'Attachment' }`, identifier `id`.
 * - D10 read positions: a read field is nullable unless there is evidence
 *   otherwise. Attachment `name`, `creationDate`, and `modificationDate` carry
 *   no non-null evidence, so they are nullable. A Note's `name` is its primary
 *   identifier, which is non-null by structure. The top level of a get is never
 *   null.
 * - D10 input positions: an update field accepts `null` only when the property
 *   is resettable, and no Calendar event property is curated resettable, so a
 *   `null` is rejected before execution (D11).
 * - D5: both localities run the same pipeline; D6: a service error is rebuilt
 *   as the class its code names.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6, D10, D11)
 */

import { afterAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '@macts/api/server'
import {
  calendarContract,
  type CalendarClient,
  type EventUpdateInput,
} from '@macts/calendar/contract'
import { notesContract } from '@macts/notes/contract'
import { AppManifestSchema, type AppManifest } from '@macts/core'
import * as contracts from '@macts/contracts'
import {
  MactsError,
  PermissionDeniedError,
  TargetNotFoundError,
  UnexpectedValueError,
  ValidationError,
  type WireValue,
} from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
  type GovernanceContext,
} from '@macts/runtime'
import { createClient as createRemoteClient } from './remote.js'
import * as local from './local.js'
import { createClient as createLocalClient } from './local-client.js'
import * as remote from './index.js'
import { createRecordingExecutor, rejection, type RecordingExecutor } from './test-helpers.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-real-contracts-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

// Denied calls log to the process-wide logger; keep expected failures quiet.
setLogger(createLogger({ level: 'silent' }))

afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(mactsHome, { recursive: true, force: true })
})

const ALLOW_ALL: GovernanceContext = { policy: ALLOW_ALL_POLICY }

/** A real key holding `permissions`. */
async function keyWith(...permissions: string[]): Promise<string> {
  const key = await createApiKey({ name: 'Real contract test', permissions })
  return key.token
}

/** Executor answering with `wire` for every request. */
function answering(wire: WireValue): RecordingExecutor {
  return createRecordingExecutor(() => Promise.resolve(wire))
}

const ATTACHMENT_ID = 'x-coredata://attachment-1'

const CREATED_AT = '2026-01-15T10:30:00.000Z'
const MODIFIED_AT = '2026-01-16T10:30:00.000Z'

/**
 * An attachment as the executor returns it: wire form, every declared field
 * present. Dates travel as date control records (D3).
 */
const ATTACHMENT_WIRE = {
  id: ATTACHMENT_ID,
  name: 'diagram.png',
  creationDate: { date: CREATED_AT },
  modificationDate: { date: MODIFIED_AT },
} as const

describe('local client over the real Notes contract', () => {
  it('registers against the real manifest and sends the attachment get to the executor', async () => {
    const token = await keyWith('notes:attachments:get')
    const executor = answering(ATTACHMENT_WIRE)
    const notes = createLocalClient(notesContract, { token, executor, governance: ALLOW_ALL })

    const attachment = await notes.attachments.get(ATTACHMENT_ID)

    // Notes declares the attachment dates as `date`, so they decode to `Date`.
    expect(attachment).toEqual({
      id: ATTACHMENT_ID,
      name: 'diagram.png',
      creationDate: new Date(CREATED_AT),
      modificationDate: new Date(MODIFIED_AT),
    })
    expect(executor.requests).toHaveLength(1)
    expect(executor.requests[0]?.target).toEqual({
      command: 'getAttachment',
      resource: 'Attachment',
    })
    expect(executor.requests[0]?.input).toEqual({ id: ATTACHMENT_ID })
  })

  it('returns null for nullable read fields (D10: no non-null evidence)', async () => {
    const token = await keyWith('notes:attachments:get')
    const executor = answering({ ...ATTACHMENT_WIRE, name: null, creationDate: null })
    const notes = createLocalClient(notesContract, { token, executor, governance: ALLOW_ALL })

    const attachment = await notes.attachments.get(ATTACHMENT_ID)

    expect(attachment.id).toBe(ATTACHMENT_ID)
    expect(attachment.name).toBeNull()
    expect(attachment.creationDate).toBeNull()
  })

  it('rejects a null top-level get result (D10: a single read never yields null)', async () => {
    const token = await keyWith('notes:attachments:get')
    const notes = createLocalClient(notesContract, {
      token,
      executor: answering(null),
      governance: ALLOW_ALL,
    })

    expect(await rejection(notes.attachments.get(ATTACHMENT_ID))).toBeInstanceOf(
      UnexpectedValueError
    )
  })

  it('rejects a null at a non-null field, naming it (D10: Note id is the primary identifier)', async () => {
    const token = await keyWith('notes:notes:get')
    const executor = answering({
      name: 'Groceries',
      id: null,
      body: null,
      plaintext: null,
      creationDate: { date: CREATED_AT },
      modificationDate: { date: MODIFIED_AT },
      shared: false,
      passwordProtected: false,
    })
    const notes = createLocalClient(notesContract, { token, executor, governance: ALLOW_ALL })

    const error = await rejection(notes.notes.get('x-coredata://note-1'))

    expect(error).toBeInstanceOf(UnexpectedValueError)
    expect(error).toMatchObject({ details: { issues: [{ path: ['id'] }] } })
  })

  it('sends a note get to the executor under the id identifier, not the name (#194)', async () => {
    const token = await keyWith('notes:notes:get')
    const executor = answering({
      name: 'Groceries',
      id: 'x-coredata://note-1',
      body: null,
      plaintext: null,
      creationDate: { date: CREATED_AT },
      modificationDate: { date: MODIFIED_AT },
      shared: false,
      passwordProtected: false,
    })
    const notes = createLocalClient(notesContract, { token, executor, governance: ALLOW_ALL })

    const note = await notes.notes.get('x-coredata://note-1')

    expect(note.id).toBe('x-coredata://note-1')
    expect(executor.requests[0]?.target).toEqual({ command: 'get', resource: 'Note' })
    expect(executor.requests[0]?.input).toEqual({ id: 'x-coredata://note-1' })
  })

  it('refuses a key without notes:attachments:get, naming the permission', async () => {
    const token = await keyWith('notes:notes:get')
    const executor = answering(ATTACHMENT_WIRE)
    const notes = createLocalClient(notesContract, { token, executor, governance: ALLOW_ALL })

    const error = await rejection(notes.attachments.get(ATTACHMENT_ID))

    expect(error).toBeInstanceOf(PermissionDeniedError)
    expect(error).toMatchObject({ details: { required: 'notes:attachments:get' } })
    expect(executor.requests).toHaveLength(0)
  })
})

describe('local client over the real Calendar contract', () => {
  it('rejects a null update field before execution (D10: no property is resettable)', async () => {
    const token = await keyWith('calendar:events:update')
    const executor = answering({})
    const calendar: CalendarClient = createLocalClient(calendarContract, {
      token,
      executor,
      governance: ALLOW_ALL,
    })
    // `summary` is `string | undefined` by type, so `null` is a compile error;
    // the cast stands in for a JavaScript caller or an unchecked cast.
    const input = { summary: null } as unknown as EventUpdateInput

    const error = await rejection(calendar.events.update('Work', 'event-uid-1', input))

    expect(error).toBeInstanceOf(ValidationError)
    expect(error).toMatchObject({ details: { issues: [{ path: ['summary'] }] } })
    expect(executor.requests).toHaveLength(0)
  })
})

/** The Notes manifest, as the service registers it. */
async function notesManifest(): Promise<AppManifest> {
  return AppManifestSchema.parse(await notesContract.loadManifest())
}

/** A Notes client whose requests are served by the real API app over `executor`. */
async function remoteNotes(token: string, executor: RecordingExecutor) {
  const app = createApp([await notesManifest()], {
    cors: false,
    prettyJson: false,
    executor,
    governance: { policy: ALLOW_ALL_POLICY },
  })
  const fetch: typeof globalThis.fetch = async (input, init) => app.fetch(new Request(input, init))
  return createRemoteClient(notesContract, { token, url: 'http://macts.test', fetch })
}

describe('remote client over the real Notes contract and the real API app', () => {
  it('decodes a successful attachment get to the value the local client returns', async () => {
    const token = await keyWith('notes:attachments:get')
    const wire = { ...ATTACHMENT_WIRE, name: null }
    const remoteExecutor = answering(wire)
    const localExecutor = answering(wire)

    const viaRemote = await (
      await remoteNotes(token, remoteExecutor)
    ).attachments.get(ATTACHMENT_ID)
    const viaLocal = await createLocalClient(notesContract, {
      token,
      executor: localExecutor,
      governance: ALLOW_ALL,
    }).attachments.get(ATTACHMENT_ID)

    expect(viaRemote).toEqual({
      id: ATTACHMENT_ID,
      name: null,
      creationDate: new Date(CREATED_AT),
      modificationDate: new Date(MODIFIED_AT),
    })
    expect(viaRemote).toEqual(viaLocal)
    expect(remoteExecutor.requests[0]?.target).toEqual({
      command: 'getAttachment',
      resource: 'Attachment',
    })
  })

  it('delivers an executor target-not-found as the one TargetNotFoundError class', async () => {
    const token = await keyWith('notes:attachments:get')
    const executor = createRecordingExecutor(() =>
      Promise.reject(new TargetNotFoundError('No such attachment.', { resource: 'Attachment' }))
    )

    const error = await rejection((await remoteNotes(token, executor)).attachments.get('missing'))

    expect(error).toBeInstanceOf(TargetNotFoundError)
    expect(error).toBeInstanceOf(remote.TargetNotFoundError)
    expect(error).toBeInstanceOf(local.TargetNotFoundError)
    expect(error).toBeInstanceOf(contracts.TargetNotFoundError)
    expect(error).toBeInstanceOf(MactsError)
  })
})
