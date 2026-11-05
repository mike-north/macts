/**
 * Unit tests for the generated app contract module.
 *
 * These pin the emitted text for the Jotter fixture (presence, read-only
 * fields, update inputs, descriptors, the resource table), the contract's
 * dependency boundary, naming, generation errors, and, over every real app
 * manifest, the diagnostics for unresolvable types and the manifest data
 * module. Expected text is written by hand from the fixture, the value
 * library's constructors, and the design record.
 *
 * The compiled behavior of the same contract is covered by
 * `integration.test.ts`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D1 (generated packages depend only on @macts/contracts)
 * @see phases/13-sdk-value-and-execution-contracts.md §D2 (descriptors, AppContract)
 * @see phases/13-sdk-value-and-execution-contracts.md §A4 (presence, nullability, and updates)
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (native missing value; evidence-based nullability)
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  AppManifestSchema,
  type AppManifest,
  type Identifier,
  type Resource,
} from '../../manifest/index.js'
import { loadManifest } from '../../manifest/loader.js'
import type {
  CuratedNullabilityEvidence,
  ProbeNullabilityEvidence,
} from '../../manifest/schemas/evidence.js'
import {
  CONTRACT_MANIFEST_MODULE_PATH,
  CONTRACT_MODULE_PATH,
  collectContractDiagnostics,
  contractNames,
  contractResourcePlans,
  generateContract,
  readNullabilityNote,
  type GeneratedContract,
} from './index.js'
import { RANGE_READ_SUPPORTED } from '../../manifest/test-support/unique-claim.js'
import { archiveManifest } from '../../manifest/test-support/archive-key-and-root.js'
import {
  isNameKeyed,
  isValidContainer,
  omittedOutputReason,
} from '../../manifest/output-references.js'
import { jotterManifest } from './test-fixtures.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

function moduleText(generated: GeneratedContract, path: string): string {
  const file = generated.files.find((f) => f.path === path)
  if (!file) throw new Error(`no generated ${path}`)
  return file.content
}

/** Every module specifier the text imports, statically or dynamically. */
function importSpecifiers(text: string): string[] {
  const specifiers = [
    ...text.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s+'([^']+)'/gm),
    ...text.matchAll(/^\s*import\s+'([^']+)'/gm),
    ...text.matchAll(/\bimport\(\s*'([^']+)'\s*\)/g),
    ...text.matchAll(/\brequire\(\s*'([^']+)'\s*\)/g),
  ].map((match) => match[1] ?? '')
  return [...new Set(specifiers)].sort()
}

const jotter = generateContract(jotterManifest())
const contract = moduleText(jotter, CONTRACT_MODULE_PATH)

describe('generateContract: files', () => {
  it('emits the contract and the manifest data modules under src/contract/', () => {
    expect(jotter.files.map((f) => f.path)).toEqual([
      'src/contract/index.ts',
      'src/contract/manifest.ts',
    ])
    expect(jotter.errors).toEqual([])
  })

  it('exports the contract as <camelApp>Contract typed AppContract<<PascalApp>Client, <PascalApp>Resources>', () => {
    expect(contract).toContain(
      'export const jotterContract: AppContract<JotterClient, JotterResources> = {'
    )
    expect(contract).toContain("  app: 'jotter',")
    expect(contract).toContain(
      'export interface JotterClient extends ClientBrand<JotterResources> {'
    )
  })

  it('brands the client interface with the resource table, type-only', () => {
    // A value annotated with the interface carries the table, so it binds
    // references; the brand is a type, so the bound client gains no member.
    expect(contract).toMatch(/^import \{[^}]*\btype ClientBrand\b[^}]*\} from '@macts\/contracts'/m)
  })

  it('loads the manifest lazily from the data module, typed unknown', () => {
    expect(contract).toContain(
      "loadManifest: async () => (await import('./manifest.js')).manifest,"
    )
    expect(moduleText(jotter, CONTRACT_MANIFEST_MODULE_PATH)).toContain(
      'export const manifest: unknown = {'
    )
  })
})

describe('generateContract: dependency boundary', () => {
  it('imports only @macts/contracts, and the manifest only by dynamic import', () => {
    expect(importSpecifiers(contract)).toEqual(['./manifest.js', '@macts/contracts'])
    expect(contract).toMatch(/^import \{\n {2}ValueTypes,\n[\s\S]*?\n\} from '@macts\/contracts'$/m)
    // The manifest module is reached only through loadManifest.
    expect(contract.match(/'\.\/manifest\.js'/g)).toHaveLength(1)
  })

  it('has no imports in the manifest data module', () => {
    expect(importSpecifiers(moduleText(jotter, CONTRACT_MANIFEST_MODULE_PATH))).toEqual([])
  })

  it('never reaches node built-ins, @macts/core, @macts/runtime, or the legacy client files', () => {
    for (const file of jotter.files) {
      // Doc comments may name application packages (a factory from
      // @macts/sdk); only the module's code matters here.
      const code = file.content.replace(/\/\*[\s\S]*?\*\//g, '')
      expect(code).not.toMatch(/from 'node:|import\('node:/)
      expect(code).not.toMatch(/'@macts\/(core|runtime|sdk|api)/)
      expect(code).not.toMatch(/'\.\.\/(client|types|index|cli)/)
    }
  })

  it('has no code example in its header', () => {
    // No client factory exists in @macts/sdk yet, so any example would show
    // code that does not compile. The header names the factory in prose only.
    expect(contract).not.toContain('@example')
    expect(contract).toContain(
      'A client is created from it by a client\n * factory from `@macts/sdk`'
    )
  })

  it('uses no platform automation terms in its own text', () => {
    for (const file of jotter.files) {
      expect(file.content).not.toMatch(/applescript|jxa|osascript|apple event/i)
    }
  })
})

describe('generateContract: records', () => {
  it('marks read-only properties readonly, optional properties optional, and documents nullability', () => {
    // Read fields are nullable unless there is evidence otherwise (D10): the
    // identifier by structure, `title` by curation, `wordCount` by a probe
    // with no empty value in 40 reads.
    expect(contract).toContain(`export interface Note {
  /**
   * The note's unique identifier.
   * Never null: the primary identifier.
   */
  readonly uid: string
  /**
   * The note's title.
   * Never null: Jotter refuses to save a note without a title.
   */
  title: string
  /**
   * How urgent the note is.
   * Nullable. No evidence that the app always sets it.
   */
  priority?: Priority | null
  /**
   * The folder holding the note.
   * Nullable. No evidence that the app always sets it.
   */
  readonly folder: ObjectReferenceVariant<Folder, Integer, 'Folder'> | null
  /**
   * The note's attachment.
   * Nullable. No evidence that the app always sets it.
   */
  readonly attachment?: FileValue | null
  /**
   * When the note was created.
   * Nullable. Observed missing in 3 of 40 items (Jotter 2.1, macOS 27.2, 2026-10-31).
   */
  readonly created: Date | null
  /**
   * How many words the note has.
   * Never null: observed in all 40 items (Jotter 2.1, macOS 27.2, 2026-10-31).
   */
  readonly wordCount: Integer
  /**
   * The note's rating.
   * Nullable. No evidence that the app always sets it.
   */
  rating?: number | null
}`)
  })

  it('types a nullable list and a dictionary-declared nullable field', () => {
    expect(contract).toContain(`  /**
   * The notes in the folder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly notes: readonly ObjectReferenceVariant<Note, string, 'Note'>[] | null
`)
    expect(contract).toContain(`  /**
   * The folder's color.
   * Nullable: declared by the app's scripting dictionary.
   */
  readonly color: string | null
`)
  })

  it('composes each record from the property value types: nullable inside optional', () => {
    expect(contract).toContain('const noteRecordType: ValueType<Note> = t.record({')
    expect(contract).toContain(
      "  uid: t.string({ description: 'The note\\'s unique identifier' }),"
    )
    expect(contract).toContain("  title: t.string({ description: 'The note\\'s title' }),")
    expect(contract).toContain(
      "  priority: t.optional(t.nullable(t.enumeration(priorityMembers), { description: 'How urgent the note is' })),"
    )
    expect(contract).toContain(
      "  folder: t.nullable(t.reference<Folder, Integer, 'Folder'>(() => jotterContract, 'Folder', 'one'), { description: 'The folder holding the note' }),"
    )
    expect(contract).toContain(
      "  notes: t.nullable(t.array(t.reference<Note, string, 'Note'>(() => jotterContract, 'Note', 'one')), { description: 'The notes in the folder' }),"
    )
    expect(contract).toContain(
      "  attachment: t.optional(t.nullable(t.file(), { description: 'The note\\'s attachment' })),"
    )
    expect(contract).toContain(
      "  created: t.nullable(t.date(), { description: 'When the note was created' }),"
    )
    expect(contract).toContain(
      "  wordCount: t.integer({ description: 'How many words the note has' }),"
    )
    expect(contract).toContain(
      "  color: t.nullable(t.string(), { description: 'The folder\\'s color' }),"
    )
    expect(contract).toContain("}, { description: 'A note' })")
  })

  it('declares enums as string-literal unions with a member tuple for their value type', () => {
    expect(contract).toContain("export type Priority = 'low' | 'high'\n")
    expect(contract).toContain("const priorityMembers = ['low', 'high'] as const\n")
  })
})

describe('generateContract: inputs', () => {
  it('types a reference parameter by its data form, with a literal resource key', () => {
    // phases/13 §D7: an input position takes the data form, so a caller can
    // build either form or pass a reference it received, of `Folder` only.
    expect(contract).toContain(
      "const noteMoveNoteOperation: OperationDescriptor<{ readonly noteId: string; readonly destination: ObjectReferenceData<Integer, 'Folder'> }, undefined> = {"
    )
    expect(contract).toContain(
      "  move(noteId: string, destination: ObjectReferenceData<Integer, 'Folder'>, options?: CallOptions): Promise<void>"
    )
    expect(contract).toContain(
      "    destination: t.reference<Folder, Integer, 'Folder'>(() => jotterContract, 'Folder', 'one', { description: 'The folder to move the note to' }),"
    )
    expect(contract).toContain('  type ObjectReferenceData,\n')
  })

  it('builds the create input from writable properties then create parameters, never nullable', () => {
    // title (rw), priority (rw), rating (rw), then createNote's folderId
    // (required), title (required; overrides the property), attachment (a file
    // source, optional). Create inputs are never nullable in this slice
    // (phases/13 §D10): a property's `nullable` claim describes what reads
    // return, not what a create accepts, and no claim kind for create inputs
    // exists yet. So even `priority`, nullable on read and resettable on
    // update, takes no null here.
    expect(contract).toContain(`export interface NoteCreateInput {
  /** The new note's title */
  title: string
  /** How urgent the note is */
  priority?: Priority
  /** The note's rating */
  rating?: number
  /** The folder to create the note in */
  folderId: Integer
  /** A file to attach */
  attachment?: FileSource
}`)
    expect(contract).toContain(
      "  priority: t.optional(t.enumeration(priorityMembers, { description: 'How urgent the note is' })),"
    )
  })

  it('makes every update field optional, nullable only where a reset is verified', () => {
    expect(contract).toContain(`export interface NoteUpdateInput {
  /**
   * The new note's title.
   * Cannot be reset: null is rejected.
   */
  title?: string
  /**
   * How urgent the note is.
   * Set to null to reset: jotter-reset.test.ts clears the priority of a scratch note (Jotter 2.1).
   */
  priority?: Priority | null
  /**
   * The note's rating.
   * Cannot be reset: null is rejected.
   */
  rating?: number
  /**
   * A file to attach.
   * Cannot be reset: null is rejected.
   */
  attachment?: FileSource
}`)
  })

  it('composes a resettable update field as optional of nullable', () => {
    expect(contract).toMatch(
      /const noteUpdateNoteOperation: OperationDescriptor<\{ readonly folderId: Integer; readonly noteId: string; readonly title\?: string \| undefined; readonly priority\?: Priority \| null \| undefined; readonly rating\?: number \| undefined; readonly attachment\?: FileSource \| undefined \}, Note> = \{/
    )
    expect(contract).toContain(
      "    priority: t.optional(t.nullable(t.enumeration(priorityMembers), { description: 'How urgent the note is' })),"
    )
    expect(contract).toContain(
      "    rating: t.optional(t.double({ description: 'The note\\'s rating' })),"
    )
  })

  it('declares an input with no fields as an empty record', () => {
    expect(contract).toContain('export type TagCreateInput = Record<string, never>\n')
  })
})

describe('generateContract: parameters', () => {
  it('accepts null only at a parameter that claims it, composed inside optional', () => {
    expect(contract).toContain(
      'const noteArchiveOperation: OperationDescriptor<{ readonly noteId: string; readonly until?: Date | null | undefined }, undefined> = {'
    )
    expect(contract).toContain("    noteId: t.string({ description: 'The note to archive' }),")
    expect(contract).toContain(
      "    until: t.optional(t.nullable(t.date(), { description: 'When to unarchive it' })),"
    )
  })

  it('documents each parameter with its nullability', () => {
    expect(contract).toContain(`  /**
   * Archive a note
   *
   * @param noteId - The note to archive. Does not accept null.
   * @param until - When to unarchive it. Accepts null: null keeps the note archived indefinitely.
   */
  archive(noteId: string, until?: Date | null, options?: CallOptions): Promise<void>
`)
    expect(contract).toContain(`  /**
   * Read the note identified by \`noteId\`.
   *
   * @param noteId - The note to read. Does not accept null.
   */
  get(noteId: string, options?: CallOptions): Promise<Note>
`)
  })
})

describe('generateContract: operations', () => {
  it('describes each route with its id, permission, target, description, input, and output', () => {
    expect(contract)
      .toContain(`const noteGetNoteOperation: OperationDescriptor<{ readonly noteId: string }, Note> = {
  id: 'jotter.notes.getNote',
  permission: 'jotter:notes:getNote',
  target: { command: 'getNote', resource: 'Note' },
  description: 'Get a note',
  input: t.record({
    noteId: t.string({ description: 'The note to read' }),
  }),
  output: noteRecordType,
  inputJsonSchema: {"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"noteId":{"type":"string","description":"The note to read"}},"required":["noteId"],"additionalProperties":false},
}`)
  })

  it('uses the explicit permission of a command that declares one', () => {
    expect(contract).toContain("  permission: 'jotter:notes:write',")
  })

  it('shares the named create input between the create method and its descriptor', () => {
    expect(contract).toContain(
      'const noteCreateNoteOperation: OperationDescriptor<NoteCreateInput, Note> = {'
    )
    expect(contract).toContain('  input: noteCreateInputType,')
  })

  it('types optional request parameters as possibly undefined, which encodes as absent', () => {
    expect(contract).toContain(
      'const appQuitOperation: OperationDescriptor<{ readonly saving?: boolean | undefined }, undefined> = {'
    )
  })

  it('returns a page of records from list, nothing from delete and from commands without results', () => {
    expect(contract).toContain('  output: t.page(noteRecordType),')
    expect(contract).toMatch(/noteDeleteNoteOperation: OperationDescriptor<[^\n]*, undefined> = \{/)
    expect(contract).toMatch(/noteArchiveOperation: OperationDescriptor<[^\n]*, undefined> = \{/)
  })

  it('never makes a get or list result nullable: a missing target fails, and a list is a page', () => {
    // D7 / A4: get returns the record and list one page of records.
    expect(contract).toMatch(/noteGetNoteOperation: OperationDescriptor<[^\n]*, Note> = \{/)
    expect(contract).toMatch(/noteListNotesOperation: OperationDescriptor<[^\n]*, Page<Note>> = \{/)
    expect(contract).not.toMatch(/output: t\.nullable\(t\.page\(/)
    expect(contract).not.toMatch(/output: t\.nullable\(\w+RecordType/)
  })

  it('makes a command result nullable by default, and says so', () => {
    expect(contract).toContain(
      'const appWordTotalOperation: OperationDescriptor<Record<string, never>, Integer | null> = {'
    )
    expect(contract).toContain('  output: t.nullable(t.integer()),')
    expect(contract).toContain(`  /**
   * Count the words in every note
   *
   * @returns Nullable. No evidence that the app always returns a value.
   */
  wordTotal(options?: CallOptions): Promise<Integer | null>
`)
  })

  it('tables every operation by route', () => {
    expect(contract).toContain("  'jotter.notes.getNote': noteGetNoteOperation,")
    expect(contract).toContain("  'jotter.app.quit': appQuitOperation,")
  })
})

describe('generateContract: resource table', () => {
  it('gives each resource its record, identifier, and resolving operations', () => {
    expect(contract).toContain(`  Note: {
    name: 'Note',
    record: noteRecordType,
    id: t.string({ description: 'The note\\'s unique identifier' }),
    get: 'jotter.notes.getNote',
    list: 'jotter.notes.listNotes',
  },`)
  })

  it('omits the identifier of a resource without one', () => {
    expect(contract).toContain(`  Tag: {
    name: 'Tag',
    record: tagRecordType,
    list: 'jotter.tags.listTags',
  },`)
  })

  it('declares the table as an exported type, one entry per resource, which the table satisfies', () => {
    // Each entry builds on ResourceDescriptor<Record, Id> and narrows to
    // required, literal members exactly the identifier and resolving
    // operations the resource has, so the type says which are present.
    expect(contract).toContain(`export type JotterResources = Readonly<{
  Note: ResourceDescriptor<Note, string> & { readonly id: ValueType<string>; readonly get: 'jotter.notes.getNote'; readonly list: 'jotter.notes.listNotes' }
  Folder: ResourceDescriptor<Folder, Integer> & { readonly id: ValueType<Integer>; readonly get: 'jotter.folders.getFolder'; readonly list: 'jotter.folders.listFolders' }
  Tag: ResourceDescriptor<Tag> & { readonly list: 'jotter.tags.listTags' }
}>
`)
    expect(contract).toMatch(
      /^import \{[^}]*\btype ResourceDescriptor\b[^}]*\} from '@macts\/contracts'/m
    )
    // The value is checked against the declared type rather than declaring
    // one of its own, so there is one table.
    expect(contract).toContain('const resources = {\n')
    expect(contract).toContain('\n} satisfies JotterResources\n')
    expect(contract).not.toContain('typeof resources')
    expect(contract.match(/^const resources\b/gm)).toHaveLength(1)
    expect(contract.match(/^export type JotterResources\b/gm)).toHaveLength(1)
    expect(contract).toContain('  resources,\n')
  })

  it('leaves out a resource with neither a get nor a list operation, in the type and the value (D7)', () => {
    // Sticker records no resolving operation, so no reference to one can be
    // resolved at any position.
    expect(contract).not.toMatch(/^ {2}Sticker:/m)
    // Nothing reads a sticker record, so it has no record value type…
    expect(contract).not.toContain('stickerRecordType')
    // …but its record interface stays, as every usable resource's does.
    expect(contract).toContain('export interface Sticker {\n')
    // Folder.sticker, the one field that names a Sticker, is left out of
    // output (#219), so no generated value type references one.
    expect(contract).not.toContain("'Sticker'")
  })

  it('declares an empty table for an app whose resources are all unresolvable', () => {
    const manifest = jotterManifest()
    const sticker = manifest.resources['Sticker']
    if (sticker === undefined) throw new Error('fixture has no Sticker resource')
    manifest.resources = { Sticker: sticker }
    manifest.commands = {}
    const generated = generateContract(manifest)
    expect(generated.errors).toEqual([])
    const text = moduleText(generated, CONTRACT_MODULE_PATH)
    expect(text).toContain('export type JotterResources = Readonly<Record<never, never>>\n')
    // A client with no operations still carries the (empty) table.
    expect(text).toContain(
      'export type JotterClient = Record<string, never> & ClientBrand<JotterResources>\n'
    )
    expect(text).toContain('const resources = {\n\n} satisfies JotterResources\n')
    expect(text).not.toContain('ResourceDescriptor')
  })
})

describe('generateContract: client', () => {
  it('mirrors the HTTP client surface, with typed identifiers and trailing call options', () => {
    expect(contract).toContain('  readonly notes: NoteResourceClient\n')
    expect(contract).toContain(
      '  list(page?: PageRequest, options?: CallOptions): Promise<Page<Note>>\n'
    )
    expect(contract).toContain('  get(noteId: string, options?: CallOptions): Promise<Note>\n')
    expect(contract).toContain(
      '  update(folderId: Integer, noteId: string, input: NoteUpdateInput, options?: CallOptions): Promise<Note>\n'
    )
    expect(contract).toContain('  delete(noteId: string, options?: CallOptions): Promise<void>\n')
    expect(contract).toContain(
      '  archive(noteId: string, until?: Date | null, options?: CallOptions): Promise<void>\n'
    )
    expect(contract).toContain('  quit(saving?: boolean, options?: CallOptions): Promise<void>\n')
  })

  it('binds methods as closures over runtime.invoke with the request record', () => {
    expect(contract).toContain(
      '      get: (noteId, options) => runtime.invoke(noteGetNoteOperation, { noteId }, options),'
    )
    expect(contract).toContain(
      '      update: (folderId, noteId, input, options) => runtime.invoke(noteUpdateNoteOperation, { ...input, folderId, noteId }, options),'
    )
    expect(contract).toContain(
      '    quit: (saving, options) => runtime.invoke(appQuitOperation, { saving }, options),'
    )
  })
})

describe('generateContract: list pages (D2)', () => {
  it('gives a list whose identifier is claimed unique the paging inputs and a page output', () => {
    expect(contract)
      .toContain(`const noteListNotesOperation: OperationDescriptor<PageRequest, Page<Note>> = {
  id: 'jotter.notes.listNotes',
  permission: 'jotter:notes:listNotes',
  target: { command: 'listNotes', resource: 'Note' },
  description: 'List notes',
  input: t.record({
    ...t.pageInputs(),
  }),
  output: t.page(noteRecordType),`)
  })

  it('gives the list of a resource with no identifier no paging inputs, and still a page', () => {
    expect(contract)
      .toContain(`const tagListTagsOperation: OperationDescriptor<Record<string, never>, Page<Tag>> = {
  id: 'jotter.tags.listTags',
  permission: 'jotter:tags:listTags',
  target: { command: 'listTags', resource: 'Tag' },
  description: 'List tags',
  input: t.record({}),
  output: t.page(tagRecordType),`)
    expect(contract).toContain('  list(options?: CallOptions): Promise<Page<Tag>>\n')
  })

  it('gives the list of a resource whose identifier makes no uniqueness claim no paging inputs', () => {
    expect(contract).toContain(`  id: 'jotter.folders.listFolders',
  permission: 'jotter:folders:listFolders',
  target: { command: 'listFolders', resource: 'Folder' },
  description: 'List folders',
  input: t.record({}),
  output: t.page(folderRecordType),`)
  })

  /**
   * The listFolders descriptor of a Jotter whose folder identifier is changed
   * by `change`, and whose folders carry `rangeRead` when it is given.
   */
  function listFoldersWith(
    change: (identifier: Identifier) => void,
    rangeRead?: Resource['rangeRead']
  ): string {
    const manifest = jotterManifest()
    const folder = manifest.resources['Folder']
    const identifier = folder?.identifiers?.[0]
    if (folder === undefined || identifier === undefined) {
      throw new Error('fixture has no Folder identifier')
    }
    change(identifier)
    if (rangeRead !== undefined) folder.rangeRead = rangeRead
    const generated = generateContract(manifest)
    expect(generated.errors).toEqual([])
    const text = moduleText(generated, CONTRACT_MODULE_PATH)
    const start = text.indexOf("  id: 'jotter.folders.listFolders',")
    return text.slice(start, text.indexOf('output:', start))
  }

  it('pages a list whose identifier is targeted by property but claimed unique', () => {
    const descriptor = listFoldersWith((identifier) => {
      identifier.targeting = 'byProperty'
      identifier.unique = true
      identifier.evidence = { unique: { source: 'curated', note: 'Folder ids never repeat' } }
    }, RANGE_READ_SUPPORTED.rangeRead)

    expect(descriptor).toContain('    ...t.pageInputs(),')
  })

  it('does not page a list whose identifier is claimed not unique, even with a supported range read', () => {
    const descriptor = listFoldersWith((identifier) => {
      identifier.unique = false
      identifier.evidence = { unique: { source: 'curated', note: 'Folder ids can repeat' } }
    }, RANGE_READ_SUPPORTED.rangeRead)

    expect(descriptor).toContain('  input: t.record({}),')
  })

  it('does not page a list whose identifier is targeted by property with no claim', () => {
    const descriptor = listFoldersWith((identifier) => {
      identifier.targeting = 'byProperty'
    }, RANGE_READ_SUPPORTED.rangeRead)

    expect(descriptor).toContain('  input: t.record({}),')
  })

  it('does not page a list whose identifier is claimed unique when no range read is recorded', () => {
    const descriptor = listFoldersWith((identifier) => {
      identifier.unique = true
      identifier.evidence = { unique: { source: 'curated', note: 'Folder ids never repeat' } }
    })

    expect(descriptor).toContain('  input: t.record({}),')
  })

  it('documents the page parameter and how to continue', () => {
    expect(contract).toContain(`  /**
   * List notes, one page at a time.
   *
   * @param page - The page size, and the cursor that continues from the previous page.
   * @returns One page of results. When \`nextCursor\` is present, more remain: call again with the
   * same arguments and that cursor.
   */
  list(page?: PageRequest, options?: CallOptions): Promise<Page<Note>>
`)
  })

  it('binds the paging inputs into the request, and the paging-free list to an empty one', () => {
    expect(contract).toContain(
      '      list: (page, options) => runtime.invoke(noteListNotesOperation, { ...page }, options),'
    )
    expect(contract).toContain(
      '      list: (options) => runtime.invoke(tagListTagsOperation, {}, options),'
    )
  })

  it('imports Page and PageRequest from @macts/contracts', () => {
    expect(contract).toMatch(/^ {2}type Page,$/m)
    expect(contract).toMatch(/^ {2}type PageRequest,$/m)
  })

  it('describes the page size bounds in the input JSON Schema', () => {
    expect(contract).toContain(
      '"pageSize":{"type":"object","properties":{"integer":{"type":"string","pattern":"^(100|[1-9][0-9]?)$"}},"required":["integer"],"additionalProperties":false,"description":"The most items to return, from 1 to 100. Defaults to 25."}'
    )
  })

  it.each(['pageSize', 'cursor'])(
    'refuses a list parameter named %j, which paging reserves',
    (name) => {
      const manifest = jotterManifest()
      const list = manifest.commands['listNotes']
      if (list === undefined) throw new Error('fixture has no listNotes')
      list.parameters = [{ name, type: 'string', description: 'Clashes', required: false }]

      expect(generateContract(manifest).errors).toEqual([
        `jotter.notes.listNotes: the parameter ${JSON.stringify(name)} uses a name list operations reserve for paging (pageSize, cursor); rename the parameter in the manifest.`,
      ])
    }
  )

  it('aliases the paging types when the app declares a Page resource of its own', () => {
    const manifest = jotterManifest()
    const tag = manifest.resources['Tag']
    if (tag === undefined) throw new Error('fixture has no Tag')
    manifest.resources['Page'] = { ...tag, name: 'Page', plural: 'Pages', description: 'A page' }
    manifest.commands['listPages'] = {
      name: 'list',
      description: 'List pages',
      scope: 'resource',
      resourceType: 'Page',
      parameters: [],
    }
    const generated = generateContract(manifest)
    const text = moduleText(generated, CONTRACT_MODULE_PATH)

    expect(generated.errors).toEqual([])
    expect(text).toMatch(/^ {2}type Page as MactsPage,$/m)
    expect(text).toMatch(/^ {2}type PageRequest,$/m)
    expect(text).toContain('export interface Page {')
    expect(text).toContain('  list(options?: CallOptions): Promise<MactsPage<Page>>\n')
    expect(text).toContain(
      '  list(page?: PageRequest, options?: CallOptions): Promise<MactsPage<Note>>\n'
    )
  })

  it('keeps a scoped list parameter positional, ahead of the page', () => {
    const manifest = jotterManifest()
    const list = manifest.commands['listNotes']
    if (list === undefined) throw new Error('fixture has no listNotes')
    list.parameters = [
      { name: 'folderName', type: 'string', description: 'Folder', required: true },
    ]
    const text = moduleText(generateContract(manifest), CONTRACT_MODULE_PATH)

    expect(text).toContain(
      '  list(folderName: string, page?: PageRequest, options?: CallOptions): Promise<Page<Note>>\n'
    )
    expect(text).toContain(
      'const noteListNotesOperation: OperationDescriptor<{ readonly folderName: string } & PageRequest, Page<Note>> = {'
    )
    expect(text).toContain(
      '      list: (folderName, page, options) => runtime.invoke(noteListNotesOperation, { ...page, folderName }, options),'
    )
  })
})

describe('generateContract: paging on real manifests', () => {
  /** The descriptor text of operation `id` in the contract generated for `app`. */
  async function descriptorOf(app: string, id: string): Promise<string> {
    const manifest = await loadManifest(resolve(MANIFESTS_DIR, app, 'app.yaml'))
    const text = moduleText(generateContract(manifest), CONTRACT_MODULE_PATH)
    const start = text.indexOf(`  id: '${id}',`)
    if (start < 0) throw new Error(`no descriptor for ${id}`)
    return text.slice(start, text.indexOf('\n}', start))
  }

  it.each(['calendar.events.list', 'calendar.calendars.list'])(
    'does not page %s: its identifier is claimed not unique',
    async (id) => {
      const descriptor = await descriptorOf('calendar', id)

      expect(descriptor).not.toContain('t.pageInputs()')
      expect(descriptor).toContain('output: t.page(')
    }
  )

  it('pages reminders.reminders.list: its id is claimed unique and its range reads passed', async () => {
    expect(await descriptorOf('reminders', 'reminders.reminders.list')).toContain(
      '    ...t.pageInputs(),'
    )
  })

  it('does not page music.playlists.list: the app rejects range reads of its playlists', async () => {
    // Regression: Music answers every range read of its playlists with -1708,
    // so a paged playlists list failed on every page.
    const descriptor = await descriptorOf('music', 'music.playlists.list')

    expect(descriptor).not.toContain('t.pageInputs()')
    expect(descriptor).not.toContain('pageSize')
    expect(descriptor).not.toContain('cursor')
    expect(descriptor).toContain('  input: t.record({}),')
    expect(descriptor).toContain('output: t.page(playlistRecordType)')
  })
})

describe('generateContract: TV sources and their playlists (shipped manifest)', () => {
  // The app addresses a playlist within its source, so the playlist get and
  // list take the source's persistent ID as `sourceId`, as a direct call of
  // either does; a source is found at the application and takes none.
  let text = ''
  beforeAll(async () => {
    const manifest = await loadManifest(resolve(MANIFESTS_DIR, 'tv', 'app.yaml'))
    text = moduleText(generateContract(manifest), CONTRACT_MODULE_PATH)
  })

  /** The required inputs of operation `id`, from its input JSON Schema. */
  function requiredInputs(id: string): unknown {
    const start = text.indexOf(`  id: '${id}',`)
    if (start < 0) throw new Error(`no descriptor for ${id}`)
    const schemaStart = text.indexOf('inputJsonSchema: ', start)
    const line = text.slice(schemaStart, text.indexOf('\n', schemaStart))
    const schema = JSON.parse(line.slice('inputJsonSchema: '.length).replace(/,$/, '')) as {
      required?: unknown
    }
    return schema.required ?? []
  }

  it.each([
    ['tv.playlists.list', ['sourceId']],
    ['tv.playlists.get', ['sourceId', 'persistentID']],
  ])('%s requires the source the playlist is in', (id, required) => {
    expect(requiredInputs(id)).toEqual(required)
  })

  it.each([
    ['tv.sources.list', []],
    ['tv.sources.get', ['persistentID']],
  ])('%s needs no container: sources are found at the application', (id, required) => {
    expect(requiredInputs(id)).toEqual(required)
  })

  it.each([
    ['tv.browserWindows.list', []],
    ['tv.browserWindows.get', ['id']],
    ['tv.playlistWindows.list', []],
    ['tv.playlistWindows.get', ['id']],
  ])('%s finds windows at the application, by id', (id, required) => {
    expect(requiredInputs(id)).toEqual(required)
  })

  /** The line of the declared resource table type for `resource`. */
  function declaredEntry(resource: string): string {
    const start = text.indexOf(`  ${resource}: ResourceDescriptor<`)
    if (start < 0) throw new Error(`no declared entry for ${resource}`)
    return text.slice(start, text.indexOf('\n', start))
  }

  // phases/13 D7, "Parent-scoped targets": the table records, per route, the
  // parent the command behind it records, so a playlist reference resolved
  // through either route needs its source as its container.
  it('records the source as the parent of both playlist routes', () => {
    expect(declaredEntry('Playlist')).toContain(
      "readonly get: 'tv.playlists.get'; readonly list: 'tv.playlists.list'; " +
        "readonly parents: { readonly get: 'Source'; readonly list: 'Source' } }"
    )
    expect(text).toContain(`    get: 'tv.playlists.get',
    list: 'tv.playlists.list',
    parents: { get: 'Source', list: 'Source' },
  },`)
  })

  it.each(['Source', 'BrowserWindow', 'PlaylistWindow'])(
    'records no parent for %s, found at the application',
    (resource) => {
      expect(declaredEntry(resource)).not.toContain('parents')
    }
  )
})

describe('generateContract: identifier nullability', () => {
  it('keeps the primary identifier non-null and reports a contrary claim', () => {
    const manifest = jotterManifest()
    const uid = manifest.resources['Note']?.properties['uid']
    if (uid === undefined) throw new Error('fixture has no Note.uid')
    uid.nullable = true
    uid.evidence = {
      nullable: {
        source: 'probe',
        observedAt: '2026-10-31T12:00:00.000Z',
        bundleId: 'com.example.jotter',
        appVersion: '2.1',
        osVersion: '27.2',
        sampleSize: 40,
        nullCount: 1,
        failedReads: 0,
      },
    }
    const generated = generateContract(manifest)
    const text = moduleText(generated, CONTRACT_MODULE_PATH)
    expect(text).toContain(`  /**
   * The note's unique identifier.
   * Never null: the primary identifier.
   */
  readonly uid: string
`)
    expect(
      generated.diagnostics.filter(({ kind }) => kind === 'identifier-nullability-ignored')
    ).toEqual([
      {
        kind: 'identifier-nullability-ignored',
        app: 'jotter',
        position: 'resources.Note.properties.uid',
        evidence: uid.evidence.nullable,
        message:
          'jotter: resources.Note.properties.uid: the primary identifier is never null, so its nullability claim (probe evidence) is ignored; if the identifier can be empty, choose a different identifier.',
      },
    ])
  })

  it('reports only the output fields the unmodified fixture leaves out', () => {
    // Folder.owner holds a reference to a tag and Folder.sticker one to a
    // sticker. macts has no get for either yet, so both fields are left
    // out of output (phases/13 D7, #219), in declaration order.
    expect(jotter.diagnostics).toEqual([
      {
        kind: 'omitted-output',
        app: 'jotter',
        position: 'resources.Folder.properties.owner',
        target: 'Tag',
        reason: 'no-get',
        message:
          'jotter: resources.Folder.properties.owner: the Folder field "owner" is left out of output for now: it holds a reference to "Tag", and macts has no get for "Tag" yet (#219).',
      },
      {
        kind: 'omitted-output',
        app: 'jotter',
        position: 'resources.Folder.properties.sticker',
        target: 'Sticker',
        reason: 'no-get',
        message:
          'jotter: resources.Folder.properties.sticker: the Folder field "sticker" is left out of output for now: it holds a reference to "Sticker", and macts has no get for "Sticker" yet (#219).',
      },
    ])
  })
})

describe('generateContract: errors', () => {
  function withChanges(change: (manifest: AppManifest) => void): GeneratedContract {
    const manifest = jotterManifest()
    change(manifest)
    return generateContract(manifest)
  }

  it('reports a manifest name that collides with a contract import', () => {
    const result = withChanges((manifest) => {
      manifest.enums['ClientRuntime'] = {
        name: 'ClientRuntime',
        values: [{ name: 'a', value: 'a' }],
      }
    })
    expect(result.errors).toEqual([
      'jotter: the name ClientRuntime is declared twice in module scope.',
    ])
  })

  it('reports a manifest name that collides with the resource table type', () => {
    const result = withChanges((manifest) => {
      manifest.enums['JotterResources'] = {
        name: 'JotterResources',
        values: [{ name: 'a', value: 'a' }],
      }
    })
    expect(result.errors).toEqual([
      'jotter: the name JotterResources is declared twice in module scope.',
    ])
  })

  it('reports two methods with the same name in one namespace', () => {
    const result = withChanges((manifest) => {
      manifest.commands['archiveAgain'] = {
        name: 'archive',
        description: 'Archive again',
        scope: 'resource',
        resourceType: 'Note',
        parameters: [],
      }
    })
    expect(result.errors).toEqual([
      'jotter: the name archive is declared twice in the notes namespace.',
    ])
  })

  // Governance accepts exactly three non-empty segments and denies anything
  // else, so each of these could never be granted.
  it.each(['quit', '::x', 'a::c', 'a:b:', ':b:c', 'a:b', 'a:b:c:d'])(
    'reports the permission %j, which is not app:resource:operation',
    (permission) => {
      const result = withChanges((manifest) => {
        const quit = manifest.commands['quit']
        if (quit) quit.permission = permission
      })
      expect(result.errors).toEqual([
        `jotter.app.quit: the permission ${JSON.stringify(permission)} is not of the form app:resource:operation.`,
      ])
    }
  )

  it('accepts a permission of three non-empty segments', () => {
    const result = withChanges((manifest) => {
      const quit = manifest.commands['quit']
      if (quit) quit.permission = 'jotter:app:shutdown'
    })
    expect(result.errors).toEqual([])
  })
})

describe('contractNames', () => {
  it('name the client after the app and the contract in lower camel case', () => {
    const named = (name: string) =>
      contractNames({ ...jotterManifest(), app: { name, bundleId: 'x', tccEntitlements: [] } })
    expect(named('Google Chrome')).toEqual({
      app: 'google-chrome',
      client: 'GoogleChromeClient',
      contract: 'googleChromeContract',
      resources: 'GoogleChromeResources',
    })
    expect(named('TV')).toEqual({
      app: 'tv',
      client: 'TVClient',
      contract: 'tvContract',
      resources: 'TVResources',
    })
    expect(named('iTerm')).toEqual({
      app: 'iterm',
      client: 'iTermClient',
      contract: 'iTermContract',
      resources: 'iTermResources',
    })
  })
})

describe('generateContract: the shipped System Events disk items, folders and domains', () => {
  // Expected values come from the System Events 1.3.6 dictionary
  // (`sdef /System/Library/CoreServices/System\ Events.app`) and phases/13:
  // D10 "Superclasses" (`folder` inherits `disk item`; `user domain object`
  // and `Classic domain object` inherit `domain`), "Key targeting" (a disk
  // item and a folder are found by POSIX path), and "Singleton roots" (the
  // application's `user domain` and `Classic domain` properties). A field the
  // manifest marks unsupported is on no surface.
  let text = ''
  beforeAll(async () => {
    const manifest = await loadManifest(resolve(MANIFESTS_DIR, 'system-events', 'app.yaml'))
    text = moduleText(generateContract(manifest), CONTRACT_MODULE_PATH)
  })

  /** The fields the generated interface `name` declares, in order. */
  function interfaceFields(name: string): string[] {
    return [...interfaceBody(name).matchAll(/^ {2}(?:readonly )?(\w+)\??:/gm)].map(
      (match) => match[1] ?? ''
    )
  }

  /** The body of the generated interface `name`. */
  function interfaceBody(name: string): string {
    const start = text.indexOf(`export interface ${name} {`)
    if (start < 0) throw new Error(`no interface ${name}`)
    return text.slice(start, text.indexOf('\n}\n', start))
  }

  /** The 16 properties of the dictionary's `disk item`, in manifest order. */
  const DISK_ITEM_FIELDS = [
    'busyStatus',
    'container',
    'creationDate',
    'displayedName',
    'id',
    'modificationDate',
    'name',
    'nameExtension',
    'packageFolder',
    'path',
    'physicalSize',
    'posixPath',
    'size',
    'uRL',
    'visible',
    'volume',
  ]

  /** The 15 properties of the dictionary's `domain`, in manifest order. */
  const DOMAIN_FIELDS = [
    'applicationSupportFolder',
    'applicationsFolder',
    'desktopPicturesFolder',
    'folderActionScriptsFolder',
    'fontsFolder',
    'id',
    'libraryFolder',
    'name',
    'preferencesFolder',
    'scriptingAdditionsFolder',
    'scriptsFolder',
    'sharedDocumentsFolder',
    'speakableItemsFolder',
    'utilitiesFolder',
    'workflowsFolder',
  ]

  it('declares every disk item field on a disk item and a folder, its container included', () => {
    expect(interfaceFields('DiskItem')).toEqual(DISK_ITEM_FIELDS)
    expect(interfaceFields('Folder')).toEqual(DISK_ITEM_FIELDS)
    expect(interfaceBody('Folder')).toContain(
      "  readonly container: ObjectReferenceVariant<DiskItem, string, 'DiskItem'> | null"
    )
  })

  it('identifies a disk item and a folder by POSIX path, so their id is no longer non-null', () => {
    for (const name of ['DiskItem', 'Folder']) {
      expect(interfaceBody(name)).toContain('  readonly posixPath: string\n')
      expect(interfaceBody(name)).toContain('  readonly id: string | null\n')
    }
    expect(text).toContain('  get(posixPath: string, options?: CallOptions): Promise<DiskItem>')
    expect(text).toContain('  get(posixPath: string, options?: CallOptions): Promise<Folder>')
  })

  it('lists domains and gets one by id, each folder a folder reference', () => {
    expect(interfaceFields('Domain')).toEqual(DOMAIN_FIELDS)
    expect(interfaceBody('Domain')).toContain(
      "  readonly applicationsFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null"
    )
    expect(text).toContain('  get(id: string, options?: CallOptions): Promise<Domain>')
    expect(text).toContain('  list(options?: CallOptions): Promise<Page<Domain>>')
  })

  it('reads the user domain as a root of one kind, with its own and its inherited folders', () => {
    expect(text).toContain("export type UserDomainObjectKind = 'user'")
    expect(interfaceFields('UserDomainObject')).toEqual([
      'desktopFolder',
      'documentsFolder',
      'downloadsFolder',
      'favoritesFolder',
      'homeFolder',
      'moviesFolder',
      'musicFolder',
      'picturesFolder',
      'publicFolder',
      'sitesFolder',
      'temporaryItemsFolder',
      'kind',
      ...DOMAIN_FIELDS,
    ])
    expect(text).toContain(
      '  get(kind: UserDomainObjectKind, options?: CallOptions): Promise<UserDomainObject>'
    )
    expect(text).toContain('  list(options?: CallOptions): Promise<Page<UserDomainObject>>')
  })

  /**
   * The domain folders a read-only probe of the 5 domains (2026-11-04T04:41:36Z)
   * found missing on some domains, with how many of the 5 reads the app
   * reported missing (-1728); each is nullable on that evidence.
   */
  const REPORTED_MISSING: Record<string, number> = {
    desktopPicturesFolder: 4,
    folderActionScriptsFolder: 4,
    fontsFolder: 2,
    preferencesFolder: 1,
    scriptingAdditionsFolder: 3,
    scriptsFolder: 2,
    sharedDocumentsFolder: 1,
    speakableItemsFolder: 4,
    utilitiesFolder: 3,
    workflowsFolder: 3,
  }

  /**
   * The domain folders every domain answered with an id in that probe, but
   * which a read-only probe of the 5 domains (2026-11-05T03:10:09.000Z) that
   * read each folder as the generated body does, the folder and then its
   * POSIX path, found missing on 1 domain (-1728).
   */
  const REPORTED_MISSING_ON_PATH_READ: Record<string, number> = {
    applicationSupportFolder: 1,
    applicationsFolder: 1,
    libraryFolder: 1,
  }

  /** The domain's 13 folders, each nullable on one of the two probes above. */
  const DOMAIN_FOLDER_FIELDS = [
    ...Object.keys(REPORTED_MISSING),
    ...Object.keys(REPORTED_MISSING_ON_PATH_READ),
  ]

  /** The doc comment and declaration of field `field` in the interface `name`, joined on one line. */
  function fieldDeclaration(name: string, field: string): string {
    const body = interfaceBody(name)
    const at = body.indexOf(`  readonly ${field}:`)
    if (at < 0) throw new Error(`${name} declares no ${field}`)
    const doc = body.lastIndexOf('/**', at)
    // The last field's line ends the body, with no newline after it.
    const end = body.indexOf('\n', at)
    return body.slice(doc, end < 0 ? body.length : end).replace(/\s*\n\s*\*?\s*/g, ' ')
  }

  it('types each domain folder the app reported missing as nullable, saying how often', () => {
    for (const name of ['Domain', 'UserDomainObject']) {
      for (const [field, missing] of Object.entries(REPORTED_MISSING)) {
        const declaration = fieldDeclaration(name, field)
        expect(declaration).toContain(
          `Nullable. The app reported no value in ${String(missing)} of 5 reads (System Events 1.3.6, macOS 27.2, 2026-11-04).`
        )
        expect(declaration).toContain(
          `readonly ${field}: ObjectReferenceVariant<Folder, string, 'Folder'> | null`
        )
      }
    }
    for (const name of ['Domain', 'UserDomainObject']) {
      for (const [field, missing] of Object.entries(REPORTED_MISSING_ON_PATH_READ)) {
        const declaration = fieldDeclaration(name, field)
        expect(declaration).toContain(
          `Nullable. The app reported no value in ${String(missing)} of 5 reads (System Events 1.3.6, macOS 27.2, 2026-11-05).`
        )
        expect(declaration).toContain(
          `readonly ${field}: ObjectReferenceVariant<Folder, string, 'Folder'> | null`
        )
      }
    }
    // All 13 of the domain's folders are nullable on that evidence.
    const evidenced = DOMAIN_FOLDER_FIELDS.filter((field) =>
      fieldDeclaration('Domain', field).includes('The app reported no value in')
    )
    expect(evidenced).toHaveLength(13)
  })

  it("types the user's Sites folder as nullable, giving the curated reason and the reads behind it", () => {
    // The user domain is the only one, so one failed read (-1728, probe of
    // 2026-11-04T04:51:11Z) cannot show structure; the curated reason
    // decides that the absence depends on the data (phases/13 D10).
    const declaration = fieldDeclaration('UserDomainObject', 'sitesFolder')
    expect(declaration).toContain(
      'Nullable: The Sites folder exists only once the user creates one. The app reported no value in 1 of 1 reads (System Events 1.3.6, macOS 27.2, 2026-11-04).'
    )
    expect(declaration).toContain(
      "readonly sitesFolder: ObjectReferenceVariant<Folder, string, 'Folder'> | null"
    )
    // With the 13 domain folders, 14 user-domain fields are nullable on
    // evidence the app reported no value.
    const evidenced = [...DOMAIN_FOLDER_FIELDS, 'sitesFolder'].filter((field) =>
      fieldDeclaration('UserDomainObject', field).includes('The app reported no value in')
    )
    expect(evidenced).toHaveLength(14)
  })

  it('reads the Classic domain as a root of one kind, without the 16 folders current macOS lacks', () => {
    expect(text).toContain("export type ClassicDomainObjectKind = 'classic'")
    // Of its own 11 folders only the Preferences folder reads; of the
    // domain's 13, it declares the Fonts and Preferences folders itself, and
    // 6 of the 11 it inherits are missing.
    expect(interfaceFields('ClassicDomainObject')).toEqual([
      'preferencesFolder',
      'kind',
      'applicationSupportFolder',
      'applicationsFolder',
      'id',
      'libraryFolder',
      'name',
      'scriptsFolder',
      'workflowsFolder',
    ])
    expect(text).toContain(
      '  get(kind: ClassicDomainObjectKind, options?: CallOptions): Promise<ClassicDomainObject>'
    )
  })
})

describe('real app manifests', () => {
  let apps: { dir: string; manifest: AppManifest }[] = []

  beforeAll(async () => {
    const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
    apps = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => ({
          dir: entry.name,
          manifest: await loadManifest(resolve(MANIFESTS_DIR, entry.name, 'app.yaml')),
        }))
    )
  })

  it('discovers the app manifests', () => {
    expect(apps.length).toBeGreaterThan(0)
  })

  it('report exactly the resource types that name no resource or enum', () => {
    // Audited by hand: of 89 resource-typed positions, these three name
    // dictionary types the manifests do not model as resources. No manifest
    // uses an unresolvable bare type name.
    const found = apps
      .flatMap(({ manifest }) => collectContractDiagnostics(manifest))
      .filter(
        (diagnostic) =>
          diagnostic.kind !== 'unavailable-operation' && diagnostic.kind !== 'omitted-output'
      )
      .map((diagnostic) => ({
        kind: diagnostic.kind,
        app: diagnostic.app,
        position: diagnostic.position,
        type: diagnostic.kind === 'unresolved-type' ? diagnostic.type : undefined,
      }))
    // No shipped manifest makes a nullability claim yet, so the only
    // diagnostics are unresolved types.
    expect(found).toEqual([
      {
        kind: 'unresolved-type',
        app: 'finder',
        position: 'resources.FinderWindow.properties.iconViewOptions',
        type: { resource: 'icon view options' },
      },
      {
        kind: 'unresolved-type',
        app: 'finder',
        position: 'resources.FinderWindow.properties.columnViewOptions',
        type: { resource: 'column view options' },
      },
      {
        kind: 'unresolved-type',
        app: 'system-events',
        position: 'resources.ScriptingCommand.properties.scriptingResult',
        type: { resource: 'scripting result object' },
      },
    ])
  })

  it('report exactly the operations a required input makes unavailable', () => {
    // Audited by hand against the manifests: each position is a required
    // parameter whose type is a resource with no `get` command. Mail has no
    // command that gets one account. Contacts' actions take a person, which
    // `people.get` gets, so they are not reported.
    const found = apps
      .flatMap(({ manifest }) => collectContractDiagnostics(manifest))
      .flatMap((diagnostic) =>
        diagnostic.kind === 'unavailable-operation'
          ? [
              {
                app: diagnostic.app,
                operation: diagnostic.operation,
                position: diagnostic.position,
                resource: diagnostic.resource,
              },
            ]
          : []
      )
    expect(found).toEqual([
      {
        app: 'mail',
        operation: 'mail.app.synchronize',
        position: 'commands.synchronize.parameters.with',
        resource: 'Account',
      },
    ])
  })

  it('leave out exactly the hand-audited output positions, each for its reason', () => {
    // The coverage ledger (#219; phases/13 D7, resolvable targets): every
    // output position macts cannot yet return a resolvable reference at,
    // audited by hand against the manifests. Each row is a gap in what macts
    // covers, not something the app cannot do. Every entry is a record field
    // holding a single reference, or an array of them: `no-get` when macts
    // has no get for the target yet, `not-unique` when macts identifies the
    // target by a name the manifest has no uniqueness evidence for yet, and
    // `parent-scoped` when the target's get records a parent and the field
    // holds no container for it: a native read returns, as the container,
    // only the record the field is read through, when that record is the
    // target's parent and a valid container (a TV playlist, got within its
    // source, read through a window or another playlist; an Xcode scheme or
    // run destination, got within a workspace document, which is identified
    // by its name with no claim; an Xcode project, got within its workspace
    // document, read through a target). Chrome and Edge windows'
    // `activeTab` are kept: a tab is got within its window, which is
    // top-level and claims its id unique. No shipped
    // output references a resource with a get and no identifier, no shipped
    // output references a resource the hierarchy holds only within another
    // resource while its get records no parent (`unrecorded-parent`), and no
    // shipped command records a result, so no result is left out. A new omission
    // fails until it is reviewed and added here. Removing a row records
    // restored coverage: the field is back in output. A row also leaves when
    // the manifest marks the field unsupported: it is then on no surface.
    //
    // The System Events disk item and folder gets took 61 rows off: every
    // field holding a Folder or a DiskItem (the domain's 13 folders, the user
    // domain's 11 own and 13 inherited, the Classic domain's 11 own and 11
    // inherited, and a folder's and a disk item's `container`). 45 are back
    // in output; 16 Classic folders left as unsupported, because current
    // macOS has none (10 the Classic domain declares, 6 it inherits). 96 - 61
    // = 35.
    const found = apps
      .flatMap(({ manifest }) => collectContractDiagnostics(manifest))
      .flatMap((diagnostic) => {
        if (diagnostic.kind !== 'omitted-output') return []
        const field = /^resources\.([^.]+)\.properties\.([^.]+)$/.exec(diagnostic.position)
        const [resource, property] =
          field === null ? [diagnostic.position, 'result'] : [field[1], field[2]]
        return [[diagnostic.app, resource, property, diagnostic.target, diagnostic.reason]]
      })
    const expected: [
      app: string,
      resource: string,
      field: string,
      target: string,
      reason: string,
    ][] = [
      ['arc', 'Window', 'activeTab', 'Tab', 'no-get'],
      ['arc', 'Window', 'activeSpace', 'Space', 'no-get'],
      ['finder', 'FinderWindow', 'listViewOptions', 'ListViewOptions', 'no-get'],
      ['finder', 'ListViewOptions', 'sortColumn', 'Column', 'no-get'],
      ['iterm', 'Window', 'currentTab', 'Tab', 'no-get'],
      ['iterm', 'Window', 'currentSession', 'Session', 'no-get'],
      ['iterm', 'Tab', 'currentSession', 'Session', 'no-get'],
      ['mail', 'MessageViewer', 'draftsMailbox', 'Mailbox', 'no-get'],
      ['mail', 'MessageViewer', 'inbox', 'Mailbox', 'no-get'],
      ['mail', 'MessageViewer', 'junkMailbox', 'Mailbox', 'no-get'],
      ['mail', 'MessageViewer', 'outbox', 'Mailbox', 'no-get'],
      ['mail', 'MessageViewer', 'sentMailbox', 'Mailbox', 'no-get'],
      ['mail', 'MessageViewer', 'trashMailbox', 'Mailbox', 'no-get'],
      ['mail', 'Message', 'mailbox', 'Mailbox', 'no-get'],
      ['mail', 'Message', 'content', 'RichText', 'no-get'],
      ['mail', 'Mailbox', 'account', 'Account', 'no-get'],
      ['mail', 'Mailbox', 'container', 'Mailbox', 'no-get'],
      ['mail', 'Rule', 'copyMessage', 'Mailbox', 'no-get'],
      ['mail', 'Rule', 'moveMessage', 'Mailbox', 'no-get'],
      ['messages', 'Participant', 'account', 'Account', 'no-get'],
      ['messages', 'Chat', 'account', 'Account', 'no-get'],
      ['system-events', 'NetworkPreferencesObject', 'currentLocation', 'Location', 'no-get'],
      ['system-events', 'Service', 'currentConfiguration', 'Configuration', 'no-get'],
      ['system-events', 'Service', 'interface', 'Interface', 'no-get'],
      // Inherited: a folder is a disk item, and the user and Classic domains
      // are domains (D10, "Superclasses"). 1 + 13 + 11 rows.
      ['system-events', 'ScriptingClass', 'superclass', 'ScriptingClass', 'no-get'],
      ['system-events', 'ScriptingCommand', 'directParameter', 'ScriptingParameter', 'no-get'],
      ['tv', 'BrowserWindow', 'view', 'Playlist', 'parent-scoped'],
      ['tv', 'Playlist', 'parent', 'Playlist', 'parent-scoped'],
      ['tv', 'PlaylistWindow', 'view', 'Playlist', 'parent-scoped'],
      // A scheme, a run destination and a project are got only within their
      // workspace document. A workspace document is identified by its name,
      // with no claim, so it is no valid container yet; its evidenced identity
      // is its document path, and these fields return with path curation of
      // it. A target's project is read through a target, not through its
      // workspace document, so it also needs nested chains.
      ['xcode', 'WorkspaceDocument', 'activeScheme', 'Scheme', 'parent-scoped'],
      // Also name-keyed with no unique claim, which is hidden by decision:
      // once its workspace document is a valid container its reason becomes
      // `not-unique`, and it stays out until run destination names are shown
      // to be unique. They likely repeat within one workspace (the same
      // simulator name on two runtimes), so that needs a live check across two
      // or more runtimes.
      ['xcode', 'WorkspaceDocument', 'activeRunDestination', 'RunDestination', 'parent-scoped'],
      ['xcode', 'WorkspaceDocument', 'lastSchemeActionResult', 'SchemeActionResult', 'no-get'],
      ['xcode', 'Target', 'project', 'Project', 'parent-scoped'],
      ['xcode', 'RunDestination', 'device', 'Device', 'no-get'],
      ['xcode', 'RunDestination', 'companionDevice', 'Device', 'no-get'],
    ]
    expect(expected).toHaveLength(35)
    expect(found.sort()).toEqual(expected.sort())
  })

  /** The manifest of the shipped app in `dir`. */
  function manifestOf(dir: string): AppManifest {
    const found = apps.find((app) => app.dir === dir)
    if (found === undefined) throw new Error(`no manifest for ${dir}`)
    return found.manifest
  }

  it("keep Chrome and Edge windows' active tab, carrying the window it was read through", () => {
    // A tab is got within its window; a window is top-level and claims its id
    // unique on the scripting dictionary, so it is a valid container.
    for (const dir of ['google-chrome', 'microsoft-edge']) {
      const manifest = manifestOf(dir)
      expect(isValidContainer(manifest, 'Window')).toBe(true)
      expect(omittedOutputReason(manifest, 'Tab', 'Window')).toBeUndefined()
      // With no record to read it through, a tab still has no container.
      expect(omittedOutputReason(manifest, 'Tab')).toBe('parent-scoped')
    }
  })

  it("leave out an Xcode workspace document's active scheme and run destination: the document is no valid container yet", () => {
    // A workspace document is identified by its name, with no unique claim.
    // Its identity is its document path, since two checkouts with the same
    // name can be open at once (not yet observed live), so no name claim is
    // to be added; the fields return with path curation of the document.
    const xcode = manifestOf('xcode')
    expect(isNameKeyed(xcode, 'WorkspaceDocument')).toBe(true)
    expect(isValidContainer(xcode, 'WorkspaceDocument')).toBe(false)
    expect(omittedOutputReason(xcode, 'Scheme', 'WorkspaceDocument')).toBe('parent-scoped')
    expect(omittedOutputReason(xcode, 'RunDestination', 'WorkspaceDocument')).toBe('parent-scoped')
  })

  it('generate without errors', () => {
    const errors = apps.flatMap(({ manifest }) => generateContract(manifest).errors)
    expect(errors).toEqual([])
  })

  it('embed a manifest that validates back to the same manifest', () => {
    for (const { manifest } of apps) {
      const text = moduleText(generateContract(manifest), CONTRACT_MANIFEST_MODULE_PATH)
      const json = text.slice(text.indexOf('export const manifest: unknown = ') + 33)
      expect(AppManifestSchema.parse(JSON.parse(json))).toEqual(manifest)
    }
  })
})

describe('contractResourcePlans', () => {
  // Registration checks a contract's resource plans against these. Computed
  // before the builder derived its operations, the table found no resolving
  // operation for any resource and came out empty, so registration refused
  // every generated contract as listing undeclared resources.
  it('gives the plans of exactly the resources the generated table lists', () => {
    const plans = contractResourcePlans(jotterManifest())
    // Note and Folder are got and listed, Tag only listed; Sticker has neither.
    expect(Object.keys(plans).sort()).toEqual(['Folder', 'Note', 'Tag'])
    // Note is identified by `uid` and Folder by `folderId`; Tag has no identifier.
    expect(plans['Note']?.id).toBeDefined()
    expect(plans['Folder']?.id).toBeDefined()
    expect(plans['Tag']).toEqual({})
  })
})

/**
 * The doc line of a property that is nullable because the app fails the read
 * (phases/13 D10): it names the failed reads, not items observed empty. The
 * expected lines are written from the evidence of the Archive fixture's
 * `Entry.shelfMark` (3 reads succeeded, 2 failed with no such object; Archive
 * 1.0, macOS 27.2, probed 2026-11-01).
 */
describe('generateContract: nullability notes for reported absences', () => {
  it('says the app reported no value in 2 of the 5 reads, not that items were observed missing', () => {
    const contract = generateContract(archiveManifest()).files.find(
      (file) => file.path === CONTRACT_MODULE_PATH
    )
    expect(contract?.content).toContain(
      '   * Nullable. The app reported no value in 2 of 5 reads (Archive 1.0, macOS 27.2, 2026-11-01).\n'
    )
    expect(contract?.content).not.toContain('Observed missing in 0 of 3 items')
  })

  it('names both causes when the probe also saw empty values', () => {
    const evidence = {
      source: 'probe',
      observedAt: '2026-11-01T12:00:00.000Z',
      bundleId: 'com.example.archive',
      appVersion: '1.0',
      osVersion: '27.2',
      sampleSize: 3,
      nullCount: 1,
      failedReads: 2,
      errorNumbers: [-1728],
    } satisfies ProbeNullabilityEvidence
    expect(readNullabilityNote({ nullable: true, basis: evidence }, 'Archive')).toBe(
      'Nullable. Observed missing in 1 of 3 items, and the app reported no value in 2 of 5 reads (Archive 1.0, macOS 27.2, 2026-11-01).'
    )
  })

  // A single instance's absence curated as depending on the data: the
  // reason, without its closing stop, then the failed reads (phases/13 D10,
  // "One instance cannot show structure").
  it('gives the curated reason, then the reads, for a single instance curated as absent', () => {
    const evidence = {
      source: 'curated',
      note: 'The front desk has a bell only once one is fitted.',
      absentReads: {
        observedAt: '2026-11-01T12:00:00.000Z',
        bundleId: 'com.example.archive',
        appVersion: '1.0',
        osVersion: '27.2',
        failedReads: 1,
        errorNumbers: [-1728],
        reason: 'A desk has a bell only once one is fitted.',
      },
    } satisfies CuratedNullabilityEvidence
    expect(readNullabilityNote({ nullable: true, basis: evidence }, 'Archive')).toBe(
      'Nullable: A desk has a bell only once one is fitted. The app reported no value in 1 of 1 reads (Archive 1.0, macOS 27.2, 2026-11-01).'
    )
  })
})
