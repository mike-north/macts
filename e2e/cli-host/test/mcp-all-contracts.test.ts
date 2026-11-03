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
 * - phases/13 D9 and `toolNameFor`: one tool per registered operation that
 *   can be called, named `macts__<app>__…` from the operation id, with the app
 *   segment kept exactly as it is.
 * - The number of tools of each app is the number of entries in its
 *   contract's `operations` table not marked `unavailable`, read from the same
 *   built package the server loads.
 * - phases/13 D7, "Resolvable targets": an operation whose required input
 *   admits no value is neither a tool nor a discoverable capability. Mail has
 *   no operation that gets one account, so Mail's synchronize is left out and
 *   Mail's check for new mail takes no account. Contacts gets one person
 *   (`people.get`), so its action commands, whose required input is a person,
 *   are served.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D5, D9)
 * @see https://github.com/mike-north/macts/issues/101
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  callTool,
  connectMcpStdio,
  createKey,
  createMactsHome,
  type MactsHome,
  type McpSession,
  toolDocument,
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

/**
 * The number of operations in an app's built contract, loaded from its
 * package, that can be called: those not marked `unavailable`.
 */
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
    (value): value is { app: string; operations: Record<string, { unavailable?: unknown }> } =>
      typeof value === 'object' && value !== null && (value as { app?: unknown }).app === app
  )
  if (contract === undefined) throw new Error(`@macts/${app}'s contract module has no contract`)
  return Object.values(contract.operations).filter(
    (operation) => operation.unavailable === undefined
  ).length
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

  it('lists one tool for every operation of every app that can be called, beside the discovery tool', async () => {
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

describe('macts --mcp (UAT): operations that cannot be called', () => {
  it('lists no tool for them', async () => {
    const { tools } = await session.client.listTools()
    const names = tools.map((tool) => tool.name)
    expect(names).not.toContain('macts__mail__app_synchronize')
    // Its neighbour is served.
    expect(names).toContain('macts__mail__app_check_for_new_mail')
  })

  it('serves the Contacts actions, whose required person can be resolved', async () => {
    const { tools } = await session.client.listTools()
    const names = tools.map((tool) => tool.name)
    for (const name of [
      'macts__contacts__app_action_title',
      'macts__contacts__app_perform_action',
      'macts__contacts__app_should_enable_action',
    ]) {
      expect(names, name).toContain(name)
    }
    const result = await callTool(session, 'macts__capabilities__discover', {
      capability: 'contacts.app.actionTitle',
    })
    expect(toolDocument(result)).toMatchObject({
      found: true,
      capability: { name: 'contacts.app.actionTitle', inputSchema: { required: ['with', 'for'] } },
    })
  })

  it('does not find them through discovery', async () => {
    const result = await callTool(session, 'macts__capabilities__discover', {
      capability: 'mail.app.synchronize',
    })
    expect(toolDocument(result)).toMatchObject({ found: false, capability: 'mail.app.synchronize' })
  })

  it('advertises no input that admits no value', async () => {
    const { tools } = await session.client.listTools()
    const checkForNewMail = tools.find(
      (tool) => tool.name === 'macts__mail__app_check_for_new_mail'
    )
    expect(checkForNewMail?.inputSchema.properties).toEqual({})
    const result = await callTool(session, 'macts__capabilities__discover', {
      capability: 'mail.app.checkForNewMail',
    })
    expect(toolDocument(result)).toMatchObject({
      found: true,
      capability: { inputSchema: { type: 'object', properties: {} } },
    })
  })
})
