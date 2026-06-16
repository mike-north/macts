/**
 * Tests for capability registry derivation.
 *
 * Expected capability fields are derived by hand from the Notebook fixture
 * manifest and the registry rules in `registry.ts`, NOT from program output.
 *
 * @see ../../../VISION.md (§7.1 Capability registry)
 */

import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { deriveCapabilities, buildCapabilityRegistry } from './registry.js'
import { loadManifest } from '../manifest/loader.js'
import { notebookManifest } from './test-fixtures.js'

/** Repo-root-relative path to the calendar manifest (a real nested hierarchy). */
const CALENDAR_MANIFEST = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../manifests/calendar/app.yaml'
)

describe('deriveCapabilities', () => {
  const caps = deriveCapabilities(notebookManifest())
  const byName = new Map(caps.map((c) => [c.name, c]))

  it('derives one capability per command (4 resource + 2 app = 6)', () => {
    expect(caps).toHaveLength(6)
  })

  it('returns capabilities in stable, name-sorted order', () => {
    const names = caps.map((c) => c.name)
    expect(names).toEqual([...names].sort())
  })

  it('builds the stable dotted name <app>.<resource>.<operation>', () => {
    expect(byName.has('notebook.notes.list')).toBe(true)
    expect(byName.has('notebook.notes.create')).toBe(true)
    expect(byName.has('notebook.app.doScript')).toBe(true)
    expect(byName.has('notebook.app.quit')).toBe(true)
  })

  it('carries app dependency (name + bundle id) on every capability', () => {
    for (const cap of caps) {
      expect(cap.app).toBe('notebook')
      expect(cap.appBundleId).toBe('com.example.notebook')
    }
  })

  it('exposes the required permission in app:resource:operation form', () => {
    expect(byName.get('notebook.notes.create')?.permission).toBe('notebook:notes:create')
    expect(byName.get('notebook.notes.delete')?.permission).toBe('notebook:notes:delete')
    expect(byName.get('notebook.app.doScript')?.permission).toBe('notebook:app:doScript')
  })

  it('reports undefined permission for a command that declares none', () => {
    // The fixture's `quit` command intentionally omits `permission`.
    expect(byName.get('notebook.app.quit')?.permission).toBeUndefined()
  })

  it('classifies risk deterministically from each operation', () => {
    expect(byName.get('notebook.notes.list')?.risk).toBe('read')
    expect(byName.get('notebook.notes.create')?.risk).toBe('write')
    expect(byName.get('notebook.notes.delete')?.risk).toBe('delete')
    expect(byName.get('notebook.notes.share')?.risk).toBe('send')
    expect(byName.get('notebook.app.doScript')?.risk).toBe('execute')
    expect(byName.get('notebook.app.quit')?.risk).toBe('system-change')
  })

  it('produces an input schema with required parameters', () => {
    const create = byName.get('notebook.notes.create')
    expect(create?.inputSchema.type).toBe('object')
    expect(create?.inputSchema.required).toContain('title')
  })

  it('builds a CLI snippet that references only the public macts surface', () => {
    // Resource capability: macts <app> <resource> <operation> --<flag> <value>.
    // The create input schema requires both the `title` parameter and the
    // writable `body` property (per the MCP create-schema rules), so both
    // surface as required flags.
    expect(byName.get('notebook.notes.create')?.cliSnippet).toBe(
      'macts notebook notes create --title <title> --body <body>'
    )
    // App-scoped capability omits the resource path segment and kebab-cases the
    // operation (matching the generated CLI command path `[app, kebab(op)]`).
    expect(byName.get('notebook.app.quit')?.cliSnippet).toBe('macts notebook quit')
    expect(byName.get('notebook.app.doScript')?.cliSnippet).toBe(
      'macts notebook do-script --source <source>'
    )
  })

  it('never leaks automation-mechanism terminology into any snippet', () => {
    const banned = /applescript|jxa|osascript|javascript for automation/i
    for (const cap of caps) {
      expect(cap.cliSnippet).not.toMatch(banned)
    }
  })

  it('derives the matching MCP tool name', () => {
    expect(byName.get('notebook.notes.list')?.mcpToolName).toBe('macts__notebook__notes_list')
    expect(byName.get('notebook.app.doScript')?.mcpToolName).toBe('macts__notebook__app_do_script')
  })

  it('derives discovery keywords from name, resource, operation, and description', () => {
    const create = byName.get('notebook.notes.create')
    expect(create?.keywords).toEqual(expect.arrayContaining(['create', 'note', 'notebook']))
  })
})

describe('deriveCapabilities — nested hierarchy CLI snippet (calendar)', () => {
  it('reflects the full hierarchy path and parent-id flag the CLI emits', async () => {
    const manifest = await loadManifest(CALENDAR_MANIFEST)
    const caps = deriveCapabilities(manifest)
    const byName = new Map(caps.map((c) => [c.name, c]))
    // Events live under calendars in the hierarchy, so the CLI invocation is
    // `macts calendar calendars events list --calendar-id <id>` — matching the
    // generated CLI command path ['calendar','calendars','events','list'].
    expect(byName.get('calendar.events.list')?.cliSnippet).toBe(
      'macts calendar calendars events list --calendar-id <id>'
    )
    // App-scoped command kebab-cases the operation: switchView → switch-view.
    expect(byName.get('calendar.app.switchView')?.cliSnippet).toBe(
      'macts calendar switch-view --to <to>'
    )
  })
})

describe('buildCapabilityRegistry', () => {
  it('indexes capabilities by stable name for O(1) lookup', () => {
    const registry = buildCapabilityRegistry([notebookManifest()])
    expect(registry.get('notebook.notes.create')?.operation).toBe('create')
    expect(registry.names).toContain('notebook.notes.create')
  })

  it('returns undefined for an unknown capability name', () => {
    const registry = buildCapabilityRegistry([notebookManifest()])
    expect(registry.get('notebook.notes.frobnicate')).toBeUndefined()
    expect(registry.get('')).toBeUndefined()
  })

  it('produces a deterministic, name-sorted capability list', () => {
    const a = buildCapabilityRegistry([notebookManifest()])
    const b = buildCapabilityRegistry([notebookManifest()])
    expect(a.names).toEqual(b.names)
    expect(a.names).toEqual([...a.names].sort())
  })

  it('yields an empty registry for no manifests', () => {
    const registry = buildCapabilityRegistry([])
    expect(registry.capabilities).toHaveLength(0)
    expect(registry.names).toHaveLength(0)
  })
})
