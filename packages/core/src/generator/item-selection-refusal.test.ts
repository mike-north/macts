/**
 * Tests that generation refuses a manifest with a command that must select one
 * item and declares no identifier parameter to select it by.
 *
 * Such a command is a resource-scoped command other than a list or create (a
 * get, update or delete, or a command such as `show` the app sends the item
 * as its direct parameter) with no required parameter other than its
 * parent's, or a delete at application scope with no parameters (phases/13
 * D5). Every package and SDK generator refuses it before
 * it builds a file, and the capability module generator refuses it too, so no
 * generated interface takes an identifier the manifest does not declare. The
 * expected messages are written by hand from the stand-in manifests below.
 */

import { describe, expect, it } from 'vitest'
import type { AppManifest } from '../manifest/index.js'
import { generateCapabilitiesModule } from './capabilities/index.js'
import { generateCliPlugin } from './cli/index.js'
import { generateClientPackage } from './client/index.js'
import { generateSdk } from './generate.js'
import { generateConsolidatedPackages } from './orchestrate.js'
import { generateHttpClientSdk } from './sdk/index.js'
import { generateServerPackage } from './server/index.js'

/** A stand-in app with one resource, and `commands` as its only commands. */
function widgets(commands: AppManifest['commands']): AppManifest {
  return {
    version: '1.0',
    app: { name: 'Widgets', bundleId: 'com.example.widgets', tccEntitlements: [] },
    suites: [],
    resources: {
      Widget: {
        name: 'Widget',
        plural: 'Widgets',
        description: 'A widget',
        properties: {
          name: { access: 'r', type: 'string', description: 'Name', optional: false },
        },
        identifiers: [{ property: 'name', primary: true, targeting: 'byProperty' }],
      },
    },
    enums: {},
    hierarchy: { children: { widgets: { resource: 'Widget', access: 'r' } } },
    relationships: [],
    commands: {
      listWidgets: {
        name: 'list',
        description: 'List widgets',
        scope: 'resource',
        resourceType: 'Widget',
        parameters: [],
      },
      ...commands,
    },
  }
}

/** A get of one widget that declares no identifier parameter. */
const PARAMETERLESS_GET = widgets({
  getWidget: {
    name: 'get',
    description: 'Get a widget',
    scope: 'resource',
    resourceType: 'Widget',
    parameters: [],
  },
})

/**
 * A resource command that declares no identifier parameter, as Mail's `send`
 * did (#287): the app takes the item as the command's direct parameter, so
 * without an identifier no item can be sent.
 */
const PARAMETERLESS_RESOURCE_COMMAND = widgets({
  polish: {
    name: 'polish',
    description: 'Polish a widget',
    scope: 'resource',
    resourceType: 'Widget',
    parameters: [{ name: 'gloss', type: 'boolean', description: 'Gloss', required: false }],
  },
})

/** A delete at application scope that declares no parameters. */
const APPLICATION_DELETE = widgets({
  delete: { name: 'delete', description: 'Delete an object', scope: 'application', parameters: [] },
})

const GET_REFUSAL =
  'App "Widgets" cannot be generated from its manifest: its get command "getWidget" declares no identifier parameter. A get acts on one item, selected by a required parameter, so without one no item can be selected. Declare the item\'s identifier as a required parameter of "getWidget".'

const DELETE_REFUSAL =
  'App "Widgets" cannot be generated from its manifest: its application-scoped delete command "delete" declares no identifier parameter. A delete acts on one item, selected by a required parameter, so without one no item can be selected. Scope "delete" to the resource whose items it deletes and declare the item\'s identifier as a required parameter.'

const RESOURCE_COMMAND_REFUSAL =
  'App "Widgets" cannot be generated from its manifest: its resource-scoped command "polish" declares no identifier parameter. A resource-scoped command acts on one item, which the app receives as the command\'s direct parameter, selected by a required parameter, so without one no item can be selected. Declare the item\'s identifier as a required parameter of "polish", as the resource\'s get declares it.'

/** Every generator entry point, each returning the files it built and its errors. */
const ENTRY_POINTS: [string, (m: AppManifest) => { files: unknown[]; errors: string[] }][] = [
  ['generateSdk', (m) => generateSdk(m, { outDir: 'out', packageName: '@macts/widgets' })],
  ['generateHttpClientSdk', (m) => generateHttpClientSdk(m, { packageName: '@macts/widgets' })],
  [
    'generateCliPlugin',
    (m) => generateCliPlugin(m, { packageName: '@macts/widgets', sdkPackageName: '@macts/sdk' }),
  ],
  [
    'generateClientPackage',
    (m) => generateClientPackage(m, { appName: 'widgets', clientPackageName: '@macts/widgets' }),
  ],
  [
    'generateServerPackage',
    (m) =>
      generateServerPackage(m, {
        appName: 'widgets',
        serverPackageName: '@macts/widgets-server',
        clientPackageName: '@macts/widgets',
      }),
  ],
  [
    'generateConsolidatedPackages',
    (m) => {
      const result = generateConsolidatedPackages(m, { appName: 'widgets' })
      return { files: [...result.client.files, ...result.server.files], errors: result.errors }
    },
  ],
]

describe('generation refuses a command that cannot select its item', () => {
  // Guards that no generated surface takes an identifier the manifest does
  // not declare: a get with none generates nothing, and the error names the
  // app and the command and says what to declare.
  it.each(ENTRY_POINTS)('%s refuses a get with no identifier parameter', (_name, generate) => {
    const result = generate(PARAMETERLESS_GET)
    expect(result.errors).toEqual([GET_REFUSAL])
    expect(result.files).toEqual([])
  })

  // Guards the application-scoped delete with no parameters: it names no
  // item, so no package offers it.
  it.each(ENTRY_POINTS)('%s refuses an application-scoped delete with no parameters', (_n, gen) => {
    const result = gen(APPLICATION_DELETE)
    expect(result.errors).toEqual([DELETE_REFUSAL])
    expect(result.files).toEqual([])
  })

  // Regression (#287): a resource command with no identifier generated a
  // surface that sent the app no item. It generates nothing now.
  it.each(ENTRY_POINTS)('%s refuses a resource command with no identifier', (_n, gen) => {
    const result = gen(PARAMETERLESS_RESOURCE_COMMAND)
    expect(result.errors).toEqual([RESOURCE_COMMAND_REFUSAL])
    expect(result.files).toEqual([])
  })

  // Guards that the refusal is specific: the same app with its get's
  // identifier declared generates without errors.
  it.each(ENTRY_POINTS)('%s generates the app once the identifier is declared', (_n, gen) => {
    const declared = widgets({
      getWidget: {
        name: 'get',
        description: 'Get a widget',
        scope: 'resource',
        resourceType: 'Widget',
        parameters: [{ name: 'name', type: 'string', description: 'Name', required: true }],
      },
    })
    const result = gen(declared)
    expect(result.errors).toEqual([])
    expect(result.files.length).toBeGreaterThan(0)
  })

  // Guards that a resource command declaring its item's identifier is
  // generated: the refusal reaches only one that declares none.
  it.each(ENTRY_POINTS)(
    '%s generates a resource command that declares its identifier',
    (_n, gen) => {
      const declared = widgets({
        polish: {
          name: 'polish',
          description: 'Polish a widget',
          scope: 'resource',
          resourceType: 'Widget',
          parameters: [
            { name: 'name', type: 'string', description: 'Name', required: true },
            { name: 'gloss', type: 'boolean', description: 'Gloss', required: false },
          ],
        },
      })
      const result = gen(declared)
      expect(result.errors).toEqual([])
      expect(result.files.length).toBeGreaterThan(0)
    }
  )
})

describe('generateCapabilitiesModule refuses a command that cannot select its item', () => {
  // Guards that capability metadata is never emitted for a command the
  // package generators refuse: the refusal is the same text, thrown.
  it('refuses a get with no identifier parameter', () => {
    expect(() => generateCapabilitiesModule(PARAMETERLESS_GET)).toThrow(GET_REFUSAL)
  })

  it('refuses an application-scoped delete with no parameters', () => {
    expect(() => generateCapabilitiesModule(APPLICATION_DELETE)).toThrow(DELETE_REFUSAL)
  })

  it('refuses a resource command with no identifier', () => {
    expect(() => generateCapabilitiesModule(PARAMETERLESS_RESOURCE_COMMAND)).toThrow(
      RESOURCE_COMMAND_REFUSAL
    )
  })

  it('describes the app once the identifier is declared', () => {
    const declared = widgets({
      getWidget: {
        name: 'get',
        description: 'Get a widget',
        scope: 'resource',
        resourceType: 'Widget',
        parameters: [{ name: 'name', type: 'string', description: 'Name', required: true }],
      },
    })
    expect(generateCapabilitiesModule(declared)).toContain('"name": "widgets.widgets.get"')
  })
})
