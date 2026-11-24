/**
 * Integration: a command the app's dictionary documents as a handler the app
 * sends to scripts is never served as an MCP tool.
 *
 * The shipped Mail manifest marks such a handler `unsupported` with
 * dictionary evidence: "perform mail action with messages", which Mail's
 * dictionary calls a "Script handler invoked by rules and menus". A marked
 * command has no route, so the runtime registers no operation for it and the
 * adapter lists no tool. Tool names are written by hand from the naming rule
 * `macts__<app>__app_<command key in snake case>`.
 *
 * The manifest also keeps a usable application command, `synchronize`, whose
 * tool must be listed, so the absence is never vacuous.
 *
 * @see ../../../../manifests/mail/app.yaml
 * @see ../../../../manifests/README.md (Unsupported commands)
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#listing-tools
 */

import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest } from '@macts/core'
import type { Authority, InvocationContext, WireValue } from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  createBearerCredential,
  createRuntime,
  type RuntimeLogger,
} from '@macts/runtime'
import { createMcpAdapter, type McpAdapter } from './adapter.js'

const manifestPath = (app: string): string =>
  fileURLToPath(new URL(`../../../../manifests/${app}/app.yaml`, import.meta.url))

/** The tools the marked handlers would have if they were served. */
const HANDLER_TOOLS = ['macts__mail__app_perform_mail_action_with_messages']

/** A usable application command of the same manifest, which is served. */
const USABLE_TOOLS = ['macts__mail__app_synchronize']

const SECRET = 'macts_sk_app-sent-handlers-secret-never-logged'

/** Holds the permission each handler would need if it were served. */
const OPERATOR: Authority = {
  subject: 'key_operator',
  permissions: ['mail:app:performMailActionWithMessages'],
}
const CONTEXT: InvocationContext = { credential: createBearerCredential(SECRET) }
const SILENT: RuntimeLogger = {
  error: () => undefined,
  warn: () => undefined,
  info: () => undefined,
}

let adapter: McpAdapter
let executed = 0

beforeAll(async () => {
  const runtime = createRuntime({
    executor: {
      provider: 'app-sent-handlers-stub',
      execute: () => {
        executed += 1
        return Promise.resolve<WireValue>({})
      },
      resolve: () => Promise.resolve<WireValue>({}),
    },
    verifier: {
      verify: (credential) =>
        credential.reveal() === SECRET
          ? Promise.resolve(OPERATOR)
          : Promise.reject(new Error('unknown credential')),
    },
    governance: { policy: ALLOW_ALL_POLICY },
    logger: SILENT,
  })
  runtime.registerManifest(await loadManifest(manifestPath('mail')))
  adapter = createMcpAdapter(runtime, { logger: SILENT })
})

describe('handlers an app sends', () => {
  it('are not listed as tools, while the usable commands beside them are', () => {
    const listed = new Set(adapter.listTools().map((tool) => tool.name))
    for (const tool of USABLE_TOOLS) expect(listed.has(tool)).toBe(true)
    for (const tool of HANDLER_TOOLS) expect(listed.has(tool)).toBe(false)
  })

  it.each(HANDLER_TOOLS)('cannot be called: no such tool (%s)', async (tool) => {
    // An unknown tool is a protocol error, raised before any input is read,
    // so the call is refused whatever its arguments, and nothing runs.
    const before = executed
    await expect(adapter.callTool(tool, {}, CONTEXT)).rejects.toThrow('No such tool.')
    expect(executed).toBe(before)
  })
})
