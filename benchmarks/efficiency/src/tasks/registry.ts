/**
 * The default, representative benchmark task set.
 *
 * These three tasks are deliberately small and span a range of operation
 * classes and apps, matching the examples called out in the spike scope
 * (create a calendar event; find a file and rename it; add a reminder from an
 * email). Add tasks here — or load an external JSON set via
 * {@link ./schema.ts#parseTaskSet} — to extend coverage.
 *
 * @packageDocumentation
 */

import { parseTaskSet } from './schema.js'
import type { TaskDefinition } from '../types.js'

/**
 * Raw task data. Authored as plain objects, then validated through the same
 * schema an external JSON set would pass through, so the built-in set can never
 * drift from the contract.
 */
const RAW_TASKS: readonly unknown[] = [
  {
    id: 'create-calendar-event',
    intent: 'Create a calendar event "Team Meeting" tomorrow at 10:00 for one hour.',
    apps: ['com.apple.iCal'],
    operationClass: 'write',
    mactsCapabilities: ['calendar.events.create'],
    notes:
      'End state: a single event titled "Team Meeting" exists on the default calendar at the target time. Cleanup: delete the created event.',
  },
  {
    id: 'find-and-rename-file',
    intent: 'Find the file named "draft.txt" in the working folder and rename it to "final.txt".',
    apps: ['com.apple.finder'],
    operationClass: 'write',
    mactsCapabilities: ['finder.files.search', 'finder.files.rename'],
    notes:
      'Precondition: a file "draft.txt" exists in a known scratch folder. End state: it is named "final.txt". Cleanup: restore the original name.',
  },
  {
    id: 'add-reminder-from-email',
    intent:
      'Read the subject of the most recent email and create a reminder titled "Follow up: <subject>".',
    apps: ['com.apple.mail', 'com.apple.reminders'],
    operationClass: 'write',
    mactsCapabilities: ['mail.messages.list', 'reminders.tasks.create'],
    notes:
      'Spans two apps. End state: a reminder titled "Follow up: <subject>" exists in the default list. Cleanup: delete the created reminder.',
  },
]

/**
 * The validated default task set. Frozen so callers cannot mutate the shared
 * registry.
 */
export const DEFAULT_TASKS: readonly TaskDefinition[] = Object.freeze(parseTaskSet(RAW_TASKS))
