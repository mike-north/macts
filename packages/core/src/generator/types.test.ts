import { describe, it, expect } from 'vitest';
import { propertyTypeToTs, generateReadType, generateCreateInputType, generateUpdateInputType, generateEnumType, generateTypes } from './types.js';
import { createGeneratorContext } from './context.js';
import type { AppManifest, Resource, Enum } from '../manifest/index.js';

describe('propertyTypeToTs', () => {
  it('should convert primitive types', () => {
    expect(propertyTypeToTs('string')).toBe('string');
    expect(propertyTypeToTs('number')).toBe('number');
    expect(propertyTypeToTs('integer')).toBe('number');
    expect(propertyTypeToTs('boolean')).toBe('boolean');
    expect(propertyTypeToTs('date')).toBe('Date');
    expect(propertyTypeToTs('data')).toBe('ArrayBuffer');
    expect(propertyTypeToTs('file')).toBe('string');
    expect(propertyTypeToTs('any')).toBe('unknown');
  });

  it('should convert structured types', () => {
    expect(propertyTypeToTs('point')).toBe('{ x: number; y: number }');
    expect(propertyTypeToTs('rect')).toBe('{ x: number; y: number; width: number; height: number }');
    expect(propertyTypeToTs('rgb')).toBe('{ r: number; g: number; b: number }');
  });

  it('should convert array types', () => {
    expect(propertyTypeToTs({ array: 'string' })).toBe('string[]');
    expect(propertyTypeToTs({ array: 'number' })).toBe('number[]');
    expect(propertyTypeToTs({ array: { array: 'string' } })).toBe('string[][]');
  });

  it('should convert enum references', () => {
    expect(propertyTypeToTs({ enum: 'Status' })).toBe('Status');
  });

  it('should convert resource references', () => {
    expect(propertyTypeToTs({ resource: 'Calendar' })).toBe('Calendar');
  });

  it('should handle undefined', () => {
    expect(propertyTypeToTs(undefined)).toBe('unknown');
  });

  it('should handle custom type names', () => {
    expect(propertyTypeToTs('CustomType')).toBe('CustomType');
  });

  // Negative tests - edge cases and unusual inputs
  it('should return unknown for empty object', () => {
    // An object that doesn't match any known pattern
    expect(propertyTypeToTs({} as never)).toBe('unknown');
  });

  it('should handle deeply nested arrays', () => {
    expect(propertyTypeToTs({ array: { array: { array: 'string' } } })).toBe('string[][][]');
  });

  it('should handle array of resource references', () => {
    expect(propertyTypeToTs({ array: { resource: 'Event' } })).toBe('Event[]');
  });

  it('should handle array of enum references', () => {
    expect(propertyTypeToTs({ array: { enum: 'Status' } })).toBe('Status[]');
  });
});

describe('generateReadType', () => {
  const createContext = (resource: Resource): ReturnType<typeof createGeneratorContext> => {
    const manifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: { [resource.name]: resource },
      enums: {},
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };
    return createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });
  };

  it('should generate interface with properties', () => {
    const resource: Resource = {
      name: 'Calendar',
      plural: 'calendars',
      description: 'A calendar',
      properties: {
        name: { access: 'rw', description: 'Name', type: 'string', optional: false },
        uid: { access: 'r', description: 'UID', type: 'string', optional: false },
      },
    };

    const ctx = createContext(resource);
    const result = generateReadType(resource, ctx);

    expect(result.name).toBe('Calendar');
    expect(result.content).toContain('export interface Calendar');
    expect(result.content).toContain('readonly uid: string;');
    expect(result.content).toContain('name: string;');
    expect(result.imports).toEqual([]);
  });

  it('should handle optional properties', () => {
    const resource: Resource = {
      name: 'Event',
      plural: 'events',
      description: 'An event',
      properties: {
        summary: { access: 'rw', description: 'Summary', type: 'string', optional: false },
        location: { access: 'rw', description: 'Location', type: 'string', optional: true },
      },
    };

    const ctx = createContext(resource);
    const result = generateReadType(resource, ctx);

    expect(result.content).toContain('summary: string;');
    expect(result.content).toContain('location?: string;');
  });

  it('should handle resources with no properties', () => {
    const resource: Resource = {
      name: 'EmptyResource',
      plural: 'empty',
      description: 'Empty',
      properties: {},
    };

    const ctx = createContext(resource);
    const result = generateReadType(resource, ctx);

    expect(result.content).toContain('export interface EmptyResource');
  });
});

describe('generateCreateInputType', () => {
  const createContext = (resource: Resource): ReturnType<typeof createGeneratorContext> => {
    const manifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: { [resource.name]: resource },
      enums: {},
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };
    return createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });
  };

  it('should only include writable properties', () => {
    const resource: Resource = {
      name: 'Calendar',
      plural: 'calendars',
      description: 'A calendar',
      properties: {
        name: { access: 'rw', description: 'Name', type: 'string', optional: false },
        uid: { access: 'r', description: 'UID', type: 'string', optional: false },
        color: { access: 'rw', description: 'Color', type: 'string', optional: false },
      },
    };

    const ctx = createContext(resource);
    const result = generateCreateInputType(resource, ctx);

    expect(result.name).toBe('CalendarCreateInput');
    expect(result.content).toContain('export interface CalendarCreateInput');
    expect(result.content).toContain('name: string;');
    expect(result.content).toContain('color: string;');
    expect(result.content).not.toContain('uid');
  });

  it('should make properties optional if they have defaults', () => {
    const resource: Resource = {
      name: 'Event',
      plural: 'events',
      description: 'An event',
      properties: {
        summary: { access: 'rw', description: 'Summary', type: 'string', optional: false },
        allDay: { access: 'rw', description: 'All day', type: 'boolean', default: false, optional: false },
      },
    };

    const ctx = createContext(resource);
    const result = generateCreateInputType(resource, ctx);

    expect(result.content).toContain('summary: string;');
    expect(result.content).toContain('allDay?: boolean;');
  });

  it('should respect optional flag', () => {
    const resource: Resource = {
      name: 'Event',
      plural: 'events',
      description: 'An event',
      properties: {
        summary: { access: 'rw', description: 'Summary', type: 'string', optional: false },
        notes: { access: 'rw', description: 'Notes', type: 'string', optional: true },
      },
    };

    const ctx = createContext(resource);
    const result = generateCreateInputType(resource, ctx);

    expect(result.content).toContain('summary: string;');
    expect(result.content).toContain('notes?: string;');
  });
});

describe('generateUpdateInputType', () => {
  const createContext = (resource: Resource): ReturnType<typeof createGeneratorContext> => {
    const manifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: { [resource.name]: resource },
      enums: {},
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };
    return createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });
  };

  it('should make all writable properties optional', () => {
    const resource: Resource = {
      name: 'Calendar',
      plural: 'calendars',
      description: 'A calendar',
      properties: {
        name: { access: 'rw', description: 'Name', type: 'string', optional: false },
        uid: { access: 'r', description: 'UID', type: 'string', optional: false },
        color: { access: 'rw', description: 'Color', type: 'string', optional: false },
      },
    };

    const ctx = createContext(resource);
    const result = generateUpdateInputType(resource, ctx);

    expect(result.name).toBe('CalendarUpdateInput');
    expect(result.content).toContain('export interface CalendarUpdateInput');
    expect(result.content).toContain('name?: string;');
    expect(result.content).toContain('color?: string;');
    expect(result.content).not.toContain('uid');
  });

  it('should exclude read-only properties', () => {
    const resource: Resource = {
      name: 'Event',
      plural: 'events',
      description: 'An event',
      properties: {
        id: { access: 'r', description: 'ID', type: 'string', optional: false },
        createdAt: { access: 'r', description: 'Created', type: 'date', optional: false },
        summary: { access: 'rw', description: 'Summary', type: 'string', optional: false },
      },
    };

    const ctx = createContext(resource);
    const result = generateUpdateInputType(resource, ctx);

    expect(result.content).toContain('summary?: string;');
    expect(result.content).not.toContain('id');
    expect(result.content).not.toContain('createdAt');
  });
});

describe('generateEnumType', () => {
  it('should generate string literal union', () => {
    const enumDef: Enum = {
      name: 'Status',
      description: 'Status',
      values: [
        { name: 'active', value: 'active', description: 'Active' },
        { name: 'inactive', value: 'inactive', description: 'Inactive' },
      ],
    };

    const result = generateEnumType(enumDef);

    expect(result.name).toBe('Status');
    expect(result.content).toBe("export type Status = 'active' | 'inactive';");
    expect(result.imports).toEqual([]);
  });

  it('should handle single-value enum', () => {
    const enumDef: Enum = {
      name: 'SingleValue',
      description: 'Single',
      values: [
        { name: 'only', value: 'only', description: 'Only value' },
      ],
    };

    const result = generateEnumType(enumDef);

    expect(result.content).toBe("export type SingleValue = 'only';");
  });

  it('should handle enum with many values', () => {
    const enumDef: Enum = {
      name: 'Priority',
      description: 'Priority',
      values: [
        { name: 'low', value: 'low', description: 'Low' },
        { name: 'medium', value: 'medium', description: 'Medium' },
        { name: 'high', value: 'high', description: 'High' },
        { name: 'urgent', value: 'urgent', description: 'Urgent' },
      ],
    };

    const result = generateEnumType(enumDef);

    expect(result.content).toContain("'low'");
    expect(result.content).toContain("'medium'");
    expect(result.content).toContain("'high'");
    expect(result.content).toContain("'urgent'");
  });
});

describe('generateTypes', () => {
  it('should generate all types for a manifest', () => {
    const manifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: {
        Calendar: {
          name: 'Calendar',
          plural: 'calendars',
          description: 'A calendar',
          properties: {
            name: { access: 'rw', description: 'Name', type: 'string', optional: false },
          },
        },
        Event: {
          name: 'Event',
          plural: 'events',
          description: 'An event',
          properties: {
            summary: { access: 'rw', description: 'Summary', type: 'string', optional: false },
          },
        },
      },
      enums: {
        Status: {
          name: 'Status',
          description: 'Status',
          values: [
            { name: 'active', value: 'active', description: 'Active' },
          ],
        },
      },
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };

    const ctx = createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });
    const types = generateTypes(ctx);

    // Should generate 3 types per resource + 1 per enum
    // Calendar: Calendar, CalendarCreateInput, CalendarUpdateInput
    // Event: Event, EventCreateInput, EventUpdateInput
    // Status: Status
    expect(types).toHaveLength(7);

    const typeNames = types.map(t => t.name);
    expect(typeNames).toContain('Calendar');
    expect(typeNames).toContain('CalendarCreateInput');
    expect(typeNames).toContain('CalendarUpdateInput');
    expect(typeNames).toContain('Event');
    expect(typeNames).toContain('EventCreateInput');
    expect(typeNames).toContain('EventUpdateInput');
    expect(typeNames).toContain('Status');
  });

  it('should handle manifest with no resources', () => {
    const manifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: {},
      enums: {
        Status: {
          name: 'Status',
          description: 'Status',
          values: [
            { name: 'active', value: 'active', description: 'Active' },
          ],
        },
      },
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };

    const ctx = createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });
    const types = generateTypes(ctx);

    expect(types).toHaveLength(1);
    expect(types[0]?.name).toBe('Status');
  });

  it('should handle manifest with no enums', () => {
    const manifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: {
        Calendar: {
          name: 'Calendar',
          plural: 'calendars',
          description: 'A calendar',
          properties: {},
        },
      },
      enums: {},
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };

    const ctx = createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });
    const types = generateTypes(ctx);

    expect(types).toHaveLength(3);
    const typeNames = types.map(t => t.name);
    expect(typeNames).toContain('Calendar');
    expect(typeNames).toContain('CalendarCreateInput');
    expect(typeNames).toContain('CalendarUpdateInput');
  });
});
