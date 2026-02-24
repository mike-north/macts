/**
 * API plugin for ScreenSharing.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for ScreenSharing.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for ScreenSharing.app automation.
 */
export const screenSharingApiPlugin = {
  name: 'screensharing',
  bundleId: 'com.apple.ScreenSharing',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.apple.ScreenSharing',
      name: 'Screen Sharing',
      displayName: 'Screen Sharing',
      tccEntitlements: ['automation'],
      distributionModel: 'system',
    },
    suites: [
      {
        name: 'Screen Sharing Suite',
        description: 'Terms and Events for controlling the Screen Sharing application.',
        code: 'LAzn',
        resources: ['Connection'],
        commands: ['getURL'],
        enums: [],
      },
    ],
    resources: {
      Connection: {
        name: 'Connection',
        plural: 'Connections',
        description: 'A screen sharing connection',
        code: 'conn',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The connection name',
            code: 'pnam',
            optional: false,
          },
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the connection',
            code: 'ID  ',
            optional: false,
          },
          url: {
            access: 'r',
            type: 'string',
            description: 'The VNC URL of the connection',
            code: 'url ',
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
        connections: {
          resource: 'Connection',
          access: 'r',
          description: 'Screen sharing connections',
        },
      },
    },
    relationships: [],
    commands: {
      list: {
        name: 'list',
        description: 'List all screen sharing connections',
        scope: 'resource',
        resourceType: 'Connection',
        parameters: [],
        code: 'core',
        permission: 'screen-sharing:connections:list',
      },
      get: {
        name: 'get',
        description: 'Get a connection by ID',
        scope: 'resource',
        resourceType: 'Connection',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Connection identifier',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'screen-sharing:connections:get',
      },
      getURL: {
        name: 'getURL',
        description: 'Open a vnc URL',
        scope: 'application',
        parameters: [
          {
            name: 'url',
            type: 'string',
            description: 'The VNC URL to open',
            required: true,
          },
        ],
        code: 'GURL',
        permission: 'screen-sharing:app:getURL',
      },
    },
    permissions: {
      connections: {
        read: ['screen-sharing:connections:list', 'screen-sharing:connections:get'],
      },
      app: {
        read: ['screen-sharing:app:getURL'],
      },
    },
    extraction: {
      sourceFile: 'source.sdef',
      confidence: {
        overall: 0.9,
        fields: {
          resources: 1,
          enums: 1,
          hierarchy: 0.9,
          commands: 0.85,
        },
      },
      openQuestions: [],
    },
  } as AppManifest,
} as const
