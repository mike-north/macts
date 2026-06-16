/**
 * SDK wrapper for the BluetoothFileExchange HTTP client.
 *
 * @packageDocumentation
 */

import { BluetoothFileExchangeClient, type BluetoothFileExchangeClientOptions } from '../client.js'

/**
 * Get a BluetoothFileExchangeClient instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured BluetoothFileExchangeClient
 * @throws Error if MACTS_API_KEY is not set
 */
export function getBluetoothFileExchangeClient(): BluetoothFileExchangeClient {
  const apiKey = process.env['MACTS_API_KEY']

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --name "<name>" --permission bluetooth-file-exchange:*:*'
    )
  }

  const options: BluetoothFileExchangeClientOptions = {
    apiKey,
  }

  const baseUrl = process.env['MACTS_API_URL']
  if (baseUrl) {
    options.baseUrl = baseUrl
  }

  return new BluetoothFileExchangeClient(options)
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: BluetoothFileExchangeClient | null = null

/**
 * Get or create the singleton BluetoothFileExchangeClient.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): BluetoothFileExchangeClient {
  _client ??= getBluetoothFileExchangeClient()
  return _client
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null
}
