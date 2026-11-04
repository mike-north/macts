/**
 * Reference hydration through the runtime for the Archive stand-in app, over
 * the contract the generator emits for it.
 *
 * The Archive manifest exercises two addressing mechanisms: an entry found by
 * the app's key (`targeting: byKey`), and a desk that is a singleton root
 * identified by its kind. Other tests check the native
 * bodies and the generated text separately; this one registers the contract
 * as the generator emits it (its resource table is what `resolveReference`
 * builds the kinds and keys from), with the shipped native executor over a
 * stand-in app, so the generated resource table, the output contracts, the
 * native bodies and the value codec meet as they do on a Mac.
 *
 * Expected outcomes are written by hand from phases/13 D7 and D10: a desk is
 * resolved from its kind, in entry order for a collection; an entry from its
 * key; a reference an operation returned resolves like one the caller built;
 * a kind or key that finds nothing is `TargetNotFoundError` naming the
 * resource.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D7, D10)
 */

import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createNativeExecutor, generateClientPackage } from '@macts/core'
import { archiveManifest, standInTransport } from '@macts/core/testing'
import {
  TargetNotFoundError,
  type AppContract,
  type Authority,
  type InvocationContext,
} from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import { createBearerCredential } from './invocation/credential.js'
import { createRuntime, type MactsRuntime } from './runtime.js'
import { createFakeVerifier, fixedClock } from './runtime-test-helpers.js'

const SECRET = 'macts_sk_archive-resolution-never-logged'

/** May read one entry or desk, and list desks: what resolving their references runs as. */
const READER: Authority = {
  subject: 'key_archive_reader',
  permissions: ['archive:entries:getEntry', 'archive:desks:getDesk', 'archive:desks:listDesks'],
}

const CONTEXT: InvocationContext = { credential: createBearerCredential(SECRET) }

const MANIFEST = archiveManifest()

let workDir = ''
let contract: AppContract<unknown> | undefined

/**
 * Generate the Archive contract, compile it with the workspace TypeScript
 * compiler's transpiler into a temporary package that links the workspace
 * `@macts/contracts`, and load it: the contract a consumer package would
 * import.
 */
beforeAll(async () => {
  const generated = generateClientPackage(MANIFEST, {
    appName: 'archive',
    clientPackageName: '@macts/archive',
  })
  expect(generated.errors).toEqual([])
  workDir = await mkdtemp(join(tmpdir(), 'macts-archive-resolution-'))
  await writeFile(join(workDir, 'package.json'), JSON.stringify({ type: 'module' }))
  await mkdir(join(workDir, 'node_modules', '@macts'), { recursive: true })
  await symlink(
    resolve(process.cwd(), '../contracts'),
    join(workDir, 'node_modules', '@macts', 'contracts'),
    'dir'
  )
  for (const file of generated.files.filter((entry) => entry.path.startsWith('src/contract/'))) {
    const target = join(workDir, file.path.replace(/^src\//, 'dist/').replace(/\.ts$/, '.js'))
    await mkdir(dirname(target), { recursive: true })
    const { outputText } = ts.transpileModule(file.content, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    await writeFile(target, outputText)
  }
  const loaded: unknown = await import(pathToFileURL(join(workDir, 'dist/contract/index.js')).href)
  const exported: unknown =
    typeof loaded === 'object' && loaded !== null
      ? Reflect.get(loaded, 'archiveContract')
      : undefined
  if (typeof exported !== 'object' || exported === null) {
    throw new Error('the generated module exports no archiveContract')
  }
  // The module was loaded dynamically, so the compiler cannot see its type;
  // `registerContract` validates the contract against the manifest on use.
  contract = exported as AppContract<unknown>
}, 60_000)

afterAll(async () => {
  if (workDir !== '') await rm(workDir, { recursive: true, force: true })
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

/** An archive object that exists and reports `record` as its property record. */
function object(record: Record<string, unknown>, members: Record<string, unknown> = {}) {
  return { exists: () => true, properties: () => ({ ...record }), ...members }
}

/** An entry `/root`, and `/a` held by it; a front desk featuring `/a`, and a back desk. */
function standInArchive(backDesk?: unknown) {
  const absent = { exists: () => false }
  const root = object(
    { location: '/root', title: 'Root', holder: null },
    { location: () => '/root' }
  )
  const entry = object({ location: '/a', title: 'A', holder: root }, { location: () => '/a' })
  const entries = new Map<unknown, unknown>([
    ['/a', entry],
    ['/root', root],
  ])
  return {
    includeStandardAdditions: false,
    entries: { byName: (key: unknown) => entries.get(key) ?? absent },
    frontDesk: object({ clerk: 'Kim', featured: entry }),
    backDesk: backDesk ?? object({ clerk: 'Lee', featured: null }),
  }
}

/** A runtime with the generated Archive contract registered over the native executor. */
function archiveRuntime(app: object): MactsRuntime {
  if (contract === undefined) throw new Error('the contract was not loaded')
  const runtime = createRuntime({
    executor: createNativeExecutor({ transport: standInTransport(app) }),
    verifier: createFakeVerifier({ [SECRET]: READER }),
    clock: fixedClock,
    logger: { error: () => undefined, warn: () => undefined, info: () => undefined },
    governance: { policy: ALLOW_ALL_POLICY },
  })
  runtime.registerContract(contract, MANIFEST)
  return runtime
}

/** An identity reference to `resource` by `id`, as a caller builds it. */
function identity(resource: string, id: string) {
  return { resource, form: 'identity', cardinality: 'one', id } as const
}

/** The wire form of an identity reference to `resource` by `id`, as a record carries it. */
function wireRef(resource: string, id: string) {
  return { reference: { ...identity(resource, id) } }
}

const FRONT_DESK = {
  kind: 'front',
  clerk: 'Kim',
  featured: wireRef('Entry', '/a'),
}
const BACK_DESK = { kind: 'back', clerk: 'Lee', featured: null }

describe('reference resolution over the generated Archive contract', () => {
  it('resolves a reference to a root by its kind', async () => {
    const runtime = archiveRuntime(standInArchive())

    await expect(
      runtime.resolveReference('archive', { reference: identity('Desk', 'back') }, CONTEXT)
    ).resolves.toEqual(BACK_DESK)
  })

  it('resolves a collection of roots by kind, in entry order', async () => {
    const runtime = archiveRuntime(standInArchive())

    await expect(
      runtime.resolveReference(
        'archive',
        {
          reference: {
            resource: 'Desk',
            form: 'identity',
            cardinality: 'many',
            entries: [identity('Desk', 'back'), identity('Desk', 'front')],
          },
        },
        CONTEXT
      )
    ).resolves.toEqual([BACK_DESK, FRONT_DESK])
  })

  it('fails a root whose property holds nothing as a missing target naming the resource', async () => {
    const runtime = archiveRuntime(standInArchive({ exists: () => false }))

    const error = await rejectionOf(
      runtime.resolveReference('archive', { reference: identity('Desk', 'back') }, CONTEXT)
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Desk' })
  })

  it('resolves a reference to an entry by the app’s key', async () => {
    const runtime = archiveRuntime(standInArchive())

    await expect(
      runtime.resolveReference('archive', { reference: identity('Entry', '/a') }, CONTEXT)
    ).resolves.toEqual({
      location: '/a',
      title: 'A',
      holder: wireRef('Entry', '/root'),
    })
  })

  it('fails a key that finds no entry as a missing target naming the resource', async () => {
    const runtime = archiveRuntime(standInArchive())

    const error = await rejectionOf(
      runtime.resolveReference('archive', { reference: identity('Entry', '/missing') }, CONTEXT)
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Entry' })
  })

  it('resolves the reference a get of an entry returns', async () => {
    const runtime = archiveRuntime(standInArchive())

    const entry = await runtime.invoke('archive.entries.getEntry', { location: '/a' }, CONTEXT)
    const holder = (entry as { holder: unknown }).holder
    expect(holder).toEqual(wireRef('Entry', '/root'))

    await expect(runtime.resolveReference('archive', holder as never, CONTEXT)).resolves.toEqual({
      location: '/root',
      title: 'Root',
      holder: null,
    })
  })
})
