/**
 * SDK wrapper for the Preview HTTP client.
 *
 * @packageDocumentation
 */

import { PreviewClient, type PreviewClientOptions } from '../client.js'

/**
 * Get a PreviewClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured PreviewClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getPreviewClient(): PreviewClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission preview:*:*'
    )
  }

  const options: PreviewClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new PreviewClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: PreviewClient | null = null

/**
 * Get or create the singleton PreviewClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): PreviewClient {
  _client ??= getPreviewClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
