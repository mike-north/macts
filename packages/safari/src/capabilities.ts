/**
 * Machine-readable capability metadata for Safari.
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
 * Every capability exposed by Safari, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'safari.app.addReadingListItem',
    app: 'safari',
    appBundleId: 'com.apple.Safari',
    resource: 'app',
    operation: 'addReadingListItem',
    description:
      'Add a new Reading List item with the given URL. Allows a custom title and preview text to be specified.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        andPreviewText: {
          description:
            'Preview text for the Reading List item, usually the first few sentences of the article',
          type: 'string',
        },
        withTitle: {
          description: 'Title of the Reading List item',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'safari.app.dispatchMessageToExtension',
    app: 'safari',
    appBundleId: 'com.apple.Safari',
    resource: 'app',
    operation: 'dispatchMessageToExtension',
    description: 'Dispatch a message to a Safari Extension.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'safari.app.doJavaScript',
    app: 'safari',
    appBundleId: 'com.apple.Safari',
    resource: 'app',
    operation: 'doJavaScript',
    description: 'Applies a string of JavaScript code to a document.',
    permission: null,
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        in: {
          description: 'The tab that the JavaScript should be evaluated in.',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'safari.app.emailContents',
    app: 'safari',
    appBundleId: 'com.apple.Safari',
    resource: 'app',
    operation: 'emailContents',
    description: 'Emails the contents of a tab.',
    permission: null,
    risk: 'send',
    inputSchema: {
      type: 'object',
      properties: {
        of: {
          description: 'The tab to send.',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'safari.app.searchTheWeb',
    app: 'safari',
    appBundleId: 'com.apple.Safari',
    resource: 'app',
    operation: 'searchTheWeb',
    description: "Searches the web using Safari's current search provider.",
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        in: {
          description: 'The tab that the search results should shown in.',
          type: 'string',
        },
        for: {
          description: 'The query to search for.',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['for'],
    },
  },
  {
    name: 'safari.app.showBookmarks',
    app: 'safari',
    appBundleId: 'com.apple.Safari',
    resource: 'app',
    operation: 'showBookmarks',
    description: "Shows Safari's bookmarks.",
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'safari.app.showCreditCardSettings',
    app: 'safari',
    appBundleId: 'com.apple.Safari',
    resource: 'app',
    operation: 'showCreditCardSettings',
    description: 'Show Safari Credit Card Settings.',
    permission: null,
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'safari.app.showExtensionsPreferences',
    app: 'safari',
    appBundleId: 'com.apple.Safari',
    resource: 'app',
    operation: 'showExtensionsPreferences',
    description: 'Show Safari Extensions preferences.',
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'safari.app.showPrivacyReport',
    app: 'safari',
    appBundleId: 'com.apple.Safari',
    resource: 'app',
    operation: 'showPrivacyReport',
    description: "Show Safari's Privacy Report",
    permission: null,
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'safari.app.syncAllPlistToDisk',
    app: 'safari',
    appBundleId: 'com.apple.Safari',
    resource: 'app',
    operation: 'syncAllPlistToDisk',
    description:
      'Make sure that all in-memory structures are in-sync with their on-disk counterparts.',
    permission: null,
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
