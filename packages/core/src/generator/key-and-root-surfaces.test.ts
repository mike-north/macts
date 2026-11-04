/**
 * The generated surfaces of key-targeted resources and singleton roots, over
 * the Archive fixture (see `archiveManifest` for its cases).
 *
 * Every expected value is written by hand from phases/13 D7 and D10:
 *
 * - A key-targeted resource is an ordinary identified resource on every
 *   surface: its get takes its key, references to it are identity
 *   references carrying the key, and the resource table records its get.
 * - A singleton root's get takes no identifier on any surface: the contract
 *   operation's input is empty, its client methods take only call options,
 *   and its CLI command, reached at the root property, takes no positional
 *   argument. It has no list.
 * - No reference names a root yet: the resource table leaves it out, an
 *   output position holding one is left out with the `singleton-root`
 *   reason, and a required input position taking one makes its operation
 *   unavailable, with that reason in the diagnostic.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D7, D10)
 */

import { describe, expect, it } from 'vitest'
import { archiveManifest } from '../manifest/test-support/archive-key-and-root.js'
import { omittedOutputReason } from '../manifest/output-references.js'
import { generateCliPlugin } from './cli/index.js'
import { CONTRACT_MODULE_PATH, generateContract } from './contract/index.js'
import { unsatisfiableInputs } from './input-satisfiability.js'
import { generateHttpClientSdk } from './sdk/http-client.js'

/** The text of one generated file. */
function fileOf(files: readonly { path: string; content: string }[], path: string): string {
  const found = files.find((file) => file.path === path)
  if (found === undefined) throw new Error(`no generated ${path}`)
  return found.content
}

/** The first declaration in `text` that `pattern` matches. */
function declaration(text: string, pattern: RegExp): string {
  const found = pattern.exec(text)?.[0]
  if (found === undefined) throw new Error(`no declaration matching ${String(pattern)}`)
  return found
}

const manifest = archiveManifest()

describe('the shared judgments', () => {
  it('leaves out an output reference to a root, with the singleton-root reason', () => {
    expect(omittedOutputReason(manifest, 'Desk')).toBe('singleton-root')
  })

  it('keeps an output reference to a key-targeted resource', () => {
    expect(omittedOutputReason(manifest, 'Entry')).toBeUndefined()
  })

  it('judges an input reference to a root unsatisfiable', () => {
    const ring = manifest.commands['ring']
    if (ring === undefined) throw new Error('the Archive fixture has no ring')
    expect(unsatisfiableInputs(manifest, ring, undefined)).toEqual([
      {
        name: 'desk',
        resource: 'Desk',
        required: true,
        source: 'parameter',
        reason: 'singleton-root',
      },
    ])
  })
})

describe('the generated contract', () => {
  const generated = generateContract(manifest)
  const text = fileOf(generated.files, CONTRACT_MODULE_PATH)

  it('generates without errors', () => {
    expect(generated.errors).toEqual([])
  })

  it('gives the root get an empty input', () => {
    const operation = declaration(text, / {2}id: 'archive\.desks\.getDesk',[\s\S]*?\n\}/)
    expect(operation).toContain("  target: { command: 'getDesk', resource: 'Desk' },")
    expect(operation).toContain('  input: t.record({}),')
    expect(operation).toContain('"type":"object","properties":{},"additionalProperties":false')
  })

  it('gives the root client a get with call options only, and no list', () => {
    const client = declaration(text, /export interface DeskResourceClient \{[\s\S]*?\n\}/)
    expect(client).toBe(
      [
        'export interface DeskResourceClient {',
        '  /** Read the front desk. */',
        '  get(options?: CallOptions): Promise<Desk>',
        '}',
      ].join('\n')
    )
    expect(text).toContain(
      '      get: (options) => runtime.invoke(deskGetDeskOperation, {}, options),'
    )
  })

  it('gives a key-targeted get its key', () => {
    const client = declaration(text, /export interface EntryResourceClient \{[\s\S]*?\n\}/)
    expect(client).toContain('  get(location: string, options?: CallOptions): Promise<Entry>')
  })

  it('records the key-targeted resource in the resource table, and leaves the root out', () => {
    const table = declaration(text, /const resources = \{[\s\S]*?\n\} satisfies ArchiveResources/)
    expect(table).toContain("    get: 'archive.entries.getEntry',")
    expect(table).not.toContain('Desk')
  })

  it('declares a key-targeted reference field and leaves out the root reference field', () => {
    expect(declaration(text, /export interface Entry \{[\s\S]*?\n\}/)).toContain(
      "  readonly holder: ObjectReferenceVariant<Entry, string, 'Entry'> | null"
    )
    expect(declaration(text, /export interface Volume \{[\s\S]*?\n\}/)).not.toContain('desk')
  })

  it('warns about the root reference field and the unavailable operation, naming the root', () => {
    const messages = generated.diagnostics
      .filter(({ kind }) => kind === 'omitted-output' || kind === 'unavailable-operation')
      .map(({ message }) => message)
    expect(messages).toEqual([
      'archive: commands.ring.parameters.desk: archive.app.ring cannot be called and is left out of MCP tools, HTTP routes, the generated clients, CLI commands and capability discovery: the required input "desk" takes a reference to "Desk", which the app holds as one of its own properties, and a reference cannot name such an object yet.',
      'archive: resources.Volume.properties.desk: the Volume field "desk" is left out of output for now: it holds a reference to "Desk", which the app holds as one of its own properties, and a reference cannot name such an object yet (#219).',
    ])
  })

  it('marks the operation taking a root unavailable, with the reason', () => {
    const ring = declaration(text, / {2}id: 'archive\.app\.ring',[\s\S]*?\n\}/)
    expect(ring).toContain(
      'Not available: `desk` takes a reference to a desk, which the app holds as one of its own properties, and a reference cannot name such an object yet, so the operation cannot be called.'
    )
  })
})

describe('the generated HTTP client', () => {
  const sdk = generateHttpClientSdk(manifest, { packageName: '@macts/archive' })

  it('gives the root a get with no arguments', () => {
    const desk = fileOf(sdk.files, 'src/resources/desk.ts')
    expect(desk).toContain('  async get(): Promise<Desk> {')
    expect(desk).toContain(
      '    return this.#http.rpc<Desk>(`${this.#app}.${this.#resource}.getDesk`, {});'
    )
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

  it('reaches the root get at its property, with no positional argument', () => {
    const command = fileOf(plugin.files, 'src/commands/frontDesk/get.ts')
    expect(command).toContain('static override paths = [["archive", "frontDesk", "get"]];')
    expect(command).toContain("description: 'Get the front desk'")
    expect(command).toContain('const item = await client.desks.get();')
    expect(command).not.toContain('Option.String(')
    expect(command).toContain('clerk: item.clerk,')
  })

  it('generates no list for the root', () => {
    expect(plugin.files.some((file) => file.path === 'src/commands/frontDesk/list.ts')).toBe(false)
  })
})
