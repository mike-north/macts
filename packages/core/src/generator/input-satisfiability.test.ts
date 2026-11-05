/**
 * Tests for the rule that generated surfaces never offer what cannot be
 * called, over the Jotter fixture with input positions that admit no value.
 *
 * A tag has no `get`, so no single reference to one can be resolved. The
 * fixture has one case of each kind (see `jotterUnsatisfiableInputsManifest`):
 * a required tag parameter (`tagNote`), an optional one (`exportNotes`
 * `tagged`), an optional one that also admits null (`untaggedOr`), a writable
 * tag property (`Note.primaryTag`), and a list of tags (`Note.relatedTags`).
 *
 * Every expected value is written by hand from the fixture and the rule:
 * optional positions that admit no value are left out of every input; an
 * operation with a required one is marked unavailable in its descriptor,
 * reported by generation, and left out of both generated clients, the CLI
 * and capability discovery.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D7 ("Resolvable targets")
 */

import { describe, expect, it } from 'vitest'
import { deriveCapabilities } from '../capabilities/registry.js'
import { resolveManifestRoutes, type AppManifest } from '../manifest/index.js'
import { generateCliPlugin } from './cli/index.js'
import { positionalOperationSource } from './sdk/test-support/operation-source.js'
import { generateHttpClientSdk } from './sdk/http-client.js'
import {
  CONTRACT_MODULE_PATH,
  collectContractDiagnostics,
  generateContract,
} from './contract/index.js'
import { jotterManifest, jotterUnsatisfiableInputsManifest } from './contract/test-fixtures.js'
import {
  isOperationAvailable,
  omittedInputs,
  resolvesSingleReferences,
  unsatisfiableInputs,
} from './input-satisfiability.js'

const manifest = jotterUnsatisfiableInputsManifest()

/** The route of the fixture with this operation id. */
function route(id: string): ReturnType<typeof resolveManifestRoutes>[number] {
  const found = resolveManifestRoutes(manifest).find((candidate) => candidate.route === id)
  if (found === undefined) throw new Error(`the fixture has no route ${id}`)
  return found
}

/** The unsatisfiable inputs of the fixture operation with this id. */
function unsatisfiableAt(id: string): ReturnType<typeof unsatisfiableInputs> {
  const { command, resourceType } = route(id)
  return unsatisfiableInputs(manifest, command, resourceType)
}

describe('unsatisfiableInputs', () => {
  it('reports a required reference to a resource without get', () => {
    expect(unsatisfiableAt('jotter.notes.tagNote')).toEqual([
      { name: 'tag', resource: 'Tag', required: true, source: 'parameter' },
    ])
  })

  it('reports an optional reference to a resource without get, but not one that admits null', () => {
    expect(unsatisfiableAt('jotter.app.exportNotes')).toEqual([
      { name: 'tagged', resource: 'Tag', required: false, source: 'parameter' },
    ])
  })

  it('reports a writable reference property in the create and update inputs, but not a list', () => {
    const primaryTag = { name: 'primaryTag', resource: 'Tag', required: false, source: 'property' }
    expect(unsatisfiableAt('jotter.notes.createNote')).toEqual([primaryTag])
    expect(unsatisfiableAt('jotter.notes.updateNote')).toEqual([primaryTag])
  })

  it('reports nothing for a reference to a resource the app can get', () => {
    // moveNote's destination is a folder, which getFolder resolves.
    expect(unsatisfiableAt('jotter.notes.moveNote')).toEqual([])
    expect(unsatisfiableAt('jotter.notes.getNote')).toEqual([])
  })

  it('reports nothing for any operation of the base Jotter fixture', () => {
    const base = jotterManifest()
    const found = resolveManifestRoutes(base).flatMap(({ command, resourceType }) =>
      unsatisfiableInputs(base, command, resourceType)
    )
    expect(found).toEqual([])
  })
})

describe('resolvesSingleReferences', () => {
  it('holds for a resource with a get command, and not for one without', () => {
    expect(resolvesSingleReferences(manifest, 'Folder')).toBe(true)
    expect(resolvesSingleReferences(manifest, 'Note')).toBe(true)
    expect(resolvesSingleReferences(manifest, 'Tag')).toBe(false)
  })
})

describe('isOperationAvailable and omittedInputs', () => {
  it('make an operation with a required unsatisfiable input unavailable', () => {
    const { command, resourceType } = route('jotter.notes.tagNote')
    expect(isOperationAvailable(manifest, command, resourceType)).toBe(false)
  })

  it('keep an operation with only optional unsatisfiable inputs available, and omit those', () => {
    const { command, resourceType } = route('jotter.app.exportNotes')
    expect(isOperationAvailable(manifest, command, resourceType)).toBe(true)
    expect([...omittedInputs(manifest, command, resourceType)]).toEqual(['tagged'])
  })
})

describe('the generated contract', () => {
  const generated = generateContract(manifest)
  const file = generated.files.find((f) => f.path === CONTRACT_MODULE_PATH)
  if (file === undefined) throw new Error('no generated contract module')
  const contract = file.content

  it('generates without errors, so every surface agrees on the positions', () => {
    expect(generated.errors).toEqual([])
  })

  it('marks the operation with a required unsatisfiable input unavailable, naming the position', () => {
    expect(contract).toContain(`  output: t.none(),
  inputJsonSchema: {"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"noteId":{"type":"string","description":"The note to tag"},"tag":{"description":"The tag to add","type":"object","properties":{"reference":{"not":{}}},"required":["reference"],"additionalProperties":false}},"required":["noteId","tag"],"additionalProperties":false},
  unavailable: {
    positions: ['tag'],
    reason: 'Not available: \`tag\` takes a reference to a tag, which the app has no operation to get, so the operation cannot be called.',
  },
}`)
  })

  it('offers no client method for it, and keeps its descriptor in the operation table', () => {
    const noteClient =
      /export interface NoteResourceClient \{[\s\S]*?\n\}/.exec(contract)?.[0] ?? ''
    const methods = noteClient.split('\n').flatMap((line) => /^ {2}(\w+)\(/.exec(line)?.[1] ?? [])
    // Every note operation except tagNote.
    expect(methods).toEqual(['list', 'get', 'create', 'update', 'delete', 'archive', 'move'])
    expect(contract).not.toContain('tagNote:')
    expect(contract).not.toContain('runtime.invoke(noteTagNoteOperation')
    expect(contract).toContain("  'jotter.notes.tagNote': noteTagNoteOperation,")
  })

  it('marks no operation that can be called unavailable', () => {
    // Only tagNote's descriptor carries the member.
    expect(contract.match(/^ {2}unavailable: \{$/gm)).toHaveLength(1)
  })

  it('leaves an optional unsatisfiable parameter out of the input type, value type, JSON Schema and method', () => {
    expect(contract).toContain(
      `const appExportNotesOperation: OperationDescriptor<{ readonly format: string; readonly untaggedOr?: ObjectReferenceData<never, 'Tag'> | null | undefined }, undefined> = {`
    )
    expect(contract).toContain(`  input: t.record({
    format: t.string({ description: 'The export format' }),
    untaggedOr: t.optional(t.nullable(t.reference<Tag, never, 'Tag'>(() => jotterContract, 'Tag', 'one'), { description: 'Export the notes with this tag, or the untagged ones when null' })),
  }),`)
    expect(contract).toContain(
      `  inputJsonSchema: {"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"format":{"type":"string","description":"The export format"},"untaggedOr":{"anyOf":[{"type":"object","properties":{"reference":{"not":{}}},"required":["reference"],"additionalProperties":false},{"type":"null"}],"description":"Export the notes with this tag, or the untagged ones when null"}},"required":["format"],"additionalProperties":false},`
    )
    expect(contract).toContain(
      `  exportNotes(format: string, untaggedOr?: ObjectReferenceData<never, 'Tag'> | null, options?: CallOptions): Promise<void>`
    )
    expect(contract).toContain(
      `exportNotes: (format, untaggedOr, options) => runtime.invoke(appExportNotesOperation, { format, untaggedOr }, options),`
    )
    expect(contract).not.toContain('Export only the notes with this tag')
  })

  it('leaves an unsatisfiable property out of the create and update inputs, and keeps a list', () => {
    expect(contract).toContain(`export interface NoteCreateInput {
  /** The new note's title */
  title: string
  /** How urgent the note is */
  priority?: Priority
  /** The note's rating */
  rating?: number
  /** Tags related to the note */
  relatedTags?: readonly ObjectReferenceData<never, 'Tag'>[]
  /** The folder to create the note in */
  folderId: Integer
  /** A file to attach */
  attachment?: FileSource
}`)
    const update = /export interface NoteUpdateInput \{[\s\S]*?\n\}/.exec(contract)?.[0] ?? ''
    expect(update).toContain("  relatedTags?: readonly ObjectReferenceData<never, 'Tag'>[]")
    expect(update).not.toContain('primaryTag')
    // The record leaves both out: a tag read from the app could not be
    // resolved, whether alone or in a list (phases/13 D7, #219). Inputs keep
    // the list, which may be empty.
    const record = /export interface Note \{[\s\S]*?\n\}/.exec(contract)?.[0] ?? ''
    expect(record).toContain('  readonly uid: string')
    expect(record).not.toContain('primaryTag')
    expect(record).not.toContain('relatedTags')
  })

  it('is reported by a generation warning naming the app, operation and position', () => {
    const diagnostics = collectContractDiagnostics(manifest).filter(
      (diagnostic) => diagnostic.kind === 'unavailable-operation'
    )
    expect(diagnostics).toEqual([
      {
        kind: 'unavailable-operation',
        app: 'jotter',
        position: 'commands.tagNote.parameters.tag',
        operation: 'jotter.notes.tagNote',
        resource: 'Tag',
        message:
          'jotter: commands.tagNote.parameters.tag: jotter.notes.tagNote cannot be called and is left out of MCP tools, HTTP routes, the generated clients, CLI commands and capability discovery: the required input "tag" takes a reference to "Tag", which the app has no operation to get.',
      },
    ])
  })
})

describe('the generated CLI', () => {
  const plugin = generateCliPlugin(manifest, {
    packageName: '@macts/jotter-cli',
    sdkPackageName: '@macts/jotter',
  })
  const fileText = (path: string): string => {
    const found = plugin.files.find((f) => f.path === path)
    if (found === undefined) throw new Error(`no generated ${path}`)
    return positionalOperationSource(found.content)
  }

  it('has no command for the unavailable operation', () => {
    expect(plugin.errors).toEqual([])
    const commandFiles = plugin.files
      .map((f) => f.path)
      .filter((path) => path.startsWith('src/commands/'))
    // Every note command except tag; the app commands.
    expect(commandFiles).toEqual([
      'src/commands/notes/list.ts',
      'src/commands/notes/create.ts',
      'src/commands/notes/get.ts',
      'src/commands/notes/archive.ts',
      'src/commands/notes/move.ts',
      'src/commands/quit.ts',
      'src/commands/word-total.ts',
      'src/commands/export-notes.ts',
    ])
    expect(fileText('src/plugin.ts')).not.toContain('TagNoteCommand')
  })

  it('has no flag or argument for an omitted parameter', () => {
    const exportNotes = fileText('src/commands/export-notes.ts')
    expect(exportNotes).not.toContain("'--tagged'")
    expect(exportNotes).toContain(
      `  untaggedOr = Option.String('--untagged-or', { required: false, description: "Export the notes with this tag, or the untagged ones when null" });`
    )
    expect(exportNotes).toContain(
      'await client.exportNotes(this.format as unknown as Parameters<typeof client.exportNotes>[0], this.untaggedOr as unknown as Parameters<typeof client.exportNotes>[1]);'
    )
  })

  it('has no flag or create field for an omitted property', () => {
    const create = fileText('src/commands/notes/create.ts')
    expect(create).not.toContain('--primary-tag')
    expect(create).not.toContain('primaryTag: this.primaryTag')
    expect(create).toContain('relatedTags: this.relatedTags,')
  })
})

describe('capability discovery', () => {
  const capabilities = deriveCapabilities(manifest)
  const named = (name: string): (typeof capabilities)[number] | undefined =>
    capabilities.find((capability) => capability.name === name)

  it('lists no capability for the unavailable operation', () => {
    expect(named('jotter.notes.tag')).toBeUndefined()
    expect(named('jotter.notes.move')).toBeDefined()
  })

  it('leaves an omitted parameter out of the input schema', () => {
    expect(named('jotter.app.exportNotes')?.inputSchema).toEqual({
      type: 'object',
      properties: {
        format: { description: 'The export format', type: 'string' },
        untaggedOr: {
          description: 'Export the notes with this tag, or the untagged ones when null',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['format'],
    })
  })

  it('leaves an omitted property out of the create and update schemas', () => {
    expect(named('jotter.notes.create')?.inputSchema.properties).not.toHaveProperty('primaryTag')
    expect(named('jotter.notes.update')?.inputSchema.properties).not.toHaveProperty('primaryTag')
    expect(named('jotter.notes.create')?.inputSchema.properties).toHaveProperty('relatedTags')
  })
})

/** The legacy HTTP client's `src/types.ts` for a manifest. */
function typesOf(source: AppManifest): string {
  const generated = generateHttpClientSdk(source, { packageName: '@macts/jotter' })
  const found = generated.files.find((f) => f.path === 'src/types.ts')
  if (found === undefined) throw new Error('no generated src/types.ts')
  return positionalOperationSource(found.content)
}

describe('the generated HTTP client', () => {
  const sdk = generateHttpClientSdk(manifest, { packageName: '@macts/jotter' })
  const fileText = (path: string): string => {
    const found = sdk.files.find((f) => f.path === path)
    if (found === undefined) throw new Error(`no generated ${path}`)
    return positionalOperationSource(found.content)
  }

  it('has no method for the unavailable operation', () => {
    const methods = fileText('src/resources/note.ts')
      .split('\n')
      .flatMap((line) => /^ {2}async (\w+)\(/.exec(line)?.[1] ?? [])
    // Every note operation except tag.
    expect(methods).toEqual(['list', 'get', 'create', 'update', 'delete', 'archive', 'move'])
  })

  it('has no parameter for an omitted parameter, and does not send it', () => {
    const client = fileText('src/client.ts')
    expect(client).toContain(
      "  async exportNotes(format: string, untaggedOr?: Parameters<import('./contract/index.js').JotterClient['exportNotes']>[1]): Promise<void> {"
    )
    expect(client).toContain(
      "    await this.#httpClient.invoke<undefined>('jotter.app.exportNotes', { format, untaggedOr });"
    )
    expect(client).not.toContain('tagged?')
  })

  it('leaves an omitted property out of the create input, and keeps a list', () => {
    const types = fileText('src/types.ts')
    expect(types).toContain("Omit<import('./contract/index.js').NoteCreateInput")
    const canonical =
      generateContract(manifest).files.find((file) => file.path === CONTRACT_MODULE_PATH)
        ?.content ?? ''
    const create = /export interface NoteCreateInput \{[\s\S]*?\n\}/.exec(canonical)?.[0] ?? ''
    expect(create).not.toContain('primaryTag')
    expect(create).toContain("  relatedTags?: readonly ObjectReferenceData<never, 'Tag'>[]")
  })
  it('leaves an omitted property out of both input types of a resource with no create command', () => {
    // Folder has no create or update command. Its `owner`, a tag, is made
    // writable, so it is an optional input field that admits no value.
    const base = jotterUnsatisfiableInputsManifest()
    const folder = base.resources['Folder']
    const owner = folder?.properties['owner']
    if (folder === undefined || owner === undefined) throw new Error('no Folder owner')
    const variant: AppManifest = {
      ...base,
      resources: {
        ...base.resources,
        Folder: {
          ...folder,
          properties: { ...folder.properties, owner: { ...owner, access: 'rw' } },
        },
      },
    }
    const types = typesOf(variant)
    expect(types).toContain("export type { FolderCreateInput } from './contract/index.js';")
    expect(types).toContain("export type { FolderUpdateInput } from './contract/index.js';")
    // The contract's input types leave it out too.
    const contract = generateContract(variant).files.find((f) => f.path === CONTRACT_MODULE_PATH)
    expect(contract?.content).toContain(`export interface FolderCreateInput {
  /** The folder's title */
  title?: string
}`)
    const update = /export interface FolderUpdateInput \{[\s\S]*?\n\}/.exec(contract?.content ?? '')
    expect(update?.[0]).not.toContain('owner')
  })

  it('keeps a required create field that admits no value out of the update input only', () => {
    // A required tag parameter makes createNote unavailable; the create input
    // keeps it, and the update input, whose fields are all optional, leaves it
    // out.
    const base = jotterUnsatisfiableInputsManifest()
    const createNote = base.commands['createNote']
    if (createNote === undefined) throw new Error('no createNote')
    const variant: AppManifest = {
      ...base,
      commands: {
        ...base.commands,
        createNote: {
          ...createNote,
          parameters: [
            ...createNote.parameters,
            {
              name: 'label',
              type: { resource: 'Tag' },
              description: 'The tag to file under',
              required: true,
            },
          ],
        },
      },
    }
    const types = typesOf(variant)
    expect(types).toContain("Omit<import('./contract/index.js').NoteCreateInput")
    const canonical =
      generateContract(variant).files.find((file) => file.path === CONTRACT_MODULE_PATH)?.content ??
      ''
    const create = /export interface NoteCreateInput \{[\s\S]*?\n\}/.exec(canonical)?.[0] ?? ''
    const update = /export interface NoteUpdateInput \{[\s\S]*?\n\}/.exec(canonical)?.[0] ?? ''
    expect(create).toContain("  label: ObjectReferenceData<never, 'Tag'>")
    expect(update).not.toContain('label')
    expect(update).not.toContain('primaryTag')
    expect(update).toContain('  title?: string')
    expect(update).toContain("  relatedTags?: readonly ObjectReferenceData<never, 'Tag'>[]")
  })
})
