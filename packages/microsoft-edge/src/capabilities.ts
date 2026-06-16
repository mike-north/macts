/**
 * Machine-readable capability metadata for Microsoft Edge.
 *
 * Generated from the app manifest. Each entry describes one capability —
 * its stable name, app dependency, required permission (`app:resource:operation`),
 * and risk classification (read | write | delete | send | execute | system-change).
 *
 * @packageDocumentation
 */

/**
 * Risk classification for a capability.
 */
export type CapabilityRisk = 'read' | 'write' | 'delete' | 'send' | 'execute' | 'system-change'

/**
 * Machine-readable description of a single capability.
 */
export interface CapabilityMetadata {
  /** Stable dotted capability name (`<app>.<resource>.<operation>`). */
  readonly name: string
  /** App this capability belongs to. */
  readonly app: string
  /** Bundle identifier of the app dependency. */
  readonly appBundleId: string
  /** Resource the operation targets (`app` for app-scoped capabilities). */
  readonly resource: string
  /** Operation name. */
  readonly operation: string
  /** Human-readable description. */
  readonly description: string
  /** Required permission in `app:resource:operation` form, or null if none. */
  readonly permission: string | null
  /** Deterministic risk classification. */
  readonly risk: CapabilityRisk
  /** JSON Schema for the capability's input. */
  readonly inputSchema: Record<string, unknown>
}

/**
 * Every capability exposed by Microsoft Edge, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'microsoft-edge.bookmarkfolders.get',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'bookmarkfolders',
    operation: 'get',
    description: 'Get a bookmark folder by ID',
    permission: 'edge:bookmarkFolders:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Bookmark folder identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'microsoft-edge.bookmarkfolders.list',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'bookmarkfolders',
    operation: 'list',
    description: 'List all bookmark folders',
    permission: 'edge:bookmarkFolders:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-edge.bookmarkitems.get',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'bookmarkitems',
    operation: 'get',
    description: 'Get a bookmark item by ID',
    permission: 'edge:bookmarkItems:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Bookmark item identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'microsoft-edge.bookmarkitems.list',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'bookmarkitems',
    operation: 'list',
    description: 'List all bookmark items in a folder',
    permission: 'edge:bookmarkItems:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: {
          description: 'Bookmark folder identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['folderId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.copySelection',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'copySelection',
    description: 'Copy text',
    permission: 'edge:tabs:copySelection',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.create',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'create',
    description: 'Create a new tab',
    permission: 'edge:tabs:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        windowId: {
          description: 'Window identifier for the tab',
          type: 'string',
        },
        uRL: {
          description: 'URL to load in the tab',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['windowId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.cutSelection',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'cutSelection',
    description: 'Cut selected text (If Possible)',
    permission: 'edge:tabs:cutSelection',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.execute',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'execute',
    description: 'Execute a piece of javascript',
    permission: 'edge:tabs:execute',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
        javascript: {
          description: 'The javascript code to execute',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId', 'javascript'],
    },
  },
  {
    name: 'microsoft-edge.tabs.get',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'get',
    description: 'Get a tab by ID',
    permission: 'edge:tabs:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'microsoft-edge.tabs.goBack',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'goBack',
    description: 'Go Back (If Possible)',
    permission: 'edge:tabs:goBack',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.goForward',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'goForward',
    description: 'Go Forward (If Possible)',
    permission: 'edge:tabs:goForward',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.list',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'list',
    description: 'List all tabs in a window',
    permission: 'edge:tabs:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        windowId: {
          description: 'Window identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['windowId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.pasteSelection',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'pasteSelection',
    description: 'Paste text (If Possible)',
    permission: 'edge:tabs:pasteSelection',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.redo',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'redo',
    description: 'Redo the last change',
    permission: 'edge:tabs:redo',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.reload',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'reload',
    description: 'Reload a tab',
    permission: 'edge:tabs:reload',
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.selectAll',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'selectAll',
    description: 'Select all',
    permission: 'edge:tabs:selectAll',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.stop',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'stop',
    description: 'Stop the current tab from loading',
    permission: 'edge:tabs:stop',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.undo',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'undo',
    description: 'Undo the last change',
    permission: 'edge:tabs:undo',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId'],
    },
  },
  {
    name: 'microsoft-edge.tabs.viewSource',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'tabs',
    operation: 'viewSource',
    description: 'View the HTML source of the tab',
    permission: 'edge:tabs:viewSource',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          description: 'Tab identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['tabId'],
    },
  },
  {
    name: 'microsoft-edge.windows.create',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'windows',
    operation: 'create',
    description: 'Create a new window',
    permission: 'edge:windows:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          description: 'Window mode (normal or incognito)',
          type: 'string',
        },
        givenName: {
          description: 'The given name of the window.',
          type: 'string',
        },
        index: {
          description: 'The index of the window, ordered front to back.',
          type: 'number',
        },
        bounds: {
          description: 'The bounding rectangle of the window.',
          type: 'object',
        },
        minimized: {
          description: 'Whether the window is currently minimized.',
          type: 'boolean',
        },
        visible: {
          description: 'Whether the window is currently visible.',
          type: 'boolean',
        },
        zoomed: {
          description: 'Whether the window is currently zoomed.',
          type: 'boolean',
        },
        activeTabIndex: {
          description: 'The index of the active tab.',
          type: 'number',
        },
      },
      additionalProperties: false,
      required: [
        'givenName',
        'index',
        'bounds',
        'minimized',
        'visible',
        'zoomed',
        'activeTabIndex',
      ],
    },
  },
  {
    name: 'microsoft-edge.windows.get',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'windows',
    operation: 'get',
    description: 'Get a window by ID',
    permission: 'edge:windows:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Window identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'microsoft-edge.windows.list',
    app: 'microsoft-edge',
    appBundleId: 'com.microsoft.edgemac',
    resource: 'windows',
    operation: 'list',
    description: 'List all windows',
    permission: 'edge:windows:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
