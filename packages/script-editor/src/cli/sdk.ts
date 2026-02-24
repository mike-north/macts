/**
 * SDK wrapper for the ScriptEditor HTTP client.
 *
 * @packageDocumentation
 */

import { ScriptEditorClient, type ScriptEditorClientOptions } from '../client.js';

/**
 * Get a ScriptEditorClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured ScriptEditorClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getScriptEditorClient(): ScriptEditorClient {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions script-editor:*:*'
    );
  }

  const options: ScriptEditorClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new ScriptEditorClient(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: ScriptEditorClient | null = null;

/**
 * Get or create the singleton ScriptEditorClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): ScriptEditorClient {
  _client ??= getScriptEditorClient();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
