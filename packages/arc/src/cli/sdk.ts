/**
 * SDK wrapper for the Arc HTTP client.
 *
 * @packageDocumentation
 */

import { ArcClient, type ArcClientOptions } from '../client.js'

/**
 * Get a ArcClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured ArcClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getArcClient(): ArcClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission arc:*:*'
    )
  }

  const options: ArcClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new ArcClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: ArcClient | null = null

/**
 * Get or create the singleton ArcClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): ArcClient {
  _client ??= getArcClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
