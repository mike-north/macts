/**
 * Tests for capability operation input schemas and MCP tool names.
 *
 * @see https://json-schema.org/draft-07/json-schema-validation (minimum, maximum, default)
 * @see phases/13-sdk-value-and-execution-contracts.md §D9 (Bounded list pages)
 */

import { describe, it, expect } from 'vitest'
import {
  generateToolName,
  generateResourceOperationSchema,
  generateAppCommandSchema,
} from './operation-schema.js'
import type { Resource, Command } from '../manifest/index.js'
import { RANGE_READ_SUPPORTED, UNIQUE_CLAIM } from '../manifest/test-support/unique-claim.js'

describe('generateToolName', () => {
  it('should generate correct tool name format', () => {
    const name = generateToolName('calendar', 'calendars', 'list')
    expect(name).toBe('macts__calendar__calendars_list')
  })

  it('should handle uppercase app names', () => {
    const name = generateToolName('Calendar', 'events', 'create')
    expect(name).toBe('macts__calendar__events_create')
  })

  it('keeps the resource segment as given', () => {
    // The resource part is the resource segment, spelled as in the route
    // `mail.messageRules.get` (issue #154); it is not lowercased again.
    const name = generateToolName('mail', 'messageRules', 'get')
    expect(name).toBe('macts__mail__messageRules_get')
  })
})

/**
 * The operation part of a tool name is snake case with each acronym one word,
 * the same word split that spells resources in lower camel case (issue #154).
 * Each expected value is split by hand: acronym runs stay together, the
 * capital that starts the next word starts a new word, and a lone `s` after
 * an acronym is its plural.
 */
describe('generateToolName operation snake case', () => {
  const operation = (name: string) =>
    generateToolName('app', 'app', name).slice('macts__app__app_'.length)

  it('splits a camel case operation at each capital', () => {
    expect(operation('splitVertically')).toBe('split_vertically')
    expect(operation('reloadCalendars')).toBe('reload_calendars')
  })

  it('keeps an acronym inside an operation as one word', () => {
    // iTerm's `invokeAPIExpression`: invoke / API / Expression.
    expect(generateToolName('iterm', 'app', 'invokeAPIExpression')).toBe(
      'macts__iterm__app_invoke_api_expression'
    )
  })

  it('keeps an acronym that ends an operation as one word', () => {
    expect(operation('getURL')).toBe('get_url')
    expect(operation('exportPDF')).toBe('export_pdf')
  })

  it('keeps an acronym that starts an operation as one word', () => {
    expect(operation('URLForName')).toBe('url_for_name')
    expect(operation('PDFExport')).toBe('pdf_export')
  })

  it("treats a lone s after an acronym as the acronym's plural", () => {
    expect(operation('listURLs')).toBe('list_urls')
  })

  it('keeps digits with the word before them', () => {
    expect(operation('getID3Tags')).toBe('get_id3_tags')
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

  // Regression (#90): when a get/update/delete command already declares a required
  // param (e.g. `id`), the resource's primary identifier property (e.g. `name`) must
  // NOT appear in `required`, even when that property is added to `properties` so
  // callers can see it.  Before the fix, `required` was `['id', 'name']`; after the
  // fix it is exactly the command's declared required params: `['id']`.
  it('should not include identifier property in required when the command already has a required param', () => {
    // Mirrors Calendar.calendars.get: param `id` (required), identifier property `name`.
    const calendarResource: Resource = {
      name: 'Calendar',
      plural: 'Calendars',
      description: 'A calendar',
      properties: {
        name: {
          access: 'rw',
          type: 'string',
          description: 'The calendar title',
          optional: false,
        },
        color: {
          access: 'rw',
          type: 'string',
          description: 'Calendar color',
          optional: true,
        },
        calendarIdentifier: {
          access: 'r',
          type: 'string',
          description: 'A unique calendar key',
          optional: false,
        },
      },
      identifiers: [
        {
          property: 'name',
          primary: true,
        },
      ],
    }

    const command: Command = {
      name: 'get',
      description: 'Get a calendar by ID',
      scope: 'resource',
      parameters: [
        {
          name: 'id',
          type: 'string',
          description: 'Calendar identifier',
          required: true,
        },
      ],
    }

    const schema = generateResourceOperationSchema(command, calendarResource)

    // Positive case: the command param is in required
    expect(schema.required).toEqual(['id'])
    // Negative case: the identifier property name ('name') is NOT in required
    expect(schema.required).not.toContain('name')
    // The identifier property is still present in properties (informational)
    expect(schema.properties).toHaveProperty('name')
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

describe('generateResourceOperationSchema: paging inputs', () => {
  const list: Command = {
    name: 'list',
    description: 'List items',
    scope: 'resource',
    parameters: [],
  }

  /** An item resource whose primary identifier entry is `identifier`. */
  /**
   * An item resource whose app reads ranges of its collection unless told
   * otherwise; `null` leaves the range read unobserved.
   */
  function item(
    identifier: NonNullable<Resource['identifiers']>[number],
    rangeRead: Resource['rangeRead'] | null = RANGE_READ_SUPPORTED.rangeRead
  ): Resource {
    return {
      name: 'Item',
      plural: 'Items',
      description: 'An item',
      properties: { id: { access: 'r', type: 'string', description: 'Item ID', optional: false } },
      identifiers: [identifier],
      ...(rangeRead === null ? {} : { rangeRead }),
    }
  }

  // Hand-written from page.ts: pageSize is an optional integer from 1 to 100,
  // 25 by default; cursor is an optional string. Neither is required.
  const PAGE_SIZE = {
    type: 'integer',
    minimum: 1,
    maximum: 100,
    default: 25,
    description: 'The most items to return, from 1 to 100 (default 25).',
  }

  it('shows pageSize, with its 1 to 100 range, and cursor for a list that pages', () => {
    const schema = generateResourceOperationSchema(
      list,
      item({ property: 'id', primary: true, ...UNIQUE_CLAIM })
    )

    expect(schema.properties?.['pageSize']).toEqual(PAGE_SIZE)
    expect(schema.properties?.['cursor']).toEqual({
      type: 'string',
      description:
        "The previous page's nextCursor, to read the page after it. Omit it to read the first page.",
    })
    expect(schema.required).toBeUndefined()
  })

  it('shows the paging inputs for a byProperty identifier claimed unique', () => {
    const schema = generateResourceOperationSchema(
      list,
      item({ property: 'id', primary: true, targeting: 'byProperty', ...UNIQUE_CLAIM })
    )

    expect(Object.keys(schema.properties ?? {})).toEqual(['pageSize', 'cursor'])
  })

  it.each([
    { label: 'makes no uniqueness claim', identifier: { property: 'id', primary: true } },
    {
      label: 'is claimed not unique',
      identifier: {
        property: 'id',
        primary: true,
        unique: false,
        evidence: { unique: { source: 'curated' as const, note: 'Ids repeat' } },
      },
    },
  ])('shows neither paging input for a list whose identifier $label', ({ identifier }) => {
    const schema = generateResourceOperationSchema(list, item(identifier))

    expect(schema.properties).toEqual({})
  })

  it('shows neither paging input for a unique identifier whose range read was not observed to work', () => {
    const unique = { property: 'id', primary: true, ...UNIQUE_CLAIM }
    const failed = {
      supported: false,
      evidence: { ...RANGE_READ_SUPPORTED.rangeRead.evidence, errorNumbers: [-1708] },
    }

    expect(generateResourceOperationSchema(list, item(unique, null)).properties).toEqual({})
    expect(generateResourceOperationSchema(list, item(unique, failed)).properties).toEqual({})
  })

  it('shows neither paging input for a command that is not a list', () => {
    const get: Command = { ...list, name: 'get' }
    const schema = generateResourceOperationSchema(
      get,
      item({ property: 'id', primary: true, ...UNIQUE_CLAIM })
    )

    expect(schema.properties).not.toHaveProperty('pageSize')
    expect(schema.properties).not.toHaveProperty('cursor')
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
