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
  it('takes the first required parameter as the parent scope and the last as the child', () => {
    const cmd = command({
      name: 'get',
      parameters: [param('calendarId', true), param('verbose', false), param('id', true)],
    })
    expect(resolveIdParams(cmd)).toEqual({ parentParam: 'calendarId', childParam: 'id' })
  })

  it('has no parent scope with one required parameter', () => {
    expect(resolveIdParams(command({ name: 'get', parameters: [param('noteId', true)] }))).toEqual({
      parentParam: undefined,
      childParam: 'noteId',
    })
  })

  it('falls back to id with no required parameters', () => {
    expect(resolveIdParams(command({ name: 'delete' }))).toEqual({
      parentParam: undefined,
      childParam: 'id',
    })
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
  it('is the lowercased plural', () => {
    expect(
      resourceNamespace({ name: 'X', plural: 'TextItems', description: '', properties: {} })
    ).toBe('textitems')
  })
})
