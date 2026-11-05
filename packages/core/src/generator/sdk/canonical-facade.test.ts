/** Executable generated facade checks: typed values cross the shared codec boundary. */
import { runInThisContext } from 'node:vm'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join, posix, resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import * as ts from 'typescript'
import * as zod from 'zod'
import * as contracts from '@macts/contracts'
import * as client from '@macts/contracts/client'
import type { AppManifest } from '../../manifest/index.js'
import { RANGE_READ_SUPPORTED, UNIQUE_CLAIM } from '../../manifest/test-support/unique-claim.js'
import { generateContract } from '../contract/index.js'
import { generateHttpClientSdk } from './http-client.js'
/** A bounded fixture with values JSON cannot represent as SDK values directly. */
const manifest: AppManifest = {
  version: '1.0',
  app: { name: 'Fixture', bundleId: 'test.fixture', tccEntitlements: [] },
  resources: {
    Item: {
      name: 'Item',
      plural: 'Items',
      description: 'A fixture item',
      properties: {
        id: { access: 'r', type: 'integer', description: 'Identity', optional: false },
        title: {
          access: 'rw',
          type: 'string',
          description: 'Optional title',
          optional: true,
          resettable: true,
          evidence: { resettable: { source: 'curated', note: 'Fixture reset is accepted' } },
        },
        count: {
          access: 'rw',
          type: 'integer',
          description: 'Checked numeric count',
          optional: true,
        },
        appointment: {
          access: 'rw',
          type: 'date',
          description: 'Scheduled instant',
          optional: true,
        },
        related: {
          access: 'r',
          type: { resource: 'Item' },
          description: 'Deferred relation',
          optional: true,
        },
        modified: {
          access: 'r',
          type: 'date',
          description: 'Modification instant',
          optional: false,
        },
      },
      identifiers: [{ property: 'id', primary: true, targeting: 'byId', ...UNIQUE_CLAIM }],
      ...RANGE_READ_SUPPORTED,
    },
  },
  enums: {},
  hierarchy: { children: { items: { resource: 'Item', access: 'r' } } },
  commands: {
    list: {
      name: 'list',
      description: 'One page of items',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [],
    },
    create: {
      name: 'create',
      description: 'Create an item',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [],
    },
    update: {
      name: 'update',
      description: 'Update an item',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'id', type: 'integer', description: 'Identity', required: true }],
    },
    follow: {
      name: 'follow',
      description: 'Return the supplied relation',
      scope: 'application',
      parameters: [
        { name: 'target', type: { resource: 'Item' }, description: 'Related item', required: true },
      ],
      returns: 'Item',
    },
    get: {
      name: 'get',
      description: 'Read an item',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'id', type: 'integer', description: 'Identity', required: true }],
    },
  },
  suites: [],
  relationships: [],
}
/** Evaluate actual generated modules together, substituting only package entry points. */
interface FixtureRecord {
  readonly id: contracts.Integer
  readonly modified: Date | null
  readonly title?: string | null
  readonly related?: contracts.ObjectReferenceVariant<FixtureRecord, contracts.Integer> | null
}
interface FixtureResource {
  list(
    page?: { pageSize?: number; cursor?: string },
    options?: contracts.CallOptions
  ): Promise<contracts.Page<FixtureRecord>>
  create(input: { count?: number; title?: string; appointment?: Date }): Promise<FixtureRecord>
  update(
    id: string | number,
    input: {
      count?: number
      title?: string | null
    }
  ): Promise<FixtureRecord>
  get(id: string | number, options?: contracts.CallOptions): Promise<FixtureRecord>
}
interface FixtureHttp {
  rpc<T>(path: string, body?: object, options?: contracts.CallOptions): Promise<T>
  invoke<T>(path: string, body?: object, options?: contracts.CallOptions): Promise<T>
}
interface FixtureClient extends contracts.ClientBrand<FixtureResources> {
  readonly http: FixtureHttp
  readonly items: FixtureResource
  follow(
    target: contracts.ObjectReferenceData<contracts.Integer, 'Item'>
  ): Promise<contracts.ObjectReferenceVariant<FixtureRecord, contracts.Integer> | null>
}
// A type alias preserves the implicit index signature required by ResourceTable without widening its keys.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- ResourceTable relies on the closed object type.
type FixtureResources = {
  readonly Item: {
    readonly name: 'Item'
    readonly record: contracts.ValueType<FixtureRecord>
    readonly id: contracts.ValueType<contracts.Integer>
    readonly get: 'fixture.items.get'
    readonly list: 'fixture.items.list'
  }
}
interface FactoryClient {
  readonly items: {
    get(id: contracts.Integer): Promise<FixtureRecord>
    list(page?: contracts.PageRequest): Promise<contracts.Page<FixtureRecord>>
  }
}
interface GeneratedFixture {
  readonly FixtureClient: new (options: { apiKey: string; baseUrl?: string }) => FixtureClient
  readonly HttpClient: new (baseUrl: string, apiKey: string) => FixtureHttp
  readonly ItemResourceClient: new (
    http: FixtureHttp,
    app: string,
    resource: string
  ) => FixtureResource
  readonly FixtureError: new (code: string, message: string) => Error
  readonly contract: contracts.AppContract<FactoryClient, FixtureResources>
}
function generated(definition: AppManifest = manifest): GeneratedFixture {
  const sources = new Map(
    generateHttpClientSdk(definition, { packageName: '@macts/fixture' }).files.map((f) => [
      f.path,
      f.content,
    ])
  )
  for (const file of generateContract(definition).files) sources.set(file.path, file.content)
  const cache = new Map<string, Record<string, unknown>>()
  function load(path: string): Record<string, unknown> {
    const cached = cache.get(path)
    if (cached) return cached
    const source = sources.get(path)
    if (source === undefined) throw new Error(`Missing generated module ${path}`)
    const exports: Record<string, unknown> = {}
    cache.set(path, exports)
    const require = (name: string): unknown => {
      if (name === '@macts/contracts') return contracts
      if (name === '@macts/contracts/client') return client
      if (name === 'zod') return zod
      return load(posix.normalize(posix.join(posix.dirname(path), name)).replace(/\.js$/, '.ts'))
    }
    const js = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const evaluate = runInThisContext(`(function(require,exports){${js}\n})`) as (
      require: (name: string) => unknown,
      exports: Record<string, unknown>
    ) => void
    evaluate(require, exports)
    return exports
  }
  return {
    ...load('src/index.ts'),
    contract: load('src/contract/index.ts')['fixtureContract'],
  } as unknown as GeneratedFixture
}
/** Tagged wire values are deliberately hand-written, rather than encoded by the implementation under test. */
const wire = { id: { integer: '7' }, modified: { date: '2026-11-05T12:34:56.123Z' } }
describe('canonical generated facade', () => {
  it('decodes the same Date and integer as the shared contract factory and preserves the rpc hook', async () => {
    const root = generated()
    const facade = new root.FixtureClient({ apiKey: 'token' })
    const rpc = vi.spyOn(facade.http, 'rpc').mockImplementation(<T>() => Promise.resolve(wire as T))
    const result = await facade.items.get('7')
    expect(result).toEqual({ id: 7, modified: new Date('2026-11-05T12:34:56.123Z') })
    expect(rpc).toHaveBeenCalledWith(
      'fixture.items.get',
      { id: { integer: '7' } },
      expect.any(Object)
    )
    const factory = client.createRemoteClient(root.contract, {
      token: 'token',
      url: 'http://example.test',
      fetch: () => Promise.resolve(Response.json({ result: wire })),
    })
    expect(await factory.items.get(contracts.Integer.validate(7))).toEqual(result)
  })
  it('uses canonical errors for typed methods while keeping raw app errors', async () => {
    const root = generated()
    const facade = new root.FixtureClient({ apiKey: 'token' })
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(
          Response.json(
            { error: { code: 'TARGET_NOT_FOUND', message: 'Missing', details: {} } },
            { status: 404 }
          )
        )
      )
    try {
      await expect(facade.items.get(7)).rejects.toBeInstanceOf(contracts.TargetNotFoundError)
      await expect(facade.http.rpc('fixture.items.get', {})).rejects.toBeInstanceOf(
        root.FixtureError
      )
      await expect(facade.items.get('07')).rejects.toBeInstanceOf(contracts.ValidationError)
      expect(fetch).toHaveBeenCalledTimes(2)
    } finally {
      fetch.mockRestore()
    }
  })
  it('registers the actual facade as a shared binder target', () => {
    const root = generated()
    const facade = new root.FixtureClient({ apiKey: 'token' })
    const reference = client.bindReference(facade, {
      app: 'fixture',
      resource: 'Item',
      form: 'identity',
      cardinality: 'one',
      id: contracts.Integer.validate(7),
    })
    expect(reference).toBeDefined()
  })
  it('hydrates references through the same authority for standalone resource constructors', async () => {
    const root = generated()
    class CustomHttp extends root.HttpClient {
      override rpc<T>(path: string, body: object = {}): Promise<T> {
        expect(path).toBe('fixture.items.get')
        expect(body).toEqual({ id: { integer: '7' } })
        return Promise.resolve({
          ...wire,
          title: null,
          related: {
            reference: {
              resource: 'Item',
              form: 'identity',
              cardinality: 'one',
              id: { integer: '9' },
            },
          },
        } as T)
      }
    }
    const http = new CustomHttp('http://example.test/prefix', 'credential')
    const standalone = new root.ItemResourceClient(http, 'fixture', 'items')
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((url, init) => {
      expect(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url).toBe(
        'http://example.test/prefix/references/v1/resolve'
      )
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer credential')
      if (typeof init?.body !== 'string') throw new Error('Expected encoded JSON body')
      expect(JSON.parse(init.body)).toEqual({
        app: 'fixture',
        reference: {
          reference: {
            resource: 'Item',
            form: 'identity',
            cardinality: 'one',
            id: { integer: '9' },
          },
        },
      })
      return Promise.resolve(
        Response.json({ result: { ...wire, id: { integer: '9' }, modified: null } })
      )
    })
    try {
      const result = await standalone.get(7)
      expect(Object.keys(result).sort()).toEqual(['id', 'modified', 'related', 'title'])
      expect(result.title).toBeNull()
      expect(result.related).toMatchObject({
        app: 'fixture',
        resource: 'Item',
        cardinality: 'one',
        id: 9,
      })
      expect(await result.related?.resolve()).toEqual({ id: 9, modified: null })
      await expect(
        new root.ItemResourceClient(http, 'other', 'items').get(7)
      ).rejects.toBeInstanceOf(contracts.ValidationError)
      expect(fetch).toHaveBeenCalledTimes(1)
    } finally {
      fetch.mockRestore()
    }
  })
  it('rejects malformed outputs and preserves canonical failures from custom hooks', async () => {
    const root = generated()
    const facade = new root.FixtureClient({ apiKey: 'token' })
    const rpc = vi
      .spyOn(facade.http, 'rpc')
      .mockImplementation(<T>() =>
        Promise.resolve({ ...wire, modified: '2026-11-05T12:34:56.123Z' } as T)
      )
    await expect(facade.items.get(7)).rejects.toBeInstanceOf(contracts.UnexpectedValueError)
    const denied = new contracts.PermissionDeniedError('Denied', { required: 'fixture:items:get' })
    rpc.mockRejectedValueOnce(denied)
    await expect(facade.items.get(7)).rejects.toBe(denied)
    rpc.mockRejectedValueOnce(new Error('custom failure'))
    await expect(facade.items.get(7)).rejects.toMatchObject({
      code: 'TRANSPORT_FAILED',
      details: { reason: 'unreachable' },
    })
  })
  it('retains arbitrary raw server errors without presenting them as canonical typed failures', async () => {
    const root = generated()
    const facade = new root.FixtureClient({ apiKey: 'token' })
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(
          Response.json(
            { error: { code: 'LEGACY_CODE', message: 'Legacy failure' } },
            { status: 418 }
          )
        )
      )
    try {
      await expect(facade.http.rpc('legacy.route', {})).rejects.toMatchObject({
        name: 'FixtureError',
        code: 'LEGACY_CODE',
        message: 'Legacy failure',
      })
      await expect(facade.items.get(7)).rejects.toBeInstanceOf(contracts.TransportError)
    } finally {
      fetch.mockRestore()
    }
  })
  it.each([
    ['missing result', () => Response.json({})],
    ['invalid JSON', () => new Response('invalid', { status: 200 })],
  ])('matches factory transport failure details for %s', async (_name, response) => {
    const root = generated()
    const facade = new root.FixtureClient({ apiKey: 'token' })
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(response()))
    try {
      const factory = client.createRemoteClient(root.contract, {
        token: 'token',
        url: 'http://example.test',
      })
      await expect(factory.items.get(contracts.Integer.validate(7))).rejects.toMatchObject({
        code: 'TRANSPORT_FAILED',
        details: { reason: 'invalid-response', status: 200 },
      })
      await expect(facade.items.get(7)).rejects.toMatchObject({
        code: 'TRANSPORT_FAILED',
        details: { reason: 'invalid-response', status: 200 },
      })
    } finally {
      fetch.mockRestore()
    }
  })
  it('forwards cancellation through the actual rpc hook and normalizes an aborted custom failure', async () => {
    const root = generated()
    const facade = new root.FixtureClient({ apiKey: 'token' })
    const controller = new AbortController()
    const rpc = vi.spyOn(facade.http, 'rpc').mockImplementation((_path, _body, options) => {
      expect(options?.signal).toBe(controller.signal)
      controller.abort()
      return Promise.reject(new Error('aborted'))
    })
    await expect(facade.items.get(7, { signal: controller.signal })).rejects.toBeInstanceOf(
      contracts.OperationCancelledError
    )
    expect(rpc).toHaveBeenCalledTimes(1)
  })
  it('compiles canonical record aliases, numeric convenience signatures and precise shared binding', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'macts-facade-types-'))
    const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
    try {
      const output = generateHttpClientSdk(manifest, { packageName: '@macts/fixture' })
      for (const file of output.files.filter((file) => file.path.startsWith('src/'))) {
        const path = join(dir, file.path)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, file.content)
      }
      await mkdir(join(dir, 'node_modules/@macts'), { recursive: true })
      await symlink(join(repo, 'packages/contracts'), join(dir, 'node_modules/@macts/contracts'))
      await symlink(join(repo, 'packages/core/node_modules/zod'), join(dir, 'node_modules/zod'))
      await writeFile(join(dir, 'package.json'), JSON.stringify({ type: 'module' }))
      await writeFile(
        join(dir, 'tsconfig.json'),
        JSON.stringify({
          extends: join(repo, 'tsconfig.base.json'),
          compilerOptions: {
            rootDir: 'src',
            noEmit: true,
            declaration: false,
            declarationMap: false,
            types: [],
            lib: ['ES2022', 'DOM'],
          },
          include: ['src'],
        })
      )
      await writeFile(
        join(dir, 'src/consumer.ts'),
        `
import { FixtureClient, type Item } from './index.js'
import { type Item as CanonicalItem } from './contract/index.js'
import { Integer, type Integer as IntegerType } from '@macts/contracts'
import { bindReference } from '@macts/contracts/client'
const facade = new FixtureClient({ apiKey: 'test' })
export async function use(): Promise<void> {
  await facade.items.create({ count: 7, appointment: new Date('2026-11-05T12:34:56.123Z') })
  await facade.items.update(7, { title: null, count: 8 })
  const canonicalFactory = {} as import('./contract/index.js').FixtureClient
  // @ts-expect-error -- the canonical factory retains branded integer writes.
  await canonicalFactory.items.create({ count: 7 })
  // @ts-expect-error -- date inputs use SDK Date objects.
  await facade.items.create({ appointment: '2026-11-05T12:34:56.123Z' })
  const fromRoot: Item = await facade.items.get(7)
  const canonical: CanonicalItem = fromRoot
  const back: Item = canonical
  const branded: IntegerType = back.id
  const date: Date | null = back.modified
  const bound = bindReference(facade, { app: 'fixture', resource: 'Item', form: 'identity', cardinality: 'one', id: Integer.validate(7) })
  const hydrated: Item = await bound.resolve()
  // @ts-expect-error -- integer output stays branded across root and contracts.
  const unbranded: IntegerType = 7
  // @ts-expect-error -- SDK dates are Date instances, not wire timestamps.
  const timestamp: Date = '2026-11-05T12:34:56.123Z'
  // @ts-expect-error -- resource identity is checked through the facade brand.
  bindReference(facade, { app: 'fixture', resource: 'Other', form: 'identity', cardinality: 'one', id: Integer.validate(7) })
  void [branded, date, hydrated, unbranded, timestamp]
}
`
      )
      const compiler = createRequire(import.meta.url).resolve('typescript/bin/tsc')
      const checked = spawnSync(process.execPath, [compiler, '-p', join(dir, 'tsconfig.json')], {
        encoding: 'utf8',
      })
      expect(checked.stdout + checked.stderr).toBe('')
      expect(checked.status).toBe(0)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
  it('encodes canonical inputs once while preserving numeric writes and verified null reset', async () => {
    const root = generated()
    const facade = new root.FixtureClient({ apiKey: 'token' })
    const rpc = vi.spyOn(facade.http, 'rpc').mockImplementation(<T>() => Promise.resolve(wire as T))
    await facade.items.create({ count: 7, appointment: new Date('2026-11-05T12:34:56.123Z') })
    expect(rpc).toHaveBeenLastCalledWith(
      'fixture.items.create',
      { count: { integer: '7' }, appointment: { date: '2026-11-05T12:34:56.123Z' } },
      expect.any(Object)
    )
    await facade.items.update(7, { count: 8, title: null })
    expect(rpc).toHaveBeenLastCalledWith(
      'fixture.items.update',
      { id: { integer: '7' }, count: { integer: '8' }, title: null },
      expect.any(Object)
    )
    rpc.mockClear()
    await expect(facade.items.create({ count: 1.5 })).rejects.toBeInstanceOf(
      contracts.ValidationError
    )
    expect(rpc).not.toHaveBeenCalled()
  })
  it('uses canonical reference-data inputs and canonical command output types', async () => {
    const root = generated()
    const facade = new root.FixtureClient({ apiKey: 'token' })
    const referenceWire = {
      reference: { resource: 'Item', form: 'identity', cardinality: 'one', id: { integer: '7' } },
    }
    const rpc = vi
      .spyOn(facade.http, 'rpc')
      .mockImplementation(<T>() => Promise.resolve(referenceWire as T))
    const result = await facade.follow({
      app: 'fixture',
      resource: 'Item',
      form: 'identity',
      cardinality: 'one',
      id: contracts.Integer.validate(7),
    })
    expect(rpc).toHaveBeenCalledWith(
      'fixture.app.follow',
      { target: referenceWire },
      expect.any(Object)
    )
    expect(result).toMatchObject({ app: 'fixture', resource: 'Item', cardinality: 'one', id: 7 })
    expect(typeof result?.resolve).toBe('function')
  })
  it('preserves page inputs and continuation while encoding pageSize exactly once', async () => {
    const root = generated()
    const facade = new root.FixtureClient({ apiKey: 'token' })
    const page = { items: [wire], nextCursor: 'next-page' }
    const rpc = vi.spyOn(facade.http, 'rpc').mockImplementation(<T>() => Promise.resolve(page as T))
    const result = await facade.items.list({ pageSize: 2, cursor: 'previous-page' })
    expect(rpc).toHaveBeenCalledWith(
      'fixture.items.list',
      { pageSize: { integer: '2' }, cursor: 'previous-page' },
      expect.any(Object)
    )
    expect(result).toEqual({
      items: [{ id: 7, modified: new Date('2026-11-05T12:34:56.123Z') }],
      nextCursor: 'next-page',
    })
    const factory = client.createRemoteClient(root.contract, {
      token: 'token',
      url: 'http://example.test',
      fetch: () => Promise.resolve(Response.json({ result: page })),
    })
    expect(
      await factory.items.list({ pageSize: contracts.Integer.validate(2), cursor: 'previous-page' })
    ).toEqual(result)
    rpc.mockClear()
    await expect(facade.items.list({ pageSize: 1.5 })).rejects.toBeInstanceOf(
      contracts.ValidationError
    )
    expect(rpc).not.toHaveBeenCalled()
    rpc.mockImplementation(<T>() => Promise.resolve({ items: [] } as T))
    expect(await facade.items.list()).toEqual({ items: [] })
    expect(Object.hasOwn(await facade.items.list(), 'nextCursor')).toBe(false)
  })

  it('binds one-object and collection references to the actual facade with distinct hydration results', async () => {
    const root = generated()
    const facade = new root.FixtureClient({ apiKey: 'credential', baseUrl: 'http://example.test' })
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      if (typeof init?.body !== 'string') throw new Error('Expected JSON reference request')
      const body = JSON.parse(init.body) as { reference: { reference: { cardinality: string } } }
      const result = body.reference.reference.cardinality === 'many' ? [wire] : wire
      return Promise.resolve(Response.json({ result }))
    })
    try {
      const one = client.bindReference(facade, {
        app: 'fixture',
        resource: 'Item',
        form: 'identity',
        cardinality: 'one',
        id: contracts.Integer.validate(7),
      })
      const many = client.bindReference(facade, {
        app: 'fixture',
        resource: 'Item',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'every' },
      })
      const record = await one.resolve()
      expect(record).toEqual({ id: 7, modified: new Date('2026-11-05T12:34:56.123Z') })
      expect(await many.resolve()).toEqual([record])
      expect(fetch).toHaveBeenCalledTimes(2)
    } finally {
      fetch.mockRestore()
    }
  })
})
