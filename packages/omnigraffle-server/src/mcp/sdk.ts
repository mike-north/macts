/**
 * SDK wrapper for the OmniGraffle HTTP client.
 *
 * @packageDocumentation
 */

import { OmniGraffleClient, type OmniGraffleClientOptions } from '@macts/omnigraffle'

/**
 * Get a OmniGraffleClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured OmniGraffleClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getOmniGraffleClient(): OmniGraffleClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission omnigraffle:*:*'
    )
  }

  const options: OmniGraffleClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new OmniGraffleClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: OmniGraffleClient | null = null

/**
 * Get or create the singleton OmniGraffleClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): OmniGraffleClient {
  _client ??= getOmniGraffleClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
