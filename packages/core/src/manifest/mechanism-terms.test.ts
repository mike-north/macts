/**
 * Tests for the rule that keeps automation-mechanism terminology out of the
 * text a manifest carries to macts surfaces.
 *
 * Expected outcomes follow from the rule as stated in `./mechanism-terms.ts`:
 * every string a manifest declares reaches some surface (capability
 * discovery, contracts, the CLI, clients and MCP tools), except the
 * dictionary's own words recorded as evidence and the extraction notes. The
 * registry-wide check reads every shipped manifest, so it covers each
 * capability's description, input and output schema text, CLI snippet and
 * MCP tool name.
 */

import { describe, expect, it } from 'vitest'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MECHANISM_TERMS, findMechanismTermIssues } from './mechanism-terms.js'
import { parseManifestYaml } from './loader.js'
import { loadManifestsFromDir } from '../capabilities/loader.js'
import { buildCapabilityRegistry } from '../capabilities/registry.js'
import { NOTEBOOK_MANIFEST_YAML, notebookManifest } from '../capabilities/test-fixtures.js'
import type { AppManifest } from './schemas/index.js'

const yaml = String.raw

/** The repository's shipped manifests root. */
const MANIFESTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../manifests')

describe('MECHANISM_TERMS', () => {
  it.each([
    'AppleScript',
    'applescript',
    'JXA',
    'osascript',
    'JavaScript for Automation',
    'compiled AppleScripts',
  ])('matches %s', (text) => {
    expect(text).toMatch(MECHANISM_TERMS)
  })

  it.each(['script', 'JavaScript', 'Script Editor', 'the scripting language'])(
    'does not match the ordinary word %s',
    (text) => {
      expect(text).not.toMatch(MECHANISM_TERMS)
    }
  )
})

describe('findMechanismTermIssues', () => {
  it('finds nothing in a manifest whose text names only what the app does', () => {
    expect(findMechanismTermIssues(notebookManifest())).toEqual([])
  })

  it('reports a command parameter description that names the mechanism', () => {
    const manifest = notebookManifest()
    const quit = manifest.commands['quit']
    if (quit === undefined) throw new Error('the fixture has no quit command')
    quit.parameters = [
      {
        name: 'each',
        type: 'string',
        required: true,
        description: "the class. Keyword 'each' is optional in AppleScript",
      },
    ]
    const issues = findMechanismTermIssues(manifest)
    expect(issues.map(({ path }) => path)).toEqual([
      ['commands', 'quit', 'parameters', 0, 'description'],
    ])
    expect(issues[0]?.message).toContain('AppleScript')
  })

  it('reports a property description, a resource description and a command description', () => {
    const manifest = notebookManifest()
    const note = manifest.resources['Note']
    const body = note?.properties['body']
    const quit = manifest.commands['quit']
    if (note === undefined || body === undefined || quit === undefined) {
      throw new Error('the fixture lacks Note, its body or quit')
    }
    note.description = 'A note, scriptable from JXA'
    body.description = 'Body text, as osascript reads it'
    quit.description = 'Quit, as JavaScript for Automation does'
    const paths = findMechanismTermIssues(manifest).map(({ path }) => path.join('.'))
    expect(paths).toEqual(
      expect.arrayContaining([
        'resources.Note.description',
        'resources.Note.properties.body.description',
        'commands.quit.description',
      ])
    )
    expect(paths).toHaveLength(3)
  })

  it('reports a suite description, which the embedded contract carries', () => {
    const manifest: AppManifest = {
      ...notebookManifest(),
      suites: [
        {
          name: 'Notebook Suite',
          description: 'AppleScript commands for Notebook',
          resources: [],
          commands: [],
          enums: [],
        },
      ],
    }
    expect(findMechanismTermIssues(manifest).map(({ path }) => path)).toEqual([
      ['suites', 0, 'description'],
    ])
  })

  it('reports a declaration whose name names the mechanism', () => {
    const manifest = notebookManifest()
    const note = manifest.resources['Note']
    const body = note?.properties['body']
    if (note === undefined || body === undefined) throw new Error('the fixture lacks Note.body')
    note.properties['applescriptSource'] = { ...body, description: 'The source' }
    expect(findMechanismTermIssues(manifest).map(({ path }) => path)).toEqual([
      ['resources', 'Note', 'properties', 'applescriptSource'],
    ])
  })

  it('accepts the dictionary’s own words recorded as evidence', () => {
    // Evidence quotes the dictionary verbatim so a reader can check it; it is
    // provenance, not text macts presents as its own.
    const manifest = parseManifestYaml(yaml`${NOTEBOOK_MANIFEST_YAML}
  performNoteAction:
    name: performNoteAction
    description: A handler Notebook sends to a user's script when a rule runs it.
    scope: application
    unsupported:
      evidence:
        source: dictionary
        bundleId: com.example.notebook
        appVersion: '1.0'
        osVersion: '27.3'
        term: perform note action
        finding: handler
        statement: Script handler invoked by rules that execute AppleScripts.
    parameters: []
`)
    expect(findMechanismTermIssues(manifest)).toEqual([])
  })

  it('accepts extraction notes, which record how the manifest was made', () => {
    const manifest: AppManifest = {
      ...notebookManifest(),
      extraction: {
        openQuestions: [
          {
            question: 'Are the codes right?',
            suggestions: ['Verify codes against the AppleScript dictionary'],
          },
        ],
      },
    }
    expect(findMechanismTermIssues(manifest)).toEqual([])
  })

  it('still checks a declaration that happens to be named "evidence"', () => {
    // Only the evidence *field* is provenance; a property keyed `evidence` is
    // a declaration like any other and reaches every surface.
    const manifest = notebookManifest()
    const note = manifest.resources['Note']
    const body = note?.properties['body']
    if (note === undefined || body === undefined) throw new Error('the fixture lacks Note.body')
    note.properties['evidence'] = { ...body, description: 'Evidence, read through JXA' }
    expect(findMechanismTermIssues(manifest).map(({ path }) => path)).toEqual([
      ['resources', 'Note', 'properties', 'evidence', 'description'],
    ])
  })
})

describe('manifest validation applies the rule', () => {
  it('rejects a manifest whose text names the mechanism, naming where', () => {
    const leaking = NOTEBOOK_MANIFEST_YAML.replace(
      'description: A note in the notebook',
      'description: A note, as AppleScript sees it'
    )
    expect(leaking).not.toBe(NOTEBOOK_MANIFEST_YAML)
    expect(() => parseManifestYaml(leaking)).toThrow(/resources\.Note\.description/)
  })
})

describe('every shipped manifest and capability', () => {
  it('loads every shipped manifest, so none carries the mechanism into its text', async () => {
    const { manifests, errors } = await loadManifestsFromDir(MANIFESTS_DIR)
    expect(errors).toEqual([])
    expect(manifests.length).toBeGreaterThan(30)
  })

  it('never names the mechanism in any field of any capability', async () => {
    // A manifest that fails to load contributes no capabilities; the test
    // above reports any such failure.
    const { manifests } = await loadManifestsFromDir(MANIFESTS_DIR)
    const registry = buildCapabilityRegistry(manifests)
    expect(registry.capabilities.length).toBeGreaterThan(100)
    const leaking = registry.capabilities
      .filter((capability) => MECHANISM_TERMS.test(JSON.stringify(capability)))
      .map(({ name }) => name)
    expect(leaking).toEqual([])
  })
})
