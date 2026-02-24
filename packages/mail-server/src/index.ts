/**
 * API plugin for macOS Mail.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { mailApiPlugin as plugin, mailApiPlugin } from './plugin.js'
export type { AppManifest } from '@macts/core'
