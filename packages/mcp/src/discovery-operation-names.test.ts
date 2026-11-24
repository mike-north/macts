/**
 * Integration: format 1.0 discovery names the operations a runtime serves.
 *
 * A command's operation segment is its `routeName` when it declares one, else
 * its key in `manifest.commands` (`commandRouteSegment`), never its verb
 * `name`. A capability's `name`, `operation` and `mcpToolName` must therefore
 * name the operation and MCP tool that registering the same manifest serves,
 * including a 1.0 command keyed `listNotes` whose verb is `list`.
 *
 * Expected values are written by hand from those rules: the Notebook commands
 * below are served as `notebook.notes.listNotes` /
 * `macts__notebook__notes_list_notes`, `notebook.notes.deleteNote` /
 * `macts__notebook__notes_delete_note` and `notebook.app.syncAll` /
 * `macts__notebook__app_sync_all`.
 *
 * @see ../../core/src/manifest/route.ts
 * @see ./adapter/tool-name.ts
 */

import { describe, expect, it } from 'vitest'
import { buildCapabilityRegistry, parseManifestYaml } from '@macts/core'
import type { WireValue } from '@macts/contracts'
import { ALLOW_ALL_POLICY, createRuntime } from '@macts/runtime'
import { createMcpAdapter } from './adapter/adapter.js'

const yaml = String.raw

/** A format 1.0 manifest whose command keys differ from their verbs and declare no `routeName`. */
const MANIFEST = parseManifestYaml(yaml`
version: '1.0'
app: { bundleId: com.example.notebook, name: Notebook }
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    identifiers: [{ property: id, primary: true, targeting: byId }]
    properties:
      id: { access: r, type: string, description: Note id }
hierarchy:
  children:
    notes: { resource: Note, access: rw, description: Notes }
commands:
  listNotes:
    name: list
    description: List all notes
    scope: resource
    resourceType: Note
    parameters: []
  deleteNote:
    name: delete
    description: Delete a note
    scope: resource
    resourceType: Note
    parameters:
      - { name: id, type: string, description: The note, required: true }
  syncAll:
    name: sync
    description: Synchronize every note
    scope: application
    parameters: []
`)

const SILENT = { error: () => undefined, warn: () => undefined, info: () => undefined }

describe('format 1.0 discovery of key-named commands', () => {
  it('advertises the operation ids and MCP tool names the runtime registers', () => {
    const runtime = createRuntime({
      executor: {
        provider: 'discovery-operation-names-stub',
        execute: () => Promise.resolve<WireValue>({}),
        resolve: () => Promise.resolve<WireValue>({}),
      },
      verifier: { verify: () => Promise.reject(new Error('no calls are made')) },
      governance: { policy: ALLOW_ALL_POLICY },
      logger: SILENT,
    })
    runtime.registerManifest(MANIFEST)
    const served = createMcpAdapter(runtime, { logger: SILENT })
      .listTools()
      .map(({ name }) => name)
    const advertised = buildCapabilityRegistry([MANIFEST])
      .capabilities.map(({ name, operation, mcpToolName }) => [name, operation, mcpToolName])
      .sort()

    expect(advertised).toEqual([
      ['notebook.app.syncAll', 'syncAll', 'macts__notebook__app_sync_all'],
      ['notebook.notes.deleteNote', 'deleteNote', 'macts__notebook__notes_delete_note'],
      ['notebook.notes.listNotes', 'listNotes', 'macts__notebook__notes_list_notes'],
    ])
    expect(
      runtime
        .operations()
        .map(({ descriptor }) => descriptor.id)
        .sort()
    ).toEqual(advertised.map(([name]) => name))
    expect([...served].sort()).toEqual(advertised.map(([, , tool]) => tool).sort())
  })
})
