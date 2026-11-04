/**
 * Tests for the one rule that says which declared parameter selects the item
 * a get, update or delete acts on, and which commands are refused because
 * they declare none.
 *
 * Expected values are written by hand from the fixtures: the identifier is the
 * first required parameter, in declaration order, other than the parameter
 * `command.parent` names (phases/13 D5).
 */

import { describe, expect, it } from 'vitest'
import type { AppManifest } from './schemas/app.js'
import type { Command, CommandParameter } from './schemas/command.js'
import {
  itemIdentifierParameter,
  itemSelectionProblem,
  selectsOneItem,
  unselectableItemCommands,
} from './item-selection.js'

function param(name: string, required: boolean): CommandParameter {
  return { name, type: 'string', description: name, required }
}

function command(overrides: Partial<Command> & Pick<Command, 'name'>): Command {
  return { description: 'A command', scope: 'resource', parameters: [], ...overrides }
}

/** A minimal manifest holding `commands`, with one resource each can target. */
function manifestWith(commands: AppManifest['commands']): AppManifest {
  return {
    version: '1.0',
    app: { name: 'Widgets', bundleId: 'com.example.widgets', tccEntitlements: [] },
    resources: {
      Widget: { name: 'Widget', plural: 'Widgets', description: 'A widget', properties: {} },
      Shelf: { name: 'Shelf', plural: 'Shelves', description: 'A shelf', properties: {} },
    },
    enums: {},
    hierarchy: { children: {} },
    suites: [],
    relationships: [],
    commands,
  }
}

describe('itemIdentifierParameter', () => {
  // Guards the parent/child split every surface shares: the parent scope is
  // never mistaken for the item's identifier, wherever it is declared.
  it('takes the first required parameter other than the parent', () => {
    const cmd = command({
      name: 'get',
      parent: { resource: 'Shelf', parameter: 'shelfId' },
      parameters: [param('shelfId', true), param('verbose', false), param('widgetId', true)],
    })
    expect(itemIdentifierParameter(cmd)?.name).toBe('widgetId')
  })

  // Guards that a command with no recorded parent takes its first required
  // parameter, with nothing inferred about a parent from names or count.
  it('takes the first required parameter of a command with no parent', () => {
    const cmd = command({ name: 'update', parameters: [param('note', false), param('uid', true)] })
    expect(itemIdentifierParameter(cmd)?.name).toBe('uid')
  })

  // Guards that an optional parameter never stands in for the identifier: a
  // caller could omit it, and then nothing names the item.
  it('gives undefined when every parameter is optional', () => {
    const cmd = command({ name: 'get', parameters: [param('verbose', false)] })
    expect(itemIdentifierParameter(cmd)).toBeUndefined()
  })

  // Guards that the parent's parameter alone names no item within the parent.
  it('gives undefined when the only required parameter is the parent', () => {
    const cmd = command({
      name: 'delete',
      parent: { resource: 'Shelf', parameter: 'shelfId' },
      parameters: [param('shelfId', true)],
    })
    expect(itemIdentifierParameter(cmd)).toBeUndefined()
  })

  // Guards the removed fallback: no name is supplied when none is declared.
  it('gives undefined, not an invented name, for a command with no parameters', () => {
    expect(itemIdentifierParameter(command({ name: 'get' }))).toBeUndefined()
  })
})

describe('selectsOneItem', () => {
  // Guards the rule's reach: resource-scoped get, update and delete, plus a
  // delete at application scope. An application-scoped get or update is a
  // plain call on the app (Finder's `update` refreshes item display), and a
  // command of any other name selects no item.
  it.each<[string, Command['scope'], boolean]>([
    ['get', 'resource', true],
    ['update', 'resource', true],
    ['delete', 'resource', true],
    ['delete', 'application', true],
    ['get', 'application', false],
    ['update', 'application', false],
    ['duplicate', 'application', false],
    ['list', 'resource', false],
    ['create', 'resource', false],
    ['show', 'resource', false],
  ])('a %s at %s scope: %s', (name, scope, expected) => {
    expect(selectsOneItem(command({ name, scope }))).toBe(expected)
  })
})

describe('itemSelectionProblem', () => {
  // Guards that the refusal names the command key and says what to declare,
  // and mentions the parent so the reader knows it does not count.
  it('names the command key and the parent, and says to declare the identifier', () => {
    const problem = itemSelectionProblem(
      'getWidget',
      command({
        name: 'get',
        parent: { resource: 'Shelf', parameter: 'shelfId' },
        parameters: [param('shelfId', true)],
      })
    )
    expect(problem).toBe(
      'its get command "getWidget" declares no identifier parameter. A get acts on one item, selected by a required parameter other than its parent parameter "shelfId", so without one no item can be selected. Declare the item\'s identifier as a required parameter of "getWidget".'
    )
  })

  // Guards the application-scoped delete with no parameters: it names no item,
  // so it is refused and told to scope itself to its resource.
  it('refuses an application-scoped delete with no parameters', () => {
    const problem = itemSelectionProblem(
      'delete',
      command({ name: 'delete', scope: 'application' })
    )
    expect(problem).toContain('application-scoped delete command "delete"')
    expect(problem).toContain('no item can be selected')
    expect(problem).toContain('Scope "delete" to the resource whose items it deletes')
    expect(problem).toContain("declare the item's identifier as a required parameter")
  })

  // Guards that the rule does not reach commands it does not cover.
  it.each<[string, Command]>([
    ['a get with its identifier', command({ name: 'get', parameters: [param('id', true)] })],
    ['an application-scoped update', command({ name: 'update', scope: 'application' })],
    ['an application-scoped duplicate', command({ name: 'duplicate', scope: 'application' })],
    [
      'an application-scoped delete with its identifier',
      command({ name: 'delete', scope: 'application', parameters: [param('path', true)] }),
    ],
  ])('accepts %s', (_label, cmd) => {
    expect(itemSelectionProblem('key', cmd)).toBeUndefined()
  })
})

describe('unselectableItemCommands', () => {
  // Guards the manifest-wide check generation and registration both run: each
  // offending command once (a command over every resource has many routes),
  // in declaration order, and nothing for a command marked unsupported.
  it('lists each routed command that cannot select its item, once, in order', () => {
    const manifest = manifestWith({
      getWidget: {
        name: 'get',
        description: 'Get a widget',
        scope: 'resource',
        resourceType: 'Widget',
        parameters: [param('id', true)],
      },
      // No resourceType: one route per resource, but one entry here.
      remove: { name: 'delete', description: 'Delete', scope: 'resource', parameters: [] },
      purge: { name: 'delete', description: 'Delete', scope: 'application', parameters: [] },
      refresh: { name: 'update', description: 'Refresh', scope: 'application', parameters: [] },
      updateShelf: {
        name: 'update',
        description: 'Update a shelf',
        scope: 'resource',
        resourceType: 'Shelf',
        parameters: [],
        unsupported: {
          evidence: {
            source: 'live',
            observedAt: '2026-01-15T10:30:00.000Z',
            bundleId: 'com.example.widgets',
            appVersion: '1.0',
            osVersion: '27.2',
            expression: 'the shelves collection at the application',
            errorNumber: -1728,
          },
        },
      },
    })
    expect(unselectableItemCommands(manifest).map((entry) => entry.commandKey)).toEqual([
      'remove',
      'purge',
    ])
  })

  it('is empty for a manifest whose item commands all declare an identifier', () => {
    const manifest = manifestWith({
      getWidget: {
        name: 'get',
        description: 'Get a widget',
        scope: 'resource',
        resourceType: 'Widget',
        parameters: [param('id', true)],
      },
    })
    expect(unselectableItemCommands(manifest)).toEqual([])
  })
})
