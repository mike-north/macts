/**
 * API plugin for macOS Xcode.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { xcodeApiPlugin as plugin, xcodeApiPlugin } from './plugin.js';
export type { AppManifest } from '@macts/core';
