/**
 * Pin test: contract-derived tool names agree with the generated MCP tools.
 *
 * Every app's generated `-server` package declares one MCP tool per operation,
 * under a name the generator chose. This test reads those names and
 * every contract's operation ids straight from the repository sources and
 * asserts that {@link toolNameFor} maps the id set onto exactly the generated
 * name set, so switching from generated tools to contract-derived tools
 * renames nothing an agent already relies on. It exists only while the
 * generated tool modules do, and goes away with them.
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#tool-names
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { OperationId } from '@macts/contracts'
import { toolNameFor } from './tool-name.js'

/** The repository's `packages/` directory, relative to this file. */
const PACKAGES_DIR = fileURLToPath(new URL('../../../', import.meta.url))

/** A generated tool's name literal: `name: 'macts__…'`. */
const GENERATED_TOOL_NAME = /\bname: '(macts__[^']+)'/g

/** A contract descriptor's id literal: `id: '<app>.<resource>.<operation>'`. */
const CONTRACT_OPERATION_ID = /\bid: '([^'.\s]+\.[^'.\s]+\.[^'.\s]+)'/g

/**
 * Operations whose generated tool name differs from the derived one, mapped to
 * the generated name. Each entry must still diverge (the test below fails
 * otherwise), so fixing the name at its source in the manifest removes the
 * entry. There are none.
 */
const EXPECTED_DIVERGENCES: ReadonlyMap<OperationId, string> = new Map<OperationId, string>()

/** Every match of `pattern`'s first group across `files`. */
function collect(files: readonly string[], pattern: RegExp): string[] {
  return files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(pattern)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]]
    )
  )
}

/** The package directories under `packages/`. */
function packageDirs(): string[] {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PACKAGES_DIR, entry.name))
}

/** Every generated MCP tool module: `packages/*-server/src/mcp/tools/*.ts`. */
function generatedToolModules(): string[] {
  return packageDirs()
    .filter((dir) => dir.endsWith('-server'))
    .map((dir) => join(dir, 'src', 'mcp', 'tools'))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) =>
      readdirSync(dir)
        .filter((file) => file.endsWith('.ts'))
        .map((file) => join(dir, file))
    )
}

/** Every generated contract module: `packages/*\/src/contract/index.ts`. */
function contractModules(): string[] {
  return packageDirs()
    .map((dir) => join(dir, 'src', 'contract', 'index.ts'))
    .filter((file) => existsSync(file))
}

/** Whether a scanned id literal has the operation id shape (the pattern guarantees it). */
function isOperationId(value: string): value is OperationId {
  return value.split('.').length === 3
}

describe('contract-derived tool names', () => {
  const generatedNames = collect(generatedToolModules(), GENERATED_TOOL_NAME)
  const operationIds = collect(contractModules(), CONTRACT_OPERATION_ID).filter(isOperationId)

  it('finds generated tools and contract operations to compare', () => {
    // An empty scan would make the comparison below vacuous.
    expect(generatedNames.length).toBeGreaterThan(0)
    expect(operationIds.length).toBeGreaterThan(0)
  })

  it('still needs every expected divergence', () => {
    for (const [id, generatedName] of EXPECTED_DIVERGENCES) {
      expect(operationIds).toContain(id)
      expect(generatedNames).toContain(generatedName)
      expect(toolNameFor(id)).not.toBe(generatedName)
    }
  })

  it('maps the contract operation ids onto exactly the generated tool names', () => {
    const derived = operationIds.map((id) => EXPECTED_DIVERGENCES.get(id) ?? toolNameFor(id))

    // No two operations may derive the same name.
    expect(new Set(derived).size).toBe(derived.length)
    expect(new Set(generatedNames).size).toBe(generatedNames.length)
    expect([...derived].sort()).toEqual([...generatedNames].sort())
  })
})
