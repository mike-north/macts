import { describe, it, expect } from 'vitest'
import type { AppManifest } from '../../manifest/index.js'
import { generateHttpClientSdk } from './http-client.js'

function findFile(
  files: { path: string; content: string }[],
  path: string
): { path: string; content: string } {
  const file = files.find((f) => f.path === path)
  if (!file) {
    throw new Error(`Expected file at path "${path}" to exist`)
  }
  return file
}

// Minimal test manifest
const testManifest: AppManifest = {
  version: '1.0',
  app: {
    name: 'TestApp',
    bundleId: 'com.test.app',
    tccEntitlements: ['automation'],
  },
  resources: {
    Item: {
      name: 'Item',
      plural: 'Items',
      description: 'A test item',
      properties: {
        id: { access: 'r', type: 'string', description: 'ID', optional: false },
        name: { access: 'rw', type: 'string', description: 'Name', optional: false },
        count: { access: 'rw', type: 'integer', description: 'Count', optional: true },
      },
      identifiers: [{ property: 'id', primary: true }],
    },
  },
  enums: {
    Status: {
      name: 'Status',
      description: 'Item status',
      values: [
        { name: 'active', value: 'active', description: 'Active' },
        { name: 'inactive', value: 'inactive', description: 'Inactive' },
      ],
    },
  },
  hierarchy: {
    children: {
      items: { resource: 'Item', access: 'rw' },
    },
  },
  commands: {
    refresh: {
      name: 'refresh',
      description: 'Refresh all items',
      scope: 'application',
      parameters: [],
      permission: 'testapp:app:refresh',
    },
    // Standard CRUD commands. Keys differ from `name` (e.g. `createItem` vs
    // `create`) so the generated routes must key by the command KEY.
    listItems: {
      name: 'list',
      description: 'List all items',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [],
      permission: 'testapp:items:list',
    },
    getItem: {
      name: 'get',
      description: 'Get an item',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'id', type: 'string', description: 'Item ID', required: true }],
      permission: 'testapp:items:get',
    },
    createItem: {
      name: 'create',
      description: 'Create an item',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'name', type: 'string', description: 'Item name', required: true }],
      permission: 'testapp:items:create',
    },
    updateItem: {
      name: 'update',
      description: 'Update an item',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'id', type: 'string', description: 'Item ID', required: true }],
      permission: 'testapp:items:update',
    },
    deleteItem: {
      name: 'delete',
      description: 'Delete an item',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'id', type: 'string', description: 'Item ID', required: true }],
      permission: 'testapp:items:delete',
    },
    show: {
      name: 'show',
      description: 'Show an item',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'id', type: 'string', description: 'Item ID', required: true }],
      permission: 'testapp:items:show',
    },
    // Resource command with an enum-typed parameter: the generated resource client
    // method references `Status`, so the file must import it from '../types.js'.
    setStatus: {
      name: 'setStatus',
      description: 'Set the status of an item',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'status', type: 'Status', description: 'New status', required: true }],
      permission: 'testapp:items:setStatus',
    },
  },
  suites: [],
  relationships: [],
}

describe('generateHttpClientSdk', () => {
  it('generates all required files', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
      version: '1.0.0',
    })

    expect(result.errors).toHaveLength(0)

    const filePaths = result.files.map((f) => f.path)
    expect(filePaths).toContain('src/index.ts')
    expect(filePaths).toContain('src/client.ts')
    expect(filePaths).toContain('src/types.ts')
    expect(filePaths).toContain('src/resources/item.ts')
    expect(filePaths).toContain('package.json')
    expect(filePaths).toContain('tsconfig.json')
    expect(filePaths).toContain('tsup.config.ts')
    expect(filePaths).toContain('.gitignore')
    expect(filePaths).toContain('api-extractor.json')
    expect(filePaths).toContain('api-report/.gitkeep')
    expect(filePaths).toContain('temp/.gitkeep')
  })

  it('generates correct client class', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
    })

    const clientFile = findFile(result.files, 'src/client.ts')
    const content = clientFile.content

    // Check class name
    expect(content).toContain('export class TestAppClient')

    // Check resource property
    expect(content).toContain('readonly items: ItemResourceClient')

    // Check app-level command method
    expect(content).toContain('async refresh()')
    expect(content).toContain("await this.#httpClient.rpc<undefined>('testapp.app.refresh'")

    // Check error class
    expect(content).toContain('export class TestAppError extends Error')

    // Check HttpClient class
    expect(content).toContain('export class HttpClient')
    expect(content).toContain('async rpc<T>')
  })

  it('generates correct types file', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
    })

    const typesFile = findFile(result.files, 'src/types.ts')
    const content = typesFile.content

    // Check enum type
    expect(content).toContain("export type Status = 'active' | 'inactive'")

    // Check resource type
    expect(content).toContain('export interface Item')
    expect(content).toContain('id: string')
    expect(content).toContain('name: string')
    expect(content).toContain('count?: number')

    // Check create input type
    expect(content).toContain('export interface ItemCreateInput')

    // Check Zod schema
    expect(content).toContain('export const ItemSchema = z.object({')
  })

  it('generates correct resource client', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
    })

    const resourceFile = findFile(result.files, 'src/resources/item.ts')
    const content = resourceFile.content

    // Check class name
    expect(content).toContain('export class ItemResourceClient')

    // Check CRUD methods (named by operation, routed by command KEY)
    expect(content).toContain('async list(): Promise<Item[]>')
    expect(content).toContain('async get(id: string): Promise<Item>')
    expect(content).toContain('async create(input: ItemCreateInput): Promise<Item>')
    expect(content).toContain('async update(id: string, input: ItemUpdateInput): Promise<Item>')
    expect(content).toContain('async delete(id: string): Promise<void>')

    // Routes use the manifest command KEY, not the operation name.
    expect(content).toContain('${this.#app}.${this.#resource}.listItems`')
    expect(content).toContain('${this.#app}.${this.#resource}.getItem`')
    expect(content).toContain('${this.#app}.${this.#resource}.createItem`')
    expect(content).toContain('${this.#app}.${this.#resource}.updateItem`')
    expect(content).toContain('${this.#app}.${this.#resource}.deleteItem`')

    // Check custom command method, routed by its key (`show`).
    expect(content).toContain('async show(id: string)')
    expect(content).toContain('${this.#app}.${this.#resource}.show`')
  })

  it('omits CRUD methods with no backing manifest command', () => {
    // A resource whose manifest declares no `create` command must not emit a
    // `create()` method that would POST to a non-existent route.
    const manifestNoCreate: AppManifest = {
      ...testManifest,
      commands: {
        listItems: {
          name: 'list',
          description: 'List all items',
          scope: 'resource',
          resourceType: 'Item',
          parameters: [],
          permission: 'testapp:items:list',
        },
      },
    }
    const result = generateHttpClientSdk(manifestNoCreate, { packageName: '@macts/sdk-testapp' })
    const content = findFile(result.files, 'src/resources/item.ts').content
    expect(content).toContain('async list(): Promise<Item[]>')
    expect(content).not.toContain('async create(')
    expect(content).not.toContain('async get(')
    expect(content).not.toContain('async delete(')
  })

  it('omits resources that declare no operations', () => {
    // A resource with no applicable commands has nothing to call. It must not
    // produce a resource file, a client property, an import, or an export — an
    // empty resource client is dead API surface (and trips strict lint rules).
    const manifestWithInertResource: AppManifest = {
      ...testManifest,
      resources: {
        ...testManifest.resources,
        Ghost: {
          name: 'Ghost',
          plural: 'Ghosts',
          description: 'A resource with no operations',
          properties: {
            id: { access: 'r', type: 'string', description: 'ID', optional: false },
          },
          identifiers: [{ property: 'id', primary: true }],
        },
      },
      commands: {
        listItems: {
          name: 'list',
          description: 'List all items',
          scope: 'resource',
          resourceType: 'Item',
          parameters: [],
          permission: 'testapp:items:list',
        },
      },
    }
    const result = generateHttpClientSdk(manifestWithInertResource, {
      packageName: '@macts/sdk-testapp',
    })
    const paths = result.files.map((f) => f.path)
    // No resource file for the inert resource.
    expect(paths).not.toContain('src/resources/ghost.ts')
    // Item (which has a list command) is still generated.
    expect(paths).toContain('src/resources/item.ts')
    // The main client neither imports, declares, nor constructs the inert client.
    const clientContent = findFile(result.files, 'src/client.ts').content
    expect(clientContent).not.toContain('GhostResourceClient')
    expect(clientContent).toContain('ItemResourceClient')
    // The index does not export the inert client.
    const indexContent = findFile(result.files, 'src/index.ts').content
    expect(indexContent).not.toContain('GhostResourceClient')
  })

  // Regression: a resource command parameter typed as an enum (e.g. `Status`) makes the
  // generated method reference that type, so it must be imported from '../types.js'.
  // Previously the resource-file import was hardcoded to the resource's own
  // Read/Create/Update types, leaving `Status` referenced but unimported (TS2304).
  it('imports enum types used by resource command parameters', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
    })

    const content = findFile(result.files, 'src/resources/item.ts').content

    // The method signature references the enum...
    expect(content).toContain('async setStatus(status: Status)')
    // ...and the enum is imported alongside the resource's own types.
    expect(content).toContain(
      "import type { Item, ItemCreateInput, ItemUpdateInput, Status } from '../types.js';"
    )
  })

  it('generates correct package.json', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
      version: '2.0.0',
    })

    const pkgFile = findFile(result.files, 'package.json')
    const pkg = JSON.parse(pkgFile.content) as {
      name: string
      version: string
      keywords: string[]
      scripts: Record<string, string>
      dependencies: Record<string, string>
    }
    expect(pkg.name).toBe('@macts/sdk-testapp')
    expect(pkg.version).toBe('2.0.0')
    expect(pkg.dependencies).toHaveProperty('zod')
    expect(pkg.keywords).toEqual(['macts-sdk'])
    expect(pkg.scripts['api-extractor']).toBe('api-extractor run --local')
    expect(pkg.scripts['api-extractor:ci']).toBe('api-extractor run')
    expect(pkg.scripts['typecheck']).toBe('tsc --noEmit')
    expect(pkg.scripts['lint']).toBe('eslint src')
  })

  it('generates correct tsconfig.json', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
    })

    const tsconfigFile = findFile(result.files, 'tsconfig.json')
    const tsconfig = JSON.parse(tsconfigFile.content) as {
      extends: string
      compilerOptions: { rootDir: string; outDir: string }
      include: string[]
    }
    expect(tsconfig.extends).toBe('../../tsconfig.base.json')
    expect(tsconfig.compilerOptions.rootDir).toBe('src')
    expect(tsconfig.compilerOptions.outDir).toBe('dist')
    expect(tsconfig.include).toEqual(['src'])
  })

  it('generates correct tsup.config.ts', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
    })

    const tsupFile = findFile(result.files, 'tsup.config.ts')
    expect(tsupFile.content).toContain("import { defineConfig } from 'tsup'")
    expect(tsupFile.content).toContain("entry: ['src/index.ts']")
    expect(tsupFile.content).toContain("format: ['esm']")
    expect(tsupFile.content).toContain('dts: true')
    expect(tsupFile.content).toContain('sourcemap: true')
    expect(tsupFile.content).toContain('clean: true')
  })

  it('generates correct .gitignore', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
    })

    const gitignoreFile = findFile(result.files, '.gitignore')
    expect(gitignoreFile.content).toContain('dist/')
    expect(gitignoreFile.content).toContain('node_modules/')
    expect(gitignoreFile.content).toContain('*.tsbuildinfo')
    expect(gitignoreFile.content).toContain('.turbo/')
  })

  it('generates correct api-extractor.json', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
    })

    const apiExtractorFile = findFile(result.files, 'api-extractor.json')
    const config = JSON.parse(apiExtractorFile.content) as {
      $schema: string
      extends: string
    }
    expect(config.$schema).toBe(
      'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json'
    )
    expect(config.extends).toBe('../../api-extractor.base.json')
  })

  it('generates empty gitkeep files for directories', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
    })

    const apiReportKeep = findFile(result.files, 'api-report/.gitkeep')
    expect(apiReportKeep.content).toBe('')

    const tempKeep = findFile(result.files, 'temp/.gitkeep')
    expect(tempKeep.content).toBe('')
  })

  it('generates correct index file', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
    })

    const indexFile = findFile(result.files, 'src/index.ts')
    const content = indexFile.content

    // Check exports
    expect(content).toContain('export { TestAppClient, TestAppError, HttpClient }')
    expect(content).toContain('export type { TestAppClientOptions }')
    expect(content).toContain("export * from './types.js'")
    expect(content).toContain("export { ItemResourceClient } from './resources/item.js'")
  })

  it('uses custom base URL and port', () => {
    const result = generateHttpClientSdk(testManifest, {
      packageName: '@macts/sdk-testapp',
      defaultBaseUrl: 'https://api.example.com',
      defaultPort: 9000,
    })

    const clientFile = findFile(result.files, 'src/client.ts')
    expect(clientFile.content).toContain('https://api.example.com:9000')
  })
})
