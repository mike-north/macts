/**
 * API plugin for macOS Messages.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { messagesApiPlugin as plugin, messagesApiPlugin } from './plugin.js'
export type { AppManifest } from '@macts/core'
