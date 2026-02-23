/**
 * API plugin for macOS SystemInformation.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { systemInformationApiPlugin as plugin, systemInformationApiPlugin } from './plugin.js';
export type { AppManifest } from '@macts/core';
