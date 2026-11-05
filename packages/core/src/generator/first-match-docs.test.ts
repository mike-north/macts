/**
 * Tests that the generated docs of a get, update and delete say what happens
 * when several items share the value they are looked up by.
 *
 * An item whose primary identifier is matched with `byProperty` is the first
 * match of `whose` in the app's element order (phases/13 D4, reference
 * conversion; D10, identifier targeting). When the identifier makes no
 * uniqueness claim, several items can share the value, and the operation
 * acts on the first of them rather than failing as ambiguous. The HTTP
 * client's get, update and delete docs, the contract client's, and the CLI
 * get's description say so. Nothing is said for an identifier claimed unique,
 * or for one looked up by the app's id or key specifier, which does not
 * match on a property.
 *
 * The expected sentence is written by hand from that rule.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10
 */

import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadManifest, parseManifestYaml } from '../manifest/loader.js'
import { generateClientPackage } from './client/index.js'
import { generateConsolidatedPackages } from './orchestrate.js'

/** The sentence for a document matched on its name, written by hand. */
const DOCUMENT_NOTE =
  "When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous."

/** The words every such sentence carries, whatever the resource and property. */
const FIRST_MATCH = "the first match in the app's order"

/** A resource with a writable name, a get, an update and a delete, and `identifier`. */
function resourceYaml(name: string, plural: string, identifier: string): string {
  return `  ${name}:
    name: ${name}
    plural: ${plural}
    description: A ${name.toLowerCase()}
    properties:
      name: { access: rw, type: string, description: Its name, code: pnam }
      id: { access: r, type: string, description: Its id, code: 'ID  ' }
      path: { access: r, type: string, description: Its path, code: ppth }
    identifiers:
${identifier}
`
}

/** The get, update and delete of `name`, by the parameter `parameter`. */
function commandsYaml(name: string, parameter: string): string {
  return ['get', 'update', 'delete']
    .map(
      (verb) => `  ${verb}${name}:
    name: ${verb}
    routeName: ${verb}
    description: ${verb} a ${name.toLowerCase()}
    scope: resource
    resourceType: ${name}
    parameters: [{ name: ${parameter}, type: string, description: Which one, required: true }]
`
    )
    .join('')
}

const MANIFEST = parseManifestYaml(`
version: '1.0'
app: { name: Notebook, bundleId: com.example.notebook, tccEntitlements: [] }
suites: []
enums: {}
relationships: []
resources:
${resourceYaml('Document', 'Documents', '      - { property: name, primary: true, targeting: byProperty }')}
${resourceYaml(
  'Ledger',
  'Ledgers',
  `      - property: name
        primary: true
        targeting: byProperty
        unique: true
        evidence: { unique: { source: curated, note: 'Notebook refuses a second ledger with a taken name.' } }`
)}
${resourceYaml('Item', 'Items', '      - { property: id, primary: true }')}
${resourceYaml('File', 'Files', '      - { property: path, primary: true, targeting: byKey }')}
hierarchy:
  children:
    documents: { resource: Document, access: rw }
    ledgers: { resource: Ledger, access: rw }
    items: { resource: Item, access: rw }
    files: { resource: File, access: rw }
commands:
${commandsYaml('Document', 'name')}${commandsYaml('Ledger', 'name')}${commandsYaml('Item', 'id')}${commandsYaml('File', 'path')}`)

/** The generated package's files, by path. */
function generatedFiles(): Map<string, string> {
  const result = generateClientPackage(MANIFEST, {
    appName: 'notebook',
    clientPackageName: '@macts/notebook',
  })
  expect(result.errors).toEqual([])
  return new Map(result.files.map((file) => [file.path, file.content]))
}

/** A file's text with doc comment line breaks and markers joined into prose. */
function prose(content: string | undefined): string {
  return (content ?? '').replace(/\n\s*\*(?!\/) ?/g, ' ')
}

/** How many times `text` occurs in `content`. */
function occurrences(content: string, text: string): number {
  return content.split(text).length - 1
}

describe('the first-match note on a byProperty identifier with no uniqueness claim', () => {
  const files = generatedFiles()

  // Guards that an HTTP client user is told which document a shared name
  // reaches, on each of the get, update and delete.
  it('is on the HTTP client get, update and delete', () => {
    expect(occurrences(prose(files.get('src/resources/document.ts')), DOCUMENT_NOTE)).toBe(3)
  })

  // Guards the contract client, the typed SDK surface, the same way.
  it('is on the contract client get, update and delete', () => {
    expect(occurrences(prose(files.get('src/contract/index.ts')), DOCUMENT_NOTE)).toBe(3)
  })

  // Guards the CLI get's description, which the generator writes.
  it('is in the CLI get description', () => {
    expect(files.get('src/cli/commands/documents/get.ts')).toContain(
      `description: "Get a document by name. ${DOCUMENT_NOTE}"`
    )
  })
})

describe('no first-match note', () => {
  const files = generatedFiles()

  // Guards that the note is only for a lookup that can reach several items:
  // a name claimed unique, the app's id specifier and its key specifier say
  // nothing about a first match.
  it.each([
    ['a byProperty name claimed unique', 'ledger', 'ledgers'],
    ['the default byId on the dictionary id', 'item', 'items'],
    ['a byKey path', 'file', 'files'],
  ])('for %s', (_label, file, plural) => {
    expect(prose(files.get(`src/resources/${file}.ts`))).not.toContain(FIRST_MATCH)
    expect(files.get(`src/cli/commands/${plural}/get.ts`)).not.toContain(FIRST_MATCH)
  })

  // Guards the contract, which holds every resource: the three notes there
  // are the document's.
  it('in the contract, beyond the document', () => {
    expect(occurrences(prose(files.get('src/contract/index.ts')), FIRST_MATCH)).toBe(3)
  })
})

describe('the first-match note after a description with no full stop', () => {
  // Xcode's `build` is described as `Invoke the "build" scheme action`, with
  // no full stop, and acts on a workspace document matched on its name. The
  // note must follow it as a new sentence, not run on from it (#287).
  const BUILD_DOC =
    'Invoke the "build" scheme action. When several workspace documents share the same name, the first match in the app\'s order is used, and the operation does not fail as ambiguous.'

  it('starts a new sentence in the HTTP client, contract client and CLI docs', async () => {
    const manifest = await loadManifest(resolve(process.cwd(), '../../manifests/xcode/app.yaml'))
    const result = generateConsolidatedPackages(manifest, { appName: 'xcode' })
    expect(result.errors).toEqual([])
    const files = new Map(
      [...result.client.files, ...result.server.files].map((file) => [file.path, file.content])
    )
    // The HTTP client sets each sentence on its own doc line.
    expect(files.get('src/resources/workspacedocument.ts')).toContain(
      `   * ${BUILD_DOC.replace('action. When', 'action.\n   * When')}\n   */\n  async build(`
    )
    // The contract client wraps its doc; joined back, it is one paragraph.
    const contract = (files.get('src/contract/index.ts') ?? '').replace(/\n\s*\* /g, ' ')
    expect(contract).toContain(BUILD_DOC)
    expect(files.get('src/cli/commands/workspaceDocuments/build.ts')).toContain(
      `description: ${JSON.stringify(BUILD_DOC)},`
    )
  })
})
