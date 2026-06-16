/**
 * Core runtime and manifest parsing for macts.
 *
 * Provides the foundational functionality for all macts packages:
 * - Manifest parsing and validation using Zod schemas
 * - JXA bridge for executing AppleScript operations
 * - Shared runtime utilities for TypeScript SDK generation
 *
 * This package is the execution layer that all integration surfaces
 * (CLI, MCP, HTTP API) depend on.
 *
 * @packageDocumentation
 */

/**
 * Current version of the macts packages.
 * All `@macts/*` packages use fixed versioning and stay in sync.
 */
export const VERSION = '0.0.0'

// Manifest schemas and types
export * from './manifest/index.js'
export type * from './types/manifest.js'

// SDEF parser and types
export * from './sdef/index.js'

// JXA bridge
export * from './jxa/index.js'

// Standardized types
export * from './types/standardized.js'

// Generator
export * from './generator/index.js'

// Permissions
export * from './permissions/index.js'

// Capability discovery (registry, risk classification, search, governance seam)
export * from './capabilities/index.js'

// Governance foundation (.agentrc / org-policy declaration parsing, audit records)
export * from './governance/index.js'
