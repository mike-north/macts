/**
 * Regression tests for #207: the generated legacy HTTP client and the
 * generated CLI sent an integer `get` identifier as the string the caller
 * gave, `{ id: "42" }`, which the operation's contract input rejects.
 *
 * An integer travels in the contract's wire form, `{ integer: "<digits>" }`
 * (phases/13 D3: integers are canonical decimal text), and a get's input
 * admits its identifier in no other form. Each shipped get keyed by an
 * integer identifier is driven here through its real built package:
 *
 * - the HTTP client (`<App>Client`), called with the string a CLI passes;
 * - the CLI `get` command from the package's CLI plugin, run with the
 *   positional a user types, through the client it calls.
 *
 * Every shipped command with an integer parameter takes the same path through
 * the HTTP client, which sent the integer as a bare JSON number. Each is
 * called through its real built client; an optional integer is sent in the
 * wire form when supplied, and not at all when omitted.
 *
 * Both send their request through `fetch`, which records the body. The body
 * must equal the hand-written wire value and must be admitted by the
 * operation's own `input.wire` from the package's built contract.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D3)
 * @see https://github.com/mike-north/macts/issues/207
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ValidationError, type OperationId } from '@macts/contracts'
import { AutomatorClient } from '@macts/automator'
import { automatorContract } from '@macts/automator/contract'
import { MicrosoftWordClient } from '@macts/microsoft-word'
import { microsoftWordContract } from '@macts/microsoft-word/contract'
import { OmniPlanClient } from '@macts/omniplan'
import { plugin as omniPlanCli } from '@macts/omniplan/cli'
import { omniPlanContract } from '@macts/omniplan/contract'
import { QuickTimePlayerClient } from '@macts/quicktime-player'
import { quickTimePlayerContract } from '@macts/quicktime-player/contract'
import { SystemEventsClient } from '@macts/system-events'
import { systemEventsContract } from '@macts/system-events/contract'
import { TVClient } from '@macts/tv'
import { plugin as tvCli } from '@macts/tv/cli'
import { tvContract } from '@macts/tv/contract'
import { XcodeClient } from '@macts/xcode'
import { xcodeContract } from '@macts/xcode/contract'

/** The server the clients are pointed at; nothing listens there, `fetch` is stubbed. */
const BASE_URL = 'http://macts.test'

/** The identifier every get is called with, as a CLI positional is: text. */
const ID_TEXT = '42'

/** The request body every get must send for {@link ID_TEXT}, written by hand. */
const EXPECTED_BODY = { id: { integer: '42' } }

/** One request the stubbed `fetch` received. */
interface SentRequest {
  readonly url: string
  readonly body: unknown
}

/** The requests sent since the test began. */
let sent: SentRequest[] = []

beforeEach(() => {
  sent = []
  vi.stubEnv('MACTS_API_KEY', 'macts_sk_test')
  vi.stubEnv('MACTS_API_URL', BASE_URL)
  vi.stubGlobal('fetch', (url: string | URL, init?: RequestInit): Promise<Response> => {
    // The generated HttpClient sends its body as JSON text.
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined
    sent.push({ url: String(url), body })
    return Promise.resolve(
      new Response(JSON.stringify({ result: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

/** The `input.wire` schema of `operation` in `contract`. */
function inputWire(
  contract: { readonly operations: Readonly<Record<OperationId, { readonly input: unknown }>> },
  operation: OperationId
): { safeParse: (value: unknown) => { success: boolean } } {
  const descriptor = contract.operations[operation] as
    | { readonly input: { readonly wire: { safeParse: (value: unknown) => { success: boolean } } } }
    | undefined
  if (descriptor === undefined) throw new Error(`no operation ${operation}`)
  return descriptor.input.wire
}

/** The one request sent, which must have gone to `operation`'s RPC route. */
function onlyRequest(operation: OperationId): unknown {
  expect(sent.map(({ url }) => url)).toEqual([`${BASE_URL}/api/v1/rpc/${operation}`])
  return sent[0]?.body
}

/** A generated CLI command class, as a plugin lists it. */
type CommandClass = (typeof omniPlanCli.commands)[number]

/**
 * Run the CLI command at `path` from `commands`, with `positional` set to
 * {@link ID_TEXT} as clipanion would set it, and return its exit code.
 */
async function runCli(
  commands: readonly CommandClass[],
  path: readonly string[],
  positional: string,
  value = ID_TEXT
): Promise<number> {
  const Command = commands.find((candidate) =>
    candidate.paths?.some((candidatePath) => candidatePath.join(' ') === path.join(' '))
  )
  if (Command === undefined) throw new Error(`no CLI command ${path.join(' ')}`)
  const command = new Command()
  const output: string[] = []
  const stream = { write: (chunk: string) => output.push(chunk) }
  Object.assign(command, {
    [positional]: value,
    json: true,
    context: { stdout: stream, stderr: stream },
  })
  const code = await command.execute()
  if (code !== 0) throw new Error(`CLI exited ${String(code)}: ${output.join('')}`)
  return code
}

/** One shipped get keyed by an integer identifier. */
interface IntegerGet {
  /** The manifest command key, for the test name. */
  readonly label: string
  readonly operation: OperationId
  readonly wire: () => ReturnType<typeof inputWire>
  /** Call the get on the package's HTTP client with {@link ID_TEXT}. */
  readonly callClient: () => Promise<unknown>
  readonly commands: readonly CommandClass[]
  readonly cliPath: readonly string[]
  /** The CLI command's property for the positional identifier. */
  readonly positional: string
}

const omniPlan = (): OmniPlanClient => new OmniPlanClient({ apiKey: 'k', baseUrl: BASE_URL })
const tv = (): TVClient => new TVClient({ apiKey: 'k', baseUrl: BASE_URL })

const INTEGER_GETS: readonly IntegerGet[] = [
  {
    label: 'OmniPlan getTask',
    operation: 'omniplan.tasks.get',
    wire: () => inputWire(omniPlanContract, 'omniplan.tasks.get'),
    callClient: () => omniPlan().tasks.get(ID_TEXT),
    commands: omniPlanCli.commands,
    cliPath: ['omniplan', 'projects', 'scenarios', 'tasks', 'get'],
    positional: 'taskId',
  },
  {
    label: 'OmniPlan getResource',
    operation: 'omniplan.resources.get',
    wire: () => inputWire(omniPlanContract, 'omniplan.resources.get'),
    callClient: () => omniPlan().resources.get(ID_TEXT),
    commands: omniPlanCli.commands,
    cliPath: ['omniplan', 'projects', 'scenarios', 'resources', 'get'],
    positional: 'resourceId',
  },
  {
    label: 'OmniPlan getMilestone',
    operation: 'omniplan.milestones.get',
    wire: () => inputWire(omniPlanContract, 'omniplan.milestones.get'),
    callClient: () => omniPlan().milestones.get(ID_TEXT),
    commands: omniPlanCli.commands,
    cliPath: ['omniplan', 'projects', 'scenarios', 'milestones', 'get'],
    positional: 'milestoneId',
  },
  {
    label: 'TV getBrowserWindow',
    operation: 'tv.browserWindows.get',
    wire: () => inputWire(tvContract, 'tv.browserWindows.get'),
    callClient: () => tv().browserWindows.get(ID_TEXT),
    commands: tvCli.commands,
    cliPath: ['tv', 'browserWindows', 'get'],
    positional: 'browserWindowId',
  },
  {
    label: 'TV getPlaylistWindow',
    operation: 'tv.playlistWindows.get',
    wire: () => inputWire(tvContract, 'tv.playlistWindows.get'),
    callClient: () => tv().playlistWindows.get(ID_TEXT),
    commands: tvCli.commands,
    cliPath: ['tv', 'playlistWindows', 'get'],
    positional: 'playlistWindowId',
  },
]

describe('a get by an integer id sends the id in the contract wire form (#207)', () => {
  // The contract must reject the body the surfaces sent before the fix, so
  // the admission checks below cannot pass vacuously.
  it.each(INTEGER_GETS.map((get) => [get.label, get]))(
    '%s: its contract input rejects the id as a bare string or number',
    (_label, get) => {
      expect(get.wire().safeParse({ id: ID_TEXT }).success).toBe(false)
      expect(get.wire().safeParse({ id: 42 }).success).toBe(false)
    }
  )

  it.each(INTEGER_GETS.map((get) => [get.label, get]))(
    '%s: the HTTP client sends a body its contract input admits (bug #207: id sent as a string)',
    async (_label, get) => {
      await get.callClient()
      const body = onlyRequest(get.operation)
      expect(body).toEqual(EXPECTED_BODY)
      expect(get.wire().safeParse(body).success).toBe(true)
    }
  )

  it.each(INTEGER_GETS.map((get) => [get.label, get]))(
    '%s: the CLI get sends a body its contract input admits (bug #207: positional sent as a string)',
    async (_label, get) => {
      await runCli(get.commands, get.cliPath, get.positional)
      const body = onlyRequest(get.operation)
      expect(body).toEqual(EXPECTED_BODY)
      expect(get.wire().safeParse(body).success).toBe(true)
    }
  )
})

/** One shipped command whose integer parameter the HTTP client sent as a bare number. */
interface IntegerCommand {
  /** The app and command, for the test name. */
  readonly label: string
  readonly operation: OperationId
  readonly wire: () => ReturnType<typeof inputWire>
  /** Call the command on the package's HTTP client. */
  readonly call: () => Promise<unknown>
  /** The body the call must send, written by hand from the contract's input. */
  readonly expected: Readonly<Record<string, unknown>>
  /** The body the client sent before the fix: the integers as bare numbers. */
  readonly before: Readonly<Record<string, unknown>>
}

const automator = (): AutomatorClient => new AutomatorClient({ apiKey: 'k', baseUrl: BASE_URL })
const word = (): MicrosoftWordClient => new MicrosoftWordClient({ apiKey: 'k', baseUrl: BASE_URL })
const quickTime = (): QuickTimePlayerClient =>
  new QuickTimePlayerClient({ apiKey: 'k', baseUrl: BASE_URL })
const systemEvents = (): SystemEventsClient =>
  new SystemEventsClient({ apiKey: 'k', baseUrl: BASE_URL })
const xcode = (): XcodeClient => new XcodeClient({ apiKey: 'k', baseUrl: BASE_URL })

const INTEGER_COMMANDS: readonly IntegerCommand[] = [
  {
    label: 'Automator add (atIndex)',
    operation: 'automator.app.add',
    wire: () => inputWire(automatorContract, 'automator.app.add'),
    call: () => automator().add('Ask for Text', 'Morning', 3),
    expected: { object: 'Ask for Text', to: 'Morning', atIndex: { integer: '3' } },
    before: { object: 'Ask for Text', to: 'Morning', atIndex: 3 },
  },
  {
    label: 'Microsoft Word insertText (at)',
    operation: 'microsoft-word.app.insertText',
    wire: () => inputWire(microsoftWordContract, 'microsoft-word.app.insertText'),
    call: () => word().insertText('Hello', 5),
    expected: { text: 'Hello', at: { integer: '5' } },
    before: { text: 'Hello', at: 5 },
  },
  {
    label: 'Microsoft Word createRange (start, end)',
    operation: 'microsoft-word.documents.createRange',
    wire: () => inputWire(microsoftWordContract, 'microsoft-word.documents.createRange'),
    call: () => word().documents.createRange(1, 4),
    expected: { start: { integer: '1' }, end: { integer: '4' } },
    before: { start: 1, end: 4 },
  },
  {
    label: 'QuickTime Player stepForward (by)',
    operation: 'quicktime-player.app.stepForward',
    wire: () => inputWire(quickTimePlayerContract, 'quicktime-player.app.stepForward'),
    call: () => quickTime().stepForward(2),
    expected: { by: { integer: '2' } },
    before: { by: 2 },
  },
  {
    label: 'QuickTime Player stepBackward (by)',
    operation: 'quicktime-player.app.stepBackward',
    wire: () => inputWire(quickTimePlayerContract, 'quicktime-player.app.stepBackward'),
    call: () => quickTime().stepBackward(2),
    expected: { by: { integer: '2' } },
    before: { by: 2 },
  },
  {
    label: 'System Events editActionOf (usingActionNumber)',
    operation: 'system-events.app.editActionOf',
    wire: () => inputWire(systemEventsContract, 'system-events.app.editActionOf'),
    call: () => systemEvents().editActionOf(undefined, 2),
    expected: { usingActionNumber: { integer: '2' } },
    before: { usingActionNumber: 2 },
  },
  {
    label: 'System Events removeActionFrom (usingActionNumber)',
    operation: 'system-events.app.removeActionFrom',
    wire: () => inputWire(systemEventsContract, 'system-events.app.removeActionFrom'),
    call: () => systemEvents().removeActionFrom(undefined, 2),
    expected: { usingActionNumber: { integer: '2' } },
    before: { usingActionNumber: 2 },
  },
  {
    label: 'Xcode attach (toProcessIdentifier)',
    operation: 'xcode.workspaceDocuments.attach',
    wire: () => inputWire(xcodeContract, 'xcode.workspaceDocuments.attach'),
    call: () => xcode().workspaceDocuments.attach('MyApp', 4242, false),
    expected: {
      workspaceName: 'MyApp',
      toProcessIdentifier: { integer: '4242' },
      suspended: false,
    },
    before: { workspaceName: 'MyApp', toProcessIdentifier: 4242, suspended: false },
  },
]

describe("a command's integer parameter is sent in the contract wire form (#207)", () => {
  // The contract must reject the body the client sent before the fix, so the
  // admission checks below cannot pass vacuously.
  it.each(INTEGER_COMMANDS.map((command) => [command.label, command]))(
    '%s: its contract input rejects the integer as a bare number',
    (_label, command) => {
      expect(command.wire().safeParse(command.before).success).toBe(false)
    }
  )

  it.each(INTEGER_COMMANDS.map((command) => [command.label, command]))(
    '%s: the HTTP client sends a body its contract input admits (bug #207: integer sent as a bare number)',
    async (_label, command) => {
      await command.call()
      const body = onlyRequest(command.operation)
      expect(body).toEqual(command.expected)
      expect(command.wire().safeParse(body).success).toBe(true)
    }
  )

  // An optional integer that is omitted sends no field: its wire form would
  // be `{ integer: "undefined" }`, which the input rejects.
  it('QuickTime Player stepForward: sends no `by` when it is omitted (#207)', async () => {
    await quickTime().stepForward()
    const body = onlyRequest('quicktime-player.app.stepForward')
    expect(body).toEqual({})
    expect(
      inputWire(quickTimePlayerContract, 'quicktime-player.app.stepForward').safeParse(body).success
    ).toBe(true)
  })
})

/** D3 and D10 require canonical decimal text within the safe-integer domain. */
describe('integer input validation before HTTP dispatch', () => {
  it.each(['', ' 7', '+7', '07', '-0', '1e2', '7.5', 'no', '9007199254740992'])(
    'rejects noncanonical or out-of-range identifier text %j without a request',
    async (id) => {
      await expect(omniPlan().tasks.get(id)).rejects.toBeInstanceOf(ValidationError)
      expect(sent).toEqual([])
    }
  )

  it.each([1.5, NaN, Infinity, -Infinity, 9007199254740992, -9007199254740992])(
    'rejects invalid numeric identifier %s without a request',
    async (id) => {
      await expect(omniPlan().tasks.get(id)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
      expect(sent).toEqual([])
    }
  )

  it.each([
    [-9007199254740991, '-9007199254740991'],
    [9007199254740991, '9007199254740991'],
    [-0, '0'],
  ] as const)('encodes valid boundary %s exactly', async (id, text) => {
    await omniPlan().tasks.get(id)
    const body = onlyRequest('omniplan.tasks.get')
    expect(body).toEqual({ id: { integer: text } })
    expect(inputWire(omniPlanContract, 'omniplan.tasks.get').safeParse(body).success).toBe(true)
  })

  it('fails a malformed CLI positional locally without a request', async () => {
    await expect(
      runCli(
        omniPlanCli.commands,
        ['omniplan', 'projects', 'scenarios', 'tasks', 'get'],
        'taskId',
        '7.5'
      )
    ).rejects.toThrow(/integer/i)
    expect(sent).toEqual([])
  })

  it('rejects a fractional command argument without a request', async () => {
    await expect(quickTime().stepForward(1.5)).rejects.toBeInstanceOf(ValidationError)
    expect(sent).toEqual([])
  })
})
