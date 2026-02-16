import { describe, it, expect } from 'vitest';
import {
  toPlural,
  toSingular,
  isPlural,
  normalizeResourceName,
  inferPlural,
} from './inflection.js';

describe('toPlural', () => {
  it('should handle regular plurals', () => {
    expect(toPlural('calendar')).toBe('calendars');
    expect(toPlural('event')).toBe('events');
    expect(toPlural('document')).toBe('documents');
  });

  it('should handle irregular plurals', () => {
    expect(toPlural('person')).toBe('people');
    expect(toPlural('index')).toBe('indices');
    expect(toPlural('status')).toBe('statuses');
  });

  it('should handle already plural words', () => {
    expect(toPlural('calendars')).toBe('calendars');
    expect(toPlural('people')).toBe('people');
  });
});

describe('toSingular', () => {
  it('should handle regular singulars', () => {
    expect(toSingular('calendars')).toBe('calendar');
    expect(toSingular('events')).toBe('event');
  });

  it('should handle irregular singulars', () => {
    expect(toSingular('people')).toBe('person');
    expect(toSingular('indices')).toBe('index');
  });

  it('should handle already singular words', () => {
    expect(toSingular('calendar')).toBe('calendar');
    expect(toSingular('person')).toBe('person');
  });
});

describe('isPlural', () => {
  it('should return true for plural words', () => {
    expect(isPlural('calendars')).toBe(true);
    expect(isPlural('events')).toBe(true);
    expect(isPlural('people')).toBe(true);
  });

  it('should return false for singular words', () => {
    expect(isPlural('calendar')).toBe(false);
    expect(isPlural('event')).toBe(false);
    expect(isPlural('person')).toBe(false);
  });
});

describe('normalizeResourceName', () => {
  it('should convert CamelCase to kebab-case', () => {
    expect(normalizeResourceName('displayAlarm')).toBe('display-alarm');
    expect(normalizeResourceName('soundAlarm')).toBe('sound-alarm');
  });

  it('should handle spaces', () => {
    expect(normalizeResourceName('display alarm')).toBe('display-alarm');
  });

  it('should handle simple names', () => {
    expect(normalizeResourceName('calendar')).toBe('calendar');
  });

  it('should handle multiple consecutive capitals', () => {
    expect(normalizeResourceName('HTTPRequest')).toBe('httprequest');
  });

  it('should handle mixed case with spaces', () => {
    expect(normalizeResourceName('Display Alarm Event')).toBe('display-alarm-event');
  });
});

describe('inferPlural', () => {
  it('should use provided plural', () => {
    expect(inferPlural('person', 'people')).toBe('people');
  });

  it('should infer plural when not provided', () => {
    expect(inferPlural('calendar')).toBe('calendars');
    expect(inferPlural('event')).toBe('events');
  });

  it('should handle irregular plurals when not provided', () => {
    expect(inferPlural('person')).toBe('people');
    expect(inferPlural('index')).toBe('indices');
  });

  it('should handle empty provided plural', () => {
    expect(inferPlural('calendar', '')).toBe('calendars');
  });
});
