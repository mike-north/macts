/**
 * A resource command that acts on one item may address that item by a scoped
 * identity search (`identityTraversal`), as the identity get of the same
 * resource does. The search stays inside the identified parent, the item is
 * sent as the command's direct parameter, and only the command's action
 * arguments become named parameters.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D10, "Multilevel addresses and identity scope")
 */
import { describe, expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import { AppManifestSchema } from './schemas/app.js'
import { findAddressIssues } from './address.js'
import { panesManifest } from './test-support/panes-positional.js'
import { generateConsolidatedPackages } from '../generator/orchestrate.js'
import { buildNativeBody } from '../jxa/native-scripts.js'
import type { AppManifest } from './schemas/app.js'
import type { Command } from './schemas/command.js'

/** The native "no such object" error number a missing item raises. */
const NO_SUCH_OBJECT = -1728

/** Sessions live in tabs in windows; identity is scoped to the Window. */
function sessionManifest(): AppManifest {
  const manifest = Object.assign(panesManifest(), { version: '1.1' as const })
  manifest.resources['Session'] = {
    name: 'Session',
    plural: 'Sessions',
    description: 'A terminal session',
    properties: {
      id: {
        access: 'r',
        type: 'string',
        description: 'Session identity',
        code: 'ID  ',
        optional: false,
      },
    },
    identifiers: [{ property: 'id', primary: true }],
  }
  const tab = manifest.hierarchy.children['windows']?.children?.['tabs']
  if (tab === undefined) throw new Error('Fixture requires windows and tabs')
  tab.children = { sessions: { resource: 'Session', access: 'r' } }
  manifest.commands['resolveSession'] = {
    name: 'get',
    description: 'Resolve Session identity within its Window',
    scope: 'resource',
    resourceType: 'Session',
    parent: { resource: 'Window', parameter: 'windowId' },
    identityTraversal: { collections: ['tabs'], evidence: 'Sessions are elements of tabs' },
    parameters: [
      { name: 'windowId', type: 'integer', description: 'Window identity', required: true },
      { name: 'sessionId', type: 'string', description: 'Session identity', required: true },
    ],
  }
  manifest.commands['writeSessionText'] = writeCommand()
  return manifest
}

/**
 * The item command under test. The action argument `text` is declared before
 * the item selector on purpose: the explicit item binding, not declaration
 * order, selects the Session.
 */
function writeCommand(overrides: Partial<Command> = {}): Command {
  return {
    name: 'write',
    routeName: 'writeText',
    description: 'Write text into a session',
    scope: 'resource',
    resourceType: 'Session',
    risk: 'write',
    parents: [{ resource: 'Window', collection: 'windows', by: 'identity', parameter: 'windowId' }],
    item: { by: 'identity', parameter: 'sessionId' },
    identityTraversal: { collections: ['tabs'], evidence: 'Sessions are elements of tabs' },
    parameters: [
      { name: 'text', type: 'string', description: 'Text to write', required: true },
      { name: 'windowId', type: 'integer', description: 'Window identity', required: true },
      { name: 'sessionId', type: 'string', description: 'Session identity', required: true },
      { name: 'newline', type: 'boolean', description: 'Append a newline', required: false },
    ],
    ...overrides,
  }
}

/** One recorded native command call: the direct parameter's id and the named record. */
interface Sent {
  readonly session: string
  readonly named: unknown
}

/** A stand-in app whose windows hold tabs of session ids; it records every write. */
function standIn(windows: Record<number, string[][]>) {
  const sent: Sent[] = []
  const reads: string[] = []
  const session = (windowId: number, id: string) => ({
    exists: () => true,
    id: () => {
      reads.push(`session:${String(windowId)}:${id}`)
      return id
    },
  })
  const list = <T>(items: T[]) => ({ length: items.length, at: (index: number) => items[index] })
  const window = (id: number, tabs: string[][]) => ({
    exists: () => true,
    tabs: list(
      tabs.map((ids) => ({
        exists: () => true,
        sessions: list(ids.map((sessionId) => session(id, sessionId))),
      }))
    ),
  })
  const app = {
    windows: {
      byId: (id: number) =>
        windows[id] === undefined ? { exists: () => false } : window(id, windows[id]),
    },
    write: (item: { id: () => string }, named?: unknown) => {
      sent.push({ session: item.id(), named })
      return null
    },
  }
  return { app, sent, reads }
}

/** Run the generated body of the write command against a stand-in. */
function run(manifest: AppManifest, app: object, args: Record<string, unknown>): unknown {
  const body = buildNativeBody(manifest, { command: 'writeSessionText', resource: 'Session' })
  return runInNewContext(`(function(app,args) { ${body} })(app,args)`, { app, args })
}

describe('identity-traversal item commands', () => {
  it('accepts an item command addressed by Window-scoped identity with action arguments', () => {
    const manifest = sessionManifest()
    expect(AppManifestSchema.safeParse(manifest).success).toBe(true)
    expect(findAddressIssues(manifest)).toEqual([])
    expect(generateConsolidatedPackages(manifest, { appName: 'panes' }).errors).toEqual([])
  })

  it('searches every tab of the selected window and sends the session as the direct parameter', () => {
    const { app, sent } = standIn({ 7: [['a'], ['b', 'c']], 8: [['c']] })
    run(sessionManifest(), app, { windowId: 7, sessionId: 'c', text: 'ls', newline: false })
    // Selection inputs are lookup keys; only action arguments are named parameters.
    expect(sent).toEqual([{ session: 'c', named: { text: 'ls', newline: false } }])
  })

  it('sends no newline argument when the caller omits it, leaving the app default', () => {
    const { app, sent } = standIn({ 7: [['a']] })
    run(sessionManifest(), app, { windowId: 7, sessionId: 'a', text: 'echo hi' })
    expect(sent).toEqual([{ session: 'a', named: { text: 'echo hi' } }])
  })

  it('fails as missing, and writes nothing, when the session is not in that window', () => {
    const { app, sent, reads } = standIn({ 7: [['a']], 8: [['z']] })
    expect(() => run(sessionManifest(), app, { windowId: 7, sessionId: 'z', text: 'x' })).toThrow(
      expect.objectContaining({ errorNumber: NO_SUCH_OBJECT })
    )
    expect(sent).toEqual([])
    // The search never broadens to another window.
    expect(reads.some((read) => read.startsWith('session:8:'))).toBe(false)
  })

  it('fails as missing, and writes nothing, when the window does not exist', () => {
    const { app, sent } = standIn({ 7: [['a']] })
    expect(() => run(sessionManifest(), app, { windowId: 9, sessionId: 'a', text: 'x' })).toThrow(
      expect.objectContaining({ errorNumber: NO_SUCH_OBJECT })
    )
    expect(sent).toEqual([])
  })

  it('refuses to write when the identity matches more than one session in the window', () => {
    const { app, sent } = standIn({ 7: [['a'], ['a']] })
    expect(() => run(sessionManifest(), app, { windowId: 7, sessionId: 'a', text: 'x' })).toThrow(
      expect.objectContaining({ direction: 'encode' })
    )
    expect(sent).toEqual([])
  })

  it.each(['list', 'create', 'update', 'delete'] as const)(
    'still refuses identity traversal on a %s, which has its own selection shape',
    (name) => {
      const manifest = sessionManifest()
      manifest.commands['writeSessionText'] = writeCommand({ name, routeName: undefined })
      expect(
        findAddressIssues(manifest).some(({ path }) => path.includes('identityTraversal'))
      ).toBe(true)
    }
  )

  it('still refuses non-selection inputs on an identity get', () => {
    const manifest = sessionManifest()
    const resolve = manifest.commands['resolveSession']
    if (resolve === undefined) throw new Error('Missing resolve')
    resolve.parameters.push({ name: 'text', type: 'string', description: 'x', required: false })
    expect(findAddressIssues(manifest).length).toBeGreaterThan(0)
  })

  it('refuses an item command whose traversal path does not reach the target', () => {
    const manifest = sessionManifest()
    manifest.commands['writeSessionText'] = writeCommand({
      identityTraversal: { collections: ['invented'], evidence: 'No such edge' },
    })
    expect(findAddressIssues(manifest).length).toBeGreaterThan(0)
  })
})
