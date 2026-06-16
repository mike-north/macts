/**
 * SDK wrapper for the SystemEvents HTTP client.
 *
 * @packageDocumentation
 */

import { SystemEventsClient, type SystemEventsClientOptions } from '../client.js'

/**
 * Get a SystemEventsClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured SystemEventsClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getSystemEventsClient(): SystemEventsClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission system-events:*:*'
    )
  }

  const options: SystemEventsClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new SystemEventsClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: SystemEventsClient | null = null

/**
 * Get or create the singleton SystemEventsClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): SystemEventsClient {
  _client ??= getSystemEventsClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
