/**
 * SDK wrapper for the Terminal HTTP client.
 *
 * @packageDocumentation
 */

import { TerminalClient, type TerminalClientOptions } from '../client.js'

/**
 * Get a TerminalClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured TerminalClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getTerminalClient(): TerminalClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission terminal:*:*'
    )
  }

  const options: TerminalClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new TerminalClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: TerminalClient | null = null

/**
 * Get or create the singleton TerminalClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): TerminalClient {
  _client ??= getTerminalClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
