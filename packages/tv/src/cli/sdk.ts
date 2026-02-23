/**
 * SDK wrapper for the TV HTTP client.
 *
 * @packageDocumentation
 */

import { TVClient, type TVClientOptions } from '../client.js';

/**
 * Get a TVClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured TVClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getTVClient(): TVClient {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions tv:*:*'
    );
  }

  const options: TVClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new TVClient(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: TVClient | null = null;

/**
 * Get or create the singleton TVClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): TVClient {
  _client ??= getTVClient();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
