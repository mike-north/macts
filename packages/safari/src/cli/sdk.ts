/**
 * SDK wrapper for the Safari HTTP client.
 *
 * @packageDocumentation
 */

import { SafariClient, type SafariClientOptions } from '../client.js'

/**
 * Get a SafariClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured SafariClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getSafariClient(): SafariClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission safari:*:*'
    )
  }

  const options: SafariClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new SafariClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: SafariClient | null = null

/**
 * Get or create the singleton SafariClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): SafariClient {
  _client ??= getSafariClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
