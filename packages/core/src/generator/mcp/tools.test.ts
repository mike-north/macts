/**
 * Tests for MCP tool generation.
 */

import { describe, it, expect } from 'vitest'
import {
  generateToolName,
  generateResourceOperationSchema,
  generateAppCommandSchema,
  generateResourceTool,
  generateAppTool,
} from './tools.js'
import type { Resource, Command } from '../../manifest/index.js'

describe('generateToolName', () => {
  it('should generate correct tool name format', () => {
    const name = generateToolName('calendar', 'calendars', 'list')
    expect(name).toBe('macts__calendar__calendars_list')
  })

  it('should handle uppercase app names', () => {
    const name = generateToolName('Calendar', 'events', 'create')
    expect(name).toBe('macts__calendar__events_create')
  })

  it('should handle mixed case resource names', () => {
    const name = generateToolName('mail', 'MessageRules', 'get')
    expect(name).toBe('macts__mail__messagerules_get')
  })
})

describe('generateResourceOperationSchema', () => {
  const mockCalendar: Resource = {
    name: 'Calendar',
    plural: 'Calendars',
    description: 'A calendar',
    properties: {
      calendarIdentifier: {
        access: 'r',
        type: 'string',
        description: 'Calendar ID',
        optional: false,
      },
      name: {
        access: 'rw',
        type: 'string',
        description: 'Calendar name',
        optional: false,
      },
      color: {
        access: 'rw',
        type: 'string',
        description: 'Calendar color',
        optional: true,
      },
    },
    identifiers: [
      {
        property: 'calendarIdentifier',
        primary: true,
      },
    ],
  }

  it('should generate schema for list operation with no required fields', () => {
    const command: Command = {
      name: 'list',
      description: 'List calendars',
      scope: 'resource',
      parameters: [],
    }

    const schema = generateResourceOperationSchema(command, mockCalendar)

    expect(schema.type).toBe('object')
    expect(schema.properties).toEqual({})
    expect(schema.required).toBeUndefined()
    expect(schema.additionalProperties).toBe(false)
  })

  it('should generate schema for get operation with identifier', () => {
    const command: Command = {
      name: 'get',
      description: 'Get calendar',
      scope: 'resource',
      parameters: [],
    }

    const schema = generateResourceOperationSchema(command, mockCalendar)

    expect(schema.type).toBe('object')
    expect(schema.properties).toHaveProperty('calendarIdentifier')
    expect(schema.properties?.['calendarIdentifier']).toEqual({
      type: 'string',
      description: 'Calendar ID',
    })
    expect(schema.required).toEqual(['calendarIdentifier'])
  })

  it('should generate schema for create operation with writable properties', () => {
    const command: Command = {
      name: 'create',
      description: 'Create calendar',
      scope: 'resource',
      parameters: [],
    }

    const schema = generateResourceOperationSchema(command, mockCalendar)

    expect(schema.type).toBe('object')
    expect(schema.properties).toHaveProperty('name')
    expect(schema.properties).toHaveProperty('color')
    expect(schema.required).toEqual(['name']) // name is required, color is optional
  })

  it('should generate schema for update operation with identifier and writable properties', () => {
    const command: Command = {
      name: 'update',
      description: 'Update calendar',
      scope: 'resource',
      parameters: [],
    }

    const schema = generateResourceOperationSchema(command, mockCalendar)

    expect(schema.type).toBe('object')
    expect(schema.properties).toHaveProperty('calendarIdentifier')
    expect(schema.properties).toHaveProperty('name')
    expect(schema.properties).toHaveProperty('color')
    expect(schema.required).toEqual(['calendarIdentifier'])
  })

  it('should include command parameters in schema', () => {
    const command: Command = {
      name: 'list',
      description: 'List calendars',
      scope: 'resource',
      parameters: [
        {
          name: 'startDate',
          type: 'date',
          description: 'Start date filter',
          required: false,
        },
        {
          name: 'endDate',
          type: 'date',
          description: 'End date filter',
          required: false,
        },
      ],
    }

    const schema = generateResourceOperationSchema(command, mockCalendar)

    expect(schema.properties).toHaveProperty('startDate')
    expect(schema.properties).toHaveProperty('endDate')
    expect(schema.properties?.['startDate']).toEqual({
      type: 'string',
      description: 'Start date filter',
    })
  })

  // Regression: custom resource commands (e.g. "show") take exactly their manifest
  // parameters — the SDK does not synthesize an extra ID argument for them. Adding an
  // implicit identifier made the MCP handler call `show(id)` while the SDK method is
  // `show()`, producing a TS2554 "Expected 0 arguments, but got 1".
  it('should not synthesize an implicit identifier for custom resource commands', () => {
    const command: Command = {
      name: 'show',
      description: 'Show the calendar',
      scope: 'resource',
      parameters: [],
    }

    const schema = generateResourceOperationSchema(command, mockCalendar)

    expect(schema.properties).toEqual({})
    expect(schema.required).toBeUndefined()
  })

  // Regression: JSON Schema `items` must be a schema object. A primitive element type
  // was emitted as a bare string (`items: 'string'`), which is not assignable to the
  // `items?: JsonSchema` field (TS2322).
  it('should emit array `items` as a schema object, not a bare type string', () => {
    const command: Command = {
      name: 'list',
      description: 'List with array filter',
      scope: 'resource',
      parameters: [
        {
          name: 'tags',
          type: { array: 'string' },
          description: 'Tag filters',
          required: false,
        },
      ],
    }

    const schema = generateResourceOperationSchema(command, mockCalendar)

    expect(schema.properties?.['tags']).toEqual({
      type: 'array',
      items: { type: 'string' },
      description: 'Tag filters',
    })
  })
})

describe('generateAppCommandSchema', () => {
  it('should generate schema with no parameters', () => {
    const command: Command = {
      name: 'reloadCalendars',
      description: 'Reload calendars',
      scope: 'application',
      parameters: [],
    }

    const schema = generateAppCommandSchema(command)

    expect(schema.type).toBe('object')
    expect(schema.properties).toEqual({})
    expect(schema.required).toBeUndefined()
  })

  it('should generate schema with required parameters', () => {
    const command: Command = {
      name: 'switchView',
      description: 'Switch calendar view',
      scope: 'application',
      parameters: [
        {
          name: 'viewType',
          type: 'string',
          description: 'View type',
          required: true,
        },
      ],
    }

    const schema = generateAppCommandSchema(command)

    expect(schema.properties).toHaveProperty('viewType')
    expect(schema.required).toEqual(['viewType'])
  })

  it('should generate schema with optional parameters', () => {
    const command: Command = {
      name: 'doSomething',
      description: 'Do something',
      scope: 'application',
      parameters: [
        {
          name: 'option1',
          type: 'string',
          description: 'Option 1',
          required: true,
        },
        {
          name: 'option2',
          type: 'boolean',
          description: 'Option 2',
          required: false,
        },
      ],
    }

    const schema = generateAppCommandSchema(command)

    expect(schema.properties).toHaveProperty('option1')
    expect(schema.properties).toHaveProperty('option2')
    expect(schema.required).toEqual(['option1'])
  })
})

describe('generateResourceTool', () => {
  const mockResource: Resource = {
    name: 'Event',
    plural: 'Events',
    description: 'A calendar event',
    properties: {
      uid: {
        access: 'r',
        type: 'string',
        description: 'Event UID',
        optional: false,
      },
      summary: {
        access: 'rw',
        type: 'string',
        description: 'Event summary',
        optional: false,
      },
    },
    identifiers: [
      {
        property: 'uid',
        primary: true,
      },
    ],
  }

  const mockCommand: Command = {
    name: 'list',
    description: 'List events',
    scope: 'resource',
    parameters: [],
  }

  it('should generate tool with correct structure', () => {
    const tool = generateResourceTool('calendar', mockResource, mockCommand)

    expect(tool.name).toBe('macts__calendar__events_list')
    expect(tool.resourceName).toBe('events')
    expect(tool.operationName).toBe('list')
    expect(tool.commandName).toBe('list')
    expect(tool.description).toBe('List events')
    expect(tool.isResourceOperation).toBe(true)
    expect(tool.resourceType).toBe('Event')
    expect(tool.inputSchema).toBeDefined()
  })
})

describe('generateAppTool', () => {
  const mockCommand: Command = {
    name: 'reloadCalendars',
    description: 'Reload all calendars',
    scope: 'application',
    parameters: [],
  }

  it('should generate app tool with correct structure', () => {
    const tool = generateAppTool('calendar', mockCommand)

    expect(tool.name).toBe('macts__calendar__app_reload_calendars')
    expect(tool.resourceName).toBe('app')
    expect(tool.operationName).toBe('reloadCalendars')
    expect(tool.commandName).toBe('reloadCalendars')
    expect(tool.description).toBe('Reload all calendars')
    expect(tool.isResourceOperation).toBe(false)
    expect(tool.resourceType).toBeUndefined()
    expect(tool.inputSchema).toBeDefined()
  })
})
