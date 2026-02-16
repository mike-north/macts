import { describe, it, expect } from 'vitest';
import {
  VERSION,
  AppManifestSchema,
  type AppManifest,
  type Resource,
  type Command,
  type Hierarchy,
} from './index.js';

describe('@macts/core', () => {
  describe('VERSION', () => {
    it('should export VERSION constant', () => {
      expect(VERSION).toBe('0.0.0');
    });

    it('should be a string', () => {
      expect(typeof VERSION).toBe('string');
    });
  });

  describe('manifest exports', () => {
    it('should export AppManifestSchema', () => {
      expect(AppManifestSchema).toBeDefined();
      expect(typeof AppManifestSchema.parse).toBe('function');
    });

    it('should export manifest types', () => {
      // Type assertions to verify types are exported correctly
      const manifest: AppManifest = {
        version: '1.0',
        app: {
          bundleId: 'com.test.app',
          name: 'TestApp',
          tccEntitlements: [],
        },
        suites: [],
        resources: {
          Document: {
            name: 'Document',
            plural: 'documents',
            description: 'A document',
            properties: {
              name: {
                access: 'r',
                description: 'Name',
                optional: false,
              },
            },
          },
        },
        enums: {},
        hierarchy: {
          children: {
            documents: {
              resource: 'Document',
              access: 'r',
              description: 'All documents',
            },
          },
        },
        relationships: [],
        commands: {},
      };

      // Verify the schema can parse it
      const result = AppManifestSchema.parse(manifest);
      expect(result.version).toBe('1.0');
    });

    it('should export resource type', () => {
      const resource: Resource = {
        name: 'Test',
        plural: 'tests',
        description: 'A test resource',
        properties: {
          id: {
            access: 'r',
            description: 'ID',
            optional: false,
          },
        },
      };
      expect(resource.name).toBe('Test');
    });

    it('should export command type', () => {
      const command: Command = {
        name: 'test',
        description: 'A test command',
        scope: 'application',
        parameters: [],
      };
      expect(command.scope).toBe('application');
    });

    it('should export hierarchy type', () => {
      const hierarchy: Hierarchy = {
        children: {
          items: {
            resource: 'Item',
            access: 'rw',
            description: 'Items',
          },
        },
      };
      expect(hierarchy.children['items']?.resource).toBe('Item');
    });
  });
});
