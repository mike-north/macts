/**
 * Tests that the generated docs of an operation scoped under a parent say
 * what happens when several parents share the value the parent is looked up
 * by.
 *
 * A resource-scoped list, get, create, update or delete that records a
 * parent (`command.parent`), and any other resource command, which selects
 * its item as a get does (#287), looks the parent up by the parent
 * resource's identifier targeting (phases/13 D10, command parents and
 * identifier targeting). When that targeting is `byProperty` and the identifier makes
 * no uniqueness claim, several parents can share the value, and the
 * operation uses the first of them in the app's element order. The HTTP
 * client's docs, the contract client's, and the CLI list, get and create
 * descriptions say so, beside the item's own first-match sentence when that
 * applies too. Nothing is said for a parent claimed unique, for a parent
 * looked up by the app's id or key specifier, or for an operation with no
 * parent.
 *
 * The expected sentences are written by hand from that rule.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10
 */

import { describe, expect, it } from 'vitest'
import { parseManifestYaml } from '../manifest/loader.js'
import { generateClientPackage } from './client/index.js'

/** The sentence for an operation under a shelf matched on its name, written by hand. */
const SHELF_PARENT_NOTE =
  "When several shelves share the same name, the first match in the app's order is used as the shelf."

/** The item sentence for a book matched on its name, written by hand. */
const BOOK_ITEM_NOTE =
  "When several books share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous."

/** The words every parent sentence carries, whatever the parent and property. */
const USED_AS = "the first match in the app's order is used as the"

/** A resource with a writable name, a dictionary id and a path, and `identifier`. */
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

/**
 * The list, get, create, update and delete of `name`. With a `parent`, each
 * is scoped under it by the parameter `parentParameter`; the item commands
 * select their item by `itemParameter`.
 */
function commandsYaml(
  name: string,
  itemParameter: string,
  parent?: { resource: string; parameter: string }
): string {
  const parentLines =
    parent === undefined
      ? ''
      : `    parent: { resource: ${parent.resource}, parameter: ${parent.parameter} }\n`
  const parentParameter =
    parent === undefined
      ? []
      : [`{ name: ${parent.parameter}, type: string, description: Which parent, required: true }`]
  const itemParameters = [
    ...parentParameter,
    `{ name: ${itemParameter}, type: string, description: Which one, required: true }`,
  ]
  const parametersFor: Record<string, readonly string[]> = {
    list: parentParameter,
    get: itemParameters,
    create: parentParameter,
    update: itemParameters,
    delete: itemParameters,
  }
  return Object.entries(parametersFor)
    .map(
      ([verb, parameters]) => `  ${verb}${name}:
    name: ${verb}
    routeName: ${verb}
    description: ${verb} a ${name.toLowerCase()}
    scope: resource
    resourceType: ${name}
${parentLines}    parameters: [${parameters.join(', ')}]
`
    )
    .join('')
}

const UNIQUE_NAME = `      - property: name
        primary: true
        targeting: byProperty
        unique: true
        evidence: { unique: { source: curated, note: 'Library refuses a second vault with a taken name.' } }`

const MANIFEST_YAML = `
version: '1.0'
app: { name: Library, bundleId: com.example.library, tccEntitlements: [] }
suites: []
enums: {}
relationships: []
resources:
${resourceYaml('Shelf', 'Shelves', '      - { property: name, primary: true, targeting: byProperty }')}
${resourceYaml('Book', 'Books', '      - { property: name, primary: true, targeting: byProperty }')}
${resourceYaml('Vault', 'Vaults', UNIQUE_NAME)}
${resourceYaml('Coin', 'Coins', '      - { property: id, primary: true }')}
${resourceYaml('Box', 'Boxes', '      - { property: id, primary: true }')}
${resourceYaml('Card', 'Cards', '      - { property: id, primary: true }')}
${resourceYaml('Drawer', 'Drawers', '      - { property: path, primary: true, targeting: byKey }')}
${resourceYaml('Pen', 'Pens', '      - { property: id, primary: true }')}
hierarchy:
  children:
    shelves:
      resource: Shelf
      access: rw
      children:
        books: { resource: Book, access: rw }
    vaults:
      resource: Vault
      access: rw
      children:
        coins: { resource: Coin, access: rw }
    boxes:
      resource: Box
      access: rw
      children:
        cards: { resource: Card, access: rw }
    drawers:
      resource: Drawer
      access: rw
      children:
        pens: { resource: Pen, access: rw }
commands:
${commandsYaml('Shelf', 'name')}${commandsYaml('Book', 'name', { resource: 'Shelf', parameter: 'shelf' })}${commandsYaml('Vault', 'name')}${commandsYaml('Coin', 'id', { resource: 'Vault', parameter: 'vault' })}${commandsYaml('Box', 'id')}${commandsYaml('Card', 'id', { resource: 'Box', parameter: 'box' })}${commandsYaml('Drawer', 'path')}${commandsYaml('Pen', 'id', { resource: 'Drawer', parameter: 'drawer' })}`

const MANIFEST = parseManifestYaml(MANIFEST_YAML)

/** The generated package's files, by path. */
function generatedFiles(manifest = MANIFEST): Map<string, string> {
  const result = generateClientPackage(manifest, {
    appName: 'library',
    clientPackageName: '@macts/library',
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

/** The CLI command file of `verb` on the books under a shelf. */
function bookCli(files: Map<string, string>, verb: string): string | undefined {
  return files.get(`src/cli/commands/shelves/books/${verb}.ts`)
}

describe('the first-match note on a parent matched byProperty with no uniqueness claim', () => {
  const files = generatedFiles()

  // Guards that an HTTP client user is told which shelf a shared name
  // reaches, on each operation that looks the shelf up.
  it('is on the HTTP client list, get, create, update and delete', () => {
    expect(occurrences(prose(files.get('src/resources/book.ts')), SHELF_PARENT_NOTE)).toBe(5)
  })

  // Guards the contract client, the typed SDK surface, the same way.
  it('is on the contract client list, get, create, update and delete', () => {
    expect(occurrences(prose(files.get('src/contract/index.ts')), SHELF_PARENT_NOTE)).toBe(5)
  })

  // Guards that the item sentence and the parent sentence both appear when
  // both lookups can reach several items, the item's first.
  it('follows the item note when the item is matched the same way', () => {
    const http = prose(files.get('src/resources/book.ts'))
    expect(occurrences(http, `${BOOK_ITEM_NOTE} ${SHELF_PARENT_NOTE}`)).toBe(3)
    const contract = prose(files.get('src/contract/index.ts'))
    expect(occurrences(contract, `${BOOK_ITEM_NOTE} ${SHELF_PARENT_NOTE}`)).toBe(3)
  })

  // Guards the CLI descriptions the generator writes for operations under a
  // parent: list, get and create.
  it('is in the CLI list, get and create descriptions', () => {
    expect(bookCli(files, 'list')).toContain(`description: "List books. ${SHELF_PARENT_NOTE}"`)
    expect(bookCli(files, 'get')).toContain(
      `description: "Get a book by name. ${BOOK_ITEM_NOTE} ${SHELF_PARENT_NOTE}"`
    )
    expect(bookCli(files, 'create')).toContain(
      `description: "Create a new book. ${SHELF_PARENT_NOTE}"`
    )
  })
})

describe('no parent first-match note', () => {
  const files = generatedFiles()

  // Guards that the note is only for a parent lookup that can reach several
  // parents: a name claimed unique, the app's id specifier and its key
  // specifier say nothing about a first match.
  it.each([
    ['a byProperty name claimed unique', 'coin', 'vaults/coins'],
    ['the default byId on the dictionary id', 'card', 'boxes/cards'],
    ['a byKey path', 'pen', 'drawers/pens'],
  ])('for a parent with %s', (_label, file, cliPath) => {
    expect(prose(files.get(`src/resources/${file}.ts`))).not.toContain(USED_AS)
    for (const verb of ['list', 'get', 'create']) {
      expect(files.get(`src/cli/commands/${cliPath}/${verb}.ts`)).not.toContain(USED_AS)
    }
  })

  // Guards that an operation with no parent gets no parent sentence, even on
  // a resource matched byProperty: the shelf's own operations carry only the
  // item sentence.
  it('for an operation with no parent', () => {
    const shelf = prose(files.get('src/resources/shelf.ts'))
    expect(shelf).toContain(
      "When several shelves share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous."
    )
    expect(shelf).not.toContain(USED_AS)
    for (const verb of ['list', 'get', 'create']) {
      expect(files.get(`src/cli/commands/shelves/${verb}.ts`)).not.toContain(USED_AS)
    }
  })

  // Guards the contract, which holds every resource: the five parent notes
  // there are the books'.
  it('in the contract, beyond the books', () => {
    expect(occurrences(prose(files.get('src/contract/index.ts')), USED_AS)).toBe(5)
  })
})

describe('the first-match notes on a resource command under a parent', () => {
  // A book's `dust`, a resource command, selects its book within its shelf
  // as the book's get does, so it reaches a shared shelf name and a shared
  // book name alike, and its docs carry both sentences, the item's first.
  const files = generatedFiles(
    parseManifestYaml(`${MANIFEST_YAML}  dustBook:
    name: dust
    description: Dust a book.
    scope: resource
    resourceType: Book
    parent: { resource: Shelf, parameter: shelf }
    parameters:
      - { name: shelf, type: string, description: Which shelf, required: true }
      - { name: name, type: string, description: Which book, required: true }
`)
  )
  const DUST_DOC = `Dust a book. ${BOOK_ITEM_NOTE} ${SHELF_PARENT_NOTE}`

  it('are on the HTTP client and contract client methods', () => {
    expect(prose(files.get('src/resources/book.ts'))).toContain(DUST_DOC)
    expect(prose(files.get('src/contract/index.ts'))).toContain(DUST_DOC)
  })

  it('are in the CLI description', () => {
    expect(bookCli(files, 'dust')).toContain(`description: "${DUST_DOC}"`)
  })
})
