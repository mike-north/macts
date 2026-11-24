/**
 * UAT: the iTerm Session commands addressed by their Window alone sit under the
 * Window in the installed CLI.
 *
 * The real built CLI runs as a subprocess with a temporary macts home whose
 * plugins directory holds the real built `@macts/iterm-server` and
 * `@macts/iterm` packages. Only `--help` is run, so no request is sent and no
 * app is automated.
 *
 * Expected paths are hand-derived from `manifests/iterm/app.yaml`: Sessions
 * are elements of Tabs in Windows (`windows` → `tabs` → `sessions`).
 * `resolveSession` (route `resolve`) and `writeSessionText` (command `write`)
 * declare the Window as their only ancestor and search every Tab of it
 * (`identityTraversal: { collections: [tabs] }`), so their path is the
 * Window's collection followed by the Sessions collection, without the
 * searched `tabs`. `listSessions` and `getSession` select a Tab by position,
 * so they stay under `windows tabs sessions`. Both commands take the Window id
 * as `--window-id` and the Session id positionally.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D10, "Multilevel addresses and identity scope")
 * @see ../../../manifests/README.md (CLI command paths)
 * @see ../../../manifests/iterm/app.yaml
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMactsHome, runCli, type MactsHome } from '../src/harness.js'

let home: MactsHome

beforeAll(() => {
  home = createMactsHome(['iterm'])
})

afterAll(() => {
  home.dispose()
})

describe('iTerm Window-scoped Session commands (UAT)', () => {
  it.each(['resolve', 'write'])('shows help for `iterm windows sessions %s`', async (verb) => {
    const result = await runCli(home, ['iterm', 'windows', 'sessions', verb, '--help'])
    expect(result.code, result.stderr).toBe(0)
    expect(result.stdout).toContain(`macts iterm windows sessions ${verb}`)
    expect(result.stdout).toContain('--window-id')
  })

  it.each(['resolve', 'write'])(
    'no longer offers `iterm windows tabs sessions %s`',
    async (verb) => {
      const result = await runCli(home, ['iterm', 'windows', 'tabs', 'sessions', verb, '--help'])
      expect(result.code).not.toBe(0)
      expect(result.stdout).not.toContain(`$ macts iterm windows tabs sessions ${verb}`)
    }
  )

  it('keeps the Tab-scoped Session list and get under the Tab', async () => {
    for (const verb of ['list', 'get']) {
      const result = await runCli(home, ['iterm', 'windows', 'tabs', 'sessions', verb, '--help'])
      expect(result.code, result.stderr).toBe(0)
      expect(result.stdout).toContain(`macts iterm windows tabs sessions ${verb}`)
      expect(result.stdout).toContain('--tab-index')
    }
  })
})
