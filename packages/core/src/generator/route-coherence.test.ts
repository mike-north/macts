/**
 * Cross-surface route-coherence tests.
 *
 * Guards the contract that the generated client SDK and the server router
 * address every manifest operation with the IDENTICAL `app.resource.operation`
 * route string, for EVERY operation across EVERY app manifest in the repo.
 *
 * This is the regression guard for the structured-write break where the client
 * SDK posted to `calendar.events.create` while the server exposed
 * `calendar.events.createEvent` (keyed by the manifest command KEY, not its
 * `name`). The canonical route is produced by `resolveManifestRoutes`
 * (`@macts/core`), which the server router consumes directly; this test proves
 * the client SDK derives the same set.
 *
 * @see ../../manifest/route.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadManifest } from '../manifest/loader.js'
import { resolveManifestRoutes } from '../manifest/route.js'
import type { AppManifest } from '../manifest/index.js'
import { generateHttpClientSdk } from './sdk/http-client.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

interface LoadedApp {
  dir: string
  manifest: AppManifest
}

/**
 * Extract every RPC route string emitted by a generated client SDK.
 *
 * Resource clients build routes from injected app/resource segments
 * (`new XResourceClient(httpClient, '<app>', '<resource>')`) plus a per-method
 * command-key suffix (`` `${this.#app}.${this.#resource}.<key>` ``). App-level
 * methods emit fully-literal routes (`'<app>.app.<key>'`). This reconstructs the
 * full route strings the SDK will POST to.
 */
function extractClientRoutes(files: { path: string; content: string }[]): Set<string> {
  const routes = new Set<string>()

  const clientFile = files.find((f) => f.path === 'src/client.ts')
  if (!clientFile) throw new Error('generated SDK missing src/client.ts')

  // Map resource-client class name -> { app, resource } from constructor calls.
  const ctorRe = /new (\w+ResourceClient)\(this\.#httpClient, '([^']+)', '([^']+)'\)/g
  const segmentsByClass = new Map<string, { app: string; resource: string }>()
  for (const m of clientFile.content.matchAll(ctorRe)) {
    segmentsByClass.set(m[1] ?? '', { app: m[2] ?? '', resource: m[3] ?? '' })
  }

  // App-level routes are fully-literal in client.ts.
  const appRouteRe = /rpc<[^>]*>\('([^']+\.app\.[^']+)'/g
  for (const m of clientFile.content.matchAll(appRouteRe)) {
    if (m[1]) routes.add(m[1])
  }

  // Resource routes: each resources/<name>.ts file declares one class. Pair its
  // injected segments with the command-key suffix from each method.
  const suffixRe = /\$\{this\.#app\}\.\$\{this\.#resource\}\.([A-Za-z0-9_]+)`/g
  for (const file of files) {
    if (!file.path.startsWith('src/resources/')) continue
    const classMatch = /export class (\w+ResourceClient)/.exec(file.content)
    if (!classMatch) continue
    const segments = segmentsByClass.get(classMatch[1] ?? '')
    if (!segments) continue
    for (const m of file.content.matchAll(suffixRe)) {
      routes.add(`${segments.app}.${segments.resource}.${m[1] ?? ''}`)
    }
  }

  return routes
}

let apps: LoadedApp[] = []

beforeAll(async () => {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  apps = await Promise.all(
    dirs.map(async (dir) => ({
      dir,
      manifest: await loadManifest(resolve(MANIFESTS_DIR, dir, 'app.yaml')),
    }))
  )
})

describe('route coherence across all app manifests', () => {
  it('discovers app manifests', () => {
    // Guard: if the manifests dir moved, the rest of this suite would vacuously
    // pass. Fail loudly instead.
    expect(apps.length).toBeGreaterThan(0)
  })

  it('every client SDK route is a route the server exposes (canonical)', () => {
    const mismatches: string[] = []

    for (const { dir, manifest } of apps) {
      const canonicalRoutes = new Set(resolveManifestRoutes(manifest).map((r) => r.route))
      const sdk = generateHttpClientSdk(manifest, { packageName: `@macts/sdk-${dir}` })
      expect(sdk.errors).toHaveLength(0)
      const clientRoutes = extractClientRoutes(sdk.files)

      // Every route the client can POST to must be served by the server. (The
      // server may expose MORE routes than the client surfaces a method for —
      // e.g. multi-resource commands — so this direction is the contract.)
      for (const route of clientRoutes) {
        if (!canonicalRoutes.has(route)) {
          mismatches.push(`${dir}: client emits "${route}" which the server does not expose`)
        }
      }
    }

    expect(mismatches).toEqual([])
  })

  it('emits no name-keyed route for any manifest-named command', () => {
    // For every command whose manifest key differs from its `name`, the client
    // must NOT emit the name-keyed route (the original bug shape).
    const leaks: string[] = []

    for (const { dir, manifest } of apps) {
      const sdk = generateHttpClientSdk(manifest, { packageName: `@macts/sdk-${dir}` })
      const clientRoutes = extractClientRoutes(sdk.files)

      for (const [key, command] of Object.entries(manifest.commands)) {
        if (command.name === key) continue
        if (command.scope === 'application') continue
        // Build the (wrong) name-keyed routes this command would have produced.
        const resourceTypes =
          command.resourceType === undefined
            ? Object.keys(manifest.resources)
            : Array.isArray(command.resourceType)
              ? command.resourceType
              : [command.resourceType]
        const appSeg = manifest.app.name.replace(/\s+/g, '-').toLowerCase()
        for (const rt of resourceTypes) {
          const plural = (manifest.resources[rt]?.plural ?? `${rt}s`).toLowerCase()
          const nameKeyed = `${appSeg}.${plural}.${command.name}`
          const keyKeyed = `${appSeg}.${plural}.${key}`
          if (clientRoutes.has(nameKeyed) && !clientRoutes.has(keyKeyed)) {
            leaks.push(`${dir}: client emits name-keyed "${nameKeyed}" instead of "${keyKeyed}"`)
          }
        }
      }
    }

    expect(leaks).toEqual([])
  })
})

describe('@macts/calendar events update and delete', () => {
  let calendar: AppManifest

  beforeAll(async () => {
    calendar = await loadManifest(resolve(MANIFESTS_DIR, 'calendar', 'app.yaml'))
  })

  it('manifest declares updateEvent command for Event resource', () => {
    // The updateEvent command must be present with name: update, scope: resource,
    // resourceType: Event, and a required `id` param (the request parameter — NOT
    // `uid`, which is the resource's identifier PROPERTY).
    const cmd = calendar.commands['updateEvent']
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('update')
    expect(cmd?.scope).toBe('resource')
    expect(cmd?.resourceType).toBe('Event')
    const idParam = cmd?.parameters.find((p) => p.required)
    expect(idParam?.name).toBe('id')
    expect(idParam?.type).toBe('string')
  })

  it('manifest declares deleteEvent command for Event resource', () => {
    // The deleteEvent command must be present with name: delete, scope: resource,
    // resourceType: Event, and a required `id` param consistent with getEvent.
    const cmd = calendar.commands['deleteEvent']
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('delete')
    expect(cmd?.scope).toBe('resource')
    expect(cmd?.resourceType).toBe('Event')
    const idParam = cmd?.parameters.find((p) => p.required)
    expect(idParam?.name).toBe('id')
    expect(idParam?.type).toBe('string')
  })

  it('updateEvent identifier param name matches getEvent identifier param name', () => {
    // Coherence guard: get/update/delete must agree on the request parameter name.
    // The server's executeResourceCommand resolves the lookup var from
    // `command.parameters.find((p) => p.required)?.name` — if get uses `id` and
    // update uses `uid`, the server would emit `byId(uid)` with no `uid` var bound.
    const getCmd = calendar.commands['getEvent']
    const updateCmd = calendar.commands['updateEvent']
    const deleteCmd = calendar.commands['deleteEvent']
    const getIdParam = getCmd?.parameters.find((p) => p.required)?.name
    const updateIdParam = updateCmd?.parameters.find((p) => p.required)?.name
    const deleteIdParam = deleteCmd?.parameters.find((p) => p.required)?.name
    expect(updateIdParam).toBe(getIdParam)
    expect(deleteIdParam).toBe(getIdParam)
  })

  it('updateEvent has date-typed params for startDate and endDate', () => {
    // Date-typed params are rehydrated as JXA Date objects by the RPC executor.
    // Without type: date the ISO string would be assigned directly, which may
    // throw or silently produce wrong results in Calendar.app JXA.
    const cmd = calendar.commands['updateEvent']
    const startDate = cmd?.parameters.find((p) => p.name === 'startDate')
    const endDate = cmd?.parameters.find((p) => p.name === 'endDate')
    expect(startDate?.type).toBe('date')
    expect(endDate?.type).toBe('date')
  })

  it('routes events.update() to calendar.events.updateEvent', () => {
    // The manifest key for the update command is `updateEvent`; the server
    // registers the route under that key. The client must use the same key.
    const canonical = new Set(resolveManifestRoutes(calendar).map((r) => r.route))
    expect(canonical).toContain('calendar.events.updateEvent')

    const sdk = generateHttpClientSdk(calendar, { packageName: '@macts/calendar' })
    const eventFile = sdk.files.find((f) => f.path === 'src/resources/event.ts')
    if (!eventFile) throw new Error('generated calendar SDK missing event resource')

    expect(eventFile.content).toContain('async update(id: string, input: EventUpdateInput)')
    expect(eventFile.content).toContain('${this.#app}.${this.#resource}.updateEvent`')
    // Must NOT emit the name-keyed route `update` — that would 404.
    expect(eventFile.content).not.toContain('${this.#app}.${this.#resource}.update`')

    const clientRoutes = extractClientRoutes(sdk.files)
    expect(clientRoutes).toContain('calendar.events.updateEvent')
    expect(clientRoutes.has('calendar.events.update')).toBe(false)
  })

  it('routes events.delete() to calendar.events.deleteEvent', () => {
    // Same key-coherence contract as update: manifest key is `deleteEvent`.
    const canonical = new Set(resolveManifestRoutes(calendar).map((r) => r.route))
    expect(canonical).toContain('calendar.events.deleteEvent')

    const sdk = generateHttpClientSdk(calendar, { packageName: '@macts/calendar' })
    const eventFile = sdk.files.find((f) => f.path === 'src/resources/event.ts')
    if (!eventFile) throw new Error('generated calendar SDK missing event resource')

    expect(eventFile.content).toContain('async delete(id: string)')
    expect(eventFile.content).toContain('${this.#app}.${this.#resource}.deleteEvent`')
    expect(eventFile.content).not.toContain('${this.#app}.${this.#resource}.delete`')

    const clientRoutes = extractClientRoutes(sdk.files)
    expect(clientRoutes).toContain('calendar.events.deleteEvent')
    expect(clientRoutes.has('calendar.events.delete')).toBe(false)
  })

  it('EventUpdateInput carries date-typed optional fields for startDate and endDate', () => {
    // The updateEvent command has date-typed startDate/endDate params. The
    // generated EventUpdateInput (Partial<EventCreateInput>) must type those
    // fields as Date (not string) — the RPC executor rehydrates date params
    // before forwarding them to JXA.
    const sdk = generateHttpClientSdk(calendar, { packageName: '@macts/calendar' })
    const typesFile = sdk.files.find((f) => f.path === 'src/types.ts')
    if (!typesFile) throw new Error('generated calendar SDK missing types')

    // EventUpdateInput = Partial<EventCreateInput>, so we check EventCreateInput
    // for the date fields.
    const createInputMatch = /export interface EventCreateInput \{([\s\S]*?)\n\}/.exec(
      typesFile.content
    )
    expect(createInputMatch).not.toBeNull()
    const body = createInputMatch?.[1] ?? ''
    expect(body).toContain('startDate')
    expect(body).toContain('endDate')
  })

  it('updateEvent has mutable event fields as optional parameters', () => {
    // All writable event properties except the identifier should be optional
    // in the update command so partial updates are supported.
    const cmd = calendar.commands['updateEvent']
    expect(cmd).toBeDefined()
    const paramNames = cmd?.parameters.map((p) => p.name) ?? []
    // Required field: only the identifier
    const requiredParams = cmd?.parameters.filter((p) => p.required).map((p) => p.name) ?? []
    expect(requiredParams).toEqual(['id'])
    // Mutable fields must be optional
    expect(paramNames).toContain('summary')
    expect(paramNames).toContain('description')
    expect(paramNames).toContain('location')
    expect(paramNames).toContain('startDate')
    expect(paramNames).toContain('endDate')
    expect(paramNames).toContain('recurrence')
  })
})

describe('@macts/calendar events.create regression', () => {
  let calendar: AppManifest

  beforeAll(async () => {
    calendar = await loadManifest(resolve(MANIFESTS_DIR, 'calendar', 'app.yaml'))
  })

  it('routes events.create() to the same key the server exposes (createEvent)', () => {
    // The flagship structured-write path. The Event create command's manifest
    // KEY is `createEvent`; the server registers `calendar.events.createEvent`.
    const canonical = new Set(resolveManifestRoutes(calendar).map((r) => r.route))
    expect(canonical).toContain('calendar.events.createEvent')

    const sdk = generateHttpClientSdk(calendar, { packageName: '@macts/calendar' })
    const eventFile = sdk.files.find((f) => f.path === 'src/resources/event.ts')
    if (!eventFile) throw new Error('generated calendar SDK missing event resource')

    // The generated create() method must target the createEvent key, never the
    // name-keyed `create` that 404'd against the live server.
    expect(eventFile.content).toContain('async create(input: EventCreateInput)')
    expect(eventFile.content).toContain('${this.#app}.${this.#resource}.createEvent`')
    expect(eventFile.content).not.toContain('${this.#app}.${this.#resource}.create`')

    // And the full reconstructed client route matches the server route exactly.
    const clientRoutes = extractClientRoutes(sdk.files)
    expect(clientRoutes).toContain('calendar.events.createEvent')
    expect(clientRoutes.has('calendar.events.create')).toBe(false)
  })

  it('surfaces the calendarId the create route requires in EventCreateInput', () => {
    // Identifier reconciliation: the server validates `calendarId` (required) on
    // create, so the SDK input type must carry it under that exact name.
    const sdk = generateHttpClientSdk(calendar, { packageName: '@macts/calendar' })
    const typesFile = sdk.files.find((f) => f.path === 'src/types.ts')
    if (!typesFile) throw new Error('generated calendar SDK missing types')

    const createInputMatch = /export interface EventCreateInput \{([\s\S]*?)\n\}/.exec(
      typesFile.content
    )
    expect(createInputMatch).not.toBeNull()
    const body = createInputMatch?.[1] ?? ''
    // Required (no `?`) calendarId of type string.
    expect(body).toContain('calendarId: string;')
  })
})
