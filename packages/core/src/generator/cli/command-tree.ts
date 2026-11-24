/**
 * The command tree of a generated CLI plugin: which commands it registers,
 * and at which CLI path each one sits.
 *
 * This is the one statement of the CLI's commands. The CLI generator emits a
 * command file for each entry, and the capability registry names an entry in
 * each capability's discovery snippet, so a snippet always names a command the
 * CLI has, and an operation the CLI has no command for has no snippet.
 *
 * A resource command is generated from each hierarchy entry its address
 * reaches (`./placement.ts`), and only when the CLI can call it there:
 *
 * - `list` and `get` back the entry's list and get commands; a further `get`
 *   is an additional identity read, named by its route.
 * - `create` backs a create command only where the entry is writable
 *   (`access: rw`).
 * - `update` and `delete` have no CLI command.
 * - Every other command is a resource command named by its command name.
 *
 * A command that cannot be called (a required input admits no value, see
 * `../input-satisfiability.ts`), or that is not the resource's callable
 * surface for its name (`../../manifest/callable-commands.ts`), has no CLI
 * command. A resource with no hierarchy entry, and no singleton root, has no
 * CLI commands. An application command sits directly under the app.
 *
 * Two commands never share a CLI path: {@link cliPathCollisions} names each
 * path claimed more than once, and generation refuses such a manifest.
 */
import type { AppManifest, Command } from '../../manifest/index.js'
import { callableResourceCommand } from '../../manifest/callable-commands.js'
import { usableCommands } from '../../manifest/unsupported.js'
import { isOperationAvailable } from '../input-satisfiability.js'
import { cliHierarchyPaths, cliResourceCommands, type HierarchyPath } from './context.js'
import { placeCommand } from './placement.js'

/**
 * What a CLI command does, which selects the command file generated for it:
 * the resource's list, create or get; an additional identity get; another
 * resource command; or an application command.
 */
export type CliCommandKind = 'list' | 'create' | 'get' | 'identity-get' | 'resource' | 'app'

/** One command the generated CLI registers. */
export interface CliTreeCommand {
  readonly kind: CliCommandKind
  /** The manifest command it calls. */
  readonly command: Command
  /** The manifest key of that command. */
  readonly commandKey: string
  /** The resource it acts on; `undefined` for an application command. */
  readonly resourceName: string | undefined
  /**
   * The placed hierarchy entry it is generated at; `undefined` for an
   * application command.
   */
  readonly at: HierarchyPath | undefined
  /** The final CLI path segment: the command's own name, kebab-cased. */
  readonly name: string
  /** The CLI path below the app name: the entry's segments, then {@link name}. */
  readonly path: readonly string[]
}

/** CRUD operation names whose resource commands are not generic CLI commands. */
const STANDARD_OPERATIONS = new Set(['list', 'get', 'create', 'update', 'delete'])

/**
 * The SDK method an additional identity get is called by, which names its CLI
 * command too: its route name, else its manifest key, else its command name.
 */
export function identityGetMethodName(manifest: AppManifest, command: Command): string {
  return (
    command.routeName ??
    Object.entries(manifest.commands).find(([, candidate]) => candidate === command)?.[0] ??
    command.name
  )
}

/** Kebab-case a camelCase name, as CLI path segments and flags are spelled. */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Every command the generated CLI registers for an address-normalized
 * manifest, in the order the CLI plugin lists them: per hierarchy entry its
 * list, create and get, then its other resource commands, then the
 * application commands.
 */
export function cliCommandTree(manifest: AppManifest): CliTreeCommand[] {
  const keyOf = new Map(Object.entries(manifest.commands).map(([key, command]) => [command, key]))
  const tree: CliTreeCommand[] = []
  const add = (
    kind: CliCommandKind,
    command: Command,
    at: HierarchyPath | undefined,
    name: string
  ): void => {
    tree.push({
      kind,
      command,
      commandKey: keyOf.get(command) ?? command.name,
      resourceName: at?.resourceName,
      at,
      name,
      path: [...(at?.path ?? []), name],
    })
  }

  for (const entry of cliHierarchyPaths(manifest)) {
    const resourceName = entry.resourceName
    const resourceCommands = cliResourceCommands(manifest, resourceName)
    const callable = (command: Command): boolean =>
      callableResourceCommand(manifest, resourceName, keyOf.get(command) ?? '') !== undefined
    const available = (command: Command): boolean =>
      isOperationAvailable(manifest, command, resourceName)
    // The command backing a CRUD operation, when it can be called.
    const backing = (op: string): Command | undefined => {
      const chosen = resourceCommands.find((command) => command.name === op)
      return chosen !== undefined && callable(chosen) && available(chosen) ? chosen : undefined
    }
    const placed = (command: Command): HierarchyPath | undefined =>
      placeCommand(manifest, command, entry)

    const list = backing('list')
    const listAt = list === undefined ? undefined : placed(list)
    if (list !== undefined && listAt !== undefined) add('list', list, listAt, 'list')

    const create = backing('create')
    const createAt = create === undefined ? undefined : placed(create)
    if (create !== undefined && createAt?.canCreate === true) {
      add('create', create, createAt, 'create')
    }

    const get = backing('get')
    const getAt = get === undefined ? undefined : placed(get)
    if (get !== undefined && getAt !== undefined) add('get', get, getAt, 'get')

    const primaryGet = resourceCommands.find((command) => command.name === 'get')
    for (const command of resourceCommands) {
      const at = placed(command)
      if (at === undefined) continue
      // A separate identity get is a declared read operation on every surface.
      if (
        command.name === 'get' &&
        command !== primaryGet &&
        callable(command) &&
        available(command)
      ) {
        add('identity-get', command, at, toKebabCase(identityGetMethodName(manifest, command)))
      }
      if (STANDARD_OPERATIONS.has(command.name) || !callable(command) || !available(command)) {
        continue
      }
      add('resource', command, at, toKebabCase(command.name))
    }
  }

  for (const [, command] of usableCommands(manifest)) {
    if (command.scope !== 'application') continue
    if (!isOperationAvailable(manifest, command, undefined)) continue
    add('app', command, undefined, toKebabCase(command.name))
  }

  return tree
}

/**
 * A diagnostic for each CLI path more than one command of `tree` claims,
 * naming the path (`<app> …`) and every manifest command placed there. Empty
 * when every command has its own path.
 *
 * @param app - The app's CLI name, the first word of every command path.
 */
export function cliPathCollisions(app: string, tree: readonly CliTreeCommand[]): string[] {
  const byPath = new Map<string, CliTreeCommand[]>()
  for (const entry of tree) {
    const path = [app, ...entry.path].join(' ')
    byPath.set(path, [...(byPath.get(path) ?? []), entry])
  }
  return [...byPath]
    .filter(([, claimants]) => claimants.length > 1)
    .map(
      ([path, claimants]) =>
        `CLI command path "${path}" is claimed by ${String(claimants.length)} commands: ${claimants
          .map(
            ({ commandKey, resourceName }) =>
              `"${commandKey}"${resourceName === undefined ? '' : ` on "${resourceName}"`}`
          )
          .join(', ')}. Each command needs its own CLI path.`
    )
}
