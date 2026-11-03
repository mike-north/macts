/**
 * Integration: discovery and the MCP adapter name every real operation's tool
 * the same way.
 *
 * Two derivations produce an operation's MCP tool name. The capability
 * registry builds `Capability.mcpToolName` from the manifest, and the MCP
 * adapter serves each contract operation under `toolNameFor(op.id)`. An agent
 * that finds a capability through discovery then calls the tool it names, so
 * the two must agree for every operation.
 *
 * The registry is built from every real manifest with `buildCapabilityRegistry`,
 * as the CLI and MCP discovery surfaces build it. Each contract operation is
 * matched to its capability by its manifest target, not by its id: the target's
 * command gives the capability's operation, and its resource (or the
 * application) gives the capability's resource segment. Every operation that
 * can be called must match exactly one capability, every capability must be
 * matched, and the matched pair must carry the same tool name. An operation
 * marked `unavailable` (a required input admits no value) has neither a tool
 * nor a capability.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D9)
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#tool-names
 */

import { beforeAll, describe, expect, it } from 'vitest'
import {
  buildCapabilityRegistry,
  normalizeResourceRouteSegment,
  type AppManifest,
  type Capability,
} from '@macts/core'
import type { OperationTarget } from '@macts/contracts'
import { toolNameFor } from '@macts/mcp'
import { loadRealApps, type RealApp } from '../src/real-contracts.js'

/** The resource segment of application-scoped capabilities. */
const APP_RESOURCE = 'app'

let apps: RealApp[] = []
let capabilities: readonly Capability[] = []

beforeAll(async () => {
  apps = await loadRealApps()
  capabilities = buildCapabilityRegistry(apps.map(({ manifest }) => manifest)).capabilities
})

/** A capability's key within its app: its resource segment and operation. */
function capabilityKey(resource: string, operation: string): string {
  return `${resource} ${operation}`
}

/**
 * The key of the capability an operation's manifest target denotes.
 *
 * @throws when the target names a command or resource the manifest lacks.
 */
function targetKey(manifest: AppManifest, target: OperationTarget): string {
  const command = manifest.commands[target.command]
  if (command === undefined) throw new Error(`no command "${target.command}"`)
  if (target.resource === undefined) return capabilityKey(APP_RESOURCE, command.name)
  const resource = manifest.resources[target.resource]
  if (resource === undefined) throw new Error(`no resource "${target.resource}"`)
  return capabilityKey(normalizeResourceRouteSegment(resource.plural), command.name)
}

describe('MCP tool names of every real operation', () => {
  it('agree between the capability registry and the MCP adapter', () => {
    let compared = 0
    for (const { name, manifest, contract } of apps) {
      const own = capabilities.filter(
        (capability) => capability.appBundleId === manifest.app.bundleId
      )
      const byKey = new Map(
        own.map((capability) => [
          capabilityKey(capability.resource, capability.operation),
          capability,
        ])
      )
      const matched = new Set<Capability>()

      for (const operation of Object.values(contract.operations)) {
        const label = `${name}: ${operation.id}`
        if (operation.unavailable !== undefined) {
          const capability = byKey.get(targetKey(manifest, operation.target))
          expect(capability, `${label} is unavailable but has a capability`).toBeUndefined()
          continue
        }
        const capability = byKey.get(targetKey(manifest, operation.target))
        expect(capability, `${label} has no capability`).toBeDefined()
        if (capability === undefined) continue
        expect(matched.has(capability), `${label} shares ${capability.name}`).toBe(false)
        matched.add(capability)
        expect(capability.mcpToolName, label).toBe(toolNameFor(operation.id))
        compared++
      }

      const unmatched = own.filter((capability) => !matched.has(capability)).map((c) => c.name)
      expect(unmatched, `${name}: capabilities with no contract operation`).toEqual([])
    }
    // Guards against a vacuous pass: the shipped contracts have hundreds of operations.
    expect(compared).toBeGreaterThan(300)
    expect(compared).toBe(capabilities.length)
  })

  it('leave out exactly the operations a required input makes unavailable', () => {
    // Mail has no operation that gets one account, so synchronize's required
    // reference admits no value. Contacts gets one person (`people.get`), so
    // its actions, whose required `for` is a person, stay available.
    const unavailable = apps.flatMap(({ contract }) =>
      Object.values(contract.operations).flatMap((operation) =>
        operation.unavailable === undefined
          ? []
          : [{ id: operation.id, positions: operation.unavailable.positions }]
      )
    )
    expect(unavailable).toEqual([{ id: 'mail.app.synchronize', positions: ['with'] }])
  })
})
