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
import { loadManifest, parseManifestYaml } from '../manifest/loader.js'
import { NOTEBOOK_MANIFEST_YAML, notebookManifest } from './test-fixtures.js'
import type { AppManifest } from '../manifest/index.js'
import { panesManifest } from '../manifest/test-support/panes-positional.js'

/** Collection inputs remain flags; only an operation selecting an item has an item positional. */
it('distinguishes an unscoped 1.1 list flag from the get item positional', () => {
  const manifest = { ...panesManifest(), version: '1.1' as const }
  const list = manifest.commands['listWindows']
  if (list === undefined) throw new Error('Missing Window list')
  list.parameters = [{ name: 'view', type: 'string', required: true, description: 'Selected view' }]
  const caps = deriveCapabilities(manifest)
  expect(caps.find(({ name }) => name === 'panes.windows.listWindows')?.cliSnippet).toBe(
    'macts panes windows list --view <view>'
  )
  expect(caps.find(({ name }) => name === 'panes.windows.getWindow')?.cliSnippet).toBe(
    'macts panes windows get <id>'
  )
})

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

  it('derives the route permission for a command that declares none (issue #148)', () => {
    // The fixture's `quit` command omits `permission`. The server enforces the
    // permission derived from its route, `notebook.app.quit`, so discovery
    // reports `notebook:app:quit` (app : `app` scope : route segment) too.
    expect(byName.get('notebook.app.quit')?.permission).toBe('notebook:app:quit')
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

/**
 * The Notebook fixture plus three Note commands that exercise each source of a
 * capability's permission. `commands` is the fixture's last section, so these
 * entries extend it.
 */
const ROUTE_PERMISSION_MANIFEST_YAML = `${NOTEBOOK_MANIFEST_YAML}
  getNote:
    name: get
    description: Get a note (no routeName, no permission)
    scope: resource
    resourceType: Note
    parameters:
      - name: id
        type: string
        description: The note to get
        required: true
  findNote:
    name: find
    routeName: lookup
    description: Find a note (routeName, no permission)
    scope: resource
    resourceType: Note
    parameters: []
  archiveNote:
    name: archive
    description: Archive a note (an explicit permission unlike the derived one)
    scope: resource
    resourceType: Note
    parameters: []
    permission: notebook:notes:write
`

describe('deriveCapabilities — permission from the resolved route (issue #148)', () => {
  const caps = deriveCapabilities(parseManifestYaml(ROUTE_PERMISSION_MANIFEST_YAML))
  const byName = new Map(caps.map((c) => [c.name, c]))

  it('derives the permission from the command key when there is no routeName', () => {
    // The route is `notebook.notes.getNote`, so the server enforces
    // `notebook:notes:getNote`, not `notebook:notes:get`.
    expect(byName.get('notebook.notes.getNote')?.permission).toBe('notebook:notes:getNote')
  })

  it('derives the permission from the routeName when there is one', () => {
    expect(byName.get('notebook.notes.lookup')?.permission).toBe('notebook:notes:lookup')
  })

  it('keeps an explicit permission that differs from the derived one', () => {
    expect(byName.get('notebook.notes.archiveNote')?.permission).toBe('notebook:notes:write')
  })

  it('fails loudly when a capability has no resolved route', () => {
    // A resource whose key differs from its `name`: the capability traversal
    // matches commands by `name`, the route resolver by key, so they disagree
    // on the operation. The schema does not check this, so build it directly.
    const base = notebookManifest()
    const note = base.resources['Note']
    if (note === undefined) throw new Error('the fixture has no Note resource')
    const disagreeing: AppManifest = { ...base, resources: { NoteKey: note } }
    expect(() => deriveCapabilities(disagreeing)).toThrow(
      'Manifest "Notebook": command "list" on resource "Note" has no resolved route'
    )
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

describe('deriveCapabilities — paging inputs on real manifests', () => {
  const REMINDERS_MANIFEST = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../manifests/reminders/app.yaml'
  )

  it('shows pageSize and cursor on reminders.reminders.list, whose id is claimed unique and whose range reads passed', async () => {
    const caps = deriveCapabilities(await loadManifest(REMINDERS_MANIFEST))
    const schema = caps.find((c) => c.name === 'reminders.reminders.list')?.inputSchema

    expect(Object.keys(schema?.properties ?? {}).sort()).toEqual(['cursor', 'listId', 'pageSize'])
    expect(schema?.properties?.['pageSize']).toMatchObject({ minimum: 1, maximum: 100 })
  })

  it.each(['calendar.events.list', 'calendar.calendars.list'])(
    'shows neither paging input on %s, whose identifier is claimed not unique',
    async (name) => {
      const caps = deriveCapabilities(await loadManifest(CALENDAR_MANIFEST))
      const schema = caps.find((c) => c.name === name)?.inputSchema

      expect(schema).toBeDefined()
      expect(schema?.properties).not.toHaveProperty('pageSize')
      expect(schema?.properties).not.toHaveProperty('cursor')
    }
  )
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

/** Distinct read routes remain independently discoverable and use admitted CLI selections. */
it('discovers every Session operation by its operation identity and generated CLI address', async () => {
  const manifest = await loadManifest(
    fileURLToPath(new URL('../../../../manifests/iterm/app.yaml', import.meta.url))
  )
  const sessions = buildCapabilityRegistry([manifest]).capabilities.filter(
    ({ resource }) => resource === 'sessions'
  )
  expect(
    sessions.map(({ name, mcpToolName, cliSnippet }) => [name, mcpToolName, cliSnippet])
  ).toEqual([
    [
      'iterm.sessions.getWithinTab',
      'macts__iterm__sessions_get_within_tab',
      'macts iterm windows tabs sessions get --window-id <windowId> --tab-index <tabIndex> <sessionId>',
    ],
    [
      'iterm.sessions.list',
      'macts__iterm__sessions_list',
      'macts iterm windows tabs sessions list --window-id <windowId> --tab-index <tabIndex>',
    ],
    [
      'iterm.sessions.resolve',
      'macts__iterm__sessions_resolve',
      // Addressed by its Window alone, searching every Tab of it, so it sits
      // under the Window, not under a Tab.
      'macts iterm windows sessions resolve --window-id <windowId> <sessionId>',
    ],
    // The write is named by its route on discovery and MCP, and by its command
    // name on the CLI, as the generated CLI command is (`sessions write`). It
    // has the same Window-scoped address as the resolve, so the same place.
    [
      'iterm.sessions.writeText',
      'macts__iterm__sessions_write_text',
      'macts iterm windows sessions write --window-id <windowId> <sessionId> --text <text>',
    ],
  ])
  delete manifest.commands['getSession']
  expect(
    deriveCapabilities(manifest).find(({ name }) => name === 'iterm.sessions.resolve')?.cliSnippet
  ).toBe('macts iterm windows sessions get --window-id <windowId> <sessionId>')
})
