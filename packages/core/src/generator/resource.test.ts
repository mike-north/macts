import { describe, it, expect } from 'vitest';
import { generateResourceClass } from './resource.js';
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
        name: { access: 'rw', description: 'Calendar name', type: 'string', optional: false },
        uid: { access: 'r', description: 'Unique ID', type: 'string', optional: false },
        color: { access: 'rw', description: 'Calendar color', type: 'string', optional: true },
      },
    },
    Event: {
      name: 'Event',
      plural: 'events',
      description: 'An event',
      properties: {
        summary: { access: 'rw', description: 'Event summary', type: 'string', optional: false },
      },
    },
  },
  enums: {},
  hierarchy: {
    children: {
      calendars: {
        resource: 'Calendar',
        access: 'rw',
        children: {
          events: {
            resource: 'Event',
            access: 'rw',
          },
        },
      },
    },
  },
  relationships: [],
  commands: {
    show: {
      name: 'show',
      description: 'Show calendar',
      scope: 'resource',
      resourceType: 'Calendar',
      parameters: [],
    },
  },
};

describe('generateResourceClass', () => {
  const ctx = createGeneratorContext(mockManifest, {
    outDir: '/tmp/out',
    packageName: '@macts/sdk-test',
  });

  it('should generate class with name', () => {
    const resource = ctx.getResource('Calendar');
    expect(resource).toBeDefined();
    if (!resource) return;

    const result = generateResourceClass(resource, ctx);
    expect(result.name).toBe('CalendarInstance');
    expect(result.content).toContain('class CalendarInstance');
  });

  it('should generate property getters', () => {
    const resource = ctx.getResource('Calendar');
    if (!resource) return;

    const result = generateResourceClass(resource, ctx);
    expect(result.content).toContain('get name()');
    expect(result.content).toContain('get uid()');
  });

  it('should generate setters for writable properties', () => {
    const resource = ctx.getResource('Calendar');
    if (!resource) return;

    const result = generateResourceClass(resource, ctx);
    expect(result.content).toContain('set name(value:');
    expect(result.content).not.toContain('set uid('); // Read-only
  });

  it('should generate child collection accessors', () => {
    const resource = ctx.getResource('Calendar');
    if (!resource) return;

    const result = generateResourceClass(resource, ctx);
    expect(result.content).toContain('get events()');
    expect(result.content).toContain('EventCollection');
  });

  it('should generate resource commands', () => {
    const resource = ctx.getResource('Calendar');
    if (!resource) return;

    const result = generateResourceClass(resource, ctx);
    expect(result.content).toContain('async show(');
  });

  it('should generate save and delete methods', () => {
    const resource = ctx.getResource('Calendar');
    if (!resource) return;

    const result = generateResourceClass(resource, ctx);
    expect(result.content).toContain('async save()');
    expect(result.content).toContain('async delete()');
  });
});
