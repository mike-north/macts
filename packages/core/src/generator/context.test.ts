import { describe, it, expect } from 'vitest';
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
        name: { access: 'rw', description: 'Name', optional: false },
        uid: { access: 'r', description: 'UID', optional: false },
      },
    },
    Event: {
      name: 'Event',
      plural: 'events',
      description: 'An event',
      properties: {
        summary: { access: 'rw', description: 'Summary', optional: false },
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
  commands: {
    show: { name: 'show', description: 'Show', scope: 'resource', resourceType: 'Calendar', parameters: [] },
    reload: { name: 'reload', description: 'Reload', scope: 'application', parameters: [] },
  },
};

describe('createGeneratorContext', () => {
  const ctx = createGeneratorContext(mockManifest, {
    outDir: '/tmp/out',
    packageName: '@macts/sdk-test',
  });

  it('should get resource by name', () => {
    const calendar = ctx.getResource('Calendar');
    expect(calendar).toBeDefined();
    expect(calendar?.name).toBe('Calendar');
  });

  it('should return undefined for non-existent resource', () => {
    const nonExistent = ctx.getResource('NonExistent');
    expect(nonExistent).toBeUndefined();
  });

  it('should get all resources', () => {
    const resources = ctx.getResources();
    expect(resources).toHaveLength(2);
    const names = resources.map(r => r.name).sort();
    expect(names).toEqual(['Calendar', 'Event']);
  });

  it('should get enum by name', () => {
    const status = ctx.getEnum('Status');
    expect(status).toBeDefined();
    expect(status?.values).toHaveLength(2);
  });

  it('should return undefined for non-existent enum', () => {
    const nonExistent = ctx.getEnum('NonExistent');
    expect(nonExistent).toBeUndefined();
  });

  it('should get all enums', () => {
    const enums = ctx.getEnums();
    expect(enums).toHaveLength(1);
    expect(enums[0]?.name).toBe('Status');
  });

  it('should get resource commands', () => {
    const cmds = ctx.getResourceCommands('Calendar');
    expect(cmds).toHaveLength(1);
    expect(cmds[0]?.name).toBe('show');
  });

  it('should return empty array for resource with no commands', () => {
    const cmds = ctx.getResourceCommands('Event');
    expect(cmds).toHaveLength(0);
  });

  it('should get app commands', () => {
    const cmds = ctx.getAppCommands();
    expect(cmds).toHaveLength(1);
    expect(cmds[0]?.name).toBe('reload');
  });

  it('should expose manifest and options', () => {
    expect(ctx.manifest).toBe(mockManifest);
    expect(ctx.options.outDir).toBe('/tmp/out');
    expect(ctx.options.packageName).toBe('@macts/sdk-test');
  });
});

describe('createGeneratorContext - resource commands with array resourceType', () => {
  const manifestWithMultiResource: AppManifest = {
    version: '1.0',
    app: { bundleId: 'com.test.app', name: 'TestApp', tccEntitlements: [] },
    suites: [],
    resources: {
      Calendar: {
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar',
        properties: {},
      },
      Event: {
        name: 'Event',
        plural: 'events',
        description: 'An event',
        properties: {},
      },
    },
    enums: {},
    hierarchy: { children: {} },
    relationships: [],
    commands: {
      delete: {
        name: 'delete',
        description: 'Delete',
        scope: 'resource',
        resourceType: ['Calendar', 'Event'],
        parameters: [],
      },
    },
  };

  const ctx = createGeneratorContext(manifestWithMultiResource, {
    outDir: '/tmp/out',
    packageName: '@macts/sdk-test',
  });

  it('should return command for resources in array', () => {
    const calendarCmds = ctx.getResourceCommands('Calendar');
    expect(calendarCmds).toHaveLength(1);
    expect(calendarCmds[0]?.name).toBe('delete');

    const eventCmds = ctx.getResourceCommands('Event');
    expect(eventCmds).toHaveLength(1);
    expect(eventCmds[0]?.name).toBe('delete');
  });
});

describe('createGeneratorContext - commands with no resourceType', () => {
  const manifestWithGenericCommand: AppManifest = {
    version: '1.0',
    app: { bundleId: 'com.test.app', name: 'TestApp', tccEntitlements: [] },
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
    commands: {
      print: {
        name: 'print',
        description: 'Print',
        scope: 'resource',
        parameters: [],
        // No resourceType - applies to all resources
      },
    },
  };

  const ctx = createGeneratorContext(manifestWithGenericCommand, {
    outDir: '/tmp/out',
    packageName: '@macts/sdk-test',
  });

  it('should return command for any resource when resourceType is undefined', () => {
    const cmds = ctx.getResourceCommands('Calendar');
    expect(cmds).toHaveLength(1);
    expect(cmds[0]?.name).toBe('print');
  });
});
