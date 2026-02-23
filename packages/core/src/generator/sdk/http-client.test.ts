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
    show: {
      name: 'show',
      description: 'Show an item',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'id', type: 'string', description: 'Item ID', required: true }],
      permission: 'testapp:items:show',
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
    expect(content).toContain("this.#httpClient.rpc<void>('testapp.app.refresh'")

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

    // Check CRUD methods
    expect(content).toContain('async list(): Promise<Item[]>')
    expect(content).toContain('async get(id: string): Promise<Item>')
    expect(content).toContain('async create(input: ItemCreateInput): Promise<Item>')
    expect(content).toContain('async update(id: string, input: ItemUpdateInput): Promise<Item>')
    expect(content).toContain('async delete(id: string): Promise<void>')

    // Check custom command method
    expect(content).toContain('async show(id: string)')
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
