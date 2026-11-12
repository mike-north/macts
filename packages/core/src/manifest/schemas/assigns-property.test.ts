/** Manifest acceptance for a property-backed convenience over a selected item. */
import { describe, expect, it } from 'vitest'
import { AppManifestSchema } from './app.js'

/** A complete operation may assign only a writable, type-compatible property. */
function manifest(
  overrides: Record<string, unknown> = {},
  propertyOverrides: Record<string, unknown> = {}
) {
  return {
    version: '1.0',
    app: { name: 'Reminders', bundleId: 'com.example.reminders' },
    resources: {
      Reminder: {
        name: 'Reminder',
        plural: 'Reminders',
        description: 'A reminder',
        properties: {
          id: { type: 'string', access: 'r', description: 'Identity' },
          completed: {
            type: 'boolean',
            access: 'rw',
            description: 'Completion',
            ...propertyOverrides,
          },
        },
      },
    },
    hierarchy: { children: { reminders: { resource: 'Reminder', access: 'r' } } },
    commands: {
      complete: {
        name: 'complete',
        description: 'Complete a reminder',
        scope: 'resource',
        resourceType: 'Reminder',
        permission: 'reminders:reminders:update',
        parameters: [{ name: 'id', type: 'string', description: 'Identity', required: true }],
        assignsProperty: { property: 'completed', value: true },
        ...overrides,
      },
    },
  }
}

describe('property-backed convenience', () => {
  it('retains a valid fixed assignment', () => {
    const parsed = AppManifestSchema.parse(manifest())
    expect(parsed.commands['complete']?.assignsProperty).toEqual({
      property: 'completed',
      value: true,
    })
  })

  it.each([
    ['read risk', { risk: 'read' }],
    ['unknown property', { assignsProperty: { property: 'missing', value: true } }],
    ['read-only property', { assignsProperty: { property: 'id', value: 'x' } }],
    ['type mismatch', { assignsProperty: { property: 'completed', value: 'true' } }],
    [
      'extra input',
      {
        parameters: [
          { name: 'id', type: 'string', description: 'Identity', required: true },
          { name: 'other', type: 'string', description: 'Other', required: false },
        ],
      },
    ],
    ['missing permission', { permission: undefined }],
    ['collection command', { name: 'list' }],
    ['application scope', { scope: 'application' }],
  ])('rejects %s', (_name, override) => {
    expect(AppManifestSchema.safeParse(manifest(override)).success).toBe(false)
  })
})

const unsupportedProperty = {
  reason: 'The application cannot provide this property.',
  evidence: {
    source: 'probe',
    observedAt: '2026-11-01T00:00:00.000Z',
    bundleId: 'com.example.reminders',
    appVersion: '1',
    osVersion: '27',
    sampleSize: 1,
    failedReads: 1,
    errorNumbers: [-1728],
  },
}

it('rejects an exposed assignment to an unsupported property', () => {
  expect(
    AppManifestSchema.safeParse(manifest({}, { unsupported: unsupportedProperty })).success
  ).toBe(false)
})

it('rejects an assignment to an inherited unsupported property', () => {
  const input = manifest()
  const resources = {
    ...input.resources,
    Base: {
      name: 'Base',
      plural: 'Bases',
      description: 'Base reminder',
      properties: {
        completed: {
          type: 'boolean',
          access: 'rw',
          description: 'Completion',
          unsupported: unsupportedProperty,
        },
      },
    },
    Reminder: {
      ...input.resources.Reminder,
      properties: { id: input.resources.Reminder.properties.id },
      inherits: {
        resource: 'Base',
        evidence: {
          source: 'dictionary',
          bundleId: 'com.example.reminders',
          appVersion: '1',
          osVersion: '27',
          term: 'base',
        },
      },
    },
  }
  expect(AppManifestSchema.safeParse({ ...input, resources, commands: {} }).success).toBe(true)
  expect(AppManifestSchema.safeParse({ ...input, resources }).success).toBe(false)
})
