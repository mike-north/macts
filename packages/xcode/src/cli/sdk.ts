/**
 * SDK wrapper for the Xcode HTTP client.
 *
 * @packageDocumentation
 */

import { XcodeClient, type XcodeClientOptions } from '../client.js';

/**
 * Get a XcodeClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured XcodeClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getXcodeClient(): XcodeClient {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions xcode:*:*'
    );
  }

  const options: XcodeClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new XcodeClient(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: XcodeClient | null = null;

/**
 * Get or create the singleton XcodeClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): XcodeClient {
  _client ??= getXcodeClient();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
