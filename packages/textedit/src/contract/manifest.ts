/**
 * The TextEdit manifest, as data.
 *
 * `textEditContract.loadManifest()` imports this module lazily. Only the
 * Mac-side runtime calls it, and it validates the manifest before use, so the
 * value is deliberately typed `unknown`. Remote clients never load this module.
 *
 * Generated from the TextEdit manifest; do not edit.
 *
 * @packageDocumentation
 */

/** The TextEdit manifest. */
export const manifest: unknown = {
  version: '1.0',
  app: {
    bundleId: 'com.apple.TextEdit',
    name: 'TextEdit',
    displayName: 'TextEdit',
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
      name: 'TextEdit Suite',
      description: 'TextEdit document classes',
      code: '????',
      resources: ['Document'],
      commands: [],
      enums: [],
    },
  ],
  resources: {
    Document: {
      name: 'Document',
      plural: 'Documents',
      description: 'A TextEdit document',
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
        modified: {
          access: 'r',
          type: 'boolean',
          description: 'Whether the document has been modified since last save',
          code: 'imod',
          optional: false,
        },
        text: {
          access: 'rw',
          type: 'string',
          description: 'The text content of the document',
          code: 'ctxt',
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
        description: 'Open documents in TextEdit',
      },
    },
  },
  relationships: [],
  commands: {
    list: {
      name: 'list',
      description: 'List all open documents',
      scope: 'resource',
      resourceType: 'Document',
      parameters: [],
    },
    get: {
      name: 'get',
      description: 'Get a document by name',
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
    },
    create: {
      name: 'create',
      description: 'Create a new document',
      scope: 'resource',
      resourceType: 'Document',
      parameters: [
        {
          name: 'text',
          type: 'string',
          description: 'Initial text content',
          required: false,
        },
      ],
    },
  },
  permissions: {
    documents: {
      read: ['textedit:documents:list', 'textedit:documents:get'],
      create: ['textedit:documents:create'],
    },
  },
}
