/**
 * API plugin for macOS Reminders.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { remindersApiPlugin as plugin, remindersApiPlugin } from './plugin.js';
export type { AppManifest } from '@macts/core';
