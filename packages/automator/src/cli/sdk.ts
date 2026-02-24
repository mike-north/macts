/**
 * SDK wrapper for the Automator HTTP client.
 *
 * @packageDocumentation
 */

import { AutomatorClient, type AutomatorClientOptions } from '../client.js'

/**
 * Get a AutomatorClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured AutomatorClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getAutomatorClient(): AutomatorClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions automator:*:*'
    )
  }

  const options: AutomatorClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new AutomatorClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: AutomatorClient | null = null

/**
 * Get or create the singleton AutomatorClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): AutomatorClient {
  _client ??= getAutomatorClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
