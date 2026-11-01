/**
 * Nullability and resettability decisions for manifest fields.
 *
 * Whether a field can hold `null` is decided here once, for every consumer:
 * the contract generator types fields by it, and the nullability probe uses it
 * to see which claims an observation confirms or contradicts.
 *
 * The defaults follow compatibility. Narrowing an output from `T | null` to
 * `T` later is non-breaking for callers, while widening it is breaking, so a
 * read field (an output) is nullable unless there is evidence that it is
 * always set. Inputs work the other way round: widening an input to accept
 * `null` is non-breaking, so a parameter accepts `null` only with evidence,
 * and an update resets a field with `null` only where that is verified.
 *
 * @packageDocumentation
 */

import { resolvePrimaryIdentifierProperty } from './identifier.js'
import type { NullabilityEvidence, ResettabilityEvidence } from './schemas/evidence.js'
import type { CommandParameter } from './schemas/command.js'
import type { Property } from './schemas/property.js'
import type { Resource } from './schemas/resource.js'

/**
 * Why a field is or is not nullable:
 *
 * - `'identifier'`: the resource's primary identifier property, which is never
 *   null, because a reference to an object cannot exist without it.
 * - `'default'`: the manifest makes no claim, so the position's default
 *   applies (nullable for reads, not nullable for inputs).
 * - a {@link NullabilityEvidence}: the manifest's claim, and the evidence it
 *   rests on.
 */
export type NullabilityBasis = 'identifier' | 'default' | NullabilityEvidence

/** Whether a field is nullable, and why. */
export interface NullabilityResolution {
  /** Whether the field can hold `null`. */
  readonly nullable: boolean
  /** Why. */
  readonly basis: NullabilityBasis
}

/**
 * Whether reading a resource property can find it empty (`null`).
 *
 * - The primary identifier property is never nullable, whatever the manifest
 *   claims. A claim to the contrary is ignored here; generators report it,
 *   since an identifier observed empty means the identifier choice is wrong.
 * - Otherwise the manifest's claim decides, with its evidence as the basis.
 * - Without a claim, the property is nullable (see the module comment for
 *   why the read default is nullable).
 *
 * @param resource - The resource that declares the property.
 * @param propertyName - The property's key in `resource.properties`.
 * @param property - The property definition.
 */
export function resolveReadNullability(
  resource: Resource,
  propertyName: string,
  property: Property
): NullabilityResolution {
  if (resolvePrimaryIdentifierProperty(resource) === propertyName) {
    return { nullable: false, basis: 'identifier' }
  }
  const evidence = property.evidence?.nullable
  if (property.nullable !== undefined && evidence !== undefined) {
    return { nullable: property.nullable, basis: evidence }
  }
  return { nullable: true, basis: 'default' }
}

/**
 * Whether the manifest claims nullability for a resource's primary identifier
 * property, a claim {@link resolveReadNullability} ignores. Returns the claim's
 * evidence when there is such a claim.
 */
export function ignoredIdentifierNullability(
  resource: Resource,
  propertyName: string,
  property: Property
): NullabilityEvidence | undefined {
  if (resolvePrimaryIdentifierProperty(resource) !== propertyName) return undefined
  return property.nullable === undefined ? undefined : property.evidence?.nullable
}

/**
 * Whether a command parameter accepts `null`: only when the manifest claims
 * it, with evidence. Without a claim, it does not.
 */
export function resolveParameterNullability(parameter: CommandParameter): NullabilityResolution {
  const evidence = parameter.evidence?.nullable
  if (parameter.nullable !== undefined && evidence !== undefined) {
    return { nullable: parameter.nullable, basis: evidence }
  }
  return { nullable: false, basis: 'default' }
}

/**
 * The verified way to reset a property with `null` in an update, or
 * `undefined` when there is none, in which case an update cannot set it to
 * `null`.
 */
export function resolveResettability(property: Property): ResettabilityEvidence | undefined {
  return property.resettable === true ? property.evidence?.resettable : undefined
}
