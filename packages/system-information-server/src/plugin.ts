/**
 * API plugin for SystemInformation.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for SystemInformation.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for SystemInformation.app automation.
 */
export const systemInformationApiPlugin = {
  name: 'systeminformation',
  bundleId: 'com.apple.SystemProfiler',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.apple.SystemProfiler',
      name: 'System Information',
      displayName: 'System Information',
      tccEntitlements: ['automation'],
      distributionModel: 'system',
    },
    suites: [
      {
        name: 'Standard Suite',
        description: 'Common classes and commands for all applications',
        code: '????',
        resources: [],
        commands: [],
        enums: [],
      },
      {
        name: 'System Profiler Suite',
        description: 'System Profiler specific classes',
        code: 'ddap',
        resources: ['Document'],
        commands: ['send'],
        enums: ['DetailLevel'],
      },
    ],
    resources: {
      Document: {
        name: 'Document',
        plural: 'Documents',
        description: 'A system profile document',
        code: 'docu',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The document name',
            code: 'pnam',
            optional: false,
          },
          plainText: {
            access: 'r',
            type: 'string',
            description: 'Plain text representation of the system profile document',
            code: 'ddta',
            optional: false,
          },
          xmlText: {
            access: 'r',
            type: 'string',
            description: 'XML representation of the system profile document',
            code: 'dxml',
            optional: false,
          },
          detailLevel: {
            access: 'rw',
            type: {
              enum: 'DetailLevel',
            },
            description: 'The desired level of detail for the system profile document',
            code: 'ddtl',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'name',
            primary: true,
          },
        ],
      },
    },
    enums: {
      DetailLevel: {
        name: 'DetailLevel',
        description: 'Level of detail for system profile information',
        code: 'edtl',
        values: [
          {
            name: 'mini',
            value: 'mini',
            description:
              'A compact profile which does not include any personal identifying information',
            code: 'mini',
          },
          {
            name: 'basic',
            value: 'basic',
            description:
              'A version which includes the basic hardware, software and network information. Moderate in size.',
            code: 'basi',
          },
          {
            name: 'full',
            value: 'full',
            description: 'A profile which includes all available information - can be quite large',
            code: 'full',
          },
        ],
      },
    },
    hierarchy: {
      children: {
        documents: {
          resource: 'Document',
          access: 'rw',
          description: 'System profile documents',
        },
      },
    },
    relationships: [],
    commands: {
      list: {
        name: 'list',
        description: 'List all system profile documents',
        scope: 'resource',
        resourceType: 'Document',
        parameters: [],
        code: 'core',
        permission: 'system-information:documents:list',
      },
      get: {
        name: 'get',
        description: 'Get a system profile document by name',
        scope: 'resource',
        resourceType: 'Document',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'Document name',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'system-information:documents:get',
      },
      send: {
        name: 'send',
        description: 'Send system information to AppleCare',
        scope: 'application',
        parameters: [],
        code: 'spul',
        permission: 'system-information:app:send',
      },
    },
    permissions: {
      documents: {
        read: ['system-information:documents:list', 'system-information:documents:get'],
      },
      app: {
        read: ['system-information:app:send'],
      },
    },
    extraction: {
      sourceFile: 'System Profiler.scriptSuite + System Profiler.scriptTerminology',
      confidence: {
        overall: 0.95,
        fields: {
          resources: 1,
          enums: 1,
          hierarchy: 0.95,
          commands: 0.95,
        },
      },
      openQuestions: [
        {
          question: 'Should the systemProfile property on NSApplication be exposed?',
          context:
            'The application class has a read-only systemProfile property (ddty) returning NSString with plain text representation',
          suggestions: [
            'Add as an application-level property',
            'Use the Document resource instead for accessing system profile data',
          ],
        },
      ],
    },
  } as AppManifest,
} as const
