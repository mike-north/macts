/**
 * SDK wrapper for the OmniFocus HTTP client.
 *
 * @packageDocumentation
 */

import { OmniFocusClient, type OmniFocusClientOptions } from '../client.js'

/**
 * Get a OmniFocusClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured OmniFocusClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getOmniFocusClient(): OmniFocusClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions omnifocus:*:*'
    )
  }

  const options: OmniFocusClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new OmniFocusClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: OmniFocusClient | null = null

/**
 * Get or create the singleton OmniFocusClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): OmniFocusClient {
  _client ??= getOmniFocusClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
