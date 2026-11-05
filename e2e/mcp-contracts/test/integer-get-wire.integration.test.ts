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
 * A command's optional integer parameter takes the same path through the
 * HTTP client: it is sent in the wire form when supplied, and not at all
 * when omitted.
 *
 * Both send their request through `fetch`, which records the body. The body
 * must equal the hand-written wire value and must be admitted by the
 * operation's own `input.wire` from the package's built contract.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D3)
 * @see https://github.com/mike-north/macts/issues/207
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OperationId } from '@macts/contracts'
import { OmniPlanClient } from '@macts/omniplan'
import { plugin as omniPlanCli } from '@macts/omniplan/cli'
import { omniPlanContract } from '@macts/omniplan/contract'
import { QuickTimePlayerClient } from '@macts/quicktime-player'
import { quickTimePlayerContract } from '@macts/quicktime-player/contract'
import { TVClient } from '@macts/tv'
import { plugin as tvCli } from '@macts/tv/cli'
import { tvContract } from '@macts/tv/contract'

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
  positional: string
): Promise<number> {
  const Command = commands.find((candidate) =>
    candidate.paths?.some((candidatePath) => candidatePath.join(' ') === path.join(' '))
  )
  if (Command === undefined) throw new Error(`no CLI command ${path.join(' ')}`)
  const command = new Command()
  const output: string[] = []
  const stream = { write: (chunk: string) => output.push(chunk) }
  Object.assign(command, {
    [positional]: ID_TEXT,
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

describe("a command's optional integer parameter is sent in the contract wire form (#207)", () => {
  const client = (): QuickTimePlayerClient =>
    new QuickTimePlayerClient({ apiKey: 'k', baseUrl: BASE_URL })
  const wire = (): ReturnType<typeof inputWire> =>
    inputWire(quickTimePlayerContract, 'quicktime-player.app.stepForward')

  // QuickTime's `step forward` takes `by`, an optional integer. The HTTP
  // client sent it as a bare number, which the input rejects.
  it('QuickTime stepForward: sends `by` as an integer wire value its input admits (bug #207)', async () => {
    await client().stepForward(2)
    const body = onlyRequest('quicktime-player.app.stepForward')
    expect(body).toEqual({ by: { integer: '2' } })
    expect(wire().safeParse(body).success).toBe(true)
    expect(wire().safeParse({ by: 2 }).success).toBe(false)
  })

  it('QuickTime stepForward: sends no `by` when it is omitted', async () => {
    await client().stepForward()
    const body = onlyRequest('quicktime-player.app.stepForward')
    expect(body).toEqual({})
    expect(wire().safeParse(body).success).toBe(true)
  })
})
