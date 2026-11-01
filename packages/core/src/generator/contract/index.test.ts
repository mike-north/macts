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
 * @see phases/13-sdk-value-and-execution-contracts.md §A4 (presence and updates)
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
  lowerCamel,
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

const jotter = generateContract(jotterManifest(), { packageName: '@macts/jotter' })
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
      // Doc comments may show application code (a factory from @macts/sdk);
      // only the module's code matters here.
      const code = file.content.replace(/\/\*[\s\S]*?\*\//g, '')
      expect(code).not.toMatch(/from 'node:|import\('node:/)
      expect(code).not.toMatch(/'@macts\/(core|runtime|sdk|api)/)
      expect(code).not.toMatch(/'\.\.\/(client|types|index|cli)/)
    }
  })

  it('uses no platform automation terms in its own text', () => {
    for (const file of jotter.files) {
      expect(file.content).not.toMatch(/applescript|jxa|osascript|apple event/i)
    }
  })
})

describe('generateContract: records', () => {
  it('marks read-only properties readonly, and optional properties optional', () => {
    expect(contract).toContain(`export interface Note {
  /** The note's unique identifier */
  readonly uid: string
  /** The note's title */
  title: string
  /** How urgent the note is */
  priority?: Priority`)
    expect(contract).toContain('  readonly attachment?: FileValue\n')
    expect(contract).toContain('  readonly folder: ObjectReferenceVariant<Folder, Integer>\n')
  })

  it('composes each record from the property value types, wrapping optional ones', () => {
    expect(contract).toContain('const noteRecordType: ValueType<Note> = t.record({')
    expect(contract).toContain(
      "  priority: t.optional(t.enumeration(priorityMembers, { description: 'How urgent the note is' })),"
    )
    expect(contract).toContain(
      "  folder: t.reference<Folder, Integer>(() => resources, 'Folder', 'one', { description: 'The folder holding the note' }),"
    )
    expect(contract).toContain(
      "  notes: t.array(t.reference<Note, string>(() => resources, 'Note', 'one'), { description: 'The notes in the folder' }),"
    )
    expect(contract).toContain(
      "  attachment: t.optional(t.file({ description: 'The note\\'s attachment' })),"
    )
    expect(contract).toContain("}, { description: 'A note' })")
  })

  it('declares enums as string-literal unions with a member tuple for their value type', () => {
    expect(contract).toContain("export type Priority = 'low' | 'high'\n")
    expect(contract).toContain("const priorityMembers = ['low', 'high'] as const\n")
  })

  it('has no nullable values: nullability is not part of this contract', () => {
    expect(contract).not.toContain('t.nullable(')
    expect(contract).not.toContain('| null')
  })
})

describe('generateContract: inputs', () => {
  it('builds the create input from writable properties then create parameters', () => {
    // title (rw), priority (rw), rating (rw), then createNote's folderId
    // (required), title (required; overrides the property), attachment (a file
    // source, optional).
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
  })

  it('makes every update field optional and non-nullable, without the positional identifiers', () => {
    expect(contract).toContain(`export interface NoteUpdateInput {
  /** The new note's title */
  title?: string
  /** How urgent the note is */
  priority?: Priority
  /** The note's rating */
  rating?: number
  /** A file to attach */
  attachment?: FileSource
}`)
  })

  it('declares an input with no fields as an empty record', () => {
    expect(contract).toContain('export type TagCreateInput = Record<string, never>\n')
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
      '  archive(noteId: string, until?: Date, options?: CallOptions): Promise<void>\n'
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

describe('generateContract: errors', () => {
  function withChanges(change: (manifest: AppManifest) => void): GeneratedContract {
    const manifest = jotterManifest()
    change(manifest)
    return generateContract(manifest, { packageName: '@macts/jotter' })
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

  it('reports a permission that is not app:resource:operation', () => {
    const result = withChanges((manifest) => {
      const quit = manifest.commands['quit']
      if (quit) quit.permission = 'quit'
    })
    expect(result.errors).toEqual([
      'jotter.app.quit: the permission "quit" is not of the form app:resource:operation.',
    ])
  })
})

describe('contractNames and lowerCamel', () => {
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

  it('lowercases a leading capital run, keeping the capital that starts the next word', () => {
    expect(lowerCamel('Notes')).toBe('notes')
    expect(lowerCamel('OmniFocus')).toBe('omniFocus')
    expect(lowerCamel('XMLParser')).toBe('xmlParser')
    expect(lowerCamel('TV')).toBe('tv')
    expect(lowerCamel('iTerm')).toBe('iTerm')
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
      .map(({ app, position, type }) => ({ app, position, type }))
    expect(found).toEqual([
      {
        app: 'finder',
        position: 'resources.FinderWindow.properties.iconViewOptions',
        type: { resource: 'icon view options' },
      },
      {
        app: 'finder',
        position: 'resources.FinderWindow.properties.columnViewOptions',
        type: { resource: 'column view options' },
      },
      {
        app: 'system-events',
        position: 'resources.ScriptingCommand.properties.scriptingResult',
        type: { resource: 'scripting result object' },
      },
    ])
  })

  it('generate without errors', () => {
    const errors = apps.flatMap(
      ({ dir, manifest }) => generateContract(manifest, { packageName: `@macts/${dir}` }).errors
    )
    expect(errors).toEqual([])
  })

  it('embed a manifest that validates back to the same manifest', () => {
    for (const { manifest } of apps) {
      const text = moduleText(
        generateContract(manifest, { packageName: '@macts/app' }),
        CONTRACT_MANIFEST_MODULE_PATH
      )
      const json = text.slice(text.indexOf('export const manifest: unknown = ') + 33)
      expect(AppManifestSchema.parse(JSON.parse(json))).toEqual(manifest)
    }
  })
})
