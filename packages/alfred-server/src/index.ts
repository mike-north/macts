/**
 * API plugin for macOS Alfred.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { alfredApiPlugin as plugin, alfredApiPlugin } from './plugin.js'
export type { AppManifest } from '@macts/core'
