/**
 * SDK wrapper for the Shortcuts HTTP client.
 *
 * @packageDocumentation
 */

import { ShortcutsClient, type ShortcutsClientOptions } from '@macts/shortcuts'

/**
 * Get a ShortcutsClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured ShortcutsClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getShortcutsClient(): ShortcutsClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions shortcuts:*:*'
    )
  }

  const options: ShortcutsClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new ShortcutsClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: ShortcutsClient | null = null

/**
 * Get or create the singleton ShortcutsClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): ShortcutsClient {
  _client ??= getShortcutsClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
