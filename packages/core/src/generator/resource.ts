import type { GeneratorContext } from './context.js';
import type { Resource, HierarchyChild } from '../manifest/index.js';
import { propertyTypeToTs } from './types.js';

export interface GeneratedClass {
  name: string;
  content: string;
  imports: string[];
}

/**
 * Get child collections for a resource from hierarchy.
 */
function getChildCollections(
  resourceName: string,
  ctx: GeneratorContext
): { key: string; child: HierarchyChild }[] {
  // Walk hierarchy to find this resource and its children
  const result: { key: string; child: HierarchyChild }[] = [];

  function findChildren(children: Record<string, HierarchyChild>): void {
    for (const [_key, child] of Object.entries(children)) {
      if (child.resource === resourceName && child.children) {
        for (const [childKey, childChild] of Object.entries(child.children)) {
          result.push({ key: childKey, child: childChild });
        }
      }
      if (child.children) {
        findChildren(child.children);
      }
    }
  }

  findChildren(ctx.manifest.hierarchy.children);
  return result;
}

/**
 * Generate resource instance class code.
 */
export function generateResourceClass(resource: Resource, ctx: GeneratorContext): GeneratedClass {
  const className = `${resource.name}Instance`;
  const imports = [
    "import type { JxaExecutor } from '@macts/core';",
    "import type { ObjectSpecifier } from '@macts/core';",
  ];

  // Generate property getters
  const properties = Object.entries(resource.properties);
  const propertyGetters = properties.map(([name, prop]) => {
    const tsType = propertyTypeToTs(prop.type);
    const readonly = prop.access === 'r' ? ' (read-only)' : '';
    return `  /** ${prop.description}${readonly} */
  get ${name}(): ${tsType} {
    return this.#data.${name};
  }`;
  });

  // Generate setters for writable properties
  const propertySetters = properties
    .filter(([_, prop]) => prop.access === 'rw')
    .map(([name, prop]) => {
      const tsType = propertyTypeToTs(prop.type);
      return `  set ${name}(value: ${tsType}) {
    this.#data.${name} = value;
    this.#dirty.add('${name}');
  }`;
    });

  // Get child collections from hierarchy
  const childCollections = getChildCollections(resource.name, ctx);
  const collectionAccessors = childCollections.map(({ key, child }) => {
    const collectionClass = `${child.resource}Collection`;
    return `  /** Access ${key} collection */
  get ${key}(): ${collectionClass} {
    return new ${collectionClass}(this.#executor, this.#specifier.collection('${key}'));
  }`;
  });

  // Get resource commands
  const commands = ctx.getResourceCommands(resource.name);
  const commandMethods = commands.map(cmd => {
    const params = cmd.parameters.map(p => {
      const tsType = propertyTypeToTs(p.type);
      const optional = !p.required ? '?' : '';
      return `${p.name}${optional}: ${tsType}`;
    }).join(', ');

    const returnType = cmd.returns ? propertyTypeToTs(cmd.returns) : 'void';

    return `  /** ${cmd.description} */
  async ${cmd.name}(${params}): Promise<${returnType}> {
    return this.#executor.command(this.#specifier, '${cmd.name}');
  }`;
  });

  const content = `${imports.join('\n')}

export class ${className} {
  readonly #executor: JxaExecutor;
  readonly #specifier: ObjectSpecifier;
  #data: ${resource.name};
  #dirty: Set<string> = new Set();

  constructor(executor: JxaExecutor, specifier: ObjectSpecifier, data: ${resource.name}) {
    this.#executor = executor;
    this.#specifier = specifier;
    this.#data = data;
  }

${propertyGetters.join('\n\n')}

${propertySetters.join('\n\n')}

${collectionAccessors.join('\n\n')}

  /** Save any pending changes */
  async save(): Promise<void> {
    if (this.#dirty.size === 0) return;
    // Generate set commands for dirty properties
    for (const prop of this.#dirty) {
      await this.#executor.command(
        this.#specifier.property(prop),
        'set',
        { value: (this.#data as Record<string, unknown>)[prop] }
      );
    }
    this.#dirty.clear();
  }

  /** Delete this resource */
  async delete(): Promise<void> {
    await this.#executor.command(this.#specifier, 'delete');
  }

${commandMethods.join('\n\n')}
}`;

  return { name: className, content, imports };
}
