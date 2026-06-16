/**
 * SDK wrapper for the Notes HTTP client.
 *
 * @packageDocumentation
 */

import { NotesClient, type NotesClientOptions } from '@macts/notes'

/**
 * Get a NotesClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured NotesClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getNotesClient(): NotesClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission notes:*:*'
    )
  }

  const options: NotesClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new NotesClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: NotesClient | null = null

/**
 * Get or create the singleton NotesClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): NotesClient {
  _client ??= getNotesClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
