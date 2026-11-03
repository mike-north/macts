/**
 * Test-only reference for list bodies: the per-item read that list bodies
 * replaced, kept so the batched read can be held equal to it.
 *
 * A list once read each item's whole property record with one `properties()`
 * request per item, and fell back to guarded per-field reads for an item whose
 * record could not be read. Its output is the behavior the batched read must
 * preserve, item for item: the same fields, the same `null` for a missing
 * value, the same identifier and aliases, and the same failures. It is built
 * here from the same manifest resolvers the production builder uses, so the
 * two bodies differ only in how they read.
 *
 * This module is not exported from the package.
 */

import type { OperationTarget } from '@macts/contracts'
import {
  CANONICAL_IDENTIFIER_KEY,
  resolveCanonicalIdentifierSource,
  resolveIdentifierTargeting,
  resolveListOutputProperties,
  resolvePrimaryIdentifierProperty,
} from '../../manifest/identifier.js'
import {
  resolveCollectionAccessor,
  resolvePropertyAccessor,
} from '../../manifest/native-accessor.js'
import type { AppManifest } from '../../manifest/schemas/app.js'
import type { Resource } from '../../manifest/schemas/resource.js'
import { NO_SUCH_OBJECT_ERROR_NUMBER, buildTargetExpression } from '../native-scripts.js'

/** A JSON string literal, which is also a valid JavaScript string literal. */
function literal(text: string): string {
  return JSON.stringify(text)
}

/** Member access on `expression` by a manifest-derived name. */
function member(expression: string, name: string): string {
  return `${expression}[${literal(name)}]`
}

/** Join body statements, one per line, dropping empty parts. */
function lines(...parts: readonly string[]): string {
  return parts.filter((part) => part !== '').join('\n')
}

/** A declared resource by key, or `undefined`. */
function resourceOf(manifest: AppManifest, key: string | undefined): Resource | undefined {
  return key !== undefined && Object.hasOwn(manifest.resources, key)
    ? manifest.resources[key]
    : undefined
}

/**
 * Statements binding the parent of a scoped list to `parent`, failing as
 * "no such object" when it does not exist, exactly as list bodies do.
 */
function parentBinding(manifest: AppManifest, target: OperationTarget): string {
  const command = manifest.commands[target.command]
  const parent = command?.parent
  if (command === undefined || parent === undefined) return ''
  const parentResource = resourceOf(manifest, parent.resource)
  if (parentResource === undefined) throw new Error('the parent resource is not declared')
  const parameter = command.parameters.find((p) => p.name === parent.parameter)
  const read = member('args', parent.parameter)
  return lines(
    `var parentId = ${parameter?.type === 'date' ? `new Date(${read})` : read};`,
    `var parent = ${buildTargetExpression(parentResource, resolveCollectionAccessor(parentResource), 'parentId')};`,
    'if (!parent.exists()) {',
    "  var missing = new Error('No such object.');",
    `  missing.errorNumber = ${String(NO_SUCH_OBJECT_ERROR_NUMBER)};`,
    '  throw missing;',
    '}'
  )
}

/**
 * The per-item list body for `target`: one `properties()` request per item,
 * with guarded per-field reads for an item whose record fails, and the
 * runtime identifier read unguarded in both paths.
 */
export function buildPerItemListBody(
  manifest: AppManifest,
  target: OperationTarget,
  identifierAliases: boolean
): string {
  const command = manifest.commands[target.command]
  if (command === undefined) throw new Error('the target names no command')
  const resource = resourceOf(manifest, target.resource)
  const resourcePlural = resource === undefined ? 'items' : resolveCollectionAccessor(resource)
  const allPropNames = resolveListOutputProperties(resource)
  const targeting = resolveIdentifierTargeting(resource)
  const runtimeIdProperty = targeting?.property
  const declaredIdProperty = resolvePrimaryIdentifierProperty(resource)
  const skipPropertyRead =
    targeting?.strategy === 'byProperty' &&
    declaredIdProperty !== undefined &&
    declaredIdProperty !== runtimeIdProperty
      ? declaredIdProperty
      : undefined
  const bestEffortProps = allPropNames.filter(
    (p) => p !== runtimeIdProperty && p !== skipPropertyRead
  )
  const native = (p: string): string =>
    resolvePropertyAccessor(
      p,
      resource !== undefined && Object.hasOwn(resource.properties, p)
        ? resource.properties[p]
        : undefined
    )

  // The canonical alias is left out when the resource has its own `id` field
  // (see resolveCanonicalIdentifierSource), so it never overwrites that field.
  const aliasSource = resolveCanonicalIdentifierSource(resource)
  const idAlias =
    identifierAliases && runtimeIdProperty !== undefined
      ? lines(
          aliasSource === undefined
            ? ''
            : `${member('obj', CANONICAL_IDENTIFIER_KEY)} = ${member('obj', aliasSource)};`,
          declaredIdProperty !== undefined && declaredIdProperty !== runtimeIdProperty
            ? `${member('obj', declaredIdProperty)} = ${member('obj', runtimeIdProperty)};`
            : ''
        )
      : ''
  const binding = parentBinding(manifest, target)
  const collection =
    binding === '' ? member('app', resourcePlural) : member('parent', resourcePlural)

  return lines(
    binding,
    `var items = ${collection}();`,
    'var result = [];',
    'for (var i = 0; i < items.length; i++) {',
    'var item = items[i];',
    'var obj = {};',
    'try {',
    'var props = item.properties();',
    ...bestEffortProps.map(
      (p) =>
        `if (${member('props', native(p))} !== undefined) { ${member('obj', p)} = ${member('props', native(p))}; }`
    ),
    runtimeIdProperty !== undefined
      ? `${member('obj', runtimeIdProperty)} = ${member('props', native(runtimeIdProperty))};`
      : '',
    '} catch (e) {',
    ...bestEffortProps.map(
      (p) => `try { ${member('obj', p)} = ${member('item', native(p))}(); } catch (e) {}`
    ),
    runtimeIdProperty !== undefined
      ? `${member('obj', runtimeIdProperty)} = ${member('item', native(runtimeIdProperty))}();`
      : '',
    '}',
    idAlias,
    'result.push(obj);',
    '}',
    'return result;'
  )
}
