/**
 * API plugin for macOS Terminal.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { terminalApiPlugin as plugin, terminalApiPlugin } from './plugin.js'
export type { AppManifest } from '@macts/core'
