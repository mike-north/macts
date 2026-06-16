/**
 * Machine-readable capability metadata for Microsoft Word.
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
 * Every capability exposed by Microsoft Word, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'microsoft-word.app.copyObject',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'app',
    operation: 'copyObject',
    description: 'Copy the selected content to the clipboard',
    permission: 'word:app:copy',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.app.createNewDocument',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'app',
    operation: 'createNewDocument',
    description: 'Create a new document',
    permission: 'word:documents:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        attachedTemplate: {
          description: 'Path to template for the new document',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.app.cutObject',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'app',
    operation: 'cutObject',
    description: 'Cut the selected content to the clipboard',
    permission: 'word:app:cut',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.app.find',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'app',
    operation: 'find',
    description: 'Find text in the document',
    permission: 'word:app:find',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        findText: {
          description: 'The text to search for',
          type: 'string',
        },
        matchCase: {
          description: 'Whether to match case',
          type: 'boolean',
        },
        matchWholeWord: {
          description: 'Whether to match whole words only',
          type: 'boolean',
        },
      },
      additionalProperties: false,
      required: ['findText'],
    },
  },
  {
    name: 'microsoft-word.app.insertText',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'app',
    operation: 'insertText',
    description: 'Insert text at the specified location',
    permission: 'word:documents:insert',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          description: 'The text to insert',
          type: 'string',
        },
        at: {
          description: 'The character position to insert at',
          type: 'number',
        },
      },
      additionalProperties: false,
      required: ['text'],
    },
  },
  {
    name: 'microsoft-word.app.pasteObject',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'app',
    operation: 'pasteObject',
    description: 'Paste content from the clipboard',
    permission: 'word:app:paste',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.app.redo',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'app',
    operation: 'redo',
    description: 'Redo the last undone action',
    permission: 'word:app:redo',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.app.replace',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'app',
    operation: 'replace',
    description: 'Replace text in the document',
    permission: 'word:app:replace',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        findText: {
          description: 'The text to search for',
          type: 'string',
        },
        replaceWith: {
          description: 'The replacement text',
          type: 'string',
        },
        replaceAll: {
          description: 'Whether to replace all occurrences',
          type: 'boolean',
        },
      },
      additionalProperties: false,
      required: ['findText', 'replaceWith'],
    },
  },
  {
    name: 'microsoft-word.app.selectAll',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'app',
    operation: 'selectAll',
    description: 'Select all content in the document',
    permission: 'word:app:selectAll',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.app.undo',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'app',
    operation: 'undo',
    description: 'Undo the last action',
    permission: 'word:app:undo',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.documents.activate',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'documents',
    operation: 'activate',
    description: 'Activate the specified document window',
    permission: 'word:documents:activate',
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.documents.close',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'documents',
    operation: 'close',
    description: 'Close the specified document',
    permission: 'word:documents:close',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        saving: {
          description: 'Whether to save changes before closing',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.documents.createRange',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'documents',
    operation: 'createRange',
    description: 'Create a text range by character positions',
    permission: 'word:documents:createRange',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        start: {
          description: 'The starting character position',
          type: 'number',
        },
        end: {
          description: 'The ending character position',
          type: 'number',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.documents.get',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'documents',
    operation: 'get',
    description: 'Get a document by name',
    permission: 'word:documents:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Document name',
          type: 'string',
        },
        name: {
          description: 'The name of the document',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id', 'name'],
    },
  },
  {
    name: 'microsoft-word.documents.list',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'documents',
    operation: 'list',
    description: 'List all documents',
    permission: 'word:documents:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.documents.print',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'documents',
    operation: 'print',
    description: 'Print the specified document',
    permission: 'word:documents:print',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.documents.save',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'documents',
    operation: 'save',
    description: 'Save the specified document',
    permission: 'word:documents:save',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'microsoft-word.documents.saveAs',
    app: 'microsoft-word',
    appBundleId: 'com.microsoft.Word',
    resource: 'documents',
    operation: 'saveAs',
    description: 'Save the document with a new name or format',
    permission: 'word:documents:save',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        fileName: {
          description: 'The file name for the document',
          type: 'string',
        },
        fileFormat: {
          description: 'The file format for saving',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['fileName'],
    },
  },
]
