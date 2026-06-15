/**
 * Tests for the per-app capability-metadata module generator.
 *
 * Asserts the emitted module exposes machine-readable risk metadata sourced
 * from the manifest. Expected values are hand-derived from the Notebook
 * fixture, not from program output.
 */

import { describe, expect, it } from 'vitest'
import { generateCapabilitiesModule } from './index.js'
import { notebookManifest } from '../../capabilities/test-fixtures.js'

describe('generateCapabilitiesModule', () => {
  const source = generateCapabilitiesModule(notebookManifest())

  it('exports a typed capabilities array and CapabilityMetadata interface', () => {
    expect(source).toContain('export const capabilities: readonly CapabilityMetadata[]')
    expect(source).toContain('export interface CapabilityMetadata')
    expect(source).toContain('export type CapabilityRisk')
  })

  it('embeds each capability with its risk classification', () => {
    // Parse out the data literal and assert structurally.
    const data = extractCapabilitiesData(source)
    const byName = new Map(data.map((c) => [c.name, c]))
    expect(byName.get('notebook.notes.create')?.risk).toBe('write')
    expect(byName.get('notebook.notes.delete')?.risk).toBe('delete')
    expect(byName.get('notebook.app.doScript')?.risk).toBe('execute')
    expect(byName.get('notebook.app.quit')?.risk).toBe('system-change')
  })

  it('embeds the required permission, or null when none is declared', () => {
    const data = extractCapabilitiesData(source)
    const byName = new Map(data.map((c) => [c.name, c]))
    expect(byName.get('notebook.notes.create')?.permission).toBe('notebook:notes:create')
    // The fixture's `quit` declares no permission → serialized as null.
    expect(byName.get('notebook.app.quit')?.permission).toBeNull()
  })

  it('embeds the app dependency on every entry', () => {
    const data = extractCapabilitiesData(source)
    for (const cap of data) {
      expect(cap.app).toBe('notebook')
      expect(cap.appBundleId).toBe('com.example.notebook')
    }
  })

  it('does not leak automation-mechanism terminology', () => {
    expect(source).not.toMatch(/applescript|jxa|osascript/i)
  })
})

interface EmbeddedCapability {
  name: string
  app: string
  appBundleId: string
  risk: string
  permission: string | null
}

/**
 * Extract the embedded `capabilities` data literal from the generated module
 * by evaluating just the array expression. The generator emits a JSON-style
 * literal, so JSON.parse over the array slice is sufficient and avoids `eval`.
 */
function extractCapabilitiesData(source: string): EmbeddedCapability[] {
  const marker = 'export const capabilities: readonly CapabilityMetadata[] = '
  const start = source.indexOf(marker)
  if (start === -1) throw new Error('capabilities literal not found')
  // Skip past the marker (which itself contains `[]`) to the data literal.
  const arrayStart = source.indexOf('[', start + marker.length)
  const arrayEnd = source.lastIndexOf(']')
  const literal = source.slice(arrayStart, arrayEnd + 1)
  return JSON.parse(literal) as EmbeddedCapability[]
}
