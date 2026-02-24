/**
 * API plugin for GoogleChrome.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for GoogleChrome.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for GoogleChrome.app automation.
 */
export const googleChromeApiPlugin = {
  name: 'googlechrome',
  bundleId: 'com.google.Chrome',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.google.Chrome',
      name: 'Google Chrome',
      displayName: 'Google Chrome',
      tccEntitlements: ['automation'],
      distributionModel: 'system',
    },
    suites: [
      {
        name: 'Standard Suite',
        description: 'Common classes and commands for all applications.',
        code: 'core',
        resources: ['Window'],
        commands: [
          'save',
          'open',
          'close',
          'quit',
          'count',
          'delete',
          'duplicate',
          'exists',
          'make',
          'move',
          'print',
        ],
        enums: [],
      },
      {
        name: 'Chromium Suite',
        description: 'Common classes and commands for Chrome.',
        code: 'CrSu',
        resources: ['Tab', 'BookmarkFolder', 'BookmarkItem'],
        commands: [
          'reload',
          'goBack',
          'goForward',
          'selectAll',
          'cutSelection',
          'copySelection',
          'pasteSelection',
          'undo',
          'redo',
          'stop',
          'viewSource',
          'execute',
        ],
        enums: [],
      },
    ],
    resources: {
      Window: {
        name: 'Window',
        plural: 'Windows',
        description: 'A window.',
        code: 'cwin',
        properties: {
          givenName: {
            access: 'rw',
            type: 'string',
            description: 'The given name of the window.',
            code: 'GNam',
            optional: false,
          },
          name: {
            access: 'r',
            type: 'string',
            description: 'The full title of the window.',
            code: 'pnam',
            optional: false,
          },
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the window.',
            code: 'ID  ',
            optional: false,
          },
          index: {
            access: 'rw',
            type: 'integer',
            description: 'The index of the window, ordered front to back.',
            code: 'pidx',
            optional: false,
          },
          bounds: {
            access: 'rw',
            type: 'rect',
            description: 'The bounding rectangle of the window.',
            code: 'pbnd',
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
              resource: 'tab',
            },
            description: 'Returns the currently selected tab',
            code: 'acTa',
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
          activeTabIndex: {
            access: 'rw',
            type: 'integer',
            description: 'The index of the active tab.',
            code: 'acTI',
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
        description: 'A tab.',
        code: 'CrTb',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'Unique ID of the tab.',
            code: 'ID  ',
            optional: false,
          },
          title: {
            access: 'r',
            type: 'string',
            description: 'The title of the tab.',
            code: 'pnam',
            optional: false,
          },
          uRL: {
            access: 'rw',
            type: 'string',
            description: 'The url visible to the user.',
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
        },
        identifiers: [
          {
            property: 'id',
            primary: true,
          },
        ],
      },
      BookmarkFolder: {
        name: 'BookmarkFolder',
        plural: 'BookmarkFolders',
        description: 'A bookmarks folder that contains other bookmarks folder and bookmark items.',
        code: 'CrBF',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'Unique ID of the bookmark folder.',
            code: 'ID  ',
            optional: false,
          },
          title: {
            access: 'rw',
            type: 'string',
            description: 'The title of the folder.',
            code: 'pnam',
            optional: false,
          },
          index: {
            access: 'r',
            type: 'number',
            description: 'Returns the index with respect to its parent bookmark folder.',
            code: 'pidx',
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
      BookmarkItem: {
        name: 'BookmarkItem',
        plural: 'BookmarkItems',
        description: 'An item consists of an URL and the title of a bookmark',
        code: 'CrBI',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'Unique ID of the bookmark item.',
            code: 'ID  ',
            optional: false,
          },
          title: {
            access: 'rw',
            type: 'string',
            description: 'The title of the bookmark item.',
            code: 'pnam',
            optional: false,
          },
          uRL: {
            access: 'rw',
            type: 'string',
            description: 'The URL of the bookmark.',
            code: 'URL ',
            optional: false,
          },
          index: {
            access: 'r',
            type: 'number',
            description: 'Returns the index with respect to its parent bookmark folder.',
            code: 'pidx',
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
        bookmarkFolders: {
          resource: 'BookmarkFolder',
          access: 'r',
          description:
            'A bookmarks folder that contains other bookmarks folder and bookmark items.',
          children: {
            bookmarkItems: {
              resource: 'BookmarkItem',
              access: 'rw',
              description: 'An item consists of an URL and the title of a bookmark',
            },
          },
        },
      },
    },
    relationships: [],
    commands: {
      save: {
        name: 'save',
        description: 'Save an object.',
        scope: 'application',
        parameters: [
          {
            name: 'in',
            type: 'file',
            description: 'The file in which to save the object.',
            required: false,
            code: 'kfil',
          },
          {
            name: 'as',
            type: 'string',
            description:
              "The file type in which to save the data. Can be 'only html', 'complete html', or 'single file'; default is 'complete html'.",
            required: false,
            code: 'fltp',
          },
        ],
        code: 'save',
      },
      open: {
        name: 'open',
        description: 'Open a document.',
        scope: 'application',
        parameters: [],
        code: 'odoc',
      },
      close: {
        name: 'close',
        description: 'Close a window.',
        scope: 'application',
        parameters: [],
        code: 'clos',
      },
      quit: {
        name: 'quit',
        description: 'Quit the application.',
        scope: 'application',
        parameters: [],
        code: 'quit',
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
      delete: {
        name: 'delete',
        description: 'Delete an object.',
        scope: 'application',
        parameters: [],
        code: 'delo',
      },
      duplicate: {
        name: 'duplicate',
        description: 'Copy object(s) and put the copies at a new location.',
        scope: 'application',
        parameters: [
          {
            name: 'to',
            type: 'string',
            description: 'The location for the new object(s).',
            required: false,
            code: 'insh',
          },
          {
            name: 'withProperties',
            type: 'any',
            description: 'Properties to be set in the new duplicated object(s).',
            required: false,
            code: 'prdt',
          },
        ],
        code: 'clon',
      },
      exists: {
        name: 'exists',
        description: 'Verify if an object exists.',
        scope: 'application',
        parameters: [],
        code: 'doex',
      },
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
            name: 'at',
            type: 'string',
            description: 'The location at which to insert the object.',
            required: false,
            code: 'insh',
          },
          {
            name: 'withData',
            type: 'any',
            description: 'The initial contents of the object.',
            required: false,
            code: 'data',
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
      move: {
        name: 'move',
        description: 'Move object(s) to a new location.',
        scope: 'application',
        parameters: [
          {
            name: 'to',
            type: 'string',
            description: 'The new location for the object(s).',
            required: true,
            code: 'insh',
          },
        ],
        code: 'move',
      },
      print: {
        name: 'print',
        description: 'Print an object.',
        scope: 'application',
        parameters: [],
        code: 'pdoc',
      },
      reload: {
        name: 'reload',
        description: 'Reload a tab.',
        scope: 'application',
        parameters: [],
        code: 'Rlod',
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
      selectAll: {
        name: 'selectAll',
        description: 'Select all.',
        scope: 'application',
        parameters: [],
        code: 'SlAl',
      },
      cutSelection: {
        name: 'cutSelection',
        description: 'Cut selected text (If Possible).',
        scope: 'application',
        parameters: [],
        code: 'Cut ',
      },
      copySelection: {
        name: 'copySelection',
        description: 'Copy text.',
        scope: 'application',
        parameters: [],
        code: 'Cop ',
      },
      pasteSelection: {
        name: 'pasteSelection',
        description: 'Paste text (If Possible).',
        scope: 'application',
        parameters: [],
        code: 'Past',
      },
      undo: {
        name: 'undo',
        description: 'Undo the last change.',
        scope: 'application',
        parameters: [],
        code: 'Undo',
      },
      redo: {
        name: 'redo',
        description: 'Redo the last change.',
        scope: 'application',
        parameters: [],
        code: 'Redo',
      },
      stop: {
        name: 'stop',
        description: 'Stop the current tab from loading.',
        scope: 'application',
        parameters: [],
        code: 'stop',
      },
      viewSource: {
        name: 'viewSource',
        description: 'View the HTML source of the tab.',
        scope: 'application',
        parameters: [],
        code: 'VSrc',
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
    },
  } as AppManifest,
} as const
