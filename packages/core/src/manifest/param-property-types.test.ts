/**
 * Guard: a create or update parameter that shares its name with a property of
 * the resource it targets declares the same type as that property.
 *
 * The create input of a resource is its writable properties, overridden by the
 * backing `create` command's parameters of the same name (`createInputFields`
 * in `../generator/surface.ts`), and an update writes the same fields. So a
 * parameter's type is the type a caller writes, and the property's type is the
 * type a caller reads back. When the two disagree, a value read from a record
 * cannot be written back, and a written value does not decode as what is read.
 *
 * Regression: Reminders `List.color` became a `string` property while the list
 * `create` command's `color` parameter was still `rgb`, so the create input
 * took a color triple and the record returned a string.
 *
 * Commands are resolved the way the generators resolve them: the commands that
 * apply to the resource (`resourceCommandEntries`), and among them the one
 * named `create` or `update` (`findCrudCommand`). Two types are the same when
 * they map to the same value composition (`mapDeclaredType`, as the contract
 * generator maps them), so a bare enum name and `{ enum: E }` naming the same
 * enum agree. Where either type names something the manifest does not
 * declare, the declared types themselves must be equal. An absent property
 * type is `string`, the manifest's default. Properties marked unsupported are
 * on no surface, so are not compared.
 *
 * @see ../generator/surface.ts (`createInputFields`)
 * @see ../generator/contract/value-mapping.ts (`mapDeclaredType`)
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { createNameResolver, mapDeclaredType } from '../generator/contract/value-mapping.js'
import { findCrudCommand, resourceCommandEntries } from '../generator/surface.js'
import { loadManifest, parseManifestYaml } from './loader.js'
import type { AppManifest } from './schemas/index.js'
import { usableProperties } from './unsupported.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

/** The commands whose parameters are written as the resource's fields. */
const WRITE_OPERATIONS = ['create', 'update'] as const

/** A create or update parameter whose type differs from its property's. */
interface Mismatch {
  /** e.g. `reminders: List create (command "makeList") color` */
  readonly where: string
  /** The parameter's declared type, as JSON. */
  readonly parameterType: string
  /** The property's declared type, as JSON (`"string"` when absent). */
  readonly propertyType: string
}

/**
 * The create and update parameters of every resource of `manifest` that share
 * a name with a usable property, and those among them whose type differs.
 */
function compareParameters(
  dir: string,
  manifest: AppManifest
): { compared: number; mismatches: Mismatch[] } {
  const names = createNameResolver(manifest)
  const mismatches: Mismatch[] = []
  let compared = 0
  for (const [resourceName, resource] of Object.entries(manifest.resources)) {
    const properties = new Map(usableProperties(resource))
    const commands = resourceCommandEntries(manifest, resourceName)
    for (const operation of WRITE_OPERATIONS) {
      const entry = findCrudCommand(commands, operation)
      if (entry === undefined) continue
      const [commandKey, command] = entry
      for (const parameter of command.parameters) {
        const property = properties.get(parameter.name)
        if (property === undefined) continue
        compared++
        const declaredParameter = JSON.stringify(parameter.type)
        const declaredProperty = JSON.stringify(property.type ?? 'string')
        // Both at the same position, so only the declared types can differ.
        const asParameter = mapDeclaredType(parameter.type, 'input', names)
        const asProperty = mapDeclaredType(property.type, 'input', names)
        const same =
          asParameter.resolved && asProperty.resolved
            ? JSON.stringify(asParameter.shape) === JSON.stringify(asProperty.shape)
            : declaredParameter === declaredProperty
        if (same) continue
        mismatches.push({
          where: `${dir}: ${resourceName} ${operation} (command "${commandKey}") ${parameter.name}`,
          parameterType: declaredParameter,
          propertyType: declaredProperty,
        })
      }
    }
  }
  return { compared, mismatches }
}

/** The mismatches as one line each, for a readable failure. */
function describeMismatches(mismatches: readonly Mismatch[]): string[] {
  return mismatches.map(
    ({ where, parameterType, propertyType }) =>
      `${where}: parameter ${parameterType}, property ${propertyType}`
  )
}

/**
 * A list resource whose `color` is a `string` property, created by a command
 * whose `color` parameter has the type given.
 */
function listManifest(colorParameterType: string): AppManifest {
  return parseManifestYaml(`
version: '1.0'
app:
  bundleId: com.example.lists
  name: Lists
  tccEntitlements: []
resources:
  List:
    name: List
    plural: Lists
    description: A list
    properties:
      name: { access: rw, type: string, description: Name }
      color: { access: rw, type: string, description: Color }
      status: { access: rw, type: { enum: ListStatus }, description: Status }
enums:
  ListStatus:
    name: ListStatus
    values:
      - { name: active, value: active }
      - { name: archived, value: archived }
hierarchy:
  children:
    lists: { resource: List, access: rw }
commands:
  makeList:
    name: create
    description: Make a list
    scope: resource
    resourceType: List
    parameters:
      - { name: name, type: string, description: Name, required: true }
      - { name: color, type: ${colorParameterType}, description: Color, required: false }
      - { name: status, type: ListStatus, description: Status, required: false }
    permission: lists:lists:create
`)
}

let manifests: { dir: string; manifest: AppManifest }[] = []

beforeAll(async () => {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => ({
        dir: entry.name,
        manifest: await loadManifest(resolve(MANIFESTS_DIR, entry.name, 'app.yaml')),
      }))
  )
})

describe('comparing create and update parameters with their properties', () => {
  // Regression: Reminders List.color, create parameter rgb versus property string.
  it('flags a create parameter rgb whose property is string', () => {
    expect(describeMismatches(compareParameters('lists', listManifest('rgb')).mismatches)).toEqual([
      'lists: List create (command "makeList") color: parameter "rgb", property "string"',
    ])
  })

  it('accepts matching types, and a bare enum name for the same enum', () => {
    // name and color are strings on both sides; status names ListStatus as a
    // bare name on the parameter and as { enum: ListStatus } on the property.
    expect(compareParameters('lists', listManifest('string'))).toEqual({
      compared: 3,
      mismatches: [],
    })
  })
})

describe('create and update parameters in the shipped manifests', () => {
  it('discovers the shipped manifests', () => {
    // Guards against a vacuous pass if the manifests directory moves.
    expect(manifests.length).toBeGreaterThan(30)
  })

  // Regression: Reminders List.color, create parameter rgb versus property string.
  it('types the Reminders list create command color parameter as List.color is typed', () => {
    const reminders = manifests.find(({ dir }) => dir === 'reminders')
    expect(reminders).toBeDefined()
    if (reminders === undefined) return
    const color = describeMismatches(
      compareParameters('reminders', reminders.manifest).mismatches
    ).filter((line) => line.startsWith('reminders: List create ') && line.includes(') color:'))
    expect(color).toEqual([])
    expect(reminders.manifest.resources['List']?.properties['color']?.type).toBe('string')
  })

  it('declares each one with the type of the property of the same name', () => {
    const results = manifests.map(({ dir, manifest }) => compareParameters(dir, manifest))
    expect(describeMismatches(results.flatMap((result) => result.mismatches))).toEqual([])
    // Guards against a vacuous pass: many create and update commands name their fields.
    expect(results.reduce((sum, result) => sum + result.compared, 0)).toBeGreaterThan(20)
  })
})
