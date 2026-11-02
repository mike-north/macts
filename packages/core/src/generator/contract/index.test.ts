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
import { AppManifestSchema, type AppManifest } from '../../manifest/index.js'
import { loadManifest } from '../../manifest/loader.js'
import {
  CONTRACT_MANIFEST_MODULE_PATH,
  CONTRACT_MODULE_PATH,
  collectContractDiagnostics,
  contractNames,
  generateContract,
  type GeneratedContract,
} from './index.js'
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

  it('exports the contract as <camelApp>Contract typed AppContract<<PascalApp>Client>', () => {
    expect(contract).toContain('export const jotterContract: AppContract<JotterClient> = {')
    expect(contract).toContain("  app: 'jotter',")
    expect(contract).toContain('export interface JotterClient {')
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
  readonly folder: ObjectReferenceVariant<Folder, Integer> | null
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
  readonly notes: readonly ObjectReferenceVariant<Note, string>[] | null
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
      "  folder: t.nullable(t.reference<Folder, Integer>(() => resources, 'Folder', 'one'), { description: 'The folder holding the note' }),"
    )
    expect(contract).toContain(
      "  notes: t.nullable(t.array(t.reference<Note, string>(() => resources, 'Note', 'one')), { description: 'The notes in the folder' }),"
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

  it('returns a record list from list, nothing from delete and from commands without results', () => {
    expect(contract).toContain('  output: t.array(noteRecordType),')
    expect(contract).toMatch(/noteDeleteNoteOperation: OperationDescriptor<[^\n]*, undefined> = \{/)
    expect(contract).toMatch(/noteArchiveOperation: OperationDescriptor<[^\n]*, undefined> = \{/)
  })

  it('never makes a get or list result nullable: a missing target fails, and a list is an array', () => {
    // D7 / A4: get returns the record and list an array of records.
    expect(contract).toMatch(/noteGetNoteOperation: OperationDescriptor<[^\n]*, Note> = \{/)
    expect(contract).toMatch(
      /noteListNotesOperation: OperationDescriptor<[^\n]*, readonly Note\[\]> = \{/
    )
    expect(contract).not.toMatch(/output: t\.nullable\(t\.array\(/)
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
})

describe('generateContract: client', () => {
  it('mirrors the HTTP client surface, with typed identifiers and trailing call options', () => {
    expect(contract).toContain('  readonly notes: NoteResourceClient\n')
    expect(contract).toContain('  list(options?: CallOptions): Promise<readonly Note[]>\n')
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
    expect(generated.diagnostics).toEqual([
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

  it('reports nothing for the unmodified fixture', () => {
    expect(jotter.diagnostics).toEqual([])
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
    })
    expect(named('TV')).toEqual({ app: 'tv', client: 'TVClient', contract: 'tvContract' })
    expect(named('iTerm')).toEqual({
      app: 'iterm',
      client: 'iTermClient',
      contract: 'iTermContract',
    })
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
