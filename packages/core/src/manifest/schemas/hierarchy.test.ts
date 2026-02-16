import { describe, it, expect } from 'vitest';
import { HierarchyChildSchema, HierarchySchema } from './hierarchy.js';
import { ZodError } from 'zod';

describe('HierarchyChildSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal valid child', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'calendar',
        access: 'rw',
      });

      expect(result).toEqual({
        resource: 'calendar',
        access: 'rw',
      });
    });

    it('should accept child with read-only access', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'attendee',
        access: 'r',
      });

      expect(result.access).toBe('r');
    });

    it('should accept child with description', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'event',
        access: 'rw',
        description: 'Events belong to calendars',
      });

      expect(result.description).toBe('Events belong to calendars');
    });

    it('should accept child with nested children', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'calendar',
        access: 'rw',
        children: {
          event: {
            resource: 'event',
            access: 'rw',
          },
        },
      });

      expect(result.children).toBeDefined();
      expect(result.children?.['event']).toBeDefined();
      expect(result.children?.['event']?.resource).toBe('event');
    });

    it('should accept deeply nested hierarchy', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'calendar',
        access: 'rw',
        children: {
          event: {
            resource: 'event',
            access: 'rw',
            children: {
              attendee: {
                resource: 'attendee',
                access: 'r',
              },
              alarm: {
                resource: 'alarm',
                access: 'rw',
              },
            },
          },
        },
      });

      expect(result.children?.['event']?.children?.['attendee']).toBeDefined();
      expect(result.children?.['event']?.children?.['alarm']).toBeDefined();
    });

    it('should accept child with all fields', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'event',
        access: 'rw',
        description: 'Calendar events',
        children: {
          attendee: {
            resource: 'attendee',
            access: 'r',
            description: 'Event attendees',
          },
        },
      });

      expect(result).toEqual({
        resource: 'event',
        access: 'rw',
        description: 'Calendar events',
        children: {
          attendee: {
            resource: 'attendee',
            access: 'r',
            description: 'Event attendees',
          },
        },
      });
    });

    it('should accept multiple nested children', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'calendar',
        access: 'rw',
        children: {
          event: {
            resource: 'event',
            access: 'rw',
          },
          task: {
            resource: 'task',
            access: 'rw',
          },
        },
      });

      expect(result.children).toBeDefined();
      expect(Object.keys(result.children ?? {})).toEqual(['event', 'task']);
    });
  });

  describe('negative cases', () => {
    it('should reject child without resource', () => {
      expect(() =>
        HierarchyChildSchema.parse({
          access: 'rw',
        })
      ).toThrow(ZodError);
    });

    it('should reject child without access', () => {
      expect(() =>
        HierarchyChildSchema.parse({
          resource: 'calendar',
        })
      ).toThrow(ZodError);
    });

    it('should reject child with invalid access', () => {
      expect(() =>
        HierarchyChildSchema.parse({
          resource: 'calendar',
          access: 'x',
        })
      ).toThrow(ZodError);
    });

    it('should reject child with write-only access', () => {
      // PropertyAccessSchema only allows 'r' or 'rw', not 'w'
      expect(() =>
        HierarchyChildSchema.parse({
          resource: 'calendar',
          access: 'w',
        })
      ).toThrow(ZodError);
    });

    it('should reject child with invalid children type', () => {
      expect(() =>
        HierarchyChildSchema.parse({
          resource: 'calendar',
          access: 'rw',
          children: 'not-an-object',
        })
      ).toThrow(ZodError);
    });

    it('should reject child with array as children', () => {
      expect(() =>
        HierarchyChildSchema.parse({
          resource: 'calendar',
          access: 'rw',
          children: [
            {
              resource: 'event',
              access: 'rw',
            },
          ],
        })
      ).toThrow(ZodError);
    });

    it('should reject child with invalid nested child', () => {
      expect(() =>
        HierarchyChildSchema.parse({
          resource: 'calendar',
          access: 'rw',
          children: {
            event: {
              resource: 'event',
              // missing access
            },
          },
        })
      ).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
    it('should accept empty string resource', () => {
      const result = HierarchyChildSchema.parse({
        resource: '',
        access: 'rw',
      });

      expect(result.resource).toBe('');
    });

    it('should accept empty string description', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'calendar',
        access: 'rw',
        description: '',
      });

      expect(result.description).toBe('');
    });

    it('should accept empty children object', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'calendar',
        access: 'rw',
        children: {},
      });

      expect(result.children).toEqual({});
    });

    it('should handle undefined optional fields', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'calendar',
        access: 'rw',
        description: undefined,
        children: undefined,
      });

      expect(result.description).toBeUndefined();
      expect(result.children).toBeUndefined();
    });

    it('should accept very deeply nested hierarchy', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'level1',
        access: 'rw',
        children: {
          level2: {
            resource: 'level2',
            access: 'rw',
            children: {
              level3: {
                resource: 'level3',
                access: 'rw',
                children: {
                  level4: {
                    resource: 'level4',
                    access: 'rw',
                    children: {
                      level5: {
                        resource: 'level5',
                        access: 'r',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      expect(
        result.children?.['level2']?.children?.['level3']?.children?.['level4']?.children?.[
          'level5'
        ]
      ).toBeDefined();
    });
  });

  describe('recursive structure', () => {
    it('should support self-referential hierarchies', () => {
      // Some apps might have folder-in-folder structures
      const result = HierarchyChildSchema.parse({
        resource: 'folder',
        access: 'rw',
        children: {
          folder: {
            resource: 'folder',
            access: 'rw',
            children: {
              folder: {
                resource: 'folder',
                access: 'rw',
              },
            },
          },
        },
      });

      expect(result.children?.['folder']?.children?.['folder']).toBeDefined();
    });

    it('should support mixed recursive and non-recursive children', () => {
      const result = HierarchyChildSchema.parse({
        resource: 'project',
        access: 'rw',
        children: {
          project: {
            resource: 'project',
            access: 'rw',
          },
          task: {
            resource: 'task',
            access: 'rw',
          },
        },
      });

      expect(result.children?.['project']).toBeDefined();
      expect(result.children?.['task']).toBeDefined();
    });
  });
});

describe('HierarchySchema', () => {
  describe('positive cases', () => {
    it('should accept minimal valid hierarchy', () => {
      const result = HierarchySchema.parse({
        children: {
          calendar: {
            resource: 'calendar',
            access: 'rw',
          },
        },
      });

      expect(result.children['calendar']).toBeDefined();
    });

    it('should accept hierarchy with multiple root children', () => {
      const result = HierarchySchema.parse({
        children: {
          calendar: {
            resource: 'calendar',
            access: 'rw',
          },
          document: {
            resource: 'document',
            access: 'rw',
          },
          window: {
            resource: 'window',
            access: 'r',
          },
        },
      });

      expect(Object.keys(result.children)).toEqual(['calendar', 'document', 'window']);
    });

    it('should accept hierarchy with nested structure', () => {
      const result = HierarchySchema.parse({
        children: {
          calendar: {
            resource: 'calendar',
            access: 'rw',
            description: 'User calendars',
            children: {
              event: {
                resource: 'event',
                access: 'rw',
                description: 'Calendar events',
                children: {
                  attendee: {
                    resource: 'attendee',
                    access: 'r',
                    description: 'Event attendees',
                  },
                  alarm: {
                    resource: 'alarm',
                    access: 'rw',
                    description: 'Event alarms',
                  },
                },
              },
            },
          },
        },
      });

      expect(
        result.children['calendar']?.children?.['event']?.children?.['attendee']
      ).toBeDefined();
      expect(result.children['calendar']?.children?.['event']?.children?.['alarm']).toBeDefined();
    });

    it('should accept complex multi-branch hierarchy', () => {
      const result = HierarchySchema.parse({
        children: {
          calendar: {
            resource: 'calendar',
            access: 'rw',
            children: {
              event: {
                resource: 'event',
                access: 'rw',
                children: {
                  attendee: {
                    resource: 'attendee',
                    access: 'r',
                  },
                },
              },
              task: {
                resource: 'task',
                access: 'rw',
              },
            },
          },
          document: {
            resource: 'document',
            access: 'rw',
            children: {
              page: {
                resource: 'page',
                access: 'rw',
              },
            },
          },
        },
      });

      expect(result.children['calendar']?.children?.['event']).toBeDefined();
      expect(result.children['calendar']?.children?.['task']).toBeDefined();
      expect(result.children['document']?.children?.['page']).toBeDefined();
    });
  });

  describe('negative cases', () => {
    it('should reject hierarchy without children', () => {
      expect(() => HierarchySchema.parse({})).toThrow(ZodError);
    });

    it('should reject hierarchy with non-object children', () => {
      expect(() =>
        HierarchySchema.parse({
          children: 'not-an-object',
        })
      ).toThrow(ZodError);
    });

    it('should reject hierarchy with array as children', () => {
      expect(() =>
        HierarchySchema.parse({
          children: [
            {
              resource: 'calendar',
              access: 'rw',
            },
          ],
        })
      ).toThrow(ZodError);
    });

    it('should reject hierarchy with invalid child', () => {
      expect(() =>
        HierarchySchema.parse({
          children: {
            calendar: {
              resource: 'calendar',
              // missing access
            },
          },
        })
      ).toThrow(ZodError);
    });

    it('should reject hierarchy with invalid nested child', () => {
      expect(() =>
        HierarchySchema.parse({
          children: {
            calendar: {
              resource: 'calendar',
              access: 'rw',
              children: {
                event: {
                  resource: 'event',
                  // missing access
                },
              },
            },
          },
        })
      ).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
    it('should accept empty children object', () => {
      const result = HierarchySchema.parse({
        children: {},
      });

      expect(result.children).toEqual({});
    });

    it('should accept hierarchy with single root child', () => {
      const result = HierarchySchema.parse({
        children: {
          calendar: {
            resource: 'calendar',
            access: 'rw',
          },
        },
      });

      expect(Object.keys(result.children)).toHaveLength(1);
    });

    it('should accept hierarchy with many root children', () => {
      const children = Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [
          `resource${String(i)}`,
          {
            resource: `resource${String(i)}`,
            access: 'rw' as const,
          },
        ])
      );

      const result = HierarchySchema.parse({ children });

      expect(Object.keys(result.children)).toHaveLength(20);
    });
  });

  describe('real-world examples', () => {
    it('should accept Calendar app hierarchy', () => {
      const result = HierarchySchema.parse({
        children: {
          calendar: {
            resource: 'calendar',
            access: 'rw',
            description: 'User calendars',
            children: {
              event: {
                resource: 'event',
                access: 'rw',
                description: 'Calendar events',
                children: {
                  attendee: {
                    resource: 'attendee',
                    access: 'r',
                    description: 'Event attendees (read-only)',
                  },
                  displayAlarm: {
                    resource: 'displayAlarm',
                    access: 'rw',
                  },
                  soundAlarm: {
                    resource: 'soundAlarm',
                    access: 'rw',
                  },
                },
              },
            },
          },
        },
      });

      expect(result.children['calendar']?.children?.['event']?.children?.['attendee']?.access).toBe(
        'r'
      );
      expect(
        result.children['calendar']?.children?.['event']?.children?.['displayAlarm']?.access
      ).toBe('rw');
    });

    it('should accept OmniFocus-style hierarchy with projects and tasks', () => {
      const result = HierarchySchema.parse({
        children: {
          folder: {
            resource: 'folder',
            access: 'rw',
            children: {
              folder: {
                resource: 'folder',
                access: 'rw',
              },
              project: {
                resource: 'project',
                access: 'rw',
                children: {
                  task: {
                    resource: 'task',
                    access: 'rw',
                    children: {
                      task: {
                        resource: 'task',
                        access: 'rw',
                      },
                    },
                  },
                },
              },
            },
          },
          project: {
            resource: 'project',
            access: 'rw',
            children: {
              task: {
                resource: 'task',
                access: 'rw',
              },
            },
          },
        },
      });

      expect(result.children['folder']?.children?.['folder']).toBeDefined();
      expect(result.children['folder']?.children?.['project']?.children?.['task']).toBeDefined();
    });
  });
});
