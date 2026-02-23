/**
 * Tests for request validation with Zod schemas.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from 'vitest'
import type { Command } from '@macts/core'
import { buildCommandSchema, buildSchemaRegistry } from './validation.js'

/**
 * Create a minimal Command for testing, with overrides.
 */
function createCommand(overrides: Partial<Command> = {}): Command {
  return {
    name: 'testCommand',
    description: 'A test command',
    scope: 'application',
    parameters: [],
    ...overrides,
  }
}

describe('buildCommandSchema', () => {
  describe('positive cases', () => {
    it('should accept valid string parameters', () => {
      const command = createCommand({
        parameters: [{ name: 'title', type: 'string', description: 'Title', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ title: 'Hello' })
      expect(result.success).toBe(true)
    })

    it('should accept valid number parameters', () => {
      const command = createCommand({
        parameters: [{ name: 'count', type: 'number', description: 'Count', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ count: 42 })
      expect(result.success).toBe(true)
    })

    it('should accept valid integer parameters', () => {
      const command = createCommand({
        parameters: [{ name: 'index', type: 'integer', description: 'Index', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ index: 7 })
      expect(result.success).toBe(true)
    })

    it('should accept valid boolean parameters', () => {
      const command = createCommand({
        parameters: [{ name: 'active', type: 'boolean', description: 'Active', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ active: true })
      expect(result.success).toBe(true)
    })

    it('should accept ISO datetime strings for date parameters', () => {
      const command = createCommand({
        parameters: [{ name: 'startDate', type: 'date', description: 'Start', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ startDate: '2024-01-15T10:30:00Z' })
      expect(result.success).toBe(true)
    })

    it('should accept ISO date strings for date parameters', () => {
      const command = createCommand({
        parameters: [{ name: 'startDate', type: 'date', description: 'Start', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ startDate: '2024-01-15' })
      expect(result.success).toBe(true)
    })

    it('should allow omitting optional parameters', () => {
      const command = createCommand({
        parameters: [
          { name: 'title', type: 'string', description: 'Title', required: true },
          { name: 'notes', type: 'string', description: 'Notes', required: false },
        ],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ title: 'Hello' })
      expect(result.success).toBe(true)
    })

    it('should accept multiple parameters of different types', () => {
      const command = createCommand({
        parameters: [
          { name: 'title', type: 'string', description: 'Title', required: true },
          { name: 'count', type: 'number', description: 'Count', required: true },
          { name: 'active', type: 'boolean', description: 'Active', required: false },
        ],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ title: 'Test', count: 5, active: true })
      expect(result.success).toBe(true)
    })

    it('should pass through unknown properties', () => {
      const command = createCommand({
        parameters: [{ name: 'title', type: 'string', description: 'Title', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ title: 'Hello', extra: 'field' })
      expect(result.success).toBe(true)
    })

    it('should accept any object when command has no parameters', () => {
      const command = createCommand({ parameters: [] })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ anything: 'goes' })
      expect(result.success).toBe(true)
    })

    it('should accept empty object when command has no parameters', () => {
      const command = createCommand({ parameters: [] })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should treat unknown parameter types as string', () => {
      const command = createCommand({
        parameters: [{ name: 'custom', type: 'customType', description: 'Custom', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ custom: 'a string value' })
      expect(result.success).toBe(true)
    })
  })

  describe('negative cases', () => {
    it('should reject wrong type for string parameter', () => {
      const command = createCommand({
        parameters: [{ name: 'title', type: 'string', description: 'Title', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ title: 123 })
      expect(result.success).toBe(false)
      expect(result.error?.issues).toHaveLength(1)
      expect(result.error?.issues[0]?.path).toEqual(['title'])
    })

    it('should reject wrong type for number parameter', () => {
      const command = createCommand({
        parameters: [{ name: 'count', type: 'number', description: 'Count', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ count: 'not-a-number' })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.path).toEqual(['count'])
    })

    it('should reject wrong type for boolean parameter', () => {
      const command = createCommand({
        parameters: [{ name: 'active', type: 'boolean', description: 'Active', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ active: 'yes' })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.path).toEqual(['active'])
    })

    it('should reject invalid date strings', () => {
      const command = createCommand({
        parameters: [{ name: 'startDate', type: 'date', description: 'Start', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ startDate: 'not-a-date' })
      expect(result.success).toBe(false)
    })

    it('should reject missing required parameters', () => {
      const command = createCommand({
        parameters: [{ name: 'title', type: 'string', description: 'Title', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({})
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.path).toEqual(['title'])
    })

    it('should reject non-object input', () => {
      const command = createCommand({
        parameters: [{ name: 'title', type: 'string', description: 'Title', required: true }],
      })
      const schema = buildCommandSchema(command)
      expect(schema.safeParse('a string').success).toBe(false)
      expect(schema.safeParse(42).success).toBe(false)
      expect(schema.safeParse(null).success).toBe(false)
    })

    it('should reject numeric date values', () => {
      const command = createCommand({
        parameters: [{ name: 'startDate', type: 'date', description: 'Start', required: true }],
      })
      const schema = buildCommandSchema(command)
      const result = schema.safeParse({ startDate: 1705334400000 })
      expect(result.success).toBe(false)
    })
  })
})

describe('buildSchemaRegistry', () => {
  it('should create schemas for all commands', () => {
    const commands: Record<string, Command> = {
      list: createCommand({
        name: 'list',
        parameters: [],
      }),
      create: createCommand({
        name: 'create',
        parameters: [{ name: 'title', type: 'string', description: 'Title', required: true }],
      }),
    }

    const registry = buildSchemaRegistry(commands)
    expect(registry.size).toBe(2)
    expect(registry.has('list')).toBe(true)
    expect(registry.has('create')).toBe(true)
  })

  it('should return an empty map for empty commands', () => {
    const registry = buildSchemaRegistry({})
    expect(registry.size).toBe(0)
  })

  it('should produce schemas that validate correctly', () => {
    const commands: Record<string, Command> = {
      create: createCommand({
        name: 'create',
        parameters: [
          { name: 'title', type: 'string', description: 'Title', required: true },
          { name: 'count', type: 'number', description: 'Count', required: true },
        ],
      }),
    }

    const registry = buildSchemaRegistry(commands)
    const schema = registry.get('create')
    expect(schema).toBeDefined()

    const valid = schema!.safeParse({ title: 'Test', count: 5 })
    expect(valid.success).toBe(true)

    const invalid = schema!.safeParse({ title: 'Test', count: 'not-a-number' })
    expect(invalid.success).toBe(false)
  })
})
