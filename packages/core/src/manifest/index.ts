/**
 * Manifest parsing and validation for macts.
 *
 * This module provides Zod schemas and TypeScript types for the macts manifest format,
 * which represents the scriptable interface of macOS applications.
 *
 * @packageDocumentation
 */

// Re-export all schemas and types from schemas module
export * from './schemas/index.js'

// Manifest loading and parsing utilities
export * from './loader.js'

// JSON Schema generation utilities
export * from './json-schema.js'

// Canonical RPC route derivation (single source of truth shared by the
// client SDK generator and the server router)
export * from './route.js'

// Canonical resource-identifier derivation (single source of truth for which
// property identifies a resource and the canonical key list output exposes it
// under, shared by the server list executor and identifier-consuming surfaces)
export * from './identifier.js'

// Nullability and resettability decisions for manifest fields (single source
// of truth shared by the contract generator and the nullability probe)
export * from './nullability.js'

// Value kinds: the labels for what kind of value an app returned, as the
// nullability probe reports them. The kinds each declared type expects, and
// the usable properties of a resource (./unsupported.ts, the single point at
// which properties marked unsupported leave every generated surface and the
// probe), are internal to this package and imported from their modules.
export { VALUE_KINDS, type ValueKind, type ValueKindCounts } from './value-kinds.js'
