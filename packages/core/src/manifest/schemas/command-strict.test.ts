/**
 * Tests that a manifest command fails closed on a field the schema does not
 * know: a runtime reading a manifest written for a newer schema (one that adds
 * a command field such as a marker that withholds the command) must reject it
 * rather than strip the field and offer the command anyway.
 *
 * Expected outcomes are derived from that guarantee: an unrecognised key on a
 * command, a command parameter or a permission-history entry is a parse
 * error that names the key, and a manifest that carries one does not load.
 *
 * @see https://github.com/mike-north/macts/issues/339
 */

import { describe, expect, it } from 'vitest'
import { parseManifestYaml } from '../loader.js'
import { CommandParameterSchema, CommandSchema, PermissionHistoryEntrySchema } from './command.js'

const COMMAND = { name: 'get', description: 'Get a thing', scope: 'application' } as const

describe('command schemas reject unknown fields (#339)', () => {
  it('rejects an unknown command field and names it', () => {
    const result = CommandSchema.safeParse({ ...COMMAND, withheld: { reason: 'later' } })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('withheld')
  })

  it('rejects an unknown field on a command parameter', () => {
    const result = CommandParameterSchema.safeParse({
      name: 'id',
      type: 'string',
      description: 'An id',
      futureMarker: true,
    })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('futureMarker')
  })

  it('rejects an unknown field on a permission-history entry', () => {
    const result = PermissionHistoryEntrySchema.safeParse({
      version: '0.1.0',
      permission: 'a:b:c',
      changed: '2026-01-01',
      futureMarker: true,
    })
    expect(result.success).toBe(false)
  })

  it('still accepts a command with only known fields', () => {
    expect(CommandSchema.safeParse({ ...COMMAND, risk: 'read' }).success).toBe(true)
  })

  it('rejects a manifest whose command carries an unknown field', () => {
    const yaml = `
name: Example
bundleId: com.example.app
version: 0.1.0
commands:
  get:
    name: get
    description: Get a thing
    scope: application
    withheld: true
`
    expect(() => parseManifestYaml(yaml)).toThrow(/withheld/)
  })
})
