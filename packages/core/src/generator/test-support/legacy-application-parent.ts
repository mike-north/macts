/** Legacy application metadata never turns a named application argument into resource selection. */
import { panesManifest } from '../../manifest/test-support/panes-positional.js'
import type { AppManifest } from '../../manifest/schemas/app.js'

/**
 * Different domains expose a validation failure; equal domains expose silent argument substitution.
 * @internal
 */
export function legacyApplicationParent(domain: 'integer' | 'string'): AppManifest {
  const manifest = panesManifest()
  if (domain === 'string') {
    manifest.resources['Folder'] = {
      name: 'Folder',
      plural: 'Folders',
      description: 'Identified Folder',
      properties: {
        id: {
          access: 'r',
          type: 'string',
          code: 'ID  ',
          optional: false,
          description: 'Folder identity',
        },
      },
      identifiers: [{ property: 'id', primary: true }],
    }
    manifest.hierarchy.children['folders'] = { resource: 'Folder', access: 'r' }
    manifest.commands['getFolder'] = {
      name: 'get',
      routeName: 'get',
      scope: 'resource',
      resourceType: 'Folder',
      description: 'Read a Folder',
      parameters: [{ name: 'id', type: 'string', required: true, description: 'Folder identity' }],
    }
  }
  const parameter = domain === 'integer' ? 'windowId' : 'folderId'
  manifest.commands['inspect'] = {
    name: 'inspect',
    routeName: 'inspect',
    scope: 'application',
    description:
      domain === 'integer' ? 'Inspect a selected window' : 'Inspect a requested view in a Folder',
    parent: { resource: domain === 'integer' ? 'Window' : 'Folder', parameter },
    parameters: [
      { name: 'action', type: 'string', required: true, description: 'Requested view' },
      {
        name: parameter,
        type: domain,
        required: true,
        description: domain === 'integer' ? 'Window identity' : 'Folder identity',
      },
    ],
  }
  return manifest
}
