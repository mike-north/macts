/**
 * A playlist's source is read through its evaluated container, even though
 * the property record omits it. Both clients use the generated TV contract,
 * real executor and codec, with only the application transport replaced.
 * Expected identities and failures follow the playlist-to-source contract.
 */
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '@macts/api/server'
import { AppManifestSchema, createNativeExecutor } from '@macts/core'
import { nativeReadKeys, standInTransport } from '@macts/core/testing'
import { TargetNotFoundError, UnexpectedValueError } from '@macts/contracts'
import { tvContract, type TVClient } from '@macts/tv/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient as createLocalClient } from './local-client.js'
import { createClient as createRemoteClient } from './remote.js'

/** Isolate credentials before the key-store module loads. */
const { home } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-tv-source-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { home }
})
setLogger(createLogger({ level: 'silent' }))
afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(home, { recursive: true, force: true })
})

/** Only Source's persistent ID is its canonical identity; numeric ids differ. */
const SOURCE = 'AABB0011'
/** A playlist found only within SOURCE; it is never an application collection. */
const PLAYLIST = 'CCDD0022'
/** Reading a relationship grants no extra authority to hydrate its target. */
const PERMISSIONS = ['tv:sources:get', 'tv:playlists:get', 'tv:playlists:list']

/** Mutable host failures are observed at read or hydration time, never cached. */
interface IState {
  source?: 'null' | 'throws' | 'wrong-id-type' | 'missing-id' | 'other-source'
  disappeared?: boolean
}

/** An absent singular lookup still returns a specifier whose existence can be checked. */
const ABSENT = { exists: () => false }

/** A collection supports property matching and column reads without any app-global playlist route. */
function collection(
  item: object,
  record: Readonly<Record<string, unknown>>,
  label: string,
  calls: string[],
  present: () => boolean = () => true
) {
  const list = () => (present() ? [item] : [])
  for (const key of Object.keys(record)) {
    Object.defineProperty(list, key, { value: () => (present() ? [record[key]] : []) })
  }
  Object.defineProperty(list, 'whose', {
    value: (query: Record<string, unknown>) => {
      calls.push(`${label}.whose(${String(query['persistentID'])})`)
      return [present() && query['persistentID'] === record['persistentID'] ? item : ABSENT]
    },
  })
  return list
}

/** Run composed scripts in a VM; container is deliberately absent from properties(). */
async function executor(calls: string[], state: IState) {
  const manifest = AppManifestSchema.parse(await tvContract.loadManifest())
  const fields = (resource: string, known: Readonly<Record<string, unknown>>) =>
    Object.fromEntries(
      nativeReadKeys(manifest, resource, manifest.resources[resource]).get.map((key) => [
        key,
        Object.hasOwn(known, key) ? known[key] : null,
      ])
    )
  const sourceRecord = fields('Source', { id: 91, persistentID: SOURCE, kind: 'library' })
  const source = {
    exists: () => !state.disappeared,
    properties: () => {
      calls.push('source.properties()')
      return sourceRecord
    },
    persistentID: () => SOURCE,
  }
  const playlistRecord = fields('Playlist', { id: 42, persistentID: PLAYLIST, name: 'Movies' })
  // A future source field must still be read from the host rather than from
  // an artificial record entry created by the fixture's null-field helper.
  delete playlistRecord['source']
  const playlist = {
    exists: () => true,
    properties: () => playlistRecord,
    container: () => {
      calls.push('playlist.container()')
      switch (state.source) {
        case 'null':
          return null
        case 'throws':
          throw Object.assign(new Error('No such object'), { errorNumber: -1728 })
        case 'wrong-id-type':
          return { persistentID: () => 91 }
        case 'missing-id':
          return { id: () => 91 }
        case 'other-source':
          return { persistentID: () => 'MISSING' }
        default:
          return source
      }
    },
  }
  const playlists = collection(playlist, playlistRecord, 'playlists', calls)
  Object.defineProperty(source, 'playlists', { value: playlists })
  const sources = collection(source, sourceRecord, 'sources', calls, () => !state.disappeared)
  return createNativeExecutor({ transport: standInTransport({ sources }) })
}

/** Local and remote clients run identical assertions over the same host boundary. */
const FACTORIES: readonly {
  name: string
  build: (calls: string[], state: IState) => Promise<TVClient>
}[] = [
  {
    name: 'local',
    async build(calls, state) {
      const key = await createApiKey({ name: 'TV source fixture', permissions: PERMISSIONS })
      return createLocalClient(tvContract, {
        token: key.token,
        executor: await executor(calls, state),
        governance: { policy: ALLOW_ALL_POLICY },
      })
    },
  },
  {
    name: 'remote',
    async build(calls, state) {
      const key = await createApiKey({ name: 'TV source fixture', permissions: PERMISSIONS })
      const manifest = AppManifestSchema.parse(await tvContract.loadManifest())
      const app = createApp([], {
        cors: false,
        prettyJson: false,
        executor: await executor(calls, state),
        governance: { policy: ALLOW_ALL_POLICY },
        register: (registrar) => {
          registrar.registerContract(tvContract, manifest)
        },
      })
      return createRemoteClient(tvContract, {
        token: key.token,
        url: 'http://macts.test',
        fetch: async (input, init) => app.fetch(new Request(input, init)),
      })
    },
  },
]

describe('TV playlist containment contract', () => {
  it('keeps playlist reads under Source and exposes only the supported source relationship', () => {
    expect(tvContract.resources.Playlist.parents).toEqual({ get: 'Source', list: 'Source' })
    const plan = tvContract.resources.Playlist.record.plan
    expect(plan.kind).toBe('record')
    if (plan.kind !== 'record') throw new Error('Expected a playlist record')
    expect(plan.fields['source']?.value).toEqual({
      kind: 'reference',
      resource: 'Source',
      cardinality: 'one',
    })
    expect(plan.fields).not.toHaveProperty('parent')
    for (const resource of ['BrowserWindow', 'PlaylistWindow'] as const) {
      const window = tvContract.resources[resource].record.plan
      if (window.kind !== 'record') throw new Error('Expected a window record')
      expect(window.fields).not.toHaveProperty('view')
    }
  })
})

describe.each(FACTORIES)('Playlist.source through $name', ({ build }) => {
  it.each(['get', 'list'] as const)(
    'evaluates the omitted getter on %s and hydrates lazily by persistent ID',
    async (method) => {
      const calls: string[] = []
      const client = await build(calls, {})
      const playlist =
        method === 'get'
          ? await client.playlists.get(SOURCE, PLAYLIST)
          : (await client.playlists.list(SOURCE)).items[0]
      expect(playlist).toBeDefined()
      const reference = playlist?.source
      expect(reference).toMatchObject({
        app: 'tv',
        resource: 'Source',
        form: 'identity',
        cardinality: 'one',
        id: SOURCE,
      })
      expect(reference).not.toHaveProperty('container')
      expect(calls).toContain('playlist.container()')
      expect(calls).not.toContain('source.properties()')
      if (reference === undefined) throw new Error('Expected source')
      calls.length = 0
      await expect(reference.resolve()).resolves.toMatchObject({ persistentID: SOURCE, id: 91 })
      expect(calls).toEqual([`sources.whose(${SOURCE})`, 'source.properties()'])
    }
  )

  it.each(['null', 'throws', 'wrong-id-type', 'missing-id'] as const)(
    'rejects an unreadable source (%s) with a canonical structured error',
    async (source) => {
      const client = await build([], { source })
      await expect(client.playlists.get(SOURCE, PLAYLIST)).rejects.toBeInstanceOf(
        UnexpectedValueError
      )
      await expect(client.playlists.list(SOURCE)).rejects.toBeInstanceOf(UnexpectedValueError)
    }
  )

  it('reports a disappeared source on hydration', async () => {
    const state: IState = {}
    const client = await build([], state)
    const reference = (await client.playlists.get(SOURCE, PLAYLIST)).source
    state.disappeared = true
    await expect(reference.resolve()).rejects.toBeInstanceOf(TargetNotFoundError)
    await expect(reference.resolve()).rejects.toMatchObject({ details: { resource: 'Source' } })
  })

  it('keeps the getter identity rather than substituting the requested parent', async () => {
    const client = await build([], { source: 'other-source' })
    const reference = (await client.playlists.get(SOURCE, PLAYLIST)).source
    expect(reference).toMatchObject({ id: 'MISSING' })
    await expect(reference.resolve()).rejects.toMatchObject({
      code: 'TARGET_NOT_FOUND',
      details: { resource: 'Source' },
    })
  })

  it('reports a missing source parent without attempting a playlist read', async () => {
    const calls: string[] = []
    const client = await build(calls, {})
    await expect(client.playlists.get('OTHER', PLAYLIST)).rejects.toMatchObject({
      code: 'TARGET_NOT_FOUND',
      details: { resource: 'Source' },
    })
    expect(calls).toEqual(['sources.whose(OTHER)'])
  })
})
