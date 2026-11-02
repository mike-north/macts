/**
 * The generated resource client sends an integer identifier in the contract's
 * wire form.
 *
 * An operation whose identifier parameter is declared `integer` accepts only
 * `{ <name>: { integer: "<digits>" } }` (phases/13 D3: integers travel as
 * canonical decimal text). The client method takes what a CLI passes (a
 * string) or a number alike, so the request body converts it with `String()`.
 * An identifier of any other type is sent as given.
 *
 * Expected text is written by hand from that wire form.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D3)
 * @see https://github.com/mike-north/macts/issues/207
 */

import { describe, expect, it } from 'vitest'
import type { AppManifest } from '../../manifest/index.js'
import { generateHttpClientSdk } from './http-client.js'

/** A manifest with a get on `Gadget` keyed by a parameter of `identifierType`. */
function manifestWithGet(identifierType: 'integer' | 'string', parameter: string): AppManifest {
  return {
    version: '1.0',
    app: { name: 'TestApp', bundleId: 'com.test.app', tccEntitlements: ['automation'] },
    resources: {
      Gadget: {
        name: 'Gadget',
        plural: 'Gadgets',
        description: 'A gadget',
        properties: {
          [parameter]: { access: 'r', type: identifierType, description: 'Id', optional: false },
        },
        identifiers: [{ property: parameter, primary: true }],
      },
    },
    enums: {},
    hierarchy: { children: { gadgets: { resource: 'Gadget', access: 'r' } } },
    commands: {
      get: {
        name: 'get',
        description: 'Get a gadget',
        scope: 'resource',
        resourceType: 'Gadget',
        parameters: [{ name: parameter, type: identifierType, description: 'Id', required: true }],
      },
    },
    suites: [],
    relationships: [],
  }
}

function gadgetClient(manifest: AppManifest): string {
  const file = generateHttpClientSdk(manifest, { packageName: '@macts/test' }).files.find(
    (f) => f.path === 'src/resources/gadget.ts'
  )
  if (file === undefined) throw new Error('no gadget client generated')
  return file.content
}

describe('legacy resource client identifier encoding (#207)', () => {
  it('sends an integer identifier as its integer wire form, under the parameter’s own name', () => {
    const text = gadgetClient(manifestWithGet('integer', 'windowId'))
    expect(text).toContain('async get(windowId: string | number): Promise<Gadget>')
    expect(text).toContain('{ windowId: { integer: String(windowId) } }')
    expect(text).not.toContain('{ windowId }')
  })

  it('sends a string identifier as given', () => {
    const text = gadgetClient(manifestWithGet('string', 'id'))
    expect(text).toContain('async get(id: string): Promise<Gadget>')
    expect(text).toContain('.get`, { id });')
    expect(text).not.toContain('integer')
  })
})
