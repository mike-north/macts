/**
 * Identity reads reject changed occupants of lazy host positions while matching, and read a
 * matched Session by identity afterwards, including during hydration.
 */
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
    // An identity specifier follows its Session to whatever position it holds.
    byId: (id: string) =>
      new Proxy(
        {},
        {
          get: (_target, key) =>
            key === 'exists'
              ? () => ids.includes(id)
              : (sessions.at(ids.indexOf(id)) as Record<string | symbol, () => unknown>)[key],
        }
      ),
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

it.each(['traversal', 'recordIdentity'] as const)(
  'rejects identity substitution during operation %s reads',
  (change) => {
    const { app } = lazyHost(change)
    const body = buildNativeBody(manifest, { command: 'resolveSession', resource: 'Session' })
    expectCollectionChange(() =>
      evaluateBody(body, app, { windowId: 7, sessionId: 'a' }, environment(app))
    )
  }
)

/** Once matched, a Session is read by identity, so positions swapping mid-read substitute nothing. */
it('reads the sought Session when positions swap during operation record reads', () => {
  const { app } = lazyHost('record')
  const body = buildNativeBody(manifest, { command: 'resolveSession', resource: 'Session' })
  expect(evaluateBody(body, app, { windowId: 7, sessionId: 'a' }, environment(app))).toMatchObject({
    id: 'a',
  })
})

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
    expect(evaluateBody(body, app, { target }, env)).toMatchObject({ id: 'a' })
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

/**
 * A Window whose one Tab holds Sessions `a` (80 columns) and `b`. Position 0 is
 * occupied by `c` (120 columns) once a match is made: transiently (only
 * non-identity reads see `c`) or for good (`a` closes and `c` opens there).
 * `sessions.byId` names a Session by identity, as the app's id specifier does.
 */
function shiftingHost(shift: 'transient' | 'closed') {
  const columns: Record<string, number> = { a: 80, b: 100, c: 120 }
  const ids = ['a', 'b']
  let matched = false
  const session = (occupant: () => string | undefined, positional: boolean) =>
    new Proxy(
      {},
      {
        get(_target, key) {
          if (key === 'exists') return () => occupant() !== undefined
          return () => {
            if (key !== 'id' && !matched) {
              matched = true
              if (shift === 'closed') ids[0] = 'c'
            }
            const id =
              positional && key !== 'id' && shift === 'transient' && occupant() === 'a'
                ? 'c'
                : occupant()
            if (id === undefined)
              throw Object.assign(new Error('No such object.'), { errorNumber: -1728 })
            return key === 'id' ? id : key === 'columns' ? columns[id] : null
          }
        },
      }
    )
  const sessions = {
    length: 2,
    at: (index: number) => session(() => ids[index], true),
    byId: (id: string) => session(() => (ids.includes(id) ? id : undefined), false),
  }
  const tab = { exists: () => true, sessions }
  const window = { exists: () => true, id: () => 7, tabs: { length: 1, at: () => tab } }
  return { windows: { byId: () => window } }
}

/**
 * A resolved match reads the sought Session or fails as missing; it never reads a later occupant.
 * Here the Session closes while its properties are read, after the re-anchor found it, so the
 * read itself reports the target missing.
 */
function expectSoughtOrMissing(read: () => unknown, shift: 'transient' | 'closed'): void {
  if (shift === 'transient') {
    expect(read()).toMatchObject({ id: 'a', columns: 80 })
    return
  }
  let caught: unknown
  try {
    read()
  } catch (error) {
    caught = error
  }
  expect(caught).toMatchObject({ errorNumber: -1728 })
}

it.each(['transient', 'closed'] as const)(
  'anchors a Window-scoped resolve match by identity within its Tab (%s shift)',
  (shift) => {
    const app = shiftingHost(shift)
    const body = buildNativeBody(manifest, { command: 'resolveSession', resource: 'Session' })
    expectSoughtOrMissing(
      () => evaluateBody(body, app, { windowId: 7, sessionId: 'a' }, environment(app)),
      shift
    )
  }
)

it.each(['transient', 'closed'] as const)(
  'anchors a decoded Window-scoped identity within its Tab (%s shift)',
  (shift) => {
    const app = shiftingHost(shift)
    const env = environment(app)
    const body = buildResolutionBody(manifest, 'Session', 'one')
    expectSoughtOrMissing(() => {
      const target = createNativeCodecFunctions().decode(reference, plan, env)
      return evaluateBody(body, app, { target }, env)
    }, shift)
  }
)

/**
 * Window `7` holds Tabs `[a]` and `[b]`. In the `moved` scenario `a` moves to the second
 * Tab (`[]`, `[b, a]`) on its second identity read, which is after the match and before the
 * re-anchor in the first Tab. In the `absent` scenario `a` is in no Tab at all.
 */
function tabMoveHost(scenario: 'moved' | 'absent') {
  const tabs: string[][] = scenario === 'moved' ? [['a'], ['b']] : [['x'], ['b']]
  let identityReadsOfA = 0
  const session = (occupant: () => string | undefined) =>
    new Proxy(
      {},
      {
        get(_target, key) {
          if (key === 'exists') return () => occupant() !== undefined
          return () => {
            const id = occupant()
            if (id === undefined)
              throw Object.assign(new Error('No such object.'), { errorNumber: -1728 })
            if (key === 'id' && id === 'a' && ++identityReadsOfA === 2) {
              tabs[0] = []
              tabs[1] = ['b', 'a']
            }
            return key === 'id' ? id : null
          }
        },
      }
    )
  const tab = (index: number) => ({
    exists: () => true,
    sessions: {
      get length() {
        return tabs[index]?.length ?? 0
      },
      at: (position: number) => session(() => tabs[index]?.[position]),
      byId: (id: string) => session(() => (tabs[index]?.includes(id) ? id : undefined)),
    },
  })
  const window = { exists: () => true, id: () => 7, tabs: { length: 2, at: tab } }
  return { windows: { byId: () => window } }
}

it('reports a collection change when a matched Session moves to another Tab of its Window (resolve)', () => {
  const app = tabMoveHost('moved')
  const body = buildNativeBody(manifest, { command: 'resolveSession', resource: 'Session' })
  expectCollectionChange(() =>
    evaluateBody(body, app, { windowId: 7, sessionId: 'a' }, environment(app))
  )
})

it('reports a collection change when a decoded Session moves to another Tab of its Window (decode)', () => {
  const app = tabMoveHost('moved')
  expectCollectionChange(() =>
    createNativeCodecFunctions().decode(reference, plan, environment(app))
  )
})

it('still reports a Session absent from every Tab of its Window as missing (resolve)', () => {
  const app = tabMoveHost('absent')
  const body = buildNativeBody(manifest, { command: 'resolveSession', resource: 'Session' })
  let caught: unknown
  try {
    evaluateBody(body, app, { windowId: 7, sessionId: 'a' }, environment(app))
  } catch (error) {
    caught = error
  }
  expect(caught).toMatchObject({ errorNumber: -1728 })
})

it('still reports a Session absent from every Tab of its Window as missing (decode)', () => {
  const app = tabMoveHost('absent')
  let caught: unknown
  try {
    createNativeCodecFunctions().decode(reference, plan, environment(app))
  } catch (error) {
    caught = error
  }
  expect(caught).toMatchObject({ missingResource: 'Session' })
})
