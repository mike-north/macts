/**
 * API plugin for macOS SystemSettings.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { systemSettingsApiPlugin as plugin, systemSettingsApiPlugin } from './plugin.js';
export type { AppManifest } from '@macts/core';
