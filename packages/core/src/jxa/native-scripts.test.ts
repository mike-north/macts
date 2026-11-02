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
 *   an event address it through the parent calendar, as the manifest records
 *   it (`command.parent`); a command with no recorded parent addresses its
 *   resource at the application, whatever its parameters are named.
 * - A Calendar calendar's declared identifier fails at run time, so calendars
 *   are matched by `name` (identifier targeting `byProperty`).
 * - Lists read one `properties()` record per item, with a guarded per-field
 *   fallback, and never guard the runtime identifier read.
 * - A child is created by appending it to the parent's collection, not with
 *   `make({ at: ... })`.
 * - The request parameter carrying an identifier (`id`, `name`) is distinct
 *   from the resource property that holds it (`uid`, `calendarIdentifier`).
 * - A collection is addressed by the app's own spelling of its dictionary
 *   term: the first word lowercased whole, each later word capitalized
 *   ("media items" is `mediaItems`, "URL tracks" is `urlTracks`). Calendar's
 *   `events[0].displayAlarms` resolves while `displayalarms` does not.
 *
 * Every body must also reference no free identifier other than `app`, `args`,
 * and the standard ECMAScript built-ins, so it can be compiled once and invoked
 * many times by a long-lived automation process.
 *
 * @see ../../../../manifests/calendar/app.yaml
 * @see ../../../../manifests/notes/app.yaml
 * @see https://github.com/mike-north/macts/issues/165
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4, worker compatibility)
 * @see https://tc39.es/ecma262/2011/#sec-15 (ES5 standard built-in objects)
 * @see https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/OSX10-10.html
 *   (how the automation bridge spells dictionary terms: camel case, first word
 *   lowercased)
 * @see https://github.com/mike-north/macts/issues/89
 */

import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'
import * as ts from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'
import { InternalError, ValidationError, type OperationTarget } from '@macts/contracts'
import { loadManifest, parseManifestYaml } from '../manifest/loader.js'
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
import {
  defaultCollectionAccessor,
  resolveCollectionAccessor,
  resolvePropertyAccessor,
} from '../manifest/native-accessor.js'

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

/** Run a body as `(app, args)` and return what it returns. */
function callBody(body: string, app: unknown, args: Record<string, unknown>): unknown {
  const compiled: unknown = new Script(`(function (app, args) {\n${body}\n})`).runInThisContext()
  if (typeof compiled !== 'function') throw new Error('body did not compile to a function')
  return (compiled as (app: unknown, args: Record<string, unknown>) => unknown)(app, args)
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

describe('usable properties: a property marked unsupported is never read', () => {
  // manifests/finder/app.yaml: Container declares `entireContents` and four
  // properties the probe marked unsupported, `expandable`, `expanded`,
  // `completelyExpanded` (every read fails with -1728) and `containerWindow`
  // (an object reference). It declares no identifier, so the one property a
  // body reads is `entireContents`.
  let manifest: AppManifest
  beforeAll(async () => {
    const finder = await loadManifest(manifestPath('finder'))
    const container = finder.resources['Container']
    if (container === undefined) throw new Error('Finder Container not found')
    manifest = manifestWith(
      { Container: container },
      {
        list: resourceCommand('list', 'Container'),
        get: resourceCommand('get', 'Container', [param('id')]),
      }
    )
  })

  it('a get copies only usable fields from the property record, in one read', () => {
    // The record holds the unsupported properties too; only entireContents is
    // usable.
    const item = fakeSpecifier(true, {
      properties: () => {
        item.used.push('properties')
        return {
          entireContents: 'contents',
          expandable: true,
          expanded: false,
          completelyExpanded: false,
          containerWindow: 'window',
        }
      },
    })
    const app = { containers: { byId: () => item.specifier } }
    const body = buildNativeBody(manifest, { command: 'get', resource: 'Container' })
    expect(callBody(body, app, { id: 'c1' })).toEqual({ entireContents: 'contents' })
    // The one round trip is the record read; no property is read on its own.
    expect(item.used).toEqual(['properties'])
  })

  it('a get reads on its own a usable property the app leaves out of its record', () => {
    // Regression: a get read only the property record, so it dropped
    // entireContents, which Finder can report but leaves out of a container's
    // properties(). Live, Finder's record for the home folder has bounds,
    // class, comment, container, containerWindow, creationDate, … and no
    // entireContents. The stand-in record is a subset of those keys.
    const item = fakeSpecifier(true, {
      properties: () => {
        item.used.push('properties')
        return { class: 'folder', containerWindow: 'window', name: 'home', url: 'file:///' }
      },
      entireContents: () => {
        item.used.push('read entireContents')
        return 'contents'
      },
    })
    const app = { containers: { byId: () => item.specifier } }
    const body = buildNativeBody(manifest, { command: 'get', resource: 'Container' })
    expect(callBody(body, app, { id: 'c1' })).toEqual({ entireContents: 'contents' })
    expect(item.used).toEqual(['properties', 'read entireContents'])
  })

  it('a get takes a property the record holds with no value without reading it again', () => {
    // An app reports a property it has no value for as null in its record:
    // present, so it is not read on its own.
    const item = fakeSpecifier(true, {
      properties: () => {
        item.used.push('properties')
        return { entireContents: null }
      },
    })
    const app = { containers: { byId: () => item.specifier } }
    const body = buildNativeBody(manifest, { command: 'get', resource: 'Container' })
    expect(callBody(body, app, { id: 'c1' })).toEqual({ entireContents: null })
    expect(item.used).toEqual(['properties'])
  })

  it('a get falling back to per-field reads reads only usable properties', () => {
    const item = fakeSpecifier(true, {
      properties: () => {
        throw new Error('the property record cannot be read')
      },
    })
    const app = { containers: { byId: () => item.specifier } }
    const body = buildNativeBody(manifest, { command: 'get', resource: 'Container' })
    // The stand-in has no entireContents, so its guarded read is omitted.
    expect(callBody(body, app, { id: 'c1' })).toEqual({})
    expect(item.used).toEqual(['read entireContents'])
  })

  it('a list falling back to per-field reads reads only usable properties', () => {
    const item = fakeSpecifier(true, {
      properties: () => {
        throw new Error('the property record cannot be read')
      },
    })
    const app = { containers: () => [item.specifier] }
    const body = buildNativeBody(manifest, { command: 'list', resource: 'Container' })
    expect(callBody(body, app, {})).toEqual([{}])
    expect(item.used).toEqual(['read entireContents'])
  })

  it('a list copies only usable fields from the property record', () => {
    const item = fakeSpecifier(true, {
      properties: () => ({
        entireContents: 'contents',
        expandable: true,
        expanded: false,
        completelyExpanded: false,
        containerWindow: 'window',
      }),
    })
    const app = { containers: () => [item.specifier] }
    const body = buildNativeBody(manifest, { command: 'list', resource: 'Container' })
    expect(callBody(body, app, {})).toEqual([{ entireContents: 'contents' }])
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

describe('collection accessors', () => {
  // Each expected accessor is the app's spelling of the sdef plural term,
  // lowercasing the first word whole: Photos "media items", Calendar "display
  // alarms", Music/TV "URL tracks" and "EQ presets", System Events "UI
  // elements" and "XML data".
  it.each([
    ['Calendars', 'calendars'],
    ['MediaItems', 'mediaItems'],
    ['DisplayAlarms', 'displayAlarms'],
    ['WorkspaceDocuments', 'workspaceDocuments'],
    ['URLTracks', 'urlTracks'],
    ['EQPresets', 'eqPresets'],
    ['UIElements', 'uiElements'],
    ['XMLDatas', 'xmlDatas'],
  ])('spells %s as %s', (plural, accessor) => {
    expect(defaultCollectionAccessor(plural)).toBe(accessor)
  })

  it('lowercases a plural that is a single acronym, with or without its plural s', () => {
    expect(defaultCollectionAccessor('URLS')).toBe('urls')
    expect(defaultCollectionAccessor('URLs')).toBe('urls')
  })

  describe('Photos media items (shipped manifest)', () => {
    let photos: AppManifest
    beforeAll(async () => {
      photos = await loadManifest(manifestPath('photos'))
    })

    it('lists the mediaItems collection, never the lowercased name', () => {
      const text = buildNativeBody(photos, { command: 'listMediaItems', resource: 'MediaItem' })
      expect(text).toContain('var items = app["mediaItems"]();')
      expect(text).not.toContain('mediaitems')
    })

    it('gets a media item from the mediaItems collection by id', () => {
      const text = buildNativeBody(photos, { command: 'getMediaItem', resource: 'MediaItem' })
      expect(text).toContain('var item = app["mediaItems"].byId(itemId);')
      expect(text).not.toContain('mediaitems')
    })
  })

  describe('multi-word parents', () => {
    const folder: Resource = {
      name: 'BookmarkFolder',
      plural: 'BookmarkFolders',
      description: 'f',
      properties: {},
    }
    const bookmark: Resource = {
      name: 'BookmarkItem',
      plural: 'BookmarkItems',
      description: 'b',
      properties: {},
    }

    it('addresses a recorded parent and its child by their camel-case accessors', () => {
      const manifest = manifestWith(
        { BookmarkFolder: folder, BookmarkItem: bookmark },
        {
          get: {
            ...resourceCommand('get', 'BookmarkItem', [param('folderId'), param('id')]),
            parent: { resource: 'BookmarkFolder', parameter: 'folderId' },
          },
        }
      )
      const text = buildNativeBody(manifest, { command: 'get', resource: 'BookmarkItem' })
      expect(text).toContain('var parentId = args["folderId"];')
      expect(text).toContain('app["bookmarkFolders"].byId(parentId)')
      expect(text).toContain('parent["bookmarkItems"].byId(itemId)')
    })
  })
})

/**
 * Parents are recorded, never guessed (issue #165). Each expected expression is
 * written by hand from the manifest's `parent` and the parent resource: its
 * collection accessor (the plural's lower camel case, as no shipped parent
 * records a native spelling), and its identifier targeting (a `byId` lookup,
 * except Calendar's calendars, matched by `name`). The parent's class in the
 * app's dictionary has the child as an element:
 *
 * - Microsoft Edge (a Chromium dictionary, as Google Chrome's): "bookmark
 *   folder" has "bookmark folder" and "bookmark item" elements; "window" has
 *   "tab" elements.
 * - Xcode: "workspace document" has "project", "scheme" and "run
 *   destination" elements; the application has none of the three.
 * - Automator, from its scripting suite (Automator.scriptSuite, as the app
 *   ships no static scripting definition): "workflow" has "Automator
 *   action" and "variable" elements; "Automator action" has "setting" and
 *   "required resource" elements, which the application does not have.
 *
 * Xcode's workspace documents and Automator's workflows have no `id`
 * property, so each is targeted by name (`whose`), as their manifests declare.
 *
 * Before parents were recorded, the parent was guessed from the parameter's
 * stem, and the eight commands marked `regression` addressed a collection
 * their app does not have (`folders`, `workspaceNames`, `workflowNames`,
 * `actions`).
 *
 * @see https://github.com/mike-north/macts/issues/165
 */
describe('recorded command parents (issue #165)', () => {
  const manifests = new Map<string, AppManifest>()
  beforeAll(async () => {
    for (const app of [
      'automator',
      'calendar',
      'microsoft-edge',
      'omnigraffle',
      'reminders',
      'xcode',
    ]) {
      manifests.set(app, await loadManifest(manifestPath(app)))
    }
  })
  const bodyOf = (app: string, command: string, resource: string): string => {
    const manifest = manifests.get(app)
    if (manifest === undefined) throw new Error(`no manifest loaded for ${app}`)
    return buildNativeBody(manifest, { command, resource })
  }

  const calendarParent = 'app["calendars"].whose({ "name": parentId })[0]'
  const PARENTS = [
    // The eight commands whose guessed parent did not exist in the app.
    [
      'regression',
      'microsoft-edge',
      'listBookmarkItems',
      'BookmarkItem',
      'folderId',
      'app["bookmarkFolders"].byId(parentId)',
      'var items = parent["bookmarkItems"]();',
    ],
    [
      'regression',
      'xcode',
      'listProjects',
      'Project',
      'workspaceName',
      'app["workspaceDocuments"].whose({ "name": parentId })[0]',
      'var items = parent["projects"]();',
    ],
    [
      'regression',
      'xcode',
      'listSchemes',
      'Scheme',
      'workspaceName',
      'app["workspaceDocuments"].whose({ "name": parentId })[0]',
      'var items = parent["schemes"]();',
    ],
    [
      'regression',
      'xcode',
      'listRunDestinations',
      'RunDestination',
      'workspaceName',
      'app["workspaceDocuments"].whose({ "name": parentId })[0]',
      'var items = parent["runDestinations"]();',
    ],
    [
      'regression',
      'automator',
      'listActions',
      'AutomatorAction',
      'workflowName',
      'app["workflows"].whose({ "name": parentId })[0]',
      'var items = parent["automatorActions"]();',
    ],
    [
      'regression',
      'automator',
      'listVariables',
      'Variable',
      'workflowName',
      'app["workflows"].whose({ "name": parentId })[0]',
      'var items = parent["variables"]();',
    ],
    [
      'regression',
      'automator',
      'listSettings',
      'Setting',
      'actionId',
      'app["automatorActions"].byId(parentId)',
      'var items = parent["settings"]();',
    ],
    [
      'regression',
      'automator',
      'listRequiredResources',
      'RequiredResource',
      'actionId',
      'app["automatorActions"].byId(parentId)',
      'var items = parent["requiredResources"]();',
    ],
    // The fifteen commands whose parent was already right, and stays the same.
    [
      'kept',
      'calendar',
      'listEvents',
      'Event',
      'calendarId',
      calendarParent,
      'var items = parent["events"]();',
    ],
    [
      'kept',
      'calendar',
      'getEvent',
      'Event',
      'calendarId',
      calendarParent,
      'var item = parent["events"].byId(itemId);',
    ],
    [
      'kept',
      'calendar',
      'createEvent',
      'Event',
      'calendarId',
      calendarParent,
      'parent["events"].push(item);',
    ],
    [
      'kept',
      'calendar',
      'updateEvent',
      'Event',
      'calendarId',
      calendarParent,
      'var item = parent["events"].byId(itemId);',
    ],
    [
      'kept',
      'calendar',
      'deleteEvent',
      'Event',
      'calendarId',
      calendarParent,
      'var item = parent["events"].byId(itemId);',
    ],
    [
      'kept',
      'microsoft-edge',
      'listTabs',
      'Tab',
      'windowId',
      'app["windows"].byId(parentId)',
      'var items = parent["tabs"]();',
    ],
    [
      'kept',
      'microsoft-edge',
      'createTab',
      'Tab',
      'windowId',
      'app["windows"].byId(parentId)',
      'parent["tabs"].push(item);',
    ],
    [
      'kept',
      'omnigraffle',
      'listGraphics',
      'Graphic',
      'canvasId',
      'app["canvases"].byId(parentId)',
      'var items = parent["graphics"]();',
    ],
    [
      'kept',
      'omnigraffle',
      'listShapes',
      'Shape',
      'canvasId',
      'app["canvases"].byId(parentId)',
      'var items = parent["shapes"]();',
    ],
    [
      'kept',
      'omnigraffle',
      'createShape',
      'Shape',
      'canvasId',
      'app["canvases"].byId(parentId)',
      'parent["shapes"].push(item);',
    ],
    [
      'kept',
      'omnigraffle',
      'listLines',
      'Line',
      'canvasId',
      'app["canvases"].byId(parentId)',
      'var items = parent["lines"]();',
    ],
    [
      'kept',
      'omnigraffle',
      'listLayers',
      'Layer',
      'canvasId',
      'app["canvases"].byId(parentId)',
      'var items = parent["layers"]();',
    ],
    [
      'kept',
      'omnigraffle',
      'createLayer',
      'Layer',
      'canvasId',
      'app["canvases"].byId(parentId)',
      'parent["layers"].push(item);',
    ],
    [
      'kept',
      'reminders',
      'listReminders',
      'Reminder',
      'listId',
      'app["lists"].byId(parentId)',
      'var items = parent["reminders"]();',
    ],
    [
      'kept',
      'reminders',
      'createReminder',
      'Reminder',
      'listId',
      'app["lists"].byId(parentId)',
      'parent["reminders"].push(item);',
    ],
  ] as const

  it.each(PARENTS)(
    '%s: %s %s reaches its target through the recorded parent',
    (_kind, app, command, resource, parameter, parentTarget, childExpression) => {
      const text = bodyOf(app, command, resource)
      expect(text).toContain(`var parentId = args["${parameter}"];`)
      expect(text).toContain(`var parent = ${parentTarget};`)
      expect(text).toContain(childExpression)
    }
  )

  it('addresses none of the collections the guessed parents named', () => {
    const guessed = [
      'app["folders"]',
      'app["workspaceNames"]',
      'app["workflowNames"]',
      'app["actions"]',
    ]
    for (const [, app, command, resource] of PARENTS) {
      const text = bodyOf(app, command, resource)
      for (const accessor of guessed) expect(text, `${app} ${command}`).not.toContain(accessor)
    }
  })

  it('requires the recorded parameter, so a call without it is rejected before anything runs', () => {
    const manifest = manifests.get('microsoft-edge')
    if (manifest === undefined) throw new Error('no manifest loaded for microsoft-edge')
    expect(
      planNativeInvocation(manifest, { command: 'listBookmarkItems', resource: 'BookmarkItem' })
        .requiredArguments
    ).toEqual(['folderId'])
  })
})

describe('commands without a recorded parent', () => {
  const folder: Resource = { name: 'Folder', plural: 'Folders', description: 'f', properties: {} }
  const item: Resource = { name: 'Item', plural: 'Items', description: 'i', properties: {} }

  it('address their resource at the application, however their parameters are named', () => {
    // A parameter named for another resource, first of two required ones, is
    // no parent unless the manifest records it as one.
    const manifest = manifestWith(
      { Folder: folder, Item: item },
      {
        get: resourceCommand('get', 'Item', [param('folderId'), param('id')]),
        list: resourceCommand('list', 'Item', [param('folderId')]),
        create: resourceCommand('create', 'Item', [param('folderId')]),
      }
    )
    const get = buildNativeBody(manifest, { command: 'get', resource: 'Item' })
    expect(get).toContain('var item = app["items"].byId(itemId);')
    expect(get).not.toContain('parent')
    const list = buildNativeBody(manifest, { command: 'list', resource: 'Item' })
    expect(list).toContain('var items = app["items"]();')
    expect(list).not.toContain('parent')
    const create = buildNativeBody(manifest, { command: 'create', resource: 'Item' })
    expect(create).toContain('item.make();')
    expect(create).not.toContain('parent')
  })

  it('throw InternalError when the recorded parent names an undeclared resource', () => {
    // The manifest schema rejects such a parent; a body never guesses one.
    const manifest = manifestWith(
      { Item: item },
      {
        list: {
          ...resourceCommand('list', 'Item', [param('folderId')]),
          parent: { resource: 'Folder', parameter: 'folderId' },
        },
      }
    )
    const build = (): string => buildNativeBody(manifest, { command: 'list', resource: 'Item' })
    expect(build).toThrow(InternalError)
    // The message names the parent resource, so a bad manifest is diagnosable.
    expect(build).toThrow('names parent resource "Folder"')
  })
})

// ---------------------------------------------------------------------------
// Native spellings (issue #165)
// ---------------------------------------------------------------------------

/**
 * A fixture app whose dictionary spells a collection and several properties
 * differently from the manifest's public names, as Music spells "AirPlay
 * devices" `airplayDevices` and System Events spells "MAC address"
 * `macAddress`. Its manifest records each app spelling under `native`.
 *
 * - `AirPlayDevice` (public segment `airPlayDevices`, app collection
 *   `airplayDevices`) is matched by its `mACAddress` (app `macAddress`), and
 *   declares a writable `uRL` (app `url`) and a writable `name`, which the app
 *   spells as the key.
 * - `Stream`, nested under a device, is addressed by id; its identifier `uRL`
 *   (app `url`) and its writable `eQ` (app `eq`) are recorded too.
 */
const SPEAKERS_YAML = `
version: '1.0'
app:
  name: Speakers
  bundleId: com.example.speakers
resources:
  AirPlayDevice:
    name: AirPlayDevice
    plural: AirPlayDevices
    description: A speaker
    native:
      collection: airplayDevices
      evidence: { source: dictionary, bundleId: com.example.speakers, appVersion: '1.0', osVersion: '27.2', term: AirPlay devices }
    properties:
      mACAddress:
        access: r
        description: The address
        native:
          name: macAddress
          evidence: { source: dictionary, bundleId: com.example.speakers, appVersion: '1.0', osVersion: '27.2', term: MAC address }
      uRL:
        access: rw
        description: The stream URL
        native:
          name: url
          evidence: { source: dictionary, bundleId: com.example.speakers, appVersion: '1.0', osVersion: '27.2', term: URL }
      name:
        access: rw
        description: The name
    identifiers:
      - { property: mACAddress, primary: true, targeting: byProperty }
  Stream:
    name: Stream
    plural: Streams
    description: A stream
    properties:
      uRL:
        access: r
        description: The stream URL
        native:
          name: url
          evidence: { source: dictionary, bundleId: com.example.speakers, appVersion: '1.0', osVersion: '27.2', term: URL }
      eQ:
        access: rw
        description: The equalizer
        native:
          name: eq
          evidence: { source: dictionary, bundleId: com.example.speakers, appVersion: '1.0', osVersion: '27.2', term: EQ }
    identifiers:
      - { property: uRL, primary: true }
hierarchy:
  children: {}
commands:
  list: { name: list, description: list, scope: resource, resourceType: AirPlayDevice, parameters: [] }
  get:
    name: get
    description: get
    scope: resource
    resourceType: AirPlayDevice
    parameters: [{ name: id, type: string, description: id, required: true }]
  create:
    name: create
    description: create
    scope: resource
    resourceType: AirPlayDevice
    parameters:
      - { name: name, type: string, description: name, required: true }
      - { name: uRL, type: string, description: url, required: false }
  update:
    name: update
    description: update
    scope: resource
    resourceType: AirPlayDevice
    parameters:
      - { name: id, type: string, description: id, required: true }
      - { name: uRL, type: string, description: url, required: false }
      - { name: name, type: string, description: name, required: false }
  listStreams:
    name: list
    description: list streams
    scope: resource
    resourceType: Stream
    parent: { resource: AirPlayDevice, parameter: airPlayDeviceId }
    parameters: [{ name: airPlayDeviceId, type: string, description: device, required: true }]
  createStream:
    name: create
    description: create a stream
    scope: resource
    resourceType: Stream
    parent: { resource: AirPlayDevice, parameter: airPlayDeviceId }
    parameters:
      - { name: airPlayDeviceId, type: string, description: device, required: true }
      - { name: eQ, type: string, description: eq, required: false }
  updateStream:
    name: update
    description: update a stream
    scope: resource
    resourceType: Stream
    parent: { resource: AirPlayDevice, parameter: airPlayDeviceId }
    parameters:
      - { name: airPlayDeviceId, type: string, description: device, required: true }
      - { name: id, type: string, description: id, required: true }
      - { name: eQ, type: string, description: eq, required: false }
`

describe('native spellings: the app is addressed by its own names (issue #165)', () => {
  const speakers = parseManifestYaml(SPEAKERS_YAML)
  const body = (command: string, resource: string, typed = true): string =>
    buildNativeBody(speakers, { command, resource }, { identifierAliases: !typed })

  /** A resource of the fixture, by key. */
  function resourceOf(key: string): Resource {
    const resource = speakers.resources[key]
    if (resource === undefined) throw new Error(`the fixture has no ${key}`)
    return resource
  }

  /**
   * A stand-in device that answers only to the app's spellings: reading a
   * public key that differs (`mACAddress`, `uRL`) finds no function, so a
   * body that used one would throw (or, guarded, omit the field) instead of
   * reading a value. Assignments are recorded by name and not applied, so a
   * read after an update still answers the original value. With
   * `recordFails`, the whole-record read fails, as some apps' does. Every
   * read, of the record or of one property, is recorded in `reads` by the
   * app's name.
   */
  function fakeDevice(recordFails = false): {
    device: object
    writes: string[]
    reads: string[]
  } {
    const writes: string[] = []
    const reads: string[] = []
    const values = { macAddress: 'a1', url: 'http://u', name: 'Den' }
    const read = (name: keyof typeof values) => (): string => {
      reads.push(name)
      return values[name]
    }
    const device = new Proxy(
      {
        exists: () => true,
        make: () => undefined,
        properties: () => {
          reads.push('properties')
          if (recordFails) throw new Error('the property record cannot be read')
          return { ...values }
        },
        macAddress: read('macAddress'),
        url: read('url'),
        name: read('name'),
      },
      {
        set(_target, key) {
          writes.push(String(key))
          return true
        },
      }
    )
    return { device, writes, reads }
  }

  it('resolves the recorded collection, and the default where none is recorded', () => {
    // "AirPlay devices": the first word lowercased whole gives airplayDevices;
    // the plural's lower camel case would be airPlayDevices.
    expect(resolveCollectionAccessor(resourceOf('AirPlayDevice'))).toBe('airplayDevices')
    expect(resolveCollectionAccessor(resourceOf('Stream'))).toBe('streams')
  })

  it('resolves a recorded property name, and the key where none is recorded', () => {
    const device = resourceOf('AirPlayDevice')
    expect(resolvePropertyAccessor('uRL', device.properties['uRL'])).toBe('url')
    expect(resolvePropertyAccessor('name', device.properties['name'])).toBe('name')
    // A name that is not a declared property is addressed as written.
    expect(resolvePropertyAccessor('calendarIdentifier', undefined)).toBe('calendarIdentifier')
  })

  it('a list addresses the recorded collection', () => {
    expect(body('list', 'AirPlayDevice')).toContain('var items = app["airplayDevices"]();')
    expect(body('list', 'AirPlayDevice')).not.toContain('app["airPlayDevices"]')
  })

  it('a list fast path copies each field from the app key into the public key', () => {
    const text = body('list', 'AirPlayDevice')
    expect(text).toContain('if (props["url"] !== undefined) { obj["uRL"] = props["url"]; }')
    expect(text).not.toContain('props["uRL"]')
  })

  it('a list fallback reads each field by the app name', () => {
    const text = body('list', 'AirPlayDevice')
    expect(text).toContain('try { obj["uRL"] = item["url"](); } catch (e) {}')
    expect(text).not.toContain('item["uRL"]')
  })

  it('a list reads the runtime identifier by the app name, in both paths', () => {
    const text = body('list', 'AirPlayDevice')
    expect(text).toContain('obj["mACAddress"] = props["macAddress"];')
    expect(text).toContain('obj["mACAddress"] = item["macAddress"]();')
    expect(text).not.toContain('props["mACAddress"]')
    expect(text).not.toContain('item["mACAddress"]')
  })

  it('a list with identifier aliases mirrors the public identifier key', () => {
    // The alias copies within the returned record, which is keyed publicly.
    const text = body('list', 'AirPlayDevice', false)
    expect(text).toContain('obj["mACAddress"] = item["macAddress"]();')
    expect(text).toContain('obj["id"] = obj["mACAddress"];')
  })

  it('a list returns records keyed by the public names, in both paths', () => {
    const fast = fakeDevice()
    const app = { airplayDevices: () => [fast.device] }
    expect(callBody(body('list', 'AirPlayDevice'), app, {})).toEqual([
      { mACAddress: 'a1', uRL: 'http://u', name: 'Den' },
    ])
    const slow = fakeDevice(true)
    const fallbackApp = { airplayDevices: () => [slow.device] }
    expect(callBody(body('list', 'AirPlayDevice'), fallbackApp, {})).toEqual([
      { mACAddress: 'a1', uRL: 'http://u', name: 'Den' },
    ])
  })

  it('a property-matched lookup matches on the app name of the identifier', () => {
    const text = body('get', 'AirPlayDevice')
    expect(text).toContain('var item = app["airplayDevices"].whose({ "macAddress": itemId })[0];')
    expect(text).not.toContain('"mACAddress":')
    expect(buildTargetExpression(resourceOf('AirPlayDevice'), 'airplayDevices', 'v')).toBe(
      'app["airplayDevices"].whose({ "macAddress": v })[0]'
    )
  })

  it('a parent matched on its identifier is matched by the app name, through its collection', () => {
    // listStreams records AirPlayDevice as its parent, identified by `airPlayDeviceId`.
    const text = body('listStreams', 'Stream')
    expect(text).toContain(
      'var parent = app["airplayDevices"].whose({ "macAddress": parentId })[0];'
    )
    expect(text).toContain('var items = parent["streams"]();')
  })

  it('a get takes each property from the record by the app name into its public key', () => {
    const text = body('get', 'AirPlayDevice')
    expect(text).toContain('var props = item.properties();')
    expect(text).toContain('if (props["url"] !== undefined) { obj["uRL"] = props["url"]; }')
    expect(text).toContain(
      'if (props["macAddress"] !== undefined) { obj["mACAddress"] = props["macAddress"]; }'
    )
    expect(text).toContain('if (props["name"] !== undefined) { obj["name"] = props["name"]; }')
    expect(text).not.toContain('props["uRL"]')
    expect(text).not.toContain('props["mACAddress"]')
  })

  it('a get fallback reads each property by the app name into its public key', () => {
    const text = body('get', 'AirPlayDevice')
    expect(text).toContain('try { obj["uRL"] = item["url"](); } catch (e) {}')
    expect(text).toContain('try { obj["mACAddress"] = item["macAddress"](); } catch (e) {}')
    expect(text).toContain('try { obj["name"] = item["name"](); } catch (e) {}')
    expect(text).not.toContain('item["uRL"]')
  })

  /**
   * get, create and update return the same record, built by one shared read.
   * Each runs against a device that answers only to the app's spellings, so a
   * public key read from the record or the item finds nothing. Expected, by
   * hand: the device's values under the public keys mACAddress, uRL and name.
   * The batched path reads the record once; the fallback reads the record,
   * which fails, then each usable property by its app name in declaration
   * order (macAddress, url, name).
   */
  const RECORD_OPERATIONS = [
    {
      command: 'get',
      app: (device: object) => ({ airplayDevices: { whose: () => [device] } }),
      args: { id: 'a1' },
    },
    {
      command: 'create',
      app: (device: object) => ({ AirPlayDevice: () => device }),
      args: { name: 'Den', uRL: 'http://u' },
    },
    {
      command: 'update',
      app: (device: object) => ({ airplayDevices: { whose: () => [device] } }),
      // The stand-in does not apply writes, so the record still holds http://u.
      args: { id: 'a1', uRL: 'http://v' },
    },
  ] as const

  it.each(RECORD_OPERATIONS)(
    'a $command reads the record once and returns public keys',
    ({ command, app, args }) => {
      const { device, reads } = fakeDevice()
      expect(callBody(body(command, 'AirPlayDevice'), app(device), args)).toEqual({
        mACAddress: 'a1',
        uRL: 'http://u',
        name: 'Den',
      })
      expect(reads).toEqual(['properties'])
    }
  )

  it.each(RECORD_OPERATIONS)(
    'a $command falls back to per-property reads by the app names when the record fails',
    ({ command, app, args }) => {
      const { device, reads } = fakeDevice(true)
      expect(callBody(body(command, 'AirPlayDevice'), app(device), args)).toEqual({
        mACAddress: 'a1',
        uRL: 'http://u',
        name: 'Den',
      })
      expect(reads).toEqual(['properties', 'macAddress', 'url', 'name'])
    }
  )

  it('a get finds the item by the app spelling and returns public keys', () => {
    const { device } = fakeDevice()
    const queries: unknown[] = []
    const app = {
      airplayDevices: {
        whose: (query: unknown) => {
          queries.push(query)
          return [device]
        },
      },
    }
    expect(callBody(body('get', 'AirPlayDevice'), app, { id: 'a1' })).toEqual({
      mACAddress: 'a1',
      uRL: 'http://u',
      name: 'Den',
    })
    expect(queries).toEqual([{ macAddress: 'a1' }])
  })

  it('a create keys the new item’s properties by the app names of the parameters', () => {
    const text = body('create', 'AirPlayDevice')
    expect(text).toContain(
      'if (Object.prototype.hasOwnProperty.call(args, "uRL")) { props["url"] = args["uRL"]; }'
    )
    expect(text).toContain(
      'if (Object.prototype.hasOwnProperty.call(args, "name")) { props["name"] = args["name"]; }'
    )
    expect(text).not.toContain('props["uRL"]')
  })

  it('a create returns the new item’s usable properties keyed by the public names', () => {
    const text = body('create', 'AirPlayDevice')
    expect(text).toContain('if (props["url"] !== undefined) { obj["uRL"] = props["url"]; }')
    expect(text).toContain('try { obj["uRL"] = item["url"](); } catch (e) {}')
    expect(text).toContain('return obj;')
    const { device } = fakeDevice()
    const constructed: unknown[] = []
    const app = {
      AirPlayDevice: (props: unknown) => {
        constructed.push(props)
        return device
      },
    }
    expect(callBody(text, app, { name: 'Den', uRL: 'http://u' })).toEqual({
      mACAddress: 'a1',
      uRL: 'http://u',
      name: 'Den',
    })
    expect(constructed).toEqual([{ name: 'Den', url: 'http://u' }])
  })

  it('a nested create keys its properties by the app names and appends to the parent', () => {
    const text = body('createStream', 'Stream')
    expect(text).toContain(
      'var parent = app["airplayDevices"].whose({ "macAddress": parentId })[0];'
    )
    expect(text).toContain(
      'if (Object.prototype.hasOwnProperty.call(args, "eQ")) { props["eq"] = args["eQ"]; }'
    )
    expect(text).toContain('parent["streams"].push(item);')
    expect(text).toContain('try { obj["eQ"] = item["eq"](); } catch (e) {}')
    expect(text).toContain('try { obj["uRL"] = item["url"](); } catch (e) {}')
    expect(text).not.toContain('props["eQ"]')
  })

  it('an update assigns each field by the app name and returns public keys', () => {
    const text = body('update', 'AirPlayDevice')
    expect(text).toContain(
      'if (Object.prototype.hasOwnProperty.call(args, "uRL")) { try { item["url"] = args["uRL"]; } catch (e) {} }'
    )
    expect(text).not.toContain('item["uRL"] =')
    expect(text).toContain('if (props["url"] !== undefined) { obj["uRL"] = props["url"]; }')
    expect(text).toContain('return obj;')
    const { device, writes } = fakeDevice()
    const app = { airplayDevices: { whose: () => [device] } }
    expect(callBody(text, app, { id: 'a1', uRL: 'http://v' })).toEqual({
      mACAddress: 'a1',
      uRL: 'http://u',
      name: 'Den',
    })
    expect(writes).toEqual(['url'])
  })

  it('a nested update addresses the child by id and assigns by the app name', () => {
    const text = body('updateStream', 'Stream')
    expect(text).toContain('var item = parent["streams"].byId(itemId);')
    expect(text).toContain(
      'if (Object.prototype.hasOwnProperty.call(args, "eQ")) { try { item["eq"] = args["eQ"]; } catch (e) {} }'
    )
  })

  it('a byId list reads its identifier by the app name', () => {
    // Stream is addressed by id, so its identifier `uRL` is read, never matched.
    const text = body('listStreams', 'Stream')
    expect(text).toContain('obj["uRL"] = props["url"];')
    expect(text).toContain('obj["uRL"] = item["url"]();')
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
    // The result is built like a get's: each usable property taken from one
    // record read, or read with its own guard when the record fails, keyed by
    // its public name; the app's raw record is never returned.
    expect(text).toContain('var props = item.properties();')
    expect(text).toContain(
      'if (props["summary"] !== undefined) { obj["summary"] = props["summary"]; }'
    )
    expect(text).toContain('try { obj["summary"] = item["summary"](); } catch (e) {}')
    expect(text).toContain('return obj;')
    expect(text).not.toContain('return props;')
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
    // Like a create, the result is the item's usable properties read as a get
    // reads them, from one record read with a guarded per-property fallback.
    expect(text).toContain('var props = item.properties();')
    expect(text).toContain(
      'if (props["summary"] !== undefined) { obj["summary"] = props["summary"]; }'
    )
    expect(text).toContain('try { obj["summary"] = item["summary"](); } catch (e) {}')
    expect(text).toContain('return obj;')
    expect(text).not.toContain('return props;')
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
  it('Notes get reads the `id` parameter, not `name`', () => {
    const text = buildNativeBody(notes, { command: 'get', resource: 'Note' })
    expect(text).toContain('var itemId = args["id"];')
    expect(text).toContain('app["notes"].byId(itemId)')
    expect(text).not.toContain('args["name"]')
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

/**
 * A resource keyed by `name` is addressed the way its app can find it (#194).
 * The expected text is written by hand from each app's dictionary:
 *
 * - Notes' account, folder and note classes declare `id` ("the unique
 *   identifier of the note"), so they are identified by it and looked up by
 *   `id`; the request parameter is `id`, never the item's name.
 * - Terminal's window and settings set classes declare an integer `id`.
 * - TextEdit's, Preview's, Script Editor's and System Information's document
 *   classes and Xcode's file, text and source document, build setting,
 *   resolved build setting and run destination classes have no `id`, so they
 *   are matched on `name`. Automator's setting and required resource have none
 *   either, in Automator.scriptSuite.
 *
 * @see ../../../../manifests/notes/app.yaml
 * @see https://github.com/mike-north/macts/issues/194
 */
describe('name-keyed resources are targeted by a working identifier (issue #194)', () => {
  const byIdResources: readonly (readonly [string, string, string, string])[] = [
    ['notes', 'Account', 'accounts', 'get'],
    ['notes', 'Folder', 'folders', 'get'],
    ['notes', 'Note', 'notes', 'get'],
    ['terminal', 'Window', 'windows', 'get'],
    ['terminal', 'SettingsSet', 'settingsSets', 'get'],
  ]

  it.each(byIdResources)(
    '%s %s get looks the item up by its `id` identifier',
    async (app, resource, collection, command) => {
      const manifest = await loadManifest(manifestPath(app))
      const text = buildNativeBody(manifest, { command, resource })
      expect(text).toContain('var itemId = args["id"];')
      expect(text).toContain(`var item = app["${collection}"].byId(itemId);`)
      expect(text).not.toContain('.whose(')
      expect(text).not.toContain('args["name"]')
    }
  )

  it('Notes requires the `id` parameter, and no `name`, to get an item', () => {
    const plan = planNativeInvocation(notes, { command: 'get', resource: 'Folder' })
    expect(plan.requiredArguments).toEqual(['id'])
  })

  it('Notes lists each item with its own `id` as the identifier', () => {
    const text = buildNativeBody(
      notes,
      { command: 'list', resource: 'Note' },
      { identifierAliases: true }
    )
    expect(text).toContain('obj["id"] = props["id"];')
    expect(text).not.toContain('obj["name"] = obj["id"]')
  })

  const byPropertyResources: readonly (readonly [string, string, string, string, string])[] = [
    ['textedit', 'Document', 'documents', 'get', 'name'],
    ['preview', 'Document', 'documents', 'get', 'name'],
    ['script-editor', 'Document', 'documents', 'get', 'name'],
    ['system-information', 'Document', 'documents', 'get', 'name'],
    ['xcode', 'RunDestination', 'runDestinations', 'getRunDestination', 'name'],
  ]

  it.each(byPropertyResources)(
    '%s %s get matches the item on its `name`',
    async (app, resource, collection, command, property) => {
      const manifest = await loadManifest(manifestPath(app))
      const text = buildNativeBody(manifest, { command, resource })
      expect(text).toContain('var itemId = args["name"];')
      expect(text).toContain(`var item = app["${collection}"].whose({ "${property}": itemId })[0];`)
      expect(text).not.toContain('.byId(')
    }
  )

  it.each([
    ['automator', 'Setting', 'settings'],
    ['automator', 'RequiredResource', 'requiredResources'],
    ['xcode', 'BuildSetting', 'buildSettings'],
    ['xcode', 'ResolvedBuildSetting', 'resolvedBuildSettings'],
    ['xcode', 'FileDocument', 'fileDocuments'],
    ['xcode', 'TextDocument', 'textDocuments'],
    ['xcode', 'SourceDocument', 'sourceDocuments'],
  ])('%s %s is matched on its `name` wherever it is looked up', async (app, key, collection) => {
    const manifest = await loadManifest(manifestPath(app))
    const resource = manifest.resources[key]
    expect(buildTargetExpression(resource, collection, 'itemId')).toBe(
      `app["${collection}"].whose({ "name": itemId })[0]`
    )
  })

  it('Terminal tabs keep their own get, with the `name` parameter', async () => {
    const terminal = await loadManifest(manifestPath('terminal'))
    const tab = planNativeInvocation(terminal, { command: 'getTab', resource: 'Tab' })
    expect(tab.requiredArguments).toEqual(['name'])
    const window = planNativeInvocation(terminal, { command: 'get', resource: 'Window' })
    expect(window.requiredArguments).toEqual(['id'])
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

  it('finds none in any body of any shipped manifest, with or without identifier aliases', async () => {
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
        // Passthrough output builds bodies with the identifier aliases, typed
        // output without them; both variants ship.
        for (const identifierAliases of [true, false]) {
          routes.push(`${route.route} (identifierAliases: ${String(identifierAliases)})`)
          bodies.push(buildNativeBody(manifest, target, { identifierAliases }))
        }
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
