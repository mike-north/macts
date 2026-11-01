/**
 * Integration tests for generated app contracts.
 *
 * The contract for the Jotter fixture is generated, written to a temporary
 * package, type-checked with the workspace TypeScript compiler against the
 * real `@macts/contracts`, compiled, and imported. The tests then exercise the
 * compiled contract as a client factory would: reading its operations and
 * resource table, binding it to a recording runtime, and encoding and decoding
 * values through its value types.
 *
 * A consumer module is compiled alongside the contract to pin the client's
 * static types, including usage that must not compile.
 *
 * Expected values come from the fixture and the design record, not from
 * generator output.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D2 (descriptors, AppContract, bind)
 * @see phases/13-sdk-value-and-execution-contracts.md §D3 (wire forms)
 * @see phases/13-sdk-value-and-execution-contracts.md §D7 (references and the resource table)
 * @see phases/13-sdk-value-and-execution-contracts.md §D8 (file values and file sources)
 * @see phases/13-sdk-value-and-execution-contracts.md §D9 (no passthrough plans in descriptors)
 */

import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  Integer,
  ValueTypes as t,
  type AnyOperationDescriptor,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type CodecResult,
  type DecodeContext,
  type FileData,
  type FileValue,
  type ObjectReferenceData,
  type ObjectReferenceVariant,
  type ReferenceData,
  type ValuePlan,
} from '@macts/contracts'
import { resolveManifestRoutes } from '../../manifest/index.js'
import { loadManifest } from '../../manifest/loader.js'
import { generateContract } from './index.js'
import { jotterManifest } from './test-fixtures.js'

const PACKAGE_ROOT = process.cwd()
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..')
const CONTRACTS_PACKAGE = resolve(PACKAGE_ROOT, '../contracts')
const TSC = resolve(PACKAGE_ROOT, 'node_modules/typescript/bin/tsc')
const MANIFESTS_DIR = resolve(REPO_ROOT, 'manifests')

/** A strict tsconfig for a temporary package that resolves `@macts/contracts`. */
function tsconfig(include: readonly string[], noEmit: boolean): string {
  return JSON.stringify({
    extends: join(REPO_ROOT, 'tsconfig.base.json'),
    compilerOptions: {
      rootDir: '.',
      outDir: 'dist',
      noEmit,
      declaration: false,
      declarationMap: false,
      sourceMap: false,
      typeRoots: [join(REPO_ROOT, 'node_modules', '@types')],
      types: ['node'],
    },
    include,
  })
}

/** Link the workspace `@macts/contracts` into a temporary package. */
async function linkContracts(dir: string): Promise<void> {
  await mkdir(join(dir, 'node_modules', '@macts'), { recursive: true })
  await symlink(CONTRACTS_PACKAGE, join(dir, 'node_modules', '@macts', 'contracts'), 'dir')
}

/** Type-check (and, unless `noEmit`, compile) a temporary package. */
function runTsc(dir: string): { status: number | null; output: string } {
  const tsc = spawnSync(process.execPath, [TSC, '-p', join(dir, 'tsconfig.json')], {
    encoding: 'utf-8',
  })
  return { status: tsc.status, output: `${tsc.stdout}${tsc.stderr}` }
}

/**
 * Compiled alongside the generated contract. Every `@ts-expect-error` line is
 * usage the client's types must reject; the build fails if any compiles.
 */
const CONSUMER_SOURCE = `
import { Integer, type ClientRuntime } from '@macts/contracts'
import {
  jotterContract,
  type Folder,
  type JotterClient,
  type Note,
  type NoteUpdateInput,
} from './contract/index.js'

declare const runtime: ClientRuntime
const client: JotterClient = jotterContract.bind(runtime)

export async function usage(): Promise<void> {
  const note: Note = await client.notes.get('N1')
  const folderId: Integer | undefined = note.folder.form === 'identity' ? note.folder.id : undefined
  void folderId
  const notes: readonly Note[] = await client.notes.list({ signal: new AbortController().signal })
  void notes
  await client.notes.update(Integer.validate(7), 'N1', { title: 'Renamed' })
  await client.notes.create({ folderId: Integer.validate(7), title: 'New' })
  await client.notes.archive('N1')
  await client.notes.archive('N1', new Date())
  await client.quit()
  await client.quit(true)

  // @ts-expect-error -- an update field is never nullable, so null is not a reset
  const reset: NoteUpdateInput = { title: null }
  void reset
  // @ts-expect-error -- the parent identifier is an Integer, not a plain number
  await client.notes.update(7, 'N1', {})
  // @ts-expect-error -- the identifier parameter is a string
  await client.notes.get(1)
  // @ts-expect-error -- read-only manifest properties are read-only fields
  note.uid = 'N2'
  // @ts-expect-error -- create requires the create command's required parameters
  await client.notes.create({ title: 'No folder' })
  // @ts-expect-error -- Tag has no identifier, so it cannot be referenced by identity
  const owner: NonNullable<Folder['owner']> = { resource: 'Tag', form: 'identity', cardinality: 'one', id: 'x', resolve: () => Promise.reject(new Error('unused')) }
  void owner
}
`

interface RecordedCall {
  readonly operation: AnyOperationDescriptor
  readonly input: unknown
  readonly options: CallOptions | undefined
}

let workDir = ''
let contract: AppContract<unknown>
let tscOutput = ''
let tscStatus: number | null = null

beforeAll(async () => {
  const generated = generateContract(jotterManifest())
  expect(generated.errors).toEqual([])

  workDir = await mkdtemp(join(tmpdir(), 'macts-contract-'))
  for (const file of generated.files) {
    const path = join(workDir, file.path)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, file.content)
  }
  await writeFile(join(workDir, 'src', 'consumer.ts'), CONSUMER_SOURCE)
  await writeFile(join(workDir, 'package.json'), JSON.stringify({ type: 'module' }))
  await writeFile(join(workDir, 'tsconfig.json'), tsconfig(['src'], false))
  await linkContracts(workDir)

  const tsc = runTsc(workDir)
  tscStatus = tsc.status
  tscOutput = tsc.output
  // Nothing is emitted when compilation fails, so report the compiler's
  // diagnostics rather than a missing module.
  if (tscStatus !== 0) throw new Error(`the generated contract does not compile:\n${tscOutput}`)

  const loaded: unknown = await import(
    pathToFileURL(join(workDir, 'dist', 'src', 'contract', 'index.js')).href
  )
  contract = contractExport(loaded, 'jotterContract')
}, 120_000)

afterAll(async () => {
  if (workDir !== '') await rm(workDir, { recursive: true, force: true })
})

describe('the generated contract compiles', () => {
  it('type-checks against @macts/contracts, with the consumer usage (and its rejections)', () => {
    expect(tscOutput).toBe('')
    expect(tscStatus).toBe(0)
  })
})

describe('every real app manifest', () => {
  let dir = ''
  afterAll(async () => {
    if (dir !== '') await rm(dir, { recursive: true, force: true })
  })

  it('generates a contract that type-checks', async () => {
    dir = await mkdtemp(join(tmpdir(), 'macts-contracts-'))
    const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
    const apps = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    expect(apps.length).toBeGreaterThan(0)
    for (const app of apps) {
      const manifest = await loadManifest(join(MANIFESTS_DIR, app, 'app.yaml'))
      const generated = generateContract(manifest)
      expect(generated.errors).toEqual([])
      for (const file of generated.files) {
        const path = join(dir, app, file.path)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, file.content)
      }
    }
    await writeFile(join(dir, 'package.json'), JSON.stringify({ type: 'module' }))
    await writeFile(join(dir, 'tsconfig.json'), tsconfig(['*/src/contract'], true))
    await linkContracts(dir)
    expect(runTsc(dir)).toEqual({ status: 0, output: '' })
  }, 120_000)
})

describe('loadManifest', () => {
  it('loads the manifest the contract was generated from', async () => {
    expect(await contract.loadManifest()).toEqual(jotterManifest())
  })
})

describe('operations', () => {
  const ROUTES = [
    'jotter.notes.listNotes',
    'jotter.notes.getNote',
    'jotter.notes.createNote',
    'jotter.notes.updateNote',
    'jotter.notes.deleteNote',
    'jotter.notes.archive',
    'jotter.folders.listFolders',
    'jotter.tags.listTags',
    'jotter.app.quit',
  ]

  it('are keyed by route string, one per manifest route', () => {
    expect(Object.keys(contract.operations).sort()).toEqual([...ROUTES].sort())
    expect(Object.keys(contract.operations).sort()).toEqual(
      resolveManifestRoutes(jotterManifest())
        .map((route) => route.route)
        .sort()
    )
    for (const [key, operation] of Object.entries(contract.operations)) {
      expect(operation.id).toBe(key)
    }
  })

  it("carry each route's permission, explicit or derived by the server's rule", () => {
    // Hand-derived from the fixture by the rule the HTTP server applies: the
    // command's explicit permission, else `{app}:{scope}:{commandKey}`, where
    // the scope is `app` for app commands and the lowercased resource plural
    // otherwise. Only `archive` declares its own.
    const expected: Record<string, string> = {
      'jotter.notes.listNotes': 'jotter:notes:listNotes',
      'jotter.notes.getNote': 'jotter:notes:getNote',
      'jotter.notes.createNote': 'jotter:notes:createNote',
      'jotter.notes.updateNote': 'jotter:notes:updateNote',
      'jotter.notes.deleteNote': 'jotter:notes:deleteNote',
      'jotter.notes.archive': 'jotter:notes:write',
      'jotter.folders.listFolders': 'jotter:folders:listFolders',
      'jotter.tags.listTags': 'jotter:tags:listTags',
      'jotter.app.quit': 'jotter:app:quit',
    }
    expect(
      Object.fromEntries(
        Object.entries(contract.operations).map(([id, operation]) => [id, operation.permission])
      )
    ).toEqual(expected)
  })

  it('target the manifest command and resource keys', () => {
    expect(operationAt('jotter.notes.updateNote').target).toEqual({
      command: 'updateNote',
      resource: 'Note',
    })
    expect(operationAt('jotter.app.quit').target).toEqual({ command: 'quit' })
    expect(operationAt('jotter.notes.archive').description).toBe('Archive a note')
  })

  it('use real plans everywhere: record inputs, and never passthrough', () => {
    for (const operation of Object.values(contract.operations)) {
      expect(operation.input.plan.kind).toBe('record')
      expect(planKinds(operation.input.plan)).not.toContain('passthrough')
      expect(planKinds(operation.output.plan)).not.toContain('passthrough')
    }
  })

  it('describe results by CRUD shape, and commands without results as none', () => {
    expect(operationAt('jotter.notes.listNotes').output.plan.kind).toBe('array')
    expect(operationAt('jotter.notes.getNote').output).toBe(contract.resources['Note']?.record)
    expect(operationAt('jotter.notes.createNote').output).toBe(contract.resources['Note']?.record)
    expect(operationAt('jotter.notes.updateNote').output).toBe(contract.resources['Note']?.record)
    expect(operationAt('jotter.notes.deleteNote').output.plan.kind).toBe('none')
    expect(operationAt('jotter.notes.archive').output.plan.kind).toBe('none')
    expect(operationAt('jotter.app.quit').output.plan.kind).toBe('none')
  })

  it('key inputs by the request parameter names', () => {
    expect(recordFields(operationAt('jotter.notes.getNote').input.plan)).toEqual(['noteId'])
    // Update: the positional identifiers, then the update input fields, which
    // are the create input fields (writable properties, then create
    // parameters) less those identifiers.
    expect(recordFields(operationAt('jotter.notes.updateNote').input.plan)).toEqual([
      'folderId',
      'noteId',
      'title',
      'priority',
      'rating',
      'attachment',
    ])
    expect(recordFields(operationAt('jotter.notes.createNote').input.plan)).toEqual([
      'title',
      'priority',
      'rating',
      'folderId',
      'attachment',
    ])
  })
})

describe('resources', () => {
  it('list every resource with its record, identifier, and resolving operations', () => {
    const { Note, Folder } = contract.resources
    expect(Note?.name).toBe('Note')
    expect(Note?.get).toBe('jotter.notes.getNote')
    expect(Note?.list).toBe('jotter.notes.listNotes')
    expect(Folder?.get).toBeUndefined()
    expect(Folder?.list).toBe('jotter.folders.listFolders')
    expect(Note?.id?.encode('N1')).toEqual({ ok: true, value: 'N1' })
    expect(Folder?.id?.encode(Integer.validate(7))).toEqual({ ok: true, value: { integer: '7' } })
  })

  it('omit the identifier of a resource that has none', () => {
    expect(contract.resources['Tag']).toBeDefined()
    expect(Object.hasOwn(contract.resources['Tag'] ?? {}, 'id')).toBe(false)
  })

  it('are the table references resolve identifiers against', () => {
    const note = sampleNote({ id: Integer.validate(7) })
    const record = resourceRecord('Note')
    expect(record.encode(note).ok).toBe(true)
    // Folder identifiers are integers, so a text identifier does not encode…
    expect(record.encode(sampleNote({ id: '7' })).ok).toBe(false)

    // …until the table itself says otherwise: the reference type reads
    // `contract.resources`, not a copy.
    const folder = contract.resources['Folder']
    expect(Reflect.set(contract.resources, 'Folder', { ...folder, id: t.string() })).toBe(true)
    try {
      expect(record.encode(sampleNote({ id: '7' })).ok).toBe(true)
    } finally {
      Reflect.set(contract.resources, 'Folder', folder)
    }
  })

  it('reject identity references to a resource without an identifier, and accept selectors', () => {
    const folder = resourceRecord('Folder')
    const base = { folderId: Integer.validate(7), title: 'Inbox', notes: [] }
    const byIdentity = {
      ...base,
      owner: { resource: 'Tag', form: 'identity', cardinality: 'one', id: 'x' },
    }
    const byName = {
      ...base,
      owner: {
        resource: 'Tag',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'x' },
      },
    }
    expect(folder.encode(byIdentity).ok).toBe(false)
    expect(folder.encode(byName).ok).toBe(true)
  })
})

describe('bind', () => {
  it('maps get onto the get descriptor with the identifier parameter', async () => {
    const { client, calls } = boundClient()
    await call(client, ['notes', 'get'], 'N1')
    expect(calls).toHaveLength(1)
    expect(calls[0]?.operation).toBe(operationAt('jotter.notes.getNote'))
    expect(calls[0]?.input).toEqual({ noteId: 'N1' })
  })

  it('maps update onto the update descriptor with the identifiers plus the fields', async () => {
    const { client, calls } = boundClient()
    await call(client, ['notes', 'update'], Integer.validate(7), 'N1', { title: 'Renamed' })
    expect(calls[0]?.operation).toBe(operationAt('jotter.notes.updateNote'))
    expect(calls[0]?.input).toEqual({ folderId: 7, noteId: 'N1', title: 'Renamed' })
  })

  it('maps create, delete, list, and custom commands onto their descriptors', async () => {
    const { client, calls } = boundClient()
    const input = { folderId: Integer.validate(7), title: 'New' }
    await call(client, ['notes', 'create'], input)
    await call(client, ['notes', 'delete'], 'N1')
    await call(client, ['notes', 'list'])
    await call(client, ['notes', 'archive'], 'N1')
    expect(calls.map((c) => c.operation.id)).toEqual([
      'jotter.notes.createNote',
      'jotter.notes.deleteNote',
      'jotter.notes.listNotes',
      'jotter.notes.archive',
    ])
    expect(calls[0]?.input).toBe(input)
    expect(calls[1]?.input).toEqual({ noteId: 'N1' })
    expect(calls[2]?.input).toEqual({})
    expect(calls[3]?.input).toEqual({ noteId: 'N1', until: undefined })
  })

  it('puts app commands on the client root', async () => {
    const { client, calls } = boundClient()
    await call(client, ['quit'], true)
    expect(calls[0]?.operation).toBe(operationAt('jotter.app.quit'))
    expect(calls[0]?.input).toEqual({ saving: true })
  })

  it('passes trailing call options through to the runtime', async () => {
    const { client, calls } = boundClient()
    const options = { signal: new AbortController().signal }
    await call(client, ['notes', 'list'], options)
    await call(client, ['notes', 'get'], 'N1', options)
    await call(client, ['quit'], undefined, options)
    expect(calls.map((c) => c.options)).toEqual([options, options, options])
  })

  it('has one namespace per resource with operations, named by plural', () => {
    const { client } = boundClient()
    expect(Object.keys(objectAt(client, [])).sort()).toEqual(['folders', 'notes', 'quit', 'tags'])
    expect(Object.keys(objectAt(client, ['notes'])).sort()).toEqual([
      'archive',
      'create',
      'delete',
      'get',
      'list',
      'update',
    ])
  })
})

describe('encoding', () => {
  it('encodes a record to its wire form, references and dates included', () => {
    const encoded = resourceRecord('Note').encode(sampleNote({ id: Integer.validate(7) }))
    // D3: strings stand for themselves; dates and integers are control
    // records. D7: a reference travels as {"reference": …} with its id
    // encoded by the target resource's identifier type (Folder: integer).
    expect(encoded).toEqual({
      ok: true,
      value: {
        uid: 'N1',
        title: 'Hello',
        folder: {
          reference: {
            resource: 'Folder',
            form: 'identity',
            cardinality: 'one',
            id: { integer: '7' },
          },
        },
        created: { date: '2026-01-02T03:04:05.000Z' },
        wordCount: { integer: '12' },
      },
    })
  })

  it('decodes a record, binding its reference through the decode context', () => {
    const wire = {
      uid: 'N1',
      title: 'Hello',
      priority: 'high',
      folder: {
        reference: {
          resource: 'Folder',
          form: 'identity',
          cardinality: 'one',
          id: { integer: '7' },
        },
      },
      created: { date: '2026-01-02T03:04:05.000Z' },
      wordCount: { integer: '12' },
    }
    const decoded = valueOf(resourceRecord('Note').decode(wire, TEST_CONTEXT))
    expect(decoded).toEqual({
      uid: 'N1',
      title: 'Hello',
      priority: 'high',
      folder: {
        resource: 'Folder',
        form: 'identity',
        cardinality: 'one',
        id: 7,
        resolve: TEST_RESOLVE,
      },
      created: new Date('2026-01-02T03:04:05.000Z'),
      wordCount: 12,
    })
  })

  it('rejects a priority that is not an enum member', () => {
    const record = resourceRecord('Note')
    expect(record.decode(NOTE_WIRE, TEST_CONTEXT).ok).toBe(true)
    expect(record.decode({ ...NOTE_WIRE, priority: 'urgent' }, TEST_CONTEXT).ok).toBe(false)
  })

  it('rejects null in an update input, since update fields are never reset by null', () => {
    const input = operationAt('jotter.notes.updateNote').input
    expect(input.encode({ folderId: Integer.validate(7), noteId: 'N1', title: 'T' }).ok).toBe(true)
    const result = input.encode({ folderId: Integer.validate(7), noteId: 'N1', title: null })
    expect(result.ok).toBe(false)
    expect(result.ok ? [] : result.issues.map((entry) => entry.path)).toEqual([['title']])
  })

  it('omits an optional parameter forwarded as undefined', () => {
    const input = operationAt('jotter.app.quit').input
    expect(input.encode({ saving: undefined })).toEqual({ ok: true, value: {} })
  })

  it('takes file sources where a command consumes a file, and file values where a record returns one', () => {
    const create = operationAt('jotter.notes.createNote').input
    const source = { kind: 'caller-owned-file', path: '/Users/me/a.txt' }
    expect(
      create.encode({ folderId: Integer.validate(7), title: 'T', attachment: source })
    ).toEqual({
      ok: true,
      value: {
        folderId: { integer: '7' },
        title: 'T',
        attachment: { fileSource: { kind: 'caller-owned-file', path: '/Users/me/a.txt' } },
      },
    })
    const attachment = fieldPlan(resourceRecord('Note').plan, 'attachment')
    expect(attachment).toEqual({ presence: 'optional', value: { kind: 'file' } })
    expect(fieldPlan(create.plan, 'attachment')).toEqual({
      presence: 'optional',
      value: { kind: 'file-source' },
    })
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_RESOLVE = (): Promise<never> =>
  Promise.reject(new Error('test references do not resolve'))
const TEST_FETCH = (): Promise<never> => Promise.reject(new Error('test files do not fetch'))

function bindObject(data: ObjectReferenceData): ObjectReferenceVariant<unknown> {
  const container = data.container === undefined ? {} : { container: bindObject(data.container) }
  return data.form === 'identity'
    ? {
        resource: data.resource,
        form: 'identity',
        cardinality: 'one',
        id: data.id,
        resolve: TEST_RESOLVE,
        ...container,
      }
    : {
        resource: data.resource,
        form: 'selector',
        cardinality: 'one',
        selector: data.selector,
        resolve: TEST_RESOLVE,
        ...container,
      }
}

/** Binds references and files with marker functions; nothing resolves or fetches. */
const TEST_CONTEXT: DecodeContext = {
  bindReference(data: ReferenceData) {
    if (data.cardinality === 'one') return bindObject(data)
    throw new Error('the Jotter fixture has no collection references')
  },
  bindFile: (file: FileData): FileValue => ({
    existence: file.existence,
    ...(file.path === undefined ? {} : { path: file.path }),
    fetch: TEST_FETCH,
  }),
}

/** The wire form of a note in folder 7 (D3, D7). */
const NOTE_WIRE = {
  uid: 'N1',
  title: 'Hello',
  folder: {
    reference: { resource: 'Folder', form: 'identity', cardinality: 'one', id: { integer: '7' } },
  },
  created: { date: '2026-01-02T03:04:05.000Z' },
  wordCount: { integer: '12' },
}

function sampleNote(folder: { id: unknown }): Record<string, unknown> {
  return {
    uid: 'N1',
    title: 'Hello',
    folder: { resource: 'Folder', form: 'identity', cardinality: 'one', id: folder.id },
    created: new Date('2026-01-02T03:04:05.000Z'),
    wordCount: Integer.validate(12),
  }
}

function valueOf<T>(result: CodecResult<T>): T {
  if (!result.ok) throw new Error(`expected success, got ${JSON.stringify(result.issues)}`)
  return result.value
}

function operationAt(id: string): AnyOperationDescriptor {
  const operation = Object.entries(contract.operations).find(([key]) => key === id)?.[1]
  if (operation === undefined) throw new Error(`no operation ${id}`)
  return operation
}

function resourceRecord(key: string) {
  const resource = contract.resources[key]
  if (resource === undefined) throw new Error(`no resource ${key}`)
  return resource.record
}

function planKinds(plan: ValuePlan): string[] {
  switch (plan.kind) {
    case 'array':
      return [plan.kind, ...planKinds(plan.items)]
    case 'nullable':
      return [plan.kind, ...planKinds(plan.value)]
    case 'record':
      return [plan.kind, ...Object.values(plan.fields).flatMap((field) => planKinds(field.value))]
    default:
      return [plan.kind]
  }
}

function recordFields(plan: ValuePlan): string[] {
  if (plan.kind !== 'record') throw new Error(`expected a record plan, got ${plan.kind}`)
  return Object.keys(plan.fields)
}

function fieldPlan(plan: ValuePlan, field: string): unknown {
  if (plan.kind !== 'record') throw new Error(`expected a record plan, got ${plan.kind}`)
  return plan.fields[field]
}

/** A client bound to a runtime that records each call and decodes a canned result. */
function boundClient(): { client: unknown; calls: RecordedCall[] } {
  const calls: RecordedCall[] = []
  const runtime: ClientRuntime = {
    invoke(operation, input, options) {
      calls.push({ operation, input, options })
      return Promise.resolve(valueOf(operation.output.decode(cannedWire(operation), TEST_CONTEXT)))
    },
  }
  return { client: contract.bind(runtime), calls }
}

/** A valid wire result for each kind of operation output. */
function cannedWire(operation: { readonly output: { readonly plan: ValuePlan } }): unknown {
  switch (operation.output.plan.kind) {
    case 'none':
      return null
    case 'array':
      return []
    default:
      return NOTE_WIRE
  }
}

function objectAt(root: unknown, path: readonly string[]): Record<string, unknown> {
  let current: unknown = root
  for (const key of path) {
    if (typeof current !== 'object' || current === null) throw new Error(`no ${path.join('.')}`)
    current = Reflect.get(current, key)
  }
  if (typeof current !== 'object' || current === null) throw new Error(`no ${path.join('.')}`)
  return Object.fromEntries(Object.entries(current))
}

/** Call the client method at `path` (e.g. `['notes', 'get']`) with `args`. */
async function call(
  client: unknown,
  path: readonly string[],
  ...args: unknown[]
): Promise<unknown> {
  const owner = objectAt(client, path.slice(0, -1))
  const method = owner[path[path.length - 1] ?? '']
  if (typeof method !== 'function') throw new Error(`no method ${path.join('.')}`)
  const result: unknown = await Reflect.apply(method, owner, args)
  return result
}

function isAppContract(value: unknown): value is AppContract<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'app' in value &&
    'operations' in value &&
    'resources' in value &&
    'bind' in value &&
    typeof value.bind === 'function' &&
    'loadManifest' in value &&
    typeof value.loadManifest === 'function'
  )
}

function contractExport(module: unknown, name: string): AppContract<unknown> {
  const value: unknown =
    typeof module === 'object' && module !== null ? Reflect.get(module, name) : undefined
  if (!isAppContract(value)) throw new Error(`the compiled module does not export ${name}`)
  return value
}
