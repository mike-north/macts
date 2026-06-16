/**
 * Single source of truth for the permission *operation vocabulary*.
 *
 * The permission model is `app:resource:operation`. Operations come in two
 * flavours and this module is the ONE authority that defines them; CLI help,
 * the code generator, and the docs must consume these exports rather than
 * re-typing the operation set (a drift-guard test enforces this — see
 * `vocabulary.test.ts`).
 *
 * 1. **Fine-grained operations** are per-command and *app-specific*. Their
 *    authority is the manifest: every command declares a `permission`
 *    (`app:resource:operation`), and the manifest `permissions` section maps
 *    each coarse alias to the fine-grained operations it covers. Use
 *    {@link getFineOperations} / {@link getOperationVocabulary} to read them
 *    out of a manifest — never hard-code a fine-grained operation list.
 *
 * 2. **Coarse operations** are a small, fixed, app-agnostic CRUD vocabulary
 *    ({@link COARSE_OPERATIONS}). A coarse operation is *sugar*: it does not
 *    authorize anything on its own. It must be expanded against a manifest's
 *    `permissions` section at key-creation time into the fine-grained
 *    operations it covers. A coarse operation that cannot be expanded is
 *    rejected with a precise error — it is never stored, so it can never
 *    silently deny at match time. See `expander.ts` and the API key generator.
 *
 * @packageDocumentation
 */

import type { PermissionsSection } from '../manifest/schemas/app.js'

/**
 * The canonical, fixed set of coarse CRUD operations.
 *
 * This is the ONLY place this list is defined. Coarse operations are aliases
 * that group fine-grained operations; they are expanded against a manifest at
 * key-creation time and never authorize a call directly.
 *
 * Note there is intentionally **no** standalone `read` *that authorizes*: a
 * coarse `read` only ever resolves to the concrete fine-grained operations
 * (`list`, `get`, `show`, …) declared by the manifest. A bare `app:resource:read`
 * scope that is not expanded against a manifest authorizes nothing and is
 * therefore rejected at creation time rather than stored.
 */
export const COARSE_OPERATIONS = ['read', 'create', 'write', 'delete'] as const

/**
 * A coarse CRUD operation name.
 */
export type CoarseOperation = (typeof COARSE_OPERATIONS)[number]

/**
 * Coarse operations that are *grouping-only*: they are never a real
 * fine-grained command operation, so a bare `app:resource:<op>` scope using one
 * of these authorizes nothing unless expanded against a manifest.
 *
 * `read` and `write` are pure aliases (commands use concrete operations like
 * `list`/`get`/`show` and `update`/`insert`/`save`). By contrast `create` and
 * `delete` double as genuine fine-grained operations (a command's operation may
 * literally be `create`), so they are *not* grouping-only — a
 * `calendar:events:create` scope authorizes the `create` call directly.
 *
 * Manifests must not declare a command whose operation is a grouping-only
 * coarse alias; {@link isPureCoarseOperation} backs the validation that
 * enforces this.
 */
export const PURE_COARSE_OPERATIONS = ['read', 'write'] as const

/**
 * A grouping-only coarse operation name (`read` | `write`).
 */
export type PureCoarseOperation = (typeof PURE_COARSE_OPERATIONS)[number]

/**
 * The wildcard operation token.
 *
 * `app:resource:*` authorizes every fine-grained operation on a resource;
 * `app:*:*` authorizes every operation on every resource for an app. Unlike a
 * coarse operation, a wildcard is matched directly by the matcher and needs no
 * manifest to be meaningful.
 */
export const WILDCARD = '*' as const

/**
 * Check whether an operation token is one of the canonical coarse operations.
 */
export function isCoarseOperation(operation: string): operation is CoarseOperation {
  return (COARSE_OPERATIONS as readonly string[]).includes(operation)
}

/**
 * Check whether an operation token is a grouping-only coarse alias (`read` /
 * `write`) — one that never names a real command and therefore authorizes
 * nothing unless expanded against a manifest.
 */
export function isPureCoarseOperation(operation: string): operation is PureCoarseOperation {
  return (PURE_COARSE_OPERATIONS as readonly string[]).includes(operation)
}

/**
 * The operation vocabulary for a single app, derived from its manifest.
 *
 * `coarse` is always the fixed {@link COARSE_OPERATIONS} set; `fine` is the set
 * of fine-grained operation names the manifest actually declares.
 */
export interface OperationVocabulary {
  /** Fixed coarse CRUD operations (alias the manifest may expand). */
  readonly coarse: readonly CoarseOperation[]
  /** App-specific fine-grained operation names declared by the manifest. */
  readonly fine: ReadonlySet<string>
}

/**
 * Extract the set of fine-grained operation names a manifest declares.
 *
 * The manifest's `permissions` section maps each coarse alias to the
 * fully-qualified fine-grained permissions it covers (e.g.
 * `calendar:events:list`). The fine-grained *operation* is the third segment.
 * This is the authoritative per-app fine-grained operation set — callers must
 * not re-type it.
 *
 * @param permissionsSection - The `permissions` mapping from a manifest.
 * @returns The set of fine-grained operation names (e.g. `list`, `get`, `create`).
 */
export function getFineOperations(permissionsSection: PermissionsSection): Set<string> {
  const fine = new Set<string>()
  for (const mapping of Object.values(permissionsSection)) {
    for (const finePermissions of Object.values(mapping)) {
      for (const perm of finePermissions) {
        const operation = perm.split(':')[2]
        if (operation !== undefined && operation !== '') {
          fine.add(operation)
        }
      }
    }
  }
  return fine
}

/**
 * Build the full operation vocabulary for an app from its manifest.
 *
 * @param permissionsSection - The `permissions` mapping from a manifest.
 * @returns The coarse + fine operation vocabulary.
 */
export function getOperationVocabulary(
  permissionsSection: PermissionsSection
): OperationVocabulary {
  return {
    coarse: COARSE_OPERATIONS,
    fine: getFineOperations(permissionsSection),
  }
}
