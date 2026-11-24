/**
 * The format boundary for operation addresses. Format 1.1 consumers receive
 * only explicit ancestor/item bindings; format 1.0 data is never rewritten.
 * Source declarations remain owned by the caller, and normalization is idempotent.
 */
import { ValidationError } from '@macts/contracts'
import { CommandSchema, type Command } from './schemas/command.js'
import type { AppManifest } from './schemas/app.js'
import type { Resource } from './schemas/resource.js'
import type { AddressIssue } from './address.js'
import { selectsOneItem, itemIdentifierParameter } from './item-binding.js'
import { resolveCollectionAccessor } from './native-accessor.js'

/** Address normalization needs no routes or app-specific execution state. */
interface AddressManifest {
  version: string
  resources: Record<string, Resource>
  commands: Record<string, Command>
}

/** Normalize owned command data, retaining declaration-site errors for admission. @internal */
export function addressNormalization<T extends AddressManifest>(
  source: T
): { manifest: T; issues: AddressIssue[] } {
  const issues: AddressIssue[] = []
  if (
    source.version !== '1.1' ||
    !Object.values(source.commands).some((command) => command.parent !== undefined)
  ) {
    return { manifest: source, issues }
  }
  const commands = { ...source.commands }
  for (const [key, original] of Object.entries(source.commands)) {
    if (original.parent === undefined) continue
    const { parent: _parent, ...command } = original
    const shape = CommandSchema.safeParse(original)
    const refuse = (message: string) =>
      issues.push({
        path: ['commands', key, 'parent'],
        message: `Command "${key}" address: ${message}`,
      })
    // Invalid declarations never retain a legacy binding in the normalized value.
    if (!shape.success || original.parents !== undefined || original.item !== undefined) {
      refuse('malformed parent or conflicting parent/parents/item bindings.')
      commands[key] = { ...command, parents: original.parents ?? [] }
      continue
    }
    const parent = shape.data.parent
    if (parent === undefined) continue
    const canonical: Command = {
      ...command,
      parents: [
        {
          ...parent,
          by: 'identity',
          collection: resolveCollectionAccessor(
            source.resources[parent.resource] ?? { plural: parent.resource }
          ),
        },
      ],
    }
    if (shape.data.scope === 'resource' && selectsOneItem(shape.data)) {
      const parameter = itemIdentifierParameter(shape.data)
      const targets =
        typeof command.resourceType === 'string'
          ? [command.resourceType]
          : (command.resourceType ?? Object.keys(source.resources))
      const modes = new Set(
        targets.map((key) =>
          source.resources[key]?.positional === undefined
            ? ('identity' as const)
            : ('index' as const)
        )
      )
      const by = modes.values().next().value
      if (parameter === undefined || modes.size !== 1 || by === undefined) {
        refuse(
          'an item operation needs one required item input and a consistent identity or position binding for its resources.'
        )
      } else if (shape.data.identityTraversal !== undefined && shape.data.name !== 'get') {
        // A singular parent cannot carry an item binding, and an item command's action
        // arguments are not selectors, so the item must not be inferred from its inputs.
        issues.push({
          path: ['commands', key, 'item'],
          message: `Command "${key}" address: an identity-traversal item command requires an explicit item binding; declare parents and item rather than a singular parent.`,
        })
        canonical.item = { by, parameter: parameter.name }
      } else canonical.item = { by, parameter: parameter.name }
    }
    commands[key] = canonical
  }
  return { manifest: { ...source, commands }, issues }
}

/**
 * Establish the canonical address representation before consuming a manifest.
 * Invalid legacy declarations fail at their source site, without choosing a binding.
 * @public
 */
export function normalizeManifestAddresses(manifest: AppManifest): AppManifest {
  const result = addressNormalization(manifest)
  if (result.issues.length > 0) {
    throw new ValidationError('Invalid manifest address declaration.', { issues: result.issues })
  }
  return result.manifest
}
