/**
 * API plugin for macOS Arc.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { arcApiPlugin as plugin, arcApiPlugin } from './plugin.js';
export type { AppManifest } from '@macts/core';
