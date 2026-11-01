/**
 * The System Settings manifest, as data.
 *
 * `systemSettingsContract.loadManifest()` imports this module lazily. Only the
 * Mac-side runtime calls it, and it validates the manifest before use, so the
 * value is deliberately typed `unknown`. Remote clients never load this module.
 *
 * Generated from the System Settings manifest; do not edit.
 *
 * @packageDocumentation
 */

/** The System Settings manifest. */
export const manifest: unknown = {
  version: '1.0',
  app: {
    bundleId: 'com.apple.systempreferences',
    name: 'System Settings',
    displayName: 'System Settings',
    tccEntitlements: ['automation'],
    distributionModel: 'system',
  },
  suites: [
    {
      name: 'Standard Suite',
      code: '????',
      resources: [],
      commands: [],
      enums: [],
    },
    {
      name: 'System Settings',
      description: 'Classes and Commands specific to System Settings',
      code: 'xpsp',
      resources: ['Pane', 'Anchor'],
      commands: ['reveal', 'authorize', 'timedLoad'],
      enums: [],
    },
  ],
  resources: {
    Pane: {
      name: 'Pane',
      plural: 'Panes',
      description: 'A settings pane.',
      code: 'xppb',
      properties: {
        id: {
          access: 'r',
          type: 'string',
          description: 'The id of the settings pane.',
          code: 'ID  ',
          optional: false,
        },
        name: {
          access: 'r',
          type: 'string',
          description: 'The name of the settings pane.',
          code: 'pnam',
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
    Anchor: {
      name: 'Anchor',
      plural: 'Anchors',
      description: 'An anchor within a settings pane.',
      code: 'xppa',
      properties: {
        name: {
          access: 'r',
          type: 'string',
          description: 'The name of the anchor.',
          code: 'pnam',
          optional: false,
        },
      },
    },
  },
  enums: {},
  hierarchy: {
    children: {
      panes: {
        resource: 'Pane',
        access: 'r',
        description: 'A settings pane.',
        children: {
          anchors: {
            resource: 'Anchor',
            access: 'r',
            description: 'An anchor within a settings pane.',
          },
        },
      },
    },
  },
  relationships: [],
  commands: {
    reveal: {
      name: 'reveal',
      description: 'Reveals a settings pane or an anchor within a pane.',
      scope: 'application',
      parameters: [],
      code: 'mvis',
    },
    authorize: {
      name: 'authorize',
      description:
        'Prompt for authorization for a settings pane. Deprecated: no longer does anything.',
      scope: 'resource',
      resourceType: 'Pane',
      parameters: [],
      code: 'maut',
    },
    timedLoad: {
      name: 'timedLoad',
      description:
        'Times and loads given settings pane and returns load time. Deprecated: no longer does anything.',
      scope: 'resource',
      resourceType: 'Pane',
      parameters: [],
      code: 'mtml',
    },
  },
}
