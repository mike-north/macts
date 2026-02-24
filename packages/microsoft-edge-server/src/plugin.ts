/**
 * API plugin for MicrosoftEdge.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for MicrosoftEdge.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for MicrosoftEdge.app automation.
 */
export const microsoftEdgeApiPlugin = {
  name: 'microsoftedge',
  bundleId: 'com.microsoft.edgemac',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.microsoft.edgemac',
      name: 'Microsoft Edge',
      displayName: 'Microsoft Edge',
      tccEntitlements: ['automation'],
      distributionModel: 'developer-id',
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
        description: 'Common classes and commands for Edge.',
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
              resource: 'Tab',
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
        windows: {
          resource: 'Window',
          access: 'r',
          description: 'The windows contained within this application',
          children: {
            tabs: {
              resource: 'Tab',
              access: 'r',
              description: 'The tabs contained within the window',
            },
          },
        },
        bookmarkFolders: {
          resource: 'BookmarkFolder',
          access: 'r',
          description: 'Contains the bookmarks bar and other bookmarks folder',
          children: {
            bookmarkFolders: {
              resource: 'BookmarkFolder',
              access: 'r',
              description: 'The bookmark folders present within',
            },
            bookmarkItems: {
              resource: 'BookmarkItem',
              access: 'r',
              description: 'The bookmarks present within',
            },
          },
        },
      },
    },
    relationships: [],
    commands: {
      listWindows: {
        name: 'list',
        description: 'List all windows',
        scope: 'resource',
        resourceType: 'Window',
        parameters: [],
        code: 'core',
        permission: 'edge:windows:list',
      },
      getWindow: {
        name: 'get',
        description: 'Get a window by ID',
        scope: 'resource',
        resourceType: 'Window',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Window identifier',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'edge:windows:get',
      },
      createWindow: {
        name: 'create',
        description: 'Create a new window',
        scope: 'resource',
        resourceType: 'Window',
        parameters: [
          {
            name: 'mode',
            type: 'string',
            description: 'Window mode (normal or incognito)',
            required: false,
          },
        ],
        code: 'crel',
        permission: 'edge:windows:create',
      },
      listTabs: {
        name: 'list',
        description: 'List all tabs in a window',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'windowId',
            type: 'string',
            description: 'Window identifier',
            required: true,
          },
        ],
        code: 'core',
        permission: 'edge:tabs:list',
      },
      getTab: {
        name: 'get',
        description: 'Get a tab by ID',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'edge:tabs:get',
      },
      createTab: {
        name: 'create',
        description: 'Create a new tab',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'windowId',
            type: 'string',
            description: 'Window identifier for the tab',
            required: true,
          },
          {
            name: 'uRL',
            type: 'string',
            description: 'URL to load in the tab',
            required: false,
          },
        ],
        code: 'crel',
        permission: 'edge:tabs:create',
      },
      listBookmarkFolders: {
        name: 'list',
        description: 'List all bookmark folders',
        scope: 'resource',
        resourceType: 'BookmarkFolder',
        parameters: [],
        code: 'core',
        permission: 'edge:bookmarkFolders:list',
      },
      getBookmarkFolder: {
        name: 'get',
        description: 'Get a bookmark folder by ID',
        scope: 'resource',
        resourceType: 'BookmarkFolder',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Bookmark folder identifier',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'edge:bookmarkFolders:get',
      },
      listBookmarkItems: {
        name: 'list',
        description: 'List all bookmark items in a folder',
        scope: 'resource',
        resourceType: 'BookmarkItem',
        parameters: [
          {
            name: 'folderId',
            type: 'string',
            description: 'Bookmark folder identifier',
            required: true,
          },
        ],
        code: 'core',
        permission: 'edge:bookmarkItems:list',
      },
      getBookmarkItem: {
        name: 'get',
        description: 'Get a bookmark item by ID',
        scope: 'resource',
        resourceType: 'BookmarkItem',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Bookmark item identifier',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'edge:bookmarkItems:get',
      },
      reload: {
        name: 'reload',
        description: 'Reload a tab',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:reload',
      },
      goBack: {
        name: 'goBack',
        description: 'Go Back (If Possible)',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:goBack',
      },
      goForward: {
        name: 'goForward',
        description: 'Go Forward (If Possible)',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:goForward',
      },
      selectAll: {
        name: 'selectAll',
        description: 'Select all',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:selectAll',
      },
      cutSelection: {
        name: 'cutSelection',
        description: 'Cut selected text (If Possible)',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:cutSelection',
      },
      copySelection: {
        name: 'copySelection',
        description: 'Copy text',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:copySelection',
      },
      pasteSelection: {
        name: 'pasteSelection',
        description: 'Paste text (If Possible)',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:pasteSelection',
      },
      undo: {
        name: 'undo',
        description: 'Undo the last change',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:undo',
      },
      redo: {
        name: 'redo',
        description: 'Redo the last change',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:redo',
      },
      stop: {
        name: 'stop',
        description: 'Stop the current tab from loading',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:stop',
      },
      viewSource: {
        name: 'viewSource',
        description: 'View the HTML source of the tab',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:viewSource',
      },
      execute: {
        name: 'execute',
        description: 'Execute a piece of javascript',
        scope: 'resource',
        resourceType: 'Tab',
        parameters: [
          {
            name: 'tabId',
            type: 'string',
            description: 'Tab identifier',
            required: true,
          },
          {
            name: 'javascript',
            type: 'string',
            description: 'The javascript code to execute',
            required: true,
          },
        ],
        code: 'CrSu',
        permission: 'edge:tabs:execute',
      },
    },
    permissions: {
      windows: {
        read: ['edge:windows:list', 'edge:windows:get'],
        create: ['edge:windows:create'],
        write: ['edge:windows:update'],
        delete: ['edge:windows:delete'],
      },
      tabs: {
        read: ['edge:tabs:list', 'edge:tabs:get'],
        create: ['edge:tabs:create'],
        write: [
          'edge:tabs:update',
          'edge:tabs:reload',
          'edge:tabs:goBack',
          'edge:tabs:goForward',
          'edge:tabs:selectAll',
          'edge:tabs:cutSelection',
          'edge:tabs:copySelection',
          'edge:tabs:pasteSelection',
          'edge:tabs:undo',
          'edge:tabs:redo',
          'edge:tabs:stop',
          'edge:tabs:viewSource',
          'edge:tabs:execute',
        ],
        delete: ['edge:tabs:delete'],
      },
      bookmarkFolders: {
        read: ['edge:bookmarkFolders:list', 'edge:bookmarkFolders:get'],
      },
      bookmarkItems: {
        read: ['edge:bookmarkItems:list', 'edge:bookmarkItems:get'],
      },
    },
    extraction: {
      sourceFile: 'edge-sdef.xml',
      confidence: {
        overall: 0.95,
        fields: {
          resources: 1,
          commands: 0.95,
          hierarchy: 0.95,
        },
      },
      openQuestions: [],
    },
  } as AppManifest,
} as const
