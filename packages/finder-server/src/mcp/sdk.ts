/**
 * SDK wrapper for the Finder HTTP client.
 *
 * @packageDocumentation
 */

import { FinderClient, type FinderClientOptions } from '@macts/finder'

/**
 * Get a FinderClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured FinderClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getFinderClient(): FinderClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission finder:*:*'
    )
  }

  const options: FinderClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new FinderClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: FinderClient | null = null

/**
 * Get or create the singleton FinderClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): FinderClient {
  _client ??= getFinderClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
