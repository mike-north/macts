/**
 * API plugin for macOS Music.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { musicApiPlugin as plugin, musicApiPlugin } from './plugin.js'
export type { AppManifest } from '@macts/core'
