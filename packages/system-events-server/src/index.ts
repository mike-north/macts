/**
 * API plugin for macOS SystemEvents.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { systemEventsApiPlugin as plugin, systemEventsApiPlugin } from './plugin.js';
export type { AppManifest } from '@macts/core';
