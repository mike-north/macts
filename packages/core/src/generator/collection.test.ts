import { describe, it, expect } from 'vitest';
import { generateCollectionClass } from './collection.js';
import { createGeneratorContext } from './context.js';
import type { AppManifest } from '../manifest/index.js';

const mockManifest: AppManifest = {
  version: '1.0',
  app: { bundleId: 'com.test.app', name: 'TestApp', tccEntitlements: [] },
  suites: [],
  resources: {
    Calendar: {
      name: 'Calendar',
      plural: 'calendars',
      description: 'A calendar',
      properties: {
        name: { access: 'rw', description: 'Name', type: 'string', optional: false },
        uid: { access: 'r', description: 'UID', type: 'string', optional: false },
      },
    },
  },
  enums: {},
  hierarchy: { children: {} },
  relationships: [],
  commands: {},
};

describe('generateCollectionClass', () => {
  const ctx = createGeneratorContext(mockManifest, {
    outDir: '/tmp/out',
    packageName: '@macts/sdk-test',
  });

  it('should generate class with name', () => {
    const resource = ctx.getResource('Calendar');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateCollectionClass(resource, ctx);
    expect(result.name).toBe('CalendarCollection');
    expect(result.content).toContain('class CalendarCollection');
  });

  it('should generate list method', () => {
    const resource = ctx.getResource('Calendar');
    if (!resource) return;

    const result = generateCollectionClass(resource, ctx);
    expect(result.content).toContain('async list()');
    expect(result.content).toContain('CalendarInstance[]');
  });

  it('should generate get method', () => {
    const resource = ctx.getResource('Calendar');
    if (!resource) return;

    const result = generateCollectionClass(resource, ctx);
    expect(result.content).toContain('async get(id: string)');
  });

  it('should generate getByName method', () => {
    const resource = ctx.getResource('Calendar');
    if (!resource) return;

    const result = generateCollectionClass(resource, ctx);
    expect(result.content).toContain('async getByName(name: string)');
  });

  it('should generate create method', () => {
    const resource = ctx.getResource('Calendar');
    if (!resource) return;

    const result = generateCollectionClass(resource, ctx);
    expect(result.content).toContain('async create(input: CalendarCreateInput)');
  });

  it('should generate find method', () => {
    const resource = ctx.getResource('Calendar');
    if (!resource) return;

    const result = generateCollectionClass(resource, ctx);
    expect(result.content).toContain('async find(predicate:');
  });
});
