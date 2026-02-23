/**
 * SDK wrapper for the iTerm HTTP client.
 *
 * @packageDocumentation
 */

import { iTermClient, type iTermClientOptions } from '../client.js';

/**
 * Get a iTermClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured iTermClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getiTermClient(): iTermClient {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions iterm:*:*'
    );
  }

  const options: iTermClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new iTermClient(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: iTermClient | null = null;

/**
 * Get or create the singleton iTermClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): iTermClient {
  _client ??= getiTermClient();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
