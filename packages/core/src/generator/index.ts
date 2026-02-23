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

// MCP generator
export {
  generateMcpPlugin,
  createMcpGeneratorContext,
  type CreateMcpContextOptions,
  type McpGeneratorContext,
  type GeneratedMcpPlugin,
  type GeneratedTool,
  type GeneratedToolFile,
} from './mcp/index.js'

// HTTP Client SDK generator
export {
  generateHttpClientSdk,
  type HttpClientGeneratorOptions,
  type GeneratedHttpClientSdk,
} from './sdk/index.js'

// API plugin generator
export {
  generateApiPlugin,
  type ApiPluginGeneratorOptions,
  type GenerateApiPluginResult,
} from './api/index.js'

// Orchestrator
export {
  generateAllHttpPackages,
  type GenerateAllOptions,
  type GenerateAllResult,
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

// Server package generator (consolidated API + MCP)
export {
  generateServerPackage,
  type GenerateServerPackageOptions,
  type GenerateServerPackageResult,
} from './server/index.js'

// File writer
export { writeFiles } from './write.js'
