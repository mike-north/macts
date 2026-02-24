/**
 * SDK wrapper for the Reminders HTTP client.
 *
 * @packageDocumentation
 */

import { RemindersClient, type RemindersClientOptions } from '../client.js'

/**
 * Get a RemindersClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured RemindersClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getRemindersClient(): RemindersClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions reminders:*:*'
    )
  }

  const options: RemindersClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new RemindersClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: RemindersClient | null = null

/**
 * Get or create the singleton RemindersClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): RemindersClient {
  _client ??= getRemindersClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
