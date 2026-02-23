/**
 * API plugin for macOS Spotify.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match API plugin loader convention
export { spotifyApiPlugin as plugin, spotifyApiPlugin } from './plugin.js';
export type { AppManifest } from '@macts/core';
