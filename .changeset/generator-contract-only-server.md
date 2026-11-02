---
'@macts/core': minor
'@macts/cli': minor
---

The generator no longer emits an HTTP API plugin or an MCP plugin into server packages. `@macts/core` drops `generateMcpPlugin`, `createMcpGeneratorContext`, `generateApiPlugin`, `generateAllHttpPackages` and their option and result types (`McpGeneratorContext`, `CreateMcpContextOptions`, `GeneratedMcpPlugin`, `GeneratedTool`, `GeneratedToolFile`, `ApiPluginGeneratorOptions`, `GenerateApiPluginResult`, `GenerateAllOptions`, `GenerateAllResult`). `generateServerPackage` now emits a contract-only package, and every generated contract descriptor carries `inputJsonSchema`. `JsonSchema` stays exported, now alongside the capability types that use it, and capability input schemas and MCP tool names are unchanged.

`macts generate --target server` writes the contract-only server package.
