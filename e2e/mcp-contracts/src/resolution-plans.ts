/**
 * Whether a resource's two resolution results have the same record shape, and
 * the macOS provider's get and list bodies read the same properties.
 *
 * A single reference resolves as the resource's `get` and is validated against
 * the get output. An identity collection resolves as its `list`, validated
 * against an array of the list's page items (phases/13 D7,
 * `referenceResultType`). The macOS provider reads every resolved object,
 * single or in a collection, with the get body's record read. That is correct
 * only while a get record and a list item have the same plan, and the get
 * body reads the same keys a list body reads, so this module compares both
 * for a resource and describes every difference.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D7, D9)
 */

import type { NativeReadKeys } from '@macts/core/testing'
import {
  referenceResultType,
  type AnyOperationDescriptor,
  type OperationId,
  type ResourceDescriptor,
} from '@macts/contracts'

/** The outcome of comparing one resource's get record and list item plans. */
export type ResolutionPlanComparison =
  /** The resource lacks a get or a list, so there is nothing to compare. */
  | { readonly compared: false; readonly reason: string }
  /** Both exist; `differences` is empty exactly when the plans are equal. */
  | { readonly compared: true; readonly differences: readonly string[] }

/** A resource's descriptor, as much of it as the comparison reads. */
export type ResolvableResource = Pick<ResourceDescriptor<unknown>, 'name' | 'get' | 'list'>

/**
 * Compare the plan a single reference to `resource` resolves to (its get
 * output) with the plan of one item of what an identity collection of it
 * resolves to (its list's page item).
 *
 * @param resource - The resource's descriptor in its contract.
 * @param operations - The contract's operations, in which `get` and `list` are
 *   looked up.
 * @returns Not compared when the resource records no get or no list;
 *   otherwise each difference, naming the resource, the plan path and both
 *   sides.
 * @throws `Error` when the resource records an operation the contract lacks:
 *   the contract is inconsistent.
 */
export function compareResolutionPlans(
  resource: ResolvableResource,
  operations: Readonly<Record<OperationId, AnyOperationDescriptor>>
): ResolutionPlanComparison {
  const { get, list } = resource
  if (get === undefined || list === undefined) return notCompared(resource)
  const getRecord = referenceResultType('one', operationOf(operations, get).output).plan
  const listResult = referenceResultType('many', operationOf(operations, list).output).plan
  // A passthrough list resolves to itself, not to an array of items.
  const listItem = listResult.kind === 'array' ? listResult.items : listResult
  return {
    compared: true,
    differences: planDifferences(getRecord, listItem, []).map(
      (difference) => `${resource.name} (get ${get}, list ${list}): ${difference}`
    ),
  }
}

/**
 * Compare the record keys the native get body reads for `resource` with those
 * the native list body reads, when the resource records both a get and a
 * list.
 *
 * @param resource - The resource's descriptor in its contract.
 * @param reads - The keys each body reads, from the app's manifest.
 * @returns Not compared when the resource records no get or no list;
 *   otherwise each key one body reads and the other does not, naming the
 *   resource.
 */
export function compareNativeReads(
  resource: ResolvableResource,
  reads: NativeReadKeys
): ResolutionPlanComparison {
  if (resource.get === undefined || resource.list === undefined) return notCompared(resource)
  const onlyIn = (keys: readonly string[], others: readonly string[]): string[] =>
    keys.filter((key) => !others.includes(key)).sort()
  return {
    compared: true,
    differences: [
      ...onlyIn(reads.get, reads.list).map(
        (key) => `${resource.name}: the get body reads "${key}" but the list body does not`
      ),
      ...onlyIn(reads.list, reads.get).map(
        (key) => `${resource.name}: the list body reads "${key}" but the get body does not`
      ),
    ],
  }
}

/** The comparison of a resource that lacks a get or a list: nothing to compare. */
function notCompared(resource: ResolvableResource): ResolutionPlanComparison {
  const has = (operation: OperationId | undefined, name: string): string =>
    operation === undefined ? `no ${name}` : `a ${name}`
  return {
    compared: false,
    reason: `${resource.name} has ${has(resource.get, 'get')} and ${has(resource.list, 'list')}`,
  }
}

function operationOf(
  operations: Readonly<Record<OperationId, AnyOperationDescriptor>>,
  id: OperationId
): AnyOperationDescriptor {
  const operation = Object.hasOwn(operations, id) ? operations[id] : undefined
  if (operation === undefined) throw new Error(`The contract has no operation "${id}"`)
  return operation
}

/** A plan path for a message: `fields.name.presence`, or `(the plan)` at the root. */
function describePath(path: readonly string[]): string {
  return path.length === 0 ? '(the plan)' : path.join('.')
}

/**
 * Every difference between the get record plan `get` and the list item plan
 * `list`, at `path` and below: a key one side has and the other lacks, or a
 * value that differs. Plans are plain JSON, so they are compared structurally.
 */
function planDifferences(get: unknown, list: unknown, path: readonly string[]): string[] {
  const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
  if (isObject(get) && isObject(list)) {
    const keys = [...new Set([...Object.keys(get), ...Object.keys(list)])].sort()
    return keys.flatMap((key) => {
      const at = [...path, key]
      if (!Object.hasOwn(list, key)) {
        return [`${describePath(at)} is only in the get record: ${JSON.stringify(get[key])}`]
      }
      if (!Object.hasOwn(get, key)) {
        return [`${describePath(at)} is only in the list item: ${JSON.stringify(list[key])}`]
      }
      return planDifferences(get[key], list[key], at)
    })
  }
  if (Array.isArray(get) && Array.isArray(list) && get.length === list.length) {
    return get.flatMap((item: unknown, index) =>
      planDifferences(item, list[index], [...path, String(index)])
    )
  }
  if (JSON.stringify(get) === JSON.stringify(list)) return []
  return [
    `${describePath(path)} is ${JSON.stringify(get)} in the get record but ${JSON.stringify(list)} in the list item`,
  ]
}
