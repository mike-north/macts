/**
 * SDK wrapper for the Calendar HTTP client.
 *
 * @packageDocumentation
 */

import { CalendarClient, type CalendarClientOptions } from '../client.js'

/**
 * Get a CalendarClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured CalendarClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getCalendarClient(): CalendarClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission calendar:*:*'
    )
  }

  const options: CalendarClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new CalendarClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: CalendarClient | null = null

/**
 * Get or create the singleton CalendarClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): CalendarClient {
  _client ??= getCalendarClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
