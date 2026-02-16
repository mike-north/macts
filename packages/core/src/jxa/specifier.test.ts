import { describe, it, expect } from 'vitest';
import { ObjectSpecifier } from './specifier.js';

describe('ObjectSpecifier', () => {
  describe('basic chaining', () => {
    it('should build app specifier', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal');
      expect(spec.toGetCode()).toBe('Application("com.apple.iCal")');
    });

    it('should build collection access', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal').collection('calendars');
      expect(spec.toGetCode()).toBe('Application("com.apple.iCal").calendars()');
    });

    it('should build nested collection access', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .byId('work')
        .collection('events');
      expect(spec.toGetCode()).toBe(
        'Application("com.apple.iCal").calendars.byId("work").events()'
      );
    });
  });

  describe('selectors', () => {
    it('should build byId selector', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal').collection('calendars').byId('work-123');
      expect(spec.toGetCode()).toBe('Application("com.apple.iCal").calendars.byId("work-123")');
    });

    it('should build byName selector', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .byName('Work Calendar');
      expect(spec.toGetCode()).toBe(
        'Application("com.apple.iCal").calendars.byName("Work Calendar")'
      );
    });

    it('should build at selector (0-based)', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal').collection('calendars').at(0);
      expect(spec.toGetCode()).toBe('Application("com.apple.iCal").calendars.at(0)');
    });

    it('should build whose selector', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .whose({ name: 'Work' });
      expect(spec.toGetCode()).toContain('whose');
      expect(spec.toGetCode()).toContain('_name');
      expect(spec.toGetCode()).toContain('_equals');
    });
  });

  describe('property access', () => {
    it('should access property', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .byId('work')
        .property('name');
      expect(spec.toGetCode()).toBe('Application("com.apple.iCal").calendars.byId("work").name()');
    });
  });

  describe('set code', () => {
    it('should generate set code', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .byId('work')
        .property('name');
      expect(spec.toSetCode('New Name')).toBe(
        'Application("com.apple.iCal").calendars.byId("work").name() = "New Name";'
      );
    });
  });

  describe('make code', () => {
    it('should generate make code', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .byId('work')
        .collection('events');
      const code = spec.toMakeCode({ summary: 'Meeting', startDate: '2024-01-01' });
      expect(code).toContain('events.push');
      expect(code).toContain('summary');
      expect(code).toContain('Meeting');
    });
  });

  describe('delete code', () => {
    it('should generate delete code', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .byId('work')
        .collection('events')
        .byId('event-123');
      expect(spec.toDeleteCode()).toBe(
        'Application("com.apple.iCal").calendars.byId("work").events.byId("event-123").delete();'
      );
    });
  });

  describe('validation', () => {
    it('should throw if byId called without collection', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal');
      expect(() => spec.byId('123')).toThrow();
    });

    it('should throw if byName called without collection', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal');
      expect(() => spec.byName('test')).toThrow();
    });

    it('should throw if make called without collection', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .byId('work')
        .property('name');
      expect(() => spec.toMakeCode({ foo: 'bar' })).toThrow();
    });
  });

  describe('getSteps', () => {
    it('should return steps for inspection', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal').collection('calendars').byId('work');
      const steps = spec.getSteps();
      expect(steps).toHaveLength(2);
      expect(steps[0]?.kind).toBe('app');
      expect(steps[1]?.kind).toBe('collection');
      expect(steps[1]?.selector?.type).toBe('id');
    });
  });

  describe('edge cases', () => {
    it('should handle empty predicate in whose', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal').collection('calendars').whose({});
      const code = spec.toGetCode();
      expect(code).toContain('whose');
      expect(code).toContain('{  }'); // Empty object with two spaces
    });

    it('should handle multiple properties in whose predicate', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('events')
        .whose({ name: 'Meeting', completed: false });
      const code = spec.toGetCode();
      expect(code).toContain('_name');
      expect(code).toContain('_completed');
      expect(code).toContain('_equals');
    });

    it('should handle special characters in string values', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .byName('Work "Special" Calendar');
      const code = spec.toGetCode();
      // JSON.stringify automatically escapes quotes
      expect(code).toContain('byName');
      expect(code).toContain('Work');
      expect(code).toContain('Special');
      expect(code).toContain('Calendar');
    });

    it('should handle negative index values', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal').collection('calendars').at(-1);
      expect(spec.toGetCode()).toContain('.at(-1)');
    });

    it('should handle complex property values in make', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal').collection('events');
      const code = spec.toMakeCode({
        summary: 'Meeting',
        attendees: ['alice@example.com', 'bob@example.com'],
        metadata: { priority: 'high', tags: ['work', 'urgent'] },
      });
      expect(code).toContain('attendees');
      expect(code).toContain('metadata');
      expect(code).toContain('alice@example.com');
      expect(code).toContain('priority');
    });

    it('should handle null and undefined in set code', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .byId('work')
        .property('description');
      expect(spec.toSetCode(null)).toContain('= null;');
      expect(spec.toSetCode(undefined)).toContain('= undefined;');
    });

    it('should handle numeric property values in set code', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .byId('work')
        .property('priority');
      expect(spec.toSetCode(42)).toContain('= 42;');
      expect(spec.toSetCode(0)).toContain('= 0;');
      expect(spec.toSetCode(-1)).toContain('= -1;');
    });

    it('should handle boolean property values in set code', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal')
        .collection('calendars')
        .byId('work')
        .property('visible');
      expect(spec.toSetCode(true)).toContain('= true;');
      expect(spec.toSetCode(false)).toContain('= false;');
    });

    it('should throw if at() called without collection', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal');
      expect(() => spec.at(0)).toThrow('at() can only be called after collection()');
    });

    it('should throw if whose() called without collection', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal');
      expect(() => spec.whose({ name: 'test' })).toThrow(
        'whose() can only be called after collection()'
      );
    });

    it('should return readonly array from getSteps', () => {
      const spec = ObjectSpecifier.app('com.apple.iCal');
      const steps = spec.getSteps();
      // TypeScript should prevent mutation, but we can verify it's the same reference behavior
      expect(Array.isArray(steps)).toBe(true);
    });
  });
});
