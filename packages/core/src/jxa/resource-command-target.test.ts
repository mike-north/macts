/**
 * Regression tests for #287: a resource-scoped command that is not a CRUD
 * shape sends the item the caller names to the app.
 *
 * Every such command acts on one item, which the app's dictionary takes as
 * the command's direct parameter (Notes' `show` a note, Mail's `send` an
 * outgoing message, the Chromium suite's `execute` a tab). The body called
 * the command on the application with only a record of its declared
 * parameters, so the item never reached the app, and an identifier the
 * manifest declared as a parameter (`tabId`, `workspaceName`) went in as a
 * named key the dictionary does not declare.
 *
 * The body now selects the item exactly as a get does, under the parent the
 * command records, by the resource's identifier targeting, and sends it as
 * the direct parameter: `app[name](item, params)`, or `app[name](item)` when
 * no other parameter is supplied. `params` carries only the other declared
 * parameters, so no identifier key is ever sent.
 *
 * The executor cases run the real native executor on the real composed
 * script, in an isolated context, against stand-in apps built from each
 * dictionary's containment. Expected values come from the dictionaries: the
 * command's direct parameter and its named parameters.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4, command parents; D10)
 * @see https://github.com/mike-north/macts/issues/287
 * @see ../../../../manifests/mail/app.yaml
 * @see ../../../../manifests/notes/app.yaml
 * @see ../../../../manifests/microsoft-edge/app.yaml
 * @see ../../../../manifests/music/app.yaml
 */

import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { TargetNotFoundError, type ValuePlan, type WireRecord } from '@macts/contracts'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/index.js'
import { createNativeExecutor } from './native-executor.js'
import { standInTransport } from './test-support/stand-in-app.js'

/** A shipped manifest, by app directory. */
function manifestPath(app: string): string {
  return fileURLToPath(new URL(`../../../../manifests/${app}/app.yaml`, import.meta.url))
}

let mail: AppManifest
let notes: AppManifest
let edge: AppManifest
let music: AppManifest
beforeAll(async () => {
  mail = await loadManifest(manifestPath('mail'))
  notes = await loadManifest(manifestPath('notes'))
  edge = await loadManifest(manifestPath('microsoft-edge'))
  music = await loadManifest(manifestPath('music'))
})

/** A specifier for an object that does not exist. */
const ABSENT = Object.freeze({ exists: () => false })

/** One stand-in object: a specifier that exists, labelled for assertions. */
interface StandInObject {
  readonly label: string
  readonly exists: () => boolean
}

/** A stand-in object labelled `label`. */
function object(label: string): StandInObject {
  return { label, exists: () => true }
}

/**
 * A stand-in element collection holding `members` by key, in element order.
 * `byId(key)` finds the member with that key, and `whose({ <property>: key })`
 * the members whose key matches, in element order, with an index past them
 * naming no object, as the bridge's does. Each lookup is recorded in
 * `lookups`, labelled with `label`.
 */
function collection(
  label: string,
  members: readonly (readonly [unknown, StandInObject])[],
  lookups: string[]
): object {
  return Object.assign(() => members.map(([, member]) => member), {
    byId(key: unknown) {
      lookups.push(`${label}.byId(${String(key)})`)
      return members.find(([k]) => k === key)?.[1] ?? ABSENT
    },
    whose(filter: Readonly<Record<string, unknown>>) {
      lookups.push(`${label}.whose(${JSON.stringify(filter)})`)
      const [value] = Object.values(filter)
      const matches = members.filter(([k]) => k === value).map(([, member]) => member)
      return new Proxy(matches, {
        get: (target, key, receiver) =>
          typeof key === 'string' && /^\d+$/.test(key) && Number(key) >= target.length
            ? ABSENT
            : (Reflect.get(target, key, receiver) as unknown),
      })
    },
  })
}

/** One call of an app command: its name and every argument it received. */
interface CommandCall {
  readonly command: string
  readonly args: readonly unknown[]
}

/** App command members that record each call in `calls` and return nothing. */
function commands(names: readonly string[], calls: CommandCall[]): Record<string, unknown> {
  return Object.fromEntries(
    names.map((command) => [
      command,
      (...args: unknown[]) => {
        calls.push({ command, args })
      },
    ])
  )
}

/** One field of a record value plan. */
type RecordField = Extract<ValuePlan, { kind: 'record' }>['fields'][string]

/** A record input plan whose fields are all required strings, then the optional ones. */
function stringInputs(required: readonly string[], optional: readonly string[] = []): ValuePlan {
  const fields: Record<string, RecordField> = {}
  for (const name of required) fields[name] = { presence: 'required', value: { kind: 'string' } }
  for (const name of optional) fields[name] = { presence: 'optional', value: { kind: 'string' } }
  return { kind: 'record', fields }
}

/** Run `command` on `resource` of `manifest` against the stand-in `app`. */
function run(
  app: object,
  manifest: AppManifest,
  command: string,
  resource: string,
  input: WireRecord,
  inputPlan: ValuePlan
): Promise<unknown> {
  return createNativeExecutor({ transport: standInTransport(app) }).execute({
    manifest,
    target: { command, resource },
    input,
    inputPlan,
    outputPlan: { kind: 'none' },
    resourcePlans: {},
  })
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to reject')
}

/** The `details` of a `TargetNotFoundError`; fails for any other error. */
function notFoundDetails(error: unknown): unknown {
  expect(error).toBeInstanceOf(TargetNotFoundError)
  return error instanceof TargetNotFoundError ? error.details : undefined
}

describe('a top-level item looked up by its dictionary id (Mail send)', () => {
  // Mail.sdef:258: `send` takes the outgoing message as its direct parameter,
  // and declares no named parameter. Mail.sdef:331: the application holds
  // outgoing messages as elements, and their `id`, an integer, is the
  // dictionary id (code `ID  `), so the message is found with `byId`.
  const draft = object('outgoing message 7')
  const other = object('outgoing message 8')

  /** The send input: the message's integer `id`, which travels as decimal text (D3). */
  const ID_INPUT: ValuePlan = {
    kind: 'record',
    fields: { id: { presence: 'required', value: { kind: 'integer' } } },
  }

  function standInMail(lookups: string[], calls: CommandCall[]): object {
    return {
      outgoingMessages: collection(
        'outgoingMessages',
        [
          [8, other],
          [7, draft],
        ],
        lookups
      ),
      ...commands(['send'], calls),
    }
  }

  // Regression: the body called `app.send()` with no direct parameter.
  it('sends the outgoing message the id names as the direct parameter, alone', async () => {
    const lookups: string[] = []
    const calls: CommandCall[] = []

    await run(
      standInMail(lookups, calls),
      mail,
      'send',
      'OutgoingMessage',
      { id: { integer: '7' } },
      ID_INPUT
    )

    expect(lookups).toEqual(['outgoingMessages.byId(7)'])
    expect(calls).toHaveLength(1)
    expect(calls[0]?.command).toBe('send')
    expect(calls[0]?.args).toHaveLength(1)
    expect(calls[0]?.args[0]).toBe(draft)
  })

  // A missing item fails before the command is sent, naming the operation's
  // own resource.
  it('fails with TargetNotFoundError naming OutgoingMessage, sending nothing, when none has the id', async () => {
    const calls: CommandCall[] = []

    const error = await rejectionOf(
      run(
        standInMail([], calls),
        mail,
        'send',
        'OutgoingMessage',
        { id: { integer: '9' } },
        ID_INPUT
      )
    )

    expect(notFoundDetails(error)).toEqual({ resource: 'OutgoingMessage' })
    expect(calls).toEqual([])
  })
})

describe('an item matched on a property, first match (Notes show)', () => {
  // Notes.sdef:18: `show` takes the object to be shown (an account, folder,
  // note or attachment) as its direct parameter. The manifest matches a note
  // on its `name` (byProperty), which nothing claims unique, so the first
  // match in the app's element order is the one shown.
  const first = object('first note named Plans')
  const second = object('second note named Plans')
  const unrelated = object('note named Groceries')

  it('sends the first note with the name as the direct parameter, alone', async () => {
    const lookups: string[] = []
    const calls: CommandCall[] = []
    const app = {
      notes: collection(
        'notes',
        [
          ['Groceries', unrelated],
          ['Plans', first],
          ['Plans', second],
        ],
        lookups
      ),
      ...commands(['show'], calls),
    }

    await run(app, notes, 'show', 'Note', { name: 'Plans' }, stringInputs(['name']))

    expect(lookups).toEqual(['notes.whose({"name":"Plans"})'])
    expect(calls).toHaveLength(1)
    expect(calls[0]?.args).toHaveLength(1)
    expect(calls[0]?.args[0]).toBe(first)
  })
})

describe('an item within its parent (an Edge tab within its window)', () => {
  // Chrome.sdef:290 (the Chromium suite Edge ships): `reload` takes the tab
  // as its direct parameter and declares no named parameter. A tab is an
  // element of a window only, and the application has no tab element, so the
  // tab is found within the window the command's `windowId` names.
  const tab = object('tab T2 of window W1')

  function standInEdge(lookups: string[], calls: CommandCall[]): object {
    const window = {
      ...object('window W1'),
      tabs: collection(
        'windows.byId(W1).tabs',
        [
          ['T1', object('tab T1 of window W1')],
          ['T2', tab],
        ],
        lookups
      ),
    }
    return {
      windows: collection('windows', [['W1', window]], lookups),
      ...commands(['reload', 'execute'], calls),
    }
  }

  // Regression: the body called `app.reload({ tabId })`, a named key the
  // dictionary does not declare, and sent no tab.
  it('sends the tab found within the window as the direct parameter, alone', async () => {
    const lookups: string[] = []
    const calls: CommandCall[] = []

    await run(
      standInEdge(lookups, calls),
      edge,
      'reload',
      'Tab',
      { windowId: 'W1', id: 'T2' },
      stringInputs(['windowId', 'id'])
    )

    expect(lookups).toEqual(['windows.byId(W1)', 'windows.byId(W1).tabs.byId(T2)'])
    expect(calls).toHaveLength(1)
    expect(calls[0]?.args).toHaveLength(1)
    expect(calls[0]?.args[0]).toBe(tab)
  })

  // Chrome.sdef:334: `execute` takes the tab as its direct parameter and
  // `javascript` as its one named parameter. Only that parameter goes in the
  // record: neither the window's nor the tab's identifier is a parameter of
  // the app's command.
  it('sends only the dictionary parameter javascript in the named-parameter record', async () => {
    const calls: CommandCall[] = []

    await run(
      standInEdge([], calls),
      edge,
      'execute',
      'Tab',
      { windowId: 'W1', id: 'T2', javascript: 'document.title' },
      stringInputs(['windowId', 'id', 'javascript'])
    )

    expect(calls).toHaveLength(1)
    expect(calls[0]?.args).toHaveLength(2)
    expect(calls[0]?.args[0]).toBe(tab)
    expect(calls[0]?.args[1]).toEqual({ javascript: 'document.title' })
  })

  // A missing parent fails before any tab is looked up, naming the parent's
  // resource, as a get of the tab does.
  it('fails with TargetNotFoundError naming Window when the window is missing', async () => {
    const lookups: string[] = []
    const calls: CommandCall[] = []

    const error = await rejectionOf(
      run(
        standInEdge(lookups, calls),
        edge,
        'reload',
        'Tab',
        { windowId: 'W9', id: 'T2' },
        stringInputs(['windowId', 'id'])
      )
    )

    expect(notFoundDetails(error)).toEqual({ resource: 'Window' })
    expect(lookups).toEqual(['windows.byId(W9)'])
    expect(calls).toEqual([])
  })

  // A missing item within an existing parent names the item's resource.
  it('fails with TargetNotFoundError naming Tab when the window has no such tab', async () => {
    const calls: CommandCall[] = []

    const error = await rejectionOf(
      run(
        standInEdge([], calls),
        edge,
        'reload',
        'Tab',
        { windowId: 'W1', id: 'T9' },
        stringInputs(['windowId', 'id'])
      )
    )

    expect(notFoundDetails(error)).toEqual({ resource: 'Tab' })
    expect(calls).toEqual([])
  })
})

describe('a command with other declared parameters (Music search)', () => {
  // Music.sdef:140: `search` takes the playlist as its direct parameter, with
  // the named parameters `for` (required) and `only`. The manifest matches a
  // playlist on its persistent ID.
  const playlist = object('playlist 0A1B')

  function standInMusic(calls: CommandCall[]): object {
    return {
      playlists: collection('playlists', [['0A1B', playlist]], []),
      ...commands(['search'], calls),
    }
  }

  it('sends the supplied dictionary parameters, and no identifier, beside the playlist', async () => {
    const calls: CommandCall[] = []

    await run(
      standInMusic(calls),
      music,
      'search',
      'Playlist',
      { persistentID: '0A1B', for: 'blue', only: 'songs' },
      stringInputs(['persistentID', 'for'], ['only'])
    )

    expect(calls).toHaveLength(1)
    expect(calls[0]?.args[0]).toBe(playlist)
    expect(calls[0]?.args[1]).toEqual({ for: 'blue', only: 'songs' })
  })

  // An optional parameter the caller leaves out is left out of the record.
  it('leaves an omitted optional parameter out of the record', async () => {
    const calls: CommandCall[] = []

    await run(
      standInMusic(calls),
      music,
      'search',
      'Playlist',
      { persistentID: '0A1B', for: 'blue' },
      stringInputs(['persistentID', 'for'], ['only'])
    )

    expect(calls[0]?.args[1]).toEqual({ for: 'blue' })
  })
})
