/**
 * API plugin for Console.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for Console.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Console.app automation.
 */
export const consoleApiPlugin = {
  name: 'console',
  bundleId: 'com.apple.Console',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.apple.Console',
      name: 'Console',
      displayName: 'Console',
      tccEntitlements: ['automation'],
      distributionModel: 'system',
    },
    suites: [
      {
        name: 'Console Suite',
        description: 'Console commands.',
        code: 'csls',
        resources: ['Device'],
        commands: ['selectDevice'],
        enums: [],
      },
    ],
    resources: {
      Device: {
        name: 'Device',
        plural: 'Devices',
        description: 'A device in Console',
        code: 'devi',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The device name',
            code: 'pnam',
            optional: false,
          },
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the device',
            code: 'ID  ',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'id',
            primary: true,
          },
        ],
      },
    },
    enums: {},
    hierarchy: {
      children: {
        devices: {
          resource: 'Device',
          access: 'r',
          description: 'Devices in Console',
        },
      },
    },
    relationships: [],
    commands: {
      selectDevice: {
        name: 'selectDevice',
        description: 'Select a device.',
        scope: 'application',
        parameters: [],
        code: 'seld',
      },
    },
  } as AppManifest,
} as const
