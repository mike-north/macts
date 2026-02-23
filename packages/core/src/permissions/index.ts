/**
 * Permission system for macts.
 *
 * This module provides a two-layer permission model:
 * 1. Fine-grained: One permission per command (e.g., `calendar:events:list`)
 * 2. Coarse-grained: CRUD-style groups (e.g., `calendar:events:read`)
 *
 * Everything resolves to fine-grained permissions at validation time.
 * Coarse permissions are syntactic sugar that expand to sets of fine-grained permissions.
 *
 * @packageDocumentation
 */

// Types - note: PermissionsSection/CoarseMapping are exported from manifest/schemas/app.ts
// PermissionHistoryEntry is exported from manifest/schemas/command.ts
export {
  type FinePermission,
  type CoarsePermission,
  type WildcardPermission,
  type ParsedPermission,
  type CoarseOperation,
  type SpecialOperation,
  type ApiKeyPayload,
  type ApiKeyMetadata,
  type ApiKeyValidationResult,
  type PermissionCheckResult,
  COARSE_OPERATIONS,
} from './types.js'

// Re-export manifest types for convenience
export type { PermissionsSection, CoarseMapping } from '../manifest/schemas/app.js'
export type { PermissionHistoryEntry } from '../manifest/schemas/command.js'

// Parser
export {
  parsePermission,
  formatPermission,
  finePermission,
  coarsePermission,
  wildcardPermission,
  isValidPermission,
  extractAppName,
  extractResourceName,
  extractOperation,
  isCoarseOperation,
  PermissionParseError,
} from './parser.js'

// Expander
export {
  expandCoarsePermission,
  expandPermissions,
  findCoarseCategory,
  generatePermissionMap,
  validateCommandPermissions,
  PermissionExpansionError,
  type PermissionMap,
} from './expander.js'

// Matcher
export {
  hasPermission,
  checkPermission,
  checkPermissions,
  filterPermissionsByApp,
  groupPermissionsByResource,
  describePermissions,
} from './matcher.js'
