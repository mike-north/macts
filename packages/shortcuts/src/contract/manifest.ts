/**
 * The Shortcuts manifest, as data.
 *
 * `shortcutsContract.loadManifest()` imports this module lazily. Only the
 * Mac-side runtime calls it, and it validates the manifest before use, so the
 * value is deliberately typed `unknown`. Remote clients never load this module.
 *
 * Generated from the Shortcuts manifest; do not edit.
 *
 * @packageDocumentation
 */

/** The Shortcuts manifest. */
export const manifest: unknown = {
  version: '1.0',
  app: {
    bundleId: 'com.apple.shortcuts',
    name: 'Shortcuts',
    displayName: 'Shortcuts',
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
      name: 'Shortcuts Suite',
      description: 'Classes and Commands for working with Shortcuts',
      code: 'srct',
      resources: ['Shortcut', 'Folder'],
      commands: ['run'],
      enums: [],
    },
  ],
  resources: {
    Shortcut: {
      name: 'Shortcut',
      plural: 'Shortcuts',
      description: 'A shortcut in the Shortcuts application',
      code: 'srct',
      properties: {
        name: {
          access: 'r',
          type: 'string',
          description: 'The name of the shortcut',
          code: 'pnam',
          optional: false,
        },
        subtitle: {
          access: 'r',
          type: 'string',
          description: "The shortcut's subtitle",
          code: 'subt',
          optional: false,
        },
        id: {
          access: 'r',
          type: 'string',
          description: 'The unique identifier of the shortcut',
          code: 'ID  ',
          optional: false,
        },
        folder: {
          access: 'rw',
          type: 'string',
          description: 'The folder containing this shortcut (folder ID)',
          code: 'fldr',
          optional: false,
        },
        color: {
          access: 'r',
          type: 'rgb',
          description: "The shortcut's color",
          code: 'colr',
          optional: false,
        },
        icon: {
          access: 'r',
          type: 'data',
          description: "The shortcut's icon (TIFF image data)",
          code: 'sico',
          optional: false,
        },
        acceptsInput: {
          access: 'r',
          type: 'boolean',
          description: 'Indicates whether or not the shortcut accepts input data',
          code: 'anpt',
          optional: false,
        },
        actionCount: {
          access: 'r',
          type: 'integer',
          description: 'The number of actions in the shortcut',
          code: 'acnt',
          optional: false,
        },
      },
      identifiers: [
        {
          property: 'id',
          primary: true,
          unique: true,
          evidence: {
            unique: {
              source: 'sdef',
              note: 'The app\'s scripting dictionary describes the property as "the unique identifier of the shortcut"',
            },
          },
        },
      ],
    },
    Folder: {
      name: 'Folder',
      plural: 'Folders',
      description: 'A folder containing shortcuts',
      code: 'fldr',
      properties: {
        name: {
          access: 'rw',
          type: 'string',
          description: 'The name of the folder',
          code: 'pnam',
          optional: false,
        },
        id: {
          access: 'r',
          type: 'string',
          description: 'The unique identifier of the folder',
          code: 'ID  ',
          optional: false,
        },
      },
      identifiers: [
        {
          property: 'id',
          primary: true,
          unique: true,
          evidence: {
            unique: {
              source: 'sdef',
              note: 'The app\'s scripting dictionary describes the property as "the unique identifier of the folder"',
            },
          },
        },
      ],
      rangeRead: {
        supported: true,
        read: 'range',
        evidence: {
          source: 'probe',
          observedAt: '2026-11-03T17:59:44.000Z',
          bundleId: 'com.apple.shortcuts',
          appVersion: '10.0',
          osVersion: '27.2',
          pageMs: 192,
          columnMs: 217,
          items: 1,
          note: 'Read-only pages of the folders at the application, at page sizes 25, 2 and 1. The collection held one folder, so no page continued past the first. Timed on 2026-11-03 at 21:20 UTC: a first page of 25 read by range and by column, median of three each.',
        },
      },
    },
  },
  enums: {},
  hierarchy: {
    children: {
      shortcuts: {
        resource: 'Shortcut',
        access: 'rw',
        description: 'Shortcuts in the application',
      },
      folders: {
        resource: 'Folder',
        access: 'rw',
        description: 'Folders in the application',
        children: {
          shortcuts: {
            resource: 'Shortcut',
            access: 'rw',
            description: 'Shortcuts within a folder',
          },
        },
      },
    },
  },
  relationships: [],
  commands: {
    list: {
      name: 'list',
      description: 'List all shortcuts',
      scope: 'resource',
      resourceType: 'Shortcut',
      parameters: [],
      code: 'core',
    },
    get: {
      name: 'get',
      description: 'Get a shortcut by ID',
      scope: 'resource',
      resourceType: 'Shortcut',
      parameters: [
        {
          name: 'id',
          type: 'string',
          description: 'Shortcut identifier',
          required: true,
        },
      ],
      code: 'getd',
    },
    run: {
      name: 'run',
      description:
        "Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell 'Shortcuts Events' instead of 'Shortcuts'.",
      scope: 'resource',
      resourceType: 'Shortcut',
      parameters: [
        {
          name: 'id',
          type: 'string',
          description: 'The shortcut to run',
          required: true,
        },
        {
          name: 'withInput',
          type: 'any',
          description: 'The input to provide to the shortcut',
          required: false,
          code: 'inpt',
        },
      ],
      code: 'srun',
    },
    listFolders: {
      name: 'list',
      description: 'List all folders',
      scope: 'resource',
      resourceType: 'Folder',
      parameters: [],
      code: 'core',
      routeName: 'list',
    },
    getFolder: {
      name: 'get',
      description: 'Get a folder by ID',
      scope: 'resource',
      resourceType: 'Folder',
      parameters: [
        {
          name: 'id',
          type: 'string',
          description: 'Folder identifier',
          required: true,
        },
      ],
      code: 'getd',
      routeName: 'get',
    },
  },
  permissions: {
    shortcuts: {
      read: ['shortcuts:shortcuts:list', 'shortcuts:shortcuts:get', 'shortcuts:shortcuts:run'],
    },
    folders: {
      read: ['shortcuts:folders:list', 'shortcuts:folders:get'],
    },
  },
  extraction: {
    sourceFile: 'source.sdef',
    confidence: {
      overall: 0.95,
      fields: {
        resources: 1,
        enums: 1,
        hierarchy: 0.95,
        commands: 0.95,
      },
    },
    openQuestions: [],
  },
}
