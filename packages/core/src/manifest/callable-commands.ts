/**
 * Callable selection and naming shared by admission and every generated client
 * surface. The contract, HTTP and CLI generators ask the same question here, so a
 * format 1.1 command is admitted exactly when each of them emits it under one name.
 */
import type { AppManifest } from './schemas/app.js'
import { CRUD_OPERATIONS, findCrudCommand, resourceCommandEntries } from './resource-commands.js'
import { usableCommands, usableHierarchyChildren, usableResources } from './unsupported.js'
import { normalizeResourceRouteSegment } from './route.js'
import type { HierarchyChild } from './schemas/hierarchy.js'

/** Reserved bindings keep the established SDK escaping on every surface. */
const RESERVED_WORDS = new Set(
  'arguments break case catch class const continue debugger default delete do else enum eval export extends false finally for function if implements import in instanceof interface let new null of package private protected public return static super switch this throw true try typeof var void while with yield'.split(
    ' '
  )
)

/** The public binding spelling for a declared name. @internal */
export function safeIdentifier(name: string): string {
  return RESERVED_WORDS.has(name) ? `_${name}` : name
}

/**
 * A resource command's callable name, or absence when no common callable surface exists.
 * Only a primary CRUD command or an additional identity get has a CRUD method.
 * Format 1.1 also requires CLI placement and refuses unimplemented mutation shapes;
 * 1.0 retains its established surface omissions and duplicate-CRUD handling.
 * Availability of an input value is a separate operation-contract judgment.
 * @internal
 */
export function callableResourceCommand(
  manifest: AppManifest,
  resource: string,
  key: string
): string | undefined {
  const commands = resourceCommandEntries(manifest, resource)
  const command = commands.find(([name]) => name === key)?.[1]
  if (command === undefined) return undefined
  const kind = CRUD_OPERATIONS.find((name) => name === command.name)
  const primary = kind === undefined || findCrudCommand(commands, kind)?.[0] === key
  if (!primary && !(kind === 'get' && command.identityTraversal !== undefined)) return undefined
  if (manifest.version === '1.1') {
    const placed = (children: Record<string, HierarchyChild>): boolean =>
      usableHierarchyChildren(manifest, children).some(
        ([, child]) =>
          (child.resource === resource && (kind !== 'create' || child.access === 'rw')) ||
          placed(child.children ?? {})
      )
    if (
      kind === 'update' ||
      kind === 'delete' ||
      !(
        placed(manifest.hierarchy.children) ||
        (kind !== 'create' && manifest.resources[resource]?.roots !== undefined)
      )
    )
      return undefined
  }
  return primary ? command.name : (command.routeName ?? key)
}

/**
 * Format 1.1 commands that some client surface would omit, or whose SDK/HTTP
 * binding or CLI segment another member of the same namespace already occupies.
 * Application commands share the client's top level with resource namespaces.
 * Format 1.0 keeps its established behavior and yields none.
 * @internal
 */
export function callableSurfaceIssues(manifest: AppManifest): { key: string; message: string }[] {
  if (manifest.version !== '1.1') return []
  const resources = usableResources(manifest).filter(
    ([resource]) => resourceCommandEntries(manifest, resource).length > 0
  )
  const namespaces = resources.map(([resource]) => ({
    owner: `"${resource}"`,
    taken: new Set<string>(),
    members: resourceCommandEntries(manifest, resource).map(
      ([key]) => [key, callableResourceCommand(manifest, resource, key)] as const
    ),
  }))
  namespaces.push({
    owner: 'the application',
    taken: new Set(resources.map(([, value]) => normalizeResourceRouteSegment(value.plural))),
    members: usableCommands(manifest)
      .filter(([, command]) => command.scope === 'application')
      .map(([key, command]) => [key, command.name] as const),
  })
  const issues: { key: string; message: string }[] = []
  for (const { owner, taken, members } of namespaces) {
    for (const [key, name] of members) {
      const spellings =
        name === undefined
          ? []
          : [safeIdentifier(name), `cli:${name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`]
      if (name === undefined || spellings.some((spelling) => taken.has(spelling)))
        issues.push({
          key,
          message: `Command "${key}" for ${owner} has no unique callable surface${name === undefined ? '' : ` named "${name}"`}.`,
        })
      for (const spelling of spellings) taken.add(spelling)
    }
  }
  return issues
}
