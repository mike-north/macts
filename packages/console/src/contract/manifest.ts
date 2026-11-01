/**
 * The Console manifest, as data.
 *
 * `consoleContract.loadManifest()` imports this module lazily. Only the
 * Mac-side runtime calls it, and it validates the manifest before use, so the
 * value is deliberately typed `unknown`. Remote clients never load this module.
 *
 * Generated from the Console manifest; do not edit.
 *
 * @packageDocumentation
 */

/** The Console manifest. */
export const manifest: unknown = {
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
      unsupported: {
        evidence: {
          source: 'dictionary',
          bundleId: 'com.apple.Console',
          appVersion: '1.1',
          osVersion: '27.2',
          term: 'device',
          finding: 'no-class',
        },
      },
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
}
