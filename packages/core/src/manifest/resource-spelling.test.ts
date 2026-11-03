/**
 * Guard: every public surface spells a resource the same way.
 *
 * A resource's segment, the lower camel case of its plural (`MediaItems` →
 * `mediaItems`), names it in the route and operation id
 * (`photos.mediaItems.list`), the SDK accessor of the HTTP client and of the
 * contract (`photos.mediaItems`), the contract's reference table and operation
 * descriptors, the MCP tool name (which MCP adapters derive from a
 * descriptor's id), the capability, and the scope of a derived permission
 * (`photos:mediaItems:list`). A caller can then carry one name from any of
 * them to the others; a surface that spells it differently breaks that.
 *
 * This suite reads each spelling from what the generators really produce (the
 * generated HTTP client and contract modules, parsed as syntax; the
 * capabilities as data; the routes and permissions from the resolver) and
 * fails when two surfaces disagree for any resource of any shipped manifest.
 * Each spelling is also checked against the segment of the resource's own
 * plural (`normalizeResourceRouteSegment`), and the spellings of a few
 * resources are pinned by hand, so a change to the one shared rule cannot
 * pass unnoticed. Only a
 * resource with operations reaches these surfaces.
 *
 * The CLI's command path is not one of these surfaces: it follows the
 * manifest's hierarchy keys, which name containment relationships (Spotify's
 * `currentTrack`), not the resource.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D2
 * @see https://github.com/mike-north/macts/issues/154
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import * as ts from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'
import { deriveCapabilities } from '../capabilities/registry.js'
import { generateCliPlugin } from '../generator/cli/index.js'
import { CONTRACT_MODULE_PATH, generateContract } from '../generator/contract/index.js'
import { generateHttpClientSdk } from '../generator/sdk/http-client.js'
import { loadManifest } from './loader.js'
import {
  normalizeAppRouteSegment,
  normalizeResourceRouteSegment,
  resolveManifestRoutes,
} from './route.js'
import type { AppManifest } from './schemas/index.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

let manifests: { dir: string; manifest: AppManifest }[] = []

beforeAll(async () => {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => ({
        dir: entry.name,
        manifest: await loadManifest(resolve(MANIFESTS_DIR, entry.name, 'app.yaml')),
      }))
  )
})

/** One surface's spelling of one resource. */
interface Spelling {
  readonly surface: string
  readonly resourceKey: string
  readonly spelling: string
}

function parse(path: string, content: string): ts.SourceFile {
  return ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

/** Visit every node of a source file. */
function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node)
  ts.forEachChild(node, (child) => {
    walk(child, visit)
  })
}

/** The resource key a `<Key>ResourceClient` type or class name names. */
function resourceClientKey(name: string): string | undefined {
  return /^(\w+)ResourceClient$/.exec(name)?.[1]
}

/** The resource segment of an operation id `app.resource.operation`. */
function routeSegment(route: string): string {
  return route.split('.')[1] ?? ''
}

/**
 * Each `readonly <accessor>: <Key>ResourceClient` member of an interface or
 * class, as the accessor the client exposes for the resource `Key`.
 */
function accessorMembers(source: ts.SourceFile, surface: string): Spelling[] {
  const found: Spelling[] = []
  walk(source, (node) => {
    if (!ts.isPropertySignature(node) && !ts.isPropertyDeclaration(node)) return
    const type = node.type
    if (type === undefined || !ts.isTypeReferenceNode(type) || !ts.isIdentifier(type.typeName))
      return
    const resourceKey = resourceClientKey(type.typeName.text)
    if (resourceKey === undefined || !ts.isIdentifier(node.name)) return
    found.push({ surface, resourceKey, spelling: node.name.text })
  })
  return found
}

/** The legacy HTTP client: each resource accessor and the route segment it calls. */
function httpClientSpellings(manifest: AppManifest): Spelling[] {
  const sdk = generateHttpClientSdk(manifest, { packageName: 'sdk-spelling' })
  const content = sdk.files.find((file) => file.path === 'src/client.ts')?.content
  if (content === undefined) throw new Error('the HTTP client has no client module')
  const source = parse('src/client.ts', content)
  const found = accessorMembers(source, 'HTTP client accessor')
  // `new <Key>ResourceClient(http, '<app>', '<segment>')`: the segment the
  // resource client puts in every route it calls.
  walk(source, (node) => {
    if (!ts.isNewExpression(node) || !ts.isIdentifier(node.expression)) return
    const resourceKey = resourceClientKey(node.expression.text)
    const segment = node.arguments?.[2]
    if (resourceKey === undefined || segment === undefined || !ts.isStringLiteral(segment)) return
    found.push({ surface: 'HTTP client route segment', resourceKey, spelling: segment.text })
  })
  return found
}

/**
 * The contract: each accessor of the client interface, and the operation ids
 * its reference table resolves each resource with.
 */
function contractSpellings(manifest: AppManifest): Spelling[] {
  const content = generateContract(manifest).files.find(
    (file) => file.path === CONTRACT_MODULE_PATH
  )?.content
  if (content === undefined) throw new Error('the contract has no contract module')
  const source = parse(CONTRACT_MODULE_PATH, content)
  const found = accessorMembers(source, 'contract accessor')
  // `const resources = { <Key>: { …, get: '<id>', list: '<id>' } } satisfies <App>Resources`
  walk(source, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) return
    if (node.name.text !== 'resources' || node.initializer === undefined) return
    const table = withoutTypeAssertions(node.initializer)
    if (!ts.isObjectLiteralExpression(table)) return
    for (const entry of table.properties) {
      if (!ts.isPropertyAssignment(entry) || !ts.isObjectLiteralExpression(entry.initializer))
        continue
      const resourceKey = ts.isIdentifier(entry.name) ? entry.name.text : undefined
      if (resourceKey === undefined) continue
      for (const member of entry.initializer.properties) {
        if (
          ts.isPropertyAssignment(member) &&
          ts.isIdentifier(member.name) &&
          (member.name.text === 'get' || member.name.text === 'list') &&
          ts.isStringLiteral(member.initializer)
        ) {
          found.push({
            surface: `contract reference table ${member.name.text}`,
            resourceKey,
            spelling: routeSegment(member.initializer.text),
          })
        }
      }
    }
  })
  return found
}

/** `expression` without the `as` and `satisfies` operators around it, which change no value. */
function withoutTypeAssertions(expression: ts.Expression): ts.Expression {
  let current = expression
  while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current)) {
    current = current.expression
  }
  return current
}

/**
 * The contract's operation descriptors: each descriptor's id, keyed by the
 * resource its target names. MCP adapters name each tool from this id
 * (`macts__<app>__<resource>_<operation>`), so it is also the MCP tool name's
 * spelling of the resource.
 */
function descriptorSpellings(manifest: AppManifest): Spelling[] {
  const content = generateContract(manifest).files.find(
    (file) => file.path === CONTRACT_MODULE_PATH
  )?.content
  if (content === undefined) throw new Error('the contract has no contract module')
  const found: Spelling[] = []
  // `const <binding>: OperationDescriptor<…> = { id: '<id>', target: { …, resource: '<Key>' }, … }`
  walk(parse(CONTRACT_MODULE_PATH, content), (node) => {
    if (!ts.isVariableDeclaration(node) || node.initializer === undefined) return
    if (!ts.isObjectLiteralExpression(node.initializer)) return
    const member = (object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined =>
      object.properties.find(
        (entry): entry is ts.PropertyAssignment =>
          ts.isPropertyAssignment(entry) && ts.isIdentifier(entry.name) && entry.name.text === name
      )?.initializer
    const id = member(node.initializer, 'id')
    const target = member(node.initializer, 'target')
    if (id === undefined || !ts.isStringLiteral(id)) return
    if (target === undefined || !ts.isObjectLiteralExpression(target)) return
    const resource = member(target, 'resource')
    if (resource === undefined || !ts.isStringLiteral(resource)) return
    found.push({
      surface: 'contract descriptor id (MCP tool name)',
      resourceKey: resource.text,
      spelling: routeSegment(id.text),
    })
  })
  return found
}

/** The resolver: each route's resource segment, and the scope of each derived permission. */
function routeSpellings(manifest: AppManifest): Spelling[] {
  const found: Spelling[] = []
  for (const route of resolveManifestRoutes(manifest)) {
    const resourceKey = route.resourceType
    if (resourceKey === undefined) continue
    found.push({ surface: 'route', resourceKey, spelling: routeSegment(route.route) })
    // An explicit permission is the manifest author's; only a derived one
    // takes its scope from the resource.
    if (route.command.permission === undefined) {
      found.push({
        surface: 'derived permission scope',
        resourceKey,
        spelling: route.permission.split(':')[1] ?? '',
      })
    }
  }
  return found
}

/** Every surface's spelling of every resource of one manifest. */
function resourceSpellings(manifest: AppManifest): Spelling[] {
  return [
    ...routeSpellings(manifest),
    ...httpClientSpellings(manifest),
    ...contractSpellings(manifest),
    ...descriptorSpellings(manifest),
  ]
}

/**
 * Every resource whose surfaces spell it more than one way, with each
 * spelling and the surfaces that use it.
 */
function disagreements(dir: string, spellings: readonly Spelling[]): string[] {
  const byResource = new Map<string, Map<string, Set<string>>>()
  for (const { surface, resourceKey, spelling } of spellings) {
    const bySpelling = byResource.get(resourceKey) ?? new Map<string, Set<string>>()
    bySpelling.set(spelling, (bySpelling.get(spelling) ?? new Set()).add(surface))
    byResource.set(resourceKey, bySpelling)
  }
  const found: string[] = []
  for (const [resourceKey, bySpelling] of byResource) {
    if (bySpelling.size < 2) continue
    const variants = [...bySpelling]
      .map(([spelling, surfaces]) => `"${spelling}" (${[...surfaces].sort().join(', ')})`)
      .join(' vs ')
    found.push(`${dir}: ${resourceKey}: ${variants}`)
  }
  return found
}

/** The one spelling every surface uses for a resource, or undefined if they disagree. */
function agreedSpelling(manifest: AppManifest, resourceKey: string): string | undefined {
  const spellings = new Set(
    resourceSpellings(manifest)
      .filter((entry) => entry.resourceKey === resourceKey)
      .map((entry) => entry.spelling)
  )
  return spellings.size === 1 ? [...spellings][0] : undefined
}

function shipped(dir: string): AppManifest {
  const manifest = manifests.find((entry) => entry.dir === dir)?.manifest
  if (manifest === undefined) throw new Error(`the ${dir} manifest is missing`)
  return manifest
}

describe('resource spelling across surfaces', () => {
  it('discovers the shipped manifests', () => {
    // Guards against a vacuous pass if the manifests directory moves.
    expect(manifests.length).toBeGreaterThan(30)
  })

  it('spells every resource of every shipped manifest the same way on every surface', () => {
    const found: string[] = []
    const resources = new Set<string>()
    const multiWord = new Set<string>()
    for (const { dir, manifest } of manifests) {
      const spellings = resourceSpellings(manifest)
      found.push(...disagreements(dir, spellings))
      for (const { resourceKey } of spellings) {
        resources.add(`${dir}:${resourceKey}`)
        const plural = manifest.resources[resourceKey]?.plural ?? ''
        if (/^[A-Z][a-z0-9]*[A-Z]/.test(plural) || /^[A-Z]{2}/.test(plural)) {
          multiWord.add(`${dir}:${resourceKey}`)
        }
      }
    }
    expect(found).toEqual([])
    // Guards against a vacuous pass. Only a resource with operations reaches a
    // surface: over 60 do, and over 10 of those have a multi-word or acronym
    // plural, the case this suite exists for.
    expect(resources.size).toBeGreaterThan(60)
    expect(multiWord.size).toBeGreaterThan(10)
  })

  it("spells every resource on every surface as the segment of the resource's plural", () => {
    // Agreement between surfaces is not enough: each surface's spelling must
    // be the one the shared rule derives from the resource's own plural.
    const found: string[] = []
    let compared = 0
    const surfaces = new Set<string>()
    for (const { dir, manifest } of manifests) {
      for (const { surface, resourceKey, spelling } of resourceSpellings(manifest)) {
        compared++
        surfaces.add(surface)
        const plural = manifest.resources[resourceKey]?.plural
        const expected =
          plural === undefined
            ? `(no resource ${resourceKey})`
            : normalizeResourceRouteSegment(plural)
        if (spelling !== expected) {
          found.push(`${dir}: ${resourceKey} is "${spelling}" in the ${surface}, not "${expected}"`)
        }
      }
    }
    expect(found).toEqual([])
    // Guards against a vacuous pass: every surface of every resource with
    // operations, and every surface contributes.
    expect(compared).toBeGreaterThan(750)
    expect([...surfaces].sort()).toEqual([
      'HTTP client accessor',
      'HTTP client route segment',
      'contract accessor',
      'contract descriptor id (MCP tool name)',
      'contract reference table get',
      'contract reference table list',
      'derived permission scope',
      'route',
    ])
  })

  it('spells each capability as its resource is spelled elsewhere, for every manifest', () => {
    // A capability names no resource key, so its resource, the middle of its
    // name and the resource part of its tool name must each be a spelling some
    // route of the same manifest uses.
    const found: string[] = []
    let compared = 0
    for (const { dir, manifest } of manifests) {
      const segments = new Set(routeSpellings(manifest).map((entry) => entry.spelling))
      const app = normalizeAppRouteSegment(manifest.app.name)
      for (const capability of deriveCapabilities(manifest)) {
        if (capability.resource === 'app') continue
        compared++
        const named = capability.name.split('.')[1] ?? ''
        const tool = capability.mcpToolName.startsWith(`macts__${app}__${capability.resource}_`)
        if (!segments.has(capability.resource) || named !== capability.resource || !tool) {
          found.push(`${dir}: ${capability.name} (${capability.mcpToolName})`)
        }
      }
    }
    expect(found).toEqual([])
    expect(compared).toBeGreaterThan(150)
  })

  it('calls only the HTTP client accessors that exist from the generated CLI', () => {
    // The generated CLI calls `client.<accessor>`; each must be one the HTTP
    // client declares.
    const found: string[] = []
    let calls = 0
    for (const { dir, manifest } of manifests) {
      const accessors = new Set(
        httpClientSpellings(manifest)
          .filter((entry) => entry.surface === 'HTTP client accessor')
          .map((entry) => entry.spelling)
      )
      const cli = generateCliPlugin(manifest, {
        packageName: 'cli-spelling',
        sdkPackageName: 'sdk-spelling',
      })
      for (const file of cli.files) {
        walk(parse(file.path, file.content), (node) => {
          if (
            ts.isPropertyAccessExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            node.expression.expression.text === 'client'
          ) {
            calls++
            const accessor = node.expression.name.text
            if (!accessors.has(accessor))
              found.push(`${dir}: ${file.path} calls client.${accessor}`)
          }
        })
      }
    }
    expect(found).toEqual([])
    expect(calls).toBeGreaterThan(200)
  })

  it('spells no resource in an explicit permission only differently in letter case', () => {
    // An explicit permission (on a command, or listed in the manifest's
    // permission groups) whose scope names a resource must spell it as the
    // resource's segment. One that differs only in case, such as
    // `photos:mediaitems:list` for the segment `mediaItems`, matches no
    // route's permission and can never authorize the operation it names.
    const found: string[] = []
    let checked = 0
    for (const { dir, manifest } of manifests) {
      const segments = new Map(
        Object.values(manifest.resources).map((resource) => {
          const segment = normalizeResourceRouteSegment(resource.plural)
          return [segment.toLowerCase(), segment]
        })
      )
      const check = (where: string, permission: string): void => {
        checked++
        const scope = permission.split(':')[1] ?? ''
        const segment = segments.get(scope.toLowerCase())
        if (segment !== undefined && segment !== scope) {
          found.push(`${dir}: ${where} "${permission}" spells "${segment}" as "${scope}"`)
        }
      }
      for (const [key, command] of Object.entries(manifest.commands)) {
        if (command.permission !== undefined) check(`command ${key}`, command.permission)
      }
      for (const [group, operations] of Object.entries(manifest.permissions ?? {})) {
        for (const [operation, permissions] of Object.entries(operations)) {
          for (const permission of permissions) check(`group ${group}.${operation}`, permission)
        }
      }
    }
    expect(found).toEqual([])
    // Guards against a vacuous pass: the manifests declare over two hundred
    // explicit permissions (command permissions and permission-group entries).
    expect(checked).toBeGreaterThan(200)
  })

  it('detects a resource two surfaces spell differently', () => {
    // The comparison must catch a disagreement, or the assertions above prove nothing.
    expect(
      disagreements('photos', [
        { surface: 'route', resourceKey: 'MediaItem', spelling: 'mediaItems' },
        { surface: 'HTTP client accessor', resourceKey: 'MediaItem', spelling: 'mediaitems' },
        { surface: 'contract accessor', resourceKey: 'MediaItem', spelling: 'mediaItems' },
        { surface: 'route', resourceKey: 'Album', spelling: 'albums' },
      ])
    ).toEqual([
      'photos: MediaItem: "mediaItems" (contract accessor, route) vs "mediaitems" (HTTP client accessor)',
    ])
  })
})

/**
 * The spelling every surface shares, pinned by hand from the rule in D2: the
 * plural's lower camel case, with a leading acronym lowercased.
 */
describe('resource spellings of shipped resources', () => {
  it.each([
    // Single word: the first letter is lowercased.
    ['notes', 'Note', 'notes'],
    // Multi-word: later words keep their capitals.
    ['photos', 'MediaItem', 'mediaItems'],
    ['automator', 'RequiredResource', 'requiredResources'],
    ['xcode', 'RunDestination', 'runDestinations'],
    ['microsoft-edge', 'BookmarkFolder', 'bookmarkFolders'],
    ['terminal', 'SettingsSet', 'settingsSets'],
    // A leading acronym is lowercased; the capital starting the next word stays.
    ['system-events', 'UIElement', 'uiElements'],
  ])('%s %s is %s on every surface', (dir, resourceKey, expected) => {
    expect(agreedSpelling(shipped(dir), resourceKey)).toBe(expected)
  })
})
