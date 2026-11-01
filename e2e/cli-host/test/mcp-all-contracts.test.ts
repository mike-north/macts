/**
 * UAT: every app whose host package is in the workspace registers with
 * `macts --mcp`, and every one of its operations is listed as a tool.
 *
 * The macts home links every workspace `@macts/<app>-server` package, and its
 * `@macts/<app>` package, into the plugins directory, the layout
 * `macts mcp install <app>` produces for each app. The real built CLI is then
 * started over stdio with a real MCP client. A generated contract that cannot
 * be registered, or whose input contract cannot be represented as an MCP tool
 * input schema, therefore fails here, in CI, rather than at a user's startup.
 *
 * Expected values come from the decision record and each app's own contract:
 *
 * - phases/13 D5: every installed host package is registered from its
 *   generated contract; an app that fails is reported, not served.
 * - phases/13 D9 and `toolNameFor`: one tool per registered operation, named
 *   `macts__<app>__…` from the operation id, with the app segment kept
 *   exactly as it is.
 * - The number of operations of each app is the number of entries in its
 *   contract's `operations` table, read from the same built package the
 *   server loads.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D5, D9)
 * @see https://github.com/mike-north/macts/issues/101
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  connectMcpStdio,
  createKey,
  createMactsHome,
  type MactsHome,
  type McpSession,
} from '../src/harness.js'

/** Starting the server loads every app's contract and manifest. */
const SETUP_TIMEOUT_MS = 180_000

let home: MactsHome
let session: McpSession

beforeAll(async () => {
  home = createMactsHome('all-workspace-apps')
  const token = await createKey(home, 'notes:notes:list')
  const started = performance.now()
  session = await connectMcpStdio(home, { MACTS_TEST_EXECUTOR: 'stub', MACTS_API_KEY: token })
  // Reported so the cost of serving every app stays visible in CI output.
  console.info(
    `macts --mcp with ${String(home.apps.length)} apps started in ${String(Math.round(performance.now() - started))} ms`
  )
}, SETUP_TIMEOUT_MS)

afterAll(async () => {
  await session.close()
  home.dispose()
})

/** The `operations` table of an app's built contract, loaded from its package. */
async function operationCount(app: string): Promise<number> {
  const packageDir = join(home.path, 'plugins', 'node_modules', '@macts', app)
  const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf-8')) as {
    exports: Record<string, { import: string }>
  }
  const entry = pkg.exports['./contract']?.import
  if (entry === undefined) throw new Error(`@macts/${app} exports no contract`)
  const module = (await import(pathToFileURL(join(packageDir, entry)).href)) as Record<
    string,
    unknown
  >
  const contract = Object.values(module).find(
    (value): value is { app: string; operations: Record<string, unknown> } =>
      typeof value === 'object' && value !== null && (value as { app?: unknown }).app === app
  )
  if (contract === undefined) throw new Error(`@macts/${app}'s contract module has no contract`)
  return Object.keys(contract.operations).length
}

describe('macts --mcp (UAT) with every workspace app installed', () => {
  it('installs every workspace host package', () => {
    expect(home.apps.length).toBeGreaterThanOrEqual(35)
  })

  it('registers every app, with none failed or missing its host package', () => {
    const stderr = session.stderr()
    expect(stderr).toContain(`Serving ${String(home.apps.length)} app(s):\n`)
    for (const app of home.apps) {
      expect(stderr).toContain(`\n  ${app}\n`)
    }
    expect(stderr).not.toContain('failed to register')
    expect(stderr).not.toContain('without their server package')
  })

  it('lists one tool for every operation of every app, beside the discovery tool', async () => {
    const { tools } = await session.client.listTools()
    const names = tools.map((tool) => tool.name)

    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('macts__capabilities__discover')
    let total = 0
    for (const app of home.apps) {
      // The app segment is kept exactly, `-` included (`toolNameFor`).
      const prefix = `macts__${app}__`
      const expected = await operationCount(app)
      expect(
        names.filter((name) => name.startsWith(prefix)),
        `tools of ${app}`
      ).toHaveLength(expected)
      total += expected
    }
    expect(names).toHaveLength(total + 1)
    for (const tool of tools) {
      expect(tool.inputSchema.type, tool.name).toBe('object')
    }
  })
})
