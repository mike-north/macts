import type {
  AppManifest,
  Resource,
  Command as ManifestCommand,
  CommandParameter,
} from '../../manifest/index.js'
import { PAGE_SIZE_LIMITS } from '@macts/contracts'
import { listOperationPages, resolvePrimaryIdentifierProperty } from '../../manifest/index.js'
import { usableProperties } from '../../manifest/unsupported.js'
import { outputProperties } from '../../manifest/output-references.js'
import type { CliGeneratorContext, HierarchyPath, ParentParam } from './context.js'
import {
  firstMatchNote,
  identifierWords,
  resolveIdParams,
  resourceNamespace,
  safeIdentifier,
  withArticle,
} from '../surface.js'

/**
 * Instance members of Clipanion's \`Command\` base class. A generated option whose
 * property name matches one of these would shadow the base member with an
 * incompatible type (e.g. \`path: Array<string>\`), so such names must be renamed.
 */
const CLIPANION_RESERVED_MEMBERS = new Set(['path', 'cli', 'context', 'help'])

/**
 * Produce a collision-free class-property name for a command parameter.
 *
 * Parameters surface as Clipanion \`Option\` class fields and are referenced
 * positionally (\`this.<prop>\`), so a name clashing with a Clipanion \`Command\`
 * member is disambiguated by prefixing the (camelCase) command name —
 * e.g. the \`path\` parameter of the \`browse\` command becomes \`browsePath\`.
 */
function safeParamProperty(paramName: string, commandName: string): string {
  if (!CLIPANION_RESERVED_MEMBERS.has(paramName)) return paramName
  return `${toCamelCase(commandName)}${toPascalCase(paramName)}`
}

/**
 * The identifier a caller gives to address one item of a resource: the
 * resource's primary identifier property, which every lookup of one item
 * matches, whatever the get command calls its parameter (Calendar's get takes
 * `id` and matches a calendar's `name`). A resource that declares no
 * identifier is addressed by the identifier parameter its get command
 * declares ({@link resolveIdParams}). With neither, the identifier is unknown
 * and `undefined` is returned; no name is supplied in its place.
 */
function addressingIdentifier(resource: Resource, getCommand: ManifestCommand): string
function addressingIdentifier(
  resource: Resource,
  getCommand: ManifestCommand | undefined
): string | undefined
function addressingIdentifier(
  resource: Resource,
  getCommand: ManifestCommand | undefined
): string | undefined {
  return (
    resolvePrimaryIdentifierProperty(resource) ??
    (getCommand === undefined ? undefined : resolveIdParams(getCommand).childParam)
  )
}

/**
 * An identifier in help prose, as {@link identifierWords} writes it, except
 * that a bare `id` is written `ID`: `persistentID` → `persistent ID`, `name` →
 * `name`, `id` → `ID`.
 */
function identifierProse(identifier: string): string {
  const words = identifierWords(identifier)
  return words === 'id' ? 'ID' : words
}

/**
 * The declaration of the positional argument that carries an item's
 * identifier. Its label in usage is the identifier in kebab case
 * (`<persistent-id>`, `<name>`, `<id>`), so help shows what to pass. When the
 * identifier is unknown, usage shows the property name, as it always did.
 */
function identifierPositional(property: string, identifier: string | undefined): string {
  return identifier === undefined
    ? `  ${property} = Option.String({ required: true });`
    : `  ${property} = Option.String({ name: '${toKebabCase(identifier)}', required: true });`
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
 * The HTTP client accessor a command calls for its resource. The client's
 * resource access is flat (`client.mediaItems`, whatever the resource's
 * hierarchy path), and is named by the shared client surface rule, so the CLI
 * calls exactly the property the SDK declares.
 */
function buildResourceAccess(resource: Resource): string {
  return resourceNamespace(resource)
}

/** The help text of a paged list command's `--page-size` flag. */
const PAGE_SIZE_FLAG_DESCRIPTION = `The most items to show, from 1 to ${String(PAGE_SIZE_LIMITS.maximum)} (default ${String(PAGE_SIZE_LIMITS.default)})`

/** The help text of a paged list command's `--cursor` flag. */
const CURSOR_FLAG_DESCRIPTION = 'Continue from the previous page, as its output says'

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
  const resourceAccess = buildResourceAccess(resource)

  // Build command path
  const cliPath = [appName, ...hierarchyPath.path, 'list']

  // The arguments forwarded to the SDK `list()` call must exactly match the
  // SDK's `list()` signature, which is derived from the backing list command's
  // *required parameters* (see `generateListMethod` in the SDK generator). The
  // CLI hierarchy parent params (derived from manifest nesting) are a separate
  // notion and can diverge — e.g. a self-nested resource whose list command
  // takes no parent scope. Forwarding hierarchy params the SDK does not accept
  // produced a `TS2554: Expected 0 arguments, but got 1` compile error. Drive
  // both the forwarded args AND the CLI options from the list command's required
  // parameters so the CLI, SDK, server, and MCP inputSchema all agree.
  const listCommand = ctx
    .getResourceCommands(hierarchyPath.resourceName)
    .find((cmd) => cmd.name === 'list')
  const listRequiredParams = (listCommand?.parameters ?? []).filter((p) => p.required)

  // Generate a `--<param>` option for each required list parameter so it is
  // bindable from the CLI, then forward them positionally in manifest order to
  // match the SDK signature.
  const parentOptions = generateListParamOptions(listRequiredParams)

  // A list that pages (see `listOperationPages`) takes `--page-size` and
  // `--cursor`, forwards them as the SDK's trailing page argument, and says
  // how to read the next page when more remain. Any other list's single page
  // holds every item.
  const paged = listCommand !== undefined && listOperationPages(listCommand, resource)
  const pageArgument =
    '{ ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }), ...(this.cursor === undefined ? {} : { cursor: this.cursor }) }'
  // A flag's value is text; an `integer` parameter is converted to the number
  // the SDK's `list()` takes, as the page size is.
  const listArgs = [
    ...listRequiredParams.map((p) => {
      const property = `this.${safeParamProperty(p.name, 'list')}`
      return p.type === 'integer' ? `Number(${property})` : property
    }),
    ...(paged ? [pageArgument] : []),
  ].join(', ')
  const pageOptions = paged
    ? `  pageSize = Option.String('--page-size', { description: ${JSON.stringify(PAGE_SIZE_FLAG_DESCRIPTION)} });
  cursor = Option.String('--cursor', { description: ${JSON.stringify(CURSOR_FLAG_DESCRIPTION)} });
`
    : ''
  const format = paged ? 'formatPage' : 'formatList'
  const formatTail = paged ? ', page.nextCursor' : ''

  const content = `import { Command, Option } from 'clipanion';
import { getClient } from '${sdkImportPath}';
import { createFormatter } from '${outputImportPath}';

/**
 * List ${identifierWords(resource.plural)}.
 */
export class List${resource.plural}Command extends Command {
  static override paths = [[${cliPath.map((p) => JSON.stringify(p)).join(', ')}]];

  static override usage = Command.Usage({
    description: 'List ${identifierWords(resource.plural)}',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
${parentOptions}${pageOptions}
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const page = await client.${resourceAccess}.list(${listArgs});

      const output = formatter.${format}(page.items.map(item => ({
${generateListFieldMapping(ctx.manifest, hierarchyPath.resourceName, resource)}
      }))${formatTail});

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
  const resourceAccess = buildResourceAccess(resource)

  // Build command path
  const cliPath = [appName, ...hierarchyPath.path, 'create']

  // Build parameter options for parent IDs
  const parentOptions = generateParentOptions(hierarchyPath.parentParams)

  // Build flag options for writable properties, except inputs left out
  // because they admit no value
  const createCommand = ctx
    .getResourceCommands(hierarchyPath.resourceName)
    .find((c) => c.name === 'create')
  const omitted =
    createCommand === undefined
      ? new Set<string>()
      : ctx.omittedInputs(createCommand, hierarchyPath.resourceName)
  const propertyFlags = generatePropertyFlags(resource, ctx, omitted)

  // Build create input object
  const createInput = generateCreateInput(resource, omitted)

  const needsTypanion = propertyFlags.includes('t.isEnum')
  const content = `import { Command, Option } from 'clipanion';${needsTypanion ? "\nimport * as t from 'typanion';" : ''}
import { getClient } from '${sdkImportPath}';
import { createFormatter } from '${outputImportPath}';

/**
 * Create a new ${identifierWords(resource.name)}.
 */
export class Create${resource.name}Command extends Command {
  static override paths = [[${cliPath.map((p) => JSON.stringify(p)).join(', ')}]];

  static override usage = Command.Usage({
    description: 'Create a new ${identifierWords(resource.name)}',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
${parentOptions}${propertyFlags}
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // \`unknown\`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.${resourceAccess}.create({
${createInput}
      } as unknown as Parameters<typeof client.${resourceAccess}.create>[0]);

      const output = formatter.format({
        message: '${resource.name} created successfully',
${generateListFieldMapping(ctx.manifest, hierarchyPath.resourceName, resource, '        ')}
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
  const resourceAccess = buildResourceAccess(resource)

  // Build command path with positional ID
  const cliPath = [appName, ...hierarchyPath.path, 'get']

  const idParamName = `${toCamelCase(resource.name)}Id`

  // Drive the get() arguments from the backing get command (single source of truth,
  // like list — NOT the resource hierarchy), so the CLI passes exactly what the SDK
  // get() accepts: the parent the command records, if any, as a --<param> option, then
  // the child id positionally (see `resolveIdParams`).
  const getCommand = ctx
    .getResourceCommands(hierarchyPath.resourceName)
    .find((cmd) => cmd.name === 'get')
  // A get command is generated only when a get command backs it, and that
  // command declares the identifier parameter it selects its item by.
  if (getCommand === undefined) {
    throw new Error(`Resource ${resource.name} has no get command to generate a get command from`)
  }
  const parentParamName = resolveIdParams(getCommand).parentParam
  const parentScopeParams = getCommand.parameters.filter((p) => p.name === parentParamName)
  const parentOptions = generateListParamOptions(parentScopeParams)
  const identifier = addressingIdentifier(resource, getCommand)
  const summary = `Get ${withArticle(identifierWords(resource.name))} by ${identifierProse(identifier)}`
  // The usage description adds the first-match sentence for a resource
  // matched on a property that is not claimed unique.
  const note = firstMatchNote(resource)
  const description = note === undefined ? summary : `${summary}. ${note}`

  const content = `import { Command, Option } from 'clipanion';
import { getClient } from '${sdkImportPath}';
import { createFormatter } from '${outputImportPath}';

/**
 * ${summary}.
 */
export class Get${resource.name}Command extends Command {
  static override paths = [[${cliPath.map((p) => JSON.stringify(p)).join(', ')}]];

  static override usage = Command.Usage({
    description: ${note === undefined ? `'${summary}'` : JSON.stringify(description)},
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
${parentOptions}
${identifierPositional(idParamName, identifier)}

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.${resourceAccess}.get(${[...parentScopeParams.map((p) => `this.${safeParamProperty(p.name, 'list')}`), `this.${idParamName}`].join(', ')});

      const output = formatter.format({
${generateListFieldMapping(ctx.manifest, hierarchyPath.resourceName, resource)}
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

  // Build parameter flags. An input left out because it admits no value has
  // no flag and no positional argument.
  const omitted = ctx.omittedInputs(cmd, undefined)
  const paramFlags = sortedParams
    .filter((p) => !omitted.has(p.name))
    .map((p) => generateParameterFlag(p, ctx, cmd.name))
    .join('\n')

  // Use safe identifier for method name (e.g., 'delete' → '_delete', 'export' → '_export')
  const safeMethodName = safeIdentifier(cmd.name)

  // Build positional method call arguments (matching SDK method signature order).
  // Each flag is asserted to the SDK method's exact parameter type. CLI flags surface
  // values as broad primitives (string/boolean) which may not structurally overlap the
  // SDK's narrower types (enums, Date, number, arrays), so we assert via \`unknown\`.
  // The RPC layer validates/coerces the value at runtime.
  const methodArgs = positionalArgs(
    sortedParams,
    omitted,
    (p, i) =>
      `this.${safeParamProperty(p.name, cmd.name)} as unknown as Parameters<typeof client.${safeMethodName}>[${String(i)}]`
  )

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
  const resourceAccess = buildResourceAccess(resource)

  // Build command path
  const cmdNameKebab = toKebabCase(cmd.name)
  const cliPath = [appName, ...hierarchyPath.path, cmdNameKebab]

  const idParamName = `${toCamelCase(resource.name)}Id`

  // Names declared by command parameters; used to avoid emitting a duplicate
  // identifier when a parameter already covers the resource ID or a parent ID
  // (e.g. a command whose first parameter is literally the resource's own ID).
  const paramNames = new Set(cmd.parameters.map((p) => p.name))

  // Build parameter options for parent IDs, skipping any that a command parameter
  // (or the resource ID itself) already declares to prevent duplicate identifiers.
  const parentOptions = generateParentOptions(
    hierarchyPath.parentParams.filter((p) => p.name !== idParamName && !paramNames.has(p.name))
  )

  // Build parameter flags for command parameters, except inputs left out
  // because they admit no value
  const omitted = ctx.omittedInputs(cmd, hierarchyPath.resourceName)
  const paramFlags = cmd.parameters
    .filter((p) => !omitted.has(p.name))
    .map((p) => generateParameterFlag(p, ctx, cmd.name))
    .join('\n')

  // Only declare the implicit resource-ID option when no command parameter already
  // declares an identifier of the same name (otherwise we emit a duplicate field).
  const getCommand = ctx
    .getResourceCommands(hierarchyPath.resourceName)
    .find((c) => c.name === 'get')
  const idOption = paramNames.has(idParamName)
    ? ''
    : `${identifierPositional(idParamName, addressingIdentifier(resource, getCommand))}\n`

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
${parentOptions}${idOption}${paramFlags}
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.${resourceAccess}.${safeIdentifier(cmd.name)}(${generateResourceCommandArgs(cmd, omitted, `client.${resourceAccess}.${safeIdentifier(cmd.name)}`)});

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
 *
 * Each argument is asserted to the SDK method's exact parameter type via
 * \`unknown as Parameters<typeof methodRef>[i]\`. CLI flags surface values as broad
 * primitives (string/boolean) which may not structurally overlap the SDK's narrower
 * types (enums, Date, number, arrays); the RPC layer validates/coerces at runtime.
 */
function generateResourceCommandArgs(
  cmd: ManifestCommand,
  omitted: ReadonlySet<string>,
  methodRef: string
): string {
  if (cmd.parameters.length === 0) return ''

  const sorted = [...cmd.parameters].sort((a, b) => {
    if (a.required && !b.required) return -1
    if (!a.required && b.required) return 1
    return 0
  })

  return positionalArgs(
    sorted,
    omitted,
    (p, i) =>
      `this.${safeParamProperty(p.name, cmd.name)} as unknown as Parameters<typeof ${methodRef}>[${String(i)}]`
  )
}

/**
 * The positional arguments of an SDK method call, in signature order. A
 * parameter left out of the operation's input has no flag and no position:
 * the SDK method does not take it either.
 */
function positionalArgs(
  params: readonly CommandParameter[],
  omitted: ReadonlySet<string>,
  render: (param: CommandParameter, index: number) => string
): string {
  return params
    .filter((p) => !omitted.has(p.name))
    .map((p, i) => render(p, i))
    .join(', ')
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

/**
 * Generate `--<param>` options for a list command's required parameters.
 *
 * The option property name is run through `safeParamProperty` so it matches the
 * value the list-call forwarding uses, and the flag name is the kebab-cased
 * manifest parameter name. This keeps the CLI option, the forwarded SDK argument,
 * and the SDK `list()` signature in lockstep.
 */
function generateListParamOptions(params: CommandParameter[]): string {
  if (params.length === 0) return ''

  return (
    params
      .map((p) => {
        const property = safeParamProperty(p.name, 'list')
        return `  ${property} = Option.String('--${toKebabCase(p.name)}', { required: true, description: ${JSON.stringify(p.description)} });`
      })
      .join('\n') + '\n'
  )
}

function generatePropertyFlags(
  resource: Resource,
  ctx: CliGeneratorContext,
  omitted: ReadonlySet<string>
): string {
  const flags: string[] = []

  for (const [propName, prop] of usableProperties(resource)) {
    if (prop.access !== 'rw' || omitted.has(propName)) continue

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

function generateParameterFlag(
  param: CommandParameter,
  ctx: CliGeneratorContext,
  commandName: string
): string {
  const flagName = toKebabCase(param.name)
  const propName = safeParamProperty(param.name, commandName)
  const paramType = typeof param.type === 'string' ? param.type : 'string'

  // Check if parameter type is an enum
  const enumDef = ctx.getEnum(paramType)
  if (enumDef) {
    const enumValues = enumDef.values.map((v) => JSON.stringify(v.name)).join(', ')
    return `  ${propName} = Option.String('--${flagName}', { required: ${String(param.required)}, description: ${JSON.stringify(param.description)}, validator: t.isEnum([${enumValues}]) });`
  }

  if (paramType === 'boolean') {
    return `  ${propName} = Option.Boolean('--${flagName}', { description: ${JSON.stringify(param.description)} });`
  }

  return `  ${propName} = Option.String('--${flagName}', { required: ${String(param.required)}, description: ${JSON.stringify(param.description)} });`
}

/**
 * The fields a command prints for one record: the fields its output record
 * declares ({@link outputProperties}), so a field the record leaves out is
 * never read.
 */
function generateListFieldMapping(
  manifest: AppManifest,
  resourceKey: string,
  resource: Resource,
  indent = '        '
): string {
  const fields: string[] = []

  for (const [propName] of outputProperties(manifest, resourceKey, resource)) {
    fields.push(`${indent}${propName}: item.${propName},`)
  }

  return fields.join('\n')
}

function generateCreateInput(resource: Resource, omitted: ReadonlySet<string>): string {
  const fields: string[] = []

  for (const [propName, prop] of usableProperties(resource)) {
    if (prop.access === 'rw' && !omitted.has(propName)) {
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
