/**
 * SDK wrapper for the SystemInformation HTTP client.
 *
 * @packageDocumentation
 */

import { SystemInformationClient, type SystemInformationClientOptions } from '../client.js'

/**
 * Get a SystemInformationClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured SystemInformationClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getSystemInformationClient(): SystemInformationClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions system-information:*:*'
    )
  }

  const options: SystemInformationClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new SystemInformationClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: SystemInformationClient | null = null

/**
 * Get or create the singleton SystemInformationClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): SystemInformationClient {
  _client ??= getSystemInformationClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
