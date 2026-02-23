/**
 * SDK wrapper for the Console HTTP client.
 *
 * @packageDocumentation
 */

import { ConsoleClient, type ConsoleClientOptions } from '../client.js';

/**
 * Get a ConsoleClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured ConsoleClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getConsoleClient(): ConsoleClient {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions console:*:*'
    );
  }

  const options: ConsoleClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new ConsoleClient(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: ConsoleClient | null = null;

/**
 * Get or create the singleton ConsoleClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): ConsoleClient {
  _client ??= getConsoleClient();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
