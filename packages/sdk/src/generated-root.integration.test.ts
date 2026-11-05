/**
 * The real generated Notes root constructor and both locality factories consume
 * the same registered contract. Only native execution is replaced; key checks,
 * governance, codec validation and HTTP envelopes remain the production path.
 */
import { rm } from 'node:fs/promises'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '@macts/api/server'
import { AppManifestSchema } from '@macts/core'
import { NotesClient } from '@macts/notes'
import { notesContract, type Attachment } from '@macts/notes/contract'
import {
  Integer,
  PermissionDeniedError,
  TargetNotFoundError,
  ValidationError,
  type WireValue,
} from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient as remoteClient } from './remote.js'
import { createClient as localClient } from './local-client.js'
import { createRecordingExecutor, rejection } from './test-helpers.js'

const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-generated-root-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

setLogger(createLogger({ level: 'silent' }))
afterAll(async () => {
  closeKeyStore()
  await rm(mactsHome, { recursive: true, force: true })
})

/** Full attachment response: semantic null differs from an omitted optional field. */
const attachmentWire: WireValue = {
  id: 'attachment-7',
  name: null,
  creationDate: { date: '2026-11-05T12:34:56.123Z' },
  modificationDate: null,
}
const expectedAttachment: Attachment = {
  id: 'attachment-7',
  name: null,
  creationDate: new Date('2026-11-05T12:34:56.123Z'),
  modificationDate: null,
}

/** Construct all three consumer entry points over actual contract registration. */
async function clients(
  permissions: string[],
  response: () => Promise<WireValue> = () => Promise.resolve(attachmentWire)
) {
  const { token } = await createApiKey({ name: 'Generated root parity', permissions })
  const manifest = AppManifestSchema.parse(await notesContract.loadManifest())
  const executor = createRecordingExecutor(response)
  const app = createApp([], {
    cors: false,
    prettyJson: false,
    executor,
    governance: { policy: ALLOW_ALL_POLICY },
    register: (registrar) => {
      registrar.registerContract(notesContract, manifest)
    },
  })
  const fetch: typeof globalThis.fetch = async (input, init) => app.fetch(new Request(input, init))
  const facade = new NotesClient({ apiKey: token, baseUrl: 'http://macts.test' })
  const remote = remoteClient(notesContract, { token, url: 'http://macts.test', fetch })
  const local = localClient(notesContract, {
    token,
    executor,
    governance: { policy: ALLOW_ALL_POLICY },
  })
  return { facade, remote, local, fetch, executor }
}

describe('generated root over the contract-registered service', () => {
  it('matches full local/remote values, Date instances, nulls and own-property omission', async () => {
    const all = await clients(['notes:attachments:get'])
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(all.fetch)
    try {
      for (const consumer of [all.facade, all.remote, all.local]) {
        const result = await consumer.attachments.get('attachment-7')
        expect(result).toEqual(expectedAttachment)
        expect(result.creationDate).toBeInstanceOf(Date)
        expect(Object.hasOwn(result, 'contentIdentifier')).toBe(false)
      }
      expect(all.executor.requests).toHaveLength(3)
      for (const request of all.executor.requests)
        expect(request.input).toEqual({ id: 'attachment-7' })
    } finally {
      fetch.mockRestore()
    }
  })

  it('matches canonical missing and permission errors with their details', async () => {
    const missing = await clients(['notes:attachments:get'], () =>
      Promise.reject(new TargetNotFoundError('Missing attachment.', { resource: 'Attachment' }))
    )
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(missing.fetch)
    try {
      for (const consumer of [missing.facade, missing.remote, missing.local]) {
        const error = await rejection(consumer.attachments.get('missing'))
        expect(error).toBeInstanceOf(TargetNotFoundError)
        expect(error).toMatchObject({
          details: { resource: 'Attachment' },
          message: 'Missing attachment.',
        })
      }
      const denied = await clients(['notes:notes:list'])
      fetch.mockImplementation(denied.fetch)
      for (const consumer of [denied.facade, denied.remote, denied.local]) {
        const error = await rejection(consumer.attachments.get('attachment-7'))
        expect(error).toBeInstanceOf(PermissionDeniedError)
        expect(error).toMatchObject({ details: { required: 'notes:attachments:get' } })
      }
      expect(denied.executor.requests).toHaveLength(0)
    } finally {
      fetch.mockRestore()
    }
  })

  it('rejects invalid inputs before transport or native stand-in execution', async () => {
    const all = await clients(['notes:attachments:get'])
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(all.fetch)
    try {
      for (const consumer of [all.facade, all.remote, all.local]) {
        // Runtime callers may bypass the static string signature.
        const get = consumer.attachments.get as (value: unknown) => Promise<unknown>
        await expect(get.call(consumer.attachments, Integer.validate(7))).rejects.toBeInstanceOf(
          ValidationError
        )
      }
      expect(fetch).not.toHaveBeenCalled()
      expect(all.executor.requests).toHaveLength(0)
    } finally {
      fetch.mockRestore()
    }
  })
  it('preserves a valid null void result from manifest registration through explicit raw RPC', async () => {
    const manifest = AppManifestSchema.parse({
      version: '1.0',
      app: { name: 'Legacy', bundleId: 'test.legacy', tccEntitlements: [] },
      resources: {
        Item: {
          name: 'Item',
          plural: 'Items',
          description: 'Unused manifest resource',
          properties: {},
        },
      },
      enums: {},
      hierarchy: { children: {} },
      suites: [],
      relationships: [],
      commands: {
        noop: {
          name: 'noop',
          description: 'A command without a result',
          scope: 'application',
          parameters: [],
        },
      },
    })
    const { token } = await createApiKey({
      name: 'Legacy void protocol',
      permissions: ['legacy:app:noop'],
    })
    const executor = createRecordingExecutor(() => Promise.resolve(null))
    const app = createApp([manifest], {
      cors: false,
      prettyJson: false,
      executor,
      governance: { policy: ALLOW_ALL_POLICY },
    })
    const response = await app.fetch(
      new Request('http://macts.test/api/v1/rpc/legacy.app.noop', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      })
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ result: null })
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input, init) => Promise.resolve(app.fetch(new Request(input, init))))
    try {
      const root = new NotesClient({ apiKey: token, baseUrl: 'http://macts.test' })
      expect(await root.http.rpc('legacy.app.noop')).toBeNull()
      expect(executor.requests).toHaveLength(2)
      expect(executor.requests[0]?.outputPlan.kind).toBe('passthrough')
    } finally {
      fetch.mockRestore()
    }
  })
})
