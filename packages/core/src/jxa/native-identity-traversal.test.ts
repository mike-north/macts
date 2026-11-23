/** Identity reads reject changed occupants of lazy host positions, including during hydration. */
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'
import { AppManifestSchema } from '../manifest/schemas/app.js'
import { panesManifest } from '../manifest/test-support/panes-positional.js'
import { parseManifestYaml } from '../manifest/loader.js'
import { createNativeCodecFunctions } from './native-codec-functions.js'
import { buildNativeBody, buildResolutionBody } from './native-scripts.js'
import type { NativeCodecEnvironment } from './native-codec.js'

const manifest = parseManifestYaml(
  readFileSync(new URL('../../../../manifests/iterm/app.yaml', import.meta.url), 'utf8')
)

/** at(i) denotes a position anew on every read, rather than a captured ordinary object. */
function lazyHost(change: 'traversal' | 'record' | 'later' | 'recordIdentity') {
  const ids = ['a', 'b']
  let changed = false
  let identityReads = 0
  const swap = (): void => {
    ids.reverse()
    changed = true
  }
  const sessions = {
    length: 2,
    at: (index: number) =>
      new Proxy(
        {},
        {
          get(_target, key) {
            if (key === 'exists') return () => index < ids.length
            return () => {
              if (key === 'id' && index === 0) identityReads++
              // A position can change for the captured id and change back before the final check.
              if (
                change === 'recordIdentity' &&
                key === 'id' &&
                index === 0 &&
                identityReads === 3
              ) {
                ids.reverse()
                const captured = ids[index]
                ids.reverse()
                return captured
              }
              const id = ids[index]
              if (
                !changed &&
                ((change === 'traversal' && key === 'id' && index === 1) ||
                  (change === 'record' && key === 'columns'))
              )
                swap()
              return key === 'id' ? id : null
            }
          },
        }
      ),
  }
  const tab = { exists: () => true, sessions }
  const window = { exists: () => true, id: () => 7, tabs: { length: 1, at: () => tab } }
  return { app: { windows: { byId: () => window } }, swap }
}

/** The identity reference and native plans agree on the Window-scoped Session namespace. */
const reference = {
  reference: {
    resource: 'Session',
    form: 'identity',
    cardinality: 'one',
    id: 'a',
    container: { resource: 'Window', form: 'identity', cardinality: 'one', id: { integer: '7' } },
  },
}
const plan = { kind: 'reference', resource: 'Session', cardinality: 'one' } as const
/** One invocation retains identity expectations from decoding through record hydration. */
function environment(app: object) {
  return {
    app,
    contexts: new WeakMap(),
    identities: new WeakMap(),
    references: {
      Window: {
        id: { kind: 'integer' },
        addressing: { lookup: 'byId', collection: 'windows', property: 'id' },
      },
      Session: {
        id: { kind: 'string' },
        addressing: {
          lookup: 'byId',
          collection: 'sessions',
          property: 'id',
          within: 'Window',
          traversal: ['tabs'],
        },
      },
    },
  } satisfies NativeCodecEnvironment
}

/** Errors cross VM realms as data; their canonical name must survive that boundary. */
function expectCollectionChange(read: () => unknown): void {
  let caught: unknown
  try {
    read()
  } catch (error) {
    caught = error
  }
  expect(caught).toMatchObject({ name: 'MactsCollectionChanged' })
}

/** VM results remain unknown until an assertion establishes their contract. */
function evaluateBody(
  body: string,
  app: object,
  args: Record<string, unknown>,
  env: NativeCodecEnvironment
): unknown {
  const result: unknown = runInNewContext(`(function(app,args,env) { ${body} })(app,args,env)`, {
    app,
    args,
    env,
  })
  return result
}

it.each(['traversal', 'record', 'recordIdentity'] as const)(
  'rejects identity substitution during operation %s reads',
  (change) => {
    const { app } = lazyHost(change)
    const body = buildNativeBody(manifest, { command: 'resolveSession', resource: 'Session' })
    expectCollectionChange(() =>
      evaluateBody(body, app, { windowId: 7, sessionId: 'a' }, environment(app))
    )
  }
)

it('rejects a changed position before returning a decoded identity', () => {
  const { app } = lazyHost('traversal')
  expectCollectionChange(() =>
    createNativeCodecFunctions().decode(reference, plan, environment(app))
  )
})

it.each(['record', 'later'] as const)(
  'retains decoded identity until the %s record read completes',
  (change) => {
    const { app, swap } = lazyHost(change)
    const env = environment(app)
    const target = createNativeCodecFunctions().decode(reference, plan, env)
    if (change === 'later') swap()
    const body = buildResolutionBody(manifest, 'Session', 'one')
    expectCollectionChange(() => evaluateBody(body, app, { target }, env))
  }
)

/** Format 1.1 exposes observed inconsistency; format 1.0 retains its established stabilization. */
it.each([
  ['1.1', 'parent'],
  ['1.1', 'parents'],
  ['1.0', 'parent'],
] as const)('checks %s list consistency under %s syntax', (version, syntax) => {
  const fixture = { ...panesManifest(), version }
  fixture.resources['Entry'] = {
    name: 'Entry',
    plural: 'Entries',
    description: 'An identified entry',
    properties: {
      id: {
        access: 'r',
        type: 'string',
        code: 'ID  ',
        optional: false,
        description: 'Entry identity',
      },
    },
    identifiers: [{ property: 'id', primary: true }],
  }
  const window = fixture.hierarchy.children['windows']
  if (!window) throw new Error('Missing Window')
  window.children = { ...window.children, entries: { resource: 'Entry', access: 'r' } }
  const parent = { resource: 'Window', parameter: 'windowId' }
  const parameter = {
    name: 'windowId',
    type: 'integer',
    required: true,
    description: 'Window identity',
  }
  fixture.commands['getEntry'] = {
    name: 'get',
    scope: 'resource',
    resourceType: 'Entry',
    description: 'Read Entry',
    parent,
    parameters: [
      parameter,
      { name: 'id', type: 'string', required: true, description: 'Entry identity' },
    ],
  }
  fixture.commands['listEntries'] = {
    name: 'list',
    scope: 'resource',
    resourceType: 'Entry',
    description: 'Read Entries',
    parameters: [parameter],
    ...(syntax === 'parent'
      ? { parent }
      : { parents: [{ ...parent, collection: 'windows', by: 'identity' }] }),
  }
  expect(AppManifestSchema.safeParse(fixture).success).toBe(true)
  let reads = 0
  const ids = ['a', 'b']
  const entries = new Proxy(() => [], {
    get: (_target, key) => () => {
      if (key === 'id') {
        if (++reads === 2) ids.reverse()
        return [...ids]
      }
      return ids.map(() => null)
    },
  })
  const app = { windows: { byId: () => ({ exists: () => true, entries }) } }
  const read = () =>
    evaluateBody(
      buildNativeBody(fixture, { command: 'listEntries', resource: 'Entry' }),
      app,
      { windowId: 7 },
      environment(app)
    )
  if (version === '1.1') {
    expectCollectionChange(read)
    expect(reads).toBe(2)
  } else {
    expect(read()).toMatchObject([{ id: 'b' }, { id: 'a' }])
    expect(reads).toBe(4)
  }
})
