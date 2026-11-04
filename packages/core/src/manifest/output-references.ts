/**
 * Which output positions of an app macts can return a usable reference at
 * today: an interim truth guard over generated output, and the coverage
 * ledger of the positions it cannot yet serve.
 *
 * A contract declares an output reference position only when a reference the
 * app returns there can be resolved, and resolved to the object the app
 * returned (phases/13 D7, "Resolvable targets", "Name-keyed resources"). Every
 * reference a manifest type describes is a single reference, and an array of
 * them is a list of single references, so each one needs its target's `get`
 * ({@link resolvingCommand}). Where the app exposes the relationship, a
 * position macts leaves out is a gap in what macts provides, not something the
 * app cannot do. macts cannot yet return a usable reference when:
 *
 * - macts has no usable `get` for the target yet, so no reference to it passes
 *   validation;
 * - macts has no primary identifier for the target yet, so the target has no
 *   identity form: an object of it can be addressed only by a selector, and
 *   native reads emit only identity references;
 * - the target's `get` records a parent, so the target is identified only
 *   within its container, and the position is not one where a native read
 *   holds that container: a native read hands over, as the container, the
 *   record the field is read through, so it can return one only at a field
 *   of the target's parent itself, and only when that parent is a valid
 *   container ({@link isValidContainer}). A command result is read through no
 *   record, so it has no container to return;
 * - the target's `get` records no parent, but the manifest hierarchy holds the
 *   target only within another resource, never at the application, so the
 *   `get` looks for it in a collection the app does not have, and macts does
 *   not record the parent it needs yet;
 * - or macts identifies the target by its name, and the manifest has no
 *   evidence yet that the name is unique. Such a reference resolves to
 *   whichever object has that name when it is resolved, so it does not pin the
 *   object the app returned. An identifier's `unique` claim, with its
 *   evidence, is the manifest's evidence that the name is the app's identity
 *   for the resource.
 *
 * A position whose value holds such a reference anywhere (bare, in an array,
 * or as the non-null case of a nullable value) is left out of output for now:
 * a record type declares no such field, and an operation whose result is one
 * declares no result. Unlike an input position, `null` and the empty array do
 * not rescue it, because the app decides what it returns and no non-null value
 * could be resolved yet. Coverage work closes each gap (#219), and the
 * position returns on regeneration. Input positions follow their own rule
 * (`../generator/input-satisfiability.ts`), so a field left out of output may
 * still be settable.
 *
 * This module is the one place the decision is made. The contract, HTTP client
 * and CLI generators read record fields through it, the contract generator
 * checks its own records and results against it, and the native get, list,
 * create and update bodies read only the properties it keeps, so none of those
 * surfaces declares or reads a field another leaves out. The native bodies
 * also take from here which fields they hand to the codec together with the
 * record they were read through, as the references' container. The older
 * `generateSdk` path does not use it yet (#253).
 *
 * Internal to this package: nothing here is part of the public entry.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D7
 * @see https://github.com/mike-north/macts/issues/219
 */

import type { AppManifest } from './schemas/app.js'
import type { Command } from './schemas/command.js'
import type { Property } from './schemas/property.js'
import type { Resource } from './schemas/resource.js'
import { resolveIdentifierTargeting, resolvePrimaryIdentifierProperty } from './identifier.js'
import { nestedOnlyResources } from './hierarchy-placement.js'
import { resolvePrimaryIdentifier } from './primary-identifier.js'
import { resolvingCommand } from './resource-commands.js'
import { usableCommands, usableProperties, usableResources } from './unsupported.js'
import {
  createNameResolver,
  mapDeclaredType,
  type DeclaredType,
  type NameResolver,
  type ValueShape,
} from './value-shapes.js'

/**
 * What macts does not provide yet for an output reference to be usable. Each
 * is a coverage gap (#219), not a limit of the app:
 *
 * - `no-get`: macts has no usable `get` command for the target yet.
 * - `no-identifier`: macts has no primary identifier for the target yet, so
 *   no identity reference to one exists.
 * - `parent-scoped`: the target's `get` records a parent, and the position
 *   holds no container for it: it is not a field of the target's parent, or
 *   that parent is not a valid container ({@link isValidContainer}), or it is
 *   a command result, which is read through no record.
 * - `unrecorded-parent`: the target's `get` records no parent, but the app
 *   holds the target only within a container: the manifest hierarchy, which
 *   records the app's element containment, places it under another resource
 *   and never at the application. The parent that `get` would need is what
 *   is missing. When the hierarchy cannot decide where the target lives,
 *   because it places the target nowhere, this reason does not apply.
 * - `not-unique`: macts identifies the target by its name, and the manifest
 *   has no evidence yet that the name is unique, so it does not pin one
 *   object.
 */
export type OmittedOutputReason =
  | 'no-get'
  | 'no-identifier'
  | 'parent-scoped'
  | 'unrecorded-parent'
  | 'not-unique'

/** An output reference macts cannot return in a usable form yet, and why. */
export interface OmittedOutput {
  /** The manifest key of the resource the position references. */
  readonly target: string
  /** What macts does not provide yet for a reference to it. */
  readonly reason: OmittedOutputReason
}

/**
 * Whether a resource is identified by a name that is not claimed to be its
 * identity: the property a reference to it carries and is resolved by
 * ({@link resolveIdentifierTargeting}) is `name`, and its primary identifier
 * makes no `unique: true` claim. That covers a resource that declares `name`
 * as its identifier and one matched on `name` instead of its declared
 * identifier; the claim covers the value the runtime reads, so it applies to
 * both.
 *
 * @param manifest - The app manifest.
 * @param resourceKey - The manifest key of the resource.
 */
export function isNameKeyed(manifest: AppManifest, resourceKey: string): boolean {
  const resource = Object.hasOwn(manifest.resources, resourceKey)
    ? manifest.resources[resourceKey]
    : undefined
  if (resolveIdentifierTargeting(resource)?.property !== 'name') return false
  return resolvePrimaryIdentifier(resource)?.unique !== true
}

/**
 * Whether `containerKey` can be the container a native read returns with a
 * reference to one of its children: a reference to it read from the app
 * would itself be usable with no container ({@link omittedOutputReason} with
 * no source). That is, it has a usable `get` and a primary identifier, that
 * `get` records no parent (it is top-level), the hierarchy does not hold it
 * only within another resource, and it is not name-keyed, or it claims its
 * name unique with evidence.
 *
 * A container whose own `get` records a parent would need its own container
 * in turn (a nested chain), which a native read does not return.
 *
 * @param manifest - The app manifest.
 * @param containerKey - The manifest key of the would-be container.
 */
export function isValidContainer(manifest: AppManifest, containerKey: string): boolean {
  return omittedOutputReason(manifest, containerKey) === undefined
}

/**
 * What macts does not provide yet for a reference read from the app to
 * `resourceKey` to be usable, or `undefined` when it can be used: the
 * resource has a usable `get` and a primary identifier; that `get` records no
 * parent, or it records `sourceKey` and that is a valid container
 * ({@link isValidContainer}); the hierarchy does not hold the resource only
 * within another resource while its `get` records no parent
 * ({@link nestedOnlyResources}); and the resource is not name-keyed
 * ({@link isNameKeyed}). The reasons are checked in that order (`no-get`,
 * `no-identifier`, `parent-scoped`, `unrecorded-parent`, `not-unique`), so
 * the first that applies is reported.
 *
 * The judgment is positional for a target whose `get` records a parent: a
 * native read hands the codec, as the reference's container, the record the
 * field was read through, never a container it asks the object for. So such a
 * target is usable only at a field of its parent's own record.
 *
 * @param manifest - The app manifest.
 * @param resourceKey - The manifest key of the referenced resource.
 * @param sourceKey - The manifest key of the resource whose record holds the
 *   position; `undefined` for a command result, which is read through no
 *   record.
 */
export function omittedOutputReason(
  manifest: AppManifest,
  resourceKey: string,
  sourceKey?: string
): OmittedOutputReason | undefined {
  const get = resolvingCommand(manifest, resourceKey, 'get')
  if (get === undefined) return 'no-get'
  if (resolvePrimaryIdentifierProperty(manifest.resources[resourceKey]) === undefined) {
    return 'no-identifier'
  }
  const parent = get[1].parent?.resource
  if (parent !== undefined) {
    if (parent !== sourceKey || !isValidContainer(manifest, parent)) return 'parent-scoped'
  } else if (nestedOnlyResources(manifest).has(resourceKey)) {
    return 'unrecorded-parent'
  }
  return isNameKeyed(manifest, resourceKey) ? 'not-unique' : undefined
}

/**
 * The manifest key of the container a native read returns with a reference
 * to `resourceKey`, or `undefined` when such a reference carries none: the
 * parent its `get` records. Meaningful only for a position the output rule
 * keeps, where that parent is the resource whose record holds the field.
 *
 * @param manifest - The app manifest.
 * @param resourceKey - The manifest key of the referenced resource.
 */
export function outputContainer(manifest: AppManifest, resourceKey: string): string | undefined {
  return resolvingCommand(manifest, resourceKey, 'get')?.[1].parent?.resource
}

/** The resource keys a value composition references. */
function referencedResources(shape: ValueShape): string[] {
  switch (shape.kind) {
    case 'reference':
      return [shape.resourceKey]
    case 'array':
      return referencedResources(shape.item)
    case 'nullable':
      return referencedResources(shape.inner)
    default:
      return []
  }
}

/**
 * The first reference an output value composition holds that macts cannot
 * return in a usable form yet, or `undefined` when every reference in it can
 * be used (or it holds none). Arrays and nullables are looked through: an
 * array holds its items, and a nullable value holds its non-null case.
 *
 * @param manifest - The app manifest.
 * @param shape - The composition of the output position.
 * @param sourceKey - The resource whose record holds the position;
 *   `undefined` for a command result (see {@link omittedOutputReason}).
 */
export function omittedOutput(
  manifest: AppManifest,
  shape: ValueShape,
  sourceKey?: string
): OmittedOutput | undefined {
  for (const target of referencedResources(shape)) {
    const reason = omittedOutputReason(manifest, target, sourceKey)
    if (reason !== undefined) return { target, reason }
  }
  return undefined
}

/** The composition a declared type has at an output position. */
function outputShape(type: DeclaredType, names: NameResolver): ValueShape {
  return mapDeclaredType(type, 'output', names).shape
}

/**
 * The usable properties of a resource that its output record leaves out, by
 * property name, with the reference each holds that macts cannot return in a
 * usable form yet.
 *
 * @param manifest - The app manifest.
 * @param resourceKey - The manifest key of `resource`: the record each field
 *   is read through, which a reference to a target got within it carries as
 *   its container.
 * @param resource - The resource's definition.
 */
export function omittedOutputProperties(
  manifest: AppManifest,
  resourceKey: string,
  resource: Pick<Resource, 'properties'>
): ReadonlyMap<string, OmittedOutput> {
  const omitted = new Map<string, OmittedOutput>()
  const names = createNameResolver(manifest)
  for (const [name, property] of usableProperties(resource)) {
    const found = omittedOutput(manifest, outputShape(property.type, names), resourceKey)
    if (found !== undefined) omitted.set(name, found)
  }
  return omitted
}

/**
 * The properties a resource's output record declares, in declaration order:
 * its usable properties less those {@link omittedOutputProperties} leaves out.
 * The contract, HTTP client and CLI generators and the native reads take a
 * record's fields from here; the older `generateSdk` path does not yet
 * (#253).
 *
 * @param manifest - The app manifest.
 * @param resourceKey - The manifest key of `resource`.
 * @param resource - The resource's definition.
 * @returns The `[name, property]` pairs.
 */
export function outputProperties(
  manifest: AppManifest,
  resourceKey: string,
  resource: Pick<Resource, 'properties'>
): [string, Property][] {
  const omitted = omittedOutputProperties(manifest, resourceKey, resource)
  return usableProperties(resource).filter(([name]) => !omitted.has(name))
}

/**
 * The properties of a resource's output record ({@link outputProperties})
 * whose references a native read returns with the record as their container:
 * those holding a reference to a target whose `get` records the resource as
 * its parent ({@link outputContainer}). The output rule keeps such a field
 * only when the resource is a valid container, so every one of them carries
 * the record it was read through.
 *
 * @param manifest - The app manifest.
 * @param resourceKey - The manifest key of `resource`.
 * @param resource - The resource's definition.
 * @returns The property names, in declaration order.
 */
export function containedOutputProperties(
  manifest: AppManifest,
  resourceKey: string,
  resource: Pick<Resource, 'properties'>
): string[] {
  const names = createNameResolver(manifest)
  return outputProperties(manifest, resourceKey, resource)
    .filter(([, property]) =>
      referencedResources(outputShape(property.type, names)).some(
        (target) => outputContainer(manifest, target) === resourceKey
      )
    )
    .map(([name]) => name)
}

/**
 * The reference a command's result holds that macts cannot return in a usable
 * form yet, or `undefined` when the command records no result or its result
 * can be used. An operation whose result holds one declares no result.
 *
 * @param manifest - The app manifest.
 * @param command - The manifest command.
 */
export function omittedOutputResult(
  manifest: AppManifest,
  command: Command
): OmittedOutput | undefined {
  if (command.returns === undefined) return undefined
  return omittedOutput(manifest, outputShape(command.returns, createNameResolver(manifest)))
}

/** An output position that is left out, where it is declared, and why. */
export interface OmittedOutputPosition extends OmittedOutput {
  /**
   * The declaration, as a dotted manifest path:
   * `resources.<Resource>.properties.<property>` or `commands.<command>.returns`.
   */
  readonly position: string
  /** The resource whose record leaves the field out; absent for a result. */
  readonly resource?: string
  /** The property left out; absent for a result. */
  readonly property?: string
  /** The command whose result is left out; absent for a record field. */
  readonly command?: string
}

/**
 * Every output position of the app that is left out, in manifest order: the
 * record fields of usable resources, then the results of usable commands.
 *
 * @param manifest - The app manifest.
 */
export function omittedOutputPositions(manifest: AppManifest): OmittedOutputPosition[] {
  const found: OmittedOutputPosition[] = []
  for (const [resourceKey, resource] of usableResources(manifest)) {
    for (const [property, omitted] of omittedOutputProperties(manifest, resourceKey, resource)) {
      found.push({
        position: `resources.${resourceKey}.properties.${property}`,
        resource: resourceKey,
        property,
        ...omitted,
      })
    }
  }
  for (const [commandKey, command] of usableCommands(manifest)) {
    const omitted = omittedOutputResult(manifest, command)
    if (omitted !== undefined) {
      found.push({ position: `commands.${commandKey}.returns`, command: commandKey, ...omitted })
    }
  }
  return found
}
