/**
 * Cross-surface tests: a resource marked `unsupported` (its collection is not
 * in the app's dictionary) appears in no generated public surface.
 *
 * The manifest keeps the resource, with the dictionary evidence; route
 * resolution and every generator leave out the resource, its hierarchy
 * entries, and every entry nested under them: routes and the permissions
 * derived from them, the contract, the HTTP client SDK (types, resource
 * clients, client accessors), the CLI plugin, the MCP tools, the
 * capabilities, and the legacy SDK generator. The embedded manifest keeps the
 * marker, so the omission stays auditable.
 *
 * Each check is run on the same fixture with and without the marker: without
 * it, the resource appears on every surface the check reads, so an absence is
 * never vacuous. Expected values are derived by hand from the fixture below.
 *
 * @see ../manifest/unsupported.ts
 * @see ../manifest/schemas/resource.ts (ResourceUnsupportedSchema)
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D10)
 * @see https://github.com/mike-north/macts/issues/165
 */

import { describe, expect, it } from 'vitest'
import { deriveCapabilities } from '../capabilities/registry.js'
import { parseManifestYaml } from '../manifest/loader.js'
import { resolveManifestRoutes } from '../manifest/route.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import { listKnownPermissions } from '../permissions/suggest.js'
import { CONTRACT_MODULE_PATH, generateContract } from './contract/index.js'
import { generateSdk } from './generate.js'
import { generateHttpClientSdk } from './sdk/http-client.js'
import { generateConsolidatedPackages } from './orchestrate.js'
import { createInputFields, resourceCommandEntries, resourceHasOperations } from './surface.js'
import { generatedFieldLists } from './test-support/surface-fields.js'

/** Where the marker goes: directly under the Connection resource's description. */
const MARK_ANCHOR = '    description: A screen sharing connection\n'

const MARK = `    unsupported:
      evidence:
        source: dictionary
        bundleId: com.example.viewer
        appVersion: '7.1'
        osVersion: '27.2'
        term: connection
        finding: no-class
`

/**
 * A Viewer app with three resources:
 *
 * - `Speaker`, top-level, with list and get;
 * - `Connection`, top-level, with list, get and create, and a writable
 *   `label`: the resource the dictionary does not have;
 * - `Session`, which the hierarchy nests only under `connections`, with its
 *   own list.
 *
 * `close` names no resource type, so it applies to every resource; `refresh`
 * names Speaker and Connection.
 */
const VIEWER_YAML = `
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
      name: { access: rw, type: string, description: The name }
    identifiers: [{ property: id, primary: true }]
  Connection:
    name: Connection
    plural: Connections
    description: A screen sharing connection
    properties:
      id: { access: r, type: string, description: The identifier }
      label: { access: rw, type: string, description: The label }
    identifiers: [{ property: id, primary: true }]
  Session:
    name: Session
    plural: Sessions
    description: A session
    properties:
      id: { access: r, type: string, description: The identifier }
    identifiers: [{ property: id, primary: true }]
hierarchy:
  children:
    speakers: { resource: Speaker, access: r }
    connections:
      resource: Connection
      access: rw
      children:
        sessions: { resource: Session, access: r }
commands:
  listSpeakers: { name: list, description: List speakers, scope: resource, resourceType: Speaker }
  getSpeaker:
    name: get
    description: Get a speaker
    scope: resource
    resourceType: Speaker
    parameters: [{ name: id, type: string, description: The speaker }]
  listConnections: { name: list, description: List connections, scope: resource, resourceType: Connection }
  getConnection:
    name: get
    description: Get a connection
    scope: resource
    resourceType: Connection
    parameters: [{ name: id, type: string, description: The connection }]
  createConnection:
    name: create
    description: Create a connection
    scope: resource
    resourceType: Connection
    parameters: [{ name: label, type: string, description: The label }]
  listSessions:
    name: list
    description: List sessions
    scope: resource
    resourceType: Session
    parameters: [{ name: connectionId, type: string, description: The connection }]
  refresh:
    name: refresh
    description: Refresh
    scope: resource
    resourceType: [Speaker, Connection]
  close: { name: close, description: Close, scope: resource }
  openURL:
    name: openURL
    description: Open a URL
    scope: application
    parameters: [{ name: url, type: string, description: The URL }]
`

function viewer(marked: boolean): AppManifest {
  const text = marked ? VIEWER_YAML.replace(MARK_ANCHOR, MARK_ANCHOR + MARK) : VIEWER_YAML
  if (marked && !text.includes('finding: no-class')) throw new Error('the marker was not placed')
  return parseManifestYaml(text)
}

/** Every generated file of the shipped package pair, by path. */
function generatedFiles(manifest: AppManifest): Map<string, string> {
  const result = generateConsolidatedPackages(manifest, { appName: 'viewer' })
  expect(result.errors).toEqual([])
  return new Map(
    [
      ...result.client.files.map((file) => [`client/${file.path}`, file.content] as const),
      ...result.server.files.map((file) => [`server/${file.path}`, file.content] as const),
    ].map(([path, content]) => [path, content])
  )
}

/**
 * The surfaces on which the Connection resource appears, each read from what
 * that surface generates or resolves.
 */
function surfacesWithConnection(manifest: AppManifest): Set<string> {
  const surfaces = new Set<string>()
  if (resolveManifestRoutes(manifest).some((route) => route.resourceType === 'Connection')) {
    surfaces.add('routes')
  }
  if (listKnownPermissions(manifest).some((p) => p.startsWith('viewer:connections:'))) {
    surfaces.add('permissions')
  }
  // A surface lists the resource's fields only when it generates them.
  for (const list of generatedFieldLists(manifest)) {
    if (list.resourceKey === 'Connection' && list.fields.length > 0) {
      surfaces.add(list.surface.split(' ')[0] ?? list.surface)
    }
  }
  const files = generatedFiles(manifest)
  const paths = [...files.keys()]
  if (paths.some((path) => path.endsWith('src/resources/connection.ts'))) {
    surfaces.add('SDK resource client')
  }
  if (files.get('client/src/client.ts')?.includes('readonly connections:') === true) {
    surfaces.add('SDK client accessor')
  }
  if (paths.some((path) => path.includes('commands/connections/'))) surfaces.add('CLI commands')
  if ([...files.values()].some((content) => content.includes("'macts__viewer__connections_"))) {
    surfaces.add('MCP tools')
  }
  if (deriveCapabilities(manifest).some((capability) => capability.resource === 'connections')) {
    surfaces.add('capabilities')
  }
  const legacy = generateSdk(manifest, { outDir: 'out', packageName: 'legacy-viewer' })
  if (legacy.files.some((file) => file.path.includes('Connection'))) surfaces.add('legacy SDK')
  return surfaces
}

describe('a resource marked unsupported', () => {
  it('appears on every surface when unmarked (the checks are not vacuous)', () => {
    expect(surfacesWithConnection(viewer(false))).toEqual(
      new Set([
        'routes',
        'permissions',
        'contract',
        'SDK',
        'MCP',
        'capability',
        'create',
        'CLI',
        'SDK resource client',
        'SDK client accessor',
        'CLI commands',
        'MCP tools',
        'capabilities',
        'legacy SDK',
      ])
    )
  })

  it('appears on no generated surface when marked', () => {
    expect(surfacesWithConnection(viewer(true))).toEqual(new Set())
  })

  it('has no route from a command naming it, from a list of types, or applying to all', () => {
    // refresh names Speaker and Connection; close applies to every resource.
    const routes = resolveManifestRoutes(viewer(true)).map((route) => route.route)
    expect(routes).toEqual([
      'viewer.speakers.listSpeakers',
      'viewer.speakers.getSpeaker',
      'viewer.sessions.listSessions',
      'viewer.speakers.refresh',
      'viewer.speakers.close',
      'viewer.sessions.close',
      'viewer.app.openURL',
    ])
    expect(listKnownPermissions(viewer(true))).not.toContain('viewer:connections:*')
  })

  it('has no commands, operations, or create input in the shared client surface', () => {
    const manifest = viewer(true)
    expect(resourceCommandEntries(manifest, 'Connection')).toEqual([])
    expect(resourceHasOperations(manifest, 'Connection')).toBe(false)
    expect([...createInputFields(manifest, 'Connection').keys()]).toEqual([])
    // Unmarked, the create input is the writable label and the create parameter.
    expect([...createInputFields(viewer(false), 'Connection').keys()]).toEqual(['label'])
  })

  it('takes the hierarchy entries nested under it out of the CLI, but not their resource', () => {
    const marked = [...generatedFiles(viewer(true)).keys()]
    const unmarked = [...generatedFiles(viewer(false)).keys()]
    // Sessions are reached only through connections in the hierarchy.
    expect(unmarked.some((path) => path.includes('commands/connections/sessions/'))).toBe(true)
    expect(marked.some((path) => path.includes('sessions/'))).toBe(false)
    // Session itself is supported: it keeps its routes and SDK client.
    expect(marked.some((path) => path.endsWith('src/resources/session.ts'))).toBe(true)
    expect(resolveManifestRoutes(viewer(true)).some((r) => r.resourceType === 'Session')).toBe(true)
  })

  it('keeps the other resources on every surface', () => {
    const files = generatedFiles(viewer(true))
    expect(files.get('client/src/client.ts')).toContain('readonly speakers:')
    expect([...files.keys()].some((path) => path.includes('commands/speakers/'))).toBe(true)
    expect(deriveCapabilities(viewer(true)).map((capability) => capability.name)).toEqual([
      'viewer.app.openURL',
      'viewer.sessions.close',
      'viewer.sessions.list',
      'viewer.speakers.close',
      'viewer.speakers.get',
      'viewer.speakers.list',
      'viewer.speakers.refresh',
    ])
  })

  it('leaves no unused import in a contract or SDK whose every resource is marked', () => {
    // Regression: Screen Sharing and Console mark their only resource, so their
    // contracts declare no record value type and their SDK types no schema;
    // importing ValueType or zod anyway failed the generated package's type
    // check (TS6133).
    const onlyMarked = parseManifestYaml(`
version: '1.0'
app: { name: Viewer, bundleId: com.example.viewer }
resources:
  Connection:
    name: Connection
    plural: Connections
    description: A screen sharing connection
${MARK}hierarchy: { children: {} }
commands:
  openURL: { name: openURL, description: Open a URL, scope: application }
`)
    // The SDK types likewise import zod only for the schemas they declare.
    const sdkTypes = generateHttpClientSdk(onlyMarked, { packageName: 'viewer' }).files.find(
      (file) => file.path === 'src/types.ts'
    )?.content
    expect(sdkTypes).toBeDefined()
    expect(sdkTypes).not.toContain('zod')
    expect(
      generateHttpClientSdk(viewer(true), { packageName: 'viewer' }).files.find(
        (file) => file.path === 'src/types.ts'
      )?.content
    ).toContain('import { z } from "zod";')
    const contract = generateContract(onlyMarked)
    const index = contract.files.find((file) => file.path === CONTRACT_MODULE_PATH)?.content
    expect(index).toBeDefined()
    expect(index).not.toMatch(/\bValueType\b/)
    // With a usable resource, the record value type uses it.
    const withRecord = generateContract(viewer(true)).files.find(
      (file) => file.path === CONTRACT_MODULE_PATH
    )?.content
    expect(withRecord).toContain('type ValueType,')
  })

  it('stays in the embedded manifest with its marker', () => {
    const embedded = generatedFiles(viewer(true)).get('client/src/contract/manifest.ts')
    expect(embedded).toContain('Connection')
    expect(embedded).toContain('no-class')
  })
})
