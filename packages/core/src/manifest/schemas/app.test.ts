import { describe, it, expect } from 'vitest';
import { AppManifestSchema, type AppManifest } from './app.js';

describe('AppManifestSchema', () => {
  // Helper to create a minimal valid manifest
  const createMinimalManifest = (): AppManifest => ({
    version: '1.0',
    app: {
      bundleId: 'com.example.test',
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
            access: 'rw',
            description: 'Document name',
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
          access: 'rw',
          description: 'All documents',
        },
      },
    },
    relationships: [],
    commands: {},
  });

  // Helper to create a complete Calendar-like manifest
  const createCompleteManifest = (): AppManifest => ({
    version: '1.0',
    app: {
      bundleId: 'com.apple.iCal',
      name: 'Calendar',
      displayName: 'Calendar',
      version: '11.0',
      minMacOSVersion: '14.0',
      icon: '/System/Applications/Calendar.app/Contents/Resources/App.icns',
      tccEntitlements: ['calendar', 'automation'],
      distributionModel: 'system',
    },
    suites: [
      {
        name: 'Calendar Suite',
        description: 'Standard calendar operations',
        code: 'cali',
        resources: ['Calendar', 'Event', 'Attendee'],
        commands: ['createEvent', 'deleteEvent'],
        enums: ['EventStatus'],
      },
    ],
    resources: {
      Calendar: {
        name: 'Calendar',
        plural: 'calendars',
        description: 'A calendar container',
        code: 'cCal',
        properties: {
          name: {
            access: 'rw',
            type: 'string',
            description: 'Calendar name',
            code: 'pnam',
            optional: false,
          },
          color: {
            access: 'rw',
            type: { enum: 'CalendarColor' },
            description: 'Calendar color',
            code: 'colr',
            optional: false,
          },
          enabled: {
            access: 'rw',
            type: 'boolean',
            description: 'Whether calendar is enabled',
            code: 'enbl',
            default: true,
            optional: false,
          },
        },
        identifiers: [{ property: 'name', primary: true }],
      },
      Event: {
        name: 'Event',
        plural: 'events',
        description: 'A calendar event',
        code: 'cEvt',
        properties: {
          summary: {
            access: 'rw',
            type: 'string',
            description: 'Event summary',
            code: 'summ',
            optional: false,
          },
          startDate: {
            access: 'rw',
            type: 'date',
            description: 'Event start date',
            code: 'strt',
            optional: false,
          },
          endDate: {
            access: 'rw',
            type: 'date',
            description: 'Event end date',
            code: 'endt',
            optional: false,
          },
          location: {
            access: 'rw',
            type: 'string',
            description: 'Event location',
            code: 'locn',
            optional: true,
          },
          allDayEvent: {
            access: 'r',
            type: 'boolean',
            description: 'Whether this is an all-day event',
            code: 'allD',
            optional: false,
          },
          status: {
            access: 'rw',
            type: { enum: 'EventStatus' },
            description: 'Event status',
            code: 'stat',
            optional: false,
          },
        },
        identifiers: [{ property: 'summary', primary: true }],
      },
      Attendee: {
        name: 'Attendee',
        plural: 'attendees',
        description: 'An event attendee',
        code: 'cAtt',
        properties: {
          email: {
            access: 'r',
            type: 'string',
            description: 'Attendee email',
            code: 'emai',
            optional: false,
          },
          displayName: {
            access: 'r',
            type: 'string',
            description: 'Attendee display name',
            code: 'dnam',
            optional: true,
          },
        },
        identifiers: [{ property: 'email', primary: true }],
      },
    },
    enums: {
      CalendarColor: {
        name: 'CalendarColor',
        description: 'Available calendar colors',
        code: 'cClr',
        values: [
          { name: 'red', value: 'red', description: 'Red', code: 'cRed' },
          { name: 'blue', value: 'blue', description: 'Blue', code: 'cBlu' },
          { name: 'green', value: 'green', description: 'Green', code: 'cGrn' },
        ],
      },
      EventStatus: {
        name: 'EventStatus',
        description: 'Event status values',
        code: 'eSta',
        values: [
          { name: 'confirmed', value: 'confirmed', code: 'conf' },
          { name: 'tentative', value: 'tentative', code: 'tent' },
          { name: 'cancelled', value: 'cancelled', code: 'canc' },
        ],
      },
    },
    hierarchy: {
      children: {
        calendars: {
          resource: 'Calendar',
          access: 'rw',
          description: 'All calendars',
          children: {
            events: {
              resource: 'Event',
              access: 'rw',
              description: 'Events in this calendar',
              children: {
                attendees: {
                  resource: 'Attendee',
                  access: 'r',
                  description: 'Event attendees',
                },
              },
            },
          },
        },
      },
    },
    relationships: [
      {
        name: 'event-calendar',
        from: 'Event',
        to: 'Calendar',
        cardinality: 'many-to-one',
        property: 'calendar',
        description: 'Each event belongs to a calendar',
      },
    ],
    commands: {
      createEvent: {
        name: 'createEvent',
        description: 'Create a new event',
        scope: 'resource',
        resourceType: 'Calendar',
        parameters: [
          {
            name: 'summary',
            type: 'string',
            description: 'Event summary',
            required: true,
            code: 'summ',
          },
          {
            name: 'startDate',
            type: 'date',
            description: 'Start date',
            required: true,
            code: 'strt',
          },
        ],
        returns: 'Event',
        code: 'crEv',
      },
      deleteEvent: {
        name: 'deleteEvent',
        description: 'Delete an event',
        scope: 'resource',
        resourceType: 'Event',
        parameters: [],
        code: 'delE',
      },
    },
    extraction: {
      extractedAt: '2025-01-15T10:30:00Z',
      mactsVersion: '0.1.0',
      sourceFile: 'Calendar.sdef',
      confidence: {
        overall: 0.95,
        fields: {
          'resources.Event.properties.startDate': 0.98,
          'commands.createEvent': 0.92,
        },
      },
      openQuestions: [
        {
          question: 'Does Calendar support recurring events?',
          context: 'No recurrence properties found in the dictionary',
          suggestions: ['Yes, but not exposed', 'No support', 'Deprecated feature'],
          relatedTo: 'Event',
        },
      ],
    },
  });

  describe('valid manifests', () => {
    it('should accept a minimal valid manifest', () => {
      const manifest = createMinimalManifest();
      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe('1.0');
        expect(result.data.app.bundleId).toBe('com.example.test');
        expect(result.data.resources['Document']).toBeDefined();
      }
    });

    it('should accept a complete Calendar-like manifest', () => {
      const manifest = createCompleteManifest();
      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.app.bundleId).toBe('com.apple.iCal');
        expect(result.data.suites).toHaveLength(1);
        expect(Object.keys(result.data.resources)).toHaveLength(3);
        expect(Object.keys(result.data.enums)).toHaveLength(2);
        expect(Object.keys(result.data.commands)).toHaveLength(2);
        expect(result.data.relationships).toHaveLength(1);
        expect(result.data.extraction?.openQuestions).toHaveLength(1);
      }
    });

    it('should apply defaults for optional fields', () => {
      const manifest = createMinimalManifest();
      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.suites).toEqual([]);
        expect(result.data.enums).toEqual({});
        expect(result.data.relationships).toEqual([]);
        expect(result.data.commands).toEqual({});
        expect(result.data.extraction).toBeUndefined();
      }
    });

    it('should preserve all provided fields', () => {
      const manifest = createCompleteManifest();
      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(true);
      if (result.success) {
        // Check that all provided data is preserved
        expect(result.data.app.displayName).toBe('Calendar');
        expect(result.data.app.tccEntitlements).toEqual(['calendar', 'automation']);
        expect(result.data.suites[0]?.name).toBe('Calendar Suite');
        expect(result.data.resources['Event']?.properties['location']?.optional).toBe(true);
        expect(result.data.extraction?.confidence?.overall).toBe(0.95);
      }
    });
  });

  describe('required fields', () => {
    it('should reject manifest without version', () => {
      const manifest = createMinimalManifest();
      // @ts-expect-error Testing runtime validation
      delete manifest.version;

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('version');
      }
    });

    it('should reject manifest without app', () => {
      const manifest = createMinimalManifest();
      // @ts-expect-error Testing runtime validation
      delete manifest.app;

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('app');
      }
    });

    it('should reject manifest without resources', () => {
      const manifest = createMinimalManifest();
      // @ts-expect-error Testing runtime validation
      delete manifest.resources;

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('resources');
      }
    });

    it('should reject manifest without hierarchy', () => {
      const manifest = createMinimalManifest();
      // @ts-expect-error Testing runtime validation
      delete manifest.hierarchy;

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('hierarchy');
      }
    });
  });

  describe('validation rules', () => {
    it('should reject invalid version', () => {
      const manifest = createMinimalManifest();
      // @ts-expect-error Testing runtime validation
      manifest.version = '2.0';

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('1.0');
      }
    });

    it('should reject empty resources object', () => {
      const manifest = createMinimalManifest();
      manifest.resources = {};

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/at least one resource/i);
      }
    });

    it('should accept multiple resources', () => {
      const manifest = createMinimalManifest();
      manifest.resources['File'] = {
        name: 'File',
        plural: 'files',
        description: 'A file',
        properties: {
          path: {
            access: 'r',
            description: 'File path',
            optional: false,
          },
        },
      };

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.keys(result.data.resources)).toHaveLength(2);
      }
    });

    it('should validate nested schema structures', () => {
      // Create manifest with invalid property access mode directly
      const manifest = {
        version: '1.0',
        app: {
          bundleId: 'com.example.test',
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
                access: 'invalid', // Invalid access mode
                description: 'Document name',
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
              access: 'rw',
              description: 'All documents',
            },
          },
        },
        relationships: [],
        commands: {},
      };

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('access');
      }
    });
  });

  describe('type inference', () => {
    it('should correctly infer AppManifest type', () => {
      const manifest: AppManifest = createMinimalManifest();

      // Type assertions to verify structure
      expect(manifest.version).toBe('1.0');
      expect(manifest.app.bundleId).toBe('com.example.test');
      expect(manifest.resources['Document']).toBeDefined();
      expect(manifest.hierarchy.children['documents']).toBeDefined();
    });

    it('should allow optional extraction metadata', () => {
      const manifest: AppManifest = createMinimalManifest();

      // Should compile without extraction
      expect(manifest.extraction).toBeUndefined();

      // Should compile with extraction
      manifest.extraction = {
        extractedAt: '2025-01-15T10:30:00Z',
        mactsVersion: '0.1.0',
        openQuestions: [],
      };
      expect(manifest.extraction.mactsVersion).toBe('0.1.0');
    });

    it('should correctly type nested structures', () => {
      const manifest: AppManifest = createCompleteManifest();

      // Access nested properties with full type safety
      const eventResource = manifest.resources['Event'];
      expect(eventResource?.name).toBe('Event');

      const startDateProp = eventResource?.properties['startDate'];
      expect(startDateProp?.type).toBe('date');

      const createEventCmd = manifest.commands['createEvent'];
      expect(createEventCmd?.scope).toBe('resource');
    });
  });

  describe('edge cases', () => {
    it('should handle empty optional arrays', () => {
      const manifest = createMinimalManifest();
      manifest.suites = [];
      manifest.relationships = [];

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(true);
    });

    it('should handle empty commands object', () => {
      const manifest = createMinimalManifest();
      manifest.commands = {};

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(true);
    });

    it('should handle complex nested hierarchy', () => {
      const manifest = createCompleteManifest();

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(true);
      if (result.success) {
        const calendarsChild = result.data.hierarchy.children['calendars'];
        expect(calendarsChild?.children?.['events']).toBeDefined();
        expect(calendarsChild?.children?.['events']?.children?.['attendees']).toBeDefined();
      }
    });

    it('should validate extraction metadata when provided', () => {
      const manifest = createMinimalManifest();
      manifest.extraction = {
        extractedAt: 'invalid-date',
        mactsVersion: '0.1.0',
        openQuestions: [],
      };

      const result = AppManifestSchema.safeParse(manifest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('extractedAt');
      }
    });
  });
});
