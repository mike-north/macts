/**
 * SDK wrapper for the Photos HTTP client.
 *
 * @packageDocumentation
 */

import { PhotosClient, type PhotosClientOptions } from '../client.js';

/**
 * Get a PhotosClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured PhotosClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getPhotosClient(): PhotosClient {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions photos:*:*'
    );
  }

  const options: PhotosClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new PhotosClient(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: PhotosClient | null = null;

/**
 * Get or create the singleton PhotosClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): PhotosClient {
  _client ??= getPhotosClient();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
