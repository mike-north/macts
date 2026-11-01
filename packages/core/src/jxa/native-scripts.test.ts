/**
 * Tests for the native invocation bodies.
 *
 * The bodies only run against a live app, so these tests assert on the
 * generated source text: which collection is addressed, how a target is
 * reached, how reads are batched, and how arguments are read. Expected text is
 * written by hand from the manifests and from the live-app behavior each body
 * preserves:
 *
 * - Calendar events exist only under a calendar, so get/update/delete/list of
 *   an event address it through the parent calendar.
 * - A Calendar calendar's declared identifier fails at run time, so calendars
 *   are matched by `name` (identifier targeting `byProperty`).
 * - Lists read one `properties()` record per item, with a guarded per-field
 *   fallback, and never guard the runtime identifier read.
 * - A child is created by appending it to the parent's collection, not with
 *   `make({ at: ... })`.
 * - The request parameter carrying an identifier (`id`, `name`) is distinct
 *   from the resource property that holds it (`uid`, `calendarIdentifier`).
 *
 * Every body must also reference no free identifier other than `app`, `args`,
 * and the standard ECMAScript built-ins, so it can be compiled once and invoked
 * many times by a long-lived automation process.
 *
 * @see ../../../../manifests/calendar/app.yaml
 * @see ../../../../manifests/notes/app.yaml
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4, worker compatibility)
 * @see https://tc39.es/ecma262/2011/#sec-15 (ES5 standard built-in objects)
 * @see https://github.com/mike-north/macts/issues/89
 */

import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'
import * as ts from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'
import { InternalError, ValidationError, type OperationTarget } from '@macts/contracts'
import { loadManifest } from '../manifest/loader.js'
import { resolveManifestRoutes } from '../manifest/route.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import type { Command } from '../manifest/schemas/command.js'
import type { Resource } from '../manifest/schemas/resource.js'
import {
  assertRequiredArguments,
  buildNativeBody,
  buildNestedTargetExpression,
  buildTargetExpression,
  planNativeInvocation,
} from './native-scripts.js'

const MANIFESTS_DIR = fileURLToPath(new URL('../../../../manifests/', import.meta.url))

function manifestPath(app: string): string {
  return `${MANIFESTS_DIR}${app}/app.yaml`
}

/** A minimal valid manifest holding `resources` and `commands`. */
function manifestWith(
  resources: Record<string, Resource>,
  commands: Record<string, Command>
): AppManifest {
  return {
    version: '1.0',
    app: { name: 'Test', bundleId: 'com.example.test', version: '1.0', tccEntitlements: [] },
    suites: [],
    resources,
    enums: {},
    hierarchy: { children: {} },
    relationships: [],
    commands,
  }
}

/** A resource-scoped command. */
function resourceCommand(
  name: string,
  resourceType: string,
  parameters: Command['parameters'] = []
): Command {
  return { name, description: name, scope: 'resource', resourceType, parameters }
}

/** A string parameter. */
function param(name: string, required = true): Command['parameters'][number] {
  return { name, type: 'string', description: name, required }
}

/**
 * Compile, without running, a body as the function `(app, args)` it is invoked
 * as. Throws on a syntax error.
 */
function compileBody(body: string): void {
  new Script(`(function (app, args) {\n${body}\n})`)
}

/** What a body threw, or `undefined` when it returned normally. */
function runBody(body: string, app: unknown, args: Record<string, unknown>): unknown {
  const compiled: unknown = new Script(`(function (app, args) {\n${body}\n})`).runInThisContext()
  if (typeof compiled !== 'function') throw new Error('body did not compile to a function')
  const fn = compiled as (app: unknown, args: Record<string, unknown>) => unknown
  try {
    fn(app, args)
    return undefined
  } catch (error) {
    return error
  }
}

/**
 * A stand-in for an app object specifier, recording what a body does with it.
 * `exists()` answers `present`; every other use is recorded in `used`, so a test
 * can assert that a missing specifier was never read, written, or deleted.
 */
interface FakeSpecifier {
  readonly used: string[]
  readonly specifier: Record<string, unknown>
}

function fakeSpecifier(present: boolean, children: Record<string, unknown> = {}): FakeSpecifier {
  const used: string[] = []
  const specifier: Record<string, unknown> = {
    exists: () => present,
    delete: () => used.push('delete'),
    properties: () => {
      used.push('properties')
      return {}
    },
    ...children,
  }
  return {
    used,
    specifier: new Proxy(specifier, {
      get(target, key, receiver) {
        if (typeof key === 'string' && !Object.hasOwn(target, key)) used.push(`read ${key}`)
        return Reflect.get(target, key, receiver) as unknown
      },
      set(target, key, value) {
        used.push(`write ${String(key)}`)
        return Reflect.set(target, key, value)
      },
    }),
  }
}

/**
 * The free identifiers of each body: names it references but neither declares
 * nor receives as `app` or `args`, and that are not standard ECMAScript (ES5)
 * built-ins.
 *
 * Each body is type-checked as the JavaScript function `(app, args)` in its
 * own module, against the ES5 standard library only (no host or Node types),
 * so every unresolved name is reported as "Cannot find name". Module scope
 * keeps bodies from resolving names in one another. A body that does not parse
 * fails here too.
 */
function freeIdentifiers(bodies: readonly string[]): string[][] {
  const options: ts.CompilerOptions = {
    allowJs: true,
    checkJs: true,
    noEmit: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.ESNext,
    lib: ['lib.es5.d.ts'],
    types: [],
  }
  const files = new Map(
    bodies.map((body, index) => [
      `/native-body-${String(index)}.js`,
      `function nativeBody(app, args) {\n${body}\n}\nexport {};\n`,
    ])
  )
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, ...rest) => {
    const text = files.get(fileName)
    return text === undefined
      ? getSourceFile(fileName, languageVersion, ...rest)
      : ts.createSourceFile(fileName, text, languageVersion, true, ts.ScriptKind.JS)
  }
  const fileExists = host.fileExists.bind(host)
  host.fileExists = (fileName) => files.has(fileName) || fileExists(fileName)
  const program = ts.createProgram([...files.keys()], options, host)

  return [...files.keys()].map((fileName) => {
    const sourceFile = program.getSourceFile(fileName)
    if (sourceFile === undefined) throw new Error(`Missing source file ${fileName}`)
    const syntax = program.getSyntacticDiagnostics(sourceFile)
    if (syntax.length > 0) {
      throw new Error(
        `A body does not parse: ${ts.flattenDiagnosticMessageText(syntax[0]?.messageText, '\n')}`
      )
    }
    return program
      .getSemanticDiagnostics(sourceFile)
      .filter((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n').startsWith('Cannot find name')
      )
      .map((diagnostic) =>
        sourceFile.text.slice(diagnostic.start, (diagnostic.start ?? 0) + (diagnostic.length ?? 0))
      )
  })
}

/** Build the list body for `resource` through a plain `list` command. */
/** A list body for `resource`, shaped for passthrough output unless `typed`. */
function listBody(resource: Resource, typed = false): string {
  const manifest = manifestWith(
    { [resource.name]: resource },
    {
      list: resourceCommand('list', resource.name),
    }
  )
  return buildNativeBody(
    manifest,
    { command: 'list', resource: resource.name },
    { identifierAliases: !typed }
  )
}

/** The Calendar Event resource: 13 properties plus the `uid` identifier. */
const eventResource: Resource = {
  name: 'Event',
  plural: 'Events',
  description: 'A calendar event',
  properties: {
    summary: { access: 'rw', type: 'string', description: 'Title', optional: false },
    description: { access: 'rw', type: 'string', description: 'Notes', optional: true },
    location: { access: 'rw', type: 'string', description: 'Location', optional: true },
    startDate: { access: 'rw', type: 'date', description: 'Start', optional: false },
    endDate: { access: 'rw', type: 'date', description: 'End', optional: false },
    alldayEvent: { access: 'rw', type: 'boolean', description: 'All-day', optional: false },
    recurrence: { access: 'r', type: 'string', description: 'Recurrence', optional: true },
    status: { access: 'rw', type: 'string', description: 'Status', optional: true },
    sequence: { access: 'r', type: 'number', description: 'Sequence', optional: true },
    stampDate: { access: 'r', type: 'date', description: 'Stamp date', optional: true },
    excludedDates: { access: 'r', type: 'string', description: 'Excluded', optional: true },
    url: { access: 'rw', type: 'string', description: 'URL', optional: true },
    uid: { access: 'r', type: 'string', description: 'Unique id', optional: false },
  },
  identifiers: [{ property: 'uid', primary: true }],
}

/** A multi-property resource targeted by `name` (like the shipped Calendar). */
const widgetByProperty: Resource = {
  name: 'Widget',
  plural: 'Widgets',
  description: 'A widget',
  properties: {
    name: { access: 'rw', type: 'string', description: 'Name', optional: false },
    color: { access: 'rw', type: 'string', description: 'Color', optional: true },
    size: { access: 'r', type: 'number', description: 'Size', optional: true },
    active: { access: 'rw', type: 'boolean', description: 'Active', optional: true },
  },
  identifiers: [{ property: 'name', primary: true, targeting: 'byProperty' }],
}

const calendarProperties: Resource['properties'] = {
  name: { access: 'rw', type: 'string', description: 'Title', optional: false },
  calendarIdentifier: { access: 'r', type: 'string', description: 'Key', optional: false },
}

/** Identifier declared both as a property and in `identifiers`, targeted by id. */
const calendarById: Resource = {
  name: 'Calendar',
  plural: 'Calendars',
  description: 'A calendar',
  properties: calendarProperties,
  identifiers: [{ property: 'calendarIdentifier', primary: true }],
}

/** Targeted by the working `name`, which is also the primary identifier property. */
const calendarByName: Resource = {
  ...calendarById,
  identifiers: [{ property: 'name', primary: true, targeting: 'byProperty' }],
}

/** Declared identifier fails at run time; matched on the distinct `runtimeProperty`. */
const calendarByRuntimeProperty: Resource = {
  ...calendarById,
  identifiers: [
    {
      property: 'calendarIdentifier',
      primary: true,
      targeting: 'byProperty',
      runtimeProperty: 'name',
    },
  ],
}

let calendar: AppManifest
let notes: AppManifest

beforeAll(async () => {
  calendar = await loadManifest(manifestPath('calendar'))
  notes = await loadManifest(manifestPath('notes'))
})

describe('list bodies: batched reads (issue #89)', () => {
  it('reads each item through one properties() call', () => {
    expect(listBody(eventResource)).toContain('var props = item.properties();')
  })

  it('copies every non-identifier property from the record in the fast path', () => {
    const body = listBody(eventResource)
    for (const prop of Object.keys(eventResource.properties).filter((p) => p !== 'uid')) {
      expect(body, prop).toContain(
        `if (props["${prop}"] !== undefined) { obj["${prop}"] = props["${prop}"]; }`
      )
    }
  })

  it('falls back to guarded per-field reads for every non-identifier property', () => {
    const body = listBody(eventResource)
    expect(body).toContain('} catch (e) {')
    for (const prop of Object.keys(eventResource.properties).filter((p) => p !== 'uid')) {
      expect(body, prop).toContain(`try { obj["${prop}"] = item["${prop}"](); } catch (e) {}`)
    }
  })

  it('reads the identifier unguarded in both paths (issue #81)', () => {
    const body = listBody(eventResource)
    expect(body).toContain('obj["uid"] = props["uid"];')
    expect(body).toContain('obj["uid"] = item["uid"]();')
    expect(body).not.toContain('try { obj["uid"] = props["uid"]; } catch')
    expect(body).not.toContain('try { obj["uid"] = item["uid"](); } catch')
  })

  it('exposes the identifier under the canonical id key', () => {
    expect(listBody(eventResource)).toContain('obj["id"] = obj["uid"];')
  })

  it('batches byProperty resources too, with both paths', () => {
    const body = listBody(widgetByProperty)
    expect(body).toContain('var props = item.properties();')
    for (const prop of ['color', 'size', 'active']) {
      expect(body, prop).toContain(`obj["${prop}"] = props["${prop}"];`)
      expect(body, prop).toContain(`try { obj["${prop}"] = item["${prop}"](); } catch (e) {}`)
    }
    expect(body).toContain('obj["id"] = obj["name"];')
  })

  it('lists the top-level collection when there is no parent parameter', () => {
    expect(listBody(eventResource)).toContain('var items = app["events"]();')
  })
})

describe('list bodies: typed output returns only declared fields', () => {
  // A typed record contract derives references from the record itself. Its
  // encode drops an undeclared `id` alias silently, and would accept a mirrored
  // identifier field holding another property's value, so the body must not
  // produce the legacy aliases at all.
  it('omits the id alias for a byId resource', () => {
    const body = listBody(calendarById, true)
    expect(body).toContain('obj["calendarIdentifier"] = item["calendarIdentifier"]();')
    expect(body).not.toContain('obj["id"]')
  })

  it('leaves the declared identifier absent instead of mirroring the working property', () => {
    const body = listBody(calendarByRuntimeProperty, true)
    expect(body).toContain('obj["name"] = props["name"];')
    expect(body).not.toContain('obj["id"]')
    expect(body).not.toContain('obj["calendarIdentifier"] =')
  })
})

describe('list bodies: identifier population', () => {
  it('reads a byId primary identifier and aliases it as id', () => {
    const body = listBody(calendarById)
    expect(body).toContain('obj["calendarIdentifier"] = props["calendarIdentifier"];')
    expect(body).toContain('obj["calendarIdentifier"] = item["calendarIdentifier"]();')
    expect(body).not.toContain('try { obj["calendarIdentifier"] = item["calendarIdentifier"](); }')
    expect(body).toContain('obj["id"] = obj["calendarIdentifier"];')
  })

  it('sources id from the working property for a byProperty resource', () => {
    const body = listBody(calendarByName)
    expect(body).toContain('obj["name"] = props["name"];')
    expect(body).toContain('obj["name"] = item["name"]();')
    expect(body).not.toContain('try { obj["name"] = item["name"](); }')
    expect(body).toContain('obj["id"] = obj["name"];')
  })

  it('never reads a declared identifier that fails at run time, and mirrors it instead', () => {
    const body = listBody(calendarByRuntimeProperty)
    expect(body).not.toContain('item["calendarIdentifier"]()')
    expect(body).not.toContain('props["calendarIdentifier"]')
    expect(body).toContain('obj["name"] = props["name"];')
    expect(body).toContain('obj["id"] = obj["name"];')
    expect(body).toContain('obj["calendarIdentifier"] = obj["name"];')
  })

  it('includes an identifier declared only under identifiers', () => {
    const body = listBody({
      name: 'Calendar',
      plural: 'Calendars',
      description: 'A calendar',
      properties: {
        name: { access: 'rw', type: 'string', description: 'Title', optional: false },
      },
      identifiers: [{ property: 'calendarIdentifier', primary: true }],
    })
    expect(body).toContain('obj["calendarIdentifier"] = props["calendarIdentifier"];')
    expect(body).toContain('obj["calendarIdentifier"] = item["calendarIdentifier"]();')
    expect(body).toContain('obj["id"] = obj["calendarIdentifier"];')
  })

  it('emits no id alias for a resource with no identifier', () => {
    const body = listBody({
      name: 'Widget',
      plural: 'Widgets',
      description: 'An identifier-less widget',
      properties: {
        label: { access: 'rw', type: 'string', description: 'Label', optional: false },
      },
    })
    expect(body).toContain('obj["label"] = props["label"];')
    expect(body).toContain('try { obj["label"] = item["label"](); } catch (e) {}')
    expect(body).not.toContain('obj["id"] =')
  })

  it('reads name from an undeclared resource', () => {
    const manifest = manifestWith(
      { Item: widgetByProperty },
      {
        list: resourceCommand('list', 'Missing'),
      }
    )
    const body = buildNativeBody(manifest, { command: 'list', resource: 'Missing' })
    expect(body).toContain('var items = app["items"]();')
    expect(body).toContain('obj["name"] = props["name"];')
    expect(body).toContain('try { obj["name"] = item["name"](); } catch (e) {}')
    expect(body).not.toContain('obj["id"] =')
  })
})

describe('target expressions', () => {
  it('addresses by id by default', () => {
    expect(buildTargetExpression(eventResource, 'events', 'itemId')).toBe(
      'app["events"].byId(itemId)'
    )
  })

  it('matches on the targeting property for byProperty', () => {
    expect(buildTargetExpression(calendarByName, 'calendars', 'itemId')).toBe(
      'app["calendars"].whose({ "name": itemId })[0]'
    )
  })

  it('matches on runtimeProperty when one is declared', () => {
    expect(buildTargetExpression(calendarByRuntimeProperty, 'calendars', 'parentId')).toBe(
      'app["calendars"].whose({ "name": parentId })[0]'
    )
  })

  it('falls back to byId for a resource with no identifier, or none at all', () => {
    const widget: Resource = { name: 'W', plural: 'Ws', description: 'w', properties: {} }
    expect(buildTargetExpression(widget, 'ws', 'itemId')).toBe('app["ws"].byId(itemId)')
    expect(buildTargetExpression(undefined, 'items', 'itemId')).toBe('app["items"].byId(itemId)')
  })

  it('addresses a nested child through its parent', () => {
    expect(buildNestedTargetExpression('parent', 'events', 'itemId')).toBe(
      'parent["events"].byId(itemId)'
    )
  })
})

describe('Calendar bodies (shipped manifest)', () => {
  const body = (command: string, resource: string): string =>
    buildNativeBody(calendar, { command, resource })

  it('getEvent reads both identifiers from args and reaches the event through its calendar', () => {
    const text = body('getEvent', 'Event')
    expect(text).toContain('var parentId = args["calendarId"];')
    expect(text).toContain('var itemId = args["id"];')
    expect(text).toContain('var parent = app["calendars"].whose({ "name": parentId })[0];')
    expect(text).toContain('var item = parent["events"].byId(itemId);')
    // The request parameter is `id`, never the `uid` property.
    expect(text).not.toContain('args["uid"]')
    expect(text).not.toContain('app["events"]')
  })

  it('get (Calendar) matches the calendar by name with the `id` parameter', () => {
    const text = body('get', 'Calendar')
    expect(text).toContain('var itemId = args["id"];')
    expect(text).toContain('var item = app["calendars"].whose({ "name": itemId })[0];')
    expect(text).not.toContain('.byId(')
    expect(text).not.toContain('whose({ "calendarIdentifier"')
    expect(text).not.toContain('args["calendarIdentifier"]')
  })

  it('get reads each declared property with its own guard', () => {
    const text = body('get', 'Calendar')
    expect(text).toContain('try { obj["name"] = item["name"](); } catch (e) {}')
    expect(text).toContain('return obj;')
  })

  // A missing singular target must fail, never read as `{}` (phases/13 A5).
  // Before the existence check, every read was guarded, so a get by an unknown
  // identifier returned an empty record.
  it('get fails with the no-such-object number before any read when the item is missing', () => {
    const text = body('get', 'Calendar')
    const check = text.indexOf('if (!item.exists()) {')
    expect(check).toBeGreaterThan(text.indexOf('var item = '))
    expect(check).toBeLessThan(text.indexOf('var obj = {};'))
    expect(text).toContain('missing.errorNumber = -1728;')
    expect(text).toContain('throw missing;')
  })

  it('listEvents scopes the list to the parent calendar matched by name', () => {
    const text = body('listEvents', 'Event')
    expect(text).toContain('var parentId = args["calendarId"];')
    expect(text).toContain('var parent = app["calendars"].whose({ "name": parentId })[0];')
    expect(text).toContain('var items = parent["events"]();')
  })

  it('createEvent appends the new event to the parent calendar (-10024 regression)', () => {
    const text = body('createEvent', 'Event')
    expect(text).toContain('var parentId = args["calendarId"];')
    expect(text).toContain('var parent = app["calendars"].whose({ "name": parentId })[0];')
    expect(text).toContain('var item = app["Event"](props);')
    expect(text).toContain('parent["events"].push(item);')
    expect(text).not.toContain('make({ at')
    expect(text).toContain('return item.properties();')
  })

  it('createEvent rehydrates date parameters as Date objects', () => {
    const text = body('createEvent', 'Event')
    expect(text).toContain('props["startDate"] = new Date(args["startDate"]);')
    expect(text).toContain('props["endDate"] = new Date(args["endDate"]);')
  })

  it('createEvent keeps non-date parameters as read, and only when supplied', () => {
    const text = body('createEvent', 'Event')
    expect(text).toContain(
      'if (Object.prototype.hasOwnProperty.call(args, "summary")) { props["summary"] = args["summary"]; }'
    )
    expect(text).not.toContain('new Date(args["summary"])')
    // The parent identifier is not a property of the new event.
    expect(text).not.toContain('props["calendarId"]')
  })

  it('updateEvent sets each supplied field, guarded, on the parent-scoped event', () => {
    const text = body('updateEvent', 'Event')
    expect(text).toContain('var parent = app["calendars"].whose({ "name": parentId })[0];')
    expect(text).toContain('var item = parent["events"].byId(itemId);')
    expect(text).toContain(
      'if (Object.prototype.hasOwnProperty.call(args, "summary")) { try { item["summary"] = args["summary"]; } catch (e) {} }'
    )
    expect(text).not.toContain('item["id"] =')
    expect(text).not.toContain('item["calendarId"] =')
    expect(text).toContain('return item.properties();')
  })

  it('deleteEvent deletes the parent-scoped event', () => {
    const text = body('deleteEvent', 'Event')
    expect(text).toContain('var parent = app["calendars"].whose({ "name": parentId })[0];')
    expect(text).toContain('var item = parent["events"].byId(itemId);')
    expect(text).toContain('item.delete();')
    expect(text).toContain('return null;')
  })

  it('create (Calendar) creates at the top level, since its required name is a property', () => {
    const text = body('create', 'Calendar')
    expect(text).not.toContain('parent')
    expect(text).toContain('var item = app["Calendar"](props);')
    expect(text).toContain('item.make();')
  })
})

// A missing target, or a missing parent of a scoped operation, is a missing
// object (phases/13 D6), never an invalid selection or an empty result. Without
// the existence check, a property match (`whose(...)[0]`) that matches nothing
// fails with -1719 (invalid index) when first used, and a missing parent's
// child collection reads as empty. Each body here is executed against fake
// specifiers: the miss must throw the no-such-object number before the missing
// specifier is read, written, or deleted.
describe('missing targets and parents fail as no such object', () => {
  const NO_SUCH_OBJECT = -1728

  /** A top-level resource matched by a property, like Calendar's calendars. */
  const widget: Resource = {
    name: 'Widget',
    plural: 'Widgets',
    description: 'w',
    identifiers: [{ property: 'name', primary: true, targeting: 'byProperty' }],
    properties: {
      name: { access: 'rw', type: 'string', description: 'n', optional: false },
      label: { access: 'rw', type: 'string', description: 'l', optional: true },
    },
  }
  const widgets = manifestWith(
    { Widget: widget },
    {
      update: resourceCommand('update', 'Widget', [param('id'), param('label', false)]),
      delete: resourceCommand('delete', 'Widget', [param('id')]),
    }
  )
  const widgetApp = (item: FakeSpecifier) => ({ widgets: { whose: () => [item.specifier] } })

  function expectNoSuchObject(thrown: unknown): void {
    expect(thrown).toMatchObject({ errorNumber: NO_SUCH_OBJECT })
  }

  it('delete of a property-matched item that matches nothing never deletes', () => {
    const item = fakeSpecifier(false)
    const body = buildNativeBody(widgets, { command: 'delete', resource: 'Widget' })
    expectNoSuchObject(runBody(body, widgetApp(item), { id: 'Nope' }))
    expect(item.used).toEqual([])
  })

  it('delete of an existing item deletes it', () => {
    const item = fakeSpecifier(true)
    const body = buildNativeBody(widgets, { command: 'delete', resource: 'Widget' })
    expect(runBody(body, widgetApp(item), { id: 'Kept' })).toBeUndefined()
    expect(item.used).toEqual(['delete'])
  })

  it('update of a property-matched item that matches nothing writes nothing', () => {
    const item = fakeSpecifier(false)
    const body = buildNativeBody(widgets, { command: 'update', resource: 'Widget' })
    expectNoSuchObject(runBody(body, widgetApp(item), { id: 'Nope', label: 'x' }))
    expect(item.used).toEqual([])
  })

  describe('Calendar events, scoped to a calendar matched by name', () => {
    const calendarApp = (parent: FakeSpecifier) => ({
      calendars: { whose: () => [parent.specifier] },
      Event: () => ({}),
    })
    const eventArgs = { calendarId: 'Nope', id: 'E1', summary: 's' }

    it.each(['getEvent', 'updateEvent', 'deleteEvent', 'listEvents', 'createEvent'])(
      '%s under a calendar that does not exist never touches its events',
      (command) => {
        const parent = fakeSpecifier(false)
        const body = buildNativeBody(calendar, { command, resource: 'Event' })
        const args =
          command === 'createEvent'
            ? {
                calendarId: 'Nope',
                summary: 's',
                startDate: '2024-01-15T10:00:00.000Z',
                endDate: '2024-01-15T11:00:00.000Z',
              }
            : eventArgs
        expectNoSuchObject(runBody(body, calendarApp(parent), args))
        expect(parent.used).toEqual([])
      }
    )

    it.each(['getEvent', 'updateEvent', 'deleteEvent'])(
      '%s of an event that does not exist in an existing calendar never touches the event',
      (command) => {
        const item = fakeSpecifier(false)
        const parent = fakeSpecifier(true, { events: { byId: () => item.specifier } })
        const body = buildNativeBody(calendar, { command, resource: 'Event' })
        expectNoSuchObject(runBody(body, calendarApp(parent), eventArgs))
        expect(item.used).toEqual([])
      }
    )
  })
})

describe('identifier parameter names (issue #26)', () => {
  it('Notes get reads the `name` parameter, not `id`', () => {
    const text = buildNativeBody(notes, { command: 'get', resource: 'Note' })
    expect(text).toContain('var itemId = args["name"];')
    expect(text).toContain('app["notes"].byId(itemId)')
    expect(text).not.toContain('args["id"]')
  })

  it('delete reads its declared identifier parameter', () => {
    const manifest = manifestWith(
      {
        Widget: {
          name: 'Widget',
          plural: 'widgets',
          description: 'w',
          properties: { name: { access: 'r', type: 'string', description: 'n', optional: false } },
        },
      },
      { deleteWidget: resourceCommand('delete', 'Widget', [param('widgetName')]) }
    )
    const text = buildNativeBody(manifest, { command: 'deleteWidget', resource: 'Widget' })
    expect(text).toContain('var itemId = args["widgetName"];')
    expect(text).toContain('var item = app["widgets"].byId(itemId);')
    expect(text).toContain('item.delete();')
    expect(text).not.toContain('args["id"]')
  })

  it('delete with no required identifier calls the command on the app', () => {
    const manifest = manifestWith(
      {
        DiskItem: { name: 'DiskItem', plural: 'diskItems', description: 'd', properties: {} },
      },
      { delete: resourceCommand('delete', 'DiskItem') }
    )
    const text = buildNativeBody(manifest, { command: 'delete', resource: 'DiskItem' })
    expect(text).toContain('var result = app["delete"]();')
    expect(text).not.toContain('.byId(')
  })

  it('get with an `id` parameter addresses by id', () => {
    const manifest = manifestWith(
      { Entry: { name: 'Entry', plural: 'entries', description: 'e', properties: {} } },
      { get: resourceCommand('get', 'Entry', [param('id')]) }
    )
    const text = buildNativeBody(manifest, { command: 'get', resource: 'Entry' })
    expect(text).toContain('var itemId = args["id"];')
    expect(text).toContain('app["entries"].byId(itemId)')
  })
})

describe('command calls', () => {
  const appCommand = (parameters: Command['parameters']): AppManifest =>
    manifestWith(
      { Item: { name: 'Item', plural: 'items', description: 'i', properties: {} } },
      { open: { name: 'open', description: 'open', scope: 'application', parameters } }
    )

  it('calls a parameterless application command with no arguments', () => {
    expect(buildNativeBody(appCommand([]), { command: 'open' })).toBe('return app["open"]();')
  })

  it('passes supplied parameters as the named-parameter record, rehydrating dates', () => {
    const text = buildNativeBody(
      appCommand([param('path'), { name: 'at', type: 'date', description: 'at', required: false }]),
      { command: 'open' }
    )
    expect(text).toContain('params["path"] = args["path"];')
    expect(text).toContain('params["at"] = new Date(args["at"]);')
    expect(text).toContain(
      'return Object.keys(params).length > 0 ? app["open"](params) : app["open"]();'
    )
  })

  it('calls any other resource command on the app', () => {
    const text = buildNativeBody(notes, { command: 'show', resource: 'Note' })
    expect(text).toContain('params["name"] = args["name"];')
    expect(text).toContain('var result = Object.keys(params).length > 0 ? app["show"](params)')
    expect(text).toContain('return result;')
  })
})

describe('source safety', () => {
  it('emits manifest names as string literals, so an odd key cannot alter the script', () => {
    // A key with a quote, a closing bracket, and a backslash: characters that
    // would end a string literal or a member access if they were spliced in raw.
    const oddKey = 'display "name"] \\ v2'
    const manifest = manifestWith(
      {
        Odd: {
          name: 'Odd',
          plural: 'Odds',
          description: 'o',
          properties: {
            [oddKey]: { access: 'rw', type: 'string', description: 'h', optional: true },
          },
        },
      },
      { get: resourceCommand('get', 'Odd', [param(oddKey)]) }
    )
    const text = buildNativeBody(manifest, { command: 'get', resource: 'Odd' })
    expect(text).toContain(`args[${JSON.stringify(oddKey)}]`)
    expect(text).toContain(`obj[${JSON.stringify(oddKey)}] = item[${JSON.stringify(oddKey)}]();`)
    expect(() => {
      compileBody(text)
    }).not.toThrow()
  })

  it('builds a syntactically valid body for every operation of every shipped manifest', async () => {
    const apps = readdirSync(MANIFESTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    expect(apps.length).toBeGreaterThan(0)
    for (const app of apps) {
      const manifest = await loadManifest(manifestPath(app))
      for (const route of resolveManifestRoutes(manifest)) {
        const target: OperationTarget =
          route.resourceType === undefined
            ? { command: route.commandKey }
            : { command: route.commandKey, resource: route.resourceType }
        const text = buildNativeBody(manifest, target)
        expect(() => {
          compileBody(text)
        }, route.route).not.toThrow()
      }
    }
  })
})

describe('free identifiers', () => {
  it('detects names a body neither declares nor receives', () => {
    const [free] = freeIdentifiers([
      [
        'var local = args.x;',
        'leaked = local;',
        'delay(1);',
        'var other = Application("com.apple.finder");',
        'return value + __mactsDecode(local, null);',
      ].join('\n'),
    ])
    expect(free?.sort()).toEqual(['Application', '__mactsDecode', 'delay', 'leaked', 'value'])
  })

  it('accepts app, args, locals, and standard built-ins', () => {
    const body = [
      'var missing = new Error(JSON.stringify(Object.keys(args)));',
      'var when = new Date(args.at);',
      'try { app.windows(); } catch (e) { throw missing; }',
      'return [when, Math.max(1, 2), String(app)];',
    ].join('\n')
    expect(freeIdentifiers([body])).toEqual([[]])
  })

  it('finds none in any body of any shipped manifest', async () => {
    const apps = readdirSync(MANIFESTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    const routes: string[] = []
    const bodies: string[] = []
    for (const app of apps) {
      const manifest = await loadManifest(manifestPath(app))
      for (const route of resolveManifestRoutes(manifest)) {
        const target: OperationTarget =
          route.resourceType === undefined
            ? { command: route.commandKey }
            : { command: route.commandKey, resource: route.resourceType }
        routes.push(route.route)
        bodies.push(buildNativeBody(manifest, target))
      }
    }
    expect(bodies.length).toBeGreaterThan(0)
    const offenders = freeIdentifiers(bodies)
      .map((free, index) => ({ route: routes[index], free }))
      .filter(({ free }) => free.length > 0)
    expect(offenders).toEqual([])
  }, 60000)
})

describe('required arguments', () => {
  it('requires the parent and child identifiers of a nested get', () => {
    expect(
      planNativeInvocation(calendar, { command: 'getEvent', resource: 'Event' }).requiredArguments
    ).toEqual(['calendarId', 'id'])
  })

  it('requires `id` for a get that declares no identifier parameter', () => {
    const manifest = manifestWith(
      { Entry: { name: 'Entry', plural: 'entries', description: 'e', properties: {} } },
      { get: resourceCommand('get', 'Entry') }
    )
    expect(
      planNativeInvocation(manifest, { command: 'get', resource: 'Entry' }).requiredArguments
    ).toEqual(['id'])
  })

  it('accepts input that supplies every required key', () => {
    expect(() => {
      assertRequiredArguments(['calendarId', 'id'], { calendarId: 'Work', id: 'E1' })
    }).not.toThrow()
  })

  it('rejects a missing key with a ValidationError naming it', () => {
    const error: unknown = (() => {
      try {
        assertRequiredArguments(['calendarId', 'id'], { calendarId: 'Work' })
        return undefined
      } catch (thrown) {
        return thrown
      }
    })()
    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues).toEqual([
      { path: ['id'], message: 'Required parameter is missing' },
    ])
  })

  it('treats inherited keys and undefined values as missing', () => {
    expect(() => {
      assertRequiredArguments(['toString'], {})
    }).toThrow(ValidationError)
    expect(() => {
      assertRequiredArguments(['id'], { id: undefined })
    }).toThrow(ValidationError)
  })
})

describe('unknown commands', () => {
  it('throws InternalError when the target names no manifest command', () => {
    expect(() => buildNativeBody(calendar, { command: 'nope', resource: 'Event' })).toThrow(
      InternalError
    )
  })

  it('does not resolve a command through the object prototype', () => {
    expect(() => buildNativeBody(calendar, { command: 'toString' })).toThrow(InternalError)
  })
})
