/**
 * Integration: the MCP tools of operations registered from a manifest alone,
 * served by the adapter over a real runtime.
 *
 * A manifest-registered operation's input is exactly its command's declared
 * parameters (`buildDeclaredInputSchema` in `@macts/runtime`): each one
 * checked for presence and primitive type, and no other key. Its tool must
 * list that input, so a client can learn from `tools/list` which arguments
 * the command takes, which of them are required, and that it accepts nothing
 * else; and the listed schema must accept exactly what a call accepts.
 *
 * Expected values are written by hand from the manifests:
 *
 * - the shipped Contacts manifest (`manifests/contacts/app.yaml`), whose
 *   application command `make` declares the required `new` and the optional
 *   `at`, `withData` and `withProperties`. Its operation is
 *   `contacts.app.make` (`contacts:app:make`), served as the tool
 *   `macts__contacts__app_make` (`toolNameFor`). `new` and `at` are strings,
 *   and `withData` and `withProperties` are `any`, which a manifest-registered
 *   operation reads as text, so every one of them is listed as a string;
 * - a stand-in Workshop manifest, whose `get` takes the required string
 *   `serial` and the optional boolean `verbose`, and whose application
 *   command `reset` declares no parameters at all, so it accepts only `{}`.
 *
 * A call's acceptance is read from the real call path: the adapter's
 * `callTool` over a runtime that validates input before it executes. The
 * listed schema's acceptance is read from a real draft-07 JSON Schema
 * validator, the Ajv validator the MCP SDK ships.
 *
 * @see ../../../../manifests/contacts/app.yaml
 * @see ../../../runtime/src/operations/request-schema.ts
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#tool
 * @see https://json-schema.org/draft-07/json-schema-validation
 */

import { fileURLToPath } from 'node:url'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest, type AppManifest } from '@macts/core'
import type { Authority, InvocationContext, WireValue } from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  createBearerCredential,
  createRuntime,
  type RuntimeLogger,
} from '@macts/runtime'
import { createMcpAdapter, type McpAdapter, type McpToolListing } from './adapter.js'

/** The `$schema` keyword `z.toJSONSchema` emits for the draft-7 target. */
const DRAFT_7 = 'http://json-schema.org/draft-07/schema#'

/** The shipped Contacts manifest. */
const CONTACTS_MANIFEST_PATH = fileURLToPath(
  new URL('../../../../manifests/contacts/app.yaml', import.meta.url)
)

/** The Contacts manifest's command key for creating an object. */
const MAKE_COMMAND = 'make'
const MAKE_TOOL = 'macts__contacts__app_make'

/**
 * A gadget app whose `get` addresses a gadget by its required `serial` and
 * takes an optional `verbose` flag, and whose `reset` takes no parameters.
 * Operations: `workshop.gadgets.get` and `workshop.app.reset`.
 */
const WORKSHOP_MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Workshop', bundleId: 'com.example.workshop', tccEntitlements: [] },
  resources: {
    Gadget: {
      name: 'Gadget',
      plural: 'Gadgets',
      description: 'A gadget',
      properties: {},
      identifiers: [{ property: 'serial', primary: true }],
    },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    get: {
      name: 'get',
      description: 'Get one gadget',
      scope: 'resource',
      resourceType: 'Gadget',
      parameters: [
        { name: 'serial', type: 'string', description: 'The gadget', required: true },
        { name: 'verbose', type: 'boolean', description: 'Read every property', required: false },
      ],
    },
    reset: {
      name: 'reset',
      description: 'Reset the workshop',
      scope: 'application',
      parameters: [],
    },
  },
}

const GET_GADGET_TOOL = 'macts__workshop__gadgets_get'
const RESET_TOOL = 'macts__workshop__app_reset'

const SECRET = 'macts_sk_manifest-tools-secret-never-logged'

/** Holds every permission the tests' operations require. */
const OPERATOR: Authority = {
  subject: 'key_operator',
  permissions: ['contacts:app:make', 'workshop:gadgets:get', 'workshop:app:reset'],
}

const CONTEXT: InvocationContext = { credential: createBearerCredential(SECRET) }

/** Discards the diagnostics every rejected call produces. */
const SILENT: RuntimeLogger = {
  error: () => undefined,
  warn: () => undefined,
  info: () => undefined,
}

let contacts: AppManifest
let adapter: McpAdapter

beforeAll(async () => {
  contacts = await loadManifest(CONTACTS_MANIFEST_PATH)
  const runtime = createRuntime({
    executor: {
      provider: 'manifest-tools-stub',
      execute: () => Promise.resolve<WireValue>({}),
      resolve: () => Promise.resolve<WireValue>({}),
    },
    verifier: {
      verify: (credential) =>
        credential.reveal() === SECRET
          ? Promise.resolve(OPERATOR)
          : Promise.reject(new Error('unknown credential')),
    },
    governance: { policy: ALLOW_ALL_POLICY },
    logger: SILENT,
  })
  runtime.registerManifest(contacts)
  runtime.registerManifest(WORKSHOP_MANIFEST)
  adapter = createMcpAdapter(runtime, { logger: SILENT })
})

/** The listing of the tool named `name`, which must be served. */
function listingOf(name: string): McpToolListing {
  const listing = adapter.listTools().find((tool) => tool.name === name)
  if (listing === undefined) throw new Error(`No tool named ${name} is listed`)
  return listing
}

/** The single JSON document carried as a tool result's text content. */
function documentOf(result: CallToolResult): unknown {
  const [content] = result.content
  if (content?.type !== 'text') {
    throw new Error(`Expected a text content item, got ${JSON.stringify(result.content)}`)
  }
  return JSON.parse(content.text)
}

/**
 * Whether a call of `tool` with `args` passes the runtime's input
 * validation. A call that passes runs and succeeds (the stub executor answers
 * every call); one that fails it is a `VALIDATION_FAILED` tool error. Any
 * other outcome fails the test, so a call can never be counted as accepted
 * or rejected for an unrelated reason.
 */
async function runtimeAccepts(tool: string, args: Record<string, unknown>): Promise<boolean> {
  const result = await adapter.callTool(tool, args, CONTEXT)
  if (result.isError !== true) return true
  expect(documentOf(result)).toMatchObject({ error: { code: 'VALIDATION_FAILED' } })
  return false
}

/** Whether the JSON Schema `tool` lists accepts `args`, by a real draft-07 validator. */
function listingAccepts(tool: string, args: Record<string, unknown>): boolean {
  const validate = new AjvJsonSchemaValidator().getValidator(listingOf(tool).inputSchema)
  return validate(args).valid
}

describe('a manifest-registered operation lists its declared parameters', () => {
  it('lists the shipped Contacts make command with its parameters, its one required parameter, and no other keys', () => {
    // The manifest declares what this test expects; guard against it moving.
    const declared = contacts.commands[MAKE_COMMAND]?.parameters.map(({ name, required }) => ({
      name,
      required,
    }))
    expect(declared).toEqual([
      { name: 'new', required: true },
      { name: 'at', required: false },
      { name: 'withData', required: false },
      { name: 'withProperties', required: false },
    ])

    expect(listingOf(MAKE_TOOL).inputSchema).toEqual({
      $schema: DRAFT_7,
      type: 'object',
      properties: {
        new: { type: 'string' },
        at: { type: 'string' },
        withData: { type: 'string' },
        withProperties: { type: 'string' },
      },
      required: ['new'],
      additionalProperties: false,
    })
  })

  it('lists a required string and an optional boolean with their types', () => {
    expect(listingOf(GET_GADGET_TOOL).inputSchema).toEqual({
      $schema: DRAFT_7,
      type: 'object',
      properties: { serial: { type: 'string' }, verbose: { type: 'boolean' } },
      required: ['serial'],
      additionalProperties: false,
    })
  })

  it('lists a command with no parameters as admitting only the empty object', () => {
    expect(listingOf(RESET_TOOL).inputSchema).toEqual({
      $schema: DRAFT_7,
      type: 'object',
      properties: {},
      additionalProperties: false,
    })
  })
})

describe('a manifest-registered tool lists exactly what a call accepts', () => {
  /** One call, and whether the command's declared parameters admit it. */
  const cases: readonly (readonly [string, string, Record<string, unknown>, boolean])[] = [
    ['make: its one required parameter', MAKE_TOOL, { new: 'person' }, true],
    [
      'make: every declared parameter',
      MAKE_TOOL,
      { new: 'person', at: 'end', withData: 'data', withProperties: 'props' },
      true,
    ],
    ['make: the required parameter missing', MAKE_TOOL, { at: 'end' }, false],
    ['make: no arguments', MAKE_TOOL, {}, false],
    ['make: an undeclared key', MAKE_TOOL, { new: 'person', colour: 'red' }, false],
    ['make: a number where a string is declared', MAKE_TOOL, { new: 42 }, false],
    ['get: the required parameter only', GET_GADGET_TOOL, { serial: 'A1' }, true],
    ['get: the optional flag as a boolean', GET_GADGET_TOOL, { serial: 'A1', verbose: true }, true],
    ['get: the optional flag as text', GET_GADGET_TOOL, { serial: 'A1', verbose: 'yes' }, false],
    ['get: the required parameter missing', GET_GADGET_TOOL, { verbose: true }, false],
    ['get: an undeclared key', GET_GADGET_TOOL, { serial: 'A1', id: 'A1' }, false],
    ['reset: no arguments', RESET_TOOL, {}, true],
    ['reset: any key at all', RESET_TOOL, { force: true }, false],
  ]

  it.each(cases)('%s', async (_label, tool, args, admitted) => {
    expect(listingAccepts(tool, args), 'the listed schema').toBe(admitted)
    expect(await runtimeAccepts(tool, args), 'the runtime').toBe(admitted)
  })
})
