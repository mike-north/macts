/**
 * Cross-surface tests: a command marked `unsupported` has no route and appears
 * in no generated public surface. Either kind of evidence marks it: a live
 * observation that the running app cannot carry it out, or the app's
 * dictionary documenting it as a handler the app sends to a script rather
 * than one it carries out.
 *
 * The manifest keeps the command, with its evidence; route resolution
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
 * capability with that same resolved route identity, and a CLI
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
import { callableResourceCommand, callableSurfaceIssues } from '../manifest/callable-commands.js'
import { appCommandEntries, resourceCommandEntries } from './surface.js'

/** A marker with live evidence, indented to sit under a command. */
const LIVE_MARK = `    unsupported:
      evidence:
        source: live
        observedAt: '2026-11-01T16:34:20.000Z'
        bundleId: com.example.viewer
        appVersion: '2.10'
        osVersion: '27.2'
        expression: the speakers collection at the application
        errorNumber: -1728
`

/** A marker with dictionary handler evidence, indented to sit under a command. */
const HANDLER_MARK = `    unsupported:
      evidence:
        source: dictionary
        bundleId: com.example.viewer
        appVersion: '2.10'
        osVersion: '27.3'
        term: the speakers handler
        finding: handler
        statement: Handler invoked by the speakers menu when it runs a user script.
`

/** Each kind of evidence a marker can carry, with the marker and a phrase only that marker holds. */
const MARKS = [
  { kind: 'live', mark: LIVE_MARK, phrase: 'the speakers collection at the application' },
  { kind: 'dictionary handler', mark: HANDLER_MARK, phrase: 'the speakers handler' },
] as const

/**
 * A Viewer app with one resource, Speaker, and three commands: `listSpeakers`
 * and `getSpeaker` on Speaker, and the application command `openURL`. The
 * markers go on `getSpeaker` and `openURL`; `listSpeakers` stays usable.
 */
const viewerYaml = (mark: string | undefined): string => `
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
    identifiers: [{ property: id, primary: true, targeting: byId }]
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
${mark ?? ''}  openURL:
    name: openURL
    description: Open a URL
    scope: application
    parameters: [{ name: url, type: string, description: The URL }]
${mark ?? ''}`

function viewer(mark: string | undefined): AppManifest {
  return parseManifestYaml(viewerYaml(mark))
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
    capability: 'viewer.speakers.getSpeaker',
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
      expect(surfacesWith(viewer(undefined), commandKey)).toEqual(EVERY_SURFACE)
    }
  )

  describe.each(MARKS)('with $kind evidence', ({ mark, phrase }) => {
    it.each(['getSpeaker', 'openURL'] as const)(
      'appears on no generated surface when marked (%s)',
      (commandKey) => {
        expect(surfacesWith(viewer(mark), commandKey)).toEqual(new Set())
      }
    )

    it('leaves only the usable command routed', () => {
      // listSpeakers carries no marker; getSpeaker and openURL do.
      expect(resolveManifestRoutes(viewer(mark)).map((route) => route.route)).toEqual([
        'viewer.speakers.listSpeakers',
      ])
      expect(resourceCommandEntries(viewer(mark), 'Speaker').map(([key]) => key)).toEqual([
        'listSpeakers',
      ])
      expect(appCommandEntries(viewer(mark))).toEqual([])
    })

    it('is left out of the legacy SDK', () => {
      // The legacy SDK spells an application command as a method of the app class.
      const mentions = (manifest: AppManifest): boolean =>
        generateSdk(manifest, { outDir: 'out', packageName: 'legacy-viewer' }).files.some((file) =>
          file.content.includes('openURL')
        )
      expect(mentions(viewer(undefined))).toBe(true)
      expect(mentions(viewer(mark))).toBe(false)
    })

    it('stays in the embedded manifest with its marker', () => {
      const embedded = generatedFiles(viewer(mark)).get('client/src/contract/manifest.ts')
      expect(embedded).toContain('getSpeaker')
      expect(embedded).toContain(phrase)
    })
  })

  describe.each(MARKS)('in format 1.1, with $kind evidence', ({ mark }) => {
    /** The Viewer fixture under format 1.1, where callable admission also checks placement. */
    const viewer11 = (withMark: string | undefined): AppManifest =>
      parseManifestYaml(viewerYaml(withMark).replace("version: '1.0'", "version: '1.1'"))

    it('admits the get as callable when unmarked, and not when marked', () => {
      expect(callableResourceCommand(viewer11(undefined), 'Speaker', 'getSpeaker')).toBe('get')
      expect(callableResourceCommand(viewer11(mark), 'Speaker', 'getSpeaker')).toBeUndefined()
      // The usable list beside it is unchanged.
      expect(callableResourceCommand(viewer11(mark), 'Speaker', 'listSpeakers')).toBe('list')
    })

    it('reports no surface issue for a marked command, and routes only the usable one', () => {
      expect(callableSurfaceIssues(viewer11(mark))).toEqual([])
      expect(resolveManifestRoutes(viewer11(mark)).map((route) => route.route)).toEqual([
        'viewer.speakers.listSpeakers',
      ])
    })
  })
})
