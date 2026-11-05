/**
 * The generated surfaces of key-targeted resources and singleton roots, over
 * the Archive fixture (see `archiveManifest` for its cases).
 *
 * Every expected value is written by hand from phases/13 D7 and D10:
 *
 * - A key-targeted resource is an ordinary identified resource on every
 *   surface: its get takes its key, references to it are identity
 *   references carrying the key, and the resource table records its get.
 * - A singleton root is an ordinary identified resource whose identifier is
 *   its kind, a closed enumeration: its get takes a kind on every surface,
 *   its list takes nothing, its records carry their `kind`, and the resource
 *   table records it with the kind as its identifier, so a reference by kind
 *   is accepted as input. The CLI reaches it at its namespace, as it would a
 *   collection.
 * - An output position holding a reference to a root is left out with the
 *   `root-kind-unmapped` reason: no curated mapping yet says which kind the
 *   field holds.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D7, D10)
 */

import { describe, expect, it } from 'vitest'
import { archiveManifest } from '../manifest/test-support/archive-key-and-root.js'
import { omittedOutputReason } from '../manifest/output-references.js'
import { generateCliPlugin } from './cli/index.js'
import { CONTRACT_MODULE_PATH, generateContract } from './contract/index.js'
import { unsatisfiableInputs } from './input-satisfiability.js'
import { positionalOperationSource } from './sdk/test-support/operation-source.js'
import { generateHttpClientSdk } from './sdk/http-client.js'

/** The text of one generated file. */
function fileOf(files: readonly { path: string; content: string }[], path: string): string {
  const found = files.find((file) => file.path === path)
  if (found === undefined) throw new Error(`no generated ${path}`)
  return positionalOperationSource(found.content)
}

/** The first declaration in `text` that `pattern` matches. */
function declaration(text: string, pattern: RegExp): string {
  const found = pattern.exec(text)?.[0]
  if (found === undefined) throw new Error(`no declaration matching ${String(pattern)}`)
  return found
}

const manifest = archiveManifest()

describe('the shared judgments', () => {
  it('leaves out an output reference to a root, with the root-kind-unmapped reason', () => {
    expect(omittedOutputReason(manifest, 'Desk')).toBe('root-kind-unmapped')
  })

  it('keeps an output reference to a key-targeted resource', () => {
    expect(omittedOutputReason(manifest, 'Entry')).toBeUndefined()
  })

  it('judges an input reference to a root by kind satisfiable', () => {
    const ring = manifest.commands['ring']
    if (ring === undefined) throw new Error('the Archive fixture has no ring')
    expect(unsatisfiableInputs(manifest, ring, undefined)).toEqual([])
  })
})

describe('the generated contract', () => {
  const generated = generateContract(manifest)
  const text = fileOf(generated.files, CONTRACT_MODULE_PATH)

  it('generates without errors', () => {
    expect(generated.errors).toEqual([])
  })

  it('declares the kinds as a closed enumeration, and the kind on every desk record', () => {
    expect(text).toContain("export type DeskKind = 'front' | 'back'")
    expect(declaration(text, /export interface Desk \{[\s\S]*?\n\}/)).toContain(
      '  readonly kind: DeskKind'
    )
  })

  it('gives the root get a kind and the root list no input', () => {
    const get = declaration(text, / {2}id: 'archive\.desks\.getDesk',[\s\S]*?\n\}/)
    expect(get).toContain(
      "    kind: t.enumeration(deskKindMembers, { description: 'Which desk' }),"
    )
    expect(get).toContain('"properties":{"kind":{"type":"string","enum":["front","back"]')
    expect(get).toContain('"required":["kind"]')
    const list = declaration(text, / {2}id: 'archive\.desks\.listDesks',[\s\S]*?\n\}/)
    expect(list).toContain('  input: t.record({}),')
  })

  it('gives the root client a get by kind and a list', () => {
    const client = declaration(text, /export interface DeskResourceClient \{[\s\S]*?\n\}/)
    expect(client).toContain('  get(kind: DeskKind, options?: CallOptions): Promise<Desk>')
    expect(client).toContain('  list(options?: CallOptions): Promise<Page<Desk>>')
  })

  it('gives a key-targeted get its key', () => {
    const client = declaration(text, /export interface EntryResourceClient \{[\s\S]*?\n\}/)
    expect(client).toContain('  get(location: string, options?: CallOptions): Promise<Entry>')
  })

  it('records the key-targeted resource and the root, by kind, in the resource table', () => {
    const table = declaration(text, /const resources = \{[\s\S]*?\n\} satisfies ArchiveResources/)
    expect(table).toContain("    get: 'archive.entries.getEntry',")
    expect(table).toContain("    get: 'archive.desks.getDesk',")
    expect(text).toContain(
      "  Desk: ResourceDescriptor<Desk, DeskKind> & { readonly id: ValueType<DeskKind>; readonly get: 'archive.desks.getDesk'; readonly list: 'archive.desks.listDesks' }"
    )
  })

  it('takes a reference by kind as input', () => {
    expect(text).toContain(
      "  ring(desk: ObjectReferenceData<DeskKind, 'Desk'>, options?: CallOptions): Promise<void>"
    )
    const ring = declaration(text, / {2}id: 'archive\.app\.ring',[\s\S]*?\n\}/)
    expect(ring).not.toContain('Not available')
  })

  it('declares a key-targeted reference field and leaves out the root reference field', () => {
    expect(declaration(text, /export interface Entry \{[\s\S]*?\n\}/)).toContain(
      "  readonly holder: ObjectReferenceVariant<Entry, string, 'Entry'> | null"
    )
    expect(declaration(text, /export interface Volume \{[\s\S]*?\n\}/)).not.toContain('desk')
  })

  it('warns about the root reference field only, naming the missing mapping', () => {
    const messages = generated.diagnostics
      .filter(({ kind }) => kind === 'omitted-output' || kind === 'unavailable-operation')
      .map(({ message }) => message)
    expect(messages).toEqual([
      'archive: resources.Volume.properties.desk: the Volume field "desk" is left out of output for now: it holds a reference to "Desk", which the app holds as one of its own properties, and macts has no curated mapping yet from the field to the "Desk" kind it holds (#219).',
    ])
  })
})

describe('the generated HTTP client', () => {
  const sdk = generateHttpClientSdk(manifest, { packageName: '@macts/archive' })

  it('gives the root a get by kind and a list', () => {
    const desk = fileOf(sdk.files, 'src/resources/desk.ts')
    expect(desk).toContain('  async get(kind: string): Promise<Desk> {')
    expect(desk).toContain(
      '    return this.#http.invoke<Desk>(`${this.#app}.${this.#resource}.getDesk`, { kind });'
    )
    expect(desk).toContain('  async list(): Promise<Page<Desk>> {')
  })

  it('gives a key-targeted resource a get by its key', () => {
    expect(fileOf(sdk.files, 'src/resources/entry.ts')).toContain(
      '  async get(location: string): Promise<Entry> {'
    )
  })
})

describe('the generated CLI', () => {
  const plugin = generateCliPlugin(manifest, {
    packageName: '@macts/archive-cli',
    sdkPackageName: '@macts/archive',
  })

  it('gets a root by its kind, as a positional argument', () => {
    const command = fileOf(plugin.files, 'src/commands/desks/get.ts')
    expect(command).toContain('static override paths = [["archive", "desks", "get"]];')
    expect(command).toContain("Option.String({ name: 'kind', required: true })")
    expect(command).toContain('kind: item.kind,')
  })

  it('lists a root, one record per kind', () => {
    const command = fileOf(plugin.files, 'src/commands/desks/list.ts')
    expect(command).toContain('static override paths = [["archive", "desks", "list"]];')
    expect(command).toContain('const page = await client.desks.list();')
    expect(command).toContain('kind: item.kind,')
  })
})
