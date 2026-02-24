/**
 * SDK wrapper for the OmniPlan HTTP client.
 *
 * @packageDocumentation
 */

import { OmniPlanClient, type OmniPlanClientOptions } from '@macts/omniplan'

/**
 * Get a OmniPlanClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured OmniPlanClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getOmniPlanClient(): OmniPlanClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions omniplan:*:*'
    )
  }

  const options: OmniPlanClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new OmniPlanClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: OmniPlanClient | null = null

/**
 * Get or create the singleton OmniPlanClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): OmniPlanClient {
  _client ??= getOmniPlanClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
