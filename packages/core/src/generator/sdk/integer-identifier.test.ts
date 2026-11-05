/**
 * The generated legacy HTTP client sends a get's integer identifier in the
 * contract's wire form (#207).
 *
 * An operation whose identifier parameter is declared `integer` admits it
 * only as `{ <name>: { integer: "<digits>" } }` (phases/13 D3: an integer
 * travels as canonical decimal text). The client method takes the text a CLI
 * passes or a number alike, so the request body converts it with `String()`.
 * An identifier of any other type is sent as given. A parent's identifier
 * follows the same rule, and so does every other integer input the client
 * sends: a delete's identifier, and a command's parameters, a resource
 * command's item identifier included. An optional integer is sent only when
 * it is supplied.
 *
 * Expected text is written by hand from that wire form.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D3)
 * @see https://github.com/mike-north/macts/issues/207
 */

import { describe, expect, it } from 'vitest'
import type { AppManifest, CommandParameter } from '../../manifest/index.js'
import { generateHttpClientSdk } from './http-client.js'

/** A required parameter of `type`, as a get declares its identifiers. */
function identifier(name: string, type: 'integer' | 'string'): CommandParameter {
  return { name, type, description: 'Id', required: true }
}

/**
 * A manifest whose `Gadget` is got by `parameters`, the last of which is the
 * gadget's identifier, of `gadgetType`. With a `parent`, the gadget is got
 * within its `Rack`, by the parent parameter named there.
 */
function manifestWithGet(
  parameters: readonly CommandParameter[],
  gadgetType: 'integer' | 'string',
  parent?: { readonly parameter: string }
): AppManifest {
  const gadgetIdentifier = parameters[parameters.length - 1]
  if (gadgetIdentifier === undefined) throw new Error('a get needs an identifier')
  return {
    version: '1.0',
    app: { name: 'TestApp', bundleId: 'com.test.app', tccEntitlements: ['automation'] },
    resources: {
      Rack: {
        name: 'Rack',
        plural: 'Racks',
        description: 'A rack',
        properties: {
          id: { access: 'r', type: 'integer', description: 'Id', optional: false, code: 'ID  ' },
        },
        identifiers: [{ property: 'id', primary: true }],
      },
      Gadget: {
        name: 'Gadget',
        plural: 'Gadgets',
        description: 'A gadget',
        properties: {
          [gadgetIdentifier.name]: {
            access: 'r',
            type: gadgetType,
            description: 'Id',
            optional: false,
            code: 'ID  ',
          },
        },
        identifiers: [{ property: gadgetIdentifier.name, primary: true }],
      },
    },
    enums: {},
    hierarchy: {
      children: {
        racks: {
          resource: 'Rack',
          access: 'r',
          children: { gadgets: { resource: 'Gadget', access: 'r' } },
        },
        ...(parent === undefined ? { gadgets: { resource: 'Gadget', access: 'r' } } : {}),
      },
    },
    commands: {
      get: {
        name: 'get',
        description: 'Get a gadget',
        scope: 'resource',
        resourceType: 'Gadget',
        ...(parent === undefined
          ? {}
          : { parent: { resource: 'Rack', parameter: parent.parameter } }),
        parameters: [...parameters],
      },
    },
    suites: [],
    relationships: [],
  }
}

/** The generated Gadget resource client's source. */
function gadgetClient(manifest: AppManifest): string {
  const file = generateHttpClientSdk(manifest, { packageName: '@macts/test' }).files.find(
    (f) => f.path === 'src/resources/gadget.ts'
  )
  if (file === undefined) throw new Error('no gadget client generated')
  return file.content
}

describe('legacy resource client get identifier encoding (#207)', () => {
  // Bug #207: the client sent `{ windowId }`, the caller's text, which the
  // contract's input rejects for an integer.
  it('sends an integer identifier in its integer wire form, under the parameter’s own name', () => {
    const text = gadgetClient(manifestWithGet([identifier('windowId', 'integer')], 'integer'))
    expect(text).toContain('async get(windowId: string | number): Promise<Gadget>')
    expect(text).toContain('{ windowId: { integer: String(windowId) } }')
    expect(text).not.toContain('{ windowId }')
  })

  it('sends a string identifier as given', () => {
    const text = gadgetClient(manifestWithGet([identifier('id', 'string')], 'string'))
    expect(text).toContain('async get(id: string): Promise<Gadget>')
    expect(text).toContain('.get`, { id });')
    expect(text).not.toContain('integer')
  })

  // A parent identifier is part of the same input, so an integer one is
  // encoded the same way, and a string one beside it is not.
  it('encodes each integer identifier of a get within a parent, and only those', () => {
    const text = gadgetClient(
      manifestWithGet([identifier('rackId', 'integer'), identifier('name', 'string')], 'string', {
        parameter: 'rackId',
      })
    )
    expect(text).toContain('async get(rackId: string | number, name: string): Promise<Gadget>')
    expect(text).toContain('{ rackId: { integer: String(rackId) }, name });')
  })
})

/**
 * {@link manifestWithGet} with a gadget keyed by an integer `id`, plus a
 * delete and a resource command, `stamp`, that selects its gadget by that
 * `id` and declares an optional integer `copies` and an optional string
 * `note`.
 */
function manifestWithCommands(): AppManifest {
  const base = manifestWithGet([identifier('id', 'integer')], 'integer')
  return {
    ...base,
    commands: {
      ...base.commands,
      delete: {
        name: 'delete',
        description: 'Delete a gadget',
        scope: 'resource',
        resourceType: 'Gadget',
        parameters: [identifier('id', 'integer')],
      },
      stamp: {
        name: 'stamp',
        description: 'Stamp a gadget',
        scope: 'resource',
        resourceType: 'Gadget',
        parameters: [
          identifier('id', 'integer'),
          { name: 'copies', type: 'integer', description: 'How many', required: false },
          { name: 'note', type: 'string', description: 'A note', required: false },
        ],
      },
    },
  }
}

describe('legacy resource client command and delete integer encoding (#207)', () => {
  const text = gadgetClient(manifestWithCommands())

  // The same bug class as the get: a resource command's integer item
  // identifier was sent as the caller's text, `{ id }`.
  it("sends a resource command's integer item identifier in its integer wire form", () => {
    expect(text).toContain('async stamp(id: number, copies?: number, note?: string): Promise<void>')
    expect(text).toContain('.stamp`, { id: { integer: String(id) }, ')
  })

  // An absent optional integer must send no field: its wire form would be
  // `{ integer: "undefined" }`, which the input rejects. An optional string
  // is sent as given, and JSON leaves it out when absent.
  it('sends an optional integer parameter only when it is supplied, and a string as given', () => {
    expect(text).toContain(
      '...(copies === undefined ? {} : { copies: { integer: String(copies) } }), note });'
    )
  })

  it("sends a delete's integer identifier in its integer wire form", () => {
    expect(text).toContain('async delete(id: string | number): Promise<void>')
    expect(text).toContain('.delete`, { id: { integer: String(id) } });')
  })
})
