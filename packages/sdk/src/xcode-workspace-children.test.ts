/**
 * Xcode project, scheme and run destination reads, through the local client,
 * with the real generated Xcode contract and the real native executor.
 *
 * Xcode's scripting dictionary has `project`, `scheme` and `run destination`
 * only as elements of `workspace document`; the application holds none of
 * the three. So each is reached through its workspace document, and the
 * manifest records that: each list and get names WorkspaceDocument as its
 * parent, carried by `workspaceName` (phases/13 D10, command parents). A
 * workspace document has no `id` property, so it is found by its name. No
 * app-wide project, scheme or run destination collection is addressed.
 *
 * A workspace document's `activeScheme` and `activeRunDestination`, and a
 * target's `project`, hold references to objects found only within a
 * workspace document. References read from the app do not carry their
 * container yet, and a workspace document has no evidenced identity to serve
 * as one (its name can repeat; its path is the likely identity), so those
 * fields are left out of output (phases/13 D7, "Parent-scoped targets").
 *
 * The native cases run each operation with only the executor's transport
 * replaced: it evaluates the composed script against a stand-in Xcode in an
 * isolated context, so the body, input and output plans and the codec are the
 * shipped ones. The stand-in has no app-wide `projects`, `schemes` or
 * `runDestinations` member at all, so a body that addressed one would fail,
 * and it records every lookup it serves. A project or a scheme is found by its
 * id (`byId`). A run destination has no `id` property in the dictionary, so it
 * is found by a name query (`whose`), as a workspace document is; its stand-in
 * collection has no `byId` at all, so a body that tried one would fail.
 *
 * @see ../../../manifests/xcode/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D6, D7, D10)
 */

import { afterAll, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { AppManifestSchema, createNativeExecutor } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import { TargetNotFoundError } from '@macts/contracts'
import { xcodeContract, type Target, type WorkspaceDocument } from '@macts/xcode/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-xcode-workspace-children-'))
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

/** What a call rejected with; fails if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to reject')
}

/** The `details.resource` of a `TargetNotFoundError`; fails for any other error. */
function missingResourceOf(error: unknown): unknown {
  expect(error).toBeInstanceOf(TargetNotFoundError)
  return error instanceof TargetNotFoundError ? error.details : undefined
}

/** The three workspace children, by operation, with the parameter naming each one. */
const CHILDREN = [
  { resource: 'Project', operation: 'xcode.projects.get', command: 'getProject', key: 'id' },
  { resource: 'Scheme', operation: 'xcode.schemes.get', command: 'getScheme', key: 'id' },
  {
    resource: 'RunDestination',
    operation: 'xcode.runDestinations.get',
    command: 'getRunDestination',
    key: 'name',
  },
] as const

describe('the generated Xcode contract', () => {
  it.each(CHILDREN)(
    'gets a $resource by its workspace and its $key',
    async ({ resource, operation, command, key }) => {
      const get = xcodeContract.operations[operation]
      expect(get?.target).toEqual({ command, resource })
      expect(get?.inputJsonSchema?.['required']).toEqual(['workspaceName', key])
      // Without the workspace, the input is rejected before anything runs.
      expect(get?.input.encode({ [key]: 'X1' }).ok).toBe(false)
      expect(xcodeContract.resources[resource].parents).toEqual({
        get: 'WorkspaceDocument',
        list: 'WorkspaceDocument',
      })
      const manifest = AppManifestSchema.parse(await xcodeContract.loadManifest())
      expect(manifest.commands[command]?.parent).toEqual({
        resource: 'WorkspaceDocument',
        parameter: 'workspaceName',
      })
    }
  )

  it("leaves a workspace's active scheme and run destination out of its record", () => {
    const plan = xcodeContract.resources.WorkspaceDocument.record.plan
    expect(plan.kind).toBe('record')
    if (plan.kind === 'record') {
      expect(Object.keys(plan.fields)).not.toContain('activeScheme')
      expect(Object.keys(plan.fields)).not.toContain('activeRunDestination')
    }
    expectTypeOf<WorkspaceDocument>().not.toHaveProperty('activeScheme')
    expectTypeOf<WorkspaceDocument>().not.toHaveProperty('activeRunDestination')
  })

  it("leaves a target's project out of its record type", () => {
    // A target has no get or list, so its record exists only as a type, and
    // this is checked when the suite is type-checked.
    expectTypeOf<Target>().not.toHaveProperty('project')
    expectTypeOf<Target>().toHaveProperty('id')
  })
})

// ---------------------------------------------------------------------------
// The stand-in Xcode
// ---------------------------------------------------------------------------

/** One stand-in workspace document and the children it holds. */
interface WorkspaceRow {
  readonly name: string
  readonly projects: readonly { readonly id: string; readonly name: string }[]
  readonly schemes: readonly { readonly id: string; readonly name: string }[]
  readonly runDestinations: readonly { readonly name: string; readonly platform: string }[]
}

/** Two workspace documents, each with its own children. */
const WORKSPACES: readonly WorkspaceRow[] = [
  {
    name: 'App',
    projects: [{ id: 'P1', name: 'App' }],
    schemes: [
      { id: 'S1', name: 'App' },
      { id: 'S2', name: 'AppTests' },
    ],
    runDestinations: [
      { name: 'My Mac', platform: 'macosx' },
      { name: 'Phone', platform: 'iphonesimulator' },
    ],
  },
  {
    name: 'Lib',
    projects: [{ id: 'P2', name: 'Lib' }],
    schemes: [{ id: 'S3', name: 'Lib' }],
    runDestinations: [{ name: 'My Mac', platform: 'macosx' }],
  },
]

/** A specifier for an object the app does not have. */
const MISSING = { exists: () => false }

/**
 * A stand-in element collection of one workspace document: calling it lists
 * its item specifiers, and reading a property of it reads that property of
 * every item in order. With `lookup: 'byId'`, `byId` finds one item by its
 * `id`, recorded in `lookups` as `<label>.byId(<value>)`. With
 * `lookup: 'whose'`, `whose({ name })` finds one by its `name`, recorded as
 * `<label>.whose(name: <value>)`, and the collection has no `byId`.
 */
function children(
  label: string,
  records: readonly Record<string, unknown>[],
  lookup: 'byId' | 'whose',
  lookups: string[]
): object {
  const key = lookup === 'byId' ? 'id' : 'name'
  const items = records.map((record) => ({
    key: record[key],
    specifier: { exists: () => true, properties: () => record },
  }))
  const list = (): object[] => items.map((item) => item.specifier)
  // Defined rather than assigned: a function's own `name` is read-only.
  for (const property of Object.keys(records[0] ?? {})) {
    Object.defineProperty(list, property, {
      value: () => records.map((record) => record[property]),
    })
  }
  const find = (value: unknown): object =>
    items.find((item) => item.key === value)?.specifier ?? MISSING
  if (lookup === 'whose') {
    return Object.assign(list, {
      whose(query: Readonly<Record<string, unknown>>) {
        lookups.push(`${label}.whose(name: ${String(query['name'])})`)
        return [find(query['name'])]
      },
    })
  }
  return Object.assign(list, {
    byId(value: unknown) {
      lookups.push(`${label}.byId(${String(value)})`)
      return find(value)
    },
  })
}

/**
 * A stand-in Xcode holding {@link WORKSPACES}. A workspace document is found
 * by a name query, appended to `lookups`; it holds `projects`, `schemes` and
 * `runDestinations`, and the application holds none of them. Each workspace's
 * record also carries an active scheme and run destination, as Xcode's does,
 * so a read that returned them would show.
 */
function standInXcode(lookups: string[]): object {
  const workspaces = WORKSPACES.map((row) => {
    const label = `workspaceDocuments[${row.name}]`
    const record = {
      name: row.name,
      modified: false,
      file: null,
      path: `/tmp/${row.name}.xcworkspace`,
      loaded: true,
      activeScheme: row.schemes[0] ?? null,
      activeRunDestination: row.runDestinations[0] ?? null,
      lastSchemeActionResult: null,
    }
    return {
      name: row.name,
      specifier: {
        exists: () => true,
        properties: () => record,
        projects: children(`${label}.projects`, row.projects, 'byId', lookups),
        schemes: children(`${label}.schemes`, row.schemes, 'byId', lookups),
        runDestinations: children(
          `${label}.runDestinations`,
          row.runDestinations.map((destination) => ({
            ...destination,
            architecture: 'arm64',
            device: null,
            companionDevice: null,
          })),
          'whose',
          lookups
        ),
      },
    }
  })
  return {
    workspaceDocuments: {
      whose(query: Readonly<Record<string, unknown>>) {
        lookups.push(`workspaceDocuments.whose(name: ${String(query['name'])})`)
        return [workspaces.find((row) => row.name === query['name'])?.specifier ?? MISSING]
      },
    },
  }
}

/** A local Xcode client over a stand-in holding {@link WORKSPACES}. */
async function xcodeClient(lookups: string[]) {
  const key = await createApiKey({
    name: 'Xcode workspace children test',
    permissions: [
      'xcode:workspaceDocuments:get',
      'xcode:projects:get',
      'xcode:projects:list',
      'xcode:schemes:get',
      'xcode:runDestinations:get',
    ],
  })
  return createClient(xcodeContract, {
    token: key.token,
    governance: { policy: ALLOW_ALL_POLICY },
    executor: createNativeExecutor({ transport: standInTransport(standInXcode(lookups)) }),
  })
}

describe('Xcode workspace children, read within their workspace through the local client', () => {
  it('gets a scheme by its id within its workspace document', async () => {
    const lookups: string[] = []
    const client = await xcodeClient(lookups)
    const scheme = await client.schemes.get('App', 'S2')
    expect(scheme).toMatchObject({ id: 'S2', name: 'AppTests' })
    // The workspace first, then the scheme within it: never an app-wide lookup.
    expect(lookups).toEqual([
      'workspaceDocuments.whose(name: App)',
      'workspaceDocuments[App].schemes.byId(S2)',
    ])
  })

  it('gets a project by its id within its workspace document', async () => {
    const lookups: string[] = []
    const client = await xcodeClient(lookups)
    const project = await client.projects.get('Lib', 'P2')
    expect(project).toMatchObject({ id: 'P2', name: 'Lib' })
    expect(lookups).toEqual([
      'workspaceDocuments.whose(name: Lib)',
      'workspaceDocuments[Lib].projects.byId(P2)',
    ])
  })

  it('gets a run destination by its name within its workspace document', async () => {
    const lookups: string[] = []
    const client = await xcodeClient(lookups)
    const destination = await client.runDestinations.get('App', 'Phone')
    expect(destination).toMatchObject({ name: 'Phone', platform: 'iphonesimulator' })
    expect(lookups).toEqual([
      'workspaceDocuments.whose(name: App)',
      // A run destination is found by its name, never by id.
      'workspaceDocuments[App].runDestinations.whose(name: Phone)',
    ])
  })

  it('fails each get with TargetNotFoundError naming WorkspaceDocument when the workspace is missing', async () => {
    const reads = [
      (client: Awaited<ReturnType<typeof xcodeClient>>) => client.schemes.get('Gone', 'S1'),
      (client: Awaited<ReturnType<typeof xcodeClient>>) => client.projects.get('Gone', 'P1'),
      (client: Awaited<ReturnType<typeof xcodeClient>>) =>
        client.runDestinations.get('Gone', 'My Mac'),
    ]
    for (const read of reads) {
      const lookups: string[] = []
      const client = await xcodeClient(lookups)
      const error = await rejectionOf(read(client))
      expect(missingResourceOf(error)).toEqual({ resource: 'WorkspaceDocument' })
      // No child is looked up in a workspace that does not exist.
      expect(lookups).toEqual(['workspaceDocuments.whose(name: Gone)'])
    }
  })

  it('names the child resource for a child its workspace does not have', async () => {
    const client = await xcodeClient([])
    // S3 and P2 belong to Lib, not App: a child is found only within its own
    // workspace document.
    for (const id of ['S9', 'S3']) {
      expect(missingResourceOf(await rejectionOf(client.schemes.get('App', id)))).toEqual({
        resource: 'Scheme',
      })
    }
    for (const id of ['P9', 'P2']) {
      expect(missingResourceOf(await rejectionOf(client.projects.get('App', id)))).toEqual({
        resource: 'Project',
      })
    }
    const lookups: string[] = []
    const destinations = await xcodeClient(lookups)
    expect(
      missingResourceOf(await rejectionOf(destinations.runDestinations.get('Lib', 'Phone')))
    ).toEqual({ resource: 'RunDestination' })
    expect(lookups).toEqual([
      'workspaceDocuments.whose(name: Lib)',
      'workspaceDocuments[Lib].runDestinations.whose(name: Phone)',
    ])
  })

  it("returns no active scheme or run destination in a workspace document's record", async () => {
    const client = await xcodeClient([])
    const workspace = await client.workspaceDocuments.get('App')
    expect(workspace).toMatchObject({ name: 'App', loaded: true })
    expect(Object.keys(workspace)).not.toContain('activeScheme')
    expect(Object.keys(workspace)).not.toContain('activeRunDestination')
  })
})
