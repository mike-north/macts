/**
 * When a resource's primary identifier may rely on the default targeting.
 *
 * An identifier with no `targeting` is looked up with the app's `id`
 * specifier (`byId`, see `resolveIdentifierTargeting`). That specifier finds
 * an item by the class's dictionary id, the property the dictionary declares
 * with code `ID  `, and by nothing else: `byId(name)` on a class with no
 * dictionary id, or with one that is not the identifier, finds no item. So
 * the default is valid only when the identifier's property is the class's
 * dictionary id, code `ID  `, whatever the property is named (Calendar's
 * event spells it `uid`). Any other identifier (a name, a path, a tty, a
 * persistent ID) declares its targeting, whether or not the class also has
 * an `id`. A property declaring no code never qualifies.
 *
 * The rule judges the resolved primary identifier of a validated manifest,
 * which is read flattened, so a subclass that declares no identifiers is
 * judged on the identifier, targeting and property code it inherits. A
 * singleton root's identifier is derived with `byRoot` and is always
 * declared. A resource with no identifier, or one marked unsupported, which
 * no surface offers, is not judged.
 *
 * Generation and registration both refuse a manifest this rule refuses,
 * through {@link untargetedIdentifiers}.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10 (Identifier targeting)
 *
 * @packageDocumentation
 */

import type { AppManifest } from './schemas/app.js'
import type { Resource } from './schemas/resource.js'
import { resolvePrimaryIdentifier } from './primary-identifier.js'
import { usableResources } from './unsupported.js'

/** The four-character code a scripting dictionary gives a class's id property. */
const DICTIONARY_ID_CODE = 'ID  '

/**
 * Why a resource cannot be offered, when its primary identifier declares no
 * targeting and its property is not the class's dictionary id, code `ID  `.
 *
 * @remarks
 * The text names the resource and the identifier property, states the rule
 * and says what to declare. Callers prefix it with the app and what is
 * refused, such as registration or generation.
 *
 * @param resourceKey - The resource's key in `manifest.resources`.
 * @param resource - The resource as a validated manifest holds it, with what
 *   it inherits.
 * @returns The reason, starting with "its ...", or `undefined` when the
 *   resource has no identifier, declares its targeting, or is identified by
 *   its dictionary id.
 */
export function identifierTargetingProblem(
  resourceKey: string,
  resource: Resource
): string | undefined {
  const identifier = resolvePrimaryIdentifier(resource)
  if (identifier === undefined || identifier.targeting !== undefined) return undefined
  const code = Object.hasOwn(resource.properties, identifier.property)
    ? resource.properties[identifier.property]?.code
    : undefined
  if (code === DICTIONARY_ID_CODE) return undefined
  const coded = code === undefined ? 'which declares no code' : `code "${code}"`
  return `its resource "${resourceKey}" is identified by "${identifier.property}" (${coded}), which is not the class's dictionary id, code ID, and declares no targeting. An identifier with no targeting is looked up with the app's id specifier (byId), which is valid only for the class's dictionary id, code ID. Declare the targeting of "${resourceKey}"'s identifier "${identifier.property}": byProperty to match on it, or byKey to look it up with its collection's key specifier.`
}

/** A resource whose primary identifier may not rely on the default targeting. */
export interface UntargetedIdentifier {
  /** The resource's key in `manifest.resources`. */
  readonly resourceKey: string
  /** The primary identifier's property. */
  readonly property: string
  /** The reason, as {@link identifierTargetingProblem} gives it. */
  readonly problem: string
}

/**
 * The resources of a manifest whose primary identifier declares no targeting
 * and is not the class's dictionary id, in declaration order, each once.
 *
 * @param manifest - A validated app manifest, read flattened.
 * @returns One entry per such resource; empty when every resource qualifies.
 */
export function untargetedIdentifiers(manifest: AppManifest): UntargetedIdentifier[] {
  const found: UntargetedIdentifier[] = []
  for (const [resourceKey, resource] of usableResources(manifest)) {
    const problem = identifierTargetingProblem(resourceKey, resource)
    const property = resolvePrimaryIdentifier(resource)?.property
    if (problem !== undefined && property !== undefined) {
      found.push({ resourceKey, property, problem })
    }
  }
  return found
}
