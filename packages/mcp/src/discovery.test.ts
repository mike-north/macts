/**
 * Tests for the built-in MCP capability-discovery tool.
 *
 * Builds a registry from a small hand-written manifest and asserts the tool's
 * search/inspect/no-match behavior. Expected values are derived from the
 * manifest and the discovery contract, not from program output.
 */

import { describe, expect, it } from 'vitest'
import { buildCapabilityRegistry, parseManifestYaml, type GovernanceFilter } from '@macts/core'
import { createDiscoveryTool, DISCOVERY_TOOL_NAME } from './discovery.js'

const yaml = String.raw

const MANIFEST_YAML = yaml`
version: '1.0'
app:
  bundleId: com.example.notebook
  name: Notebook
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    identifiers:
      - property: id
        primary: true
    properties:
      id:
        access: r
        type: string
        description: Note id
      title:
        access: rw
        type: string
        description: Title
hierarchy:
  children:
    notes:
      resource: Note
      access: rw
      description: Notes
commands:
  listNotes:
    name: list
    description: List all notes
    scope: resource
    resourceType: Note
    parameters: []
    permission: notebook:notes:list
  deleteNote:
    name: delete
    description: Delete a note
    scope: resource
    resourceType: Note
    parameters: []
    permission: notebook:notes:delete
`

const registry = buildCapabilityRegistry([parseManifestYaml(MANIFEST_YAML)])

/** Invoke the discovery tool handler and return the parsed result. */
async function discover(args: unknown): Promise<Record<string, unknown>> {
  const tool = createDiscoveryTool({ registry })
  return (await tool.handler(args)) as Record<string, unknown>
}

describe('createDiscoveryTool', () => {
  it('exposes the canonical discovery tool name and an object input schema', () => {
    const tool = createDiscoveryTool({ registry })
    expect(tool.name).toBe(DISCOVERY_TOOL_NAME)
    expect(tool.inputSchema.type).toBe('object')
  })

  it('ranks matches for an intent with the call snippet', async () => {
    const result = await discover({ intent: 'list notes' })
    const results = result['results'] as { name: string; call: string }[]
    expect(results[0]?.name).toBe('notebook.notes.list')
    expect(results[0]?.call).toBe('macts notebook notes list')
  })

  it('inspects a capability by exact name', async () => {
    const result = await discover({ capability: 'notebook.notes.delete' })
    expect(result['found']).toBe(true)
    const cap = result['capability'] as { risk: string; permission: string }
    expect(cap.risk).toBe('delete')
    expect(cap.permission).toBe('notebook:notes:delete')
  })

  it('returns found=false for an unknown capability name', async () => {
    const result = await discover({ capability: 'notebook.notes.frobnicate' })
    expect(result['found']).toBe(false)
  })

  it('surfaces "generate a new capability" when nothing matches', async () => {
    const result = await discover({ intent: 'frobnicate the quux' })
    expect(result['results']).toEqual([])
    expect(result['nextMove']).toBe('generate-capability')
    expect(String(result['message'])).toMatch(/macts generate/)
  })

  it('errors when neither intent nor capability is provided', async () => {
    const result = await discover({})
    expect(result['error']).toBeDefined()
  })

  it('applies the active governance filter, dropping denied capabilities', async () => {
    const denyDeletes: GovernanceFilter = {
      evaluate: (cap) =>
        cap.risk === 'delete' ? { disposition: 'deny' } : { disposition: 'allow' },
    }
    const tool = createDiscoveryTool({ registry, governance: denyDeletes })
    const result = (await tool.handler({ intent: 'note' })) as {
      results: { name: string }[]
    }
    expect(result.results.some((r) => r.name === 'notebook.notes.delete')).toBe(false)
    expect(result.results.some((r) => r.name === 'notebook.notes.list')).toBe(true)
  })

  it('never leaks automation-mechanism terminology in results', async () => {
    const result = await discover({ intent: 'list notes' })
    expect(JSON.stringify(result)).not.toMatch(/applescript|jxa|osascript/i)
  })
})
