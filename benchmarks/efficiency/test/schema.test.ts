/**
 * Tests for task-definition validation.
 *
 * Expected values are derived from the task-definition contract in
 * `src/types.ts` and the schema rules in `src/tasks/schema.ts` — not from
 * program output.
 */

import { describe, expect, it } from 'vitest'
import { parseTaskDefinition, parseTaskSet } from '../src/tasks/schema.js'
import { DEFAULT_TASKS } from '../src/tasks/registry.js'

/** A minimal valid task definition used as a base for mutation in tests. */
function validTask(): Record<string, unknown> {
  return {
    id: 'create-calendar-event',
    intent: 'Create a calendar event.',
    apps: ['com.apple.iCal'],
    operationClass: 'write',
    mactsCapabilities: ['calendar.events.create'],
  }
}

describe('parseTaskDefinition', () => {
  it('accepts a well-formed task and preserves every field', () => {
    const input = { ...validTask(), notes: 'cleanup: delete event' }
    const parsed = parseTaskDefinition(input)
    expect(parsed).toEqual(input)
  })

  it('accepts each valid operation class', () => {
    for (const operationClass of ['read', 'write', 'delete', 'send', 'execute', 'system-change']) {
      expect(() => parseTaskDefinition({ ...validTask(), operationClass })).not.toThrow()
    }
  })

  // Negative: id must be kebab-case (contract: stable, filesystem-safe keys).
  it('rejects an id that is not kebab-case', () => {
    expect(() => parseTaskDefinition({ ...validTask(), id: 'Create_Calendar_Event' })).toThrow()
  })

  // Negative: at least one app must be declared (documents live requirement).
  it('rejects an empty apps array', () => {
    expect(() => parseTaskDefinition({ ...validTask(), apps: [] })).toThrow()
  })

  // Negative: at least one capability must be declared (discovery stand-in).
  it('rejects an empty mactsCapabilities array', () => {
    expect(() => parseTaskDefinition({ ...validTask(), mactsCapabilities: [] })).toThrow()
  })

  // Negative: operationClass is a closed enum.
  it('rejects an unknown operation class', () => {
    expect(() => parseTaskDefinition({ ...validTask(), operationClass: 'mutate' })).toThrow()
  })

  // Negative: unknown keys are rejected (strict schema guards typos).
  it('rejects unknown extra keys', () => {
    expect(() => parseTaskDefinition({ ...validTask(), extra: true })).toThrow()
  })

  // Negative: non-object input.
  it('rejects a non-object value', () => {
    expect(() => parseTaskDefinition('not a task')).toThrow()
  })
})

describe('parseTaskSet', () => {
  it('accepts a non-empty array of valid tasks', () => {
    const tasks = parseTaskSet([validTask(), { ...validTask(), id: 'find-and-rename-file' }])
    expect(tasks).toHaveLength(2)
  })

  // Negative: an empty set is not a benchmark.
  it('rejects an empty array', () => {
    expect(() => parseTaskSet([])).toThrow()
  })

  // Negative: duplicate ids would collide in report keys.
  it('rejects duplicate task ids', () => {
    expect(() => parseTaskSet([validTask(), validTask()])).toThrow(/Duplicate task id/)
  })
})

describe('DEFAULT_TASKS', () => {
  it('contains the three representative tasks from the spike scope', () => {
    const ids = DEFAULT_TASKS.map((t) => t.id)
    expect(ids).toEqual([
      'create-calendar-event',
      'find-and-rename-file',
      'add-reminder-from-email',
    ])
  })

  it('declares the cross-app task across Mail and Reminders', () => {
    const task = DEFAULT_TASKS.find((t) => t.id === 'add-reminder-from-email')
    expect(task?.apps).toEqual(['com.apple.mail', 'com.apple.reminders'])
    expect(task?.mactsCapabilities).toEqual(['mail.messages.list', 'reminders.tasks.create'])
  })
})
