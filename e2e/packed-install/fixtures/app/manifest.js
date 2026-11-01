/**
 * The widgets app manifest. Loaded lazily by the contract, because only the
 * Mac-side runtime needs it.
 */
export const manifest = {
  version: '1.0',
  app: { name: 'Widgets', bundleId: 'com.example.widgets', tccEntitlements: [] },
  resources: {
    Widget: {
      name: 'Widget',
      plural: 'Widgets',
      description: 'A widget',
      properties: {},
      identifiers: [{ property: 'id', primary: true }],
    },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    get: {
      name: 'get',
      description: 'Get one widget',
      scope: 'resource',
      resourceType: 'Widget',
      parameters: [{ name: 'id', type: 'string', description: 'Widget id', required: true }],
    },
    list: {
      name: 'list',
      description: 'List widgets',
      scope: 'resource',
      resourceType: 'Widget',
      parameters: [],
    },
  },
}
