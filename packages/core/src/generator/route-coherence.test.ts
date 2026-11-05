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
 * `name`). The command's `routeName` now publishes it as
 * `calendar.events.create` on both sides; what matters here is that both
 * surfaces derive the same route. The canonical route is produced by `resolveManifestRoutes`
 * (`@macts/core`), which the server router consumes directly; this test proves
 * the client SDK derives the same set.
 *
 * @see ../../manifest/route.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadManifest } from '../manifest/loader.js'
import {
  commandRouteSegment,
  normalizeResourceRouteSegment,
  resolveManifestRoutes,
} from '../manifest/route.js'
import { resolvePrimaryIdentifierProperty } from '../manifest/identifier.js'
import type { AppManifest } from '../manifest/index.js'
import { positionalOperationSource } from './sdk/test-support/operation-source.js'
import { generateHttpClientSdk } from './sdk/http-client.js'
import { generateContract } from './contract/index.js'
import { findCrudCommand, resolveIdParams, resourceCommandEntries } from './surface.js'

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
  const appRouteRe = /invoke<.*>\('([^']+\.app\.[^']+)'/g
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
    // must NOT emit the name-keyed route (the original bug shape) in place of
    // its canonical route, keyed by its route segment (`routeName`, else key).
    // A `routeName` equal to the name is deliberate and is the canonical route.
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
          const plural = normalizeResourceRouteSegment(manifest.resources[rt]?.plural ?? `${rt}s`)
          const nameKeyed = `${appSeg}.${plural}.${command.name}`
          const keyKeyed = `${appSeg}.${plural}.${commandRouteSegment(key, command)}`
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
    // resourceType: Event. Events are nested under calendars, so two required
    // params are expected: calendarId (parent) and id (child — the request
    // parameter; NOT `uid`, which is the resource's identifier PROPERTY).
    const cmd = calendar.commands['updateEvent']
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('update')
    expect(cmd?.scope).toBe('resource')
    expect(cmd?.resourceType).toBe('Event')
    const requiredParams = cmd?.parameters.filter((p) => p.required) ?? []
    expect(requiredParams).toHaveLength(2)
    expect(requiredParams[0]?.name).toBe('calendarId')
    expect(requiredParams[0]?.type).toBe('string')
    expect(requiredParams[1]?.name).toBe('id')
    expect(requiredParams[1]?.type).toBe('string')
  })

  it('manifest declares deleteEvent command for Event resource', () => {
    // The deleteEvent command must be present with name: delete, scope: resource,
    // resourceType: Event. Two required params: calendarId (parent) and id (child).
    const cmd = calendar.commands['deleteEvent']
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('delete')
    expect(cmd?.scope).toBe('resource')
    expect(cmd?.resourceType).toBe('Event')
    const requiredParams = cmd?.parameters.filter((p) => p.required) ?? []
    expect(requiredParams).toHaveLength(2)
    expect(requiredParams[0]?.name).toBe('calendarId')
    expect(requiredParams[0]?.type).toBe('string')
    expect(requiredParams[1]?.name).toBe('id')
    expect(requiredParams[1]?.type).toBe('string')
  })

  it('updateEvent identifier param name matches getEvent identifier param name', () => {
    // Coherence guard: get/update/delete must agree on the request parameter names.
    // The server's executeResourceCommand uses the LAST required param as the child
    // id var (the one passed to byId()). All three commands must use the same
    // calendarId param as parent and the same id param as child.
    const getCmd = calendar.commands['getEvent']
    const updateCmd = calendar.commands['updateEvent']
    const deleteCmd = calendar.commands['deleteEvent']
    const getRequired = getCmd?.parameters.filter((p) => p.required) ?? []
    const updateRequired = updateCmd?.parameters.filter((p) => p.required) ?? []
    const deleteRequired = deleteCmd?.parameters.filter((p) => p.required) ?? []
    // Parent params must match.
    expect(updateRequired[0]?.name).toBe(getRequired[0]?.name)
    expect(deleteRequired[0]?.name).toBe(getRequired[0]?.name)
    // Child id params must match.
    expect(updateRequired[updateRequired.length - 1]?.name).toBe(
      getRequired[getRequired.length - 1]?.name
    )
    expect(deleteRequired[deleteRequired.length - 1]?.name).toBe(
      getRequired[getRequired.length - 1]?.name
    )
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

  it('routes events.update() to calendar.events.update', () => {
    // The update command's manifest key is `updateEvent`, and its routeName
    // publishes it under the operation name; the server registers that route,
    // and the client must use the same one.
    const canonical = new Set(resolveManifestRoutes(calendar).map((r) => r.route))
    expect(canonical).toContain('calendar.events.update')
    expect(canonical.has('calendar.events.updateEvent')).toBe(false)

    const sdk = generateHttpClientSdk(calendar, { packageName: '@macts/calendar' })
    const eventFile = sdk.files.find((f) => f.path === 'src/resources/event.ts')
    if (!eventFile) throw new Error('generated calendar SDK missing event resource')

    // Events are nested under calendars: the generated method must take both
    // calendarId (parent) and id (child event uid).
    expect(positionalOperationSource(eventFile.content)).toContain(
      'async update(calendarId: string, id: string, input: EventUpdateInput)'
    )
    expect(positionalOperationSource(eventFile.content)).toContain(
      '${this.#app}.${this.#resource}.update`'
    )
    // Must NOT emit the key-named route, which the server no longer exposes.
    expect(positionalOperationSource(eventFile.content)).not.toContain(
      '${this.#app}.${this.#resource}.updateEvent`'
    )

    const clientRoutes = extractClientRoutes(sdk.files)
    expect(clientRoutes).toContain('calendar.events.update')
    expect(clientRoutes.has('calendar.events.updateEvent')).toBe(false)
  })

  it('routes events.delete() to calendar.events.delete', () => {
    // Same contract as update: manifest key `deleteEvent`, routeName `delete`.
    const canonical = new Set(resolveManifestRoutes(calendar).map((r) => r.route))
    expect(canonical).toContain('calendar.events.delete')
    expect(canonical.has('calendar.events.deleteEvent')).toBe(false)

    const sdk = generateHttpClientSdk(calendar, { packageName: '@macts/calendar' })
    const eventFile = sdk.files.find((f) => f.path === 'src/resources/event.ts')
    if (!eventFile) throw new Error('generated calendar SDK missing event resource')

    // Events are nested under calendars: the generated method must take both
    // calendarId (parent) and id (child event uid).
    expect(positionalOperationSource(eventFile.content)).toContain(
      'async delete(calendarId: string, id: string)'
    )
    expect(positionalOperationSource(eventFile.content)).toContain(
      '${this.#app}.${this.#resource}.delete`'
    )
    expect(positionalOperationSource(eventFile.content)).not.toContain(
      '${this.#app}.${this.#resource}.deleteEvent`'
    )

    const clientRoutes = extractClientRoutes(sdk.files)
    expect(clientRoutes).toContain('calendar.events.delete')
    expect(clientRoutes.has('calendar.events.deleteEvent')).toBe(false)
  })

  it('EventUpdateInput carries date-typed optional fields for startDate and endDate', () => {
    // The updateEvent command has date-typed startDate/endDate params. The
    // generated EventUpdateInput (Partial<EventCreateInput>) must type those
    // fields as Date (not string) — the RPC executor rehydrates date params
    // before forwarding them to JXA.
    const sdk = generateHttpClientSdk(calendar, { packageName: '@macts/calendar' })
    const typesFile = sdk.files.find((f) => f.path === 'src/contract/index.ts')
    if (!typesFile) throw new Error('generated calendar SDK missing types')

    // EventUpdateInput = Partial<EventCreateInput>, so we check EventCreateInput
    // for the date fields.
    const createInputMatch = /export interface EventCreateInput \{([\s\S]*?)\n\}/.exec(
      typesFile.content
    )
    expect(createInputMatch).not.toBeNull()
    const body = createInputMatch?.[1] ?? ''
    // Must be typed as Date (not string) — the HTTP client serialises dates to
    // ISO strings; the RPC server deserialises them back to Date before JXA.
    expect(body).toContain('startDate: Date')
    expect(body).toContain('endDate: Date')
    expect(body).toContain('stampDate?: Date')
    // excludedDates is an array of date, not a comma-separated string.
    expect(body).toContain('excludedDates?: readonly Date[]')
    // status references the EventStatus enum, not widened to string.
    expect(body).toContain('status?: EventStatus')
  })

  it('updateEvent has mutable event fields as optional parameters', () => {
    // All writable event properties except the identifiers (calendarId + id)
    // should be optional in the update command so partial updates are supported.
    const cmd = calendar.commands['updateEvent']
    expect(cmd).toBeDefined()
    const paramNames = cmd?.parameters.map((p) => p.name) ?? []
    // Required fields: parent (calendarId) + child identifier (id).
    const requiredParams = cmd?.parameters.filter((p) => p.required).map((p) => p.name) ?? []
    expect(requiredParams).toEqual(['calendarId', 'id'])
    // ALL mutable event properties must be optional params — this guards against
    // regressions where a newly-added writable field disappears from the manifest.
    // Cross-checked against the Event resource's `access: rw` properties.
    expect(paramNames).toContain('summary')
    expect(paramNames).toContain('description')
    expect(paramNames).toContain('location')
    expect(paramNames).toContain('startDate')
    expect(paramNames).toContain('endDate')
    expect(paramNames).toContain('recurrence')
    expect(paramNames).toContain('status')
    expect(paramNames).toContain('alldayEvent')
    expect(paramNames).toContain('stampDate')
    expect(paramNames).toContain('excludedDates')
    expect(paramNames).toContain('url')
  })
})

describe('@macts/calendar events.create regression', () => {
  let calendar: AppManifest

  beforeAll(async () => {
    calendar = await loadManifest(resolve(MANIFESTS_DIR, 'calendar', 'app.yaml'))
  })

  it('routes events.create() to the route the server exposes (calendar.events.create)', () => {
    // The flagship structured-write path. The Event create command's manifest
    // KEY is `createEvent`; its routeName publishes `calendar.events.create`,
    // which the server registers.
    const canonical = new Set(resolveManifestRoutes(calendar).map((r) => r.route))
    expect(canonical).toContain('calendar.events.create')
    expect(canonical.has('calendar.events.createEvent')).toBe(false)

    const sdk = generateHttpClientSdk(calendar, { packageName: '@macts/calendar' })
    const eventFile = sdk.files.find((f) => f.path === 'src/resources/event.ts')
    if (!eventFile) throw new Error('generated calendar SDK missing event resource')

    // The generated create() method must target the route the server exposes,
    // never one it does not (which 404'd against the live server).
    expect(positionalOperationSource(eventFile.content)).toContain(
      'async create(input: EventCreateInput)'
    )
    expect(positionalOperationSource(eventFile.content)).toContain(
      '${this.#app}.${this.#resource}.create`'
    )
    expect(positionalOperationSource(eventFile.content)).not.toContain(
      '${this.#app}.${this.#resource}.createEvent`'
    )

    // And the full reconstructed client route matches the server route exactly.
    const clientRoutes = extractClientRoutes(sdk.files)
    expect(clientRoutes).toContain('calendar.events.create')
    expect(clientRoutes.has('calendar.events.createEvent')).toBe(false)
  })

  it('surfaces the calendarId the create route requires in EventCreateInput', () => {
    // Identifier reconciliation: the server validates `calendarId` (required) on
    // create, so the SDK input type must carry it under that exact name.
    const sdk = generateHttpClientSdk(calendar, { packageName: '@macts/calendar' })
    const typesFile = sdk.files.find((f) => f.path === 'src/contract/index.ts')
    if (!typesFile) throw new Error('generated calendar SDK missing types')

    const createInputMatch = /export interface EventCreateInput \{([\s\S]*?)\n\}/.exec(
      typesFile.content
    )
    expect(createInputMatch).not.toBeNull()
    const body = createInputMatch?.[1] ?? ''
    // Required (no `?`) calendarId of type string.
    expect(body).toContain('calendarId: string')
  })
})

/**
 * Notes attachments are addressed by `id`, not `name`.
 *
 * A read-only probe of Notes 4.13 (macOS 27.2) found the attachment `name`
 * empty for 10 of 25 attachments, while `id` was set for all 25 and looked
 * each one up. An identifier that can be empty cannot address the object, and
 * a non-null identifier field fails decode for every such item, so the
 * manifest identifies attachments by `id`.
 *
 * The identifier PROPERTY (what records carry, `resolvePrimaryIdentifierProperty`)
 * and the identifier request PARAMETER (what `get` takes, `command.parameters`)
 * are separate manifest facts. These tests assert both, and that every surface
 * sends the parameter under the name the server binds.
 */
describe('@macts/notes attachments addressed by id', () => {
  let notes: AppManifest

  beforeAll(async () => {
    notes = await loadManifest(resolve(MANIFESTS_DIR, 'notes', 'app.yaml'))
  })

  it('identifies attachments by the id property', () => {
    expect(resolvePrimaryIdentifierProperty(notes.resources['Attachment'])).toBe('id')
  })

  it('reads an attachment through a get command whose identifier parameter is id', () => {
    const get = findCrudCommand(resourceCommandEntries(notes, 'Attachment'), 'get')
    expect(get?.[0]).toBe('getAttachment')
    if (!get) throw new Error('Notes declares no get command for Attachment')
    expect(resolveIdParams(get[1])).toEqual({ parentParam: undefined, childParam: 'id' })
  })

  it('keeps the shared name-keyed get for the other resources only', () => {
    const shared = notes.commands['get']
    expect(shared?.resourceType).toEqual(['Account', 'Folder', 'Note'])
    expect(shared?.parameters.map((p) => p.name)).toEqual(['name'])
  })

  it('publishes the attachment get under the canonical route and derived permission', () => {
    const command = notes.commands['getAttachment']
    // The command keeps its own manifest key; routeName gives it the canonical
    // segment, and the permission is derived, not declared.
    expect(command?.routeName).toBe('get')
    expect(command?.permission).toBeUndefined()
    const routes = resolveManifestRoutes(notes)
    const route = routes.find(
      (r) => r.resourceType === 'Attachment' && r.commandKey === 'getAttachment'
    )
    expect(route?.route).toBe('notes.attachments.get')
    expect(route?.permission).toBe('notes:attachments:get')
    expect(routes.map((r) => r.route)).not.toContain('notes.attachments.getAttachment')
  })

  it('the HTTP client sends id to the attachment get route', () => {
    const sdk = generateHttpClientSdk(notes, { packageName: '@macts/notes' })
    const file = sdk.files.find((f) => f.path === 'src/resources/attachment.ts')
    if (!file) throw new Error('generated notes SDK missing attachment resource')
    expect(positionalOperationSource(file.content)).toContain('async get(id: string)')
    expect(positionalOperationSource(file.content)).toContain('${this.#app}.${this.#resource}.get`')
    expect(extractClientRoutes(sdk.files)).toContain('notes.attachments.get')
    expect(extractClientRoutes(sdk.files)).not.toContain('notes.attachments.getAttachment')
  })

  it('the contract takes id and sends it under the parameter name the server binds', () => {
    const contract = generateContract(notes).files.find((f) => f.path === 'src/contract/index.ts')
    if (!contract) throw new Error('generated notes contract missing')
    const text = contract.content
    // The client method takes the identifier positionally, typed by the id property.
    expect(text).toMatch(
      /interface AttachmentResourceClient \{[^}]*get\(id: string, options\?: CallOptions\): Promise<Attachment>/s
    )
    // The descriptor's input record is keyed by the request parameter.
    expect(text).toMatch(
      /OperationDescriptor<\{ readonly id: string \}, Attachment>\s*=\s*\{\s*id: 'notes\.attachments\.get',\s*permission: 'notes:attachments:get'/
    )
    // The resource table points references at the attachment get.
    const entryStart = text.indexOf('  Attachment: {\n    name:')
    const entry = text.slice(entryStart, text.indexOf('\n  },', entryStart))
    expect(entryStart).toBeGreaterThan(-1)
    expect(entry).toContain("get: 'notes.attachments.get'")
    expect(text).not.toContain('notes.attachments.getAttachment')
  })
})
