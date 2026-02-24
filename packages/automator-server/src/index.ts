/**
 * API plugin for macOS Automator.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { automatorApiPlugin as plugin, automatorApiPlugin } from './plugin.js'
export type { AppManifest } from '@macts/core'
