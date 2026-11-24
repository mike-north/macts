/**
 * Shipped manifests: the commands an app's dictionary documents as handlers
 * the app sends to scripts are marked `unsupported`, and the marks remove
 * exactly those commands from discovery, leaving every other capability as it
 * would be without them.
 *
 * A handler such as Mail's "perform mail action with messages" is one the app
 * calls in a user's script when a rule or menu item runs it. Sending it to the
 * app performs nothing a caller can rely on, so no route may offer it. The
 * marked commands, and the capability names they would otherwise have, are
 * written here by hand from each app's dictionary:
 *
 * - Mail 16.0, "perform mail action with messages": its description says it is
 *   a "Script handler invoked by rules and menus".
 *
 * A capability is named `<app>.app.<command key>` for an application command,
 * the app segment being the app's name in lower case.
 *
 * The comparison is the whole capability set, derived twice from the same
 * parsed manifests: once as shipped, and once with each handler mark removed.
 * Every capability in the first set must equal its counterpart in the second,
 * so the only effect of the marks is the absence of the listed capabilities.
 *
 * @see ../../../../manifests/README.md (Unsupported commands)
 * @see ../manifest/schemas/evidence.ts (DictionaryHandlerEvidenceSchema)
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/index.js'
import { deriveCapabilities } from './registry.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

/** The handler commands of the shipped manifests, by manifest directory and command key. */
const HANDLER_COMMANDS = ['mail/performMailActionWithMessages']

/** The capabilities those commands would have if they were not marked. */
const HANDLER_CAPABILITIES = ['mail.app.performMailActionWithMessages']

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

/** The same manifest with every handler mark removed, and every other mark kept. */
function withoutHandlerMarks(manifest: AppManifest): AppManifest {
  const commands = Object.fromEntries(
    Object.entries(manifest.commands).map(([key, command]) => {
      if (command.unsupported?.evidence.source !== 'dictionary') return [key, command]
      const { unsupported: _handler, ...rest } = command
      return [key, rest]
    })
  )
  return { ...manifest, commands }
}

/** Every capability of every shipped manifest, by name. */
function capabilitiesByName(list: AppManifest[]): Map<string, unknown> {
  return new Map(
    list.flatMap((manifest) =>
      deriveCapabilities(manifest).map((capability) => [capability.name, capability] as const)
    )
  )
}

describe('handlers an app sends, in the shipped manifests', () => {
  it('are marked unsupported with dictionary handler evidence, and nothing else is', () => {
    const marked = manifests.flatMap(({ dir, manifest }) =>
      Object.entries(manifest.commands)
        .filter(([, command]) => command.unsupported?.evidence.source === 'dictionary')
        .map(([key]) => `${dir}/${key}`)
    )
    expect(marked.sort()).toEqual(HANDLER_COMMANDS)
  })

  it('remove exactly their own capabilities, and leave every other capability unchanged', () => {
    const shipped = capabilitiesByName(manifests.map(({ manifest }) => manifest))
    const unmarked = capabilitiesByName(
      manifests.map(({ manifest }) => withoutHandlerMarks(manifest))
    )

    // The removal check is not vacuous: without the marks, each handler is discoverable.
    for (const name of HANDLER_CAPABILITIES) expect(unmarked.has(name)).toBe(true)

    const removed = [...unmarked.keys()].filter((name) => !shipped.has(name)).sort()
    expect(removed).toEqual(HANDLER_CAPABILITIES)
    const added = [...shipped.keys()].filter((name) => !unmarked.has(name))
    expect(added).toEqual([])
    for (const [name, capability] of shipped) expect(capability).toEqual(unmarked.get(name))
  })
})
