/**
 * The kinds a probed property's declared type expects, resolved against the
 * probed manifest's resources and enums.
 *
 * The labels and the type-to-kinds table live in `../manifest/value-kinds.ts`,
 * shared with the manifest's `unsupported` kind evidence; this module only
 * resolves type names the way the contract generator does, so the probe's
 * check and the generated decoders read a declared type the same way.
 *
 * @packageDocumentation
 */

import type { NameResolver } from '../generator/contract/value-mapping.js'
import type { PropertyType } from '../manifest/schemas/property.js'
import {
  expectedValueKinds,
  type TypeNameResolver,
  type ValueKind,
} from '../manifest/value-kinds.js'

/** A type-name resolver over a manifest's resources and enums, preferred kind first. */
function typeNameResolver(names: NameResolver): TypeNameResolver {
  return (name, preferred) => {
    const order =
      preferred === 'resource' ? (['resource', 'enum'] as const) : (['enum', 'resource'] as const)
    for (const kind of order) {
      const found = kind === 'resource' ? names.resource(name) : names.enumeration(name)
      if (found !== undefined) return kind
    }
    return undefined
  }
}

/**
 * The kinds a property's values may have, from its declared type and the
 * manifest's names, or `undefined` when the type is not checked.
 *
 * @param type - The property's declared type.
 * @param names - Resolves type names to the manifest's resources and enums.
 *
 * @internal Used within this package only (the generators, the manifest
 * schemas, and the nullability probe).
 */
export function expectedValueKindsIn(
  type: PropertyType | undefined,
  names: NameResolver
): readonly ValueKind[] | undefined {
  return expectedValueKinds(type, typeNameResolver(names))
}
