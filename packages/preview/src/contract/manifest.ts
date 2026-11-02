/**
 * The Preview manifest, as data.
 *
 * `previewContract.loadManifest()` imports this module lazily. Only the
 * Mac-side runtime calls it, and it validates the manifest before use, so the
 * value is deliberately typed `unknown`. Remote clients never load this module.
 *
 * Generated from the Preview manifest; do not edit.
 *
 * @packageDocumentation
 */

/** The Preview manifest. */
export const manifest: unknown = {
  version: '1.0',
  app: {
    bundleId: 'com.apple.Preview',
    name: 'Preview',
    displayName: 'Preview',
    tccEntitlements: ['automation'],
    distributionModel: 'system',
  },
  suites: [
    {
      name: 'Preview Suite',
      description: 'Preview application classes',
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
      description: 'A Preview document',
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
        access: 'r',
        description: 'Open documents in Preview',
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
  },
  permissions: {
    documents: {
      read: ['preview:documents:list', 'preview:documents:get'],
    },
  },
}
