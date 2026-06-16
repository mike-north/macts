/**
 * SDK wrapper for the Alfred HTTP client.
 *
 * @packageDocumentation
 */

import { AlfredClient, type AlfredClientOptions } from '../client.js'

/**
 * Get a AlfredClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured AlfredClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getAlfredClient(): AlfredClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission alfred:*:*'
    )
  }

  const options: AlfredClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new AlfredClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: AlfredClient | null = null

/**
 * Get or create the singleton AlfredClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): AlfredClient {
  _client ??= getAlfredClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
