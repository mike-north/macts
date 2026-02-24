/**
 * API plugin for macOS Console.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { consoleApiPlugin as plugin, consoleApiPlugin } from './plugin.js'
export type { AppManifest } from '@macts/core'
