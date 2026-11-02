/**
 * Cross-surface tests: a command marked `unsupported` (the running app cannot
 * carry it out, as a live observation shows) has no route and appears in no
 * generated public surface.
 *
 * The manifest keeps the command, with the live evidence; route resolution
 * and every generator leave it out: routes and the permissions derived from
 * them, capabilities, the contract, the HTTP client SDK, the CLI plugin, and
 * the legacy SDK generator. An MCP adapter names its tools from the contract's
 * operations, so a command the contract leaves out has no tool either. The embedded manifest keeps the
 * marker, so the omission stays auditable.
 *
 * Each check is run on the same fixture with and without the markers: without
 * them, both commands appear on every surface the check reads, so an absence
 * is never vacuous. Expected values are derived by hand from the fixture and
 * the naming rules: a route is `<app>.<resource segment>.<command key>` (or
 * `<app>.app.<command key>`), its permission the same with colons, a
 * capability `<app>.<resource segment>.<command name>`, and a CLI
 * command `commands/<resource segment>/<command name in kebab case>.ts`.
 *
 * @see ../manifest/unsupported.ts
 * @see ../manifest/schemas/command.ts (CommandUnsupportedSchema)
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D10)
 * @see https://github.com/mike-north/macts/issues/165
 */

import { describe, expect, it } from 'vitest'
import { deriveCapabilities } from '../capabilities/registry.js'
import { parseManifestYaml } from '../manifest/loader.js'
import { resolveManifestRoutes } from '../manifest/route.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import { listKnownPermissions } from '../permissions/suggest.js'
import { generateSdk } from './generate.js'
import { generateConsolidatedPackages } from './orchestrate.js'
import { appCommandEntries, resourceCommandEntries } from './surface.js'

/** The live evidence a marker carries, indented to sit under a command. */
const MARK = `    unsupported:
      evidence:
        source: live
        observedAt: '2026-11-01T16:34:20.000Z'
        bundleId: com.example.viewer
        appVersion: '2.10'
        osVersion: '27.2'
        expression: the speakers collection at the application
        errorNumber: -1728
`

/**
 * A Viewer app with one resource, Speaker, and three commands: `listSpeakers`
 * and `getSpeaker` on Speaker, and the application command `openURL`. The
 * markers go on `getSpeaker` and `openURL`; `listSpeakers` stays usable.
 */
const viewerYaml = (marked: boolean): string => `
version: '1.0'
app:
  name: Viewer
  bundleId: com.example.viewer
resources:
  Speaker:
    name: Speaker
    plural: Speakers
    description: A speaker
    properties:
      id: { access: r, type: string, description: The identifier }
    identifiers: [{ property: id, primary: true }]
hierarchy:
  children:
    speakers: { resource: Speaker, access: r }
commands:
  listSpeakers: { name: list, description: List speakers, scope: resource, resourceType: Speaker }
  getSpeaker:
    name: get
    description: Get a speaker
    scope: resource
    resourceType: Speaker
    parameters: [{ name: id, type: string, description: The speaker }]
${marked ? MARK : ''}  openURL:
    name: openURL
    description: Open a URL
    scope: application
    parameters: [{ name: url, type: string, description: The URL }]
${marked ? MARK : ''}`

function viewer(marked: boolean): AppManifest {
  return parseManifestYaml(viewerYaml(marked))
}

/** Every generated file of the shipped package pair, by path. */
function generatedFiles(manifest: AppManifest): Map<string, string> {
  const result = generateConsolidatedPackages(manifest, { appName: 'viewer' })
  expect(result.errors).toEqual([])
  return new Map([
    ...result.client.files.map((file) => [`client/${file.path}`, file.content] as const),
    ...result.server.files.map((file) => [`server/${file.path}`, file.content] as const),
  ])
}

/** What each marked command is called on each surface, from the naming rules. */
const NAMES = {
  getSpeaker: {
    route: 'viewer.speakers.getSpeaker',
    permission: 'viewer:speakers:getSpeaker',
    capability: 'viewer.speakers.get',
    // The resource client builds its route from its app and resource segments.
    sdkFile: 'client/src/resources/speaker.ts',
    sdkCall: '.getSpeaker`',
    cliPath: 'client/src/cli/commands/speakers/get.ts',
  },
  openURL: {
    route: 'viewer.app.openURL',
    permission: 'viewer:app:openURL',
    capability: 'viewer.app.openURL',
    // The client root calls an application command by its route literal.
    sdkFile: 'client/src/client.ts',
    sdkCall: "'viewer.app.openURL'",
    cliPath: 'client/src/cli/commands/open-url.ts',
  },
} as const

/** The surfaces on which a command appears, each read from what it generates or resolves. */
function surfacesWith(manifest: AppManifest, commandKey: keyof typeof NAMES): Set<string> {
  const names = NAMES[commandKey]
  const surfaces = new Set<string>()
  if (resolveManifestRoutes(manifest).some((route) => route.commandKey === commandKey)) {
    surfaces.add('routes')
  }
  if (listKnownPermissions(manifest).includes(names.permission)) surfaces.add('permissions')
  if (deriveCapabilities(manifest).some((capability) => capability.name === names.capability)) {
    surfaces.add('capabilities')
  }
  const files = generatedFiles(manifest)
  // The route literal is what the contract and the SDK call the operation by.
  if (files.get('client/src/contract/index.ts')?.includes(`'${names.route}'`) === true) {
    surfaces.add('contract')
  }
  if (files.get(names.sdkFile)?.includes(names.sdkCall) === true) surfaces.add('SDK')
  if (files.has(names.cliPath)) surfaces.add('CLI')
  return surfaces
}

const EVERY_SURFACE = new Set(['routes', 'permissions', 'capabilities', 'contract', 'SDK', 'CLI'])

describe('a command marked unsupported', () => {
  it.each(['getSpeaker', 'openURL'] as const)(
    'appears on every surface when unmarked (%s: the checks are not vacuous)',
    (commandKey) => {
      expect(surfacesWith(viewer(false), commandKey)).toEqual(EVERY_SURFACE)
    }
  )

  it.each(['getSpeaker', 'openURL'] as const)(
    'appears on no generated surface when marked (%s)',
    (commandKey) => {
      expect(surfacesWith(viewer(true), commandKey)).toEqual(new Set())
    }
  )

  it('leaves only the usable command routed', () => {
    // listSpeakers carries no marker; getSpeaker and openURL do.
    expect(resolveManifestRoutes(viewer(true)).map((route) => route.route)).toEqual([
      'viewer.speakers.listSpeakers',
    ])
    expect(resourceCommandEntries(viewer(true), 'Speaker').map(([key]) => key)).toEqual([
      'listSpeakers',
    ])
    expect(appCommandEntries(viewer(true))).toEqual([])
  })

  it('is left out of the legacy SDK', () => {
    // The legacy SDK spells an application command as a method of the app class.
    const mentions = (manifest: AppManifest): boolean =>
      generateSdk(manifest, { outDir: 'out', packageName: 'legacy-viewer' }).files.some((file) =>
        file.content.includes('openURL')
      )
    expect(mentions(viewer(false))).toBe(true)
    expect(mentions(viewer(true))).toBe(false)
  })

  it('stays in the embedded manifest with its marker', () => {
    const embedded = generatedFiles(viewer(true)).get('client/src/contract/manifest.ts')
    expect(embedded).toContain('getSpeaker')
    expect(embedded).toContain('the speakers collection at the application')
  })
})
