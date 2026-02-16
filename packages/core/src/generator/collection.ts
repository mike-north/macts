import type { GeneratorContext } from './context.js';
import type { Resource } from '../manifest/index.js';

export interface GeneratedCollection {
  name: string;
  content: string;
  imports: string[];
}

/**
 * Generate collection class code.
 */
export function generateCollectionClass(resource: Resource, _ctx: GeneratorContext): GeneratedCollection {
  const className = `${resource.name}Collection`;
  const instanceClass = `${resource.name}Instance`;
  const createInputType = `${resource.name}CreateInput`;
  const createInputSchema = `${resource.name}CreateInputSchema`;

  const imports = [
    "import type { JxaExecutor } from '@macts/core';",
    "import type { ObjectSpecifier } from '@macts/core';",
  ];

  const content = `${imports.join('\n')}

export class ${className} {
  readonly #executor: JxaExecutor;
  readonly #specifier: ObjectSpecifier;

  constructor(executor: JxaExecutor, specifier: ObjectSpecifier) {
    this.#executor = executor;
    this.#specifier = specifier;
  }

  /** List all ${resource.plural} */
  async list(): Promise<${instanceClass}[]> {
    const data = await this.#executor.query(this.#specifier) as ${resource.name}[];
    return data.map(item => new ${instanceClass}(
      this.#executor,
      this.#specifier.byId(item.uid ?? item.id ?? ''),
      item
    ));
  }

  /** Get a ${resource.name.toLowerCase()} by ID */
  async get(id: string): Promise<${instanceClass} | null> {
    try {
      const data = await this.#executor.query(
        this.#specifier.byId(id)
      ) as ${resource.name};
      return new ${instanceClass}(this.#executor, this.#specifier.byId(id), data);
    } catch {
      return null;
    }
  }

  /** Get a ${resource.name.toLowerCase()} by name */
  async getByName(name: string): Promise<${instanceClass} | null> {
    try {
      const data = await this.#executor.query(
        this.#specifier.byName(name)
      ) as ${resource.name};
      return new ${instanceClass}(this.#executor, this.#specifier.byName(name), data);
    } catch {
      return null;
    }
  }

  /** Create a new ${resource.name.toLowerCase()} */
  async create(input: ${createInputType}): Promise<${instanceClass}> {
    ${createInputSchema}.parse(input);
    const data = await this.#executor.command(
      this.#specifier,
      'make',
      input
    ) as ${resource.name};
    return new ${instanceClass}(
      this.#executor,
      this.#specifier.byId(data.uid ?? data.id ?? ''),
      data
    );
  }

  /** Get first item matching filter */
  async find(predicate: Partial<${resource.name}>): Promise<${instanceClass} | null> {
    const items = await this.list();
    for (const item of items) {
      let match = true;
      for (const [key, value] of Object.entries(predicate)) {
        if ((item as unknown as Record<string, unknown>)[key] !== value) {
          match = false;
          break;
        }
      }
      if (match) return item;
    }
    return null;
  }
}`;

  return { name: className, content, imports };
}
