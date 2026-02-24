/**
 * SDK wrapper for the Spotify HTTP client.
 *
 * @packageDocumentation
 */

import { SpotifyClient, type SpotifyClientOptions } from '@macts/spotify'

/**
 * Get a SpotifyClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured SpotifyClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getSpotifyClient(): SpotifyClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions spotify:*:*'
    )
  }

  const options: SpotifyClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new SpotifyClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: SpotifyClient | null = null

/**
 * Get or create the singleton SpotifyClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): SpotifyClient {
  _client ??= getSpotifyClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
