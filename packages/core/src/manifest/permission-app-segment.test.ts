/**
 * Guard: a permission's app segment is its route's app segment.
 *
 * An app has one public name, the app segment of its routes
 * (`normalizeAppRouteSegment(app.name)`: `Microsoft Edge` → `microsoft-edge`).
 * The permission an operation requires starts with the same segment, so a
 * grant written from a route (`microsoft-edge:tabs:get`, or
 * `microsoft-edge:*:*`) authorizes it. A manifest that writes a second name
 * into a permission makes that permission unreachable from the route: no
 * grant a caller derives from the route can ever satisfy it.
 *
 * This suite fails when, in any shipped manifest, the permission a resolved
 * route requires (the command's explicit `permission`, or the derived
 * default) or any permission listed in the manifest's permission groups
 * starts with an app segment other than the manifest's.
 *
 * Regression: Microsoft Edge wrote `edge:` and Microsoft Word `word:`, against
 * the route app segments `microsoft-edge` and `microsoft-word` (and Script
 * Editor `scripteditor:` against `script-editor`), so route
 * `microsoft-edge.tabs.get` required `edge:tabs:get`.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D2
 * @see https://github.com/mike-north/macts/issues/153 (the permission grammar)
 * @see https://github.com/mike-north/macts/issues/166
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest } from './loader.js'
import { normalizeAppRouteSegment, resolveManifestRoutes } from './route.js'
import type { AppManifest } from './schemas/index.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

/** The app segment of a permission (`app:scope:operation`) or a route (`app.scope.operation`). */
function leadingSegment(text: string, separator: ':' | '.'): string {
  return text.split(separator)[0] ?? ''
}

/**
 * Every permission of `manifest` whose app segment is not the manifest's: one
 * line each, naming where it is. Also returns how many permissions were
 * checked, so a caller can tell a pass from an empty check.
 */
function appSegmentMismatches(
  dir: string,
  manifest: AppManifest
): { checked: number; mismatches: string[] } {
  const app = normalizeAppRouteSegment(manifest.app.name)
  const mismatches: string[] = []
  let checked = 0
  for (const route of resolveManifestRoutes(manifest)) {
    checked++
    // A route's app segment is normalizeAppRouteSegment(app.name) by
    // construction, so checking the permission against the manifest's app
    // segment checks it against the route's.
    if (leadingSegment(route.permission, ':') !== app) {
      mismatches.push(`${dir}: route ${route.route} requires "${route.permission}"`)
    }
  }
  for (const [group, operations] of Object.entries(manifest.permissions ?? {})) {
    for (const [operation, permissions] of Object.entries(operations)) {
      for (const permission of permissions) {
        checked++
        if (leadingSegment(permission, ':') !== app) {
          mismatches.push(`${dir}: group ${group}.${operation} lists "${permission}"`)
        }
      }
    }
  }
  return { checked, mismatches }
}

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

function shipped(dir: string): AppManifest {
  const found = manifests.find((entry) => entry.dir === dir)
  if (found === undefined) throw new Error(`no shipped manifest in ${dir}`)
  return found.manifest
}

describe('permission app segments in the shipped manifests', () => {
  it('discovers the shipped manifests', () => {
    // Guards against a vacuous pass if the manifests directory moves.
    expect(manifests.length).toBeGreaterThan(30)
  })

  it('starts every permission with the app segment of its routes', () => {
    const results = manifests.map(({ dir, manifest }) => appSegmentMismatches(dir, manifest))
    expect(results.flatMap((result) => result.mismatches)).toEqual([])
    // Guards against a vacuous pass: the manifests resolve and list hundreds
    // of permissions between them.
    expect(results.reduce((sum, result) => sum + result.checked, 0)).toBeGreaterThan(500)
  })

  // Regression: Edge `edge:` and Word `word:`, against `microsoft-edge` and
  // `microsoft-word` (and Script Editor `scripteditor:` against `script-editor`).
  it.each([
    // The app name's words, lowercased and joined by a dash.
    ['microsoft-edge', 'Microsoft Edge', 'microsoft-edge'],
    ['microsoft-word', 'Microsoft Word', 'microsoft-word'],
    ['script-editor', 'Script Editor', 'script-editor'],
  ])('gives %s (%s) the app segment %s, in routes and permissions', (dir, name, segment) => {
    const manifest = shipped(dir)
    expect(manifest.app.name).toBe(name)
    expect(normalizeAppRouteSegment(name)).toBe(segment)
    const routes = resolveManifestRoutes(manifest)
    expect(routes.length).toBeGreaterThan(0)
    for (const route of routes) {
      expect(leadingSegment(route.route, '.')).toBe(segment)
      expect(leadingSegment(route.permission, ':')).toBe(segment)
    }
  })

  it('requires microsoft-edge:tabs:get for the route microsoft-edge.tabs.get', () => {
    // The route a caller writes a grant from, and the permission it must grant.
    const route = resolveManifestRoutes(shipped('microsoft-edge')).find(
      (entry) => entry.route === 'microsoft-edge.tabs.get'
    )
    expect(route?.permission).toBe('microsoft-edge:tabs:get')
  })

  it('detects a command permission and a group entry under a second app name', () => {
    // The check must catch the defect, or the assertions above prove nothing.
    const edge = shipped('microsoft-edge')
    const getTab = edge.commands['getTab']
    expect(getTab).toBeDefined()
    if (getTab === undefined) return
    const regressed: AppManifest = {
      ...edge,
      commands: { ...edge.commands, getTab: { ...getTab, permission: 'edge:tabs:get' } },
      permissions: { ...edge.permissions, tabs: { read: ['edge:tabs:get'] } },
    }
    expect(appSegmentMismatches('microsoft-edge', regressed).mismatches).toEqual([
      'microsoft-edge: route microsoft-edge.tabs.get requires "edge:tabs:get"',
      'microsoft-edge: group tabs.read lists "edge:tabs:get"',
    ])
  })
})
