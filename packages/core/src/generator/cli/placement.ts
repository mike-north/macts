/**
 * Where a resource command sits in the generated CLI, and in the discovery
 * snippets that name it.
 *
 * A CLI path states what a caller selects to reach a command: each segment
 * before the command name is a collection the caller selects within. A
 * resource command's path therefore follows its operation address, not merely
 * the place its resource has in the hierarchy. When a format 1.1 command
 * declares its ancestors (`parents`, or a singular `parent` normalized to
 * them), its path is those ancestors' collections followed by its target's
 * collection. Collections an identity traversal searches are left out: the
 * caller never selects within them, since the search covers every item of
 * each. An iTerm Session read addressed by its Window alone, searching every
 * Tab of that Window, is thus `windows sessions resolve`, while a Session list
 * that selects one Tab stays `windows tabs sessions list`.
 *
 * A command reaches its target through exactly one hierarchy entry: its
 * ancestors' collections, then any traversed collections, then the target's.
 * It is placed from that entry only, and from no other entry of the same
 * resource.
 *
 * Commands that declare no ancestors, and every format 1.0 command, keep the
 * hierarchy path of the resource: their address does not name hierarchy
 * edges (a 1.0 `parent` names a native collection accessor, and 1.0 data is
 * never rewritten), so the hierarchy remains the only statement of placement.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D10, "Multilevel addresses and identity scope")
 */
import type { AppManifest, Command } from '../../manifest/index.js'
import { commandParents } from '../../manifest/resource-commands.js'
import type { HierarchyPath } from './context.js'

/**
 * The CLI path segments (below the app name, before the command name) of a
 * resource command reached through the hierarchy entry at `hierarchySegments`.
 *
 * @param manifest - An address-normalized manifest
 *   (`normalizeManifestAddresses`), so a singular `parent` is read as
 *   `parents`.
 * @param command - A resource command of the resource at that entry.
 * @param hierarchySegments - The hierarchy collection keys leading to the
 *   resource, outermost first (e.g. `['windows', 'tabs', 'sessions']`).
 * @returns The segments the command sits under, or `undefined` when the
 *   command's address does not reach its resource through that entry, in
 *   which case no command is placed from it.
 */
export function commandCliSegments(
  manifest: AppManifest,
  command: Command,
  hierarchySegments: readonly string[]
): readonly string[] | undefined {
  if (manifest.version !== '1.1') return hierarchySegments
  const parents = commandParents(manifest, command)
  const target = hierarchySegments.at(-1)
  if (parents.length === 0 || target === undefined) return hierarchySegments
  const ancestors = parents.map(({ collection }) => collection)
  const reached = [...ancestors, ...(command.identityTraversal?.collections ?? []), target]
  const reachesEntry =
    reached.length === hierarchySegments.length &&
    reached.every((segment, index) => segment === hierarchySegments[index])
  return reachesEntry ? [...ancestors, target] : undefined
}

/**
 * The hierarchy path a CLI command is generated at, for a resource command
 * reached through the hierarchy entry `entry`: the entry itself, moved to the
 * segments {@link commandCliSegments} places the command under. Only the
 * parent parameters of collections that remain on the path are kept, since a
 * traversed collection is never selected. `undefined` when the command is not
 * placed from this entry.
 *
 * @param manifest - An address-normalized manifest.
 */
export function placeCommand(
  manifest: AppManifest,
  command: Command,
  entry: HierarchyPath
): HierarchyPath | undefined {
  const segments = commandCliSegments(manifest, command, entry.path)
  if (segments === undefined) return undefined
  if (segments === entry.path) return entry
  const path = [...segments]
  return {
    ...entry,
    path,
    parentParams: entry.parentParams.filter(({ paramPath }) => {
      const reached = paramPath.split('/')
      return reached.every((segment, index) => segment === path[index])
    }),
  }
}
