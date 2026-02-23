/**
 * SDK wrapper for the GoogleChrome HTTP client.
 *
 * @packageDocumentation
 */

import { GoogleChromeClient, type GoogleChromeClientOptions } from '../client.js';

/**
 * Get a GoogleChromeClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured GoogleChromeClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getGoogleChromeClient(): GoogleChromeClient {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions google-chrome:*:*'
    );
  }

  const options: GoogleChromeClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new GoogleChromeClient(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: GoogleChromeClient | null = null;

/**
 * Get or create the singleton GoogleChromeClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): GoogleChromeClient {
  _client ??= getGoogleChromeClient();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
