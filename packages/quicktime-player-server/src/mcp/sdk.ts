/**
 * SDK wrapper for the QuickTimePlayer HTTP client.
 *
 * @packageDocumentation
 */

import { QuickTimePlayerClient, type QuickTimePlayerClientOptions } from '@macts/quicktime-player'

/**
 * Get a QuickTimePlayerClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured QuickTimePlayerClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getQuickTimePlayerClient(): QuickTimePlayerClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions quicktime-player:*:*'
    )
  }

  const options: QuickTimePlayerClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new QuickTimePlayerClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: QuickTimePlayerClient | null = null

/**
 * Get or create the singleton QuickTimePlayerClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): QuickTimePlayerClient {
  _client ??= getQuickTimePlayerClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
