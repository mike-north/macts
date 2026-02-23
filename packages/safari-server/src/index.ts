/**
 * API plugin for macOS Safari.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { safariApiPlugin as plugin, safariApiPlugin } from './plugin.js';
export type { AppManifest } from '@macts/core';
