import { describe, it, expect } from 'vitest';
import { CommandParameterSchema, CommandSchema, CommandScopeSchema } from './command.js';
import { ZodError } from 'zod';

describe('CommandScopeSchema', () => {
  describe('positive cases', () => {
    it('should accept application scope', () => {
      const result = CommandScopeSchema.parse('application');
      expect(result).toBe('application');
    });

    it('should accept resource scope', () => {
      const result = CommandScopeSchema.parse('resource');
      expect(result).toBe('resource');
    });
  });

  describe('negative cases', () => {
    it('should reject invalid scope', () => {
      expect(() => CommandScopeSchema.parse('global')).toThrow(ZodError);
    });

    it('should reject empty string', () => {
      expect(() => CommandScopeSchema.parse('')).toThrow(ZodError);
    });

    it('should reject number', () => {
      expect(() => CommandScopeSchema.parse(123)).toThrow(ZodError);
    });
  });
});

describe('CommandParameterSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal valid parameter', () => {
      const result = CommandParameterSchema.parse({
        name: 'targetDate',
        type: 'date',
        description: 'The date to switch to',
      });

      expect(result).toEqual({
        name: 'targetDate',
        type: 'date',
        description: 'The date to switch to',
        required: true, // default
      });
    });

    it('should accept parameter with required=false', () => {
      const result = CommandParameterSchema.parse({
        name: 'format',
        type: 'string',
        description: 'Output format',
        required: false,
      });

      expect(result.required).toBe(false);
    });

    it('should accept parameter with default value', () => {
      const result = CommandParameterSchema.parse({
        name: 'timeout',
        type: 'number',
        description: 'Timeout in seconds',
        required: false,
        default: 30,
      });

      expect(result.default).toBe(30);
    });

    it('should accept parameter with code', () => {
      const result = CommandParameterSchema.parse({
        name: 'targetDate',
        type: 'date',
        description: 'The date to switch to',
        code: 'tdat',
      });

      expect(result.code).toBe('tdat');
    });

    it('should accept parameter with all fields', () => {
      const result = CommandParameterSchema.parse({
        name: 'view',
        type: 'ViewType',
        description: 'The view to switch to',
        required: true,
        default: 'day',
        code: 'vwtp',
      });

      expect(result).toEqual({
        name: 'view',
        type: 'ViewType',
        description: 'The view to switch to',
        required: true,
        default: 'day',
        code: 'vwtp',
      });
    });

    it('should accept parameter with object as default', () => {
      const result = CommandParameterSchema.parse({
        name: 'options',
        type: 'Options',
        description: 'Configuration options',
        required: false,
        default: { verbose: true },
      });

      expect(result.default).toEqual({ verbose: true });
    });

    it('should accept parameter with array as default', () => {
      const result = CommandParameterSchema.parse({
        name: 'tags',
        type: 'string[]',
        description: 'Tag list',
        required: false,
        default: [],
      });

      expect(result.default).toEqual([]);
    });
  });

  describe('negative cases', () => {
    it('should reject parameter without name', () => {
      expect(() =>
        CommandParameterSchema.parse({
          type: 'string',
          description: 'A parameter',
        })
      ).toThrow(ZodError);
    });

    it('should reject parameter without type', () => {
      expect(() =>
        CommandParameterSchema.parse({
          name: 'param',
          description: 'A parameter',
        })
      ).toThrow(ZodError);
    });

    it('should reject parameter without description', () => {
      expect(() =>
        CommandParameterSchema.parse({
          name: 'param',
          type: 'string',
        })
      ).toThrow(ZodError);
    });

    it('should reject parameter with invalid code length', () => {
      expect(() =>
        CommandParameterSchema.parse({
          name: 'param',
          type: 'string',
          description: 'A parameter',
          code: 'abc', // too short
        })
      ).toThrow(ZodError);

      expect(() =>
        CommandParameterSchema.parse({
          name: 'param',
          type: 'string',
          description: 'A parameter',
          code: 'abcde', // too long
        })
      ).toThrow(ZodError);
    });

    it('should reject parameter with non-boolean required', () => {
      expect(() =>
        CommandParameterSchema.parse({
          name: 'param',
          type: 'string',
          description: 'A parameter',
          required: 'yes',
        })
      ).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
    it('should accept empty string name', () => {
      const result = CommandParameterSchema.parse({
        name: '',
        type: 'string',
        description: 'A parameter',
      });

      expect(result.name).toBe('');
    });

    it('should accept null as default', () => {
      const result = CommandParameterSchema.parse({
        name: 'value',
        type: 'string',
        description: 'Optional value',
        required: false,
        default: null,
      });

      expect(result.default).toBeNull();
    });

    it('should accept undefined as default', () => {
      const result = CommandParameterSchema.parse({
        name: 'value',
        type: 'string',
        description: 'Optional value',
        required: false,
        default: undefined,
      });

      expect(result.default).toBeUndefined();
    });
  });
});

describe('CommandSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal application-scoped command', () => {
      const result = CommandSchema.parse({
        name: 'reloadCalendars',
        description: 'Reload all calendar file contents',
        scope: 'application',
      });

      expect(result).toEqual({
        name: 'reloadCalendars',
        description: 'Reload all calendar file contents',
        scope: 'application',
        parameters: [], // default
      });
    });

    it('should accept resource-scoped command with single resource type', () => {
      const result = CommandSchema.parse({
        name: 'show',
        description: 'Show the event in the calendar window',
        scope: 'resource',
        resourceType: 'event',
      });

      expect(result.resourceType).toBe('event');
    });

    it('should accept resource-scoped command with multiple resource types', () => {
      const result = CommandSchema.parse({
        name: 'duplicate',
        description: 'Duplicate the resource',
        scope: 'resource',
        resourceType: ['event', 'calendar'],
      });

      expect(result.resourceType).toEqual(['event', 'calendar']);
    });

    it('should accept command with parameters', () => {
      const result = CommandSchema.parse({
        name: 'switchView',
        description: 'Switch to a different calendar view',
        scope: 'application',
        parameters: [
          {
            name: 'to',
            type: 'ViewType',
            description: 'The view to switch to',
          },
        ],
      });

      expect(result.parameters).toHaveLength(1);
      expect(result.parameters[0]?.name).toBe('to');
    });

    it('should accept command with return type', () => {
      const result = CommandSchema.parse({
        name: 'getCalendars',
        description: 'Get all calendars',
        scope: 'application',
        returns: 'Calendar[]',
      });

      expect(result.returns).toBe('Calendar[]');
    });

    it('should accept command with code', () => {
      const result = CommandSchema.parse({
        name: 'reloadCalendars',
        description: 'Reload all calendar file contents',
        scope: 'application',
        code: 'rldc',
      });

      expect(result.code).toBe('rldc');
    });

    it('should accept command with all fields', () => {
      const result = CommandSchema.parse({
        name: 'createEvent',
        description: 'Create a new calendar event',
        scope: 'resource',
        resourceType: 'calendar',
        parameters: [
          {
            name: 'summary',
            type: 'string',
            description: 'Event title',
          },
          {
            name: 'startDate',
            type: 'date',
            description: 'Event start date',
          },
        ],
        returns: 'Event',
        code: 'crev',
      });

      expect(result).toEqual({
        name: 'createEvent',
        description: 'Create a new calendar event',
        scope: 'resource',
        resourceType: 'calendar',
        parameters: [
          {
            name: 'summary',
            type: 'string',
            description: 'Event title',
            required: true,
          },
          {
            name: 'startDate',
            type: 'date',
            description: 'Event start date',
            required: true,
          },
        ],
        returns: 'Event',
        code: 'crev',
      });
    });

    it('should accept application-scoped command without resourceType', () => {
      const result = CommandSchema.parse({
        name: 'quit',
        description: 'Quit the application',
        scope: 'application',
      });

      expect(result.resourceType).toBeUndefined();
    });
  });

  describe('negative cases', () => {
    it('should reject command without name', () => {
      expect(() =>
        CommandSchema.parse({
          description: 'A command',
          scope: 'application',
        })
      ).toThrow(ZodError);
    });

    it('should reject command without description', () => {
      expect(() =>
        CommandSchema.parse({
          name: 'doSomething',
          scope: 'application',
        })
      ).toThrow(ZodError);
    });

    it('should reject command without scope', () => {
      expect(() =>
        CommandSchema.parse({
          name: 'doSomething',
          description: 'A command',
        })
      ).toThrow(ZodError);
    });

    it('should reject command with invalid scope', () => {
      expect(() =>
        CommandSchema.parse({
          name: 'doSomething',
          description: 'A command',
          scope: 'global',
        })
      ).toThrow(ZodError);
    });

    it('should reject command with non-array parameters', () => {
      expect(() =>
        CommandSchema.parse({
          name: 'doSomething',
          description: 'A command',
          scope: 'application',
          parameters: 'not-an-array',
        })
      ).toThrow(ZodError);
    });

    it('should reject command with invalid parameter in array', () => {
      expect(() =>
        CommandSchema.parse({
          name: 'doSomething',
          description: 'A command',
          scope: 'application',
          parameters: [
            { name: 'param1', type: 'string', description: 'Valid' },
            { name: 'param2' }, // missing type and description
          ],
        })
      ).toThrow(ZodError);
    });

    it('should reject command with invalid code length', () => {
      expect(() =>
        CommandSchema.parse({
          name: 'doSomething',
          description: 'A command',
          scope: 'application',
          code: 'abc', // too short
        })
      ).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
    it('should accept empty string name', () => {
      const result = CommandSchema.parse({
        name: '',
        description: 'A command',
        scope: 'application',
      });

      expect(result.name).toBe('');
    });

    it('should accept empty string description', () => {
      const result = CommandSchema.parse({
        name: 'doSomething',
        description: '',
        scope: 'application',
      });

      expect(result.description).toBe('');
    });

    it('should accept empty parameters array', () => {
      const result = CommandSchema.parse({
        name: 'doSomething',
        description: 'A command',
        scope: 'application',
        parameters: [],
      });

      expect(result.parameters).toEqual([]);
    });

    it('should accept resource-scoped command with resourceType as empty array', () => {
      const result = CommandSchema.parse({
        name: 'doSomething',
        description: 'A command',
        scope: 'resource',
        resourceType: [],
      });

      expect(result.resourceType).toEqual([]);
    });

    it('should handle undefined optional fields', () => {
      const result = CommandSchema.parse({
        name: 'doSomething',
        description: 'A command',
        scope: 'application',
        resourceType: undefined,
        returns: undefined,
        code: undefined,
      });

      expect(result.resourceType).toBeUndefined();
      expect(result.returns).toBeUndefined();
      expect(result.code).toBeUndefined();
    });

    it('should accept command with many parameters', () => {
      const params = Array.from({ length: 10 }, (_, i) => ({
        name: `param${String(i)}`,
        type: 'string',
        description: `Parameter ${String(i)}`,
      }));

      const result = CommandSchema.parse({
        name: 'complexCommand',
        description: 'A complex command',
        scope: 'application',
        parameters: params,
      });

      expect(result.parameters).toHaveLength(10);
    });
  });
});
