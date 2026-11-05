/**
 * Ratchet tests for the shipped resource commands that cannot yet select the
 * item they act on (`KNOWN_ITEM_SELECTION_GAPS`).
 *
 * Each such command acts on one item, which its dictionary takes as the
 * command's direct parameter, but the manifest model cannot reach that item
 * yet. It stays offered, as a call on the app that sends no item, and every
 * other command that cannot select its item is refused (#287). The list may
 * only shrink:
 *
 * - its contents are pinned, written by hand from the dictionaries, so an
 *   added entry fails;
 * - every entry must still fail the item-selection rule in its shipped
 *   manifest, so an entry whose command can now select its item fails until
 *   it is removed;
 * - an entry is exempt only for its own app, so the same command in another
 *   app is refused.
 *
 * Its generated docs say the item is not sent, in every place the generator
 * documents the command; the expected sentence is written by hand. Its CLI
 * command keeps the inputs it had before #287, so its usage changes only
 * when it can select its item.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D5
 * @see https://github.com/mike-north/macts/issues/287
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { generateConsolidatedPackages } from '../generator/orchestrate.js'
import { planNativeInvocation } from '../jxa/native-scripts.js'
import { KNOWN_ITEM_SELECTION_GAPS, knownItemSelectionGap } from './item-selection-gaps.js'
import { itemSelectionProblem, unselectableItemCommands } from './item-selection.js'
import { loadManifest } from './loader.js'
import { resolveManifestRoutes } from './route.js'
import type { AppManifest } from './schemas/app.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

let manifests: AppManifest[] = []
beforeAll(async () => {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => loadManifest(resolve(MANIFESTS_DIR, entry.name, 'app.yaml')))
  )
})

/** The shipped manifest of the app with `bundleId`. */
function shipped(bundleId: string): AppManifest {
  const found = manifests.find((manifest) => manifest.app.bundleId === bundleId)
  if (found === undefined) throw new Error(`no shipped manifest for ${bundleId}`)
  return found
}

describe('the known item-selection gaps', () => {
  // Pinned: an entry may be removed, never added. Each line is the
  // dictionary's reason the item cannot be selected yet.
  it('are exactly these commands, each with what it needs', () => {
    expect(KNOWN_ITEM_SELECTION_GAPS).toEqual([
      // OmniPlan.sdef:1153, :596: a violation, in a scenario, has no identifier or get.
      {
        bundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
        commandKey: 'fix',
        resource: 'Violation',
        needs: ['resource-identifier-and-get'],
      },
      // Music.sdef:126: a file track has no identifier or get.
      {
        bundleId: 'com.apple.Music',
        commandKey: 'refresh',
        resource: 'FileTrack',
        needs: ['resource-identifier-and-get'],
      },
      // TV.sdef:88: as Music's, and its playlists are got within their source.
      {
        bundleId: 'com.apple.TV',
        commandKey: 'refresh',
        resource: 'FileTrack',
        needs: ['resource-identifier-and-get', 'multi-level-command-parents'],
      },
      // System_Events.sdef:949, :981, :985: UI elements and actions have no
      // identifier or get.
      {
        bundleId: 'com.apple.systemevents',
        commandKey: 'click',
        resource: 'UIElement',
        needs: ['resource-identifier-and-get'],
      },
      {
        bundleId: 'com.apple.systemevents',
        commandKey: 'perform',
        resource: 'Action',
        needs: ['resource-identifier-and-get'],
      },
      {
        bundleId: 'com.apple.systemevents',
        commandKey: 'select',
        resource: 'UIElement',
        needs: ['resource-identifier-and-get'],
      },
      // Mail.sdef:749, :628: a message is in a mailbox, which is in an account.
      {
        bundleId: 'com.apple.mail',
        commandKey: 'forward',
        resource: 'Message',
        needs: ['multi-level-command-parents'],
      },
      {
        bundleId: 'com.apple.mail',
        commandKey: 'redirect',
        resource: 'Message',
        needs: ['multi-level-command-parents'],
      },
      {
        bundleId: 'com.apple.mail',
        commandKey: 'reply',
        resource: 'Message',
        needs: ['multi-level-command-parents'],
      },
    ])
  })

  // An entry whose command can now select its item (or no longer exists, or
  // acts on another resource) has served its purpose and must be removed.
  it.each(
    KNOWN_ITEM_SELECTION_GAPS.map((entry) => [`${entry.bundleId} ${entry.commandKey}`, entry])
  )('%s still cannot select its item in its shipped manifest', (_label, entry) => {
    const manifest = shipped(entry.bundleId)
    const command = manifest.commands[entry.commandKey]
    expect(command).toBeDefined()
    if (command === undefined) return
    expect(itemSelectionProblem(entry.commandKey, command)).toBeDefined()
    const routed = resolveManifestRoutes(manifest)
      .filter((route) => route.commandKey === entry.commandKey)
      .map((route) => route.resourceType)
    expect(routed).toEqual([entry.resource])
  })

  // The entries are what keeps the shipped manifests generating and
  // registering: no shipped command is refused.
  it('exempt their commands, so no shipped manifest is refused', () => {
    const refused = manifests.flatMap((manifest) =>
      unselectableItemCommands(manifest).map(
        ({ commandKey }) => `${manifest.app.name}: ${commandKey}`
      )
    )
    expect(refused).toEqual([])
  })

  // An entry is exempt for its own app only: the same command in an app with
  // another bundle identifier is refused.
  it('exempt nothing in another app', () => {
    const mail = shipped('com.apple.mail')
    const other: AppManifest = { ...mail, app: { ...mail.app, bundleId: 'com.example.mail' } }
    expect(knownItemSelectionGap(other, 'forward')).toBeUndefined()
    expect(unselectableItemCommands(other).map(({ commandKey }) => commandKey)).toEqual([
      'forward',
      'redirect',
      'reply',
    ])
  })

  // An entry behaves as before #287: a call on the app with its declared
  // parameters, sending no item.
  it('are called on the app with their declared parameters, sending no item', () => {
    const plan = planNativeInvocation(shipped('com.apple.mail'), {
      command: 'forward',
      resource: 'Message',
    })
    expect(plan.body).toBe(
      [
        'var params = {};',
        'if (Object.prototype.hasOwnProperty.call(args, "openingWindow")) { params["openingWindow"] = args["openingWindow"]; }',
        'var result = Object.keys(params).length > 0 ? app["forward"](params) : app["forward"]();',
        'return result;',
      ].join('\n')
    )
    expect(plan.requiredArguments).toEqual([])
  })
})

describe('the generated docs of a known gap', () => {
  const NOT_SENT =
    'macts does not yet send the message to the app, so the app acts on whatever it chooses.'

  /** Every generated file of Mail's package pair, by path. */
  function mailFiles(): Map<string, string> {
    const result = generateConsolidatedPackages(shipped('com.apple.mail'), { appName: 'mail' })
    expect(result.errors).toEqual([])
    return new Map(
      [...result.client.files, ...result.server.files].map((file) => [file.path, file.content])
    )
  }

  it('say the item is not sent, in the HTTP client, the contract and the CLI', () => {
    const files = mailFiles()
    // The HTTP client's method doc.
    expect(files.get('src/resources/message.ts')).toContain(
      `   * Creates a forwarded message.\n   * ${NOT_SENT}\n   */\n  async forward(`
    )
    // The contract client's method doc, wrapped at its doc width.
    const contract = (files.get('src/contract/index.ts') ?? '').replace(/\n\s*\* /g, ' ')
    expect(contract).toContain(`Creates a forwarded message. ${NOT_SENT}`)
    // The CLI command's doc and help.
    const cli = files.get('src/cli/commands/accounts/mailboxes/messages/forward.ts')
    expect(cli).toContain(` * Creates a forwarded message. ${NOT_SENT}\n`)
    expect(cli).toContain(`description: "Creates a forwarded message. ${NOT_SENT}",`)
  })

  // Only a known gap gets the sentence: Mail's `send`, which selects its
  // outgoing message, does not.
  it('are the only docs that say so', () => {
    const files = mailFiles()
    for (const path of [
      'src/resources/outgoingmessage.ts',
      'src/cli/commands/outgoingMessages/send.ts',
    ]) {
      const content = files.get(path)
      expect(content, path).toContain('async') // the file exists and was generated
      expect(content, path).not.toContain('does not yet send')
    }
  })
})

describe('the generated CLI of a known gap', () => {
  // OmniPlan's `fix` keeps the inputs its CLI command has always asked for:
  // the hierarchy's project and scenario flags and the violation positional.
  // None reaches the app, which is what the not-sent sentence says, and the
  // SDK call passes only the declared parameters, of which there are none.
  it('keeps its parent flags and positional, and adds the sentence to its help', () => {
    const result = generateConsolidatedPackages(shipped('com.omnigroup.OmniPlan3.MacAppStore'), {
      appName: 'omniplan',
    })
    expect(result.errors).toEqual([])
    const cli = result.client.files.find(
      (file) => file.path === 'src/cli/commands/projects/scenarios/violations/fix.ts'
    )?.content
    expect(cli).toContain(
      [
        '  static override usage = Command.Usage({',
        '    description: "Fix a violation. macts does not yet send the violation to the app, so the app acts on whatever it chooses.",',
        '  });',
        '',
        "  json = Option.Boolean('--json', { description: 'Output as JSON' });",
        "  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });",
        "  scenarioId = Option.String('--scenario-id', { required: true, description: 'Scenario ID' });",
        '  violationId = Option.String({ required: true });',
        '',
        '  async execute(): Promise<number> {',
      ].join('\n')
    )
    expect(cli).toContain('      await client.violations.fix();\n')
  })
})
