/** Independent read-only stand-in probe: full generated System Events records over the generated root and both SDK factories. */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { it } from 'vitest'

it('preserves System Events values, relationships and failures across all client entry points', async () => {
  const home = mkdtempSync(join(tmpdir(), 'macts-se-adversarial-'))
  const previousHome = process.env['MACTS_HOME']
  const previousSecret = process.env['MACTS_API_KEY_SECRET']
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  const core = await import('@macts/core')
  const { standInTransport } = await import('@macts/core/testing')
  const { systemEventsContract: contract } = await import('@macts/system-events/contract')
  const runtime = await import('@macts/runtime')
  const local = await import('./local-client.js')
  const remote = await import('./remote.js')
  const { createApp } = await import('@macts/api/server')
  const canonical = await import('@macts/contracts')
  runtime.setLogger(runtime.createLogger({ level: 'silent' }))
  const PATH = '/stand-in/folder',
    PARENT = '/stand-in',
    FILE = '/stand-in/file'
  const stamp = '2024-02-29T12:34:56.789Z'
  const missing = { exists: () => false }
  /** Complete independent native disk-item record, with genuine Date values and an object relationship. */
  function item(path: string, container: unknown) {
    const record = {
      busyStatus: false,
      container,
      creationDate: new Date(stamp),
      displayedName: 'Folder',
      id: 'native-id',
      modificationDate: new Date(stamp),
      name: 'Folder',
      nameExtension: '',
      packageFolder: false,
      path: 'Disk:Folder:',
      physicalSize: 4096,
      posixPath: path,
      size: 0,
      url: 'file:///stand-in/folder',
      visible: true,
      volume: 'Disk',
    }
    return { exists: () => true, properties: () => record, posixPath: () => path }
  }
  const parent = item(PARENT, null),
    folder = item(PATH, parent),
    file = item(FILE, parent)
  const folderFields = [
    'applicationSupportFolder',
    'applicationsFolder',
    'desktopPicturesFolder',
    'folderActionScriptsFolder',
    'fontsFolder',
    'libraryFolder',
    'preferencesFolder',
    'scriptingAdditionsFolder',
    'scriptsFolder',
    'sharedDocumentsFolder',
    'speakableItemsFolder',
    'utilitiesFolder',
    'workflowsFolder',
  ] as const
  function domain(id: string) {
    const record = {
      id,
      name: 'Domain',
      ...Object.fromEntries(folderFields.map((k) => [k, folder])),
    }
    return {
      exists: () => true,
      properties: () => record,
      ...Object.fromEntries(Object.entries(record).map(([k, v]) => [k, () => v])),
    }
  }
  const d = domain('d1')
  const domains = Object.assign(() => [d], {
    byId: (id: string) => (id === 'd1' ? d : missing),
    id: () => ['d1'],
    ...Object.fromEntries(folderFields.map((k) => [k, () => [folder]])),
  })
  Object.defineProperty(domains, 'name', { value: () => ['Domain'] })
  const app = {
    diskItems: {
      byName: (p: string) =>
        p === PATH ? folder : p === PARENT ? parent : p === FILE ? file : missing,
    },
    folders: { byName: (p: string) => (p === PATH ? folder : missing) },
    domains,
  }
  const executor = core.createNativeExecutor({ transport: standInTransport(app) })
  const manifest = core.AppManifestSchema.parse(await contract.loadManifest())
  const permissions = [
    'system-events:diskItems:get',
    'system-events:folders:get',
    'system-events:domains:list',
    'system-events:domains:get',
  ]
  const { token } = await runtime.createApiKey({ name: 'Independent stand-in review', permissions })
  const options = { executor, governance: { policy: runtime.ALLOW_ALL_POLICY } }
  const api = createApp([], {
    ...options,
    cors: false,
    prettyJson: false,
    rateLimit: false,
    register: (registrar) => {
      registrar.registerContract(contract, manifest)
    },
  })
  const { SystemEventsClient } = await import('@macts/system-events')
  const savedFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => api.fetch(new Request(input, init))
  const clients = [
    new SystemEventsClient({ apiKey: token, baseUrl: 'http://macts.test' }),
    local.createClient(contract, { token, ...options }),
    remote.createClient(contract, { token, url: 'http://macts.test', fetch: globalThis.fetch }),
  ]
  let cases = 0
  try {
    for (const client of clients) {
      const got = await client.folders.get(PATH)
      assert.equal(got.posixPath, PATH)
      assert.deepEqual(
        Object.keys(got).sort(),
        [
          'busyStatus',
          'container',
          'creationDate',
          'displayedName',
          'id',
          'modificationDate',
          'name',
          'nameExtension',
          'packageFolder',
          'path',
          'physicalSize',
          'posixPath',
          'size',
          'uRL',
          'visible',
          'volume',
        ].sort()
      )
      for (const [key, value] of Object.entries({
        busyStatus: false,
        displayedName: 'Folder',
        id: 'native-id',
        name: 'Folder',
        nameExtension: '',
        packageFolder: false,
        path: 'Disk:Folder:',
        visible: true,
        volume: 'Disk',
      }))
        assert.equal(got[key as keyof typeof got], value)
      assert(got.creationDate instanceof Date)
      assert.equal(got.creationDate.toISOString(), stamp)
      assert(got.modificationDate instanceof Date)
      assert.equal(got.modificationDate.toISOString(), stamp)
      assert.equal(got.physicalSize, 4096)
      assert.equal(got.size, 0)
      assert.equal(got.uRL, 'file:///stand-in/folder')
      assert(got.container)
      assert.equal(got.container.app, 'system-events')
      assert.equal(got.container.cardinality, 'one')
      assert.equal(got.container.resource, 'DiskItem')
      const container = await got.container.resolve()
      assert.equal(container.posixPath, PARENT)
      assert(Object.hasOwn(container, 'container'))
      assert.equal(container.container, null)
      assert.equal(Object.hasOwn(container, 'contents'), false)
      cases++
      const page = await client.domains.list()
      assert.equal(page.items.length, 1)
      assert.equal(Object.hasOwn(page, 'nextCursor'), false)
      assert.equal(page.items[0]?.id, 'd1')
      const domainGot = await client.domains.get('d1')
      for (const field of folderFields) {
        assert(domainGot[field])
        assert.equal(domainGot[field].app, 'system-events')
        assert.equal(domainGot[field].resource, 'Folder')
        assert.equal(domainGot[field].cardinality, 'one')
        assert.equal((await domainGot[field].resolve()).posixPath, PATH)
      }
      cases++
      assert.equal((await client.diskItems.get(FILE)).posixPath, FILE)
      await assert.rejects(() => client.folders.get(FILE), canonical.TargetNotFoundError)
      await assert.rejects(() => client.diskItems.get('/missing'), canonical.TargetNotFoundError)
      await assert.rejects(() => client.domains.get('missing'), canonical.TargetNotFoundError)
      cases++
      await assert.rejects(
        () => client.folders.get(undefined as unknown as string),
        canonical.ValidationError
      )
      cases++
    }
    const { token: deniedToken } = await runtime.createApiKey({
      name: 'Independent denied stand-in review',
      permissions: ['system-events:domains:list'],
    })
    for (const client of [
      new SystemEventsClient({ apiKey: deniedToken, baseUrl: 'http://macts.test' }),
      local.createClient(contract, { token: deniedToken, ...options }),
      remote.createClient(contract, {
        token: deniedToken,
        url: 'http://macts.test',
        fetch: globalThis.fetch,
      }),
    ]) {
      await assert.rejects(() => client.folders.get(PATH), canonical.PermissionDeniedError)
      cases++
    }
    assert.equal(cases, 15)
  } finally {
    globalThis.fetch = savedFetch
    runtime.closeKeyStore()
    rmSync(home, { recursive: true, force: true })
    if (previousHome === undefined) delete process.env['MACTS_HOME']
    else process.env['MACTS_HOME'] = previousHome
    if (previousSecret === undefined) delete process.env['MACTS_API_KEY_SECRET']
    else process.env['MACTS_API_KEY_SECRET'] = previousSecret
  }
}, 30000)
