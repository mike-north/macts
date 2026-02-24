/**
 * API plugin for macOS Finder.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { finderApiPlugin as plugin, finderApiPlugin } from './plugin.js'
export type { AppManifest } from '@macts/core'
