import type { GeneratorContext } from './context.js';
import type { PropertyType } from '../manifest/index.js';
import { propertyTypeToTs } from './types.js';

export interface GeneratedApplication {
  name: string;
  content: string;
  imports: string[];
}

/**
 * Generate the root application class.
 */
export function generateApplicationClass(ctx: GeneratorContext): GeneratedApplication {
  const appName = ctx.manifest.app.name;
  const bundleId = ctx.manifest.app.bundleId;
  const className = appName.replace(/\s+/g, '');

  const imports = [
    "import { connect, ObjectSpecifier } from '@macts/core';",
    "import type { JxaExecutor, AppConnection } from '@macts/core';",
  ];

  // Generate top-level collection accessors from hierarchy
  const topLevelCollections = Object.entries(ctx.manifest.hierarchy.children);
  const collectionAccessors = topLevelCollections.map(([key, child]) => {
    const collectionClass = `${child.resource}Collection`;
    return `  /** Access ${key} */
  get ${key}(): ${collectionClass} {
    return new ${collectionClass}(this.#executor, this.#specifier.collection('${key}'));
  }`;
  });

  // Generate app-level commands
  const appCommands = ctx.getAppCommands();
  const commandMethods = appCommands.map(cmd => {
    const params = cmd.parameters.map(p => {
      // Cast string to PropertyType - command types are always valid primitive or reference types
      const tsType = propertyTypeToTs(p.type as PropertyType);
      const optional = !p.required ? '?' : '';
      return `${p.name}${optional}: ${tsType}`;
    }).join(', ');

    // Cast return type similarly
    const returnType = cmd.returns ? propertyTypeToTs(cmd.returns as PropertyType) : 'void';

    // Build parameter object for executor
    const paramNames = cmd.parameters.map(p => p.name);
    const argsObj = paramNames.length > 0
      ? `, { ${paramNames.join(', ')} }`
      : '';

    return `  /** ${cmd.description} */
  async ${cmd.name}(${params}): Promise<${returnType}> {
    return this.#executor.command(this.#specifier, '${cmd.name}'${argsObj});
  }`;
  });

  const content = `${imports.join('\n')}

/**
 * ${appName} SDK - TypeScript automation for ${appName}.
 * Bundle ID: ${bundleId}
 */
export class ${className} {
  readonly #connection: AppConnection;
  readonly #executor: JxaExecutor;
  readonly #specifier: ObjectSpecifier;

  private constructor(connection: AppConnection, executor: JxaExecutor) {
    this.#connection = connection;
    this.#executor = executor;
    this.#specifier = ObjectSpecifier.app('${bundleId}');
  }

  /** Connect to ${appName} */
  static async connect(): Promise<${className}> {
    const connection = await connect('${bundleId}');
    // Create executor (this would use actual JXA executor)
    const executor = {} as JxaExecutor; // TODO: Create real executor
    return new ${className}(connection, executor);
  }

  /** Bundle identifier */
  get bundleId(): string {
    return '${bundleId}';
  }

  /** Application name */
  get name(): string {
    return this.#connection.name;
  }

  /** Check if application is running */
  async isRunning(): Promise<boolean> {
    return this.#connection.isRunning();
  }

  /** Activate (bring to foreground) the application */
  async activate(): Promise<void> {
    await this.#connection.activate();
  }

  /** Quit the application */
  async quit(): Promise<void> {
    await this.#connection.quit();
  }

${collectionAccessors.join('\n\n')}

${commandMethods.join('\n\n')}
}`;

  return { name: className, content, imports };
}
