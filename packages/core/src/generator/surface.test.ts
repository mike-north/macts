/**
 * Unit tests for the shared client-surface derivation.
 *
 * The HTTP client SDK and the app contract both render these decisions, so
 * the tests pin the decisions themselves: which commands apply to a resource,
 * which command backs each CRUD method, how identifier parameters are chosen,
 * how method parameters are ordered, and what a create input contains.
 * Expected values are derived by hand from the fixture.
 */

import { describe, expect, it } from 'vitest'
import type { AppManifest, Command } from '../manifest/index.js'
import {
  commandAppliesToResource,
  commandMethodParameters,
  createInputFields,
  findCrudCommand,
  isCrudName,
  listMethodParameters,
  resolveIdParams,
  resourceCommandEntries,
  resourceHasOperations,
  identifierWords,
  resourceNamespace,
  safeIdentifier,
} from './surface.js'

function command(overrides: Partial<Command> & Pick<Command, 'name'>): Command {
  return { description: 'A command', scope: 'resource', parameters: [], ...overrides }
}

function param(name: string, required: boolean, type = 'string') {
  return { name, type, description: name, required }
}

const manifest: AppManifest = {
  version: '1.0',
  app: { name: 'Fixture', bundleId: 'com.example.fixture', tccEntitlements: [] },
  resources: {
    Event: {
      name: 'Event',
      plural: 'Events',
      description: 'An event',
      properties: {
        uid: { access: 'r', type: 'string', description: 'Id', optional: false },
        summary: { access: 'rw', type: 'string', description: 'Summary', optional: false },
        location: { access: 'rw', type: 'string', description: 'Where', optional: true },
      },
    },
    Calendar: { name: 'Calendar', plural: 'Calendars', description: 'A calendar', properties: {} },
    Idle: { name: 'Idle', plural: 'Idles', description: 'No operations', properties: {} },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    listEvents: command({
      name: 'list',
      resourceType: 'Event',
      parameters: [param('calendarId', true)],
    }),
    createEvent: command({
      name: 'create',
      resourceType: 'Event',
      parameters: [param('calendarId', true), param('summary', true, 'date')],
    }),
    createEventAgain: command({ name: 'create', resourceType: 'Event' }),
    refresh: command({ name: 'refresh', resourceType: ['Event', 'Calendar'] }),
    reload: command({ name: 'reload', scope: 'application' }),
  },
}

describe('safeIdentifier', () => {
  it('prefixes reserved words and leaves other names alone', () => {
    expect(safeIdentifier('delete')).toBe('_delete')
    expect(safeIdentifier('default')).toBe('_default')
    expect(safeIdentifier('remove')).toBe('remove')
  })
})

describe('isCrudName', () => {
  it('recognizes exactly the five CRUD shapes', () => {
    expect(['list', 'get', 'create', 'update', 'delete'].every(isCrudName)).toBe(true)
    expect(isCrudName('show')).toBe(false)
  })
})

describe('commands that apply to a resource', () => {
  it('match by resourceType, including lists of types', () => {
    expect(resourceCommandEntries(manifest, 'Calendar').map(([key]) => key)).toEqual(['refresh'])
    expect(resourceCommandEntries(manifest, 'Event').map(([key]) => key)).toEqual([
      'listEvents',
      'createEvent',
      'createEventAgain',
      'refresh',
    ])
  })

  it('include resource commands without a resourceType, but never app commands', () => {
    expect(commandAppliesToResource(command({ name: 'touch' }), 'Anything')).toBe(true)
    expect(commandAppliesToResource(command({ name: 'x', scope: 'application' }), 'Event')).toBe(
      false
    )
  })

  it('decide whether a resource has a client namespace', () => {
    expect(resourceHasOperations(manifest, 'Event')).toBe(true)
    expect(resourceHasOperations(manifest, 'Idle')).toBe(false)
  })
})

describe('findCrudCommand', () => {
  it('chooses the first command of a CRUD name, in declaration order', () => {
    const found = findCrudCommand(resourceCommandEntries(manifest, 'Event'), 'create')
    expect(found?.[0]).toBe('createEvent')
    expect(findCrudCommand(resourceCommandEntries(manifest, 'Event'), 'delete')).toBeUndefined()
  })
})

describe('resolveIdParams', () => {
  it('takes the recorded parent parameter as the parent scope and the next required one as the child', () => {
    const cmd = command({
      name: 'get',
      parameters: [param('calendarId', true), param('verbose', false), param('id', true)],
      parent: { resource: 'Calendar', parameter: 'calendarId' },
    })
    expect(resolveIdParams(cmd)).toEqual({ parentParam: 'calendarId', childParam: 'id' })
  })

  it('takes the recorded parent wherever it is declared among the parameters', () => {
    const cmd = command({
      name: 'get',
      parameters: [param('id', true), param('calendarId', true)],
      parent: { resource: 'Calendar', parameter: 'calendarId' },
    })
    expect(resolveIdParams(cmd)).toEqual({ parentParam: 'calendarId', childParam: 'id' })
  })

  it('infers no parent scope from two required parameters when none is recorded', () => {
    // Before command.parent, the first of two required parameters was taken as
    // the parent scope (#165); without a recorded parent there is none.
    const cmd = command({ name: 'get', parameters: [param('calendarId', true), param('id', true)] })
    expect(resolveIdParams(cmd)).toEqual({ parentParam: undefined, childParam: 'calendarId' })
  })

  it('has no parent scope with one required parameter', () => {
    expect(resolveIdParams(command({ name: 'get', parameters: [param('noteId', true)] }))).toEqual({
      parentParam: undefined,
      childParam: 'noteId',
    })
  })

  // Guards that no generated interface takes an identifier the manifest does
  // not declare. Generation refuses such a manifest first; this throw keeps
  // every surface from supplying a name of its own.
  it('throws, naming the command, when there are no required parameters', () => {
    expect(() => resolveIdParams(command({ name: 'delete', resourceType: 'Event' }))).toThrow(
      'The delete command of Event declares no identifier parameter'
    )
  })

  // Guards that the parent parameter alone is not taken as the item's identifier.
  it('throws, naming the command, when the only required parameter is the parent', () => {
    const cmd = command({
      name: 'get',
      resourceType: 'Event',
      parameters: [param('calendarId', true)],
      parent: { resource: 'Calendar', parameter: 'calendarId' },
    })
    expect(() => resolveIdParams(cmd)).toThrow(
      'The get command of Event declares no identifier parameter other than its parent parameter "calendarId"'
    )
  })
})

describe('method parameters', () => {
  it('list takes only the required parameters', () => {
    const cmd = command({
      name: 'list',
      parameters: [param('limit', false), param('windowId', true)],
    })
    expect(listMethodParameters(cmd).map((p) => p.name)).toEqual(['windowId'])
  })

  it('commands take required parameters first and send all of them under manifest names', () => {
    const cmd = command({
      name: 'save',
      parameters: [param('in', false), param('as', true), param('default', true)],
    })
    const { signature, body } = commandMethodParameters(cmd)
    expect(signature.map((p) => [p.bindingName, p.optional])).toEqual([
      ['as', false],
      ['_default', false],
      ['_in', true],
    ])
    expect(body).toEqual([
      { fieldName: 'in', bindingName: '_in' },
      { fieldName: 'as', bindingName: 'as' },
      { fieldName: 'default', bindingName: '_default' },
    ])
  })
})

describe('createInputFields', () => {
  it('lists writable properties, then create parameters, which override same-named properties', () => {
    const fields = createInputFields(manifest, 'Event')
    expect([...fields.keys()]).toEqual(['summary', 'location', 'calendarId'])
    expect(fields.get('summary')).toEqual({
      type: 'date',
      required: true,
      description: 'summary',
      source: 'parameter',
    })
    expect(fields.get('location')).toEqual({
      type: 'string',
      required: false,
      description: 'Where',
      source: 'property',
    })
  })

  it('is empty for a resource with no writable properties or create command', () => {
    expect(createInputFields(manifest, 'Calendar').size).toBe(0)
  })
})

describe('resourceNamespace', () => {
  it('is the resource segment: the lower camel case of the plural', () => {
    // The accessor matches the route segment (`app.textItems.list`), issue #154.
    expect(resourceNamespace({ plural: 'TextItems' })).toBe('textItems')
    expect(resourceNamespace({ plural: 'AIMHandles' })).toBe('aimHandles')
    expect(resourceNamespace({ plural: 'Notes' })).toBe('notes')
  })
})

describe('identifierWords', () => {
  it('splits a Pascal case identifier into lowercase words', () => {
    expect(identifierWords('MediaItems')).toBe('media items')
    expect(identifierWords('OpenFileAlarm')).toBe('open file alarm')
    expect(identifierWords('Notes')).toBe('notes')
  })

  it('keeps acronyms in capitals, with their plural s', () => {
    expect(identifierWords('AIMHandles')).toBe('AIM handles')
    expect(identifierWords('URLTrack')).toBe('URL track')
    expect(identifierWords('AudioCDPlaylists')).toBe('audio CD playlists')
    // `URLs` is the acronym's plural, not `UR` and a word `Ls`.
    expect(identifierWords('URLs')).toBe('URLs')
    expect(identifierWords('TV')).toBe('TV')
  })

  it('keeps digits with the word they follow', () => {
    expect(identifierWords('Mp3Files')).toBe('mp3 files')
  })

  it('reads a camel case identifier the same way', () => {
    expect(identifierWords('mediaItems')).toBe('media items')
  })
})
