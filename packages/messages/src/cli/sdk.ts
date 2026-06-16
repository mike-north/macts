/**
 * SDK wrapper for the Messages HTTP client.
 *
 * @packageDocumentation
 */

import { MessagesClient, type MessagesClientOptions } from '../client.js'

/**
 * Get a MessagesClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured MessagesClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getMessagesClient(): MessagesClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission messages:*:*'
    )
  }

  const options: MessagesClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new MessagesClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: MessagesClient | null = null

/**
 * Get or create the singleton MessagesClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): MessagesClient {
  _client ??= getMessagesClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
