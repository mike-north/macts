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
