/**
 * Tests for what the generated contract says and declares about a positional
 * resource, over the Panes fixture: a tab has no identifier and is found by
 * its zero-based position within its window.
 *
 * Every expected text is written by hand from phases/13 D7 ("Emitted forms")
 * and D10 ("Positional resources"):
 *
 * - an output field holding a reference to a tab, read through the window
 *   that holds it, is typed `IndexSelectorReference` and built with
 *   `t.indexSelectorReference`, and its documentation says the tab is
 *   returned by its zero-based position within this window, that a tab has
 *   no id, and that the position drifts when tabs open, close or move;
 * - the tab get, and its position parameter, say that a tab is selected by
 *   its zero-based position within its window, which drifts;
 * - so do the CLI get's help, and the HTTP client's get, update and delete;
 * - a command result holding a tab is left out, since no window record
 *   carries the tab there (parent-scoped);
 * - nothing of this reaches a reference to a resource found by identifier.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D7, §D10
 * @see ../manifest/test-support/panes-positional.ts
 */

import { describe, expect, it } from 'vitest'
import { shelfManifest } from '../manifest/test-support/shelf-output-references.js'
import { PANES_MANIFEST_YAML, panesManifest } from '../manifest/test-support/panes-positional.js'
import { parseManifestYaml } from '../manifest/index.js'
import { CONTRACT_MODULE_PATH, generateContract } from './contract/index.js'
import { generateClientPackage } from './client/index.js'
import { generateConsolidatedPackages } from './orchestrate.js'

/** The text of the generated contract module of `generated`. */
function contractText(generated: ReturnType<typeof generateContract>): string {
  const found = generated.files.find((file) => file.path === CONTRACT_MODULE_PATH)
  if (found === undefined) throw new Error(`no generated ${CONTRACT_MODULE_PATH}`)
  return found.content
}

/** The first declaration in `text` that `pattern` matches. */
function declaration(text: string, pattern: RegExp): string {
  const found = pattern.exec(text)?.[0]
  if (found === undefined) throw new Error(`no declaration matching ${String(pattern)}`)
  return found
}

/** What an index-selector output field says about its tab, after its own description. */
const FIELD_NOTE =
  'Returned as an index selector: the tab at its zero-based position within this window, ' +
  'since a tab has no id. The position drifts when tabs open, close or move, so the reference ' +
  'resolves to whichever tab holds it then.'

/** What the tab get, and its position parameter, say about selecting a tab. */
const SELECTION_NOTE =
  'A tab has no id, so it is selected by its zero-based position within its window, which ' +
  'drifts when tabs open, close or move.'

/** `text` with each run of whitespace and doc-comment continuation collapsed to one space. */
function prose(text: string): string {
  return text.replace(/\s*\n\s*\*\s?/g, ' ').replace(/\s+/g, ' ')
}

describe('the generated Panes contract', () => {
  const generated = generateContract(panesManifest())
  const text = contractText(generated)

  it('generates without errors', () => {
    expect(generated.errors).toEqual([])
  })

  it('types a window’s current tab as an index selector and documents its drift', () => {
    const record = declaration(text, /export interface Window \{[\s\S]*?\n\}/)
    expect(record).toContain("  readonly currentTab: IndexSelectorReference<Tab, 'Tab'> | null")
    expect(prose(record)).toContain(`The tab shown in the window. ${FIELD_NOTE}`)
    const value = declaration(
      text,
      /const windowRecordType: ValueType<Window> = t\.record\(\{[\s\S]*?\n\}/
    )
    expect(value).toContain(
      `  currentTab: t.nullable(t.indexSelectorReference<Tab, 'Tab'>(() => panesContract, 'Tab'), { description: 'The tab shown in the window. ${FIELD_NOTE}' }),`
    )
  })

  it('documents the tab get as a selection by position, on the method and its position parameter', () => {
    const client = prose(declaration(text, /export interface TabResourceClient \{[\s\S]*?\n\}/))
    expect(client).toContain(
      `Read the tab at the zero-based position \`index\` within \`windowId\`. ${SELECTION_NOTE}`
    )
    expect(client).toContain(
      `@param index - The tab to read. ${SELECTION_NOTE} Does not accept null.`
    )
    const operation = declaration(text, /const tabGetTabOperation[\s\S]*?\n\}/)
    expect(operation).toContain(
      `    index: t.integer({ description: 'The tab to read. ${SELECTION_NOTE}' }),`
    )
  })

  it('leaves out a command result holding a tab, which no window record carries', () => {
    const front = declaration(text, / {2}id: 'panes\.app\.frontTab',[\s\S]*?\n\}/)
    expect(front).toContain('  output: t.none(),')
    expect(
      generated.diagnostics
        .filter(({ kind }) => kind === 'omitted-output')
        .map(({ message }) => message)
    ).toEqual([
      'panes: commands.frontTab.returns: the result of "frontTab" is left out of output for now: it holds a reference to "Tab", which the app finds only within its container, and this field is not read through a valid container for "Tab" (#219, #242).',
    ])
  })
})

/**
 * The Panes manifest with a tab's title writable, and a tab update and delete
 * that select the tab by its position within its window, as its get does.
 */
const PANES_WITH_TAB_UPDATE_AND_DELETE = parseManifestYaml(
  PANES_MANIFEST_YAML.replace(
    '      title:\n        access: r\n',
    '      title:\n        access: rw\n'
  ) +
    `  updateTab:
    name: update
    description: Rename a tab
    scope: resource
    resourceType: Tab
    parent: { resource: Window, parameter: windowId }
    parameters:
      - { name: windowId, type: integer, description: The window, required: true }
      - { name: index, type: integer, description: The tab, required: true }
      - { name: title, type: string, description: The new title, required: false }
  closeTab:
    name: delete
    description: Close a tab
    scope: resource
    resourceType: Tab
    parent: { resource: Window, parameter: windowId }
    parameters:
      - { name: windowId, type: integer, description: The window, required: true }
      - { name: index, type: integer, description: The tab, required: true }
`
)

/** The doc comment directly above `signature` in `text`, joined into prose. */
function docAbove(text: string, signature: string): string {
  const at = text.indexOf(signature)
  if (at === -1) throw new Error(`no ${signature}`)
  const start = text.lastIndexOf('/**', at)
  return prose(text.slice(start, at))
}

describe('the generated Panes CLI and HTTP client', () => {
  const result = generateClientPackage(PANES_WITH_TAB_UPDATE_AND_DELETE, {
    appName: 'panes',
    clientPackageName: '@macts/panes',
  })
  const files = new Map(result.files.map((file) => [file.path, file.content]))

  it('generates without errors', () => {
    expect(result.errors).toEqual([])
  })

  // The CLI get's usage description is its help text.
  it('says in the CLI get’s help that a tab is selected by its drifting zero-based position', () => {
    expect(files.get('src/cli/commands/windows/tabs/get.ts')).toContain(
      `description: "Get a tab by index. ${SELECTION_NOTE}"`
    )
  })

  it.each(['async get(', 'async update(', 'async delete('])(
    'says so on the HTTP client’s %s',
    (signature) => {
      const client = files.get('src/resources/tab.ts')
      if (client === undefined) throw new Error('no generated src/resources/tab.ts')
      expect(docAbove(client, signature)).toContain(`within a parent scope. ${SELECTION_NOTE}`)
    }
  )

  // Guards that the note stays with the positional resource: a window is
  // found by its id.
  it('says nothing about positions for a window', () => {
    expect(files.get('src/cli/commands/windows/get.ts')).not.toContain('zero-based')
    expect(files.get('src/resources/window.ts')).not.toContain('zero-based')
  })
})

describe('generation of a manifest whose positional marker does not hold', () => {
  it('refuses a positional resource that has a primary identifier, generating nothing', () => {
    // Built past the schema, as a generator's caller may hand it a manifest.
    const manifest = panesManifest()
    const tab = manifest.resources['Tab']
    if (tab === undefined) throw new Error('the Panes fixture has no Tab')
    // Targeted explicitly, so only the positional marker's rule refuses it.
    tab.identifiers = [{ property: 'index', primary: true, targeting: 'byProperty' }]

    const result = generateConsolidatedPackages(manifest, { appName: 'panes' })

    expect(result.errors).toEqual([
      'App "Panes" cannot be generated from its manifest: "Tab" is found by its primary identifier "index", so it cannot also be positional: a positional resource has no identifier. Remove positional, or the identifier.',
    ])
    expect([...result.client.files, ...result.server.files]).toEqual([])
  })
})

describe('a contract with no positional resource', () => {
  it('declares no index selector and says nothing about positions', () => {
    const text = contractText(generateContract(shelfManifest()))
    expect(text).not.toContain('indexSelectorReference')
    expect(text).not.toContain('IndexSelectorReference')
    expect(text).not.toContain('zero-based position')
  })
})
