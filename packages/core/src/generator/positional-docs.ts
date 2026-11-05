/**
 * The generated documentation of positional resources: what a caller must know
 * about an object that has no identifier and is found by its zero-based
 * position within its parent (`../manifest/positional.ts`).
 *
 * Every generated surface that documents such a position says the same three
 * things, so this module words them once: the object has no id, it is
 * selected by its position, and the position drifts when objects of its kind
 * are opened, closed or moved within the parent. Two places carry it:
 *
 * - an output field emitted as an index selector within the record it was
 *   read through ({@link positionalFieldNote});
 * - an operation that selects one of its objects by position, and that
 *   operation's position parameter ({@link positionalSelectionNote}).
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D7
 */

import type { AppManifest } from '../manifest/schemas/app.js'
import { resolvingCommand } from '../manifest/resource-commands.js'
import { identifierWords, withArticle } from './surface.js'

/** The words naming one object, the objects, and the parent of a positional resource. */
interface PositionalWords {
  readonly one: string
  readonly many: string
  readonly parent: string
}

/** {@link PositionalWords} of `resourceKey`, a positional resource of `manifest`. */
function wordsOf(manifest: AppManifest, resourceKey: string): PositionalWords {
  const resource = manifest.resources[resourceKey]
  const parentKey = resolvingCommand(manifest, resourceKey, 'get')?.[1].parent?.resource
  const parent = parentKey === undefined ? undefined : manifest.resources[parentKey]
  return {
    one: identifierWords(resource?.name ?? resourceKey),
    many: identifierWords(resource?.plural ?? resourceKey),
    parent: identifierWords(parent?.name ?? parentKey ?? 'container'),
  }
}

/**
 * The note an output field carries when a native read emits it as an index
 * selector within the record it was read through: for a reference to an
 * iTerm tab at a window's field, "Returned as an index selector: the tab at
 * its zero-based position within this window, since a tab has no id. The
 * position drifts when tabs open, close or move, so the reference resolves to
 * whichever tab holds it then."
 *
 * @param manifest - The app manifest.
 * @param resourceKey - The positional resource the field references.
 */
export function positionalFieldNote(manifest: AppManifest, resourceKey: string): string {
  const { one, many, parent } = wordsOf(manifest, resourceKey)
  return (
    `Returned as an index selector: the ${one} at its zero-based position within this ${parent}, ` +
    `since ${withArticle(one)} has no id. The position drifts when ${many} open, close or move, ` +
    `so the reference resolves to whichever ${one} holds it then.`
  )
}

/**
 * The note an operation that selects one object of a positional resource
 * carries, and its position parameter too: for an iTerm tab, "A tab has no
 * id, so it is selected by its zero-based position within its window, which
 * drifts when tabs open, close or move."
 *
 * @param manifest - The app manifest.
 * @param resourceKey - The positional resource the operation selects within.
 */
export function positionalSelectionNote(manifest: AppManifest, resourceKey: string): string {
  const { one, many, parent } = wordsOf(manifest, resourceKey)
  const article = withArticle(one)
  return (
    `${article.charAt(0).toUpperCase()}${article.slice(1)} has no id, so it is selected by its ` +
    `zero-based position within its ${parent}, which drifts when ${many} open, close or move.`
  )
}
