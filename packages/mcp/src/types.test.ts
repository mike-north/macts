import { describe, it, expect } from 'vitest'
import type { McpPlugin, McpToolDefinition, JsonSchema, McpServerOptions } from './types.js'

describe('types', () => {
  describe('McpToolDefinition', () => {
    it('should accept valid tool definition', () => {
      const tool: McpToolDefinition = {
        name: 'macts__calendar__calendars_list',
        description: 'List calendars',
        inputSchema: { type: 'object' },
        handler: async () => Promise.resolve({ result: 'ok' }),
      }

      expect(tool.name).toBe('macts__calendar__calendars_list')
    })

    it('should accept tool with complex schema', () => {
      const tool: McpToolDefinition = {
        name: 'macts__calendar__events_create',
        description: 'Create an event',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string' },
            title: { type: 'string' },
            startDate: { type: 'string' },
          },
          required: ['calendarId', 'title', 'startDate'],
        },
        handler: async (args) => Promise.resolve({ success: true, args }),
      }

      expect(tool.name).toBe('macts__calendar__events_create')
      expect(tool.inputSchema.type).toBe('object')
    })

    it('should accept handler that returns any JSON-serializable value', async () => {
      const tool: McpToolDefinition = {
        name: 'test',
        description: 'test',
        inputSchema: {},
        handler: async () =>
          Promise.resolve({
            string: 'value',
            number: 123,
            boolean: true,
            array: [1, 2, 3],
            object: { nested: 'value' },
            null: null,
          }),
      }

      const result = await tool.handler({})
      expect(result).toBeDefined()
    })
  })

  describe('McpPlugin', () => {
    it('should accept valid plugin with no tools', () => {
      const plugin: McpPlugin = {
        name: 'test',
        description: 'Test plugin',
        tools: [],
      }

      expect(plugin.tools).toHaveLength(0)
    })

    it('should accept valid plugin with multiple tools', () => {
      const plugin: McpPlugin = {
        name: 'calendar',
        description: 'Calendar plugin',
        tools: [
          {
            name: 'macts__calendar__calendars_list',
            description: 'List calendars',
            inputSchema: { type: 'object' },
            handler: async () => Promise.resolve({ calendars: [] }),
          },
          {
            name: 'macts__calendar__events_list',
            description: 'List events',
            inputSchema: { type: 'object' },
            handler: async () => Promise.resolve({ events: [] }),
          },
        ],
      }

      expect(plugin.tools).toHaveLength(2)
    })
  })

  describe('JsonSchema', () => {
    it('should accept simple schema', () => {
      const schema: JsonSchema = {
        type: 'object',
      }

      expect(schema.type).toBe('object')
    })

    it('should accept schema with properties', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      }

      expect(schema.properties?.['name']?.type).toBe('string')
    })

    it('should accept schema with nested objects', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      }

      expect(schema.properties?.['user']?.type).toBe('object')
    })

    it('should accept array schema', () => {
      const schema: JsonSchema = {
        type: 'array',
        items: { type: 'string' },
      }

      expect(schema.items?.type).toBe('string')
    })

    it('should accept enum schema', () => {
      const schema: JsonSchema = {
        type: 'string',
        enum: ['read', 'write', 'admin'],
      }

      expect(schema.enum).toContain('read')
    })

    it('should allow additional JSON Schema properties', () => {
      const schema: JsonSchema = {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-z]+$',
      }

      expect(schema.type).toBe('string')
    })
  })

  describe('McpServerOptions', () => {
    it('should accept empty options', () => {
      const options: McpServerOptions = {}
      expect(options).toBeDefined()
    })

    it('should accept name and version', () => {
      const options: McpServerOptions = {
        name: 'custom-server',
        version: '1.2.3',
      }

      expect(options.name).toBe('custom-server')
      expect(options.version).toBe('1.2.3')
    })

    it('should accept partial options', () => {
      const options1: McpServerOptions = { name: 'server' }
      const options2: McpServerOptions = { version: '1.0.0' }

      expect(options1.name).toBe('server')
      expect(options2.version).toBe('1.0.0')
    })
  })
})
