import type {
  Resource,
  Command as ManifestCommand,
  CommandParameter,
} from '../../manifest/index.js'
import type { CliGeneratorContext, HierarchyPath, ParentParam } from './context.js'

/**
 * Reserved words that need prefixing when used as method names or identifiers.
 */
const RESERVED_WORDS = new Set([
  'arguments',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'of',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

function safeIdentifier(name: string): string {
  return RESERVED_WORDS.has(name) ? `_${name}` : name
}

/**
 * Generated command file.
 */
export interface GeneratedCommand {
  /** File path relative to src/commands */
  path: string
  /** File content */
  content: string
}

/**
 * Compute relative import path from a command file to src/sdk.js.
 * Commands at depth N in hierarchy (e.g., calendars/events = depth 2)
 * live in src/commands/<depth segments>/<cmd>.ts, so we need
 * (depth + 1) levels of '../' to reach src/.
 */
function buildSdkImportPath(depth: number): string {
  return '../'.repeat(depth + 1) + 'sdk.js'
}

/**
 * Compute relative import path from a command file to src/output/index.js.
 */
function buildOutputImportPath(depth: number): string {
  return '../'.repeat(depth + 1) + 'output/index.js'
}

/**
 * Build the HTTP client resource accessor for a hierarchy path.
 * The HTTP client has flat resource access via `resource.plural.toLowerCase()`.
 * This must match exactly how the SDK names its resource client properties.
 */
function buildResourceAccess(hierarchyPath: HierarchyPath, ctx: CliGeneratorContext): string {
  const resource = ctx.getResource(hierarchyPath.resourceName)
  if (!resource) {
    // Fallback to hierarchy path segment lowercased
    return (hierarchyPath.path[hierarchyPath.path.length - 1] ?? '').toLowerCase()
  }
  return resource.plural.toLowerCase()
}

/**
 * Generate a list command for a hierarchy path.
 */
export function generateListCommand(
  hierarchyPath: HierarchyPath,
  ctx: CliGeneratorContext
): GeneratedCommand {
  const resource = ctx.getResource(hierarchyPath.resourceName)
  if (!resource) {
    throw new Error(`Resource not found: ${hierarchyPath.resourceName}`)
  }

  const appName = ctx.getAppNameLower()
  const sdkImportPath = buildSdkImportPath(hierarchyPath.path.length)
  const outputImportPath = buildOutputImportPath(hierarchyPath.path.length)
  const resourceAccess = buildResourceAccess(hierarchyPath, ctx)

  // Build command path
  const cliPath = [appName, ...hierarchyPath.path, 'list']

  // Build parameter options for parent IDs
  const parentOptions = generateParentOptions(hierarchyPath.parentParams)

  const content = `import { Command, Option } from 'clipanion';
import { getClient } from '${sdkImportPath}';
import { createFormatter } from '${outputImportPath}';

/**
 * List ${resource.plural.toLowerCase()}.
 */
export class List${resource.plural}Command extends Command {
  static override paths = [[${cliPath.map((p) => JSON.stringify(p)).join(', ')}]];

  static override usage = Command.Usage({
    description: 'List ${resource.plural.toLowerCase()}',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
${parentOptions}
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.${resourceAccess}.list();

      const output = formatter.formatList(items.map(item => ({
${generateListFieldMapping(resource)}
      })));

      this.context.stdout.write(output + '\\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\\n');
      return 1;
    }
  }
}
`

  return {
    path: buildCommandPath(hierarchyPath.path, 'list'),
    content,
  }
}

/**
 * Generate a create command for a hierarchy path.
 */
export function generateCreateCommand(
  hierarchyPath: HierarchyPath,
  ctx: CliGeneratorContext
): GeneratedCommand | null {
  if (!hierarchyPath.canCreate) {
    return null
  }

  const resource = ctx.getResource(hierarchyPath.resourceName)
  if (!resource) {
    throw new Error(`Resource not found: ${hierarchyPath.resourceName}`)
  }

  const appName = ctx.getAppNameLower()
  const sdkImportPath = buildSdkImportPath(hierarchyPath.path.length)
  const outputImportPath = buildOutputImportPath(hierarchyPath.path.length)
  const resourceAccess = buildResourceAccess(hierarchyPath, ctx)

  // Build command path
  const cliPath = [appName, ...hierarchyPath.path, 'create']

  // Build parameter options for parent IDs
  const parentOptions = generateParentOptions(hierarchyPath.parentParams)

  // Build flag options for writable properties
  const propertyFlags = generatePropertyFlags(resource, ctx)

  // Build create input object
  const createInput = generateCreateInput(resource)

  const needsTypanion = propertyFlags.includes('t.isEnum')
  const content = `import { Command, Option } from 'clipanion';${needsTypanion ? "\nimport * as t from 'typanion';" : ''}
import { getClient } from '${sdkImportPath}';
import { createFormatter } from '${outputImportPath}';

/**
 * Create a new ${resource.name.toLowerCase()}.
 */
export class Create${resource.name}Command extends Command {
  static override paths = [[${cliPath.map((p) => JSON.stringify(p)).join(', ')}]];

  static override usage = Command.Usage({
    description: 'Create a new ${resource.name.toLowerCase()}',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
${parentOptions}${propertyFlags}
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.${resourceAccess}.create({
${createInput}
      } as Record<string, unknown>);

      const output = formatter.format({
        message: '${resource.name} created successfully',
${generateListFieldMapping(resource, '        ')}
      });

      this.context.stdout.write(output + '\\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\\n');
      return 1;
    }
  }
}
`

  return {
    path: buildCommandPath(hierarchyPath.path, 'create'),
    content,
  }
}

/**
 * Generate a get command for a hierarchy path.
 */
export function generateGetCommand(
  hierarchyPath: HierarchyPath,
  ctx: CliGeneratorContext
): GeneratedCommand {
  const resource = ctx.getResource(hierarchyPath.resourceName)
  if (!resource) {
    throw new Error(`Resource not found: ${hierarchyPath.resourceName}`)
  }

  const appName = ctx.getAppNameLower()
  const sdkImportPath = buildSdkImportPath(hierarchyPath.path.length)
  const outputImportPath = buildOutputImportPath(hierarchyPath.path.length)
  const resourceAccess = buildResourceAccess(hierarchyPath, ctx)

  // Build command path with positional ID
  const cliPath = [appName, ...hierarchyPath.path, 'get']

  // Build parameter options for parent IDs
  const parentOptions = generateParentOptions(hierarchyPath.parentParams)

  const idParamName = `${toCamelCase(resource.name)}Id`

  const content = `import { Command, Option } from 'clipanion';
import { getClient } from '${sdkImportPath}';
import { createFormatter } from '${outputImportPath}';

/**
 * Get a ${resource.name.toLowerCase()} by ID.
 */
export class Get${resource.name}Command extends Command {
  static override paths = [[${cliPath.map((p) => JSON.stringify(p)).join(', ')}]];

  static override usage = Command.Usage({
    description: 'Get a ${resource.name.toLowerCase()} by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
${parentOptions}
  ${idParamName} = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.${resourceAccess}.get(this.${idParamName});

      if (!item) {
        this.context.stderr.write(formatter.formatError('${resource.name} not found') + '\\n');
        return 1;
      }

      const output = formatter.format({
${generateListFieldMapping(resource)}
      });

      this.context.stdout.write(output + '\\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\\n');
      return 1;
    }
  }
}
`

  return {
    path: buildCommandPath(hierarchyPath.path, 'get'),
    content,
  }
}

/**
 * Generate an application-level command.
 */
export function generateAppCommand(
  cmd: ManifestCommand,
  ctx: CliGeneratorContext
): GeneratedCommand {
  const appName = ctx.getAppNameLower()

  // Build command path
  const cmdNameKebab = toKebabCase(cmd.name)
  const cliPath = [appName, cmdNameKebab]

  // Sort params: required first, then optional (matching SDK method signature order)
  const sortedParams = [...cmd.parameters].sort((a, b) => {
    if (a.required && !b.required) return -1
    if (!a.required && b.required) return 1
    return 0
  })

  // Build parameter flags
  const paramFlags = sortedParams.map((p) => generateParameterFlag(p, ctx)).join('\n')

  // Build positional method call arguments (matching SDK method signature order)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methodArgs = sortedParams.map((p) => `this.${p.name} as any`).join(', ')

  // Use safe identifier for method name (e.g., 'delete' → '_delete', 'export' → '_export')
  const safeMethodName = safeIdentifier(cmd.name)

  const needsTypanion = paramFlags.includes('t.isEnum')
  const content = `import { Command, Option } from 'clipanion';${needsTypanion ? "\nimport * as t from 'typanion';" : ''}
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * ${cmd.description}
 */
export class ${toPascalCase(cmd.name)}Command extends Command {
  static override paths = [[${cliPath.map((p) => JSON.stringify(p)).join(', ')}]];

  static override usage = Command.Usage({
    description: ${JSON.stringify(cmd.description)},
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
${paramFlags}
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.${safeMethodName}(${methodArgs});

      const output = formatter.formatSuccess('${cmd.name} completed successfully');
      this.context.stdout.write(output + '\\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\\n');
      return 1;
    }
  }
}
`

  return {
    path: `${cmdNameKebab}.ts`,
    content,
  }
}

/**
 * Generate a resource-level command (like "show", "complete", "delete" for resources).
 */
export function generateResourceCommand(
  cmd: ManifestCommand,
  hierarchyPath: HierarchyPath,
  ctx: CliGeneratorContext
): GeneratedCommand {
  const resource = ctx.getResource(hierarchyPath.resourceName)
  if (!resource) {
    throw new Error(`Resource not found: ${hierarchyPath.resourceName}`)
  }

  const appName = ctx.getAppNameLower()
  const sdkImportPath = buildSdkImportPath(hierarchyPath.path.length)
  const outputImportPath = buildOutputImportPath(hierarchyPath.path.length)
  const resourceAccess = buildResourceAccess(hierarchyPath, ctx)

  // Build command path
  const cmdNameKebab = toKebabCase(cmd.name)
  const cliPath = [appName, ...hierarchyPath.path, cmdNameKebab]

  // Build parameter options for parent IDs plus resource ID
  const parentOptions = generateParentOptions(hierarchyPath.parentParams)

  // Build parameter flags for command parameters
  const paramFlags = cmd.parameters.map((p) => generateParameterFlag(p, ctx)).join('\n')

  const idParamName = `${toCamelCase(resource.name)}Id`

  const needsTypanion = paramFlags.includes('t.isEnum')
  const content = `import { Command, Option } from 'clipanion';${needsTypanion ? "\nimport * as t from 'typanion';" : ''}
import { getClient } from '${sdkImportPath}';
import { createFormatter } from '${outputImportPath}';

/**
 * ${cmd.description}
 */
export class ${toPascalCase(cmd.name)}${resource.name}Command extends Command {
  static override paths = [[${cliPath.map((p) => JSON.stringify(p)).join(', ')}]];

  static override usage = Command.Usage({
    description: ${JSON.stringify(cmd.description)},
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
${parentOptions}
  ${idParamName} = Option.String({ required: true });
${paramFlags}
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.${resourceAccess}.${safeIdentifier(cmd.name)}(${generateResourceCommandArgs(cmd)});

      const output = formatter.formatSuccess('${cmd.name} completed successfully');
      this.context.stdout.write(output + '\\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\\n');
      return 1;
    }
  }
}
`

  return {
    path: buildCommandPath(hierarchyPath.path, cmdNameKebab),
    content,
  }
}

// Helper functions

/**
 * Generate positional arguments for a resource command call.
 * Matches the SDK method signature: sorted params (required first).
 */
function generateResourceCommandArgs(cmd: ManifestCommand): string {
  if (cmd.parameters.length === 0) return ''

  const sorted = [...cmd.parameters].sort((a, b) => {
    if (a.required && !b.required) return -1
    if (!a.required && b.required) return 1
    return 0
  })

  return sorted.map((p) => `this.${p.name} as any`).join(', ')
}

function generateParentOptions(parentParams: ParentParam[]): string {
  if (parentParams.length === 0) return ''

  return (
    parentParams
      .map(
        (p) =>
          `  ${p.name} = Option.String('--${toKebabCase(p.name)}', { required: true, description: '${p.resourceName} ID' });`
      )
      .join('\n') + '\n'
  )
}

function generatePropertyFlags(resource: Resource, ctx: CliGeneratorContext): string {
  const flags: string[] = []

  for (const [propName, prop] of Object.entries(resource.properties)) {
    if (prop.access !== 'rw') continue

    const flagName = toKebabCase(propName)
    const required = !prop.optional

    // Check for enum type
    if (typeof prop.type === 'object' && 'enum' in prop.type) {
      const enumDef = ctx.getEnum(prop.type.enum)
      if (enumDef) {
        const enumValues = enumDef.values.map((v) => JSON.stringify(v.name)).join(', ')
        flags.push(
          `  ${propName} = Option.String('--${flagName}', { required: ${String(required)}, description: ${JSON.stringify(prop.description)}, validator: t.isEnum([${enumValues}]) });`
        )
        continue
      }
    }

    if (prop.type === 'boolean') {
      flags.push(
        `  ${propName} = Option.Boolean('--${flagName}', { description: ${JSON.stringify(prop.description)} });`
      )
    } else {
      flags.push(
        `  ${propName} = Option.String('--${flagName}', { required: ${String(required)}, description: ${JSON.stringify(prop.description)} });`
      )
    }
  }

  return flags.length > 0 ? flags.join('\n') + '\n' : ''
}

function generateParameterFlag(param: CommandParameter, ctx: CliGeneratorContext): string {
  const flagName = toKebabCase(param.name)
  const paramType = typeof param.type === 'string' ? param.type : 'string'

  // Check if parameter type is an enum
  const enumDef = ctx.getEnum(paramType)
  if (enumDef) {
    const enumValues = enumDef.values.map((v) => JSON.stringify(v.name)).join(', ')
    return `  ${param.name} = Option.String('--${flagName}', { required: ${String(param.required)}, description: ${JSON.stringify(param.description)}, validator: t.isEnum([${enumValues}]) });`
  }

  if (paramType === 'boolean') {
    return `  ${param.name} = Option.Boolean('--${flagName}', { description: ${JSON.stringify(param.description)} });`
  }

  return `  ${param.name} = Option.String('--${flagName}', { required: ${String(param.required)}, description: ${JSON.stringify(param.description)} });`
}

function generateListFieldMapping(resource: Resource, indent = '        '): string {
  const fields: string[] = []

  for (const [propName] of Object.entries(resource.properties)) {
    fields.push(`${indent}${propName}: item.${propName},`)
  }

  return fields.join('\n')
}

function generateCreateInput(resource: Resource): string {
  const fields: string[] = []

  for (const [propName, prop] of Object.entries(resource.properties)) {
    if (prop.access === 'rw') {
      fields.push(`        ${propName}: this.${propName},`)
    }
  }

  return fields.join('\n')
}

function buildCommandPath(hierarchyPath: string[], commandName: string): string {
  return [...hierarchyPath, `${commandName}.ts`].join('/')
}

function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
