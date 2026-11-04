/**
 * The Script Editor manifest, as data.
 *
 * `scriptEditorContract.loadManifest()` imports this module lazily. Only the
 * Mac-side runtime calls it, and it validates the manifest before use, so the
 * value is deliberately typed `unknown`. Remote clients never load this module.
 *
 * Generated from the Script Editor manifest; do not edit.
 *
 * @packageDocumentation
 */

/** The Script Editor manifest. */
export const manifest: unknown = {
  version: '1.0',
  app: {
    bundleId: 'com.apple.ScriptEditor2',
    name: 'Script Editor',
    displayName: 'Script Editor',
    tccEntitlements: ['automation'],
    distributionModel: 'system',
  },
  suites: [
    {
      name: 'Script Editor Suite',
      description: 'Script Editor specific classes',
      code: 'ToyS',
      resources: ['Document'],
      commands: [],
      enums: [],
    },
  ],
  resources: {
    Document: {
      name: 'Document',
      plural: 'Documents',
      description: 'A Script Editor document',
      code: 'docu',
      properties: {
        name: {
          access: 'rw',
          type: 'string',
          description: 'The name of the document',
          code: 'pnam',
          optional: false,
        },
        path: {
          access: 'r',
          type: 'string',
          description: 'The file path of the document',
          code: 'ppth',
          optional: true,
        },
        contents: {
          access: 'rw',
          type: 'string',
          description: 'The source code of the script',
          code: 'pcnt',
          optional: false,
        },
        language: {
          access: 'rw',
          type: 'string',
          description: 'The scripting language (AppleScript or JavaScript)',
          code: 'slng',
          optional: false,
        },
        modified: {
          access: 'r',
          type: 'boolean',
          description: 'Whether the document has been modified since last save',
          code: 'imod',
          optional: false,
        },
      },
      identifiers: [
        {
          property: 'name',
          primary: true,
          targeting: 'byProperty',
        },
      ],
    },
  },
  enums: {},
  hierarchy: {
    children: {
      documents: {
        resource: 'Document',
        access: 'rw',
        description: 'Open script documents',
      },
    },
  },
  relationships: [],
  commands: {
    list: {
      name: 'list',
      description: 'List all open script documents',
      scope: 'resource',
      resourceType: 'Document',
      parameters: [],
      code: 'core',
    },
    get: {
      name: 'get',
      description: 'Get a script document by name',
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
    },
    create: {
      name: 'create',
      description: 'Create a new script document',
      scope: 'resource',
      resourceType: 'Document',
      parameters: [
        {
          name: 'contents',
          type: 'string',
          description: 'Initial script contents',
          required: false,
        },
      ],
      code: 'crel',
    },
  },
  permissions: {
    documents: {
      read: ['script-editor:documents:list', 'script-editor:documents:get'],
      create: ['script-editor:documents:create'],
    },
  },
  extraction: {
    sourceFile: 'source.sdef',
    confidence: {
      overall: 0.9,
      fields: {
        resources: 0.95,
        enums: 1,
        hierarchy: 0.9,
        commands: 0.85,
      },
    },
    openQuestions: [],
  },
}
