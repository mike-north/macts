/**
 * API plugin for Arc.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for Arc.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Arc.app automation.
 */
export const arcApiPlugin = {
  name: 'arc',
  bundleId: 'company.thebrowser.Browser',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'company.thebrowser.Browser',
      name: 'Arc',
      displayName: 'Arc',
      tccEntitlements: ['automation'],
      distributionModel: 'system',
    },
    suites: [
      {
        name: 'Standard Suite',
        description: 'Common classes and commands for all applications.',
        code: 'core',
        resources: ['Window', 'Tab', 'Space'],
        commands: [
          'make',
          'count',
          'close',
          'select',
          'goBack',
          'goForward',
          'reload',
          'stop',
          'execute',
          'focus',
        ],
        enums: [],
      },
    ],
    resources: {
      Window: {
        name: 'Window',
        plural: 'Windows',
        description: "An application's window",
        code: 'WiND',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the window.',
            code: 'ID  ',
            optional: false,
          },
          name: {
            access: 'r',
            type: 'string',
            description: 'The full title of the window.',
            code: 'pnam',
            optional: false,
          },
          index: {
            access: 'rw',
            type: 'integer',
            description: 'The index of the window, ordered front to back.',
            code: 'pidx',
            optional: false,
          },
          closeable: {
            access: 'r',
            type: 'boolean',
            description: 'Whether the window has a close box.',
            code: 'hclb',
            optional: false,
          },
          minimizable: {
            access: 'r',
            type: 'boolean',
            description: 'Whether the window can be minimized.',
            code: 'ismn',
            optional: false,
          },
          minimized: {
            access: 'rw',
            type: 'boolean',
            description: 'Whether the window is currently minimized.',
            code: 'pmnd',
            optional: false,
          },
          resizable: {
            access: 'r',
            type: 'boolean',
            description: 'Whether the window can be resized.',
            code: 'prsz',
            optional: false,
          },
          visible: {
            access: 'rw',
            type: 'boolean',
            description: 'Whether the window is currently visible.',
            code: 'pvis',
            optional: false,
          },
          zoomable: {
            access: 'r',
            type: 'boolean',
            description: 'Whether the window can be zoomed.',
            code: 'iszm',
            optional: false,
          },
          zoomed: {
            access: 'rw',
            type: 'boolean',
            description: 'Whether the window is currently zoomed.',
            code: 'pzum',
            optional: false,
          },
          activeTab: {
            access: 'r',
            type: {
              resource: 'Tab',
            },
            description: 'Returns the currently selected tab',
            code: 'acTa',
            optional: false,
          },
          activeSpace: {
            access: 'r',
            type: {
              resource: 'Space',
            },
            description: 'Returns the currently active space',
            code: 'acSp',
            optional: false,
          },
          incognito: {
            access: 'rw',
            type: 'boolean',
            description: 'Whether the window is an incognito window.',
            code: 'inco',
            optional: false,
          },
          mode: {
            access: 'rw',
            type: 'string',
            description:
              "Represents the mode of the window which can be 'normal' or 'incognito', can be set only once during creation of the window.",
            code: 'mode',
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
      Tab: {
        name: 'Tab',
        plural: 'Tabs',
        description: "A window's tab",
        code: 'tAbB',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the tab.',
            code: 'ID  ',
            optional: false,
          },
          title: {
            access: 'r',
            type: 'string',
            description: 'The full title of the tab.',
            code: 'pnam',
            optional: false,
          },
          uRL: {
            access: 'rw',
            type: 'string',
            description: 'The url of the tab.',
            code: 'URL ',
            optional: false,
          },
          loading: {
            access: 'r',
            type: 'boolean',
            description: 'Is loading?',
            code: 'ldng',
            optional: false,
          },
          location: {
            access: 'rw',
            type: 'string',
            description:
              "Represents the location of the tab in the sidebar. Can be 'topApp', 'pinned', or 'unpinned'.",
            code: 'loca',
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
      Space: {
        name: 'Space',
        plural: 'Spaces',
        description: 'A space',
        code: 'sPaC',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the space.',
            code: 'ID  ',
            optional: false,
          },
          title: {
            access: 'r',
            type: 'string',
            description: 'The full title of the space.',
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
    },
    enums: {},
    hierarchy: {
      children: {
        windows: {
          resource: 'Window',
          access: 'rw',
          description: "An application's window",
          children: {
            tabs: {
              resource: 'Tab',
              access: 'rw',
              description: "A window's tab",
            },
            spaces: {
              resource: 'Space',
              access: 'rw',
              description: 'A space',
              children: {
                tabs: {
                  resource: 'Tab',
                  access: 'rw',
                  description: "A window's tab",
                },
              },
            },
          },
        },
        tabs: {
          resource: 'Tab',
          access: 'rw',
          description: "A window's tab",
        },
      },
    },
    relationships: [],
    commands: {
      make: {
        name: 'make',
        description: 'Make a new object.',
        scope: 'application',
        parameters: [
          {
            name: 'new',
            type: 'string',
            description: 'The class of the new object.',
            required: true,
            code: 'kocl',
          },
          {
            name: 'withProperties',
            type: 'any',
            description: 'The initial values for properties of the object.',
            required: false,
            code: 'prdt',
          },
        ],
        code: 'crel',
      },
      count: {
        name: 'count',
        description: 'Return the number of elements of a particular class within an object.',
        scope: 'application',
        parameters: [
          {
            name: 'each',
            type: 'string',
            description: 'The class of objects to be counted.',
            required: false,
            code: 'kocl',
          },
        ],
        code: 'cnte',
      },
      close: {
        name: 'close',
        description: 'Close',
        scope: 'application',
        parameters: [],
        code: 'clos',
      },
      select: {
        name: 'select',
        description: 'Select the tab.',
        scope: 'application',
        parameters: [],
        code: 'Sele',
      },
      goBack: {
        name: 'goBack',
        description: 'Go Back (If Possible).',
        scope: 'application',
        parameters: [],
        code: 'Back',
      },
      goForward: {
        name: 'goForward',
        description: 'Go Forward (If Possible).',
        scope: 'application',
        parameters: [],
        code: 'Fwd ',
      },
      reload: {
        name: 'reload',
        description: 'Reload a tab.',
        scope: 'application',
        parameters: [],
        code: 'Rlod',
      },
      stop: {
        name: 'stop',
        description: 'Stop the current tab from loading.',
        scope: 'application',
        parameters: [],
        code: 'stop',
      },
      execute: {
        name: 'execute',
        description: 'Execute a piece of javascript.',
        scope: 'application',
        parameters: [
          {
            name: 'javascript',
            type: 'string',
            description: 'The javascript code to execute.',
            required: true,
            code: 'JvSc',
          },
        ],
        code: 'ExJa',
      },
      focus: {
        name: 'focus',
        description: 'Focus on a space.',
        scope: 'application',
        parameters: [],
        code: 'Focs',
      },
    },
  } as AppManifest,
} as const
