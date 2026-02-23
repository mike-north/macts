/**
 * API plugin for BluetoothFileExchange.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for BluetoothFileExchange.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for BluetoothFileExchange.app automation.
 */
export const bluetoothFileExchangeApiPlugin = {
  name: 'bluetoothfileexchange',
  bundleId: 'com.apple.BluetoothFileExchange',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.apple.BluetoothFileExchange",
    "name": "Bluetooth File Exchange",
    "displayName": "Bluetooth File Exchange",
    "tccEntitlements": [
      "automation"
    ],
    "distributionModel": "system"
  },
  "suites": [
    {
      "name": "Bluetooth File Exchange Suite",
      "description": "The suite of commands for Bluetooth File Exchange",
      "code": "btfe",
      "resources": [],
      "commands": [
        "browse",
        "send"
      ],
      "enums": []
    }
  ],
  "resources": {
    "Application": {
      "name": "Application",
      "plural": "Applications",
      "description": "The Bluetooth File Exchange application",
      "code": "capp",
      "properties": {
        "name": {
          "access": "r",
          "type": "string",
          "description": "The name of the application",
          "code": "pnam",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "name",
          "primary": true
        }
      ]
    }
  },
  "enums": {},
  "hierarchy": {
    "children": {}
  },
  "relationships": [],
  "commands": {
    "browse": {
      "name": "browse",
      "description": "Browse a device",
      "scope": "application",
      "parameters": [
        {
          "name": "device",
          "type": "string",
          "description": "The device to browse",
          "required": false,
          "code": "bdAd"
        }
      ],
      "code": "toFT",
      "permission": "bluetooth-file-exchange:app:browse"
    },
    "send": {
      "name": "send",
      "description": "Send a file to a bluetooth device",
      "scope": "application",
      "parameters": [
        {
          "name": "file",
          "type": {
            "array": "file"
          },
          "description": "The file(s) to send",
          "required": false,
          "code": "btFs"
        },
        {
          "name": "toDevice",
          "type": "string",
          "description": "The device to send the file to",
          "required": false,
          "code": "bdAd"
        }
      ],
      "code": "toOP",
      "permission": "bluetooth-file-exchange:app:send"
    }
  },
  "permissions": {
    "app": {
      "read": [
        "bluetooth-file-exchange:app:browse",
        "bluetooth-file-exchange:app:send"
      ]
    }
  },
  "extraction": {
    "sourceFile": "source.sdef",
    "confidence": {
      "overall": 0.95,
      "fields": {
        "resources": 1,
        "enums": 1,
        "hierarchy": 1,
        "commands": 0.95
      }
    },
    "openQuestions": []
  }
} as AppManifest,
} as const;
