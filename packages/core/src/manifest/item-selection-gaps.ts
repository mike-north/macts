/**
 * The shipped resource commands that cannot yet select the item they act on,
 * and what each needs before it can.
 *
 * Every resource-scoped command other than a list or create acts on one item,
 * selected by an identifier parameter it declares, and the app receives that
 * item as the command's direct parameter (`./item-selection.ts`). Generation
 * and registration refuse a command that declares none. A few shipped
 * commands cannot declare one yet, because the manifest model cannot reach
 * their item: the resource has no identifier or get to look the item up by,
 * or the item lies more than one parent deep, while a command records one
 * parent only. Removing them would drop operations people use, so they stay
 * offered, as a call on the app with their declared parameters that sends no
 * item, and their generated docs say so.
 *
 * The list is a ratchet. It names exactly these commands, by app and command
 * key, with a typed reason, and a test pins its contents: an entry is removed
 * once its command can select its item, and nothing is added to it. Any
 * other command that cannot select its item is refused.
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
