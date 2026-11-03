/**
 * Which input positions of an operation can be given a value.
 *
 * A reference names its target only when the app has the operation that
 * resolves it (phases/13 D7, "Resolvable targets"), and every reference an
 * input position takes is a single reference, which the target's `get`
 * resolves. A position whose value is a reference to a resource with no `get`
 * therefore admits no value at all: encoding and the wire schema reject every
 * reference to it. Such a position is unsatisfiable. A position that also
 * admits `null`, or that takes an array (which may be empty), is not.
 *
 * Generated surfaces never offer what cannot be called:
 *
 * - An optional unsatisfiable position is left out of the operation's input:
 *   its SDK types, value types and JSON Schemas, CLI flags and capability
 *   schema. The operation stays callable without it.
 * - An operation with a required unsatisfiable position can never be called.
 *   Its contract descriptor stays, marked `unavailable`, and generation
 *   reports it; the surfaces that offer operations to agents (MCP tools,
 *   generated CLI commands, and capability discovery) leave it out.
 *
 * The judgment is made from the manifest alone, so the contract generator,
 * the CLI generator and the capability registry (which runtime discovery
 * builds from manifests) share it.
 *
 * @packageDocumentation
 */

import type { AppManifest, Command, CommandParameter } from '../manifest/index.js'
import { resolveParameterNullability, resolveResettability } from '../manifest/index.js'
import {
  createInputFields,
  findCrudCommand,
  isCrudName,
  resolveIdParams,
  resolvingCommand,
  resourceCommandEntries,
  type DeclaredType,
} from './surface.js'
import { createNameResolver, mapDeclaredType, type ValueShape } from './contract/value-mapping.js'

/** An input position of an operation that admits no value. */
export interface UnsatisfiableInput {
  /** The request field name. */
  readonly name: string
  /** The manifest key of the resource the position references. */
  readonly resource: string
  /** Whether the request must supply the field. */
  readonly required: boolean
  /**
   * Where the manifest declares the field: a parameter of the operation's
   * command, or a writable property of the resource it creates or updates.
   */
  readonly source: 'parameter' | 'property'
}

/**
 * Whether the app can resolve a single reference to `resourceKey`: it has a
 * usable `get` command for that resource, the same one whose operation the
 * contract's resource table records ({@link resolvingCommand}).
 */
export function resolvesSingleReferences(manifest: AppManifest, resourceKey: string): boolean {
  return resolvingCommand(manifest, resourceKey, 'get') !== undefined
}

/**
 * The resource an input value composition references when that composition
 * admits no value, or `undefined` when it admits one. Only a bare reference
 * can admit none; `null` satisfies a nullable composition and the empty array
 * an array.
 */
export function unsatisfiableTarget(manifest: AppManifest, shape: ValueShape): string | undefined {
  if (shape.kind !== 'reference') return undefined
  return resolvesSingleReferences(manifest, shape.resourceKey) ? undefined : shape.resourceKey
}

/**
 * The unsatisfiable input positions of one operation: `command` applied to
 * the resource `resourceKey` (`undefined` for an app command).
 *
 * The positions are the fields of the operation's request as the contract
 * types it: a resource's chosen `create` takes its create input; a chosen
 * `get`, `update` or `delete` takes its identifier parameters, and an
 * `update` its update input; every other parameter of the command follows.
 *
 * @returns The positions in request order; empty when every position admits a
 *   value.
 */
export function unsatisfiableInputs(
  manifest: AppManifest,
  command: Command,
  resourceKey: string | undefined
): UnsatisfiableInput[] {
  const names = createNameResolver(manifest)
  const found: UnsatisfiableInput[] = []
  const seen = new Set<string>()
  const consider = (
    name: string,
    type: DeclaredType,
    position: Pick<UnsatisfiableInput, 'required' | 'source'> & { readonly nullable: boolean }
  ): void => {
    seen.add(name)
    if (position.nullable) return
    const resource = unsatisfiableTarget(manifest, mapDeclaredType(type, 'input', names).shape)
    if (resource === undefined) return
    found.push({ name, resource, required: position.required, source: position.source })
  }
  const nullable = (param: CommandParameter): boolean => resolveParameterNullability(param).nullable

  const shape = command.scope === 'resource' && isCrudName(command.name) ? command.name : undefined
  const chosen =
    shape !== undefined &&
    resourceKey !== undefined &&
    findCrudCommand(resourceCommandEntries(manifest, resourceKey), shape)?.[1] === command

  if (chosen && shape === 'create') {
    for (const [name, field] of createInputFields(manifest, resourceKey)) {
      consider(name, field.type, {
        required: field.required,
        source: field.source,
        nullable: false,
      })
    }
    return found
  }
  if (chosen && (shape === 'get' || shape === 'update' || shape === 'delete')) {
    const { parentParam, childParam } = resolveIdParams(command)
    for (const name of parentParam === undefined ? [childParam] : [parentParam, childParam]) {
      const param = command.parameters.find((p) => p.name === name)
      if (param === undefined) seen.add(name)
      else
        consider(name, param.type, {
          required: true,
          source: 'parameter',
          nullable: nullable(param),
        })
    }
  }
  if (chosen && shape === 'update') {
    const properties = manifest.resources[resourceKey]?.properties ?? {}
    for (const [name, field] of createInputFields(manifest, resourceKey)) {
      if (seen.has(name)) continue
      const property = Object.hasOwn(properties, name) ? properties[name] : undefined
      const resettable = property !== undefined && resolveResettability(property) !== undefined
      consider(name, field.type, { required: false, source: field.source, nullable: resettable })
    }
  }
  for (const param of command.parameters) {
    if (seen.has(param.name)) continue
    consider(param.name, param.type, {
      required: param.required,
      source: 'parameter',
      nullable: nullable(param),
    })
  }
  return found
}

/**
 * The input positions an operation leaves out: its optional unsatisfiable
 * positions, by request field name.
 */
export function omittedInputs(
  manifest: AppManifest,
  command: Command,
  resourceKey: string | undefined
): ReadonlySet<string> {
  return new Set(
    unsatisfiableInputs(manifest, command, resourceKey)
      .filter((input) => !input.required)
      .map((input) => input.name)
  )
}

/**
 * Whether an operation can be called: none of its required input positions
 * is unsatisfiable.
 */
export function isOperationAvailable(
  manifest: AppManifest,
  command: Command,
  resourceKey: string | undefined
): boolean {
  return !unsatisfiableInputs(manifest, command, resourceKey).some((input) => input.required)
}
