/**
 * Shipped resource commands the manifest cannot yet address: their resource
 * lacks an identifier/get, or their item needs more than one recorded parent.
 * They remain available as legacy itemless app calls, with explicit generated
 * documentation, instead of removing native-supported operations.
 *
 * This frozen list is a ratchet keyed by app and command, with typed blockers.
 * Tests pin its contents and require removal once an item becomes selectable;
 * entries cannot be added. Generation and registration refuse every unlisted
 * itemless resource command (`./item-selection.ts`).
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D5, §D10 (Command parents)
 * @see https://github.com/mike-north/macts/issues/287
 *
 * @packageDocumentation
 */

import type { AppManifest } from './schemas/app.js'

/**
 * What a known gap needs before its command can select its item.
 *
 * - `resource-identifier-and-get`: the command's resource declares no
 *   identifier and no get, so there is nothing to look the item up by. It
 *   needs both, from evidence.
 * - `multi-level-command-parents`: the item exists only within a parent that
 *   is itself within another (a Mail message within a mailbox within an
 *   account, an OmniPlan violation within a scenario within a project), and a
 *   command records one parent only.
 */
export type ItemSelectionNeed = 'resource-identifier-and-get' | 'multi-level-command-parents'

/** One shipped resource command that cannot yet select its item. */
export interface KnownItemSelectionGap {
  /** The bundle identifier of the command's app, as its manifest declares it. */
  readonly bundleId: string
  /** The command's key in `manifest.commands`. */
  readonly commandKey: string
  /** The manifest key of the resource whose item the command acts on. */
  readonly resource: string
  /** What the command needs before it can select its item. */
  readonly needs: readonly ItemSelectionNeed[]
}

/** A frozen gap entry. */
function gap(
  bundleId: string,
  commandKey: string,
  resource: string,
  needs: readonly ItemSelectionNeed[]
): KnownItemSelectionGap {
  return Object.freeze({ bundleId, commandKey, resource, needs: Object.freeze([...needs]) })
}

/**
 * Every shipped resource command that cannot yet select its item. Only an
 * entry's removal is expected; see the module documentation.
 */
export const KNOWN_ITEM_SELECTION_GAPS: readonly KnownItemSelectionGap[] = Object.freeze([
  // OmniPlan.sdef:1153: `fix` takes the violation as its direct parameter,
  // and a required `with action` (:1155) the manifest does not declare yet. A
  // violation is an element of a scenario (:596), which is an element of a
  // project (:524).
  gap('com.omnigroup.OmniPlan3.MacAppStore', 'fix', 'Violation', [
    'resource-identifier-and-get',
    'multi-level-command-parents',
  ]),
  // Music.sdef:126: `refresh` takes the file track as its direct parameter.
  gap('com.apple.Music', 'refresh', 'FileTrack', ['resource-identifier-and-get']),
  // TV.sdef:88: as Music's, and a TV playlist is got within its source.
  gap('com.apple.TV', 'refresh', 'FileTrack', [
    'resource-identifier-and-get',
    'multi-level-command-parents',
  ]),
  // SystemEvents.sdef:949, :981 and :985: `click` and `select` take the UI
  // element, `perform` the action, as their direct parameter. UI elements
  // nest to any depth under a process and its windows (:1379, :1595), and an
  // action is an element of a UI element (:1259).
  gap('com.apple.systemevents', 'click', 'UIElement', [
    'resource-identifier-and-get',
    'multi-level-command-parents',
  ]),
  gap('com.apple.systemevents', 'perform', 'Action', [
    'resource-identifier-and-get',
    'multi-level-command-parents',
  ]),
  gap('com.apple.systemevents', 'select', 'UIElement', [
    'resource-identifier-and-get',
    'multi-level-command-parents',
  ]),
  // Mail.sdef:193, :239 and :247: each takes the message as its direct
  // parameter; a message is an element of a mailbox (Mail.sdef:749), which is
  // an element of an account (Mail.sdef:628).
  gap('com.apple.mail', 'forward', 'Message', ['multi-level-command-parents']),
  gap('com.apple.mail', 'redirect', 'Message', ['multi-level-command-parents']),
  gap('com.apple.mail', 'reply', 'Message', ['multi-level-command-parents']),
])

/**
 * The known gap for `commandKey` of `manifest`'s app, or `undefined` when the
 * command is not one.
 *
 * @param manifest - A validated app manifest.
 * @param commandKey - A key of `manifest.commands`.
 */
export function knownItemSelectionGap(
  manifest: AppManifest,
  commandKey: string
): KnownItemSelectionGap | undefined {
  return KNOWN_ITEM_SELECTION_GAPS.find(
    (entry) => entry.bundleId === manifest.app.bundleId && entry.commandKey === commandKey
  )
}
