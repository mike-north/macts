/**
 * Guard: every CRUD operation in the shipped manifests is published under its
 * operation name.
 *
 * A public operation id says what the operation is:
 * `<app>.<resource plural>.<get|list|create|update|delete>`. Several resources
 * cannot share one manifest command when they need different identifier
 * parameters, so a manifest gives such commands distinct keys (`getEvent`,
 * `listReminders`). The key is internal; `routeName` sets the public segment.
 * A CRUD command whose route segment is its key instead of its operation name
 * leaks that internal key into every surface (HTTP routes, SDK and contract
 * operation ids, MCP and CLI routing), and a caller can no longer predict a
 * route from the resource and the operation.
 *
 * This test fails when any such route appears in a shipped manifest.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D2 (`routeName`)
 * @see https://github.com/mike-north/macts/issues/146
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest } from './loader.js'
import { resolveManifestRoutes } from './route.js'
import type { AppManifest } from './schemas/index.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

/** The command names whose route segment must be the name itself. */
const CRUD_NAMES: ReadonlySet<string> = new Set(['get', 'list', 'create', 'update', 'delete'])

/**
 * Key-named CRUD routes that are deliberately kept, by route, each with the
 * reason. Empty: every shipped CRUD route is published under its operation
 * name. An entry needs a written reason and review.
 */
const ALLOWED_KEY_NAMED_ROUTES: ReadonlyMap<string, string> = new Map()

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

describe('CRUD routes in the shipped manifests', () => {
  it('discovers the shipped manifests', () => {
    // Guards against a vacuous pass if the manifests directory moves.
    expect(manifests.length).toBeGreaterThan(30)
  })

  it('publishes every CRUD operation under its operation name, not its command key', () => {
    const keyNamed: string[] = []
    let crudRoutes = 0
    for (const { dir, manifest } of manifests) {
      for (const route of resolveManifestRoutes(manifest)) {
        if (!CRUD_NAMES.has(route.command.name)) continue
        crudRoutes++
        const segment = route.route.slice(route.route.lastIndexOf('.') + 1)
        if (segment === route.command.name || ALLOWED_KEY_NAMED_ROUTES.has(route.route)) continue
        keyNamed.push(
          `${dir}: ${route.route} (command "${route.commandKey}" is a ${route.command.name}; set routeName: ${route.command.name})`
        )
      }
    }
    expect(keyNamed).toEqual([])
    // Guards against a vacuous pass: the manifests declare well over 100 CRUD routes.
    expect(crudRoutes).toBeGreaterThan(100)
  })

  it('gives every allowed key-named route a reason', () => {
    for (const [route, reason] of ALLOWED_KEY_NAMED_ROUTES) {
      expect(reason.trim(), route).not.toBe('')
    }
  })
})
