/**
 * SDK wrapper for the MicrosoftWord HTTP client.
 *
 * @packageDocumentation
 */

import { MicrosoftWordClient, type MicrosoftWordClientOptions } from '../client.js'

/**
 * Get a MicrosoftWordClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured MicrosoftWordClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getMicrosoftWordClient(): MicrosoftWordClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions microsoft-word:*:*'
    )
  }

  const options: MicrosoftWordClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new MicrosoftWordClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: MicrosoftWordClient | null = null

/**
 * Get or create the singleton MicrosoftWordClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): MicrosoftWordClient {
  _client ??= getMicrosoftWordClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
