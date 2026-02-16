import { describe, it, expect } from 'vitest';
import { CardinalitySchema, RelationshipSchema } from './relationship.js';
import { ZodError } from 'zod';

describe('CardinalitySchema', () => {
  describe('positive cases', () => {
    it('should accept one-to-one', () => {
      const result = CardinalitySchema.parse('one-to-one');
      expect(result).toBe('one-to-one');
    });

    it('should accept one-to-many', () => {
      const result = CardinalitySchema.parse('one-to-many');
      expect(result).toBe('one-to-many');
    });

    it('should accept many-to-one', () => {
      const result = CardinalitySchema.parse('many-to-one');
      expect(result).toBe('many-to-one');
    });

    it('should accept many-to-many', () => {
      const result = CardinalitySchema.parse('many-to-many');
      expect(result).toBe('many-to-many');
    });
  });

  describe('negative cases', () => {
    it('should reject invalid cardinality', () => {
      expect(() => CardinalitySchema.parse('one-to-some')).toThrow(ZodError);
    });

    it('should reject empty string', () => {
      expect(() => CardinalitySchema.parse('')).toThrow(ZodError);
    });

    it('should reject number', () => {
      expect(() => CardinalitySchema.parse(123)).toThrow(ZodError);
    });

    it('should reject object', () => {
      expect(() => CardinalitySchema.parse({ from: 'one', to: 'many' })).toThrow(ZodError);
    });
  });
});

describe('RelationshipSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal valid relationship', () => {
      const result = RelationshipSchema.parse({
        name: 'taskTags',
        from: 'task',
        to: 'tag',
        cardinality: 'many-to-many',
      });

      expect(result).toEqual({
        name: 'taskTags',
        from: 'task',
        to: 'tag',
        cardinality: 'many-to-many',
      });
    });

    it('should accept one-to-one relationship', () => {
      const result = RelationshipSchema.parse({
        name: 'userProfile',
        from: 'user',
        to: 'profile',
        cardinality: 'one-to-one',
      });

      expect(result.cardinality).toBe('one-to-one');
    });

    it('should accept one-to-many relationship', () => {
      const result = RelationshipSchema.parse({
        name: 'projectTasks',
        from: 'project',
        to: 'task',
        cardinality: 'one-to-many',
      });

      expect(result.cardinality).toBe('one-to-many');
    });

    it('should accept many-to-one relationship', () => {
      const result = RelationshipSchema.parse({
        name: 'taskProject',
        from: 'task',
        to: 'project',
        cardinality: 'many-to-one',
      });

      expect(result.cardinality).toBe('many-to-one');
    });

    it('should accept many-to-many relationship', () => {
      const result = RelationshipSchema.parse({
        name: 'taskTags',
        from: 'task',
        to: 'tag',
        cardinality: 'many-to-many',
      });

      expect(result.cardinality).toBe('many-to-many');
    });

    it('should accept relationship with property', () => {
      const result = RelationshipSchema.parse({
        name: 'taskProject',
        from: 'task',
        to: 'project',
        cardinality: 'many-to-one',
        property: 'projectId',
      });

      expect(result.property).toBe('projectId');
    });

    it('should accept relationship with description', () => {
      const result = RelationshipSchema.parse({
        name: 'taskTags',
        from: 'task',
        to: 'tag',
        cardinality: 'many-to-many',
        description: 'Tasks can have multiple tags, tags apply to multiple tasks',
      });

      expect(result.description).toBe('Tasks can have multiple tags, tags apply to multiple tasks');
    });

    it('should accept relationship with all fields', () => {
      const result = RelationshipSchema.parse({
        name: 'taskDependencies',
        from: 'task',
        to: 'task',
        cardinality: 'many-to-many',
        property: 'dependsOnIds',
        description: 'Tasks can depend on other tasks',
      });

      expect(result).toEqual({
        name: 'taskDependencies',
        from: 'task',
        to: 'task',
        cardinality: 'many-to-many',
        property: 'dependsOnIds',
        description: 'Tasks can depend on other tasks',
      });
    });

    it('should accept self-referential relationship', () => {
      const result = RelationshipSchema.parse({
        name: 'taskDependencies',
        from: 'task',
        to: 'task',
        cardinality: 'many-to-many',
      });

      expect(result.from).toBe('task');
      expect(result.to).toBe('task');
    });
  });

  describe('negative cases', () => {
    it('should reject relationship without name', () => {
      expect(() =>
        RelationshipSchema.parse({
          from: 'task',
          to: 'tag',
          cardinality: 'many-to-many',
        })
      ).toThrow(ZodError);
    });

    it('should reject relationship without from', () => {
      expect(() =>
        RelationshipSchema.parse({
          name: 'taskTags',
          to: 'tag',
          cardinality: 'many-to-many',
        })
      ).toThrow(ZodError);
    });

    it('should reject relationship without to', () => {
      expect(() =>
        RelationshipSchema.parse({
          name: 'taskTags',
          from: 'task',
          cardinality: 'many-to-many',
        })
      ).toThrow(ZodError);
    });

    it('should reject relationship without cardinality', () => {
      expect(() =>
        RelationshipSchema.parse({
          name: 'taskTags',
          from: 'task',
          to: 'tag',
        })
      ).toThrow(ZodError);
    });

    it('should reject relationship with invalid cardinality', () => {
      expect(() =>
        RelationshipSchema.parse({
          name: 'taskTags',
          from: 'task',
          to: 'tag',
          cardinality: 'one-to-some',
        })
      ).toThrow(ZodError);
    });

    it('should reject relationship with non-string name', () => {
      expect(() =>
        RelationshipSchema.parse({
          name: 123,
          from: 'task',
          to: 'tag',
          cardinality: 'many-to-many',
        })
      ).toThrow(ZodError);
    });

    it('should reject relationship with non-string from', () => {
      expect(() =>
        RelationshipSchema.parse({
          name: 'taskTags',
          from: 123,
          to: 'tag',
          cardinality: 'many-to-many',
        })
      ).toThrow(ZodError);
    });

    it('should reject relationship with non-string to', () => {
      expect(() =>
        RelationshipSchema.parse({
          name: 'taskTags',
          from: 'task',
          to: 123,
          cardinality: 'many-to-many',
        })
      ).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
    it('should accept empty string name', () => {
      const result = RelationshipSchema.parse({
        name: '',
        from: 'task',
        to: 'tag',
        cardinality: 'many-to-many',
      });

      expect(result.name).toBe('');
    });

    it('should accept empty string from', () => {
      const result = RelationshipSchema.parse({
        name: 'relationship',
        from: '',
        to: 'tag',
        cardinality: 'many-to-many',
      });

      expect(result.from).toBe('');
    });

    it('should accept empty string to', () => {
      const result = RelationshipSchema.parse({
        name: 'relationship',
        from: 'task',
        to: '',
        cardinality: 'many-to-many',
      });

      expect(result.to).toBe('');
    });

    it('should accept empty string property', () => {
      const result = RelationshipSchema.parse({
        name: 'taskTags',
        from: 'task',
        to: 'tag',
        cardinality: 'many-to-many',
        property: '',
      });

      expect(result.property).toBe('');
    });

    it('should accept empty string description', () => {
      const result = RelationshipSchema.parse({
        name: 'taskTags',
        from: 'task',
        to: 'tag',
        cardinality: 'many-to-many',
        description: '',
      });

      expect(result.description).toBe('');
    });

    it('should handle undefined optional fields', () => {
      const result = RelationshipSchema.parse({
        name: 'taskTags',
        from: 'task',
        to: 'tag',
        cardinality: 'many-to-many',
        property: undefined,
        description: undefined,
      });

      expect(result.property).toBeUndefined();
      expect(result.description).toBeUndefined();
    });
  });

  describe('real-world examples', () => {
    it('should accept OmniFocus task-tag many-to-many relationship', () => {
      const result = RelationshipSchema.parse({
        name: 'taskTags',
        from: 'task',
        to: 'tag',
        cardinality: 'many-to-many',
        description: 'Tasks can have multiple tags, tags apply to multiple tasks',
      });

      expect(result.cardinality).toBe('many-to-many');
    });

    it('should accept task parent-child relationship', () => {
      const result = RelationshipSchema.parse({
        name: 'taskParent',
        from: 'task',
        to: 'task',
        cardinality: 'many-to-one',
        property: 'parentTaskId',
        description: 'Tasks can have a parent task (subtask relationship)',
      });

      expect(result.from).toBe('task');
      expect(result.to).toBe('task');
      expect(result.cardinality).toBe('many-to-one');
    });

    it('should accept task dependencies relationship', () => {
      const result = RelationshipSchema.parse({
        name: 'taskDependencies',
        from: 'task',
        to: 'task',
        cardinality: 'many-to-many',
        property: 'dependsOn',
        description: 'Tasks can depend on completion of other tasks',
      });

      expect(result.cardinality).toBe('many-to-many');
    });

    it('should accept project-context one-to-one relationship', () => {
      const result = RelationshipSchema.parse({
        name: 'projectContext',
        from: 'project',
        to: 'context',
        cardinality: 'one-to-one',
        property: 'defaultContextId',
        description: 'Each project can have a default context',
      });

      expect(result.cardinality).toBe('one-to-one');
    });

    it('should accept note attachments one-to-many relationship', () => {
      const result = RelationshipSchema.parse({
        name: 'noteAttachments',
        from: 'note',
        to: 'attachment',
        cardinality: 'one-to-many',
        property: 'attachmentIds',
        description: 'Notes can have multiple attachments',
      });

      expect(result.cardinality).toBe('one-to-many');
    });
  });

  describe('validation scenarios', () => {
    it('should accept multiple relationships for same resource', () => {
      const relationships = [
        RelationshipSchema.parse({
          name: 'taskTags',
          from: 'task',
          to: 'tag',
          cardinality: 'many-to-many',
        }),
        RelationshipSchema.parse({
          name: 'taskProject',
          from: 'task',
          to: 'project',
          cardinality: 'many-to-one',
        }),
        RelationshipSchema.parse({
          name: 'taskDependencies',
          from: 'task',
          to: 'task',
          cardinality: 'many-to-many',
        }),
      ];

      expect(relationships).toHaveLength(3);
      expect(relationships.every((r) => r.from === 'task')).toBe(true);
    });

    it('should accept bidirectional relationships', () => {
      const forward = RelationshipSchema.parse({
        name: 'taskProject',
        from: 'task',
        to: 'project',
        cardinality: 'many-to-one',
      });

      const reverse = RelationshipSchema.parse({
        name: 'projectTasks',
        from: 'project',
        to: 'task',
        cardinality: 'one-to-many',
      });

      expect(forward.from).toBe(reverse.to);
      expect(forward.to).toBe(reverse.from);
    });

    it('should accept circular relationships', () => {
      const relationships = [
        RelationshipSchema.parse({
          name: 'aToB',
          from: 'resourceA',
          to: 'resourceB',
          cardinality: 'many-to-one',
        }),
        RelationshipSchema.parse({
          name: 'bToC',
          from: 'resourceB',
          to: 'resourceC',
          cardinality: 'many-to-one',
        }),
        RelationshipSchema.parse({
          name: 'cToA',
          from: 'resourceC',
          to: 'resourceA',
          cardinality: 'many-to-one',
        }),
      ];

      expect(relationships).toHaveLength(3);
    });
  });
});
