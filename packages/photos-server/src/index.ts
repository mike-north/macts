/**
 * API plugin for macOS Photos.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { photosApiPlugin as plugin, photosApiPlugin } from './plugin.js'
export type { AppManifest } from '@macts/core'
