/**
 * Zod schemas for the macts manifest format.
 *
 * This module exports all schema definitions and their inferred types
 * for validating and parsing macOS application manifest files.
 *
 * @packageDocumentation
 */

// Top-level manifest
export * from './app.js'

// Foundational schemas
export * from './property.js'
export * from './resource.js'
export * from './enum.js'
export * from './inheritance.js'

// Structural schemas
export * from './command.js'
export * from './hierarchy.js'
export * from './relationship.js'

// Metadata schemas
export * from './metadata.js'
