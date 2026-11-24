/**
 * Every discovery CLI snippet names a command the generated CLI has, for every
 * shipped manifest.
 *
 * Discovery (`macts capabilities search|inspect`, the MCP discovery tool)
 * tells a caller how to invoke a capability from the CLI. A snippet that names
 * a command path the CLI plugin does not register sends the caller to a
 * command that does not exist. This suite generates each manifest's CLI plugin
 * in memory, collects the command paths its commands register
 * (`static override paths`), and checks that the command path of every
 * capability's snippet (the words before its first flag or positional) is one
 * of them. A capability whose operation has no CLI command carries no snippet.
 *
 * @see ./registry.ts
 * @see ../generator/cli/command-tree.ts
 * @see https://clipanion.dev/docs/paths
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { generateCliPlugin } from '../generator/cli/index.js'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/index.js'
import { deriveCapabilities } from './registry.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

let manifests: { dir: string; manifest: AppManifest }[] = []

beforeAll(async () => {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => ({
        dir: entry.name,
        manifest: await loadManifest(resolve(MANIFESTS_DIR, entry.name, 'app.yaml')),
      }))
  )
})

/**
 * The command paths a generated CLI plugin registers, each written as the
 * words a caller types after `macts` (e.g. `calendar calendars events list`).
 * A command is registered when `plugin.ts` lists its class; a command file
 * the plugin does not import is never reachable.
 */
function registeredCommandPaths(manifest: AppManifest): Set<string> {
  const result = generateCliPlugin(manifest, {
    packageName: '@macts/parity',
    sdkPackageName: '@macts/parity',
  })
  expect(result.errors).toEqual([])
  const plugin = result.files.find(({ path }) => path === 'src/plugin.ts')?.content ?? ''
  const imported = new Set(
    [...plugin.matchAll(/from '\.\/commands\/(.*)\.js'/g)].map(
      ([, path]) => `src/commands/${String(path)}.ts`
    )
  )
  const paths = new Set<string>()
  for (const file of result.files) {
    if (!imported.has(file.path)) continue
    const declared = /static override paths = \[\[(.*)\]\]/.exec(file.content)?.[1]
    if (declared === undefined) throw new Error(`No command path in ${file.path}`)
    paths.add(declared.replace(/['"]/g, '').split(', ').join(' '))
  }
  expect(paths.size).toBeGreaterThan(0)
  return paths
}

/**
 * The command path a snippet names: the words after `macts`, up to the first
 * flag (`--name`) or positional placeholder (`<name>`).
 */
function snippetCommandPath(snippet: string): string {
  const [program, ...words] = snippet.split(' ')
  expect(program).toBe('macts')
  const end = words.findIndex((word) => word.startsWith('-') || word.startsWith('<'))
  return (end === -1 ? words : words.slice(0, end)).join(' ')
}

describe('discovery CLI snippets', () => {
  it('reads every shipped manifest', () => {
    expect(manifests.length).toBeGreaterThan(0)
  })

  it('name only command paths the generated CLI registers', () => {
    const missing: string[] = []
    for (const { dir, manifest } of manifests) {
      const registered = registeredCommandPaths(manifest)
      for (const capability of deriveCapabilities(manifest)) {
        if (capability.cliSnippet === undefined) continue
        if (!registered.has(snippetCommandPath(capability.cliSnippet))) {
          missing.push(`${dir}: ${capability.name} → ${capability.cliSnippet}`)
        }
      }
    }
    expect(missing).toEqual([])
  })
})
