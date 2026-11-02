/**
 * The macts package generator: turns an app manifest into the files of its
 * generated packages, and writes them.
 *
 * The generator owns its output. Writing a package with
 * `writeGeneratedPackage` records every path the run emitted in the package's
 * `.macts-generated.json`, and deletes the paths the previous record held that
 * this run no longer emits, so a removed operation or resource leaves no file
 * behind. Files not listed in any record, such as a package's changelog or
 * handwritten tests, are never touched. A package generated before it had a record takes
 * the files carrying a generated header as its previous set. The full rule is
 * in `./owned-output.ts`.
 *
 * @packageDocumentation
 */

// Context
export { createGeneratorContext, type GeneratorContext, type GeneratorOptions } from './context.js'

// Types generator
export {
  generateTypes,
  generateReadType,
  generateCreateInputType,
  generateUpdateInputType,
  generateEnumType,
  propertyTypeToTs,
  type GeneratedType,
} from './types.js'

// Schemas generator
export {
  generateSchemas,
  generateResourceSchema,
  generateCreateInputSchema,
  generateUpdateInputSchema,
  generateEnumSchema,
  propertyTypeToZod,
  type GeneratedSchema,
} from './schemas.js'

// Resource generator
export { generateResourceClass, type GeneratedClass } from './resource.js'

// Collection generator
export { generateCollectionClass, type GeneratedCollection } from './collection.js'

// Application generator
export { generateApplicationClass, type GeneratedApplication } from './application.js'

// Re-export main generation functions
export { generateSdk, writeSdk, type GenerateSdkResult } from './generate.js'

// CLI generator
export {
  generateCliPlugin,
  type CliGeneratorOptions,
  type CliGeneratorContext,
  type GenerateCliPluginResult,
  type GeneratedCommand,
  type GeneratedFlag,
} from './cli/index.js'

// HTTP Client SDK generator
export {
  generateHttpClientSdk,
  type HttpClientGeneratorOptions,
  type GeneratedHttpClientSdk,
} from './sdk/index.js'

// Orchestrator
export {
  generateConsolidatedPackages,
  type GenerateConsolidatedOptions,
  type GenerateConsolidatedResult,
} from './orchestrate.js'

// Client package generator (consolidated SDK + CLI)
export {
  generateClientPackage,
  type GenerateClientPackageOptions,
  type GenerateClientPackageResult,
} from './client/index.js'

// Server package generator (the contract-only `-server` package)
export {
  generateServerPackage,
  type GenerateServerPackageOptions,
  type GenerateServerPackageResult,
} from './server/index.js'

// Capability metadata module generator (per-app machine-readable risk metadata)
export { generateCapabilitiesModule } from './capabilities/index.js'

// The manifest command a reference to a resource resolves as (shared by the
// contract generator's resource table and the runtime's reference resolution)
export { referenceResolutionCommand } from './surface.js'

// File writer
export { writeFiles } from './write.js'

// Owned output: the record of what a run emitted, and pruning what it no longer emits
export {
  writeGeneratedPackage,
  OWNED_OUTPUT_RECORD_FILE,
  type GeneratedPackageWriteResult,
  type OwnedOutputSource,
} from './owned-output.js'
