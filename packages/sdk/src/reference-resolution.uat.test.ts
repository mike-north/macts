/**
 * Reference resolution through both client factories, with one table of
 * cases asserted identically against each.
 *
 * - **Local:** `createClient` from `@macts/sdk/local`, running a real Mac-side
 *   runtime (key-store verifier over real keys, permission check, governance)
 *   with a recording executor.
 * - **Remote:** `createClient` from `@macts/sdk`, against the real macts
 *   server app (the one `createServer` builds) served by `@hono/node-server`
 *   on an ephemeral loopback port and reached with the global `fetch`, so
 *   every request crosses a real socket. Only the executor is a stub.
 *
 * Keys are real, minted in a temporary `MACTS_HOME`. Expected values are
 * written by hand from phases/13:
 *
 * - D7 Binding: a decoded reference, and every container and entry in it, is
 *   bound to the client that decoded it; `resolve()` sends the reference
 *   re-encoded through the same value type, so the executor receives the
 *   canonical wire payload (no `app`, positions as integer control records).
 * - D7 Resolution: a single reference resolves as the resource's `get` and a
 *   collection as its `list`; the result decodes with that operation's output
 *   contract, and references inside it are bound too. Only the target
 *   resource's permission is checked.
 * - D7 Resolution errors: a missing target is `TargetNotFoundError`, and a
 *   missing identity-collection entry keeps `entryIndex`; `start === end` is
 *   a valid empty range resolving to `[]`.
 * - D7 The app: a reference from another app is `ValidationError` at
 *   `["app"]`, before any request.
 * - D7 Caller-built references: `bindReference`, from the entry point that
 *   created the client, binds a reference built by hand so that it resolves
 *   through that client exactly as `ClientRuntime.resolve` does; binding
 *   sends nothing; another app at any level is `ValidationError` at that
 *   level's `app`; a reference decoded by one client rebinds to another.
 * - D5: a resolution presents the client's token and is verified like any
 *   call, so a token that is not a macts key, or a revoked key, is
 *   `AuthenticationError` (code `UNAUTHENTICATED`) with that reason, and
 *   nothing is resolved; over HTTP the 401 carries `WWW-Authenticate: Bearer`.
 * - D11: a result violating the output contract is `UnexpectedValueError`.
 * - D6: an abort is `OperationCancelledError`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6, D7, D11)
 * @see https://hono.dev/docs/getting-started/nodejs
 */

import type { AddressInfo } from 'node:net'
import { serve, type ServerType } from '@hono/node-server'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '@macts/api/server'
import type { ResolutionRequest } from '@macts/core'
import {
  AuthenticationError,
  OperationCancelledError,
  PermissionDeniedError,
  TargetNotFoundError,
  UnexpectedValueError,
  ValidationError,
  type ClientBrand,
  type ReferenceData,
  type ResourceTable,
  type WireValue,
} from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  deleteKeyMetadata,
  revokeKey,
  setLogger,
  type GovernanceContext,
} from '@macts/runtime'
import { bindReference as bindRemoteReference } from './index.js'
import { createClient as createLocalClient } from './local-client.js'
import { bindReference as bindLocalReference } from './local.js'
import { createClient as createRemoteClient } from './remote.js'
import {
  DOWNTOWN_WIRE,
  DUNE_DATA,
  DUNE_ISBN,
  DUNE_MESSIAH_DATA,
  DUNE_MESSIAH_ISBN,
  DUNE_MESSIAH_WIRE,
  DUNE_WIRE,
  LIBRARY_MANIFEST,
  SCIENCE_FICTION_WIRE,
  libraryContract,
  position,
  type Book,
  type LibraryClient,
} from './library-fixture.js'
import {
  createRecordingExecutor,
  rejection,
  thrownBy,
  type RecordingExecutor,
} from './test-helpers.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-reference-resolution-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

// Denied calls log to the process-wide logger; keep expected failures quiet.
setLogger(createLogger({ level: 'silent' }))

const ALLOW_ALL: GovernanceContext = { policy: ALLOW_ALL_POLICY }

/** Every library permission. */
const ALL_PERMISSIONS = [
  'library:branches:get',
  'library:shelves:get',
  'library:shelves:list',
  'library:books:get',
  'library:books:list',
]

const openServers: ServerType[] = []

afterEach(async () => {
  await Promise.all(openServers.splice(0).map(close))
})

afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(mactsHome, { recursive: true, force: true })
})

/** Close a listener, dropping open connections so the close can finish. */
function close(server: ServerType): Promise<void> {
  return new Promise((resolve) => {
    if ('closeAllConnections' in server) server.closeAllConnections()
    server.close(() => {
      resolve()
    })
  })
}

/** A real key holding `permissions`. */
async function keyWith(permissions: readonly string[]): Promise<string> {
  const key = await createApiKey({
    name: 'Reference resolution test',
    permissions: [...permissions],
  })
  return key.token
}

/** A real key holding every library permission, revoked before it is used. */
async function revokedKey(): Promise<string> {
  const key = await createApiKey({
    name: 'Revoked reference resolution test',
    permissions: [...ALL_PERMISSIONS],
  })
  revokeKey(key.keyId)
  return key.token
}

/**
 * A correctly signed key holding every library permission whose stored record
 * is deleted before it is used, so the key store no longer knows it.
 */
async function unknownKey(): Promise<string> {
  const key = await createApiKey({
    name: 'Deleted reference resolution test',
    permissions: [...ALL_PERMISSIONS],
  })
  deleteKeyMetadata(key.keyId)
  return key.token
}

/**
 * Tokens the key store does not accept, with the reason verification gives
 * for each (phases/13 D5).
 */
const REJECTED_TOKENS = [
  {
    name: 'a token that is not a macts key',
    token: () => Promise.resolve('macts_sk_not-a-real-key'),
    reason: 'malformed',
  },
  { name: 'a revoked key', token: revokedKey, reason: 'revoked' },
  { name: 'a signed key with no stored record', token: unknownKey, reason: 'invalid' },
] as const

/** The books the library holds, in wire form, by ISBN. */
const BOOKS: Readonly<Record<string, WireValue>> = {
  [DUNE_ISBN]: DUNE_WIRE,
  [DUNE_MESSIAH_ISBN]: DUNE_MESSIAH_WIRE,
}

/** The book with `isbn`, in wire form, or `TargetNotFoundError` naming `entryIndex` when given. */
function book(isbn: WireValue | undefined, entryIndex?: number): WireValue {
  const found = typeof isbn === 'string' && Object.hasOwn(BOOKS, isbn) ? BOOKS[isbn] : undefined
  if (found === undefined) {
    throw new TargetNotFoundError('No book has that ISBN.', {
      resource: 'Book',
      ...(entryIndex === undefined ? {} : { entryIndex }),
    })
  }
  return found
}

/**
 * The executor's answer to a resolution by default: what the library holds
 * for the reference. Books are found by ISBN (one record per identity entry,
 * in order), and a selector finds Dune, or every book.
 */
function libraryResolution(request: ResolutionRequest): Promise<WireValue> {
  const reference = request.reference
  try {
    if (reference.resource === 'Book') {
      if (reference.cardinality === 'one') {
        return Promise.resolve(reference.form === 'identity' ? book(reference.id) : DUNE_WIRE)
      }
      return Promise.resolve(
        reference.form === 'identity'
          ? reference.entries.map((entry, index) =>
              book('id' in entry ? entry.id : undefined, index)
            )
          : [DUNE_WIRE, DUNE_MESSIAH_WIRE]
      )
    }
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  }
  if (reference.resource === 'Shelf') {
    return Promise.resolve(
      reference.cardinality === 'one' ? SCIENCE_FICTION_WIRE : [SCIENCE_FICTION_WIRE]
    )
  }
  return Promise.resolve(DOWNTOWN_WIRE)
}

/** A client under test, with what can be observed about it. */
interface Harness {
  /**
   * The client. Its type carries the widest resource table, so the references
   * these tests bind are checked at runtime, not statically.
   */
  readonly client: LibraryClient & ClientBrand<ResourceTable>
  readonly executor: RecordingExecutor
  /** How many requests left the client: HTTP requests for remote, executor calls for local. */
  sent(): number
}

/** One way of building a library client. */
interface Factory {
  readonly name: string
  /** `bindReference` as the factory's own entry point exports it. */
  readonly bindReference: typeof bindLocalReference
  /**
   * Build a client whose key holds `permissions`, or that presents `token`
   * instead when it is given.
   */
  build(
    permissions: readonly string[],
    respond: (request: ResolutionRequest) => Promise<WireValue>,
    token?: string
  ): Promise<Harness>
}

/** One HTTP response the remote client received, as far as the tests read it. */
interface ObservedResponse {
  readonly status: number
  readonly challenge: string | null
}

/** A remote client under test, which also records every response it received. */
interface RemoteHarness extends Harness {
  readonly responses: readonly ObservedResponse[]
}

const local: Factory = {
  name: 'local client (@macts/sdk/local)',
  bindReference: bindLocalReference,
  async build(permissions, respond, token) {
    const executor = createRecordingExecutor(() => Promise.resolve(DUNE_WIRE), respond)
    const client = createLocalClient(libraryContract, {
      token: token ?? (await keyWith(permissions)),
      executor,
      governance: ALLOW_ALL,
    })
    return {
      client,
      executor,
      sent: () => executor.requests.length + executor.resolutions.length,
    }
  },
}

const remote = {
  name: 'remote client (@macts/sdk) over a real listener',
  bindReference: bindRemoteReference,
  async build(permissions, respond, token?): Promise<RemoteHarness> {
    const executor = createRecordingExecutor(() => Promise.resolve(DUNE_WIRE), respond)
    const app = createApp([], {
      cors: false,
      prettyJson: false,
      rateLimit: false,
      executor,
      governance: ALLOW_ALL,
      register: (registrar) => {
        registrar.registerContract(libraryContract, LIBRARY_MANIFEST)
      },
    })
    const server = await new Promise<ServerType>((resolve) => {
      const started = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, () => {
        resolve(started)
      })
    })
    openServers.push(server)
    const { port } = server.address() as AddressInfo
    let requests = 0
    const responses: ObservedResponse[] = []
    const fetch: typeof globalThis.fetch = async (input, init) => {
      requests++
      const response = await globalThis.fetch(input, init)
      responses.push({
        status: response.status,
        challenge: response.headers.get('WWW-Authenticate'),
      })
      return response
    }
    const client = createRemoteClient(libraryContract, {
      token: token ?? (await keyWith(permissions)),
      url: `http://127.0.0.1:${String(port)}`,
      fetch,
    })
    return { client, executor, sent: () => requests, responses }
  },
} satisfies Factory

/** A reference to Dune by its ISBN, built by hand as a caller would. */
const DUNE: ReferenceData = {
  app: 'library',
  resource: 'Book',
  form: 'identity',
  cardinality: 'one',
  id: DUNE_ISBN,
}

/** What the executor receives for {@link DUNE}: the wire payload, without the app. */
const DUNE_PAYLOAD = { resource: 'Book', form: 'identity', cardinality: 'one', id: DUNE_ISBN }

/** One case of the shared table: a reference resolved successfully. */
interface ResolvesCase {
  readonly name: string
  readonly reference: ReferenceData
  /** The payload the executor must receive, written from D7's wire form. */
  readonly payload: unknown
  /** What the executor answers. */
  readonly answer: WireValue
  /** The SDK value, data fields only. */
  readonly expected: unknown
}

const RESOLVES: readonly ResolvesCase[] = [
  {
    name: 'a single identity reference resolves to the record',
    reference: DUNE,
    payload: DUNE_PAYLOAD,
    answer: DUNE_WIRE,
    expected: DUNE_DATA,
  },
  {
    name: 'a name selector resolves to the record',
    reference: {
      app: 'library',
      resource: 'Book',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'name', name: 'Dune' },
    },
    payload: {
      resource: 'Book',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'name', name: 'Dune' },
    },
    answer: DUNE_WIRE,
    expected: DUNE_DATA,
  },
  {
    name: 'an index selector resolves to the record, its position an integer control record',
    reference: {
      app: 'library',
      resource: 'Book',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: position(4) },
    },
    payload: {
      resource: 'Book',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: { integer: '4' } },
    },
    answer: DUNE_WIRE,
    expected: DUNE_DATA,
  },
  {
    name: 'an every selector resolves to an array of records',
    reference: {
      app: 'library',
      resource: 'Book',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
    },
    payload: { resource: 'Book', form: 'selector', cardinality: 'many', selector: { by: 'every' } },
    answer: [DUNE_WIRE, DUNE_MESSIAH_WIRE],
    expected: [DUNE_DATA, DUNE_MESSIAH_DATA],
  },
  {
    name: 'a range resolves to an array of records',
    reference: {
      app: 'library',
      resource: 'Book',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'range', start: position(0), end: position(2) },
    },
    payload: {
      resource: 'Book',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'range', start: { integer: '0' }, end: { integer: '2' } },
    },
    answer: [DUNE_WIRE, DUNE_MESSIAH_WIRE],
    expected: [DUNE_DATA, DUNE_MESSIAH_DATA],
  },
  {
    name: 'a range whose start equals its end is valid and resolves to []',
    reference: {
      app: 'library',
      resource: 'Book',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'range', start: position(3), end: position(3) },
    },
    payload: {
      resource: 'Book',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'range', start: { integer: '3' }, end: { integer: '3' } },
    },
    answer: [],
    expected: [],
  },
  {
    name: 'an identity collection resolves to one record per entry, in order',
    reference: {
      app: 'library',
      resource: 'Book',
      form: 'identity',
      cardinality: 'many',
      entries: [
        { app: 'library', resource: 'Book', form: 'identity', cardinality: 'one', id: DUNE_ISBN },
        {
          app: 'library',
          resource: 'Book',
          form: 'identity',
          cardinality: 'one',
          id: DUNE_MESSIAH_ISBN,
        },
      ],
    },
    payload: {
      resource: 'Book',
      form: 'identity',
      cardinality: 'many',
      entries: [
        { resource: 'Book', form: 'identity', cardinality: 'one', id: DUNE_ISBN },
        { resource: 'Book', form: 'identity', cardinality: 'one', id: DUNE_MESSIAH_ISBN },
      ],
    },
    answer: [DUNE_WIRE, DUNE_MESSIAH_WIRE],
    expected: [DUNE_DATA, DUNE_MESSIAH_DATA],
  },
  {
    name: 'a container chain resolves the target within its containers',
    reference: {
      app: 'library',
      resource: 'Book',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: position(0) },
      container: {
        app: 'library',
        resource: 'Shelf',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Science Fiction' },
        container: {
          app: 'library',
          resource: 'Branch',
          form: 'identity',
          cardinality: 'one',
          id: 'DT',
        },
      },
    },
    payload: {
      resource: 'Book',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: { integer: '0' } },
      container: {
        resource: 'Shelf',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Science Fiction' },
        container: { resource: 'Branch', form: 'identity', cardinality: 'one', id: 'DT' },
      },
    },
    answer: DUNE_WIRE,
    expected: DUNE_DATA,
  },
]

/** Await the executor's first resolution request, failing the test if there is none. */
function onlyResolution(executor: RecordingExecutor): ResolutionRequest {
  expect(executor.resolutions).toHaveLength(1)
  const [request] = executor.resolutions
  if (request === undefined) throw new Error('no resolution request')
  return request
}

describe.each([local, remote])('reference resolution: $name', (factory) => {
  describe('resolves each form and cardinality', () => {
    it.each(RESOLVES)('$name', async ({ reference, payload, answer, expected }) => {
      const { client, executor } = await factory.build(ALL_PERMISSIONS, () =>
        Promise.resolve(answer)
      )

      const resolved = await client.resolve(reference)

      expect(resolved).toEqual(expected)
      expect(onlyResolution(executor).reference).toEqual(payload)
      // Resolution runs no operation.
      expect(executor.requests).toHaveLength(0)
    })
  })

  describe('binds each reference built by hand, then resolves it through the client', () => {
    it.each(RESOLVES)('$name', async ({ reference, payload, answer, expected }) => {
      const harness = await factory.build(ALL_PERMISSIONS, () => Promise.resolve(answer))
      const { client, executor } = harness

      const bound = factory.bindReference(client, reference)
      // Binding makes no request.
      expect(harness.sent()).toBe(0)
      const resolved = await bound.resolve()

      expect(bound).toEqual(reference)
      expect(resolved).toEqual(expected)
      expect(onlyResolution(executor).reference).toEqual(payload)
      expect(executor.requests).toHaveLength(0)
    })
  })

  describe('refuses to bind a reference from another app, sending nothing', () => {
    it.each([
      { at: 'the top level', reference: { ...DUNE, app: 'bookstore' }, path: ['app'] },
      {
        at: 'a nested container',
        reference: {
          app: 'library',
          resource: 'Book',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'index', index: position(0) },
          container: {
            app: 'library',
            resource: 'Shelf',
            form: 'identity',
            cardinality: 'one',
            id: 'SF-1',
            container: {
              app: 'bookstore',
              resource: 'Branch',
              form: 'identity',
              cardinality: 'one',
              id: 'DT',
            },
          },
        } satisfies ReferenceData,
        path: ['container', 'container', 'app'],
      },
    ])('at $at', async ({ reference, path }) => {
      const harness = await factory.build(ALL_PERMISSIONS, libraryResolution)

      const error = thrownBy(() => factory.bindReference(harness.client, reference))

      expect(error).toBeInstanceOf(ValidationError)
      if (!(error instanceof ValidationError)) return
      expect(error.details.issues.map((issue) => issue.path)).toEqual([path])
      expect(harness.sent()).toBe(0)
    })
  })

  it('raises TargetNotFoundError when the target does not exist', async () => {
    const { client } = await factory.build(ALL_PERMISSIONS, () =>
      Promise.reject(new TargetNotFoundError('No book has that ISBN.', { resource: 'Book' }))
    )

    const error = await rejection(client.resolve(DUNE))

    expect(error).toBeInstanceOf(TargetNotFoundError)
    expect(error).toMatchObject({ code: 'TARGET_NOT_FOUND', details: { resource: 'Book' } })
  })

  it('keeps entryIndex when an identity-collection entry does not exist', async () => {
    const { client } = await factory.build(ALL_PERMISSIONS, () =>
      Promise.reject(
        new TargetNotFoundError('The second book no longer exists.', {
          resource: 'Book',
          entryIndex: 1,
        })
      )
    )

    const error = await rejection(
      client.resolve({
        app: 'library',
        resource: 'Book',
        form: 'identity',
        cardinality: 'many',
        entries: [
          { app: 'library', resource: 'Book', form: 'identity', cardinality: 'one', id: DUNE_ISBN },
          { app: 'library', resource: 'Book', form: 'identity', cardinality: 'one', id: 'gone' },
        ],
      })
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    expect(error).toMatchObject({ details: { resource: 'Book', entryIndex: 1 } })
  })

  describe('raises AuthenticationError, resolving nothing, for', () => {
    it.each(REJECTED_TOKENS)('$name', async ({ token, reason }) => {
      const { client, executor } = await factory.build(
        ALL_PERMISSIONS,
        libraryResolution,
        await token()
      )

      const error = await rejection(client.resolve(DUNE))

      expect(error).toBeInstanceOf(AuthenticationError)
      expect(error).toMatchObject({ code: 'UNAUTHENTICATED', details: { reason } })
      expect(executor.resolutions).toHaveLength(0)
    })
  })

  it('raises PermissionDeniedError for a key without the get permission, running nothing', async () => {
    // The key may list books but not read one, so a single reference is denied.
    const { client, executor } = await factory.build(['library:books:list'], libraryResolution)

    const error = await rejection(client.resolve(DUNE))

    expect(error).toBeInstanceOf(PermissionDeniedError)
    expect(error).toMatchObject({
      code: 'PERMISSION_DENIED',
      details: { required: 'library:books:get' },
    })
    expect(executor.resolutions).toHaveLength(0)
  })

  it('raises UnexpectedValueError for a result violating the output contract', async () => {
    // A book without its title, shelf, or sequels.
    const { client, executor } = await factory.build(ALL_PERMISSIONS, () =>
      Promise.resolve({ isbn: DUNE_ISBN, pages: { integer: '412' } })
    )

    const error = await rejection(client.resolve(DUNE))

    expect(error).toBeInstanceOf(UnexpectedValueError)
    expect(error).toMatchObject({ code: 'UNEXPECTED_VALUE' })
    expect(executor.resolutions).toHaveLength(1)
  })

  it('raises ValidationError at ["app"] for a reference from another app, before any request', async () => {
    const harness = await factory.build(ALL_PERMISSIONS, libraryResolution)

    const error = await rejection(harness.client.resolve({ ...DUNE, app: 'bookstore' }))

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map((issue) => issue.path)).toEqual([['app']])
    expect(harness.sent()).toBe(0)
  })

  it('binds a reference inside a result, and resolving that one works too', async () => {
    const { client, executor } = await factory.build(ALL_PERMISSIONS, libraryResolution)

    // The result was decoded with the output contract of `library.books.get`.
    const book = (await client.resolve(DUNE)) as Book
    const shelf = await book.shelf.resolve()

    expect(shelf).toEqual(SCIENCE_FICTION_WIRE)
    expect(executor.resolutions.map((request) => request.reference)).toEqual([
      DUNE_PAYLOAD,
      { resource: 'Shelf', form: 'identity', cardinality: 'one', id: 'SF-1' },
    ])
  })

  it('binds references in an operation result to the same client', async () => {
    const { client, executor } = await factory.build(ALL_PERMISSIONS, libraryResolution)

    const book = await client.books.get()
    const sequels = await book.sequels.resolve()
    const [sequel] = book.sequels.form === 'identity' ? book.sequels.entries : []
    const messiah = await sequel?.resolve()

    expect(sequels).toEqual([DUNE_MESSIAH_DATA])
    expect(messiah).toEqual(DUNE_MESSIAH_DATA)
    expect(executor.resolutions.map((request) => request.reference)).toEqual([
      {
        resource: 'Book',
        form: 'identity',
        cardinality: 'many',
        entries: [
          { resource: 'Book', form: 'identity', cardinality: 'one', id: DUNE_MESSIAH_ISBN },
        ],
      },
      { resource: 'Book', form: 'identity', cardinality: 'one', id: DUNE_MESSIAH_ISBN },
    ])
  })

  it('raises OperationCancelledError when the signal aborts during resolution', async () => {
    let entered: () => void = () => undefined
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const { client } = await factory.build(
      ALL_PERMISSIONS,
      (request) =>
        new Promise((_resolve, reject) => {
          request.signal?.addEventListener(
            'abort',
            () => {
              reject(new OperationCancelledError('The operation was cancelled.', {}))
            },
            { once: true }
          )
          entered()
        })
    )
    const controller = new AbortController()

    const pending = rejection(client.resolve(DUNE, { signal: controller.signal }))
    await started
    controller.abort()

    expect(await pending).toBeInstanceOf(OperationCancelledError)
  })

  it('raises OperationCancelledError for an already aborted signal, resolving nothing', async () => {
    const { client, executor } = await factory.build(ALL_PERMISSIONS, libraryResolution)
    const controller = new AbortController()
    controller.abort()

    const error = await rejection(client.resolve(DUNE, { signal: controller.signal }))

    expect(error).toBeInstanceOf(OperationCancelledError)
    expect(executor.resolutions).toHaveLength(0)
  })
})

describe('rebinding a reference across localities', () => {
  it('resolves a reference the local client decoded through the remote client it is bound to', async () => {
    const localHarness = await local.build(ALL_PERMISSIONS, libraryResolution)
    const remoteHarness = await remote.build(ALL_PERMISSIONS, libraryResolution)
    const book = await localHarness.client.books.get()

    const shelf = bindRemoteReference(remoteHarness.client, book.shelf)
    expect(remoteHarness.sent()).toBe(0)
    const resolved = await shelf.resolve()

    expect(resolved).toEqual(SCIENCE_FICTION_WIRE)
    expect(remoteHarness.sent()).toBe(1)
    expect(remoteHarness.executor.resolutions.map((request) => request.reference)).toEqual([
      { resource: 'Shelf', form: 'identity', cardinality: 'one', id: 'SF-1' },
    ])
    // The local client ran only the operation that decoded the book.
    expect(localHarness.executor.requests).toHaveLength(1)
    expect(localHarness.executor.resolutions).toHaveLength(0)
  })
})

describe('resolution over HTTP with a credential the service refuses', () => {
  it.each(REJECTED_TOKENS)('answers 401 with a Bearer challenge for $name', async ({ token }) => {
    const harness = await remote.build(ALL_PERMISSIONS, libraryResolution, await token())

    await rejection(harness.client.resolve(DUNE))

    expect(harness.responses).toEqual([{ status: 401, challenge: 'Bearer' }])
    expect(harness.executor.resolutions).toHaveLength(0)
  })
})
