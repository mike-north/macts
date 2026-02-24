/**
 * API plugin for macOS TextEdit.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { textEditApiPlugin as plugin, textEditApiPlugin } from './plugin.js'
export type { AppManifest } from '@macts/core'
