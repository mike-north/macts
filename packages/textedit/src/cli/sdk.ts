/**
 * SDK wrapper for the TextEdit HTTP client.
 *
 * @packageDocumentation
 */

import { TextEditClient, type TextEditClientOptions } from '../client.js'

/**
 * Get a TextEditClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured TextEditClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getTextEditClient(): TextEditClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission textedit:*:*'
    )
  }

  const options: TextEditClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new TextEditClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: TextEditClient | null = null

/**
 * Get or create the singleton TextEditClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): TextEditClient {
  _client ??= getTextEditClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
