/**
 * Tests that generation refuses a manifest with a resource whose primary
 * identifier declares no targeting and is not the class's dictionary id.
 *
 * An identifier with no targeting is looked up with the app's id specifier
 * (`byId`), which is valid only for the class's dictionary id, code `ID  `
 * (phases/13 D10, "Identifier targeting"). Every package and SDK generator
 * refuses any other untargeted identifier before it builds a file, and the
 * capability module generator refuses it too, so no generated surface looks
 * an item up by an id specifier that cannot find it. The expected messages are
 * written by hand from the stand-in manifests below.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10
 */

import { describe, expect, it } from 'vitest'
import type { AppManifest, Identifier, Property } from '../manifest/index.js'
import { generateCapabilitiesModule } from './capabilities/index.js'
import { generateCliPlugin } from './cli/index.js'
import { generateClientPackage } from './client/index.js'
import { generateSdk } from './generate.js'
import { generateConsolidatedPackages } from './orchestrate.js'
import { generateHttpClientSdk } from './sdk/index.js'
import { generateServerPackage } from './server/index.js'

/**
 * A stand-in app whose one resource, a document, is identified by
 * `identifier` and has the properties `properties`, with a list and a get by
 * its identifier.
 */
function notebook(identifier: Identifier, properties: Record<string, Property>): AppManifest {
  return {
    version: '1.0',
    app: { name: 'Notebook', bundleId: 'com.example.notebook', tccEntitlements: [] },
    suites: [],
    resources: {
      Document: {
        name: 'Document',
        plural: 'Documents',
        description: 'A document',
        properties,
        identifiers: [identifier],
      },
    },
    enums: {},
    hierarchy: { children: { documents: { resource: 'Document', access: 'r' } } },
    relationships: [],
    commands: {
      listDocuments: {
        name: 'list',
        description: 'List documents',
        scope: 'resource',
        resourceType: 'Document',
        parameters: [],
      },
      getDocument: {
        name: 'get',
        description: 'Get a document',
        scope: 'resource',
        resourceType: 'Document',
        parameters: [
          { name: identifier.property, type: 'string', description: 'Id', required: true },
        ],
      },
    },
  }
}

const NAME: Property = {
  access: 'r',
  type: 'string',
  description: 'Its name',
  optional: false,
  code: 'pnam',
}
const DICTIONARY_ID: Property = {
  access: 'r',
  type: 'string',
  description: 'Its id',
  optional: false,
  code: 'ID  ',
}

/** A document identified by its name, with no targeting, as TextEdit's was. */
const UNTARGETED_NAME = notebook({ property: 'name', primary: true }, { name: NAME })

const REFUSAL =
  'App "Notebook" cannot be generated from its manifest: its resource "Document" is identified by "name" (code "pnam"), which is not the class\'s dictionary id, code ID, and declares no targeting. An identifier with no targeting is looked up with the app\'s id specifier (byId), which is valid only for the class\'s dictionary id, code ID. Declare the targeting of "Document"\'s identifier "name": byProperty to match on it, or byKey to look it up with its collection\'s key specifier.'

/** The manifests generation accepts: a targeted name, and the dictionary id under another name. */
const ACCEPTED: [string, AppManifest][] = [
  [
    'a name targeted byProperty',
    notebook({ property: 'name', primary: true, targeting: 'byProperty' }, { name: NAME }),
  ],
  [
    'an untargeted code ID property named uid',
    notebook({ property: 'uid', primary: true }, { uid: DICTIONARY_ID, name: NAME }),
  ],
]

/** Every generator entry point, each returning the files it built and its errors. */
const ENTRY_POINTS: [string, (m: AppManifest) => { files: unknown[]; errors: string[] }][] = [
  ['generateSdk', (m) => generateSdk(m, { outDir: 'out', packageName: '@macts/notebook' })],
  ['generateHttpClientSdk', (m) => generateHttpClientSdk(m, { packageName: '@macts/notebook' })],
  [
    'generateCliPlugin',
    (m) => generateCliPlugin(m, { packageName: '@macts/notebook', sdkPackageName: '@macts/sdk' }),
  ],
  [
    'generateClientPackage',
    (m) => generateClientPackage(m, { appName: 'notebook', clientPackageName: '@macts/notebook' }),
  ],
  [
    'generateServerPackage',
    (m) =>
      generateServerPackage(m, {
        appName: 'notebook',
        serverPackageName: '@macts/notebook-server',
        clientPackageName: '@macts/notebook',
      }),
  ],
  [
    'generateConsolidatedPackages',
    (m) => {
      const result = generateConsolidatedPackages(m, { appName: 'notebook' })
      return { files: [...result.client.files, ...result.server.files], errors: result.errors }
    },
  ],
]

describe('generation refuses an untargeted identifier that is not the dictionary id', () => {
  // Guards that no generated surface looks an item up by `byId(name)`: the
  // manifest generates nothing, and the error names the app, the resource and
  // the property and states the rule.
  it.each(ENTRY_POINTS)('%s refuses an untargeted name', (_name, generate) => {
    const result = generate(UNTARGETED_NAME)
    expect(result.errors).toEqual([REFUSAL])
    expect(result.files).toEqual([])
  })

  // Guards that the refusal is specific: a declared targeting, or the
  // dictionary id under any name, generates without errors.
  describe.each(ACCEPTED)('accepts %s', (_label, manifest) => {
    it.each(ENTRY_POINTS)('%s generates the app', (_name, generate) => {
      const result = generate(manifest)
      expect(result.errors).toEqual([])
      expect(result.files.length).toBeGreaterThan(0)
    })
  })
})

describe('generateCapabilitiesModule refuses an untargeted identifier', () => {
  // Guards that capability metadata is never emitted for a manifest the
  // package generators refuse: the refusal is the same text, thrown.
  it('refuses an untargeted name', () => {
    expect(() => generateCapabilitiesModule(UNTARGETED_NAME)).toThrow(REFUSAL)
  })

  it.each(ACCEPTED)('describes the app for %s', (_label, manifest) => {
    expect(generateCapabilitiesModule(manifest)).toContain('"name": "notebook.documents.get"')
  })
})
