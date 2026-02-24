/**
 * SDK wrapper for the Music HTTP client.
 *
 * @packageDocumentation
 */

import { MusicClient, type MusicClientOptions } from '@macts/music'

/**
 * Get a MusicClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured MusicClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getMusicClient(): MusicClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions music:*:*'
    )
  }

  const options: MusicClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new MusicClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: MusicClient | null = null

/**
 * Get or create the singleton MusicClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): MusicClient {
  _client ??= getMusicClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
