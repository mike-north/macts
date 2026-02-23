/**
 * SDK wrapper for the SystemSettings HTTP client.
 *
 * @packageDocumentation
 */

import { SystemSettingsClient, type SystemSettingsClientOptions } from '../client.js';

/**
 * Get a SystemSettingsClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured SystemSettingsClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getSystemSettingsClient(): SystemSettingsClient {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions system-settings:*:*'
    );
  }

  const options: SystemSettingsClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new SystemSettingsClient(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: SystemSettingsClient | null = null;

/**
 * Get or create the singleton SystemSettingsClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): SystemSettingsClient {
  _client ??= getSystemSettingsClient();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
