/**
 * SDK wrapper for the MicrosoftEdge HTTP client.
 *
 * @packageDocumentation
 */

import { MicrosoftEdgeClient, type MicrosoftEdgeClientOptions } from '@macts/microsoft-edge';

/**
 * Get a MicrosoftEdgeClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured MicrosoftEdgeClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getMicrosoftEdgeClient(): MicrosoftEdgeClient {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions microsoft-edge:*:*'
    );
  }

  const options: MicrosoftEdgeClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new MicrosoftEdgeClient(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: MicrosoftEdgeClient | null = null;

/**
 * Get or create the singleton MicrosoftEdgeClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): MicrosoftEdgeClient {
  _client ??= getMicrosoftEdgeClient();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
