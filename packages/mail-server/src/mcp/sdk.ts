/**
 * SDK wrapper for the Mail HTTP client.
 *
 * @packageDocumentation
 */

import { MailClient, type MailClientOptions } from '@macts/mail';

/**
 * Get a MailClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured MailClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getMailClient(): MailClient {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions mail:*:*'
    );
  }

  const options: MailClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new MailClient(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: MailClient | null = null;

/**
 * Get or create the singleton MailClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): MailClient {
  _client ??= getMailClient();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
