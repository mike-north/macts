/**
 * iTerm's application-level `write` (typing text with no session address) does not exist.
 * Session-addressed `iterm.sessions.writeText` is the only way to type into iTerm, so a
 * policy that forbids typing denies the single permission `iterm:sessions:writeText`.
 * Every generated surface must agree: contract, capabilities, SDK (local and remote),
 * CLI, MCP tools and the manifest itself.
 *
 * @see https://iterm2.com/documentation-scripting.html (the `write` command)
 */
import { describe, expect, it } from 'vitest'
import { createMcpAdapter } from '@macts/mcp'
import { createRuntime } from '@macts/runtime'
import { AppManifestSchema, createNativeExecutor } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import { plugin } from '@macts/iterm/cli'
import { iTermContract } from '@macts/iterm/contract'
import { capabilities } from '@macts/iterm'
import { ALLOW_ALL_POLICY } from '@macts/runtime'
import { createClient as local } from './local-client.js'
import { createClient as remote } from './remote.js'

const RETIRED_OPERATION = 'iterm.app.write'
const RETIRED_PERMISSION = 'iterm:app:write'
const SESSION_OPERATION = 'iterm.sessions.writeText'
const SESSION_PERMISSION = 'iterm:sessions:writeText'

describe('iTerm application-level write is retired', () => {
  it('is absent from the operation contract', () => {
    expect(Object.keys(iTermContract.operations)).not.toContain(RETIRED_OPERATION)
    const permissions = Object.values(iTermContract.operations).map(
      (operation) => operation.permission
    )
    expect(permissions).not.toContain(RETIRED_PERMISSION)
  })

  it('is absent from the capability and permission catalog', () => {
    expect(capabilities.map(({ name }) => name)).not.toContain(RETIRED_OPERATION)
    expect(capabilities.map(({ permission }) => permission)).not.toContain(RETIRED_PERMISSION)
  })

  it('is absent from the manifest, and no application-scoped command types text', async () => {
    const manifest = AppManifestSchema.parse(await iTermContract.loadManifest())
    expect(JSON.stringify(manifest)).not.toContain(RETIRED_PERMISSION)
    expect(JSON.stringify(manifest)).not.toContain('Cofl')
  })

  it('is absent from the SDK, local and remote', () => {
    const options = {
      token: 'unused',
      url: 'http://retired.test',
      fetch: () => Promise.reject(new Error('unused')),
    }
    expect('write' in local(iTermContract, { token: 'unused' })).toBe(false)
    expect('write' in remote(iTermContract, options)).toBe(false)
  })

  it('is absent from the CLI', () => {
    const paths = plugin.commands.flatMap((command) =>
      (command.paths ?? []).map((path) => path.join(' '))
    )
    expect(paths).not.toContain('iterm write')
    expect(paths).toContain('iterm windows sessions write')
  })

  it('is absent from the MCP tool list', async () => {
    const manifest = AppManifestSchema.parse(await iTermContract.loadManifest())
    const runtime = createRuntime({
      executor: createNativeExecutor({ transport: standInTransport({}) }),
      verifier: { verify: () => Promise.resolve({ subject: 'x', permissions: [] }) },
      governance: { policy: ALLOW_ALL_POLICY },
    })
    runtime.registerContract(iTermContract, manifest)
    const names = createMcpAdapter(runtime)
      .listTools()
      .map(({ name }) => name)
    expect(names).not.toContain('macts__iterm__app_write')
    expect(names).toContain('macts__iterm__sessions_write_text')
  })

  it('leaves the session write, with its own permission, in place', () => {
    expect(Object.keys(iTermContract.operations)).toContain(SESSION_OPERATION)
    expect(capabilities.find(({ name }) => name === SESSION_OPERATION)).toMatchObject({
      permission: SESSION_PERMISSION,
      risk: 'write',
    })
  })
})
