import { describe, it, expect } from 'vitest';
import {
  propertyTypeToZod,
  generateResourceSchema,
  generateEnumSchema,
  generateCreateInputSchema,
  generateUpdateInputSchema,
  generateSchemas,
} from './schemas.js';
import { createGeneratorContext } from './context.js';
import type { AppManifest, Enum } from '../manifest/index.js';

describe('propertyTypeToZod', () => {
  describe('primitive types', () => {
    it('should convert string types', () => {
      expect(propertyTypeToZod('string', false)).toBe('z.string()');
    });

    it('should convert number types', () => {
      expect(propertyTypeToZod('number', false)).toBe('z.number()');
      expect(propertyTypeToZod('integer', false)).toBe('z.number()');
    });

    it('should convert boolean type', () => {
      expect(propertyTypeToZod('boolean', false)).toBe('z.boolean()');
    });

    it('should convert date type', () => {
      expect(propertyTypeToZod('date', false)).toBe('z.date()');
    });

    it('should convert data type to ArrayBuffer', () => {
      expect(propertyTypeToZod('data', false)).toBe('z.instanceof(ArrayBuffer)');
    });

    it('should convert file type to string path', () => {
      expect(propertyTypeToZod('file', false)).toBe('z.string()');
    });

    it('should convert any type to unknown', () => {
      expect(propertyTypeToZod('any', false)).toBe('z.unknown()');
    });
  });

  describe('geometry types', () => {
    it('should convert point type', () => {
      expect(propertyTypeToZod('point', false)).toBe('z.object({ x: z.number(), y: z.number() })');
    });

    it('should convert rect type', () => {
      expect(propertyTypeToZod('rect', false)).toBe('z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })');
    });

    it('should convert rgb type', () => {
      expect(propertyTypeToZod('rgb', false)).toBe('z.object({ r: z.number(), g: z.number(), b: z.number() })');
    });
  });

  describe('optional handling', () => {
    it('should add .optional() when optional is true', () => {
      expect(propertyTypeToZod('string', true)).toBe('z.string().optional()');
      expect(propertyTypeToZod('number', true)).toBe('z.number().optional()');
      expect(propertyTypeToZod('boolean', true)).toBe('z.boolean().optional()');
    });

    it('should not add .optional() when optional is false', () => {
      expect(propertyTypeToZod('string', false)).toBe('z.string()');
    });
  });

  describe('array types', () => {
    it('should convert simple array types', () => {
      expect(propertyTypeToZod({ array: 'string' }, false)).toBe('z.array(z.string())');
      expect(propertyTypeToZod({ array: 'number' }, false)).toBe('z.array(z.number())');
    });

    it('should convert optional arrays', () => {
      expect(propertyTypeToZod({ array: 'string' }, true)).toBe('z.array(z.string()).optional()');
    });

    it('should handle nested arrays', () => {
      expect(propertyTypeToZod({ array: { array: 'string' } }, false)).toBe('z.array(z.array(z.string()))');
    });
  });

  describe('reference types', () => {
    it('should convert enum references', () => {
      expect(propertyTypeToZod({ enum: 'Status' }, false)).toBe('StatusSchema');
    });

    it('should convert resource references', () => {
      expect(propertyTypeToZod({ resource: 'Calendar' }, false)).toBe('CalendarSchema');
    });

    it('should convert custom type names to schema references', () => {
      expect(propertyTypeToZod('Calendar', false)).toBe('CalendarSchema');
      expect(propertyTypeToZod('CustomType', false)).toBe('CustomTypeSchema');
    });

    it('should handle optional references', () => {
      expect(propertyTypeToZod({ enum: 'Status' }, true)).toBe('StatusSchema.optional()');
      expect(propertyTypeToZod('Calendar', true)).toBe('CalendarSchema.optional()');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined type', () => {
      expect(propertyTypeToZod(undefined, false)).toBe('z.unknown()');
      expect(propertyTypeToZod(undefined, true)).toBe('z.unknown().optional()');
    });

    it('should handle empty string type name', () => {
      // Empty string is falsy, so it's treated as undefined/unknown
      expect(propertyTypeToZod('', false)).toBe('z.unknown()');
    });

    it('should treat unrecognized strings as schema references', () => {
      expect(propertyTypeToZod('UnknownType', false)).toBe('UnknownTypeSchema');
    });
  });
});

describe('generateResourceSchema', () => {
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
          uid: { access: 'r', description: 'UID', type: 'string', optional: false },
          color: { access: 'rw', description: 'Color', type: 'string', optional: true },
        },
      },
    },
    enums: {},
    hierarchy: { children: {} },
    relationships: [],
    commands: {},
  };

  const ctx = createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });

  it('should generate schema with all properties', () => {
    const resource = ctx.getResource('Calendar');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateResourceSchema(resource, ctx);
    expect(result.name).toBe('CalendarSchema');
    expect(result.content).toContain('z.object');
    expect(result.content).toContain('name: z.string()');
    expect(result.content).toContain('uid: z.string()');
    expect(result.content).toContain('color: z.string().optional()');
  });

  it('should include proper imports', () => {
    const resource = ctx.getResource('Calendar');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateResourceSchema(resource, ctx);
    expect(result.imports).toContain("import { z } from 'zod';");
    expect(result.content).toContain("import { z } from 'zod';");
  });

  it('should generate type from schema inference', () => {
    const resource = ctx.getResource('Calendar');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateResourceSchema(resource, ctx);
    expect(result.content).toContain('export type Calendar = z.infer<typeof CalendarSchema>');
  });

  it('should handle resources with no properties', () => {
    const emptyManifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: {
        Empty: {
          name: 'Empty',
          plural: 'empties',
          description: 'Empty resource',
          properties: {},
        },
      },
      enums: {},
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };

    const emptyCtx = createGeneratorContext(emptyManifest, { outDir: '/tmp', packageName: 'test' });
    const resource = emptyCtx.getResource('Empty');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateResourceSchema(resource, emptyCtx);
    // Empty object has braces with nothing between them (no properties)
    expect(result.content).toContain('z.object({');
    expect(result.content).toContain('})');
    expect(result.content).toContain('EmptySchema');
  });

  it('should handle mixed access properties', () => {
    const mixedManifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: {
        Mixed: {
          name: 'Mixed',
          plural: 'mixed',
          description: 'Mixed access',
          properties: {
            readOnly: { access: 'r', description: 'Read only', type: 'string', optional: false },
            readWrite: { access: 'rw', description: 'Read write', type: 'string', optional: false },
          },
        },
      },
      enums: {},
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };

    const mixedCtx = createGeneratorContext(mixedManifest, { outDir: '/tmp', packageName: 'test' });
    const resource = mixedCtx.getResource('Mixed');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateResourceSchema(resource, mixedCtx);
    // Read schema should include all properties
    expect(result.content).toContain('readOnly: z.string()');
    expect(result.content).toContain('readWrite: z.string()');
  });
});

describe('generateEnumSchema', () => {
  it('should generate enum schema with all values', () => {
    const enumDef: Enum = {
      name: 'Status',
      description: 'Status',
      values: [
        { name: 'active', value: 'active', description: 'Active' },
        { name: 'inactive', value: 'inactive', description: 'Inactive' },
      ],
    };

    const result = generateEnumSchema(enumDef);
    expect(result.name).toBe('StatusSchema');
    expect(result.content).toContain("z.enum(['active', 'inactive'])");
    expect(result.content).toContain('export type Status = z.infer<typeof StatusSchema>');
  });

  it('should include proper imports', () => {
    const enumDef: Enum = {
      name: 'Priority',
      description: 'Priority',
      values: [
        { name: 'low', value: 'low', description: 'Low' },
      ],
    };

    const result = generateEnumSchema(enumDef);
    expect(result.imports).toContain("import { z } from 'zod';");
  });

  it('should handle single value enum', () => {
    const enumDef: Enum = {
      name: 'Single',
      description: 'Single value',
      values: [
        { name: 'only', value: 'only', description: 'Only value' },
      ],
    };

    const result = generateEnumSchema(enumDef);
    expect(result.content).toContain("z.enum(['only'])");
  });

  it('should handle many values', () => {
    const enumDef: Enum = {
      name: 'Many',
      description: 'Many values',
      values: [
        { name: 'a', value: 'a', description: 'A' },
        { name: 'b', value: 'b', description: 'B' },
        { name: 'c', value: 'c', description: 'C' },
        { name: 'd', value: 'd', description: 'D' },
      ],
    };

    const result = generateEnumSchema(enumDef);
    expect(result.content).toContain("z.enum(['a', 'b', 'c', 'd'])");
  });

  it('should handle enum names with special characters', () => {
    const enumDef: Enum = {
      name: 'SpecialEnum',
      description: 'Special',
      values: [
        { name: 'value-with-dash', value: 'value-with-dash', description: 'Dash' },
        { name: 'value_with_underscore', value: 'value_with_underscore', description: 'Underscore' },
      ],
    };

    const result = generateEnumSchema(enumDef);
    expect(result.content).toContain("z.enum(['value-with-dash', 'value_with_underscore'])");
  });
});

describe('generateCreateInputSchema', () => {
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
          uid: { access: 'r', description: 'UID', type: 'string', optional: false },
          color: { access: 'rw', description: 'Color', type: 'string', optional: true },
        },
      },
    },
    enums: {},
    hierarchy: { children: {} },
    relationships: [],
    commands: {},
  };

  const ctx = createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });

  it('should only include writable properties', () => {
    const resource = ctx.getResource('Calendar');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateCreateInputSchema(resource, ctx);
    expect(result.name).toBe('CalendarCreateInputSchema');
    expect(result.content).toContain('name: z.string()');
    expect(result.content).toContain('color: z.string().optional()');
    expect(result.content).not.toContain('uid:'); // Read-only, excluded
  });

  it('should mark optional properties as optional', () => {
    const resource = ctx.getResource('Calendar');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateCreateInputSchema(resource, ctx);
    expect(result.content).toContain('color: z.string().optional()');
    expect(result.content).not.toContain('name: z.string().optional()'); // Required
  });

  it('should handle properties with defaults as optional', () => {
    const defaultManifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: {
        WithDefaults: {
          name: 'WithDefaults',
          plural: 'withdefaults',
          description: 'Has defaults',
          properties: {
            name: { access: 'rw', description: 'Name', type: 'string' , optional: false },
            status: { access: 'rw', description: 'Status', type: 'string', default: 'active' , optional: false },
          },
        },
      },
      enums: {},
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };

    const defaultCtx = createGeneratorContext(defaultManifest, { outDir: '/tmp', packageName: 'test' });
    const resource = defaultCtx.getResource('WithDefaults');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateCreateInputSchema(resource, defaultCtx);
    expect(result.content).toContain('status: z.string().optional()');
  });

  it('should generate proper type name', () => {
    const resource = ctx.getResource('Calendar');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateCreateInputSchema(resource, ctx);
    expect(result.content).toContain('export type CalendarCreateInput = z.infer<typeof CalendarCreateInputSchema>');
  });

  it('should handle resources with only read-only properties', () => {
    const readOnlyManifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: {
        ReadOnly: {
          name: 'ReadOnly',
          plural: 'readonly',
          description: 'Read only',
          properties: {
            id: { access: 'r', description: 'ID', type: 'string' , optional: false },
            created: { access: 'r', description: 'Created', type: 'date' , optional: false },
          },
        },
      },
      enums: {},
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };

    const readOnlyCtx = createGeneratorContext(readOnlyManifest, { outDir: '/tmp', packageName: 'test' });
    const resource = readOnlyCtx.getResource('ReadOnly');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateCreateInputSchema(resource, readOnlyCtx);
    // Empty object (no writable properties)
    expect(result.content).toContain('z.object({');
    expect(result.content).toContain('})');
    expect(result.content).toContain('ReadOnlyCreateInputSchema');
  });
});

describe('generateUpdateInputSchema', () => {
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
          name: { access: 'rw', description: 'Name', type: 'string' , optional: false },
          uid: { access: 'r', description: 'UID', type: 'string' , optional: false },
        },
      },
    },
    enums: {},
    hierarchy: { children: {} },
    relationships: [],
    commands: {},
  };

  const ctx = createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });

  it('should make all writable properties optional', () => {
    const resource = ctx.getResource('Calendar');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateUpdateInputSchema(resource, ctx);
    expect(result.name).toBe('CalendarUpdateInputSchema');
    expect(result.content).toContain('name: z.string().optional()');
  });

  it('should exclude read-only properties', () => {
    const resource = ctx.getResource('Calendar');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateUpdateInputSchema(resource, ctx);
    expect(result.content).not.toContain('uid:');
  });

  it('should generate proper type name', () => {
    const resource = ctx.getResource('Calendar');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateUpdateInputSchema(resource, ctx);
    expect(result.content).toContain('export type CalendarUpdateInput = z.infer<typeof CalendarUpdateInputSchema>');
  });

  it('should handle multiple writable properties', () => {
    const multiManifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: {
        Multi: {
          name: 'Multi',
          plural: 'multi',
          description: 'Multiple props',
          properties: {
            a: { access: 'rw', description: 'A', type: 'string' , optional: false },
            b: { access: 'rw', description: 'B', type: 'number' , optional: false },
            c: { access: 'rw', description: 'C', type: 'boolean' , optional: false },
          },
        },
      },
      enums: {},
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };

    const multiCtx = createGeneratorContext(multiManifest, { outDir: '/tmp', packageName: 'test' });
    const resource = multiCtx.getResource('Multi');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateUpdateInputSchema(resource, multiCtx);
    expect(result.content).toContain('a: z.string().optional()');
    expect(result.content).toContain('b: z.number().optional()');
    expect(result.content).toContain('c: z.boolean().optional()');
  });
});

describe('generateSchemas', () => {
  it('should generate schemas for enums and resources', () => {
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
            status: { access: 'rw', description: 'Status', type: { enum: 'Status' }, optional: false },
          },
        },
      },
      enums: {
        Status: {
          name: 'Status',
          description: 'Status',
          values: [
            { name: 'active', value: 'active', description: 'Active' },
            { name: 'inactive', value: 'inactive', description: 'Inactive' },
          ],
        },
      },
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };

    const ctx = createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });
    const schemas = generateSchemas(ctx);

    // Should have: enum schema, resource schema, create input, update input
    expect(schemas).toHaveLength(4);
    expect(schemas.some(s => s.name === 'StatusSchema')).toBe(true);
    expect(schemas.some(s => s.name === 'CalendarSchema')).toBe(true);
    expect(schemas.some(s => s.name === 'CalendarCreateInputSchema')).toBe(true);
    expect(schemas.some(s => s.name === 'CalendarUpdateInputSchema')).toBe(true);
  });

  it('should generate enums before resources', () => {
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
            status: { access: 'rw', description: 'Status', type: { enum: 'Status' }, optional: false },
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
    const schemas = generateSchemas(ctx);

    // First schema should be the enum
    expect(schemas[0].name).toBe('StatusSchema');
  });

  it('should handle multiple resources', () => {
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
            name: { access: 'rw', description: 'Name', type: 'string' , optional: false },
          },
        },
        Event: {
          name: 'Event',
          plural: 'events',
          description: 'An event',
          properties: {
            title: { access: 'rw', description: 'Title', type: 'string' , optional: false },
          },
        },
      },
      enums: {},
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };

    const ctx = createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });
    const schemas = generateSchemas(ctx);

    // 3 schemas per resource (read, create, update) × 2 resources = 6
    expect(schemas).toHaveLength(6);
    expect(schemas.some(s => s.name === 'CalendarSchema')).toBe(true);
    expect(schemas.some(s => s.name === 'EventSchema')).toBe(true);
  });

  it('should handle empty manifest', () => {
    const manifest: AppManifest = {
      version: '1.0',
      app: { bundleId: 'test', name: 'Test', tccEntitlements: [] },
      suites: [],
      resources: {},
      enums: {},
      hierarchy: { children: {} },
      relationships: [],
      commands: {},
    };

    const ctx = createGeneratorContext(manifest, { outDir: '/tmp', packageName: 'test' });
    const schemas = generateSchemas(ctx);

    expect(schemas).toHaveLength(0);
  });

  it('should handle manifest with only enums', () => {
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
    const schemas = generateSchemas(ctx);

    expect(schemas).toHaveLength(1);
    expect(schemas[0].name).toBe('StatusSchema');
  });
});
