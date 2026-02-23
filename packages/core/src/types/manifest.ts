/**
 * TypeScript types for the macts manifest format.
 *
 * These types are derived from the Zod schemas and provide type-safe
 * access to manifest data structures.
 *
 * @packageDocumentation
 */

// Re-export all inferred types from schemas
export type {
  // Top-level
  AppManifest,
  // Property types
  PropertyAccess,
  PrimitiveType,
  PropertyType,
  Property,
  // Resource types
  Identifier,
  Resource,
  // Enum types
  EnumValue,
  Enum,
  // Inheritance types
  Inheritance,
  // Command types
  CommandScope,
  CommandParameter,
  Command,
  // Hierarchy types
  HierarchyChild,
  Hierarchy,
  // Relationship types
  Cardinality,
  Relationship,
  // Metadata types
  Suite,
  Deprecation,
  Confidence,
  OpenQuestion,
  TccEntitlement,
  DistributionModel,
  AppMetadata,
  ExtractionMetadata,
} from '../manifest/schemas/index.js'
