import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AppManifest } from '../manifest/index.js'
import { createGeneratorContext, type GeneratorOptions, type GeneratorContext } from './context.js'
import { generateTypes } from './types.js'
import { generateSchemas } from './schemas.js'
import { generateResourceClass } from './resource.js'
import { generateCollectionClass } from './collection.js'
import { generateApplicationClass } from './application.js'
import { MIT_LICENSE } from './license.js'

export interface GenerateSdkResult {
  files: { path: string; content: string }[]
  errors: string[]
}

/**
 * Generate a complete SDK from a manifest.
 */
export function generateSdk(manifest: AppManifest, options: GeneratorOptions): GenerateSdkResult {
  const ctx = createGeneratorContext(manifest, options)
  const files: { path: string; content: string }[] = []
  const errors: string[] = []

  try {
    // Generate types
    const types = generateTypes(ctx)
    for (const type of types) {
      files.push({
        path: join('src', 'types', `${type.name}.ts`),
        content: type.content,
      })
    }

    // Generate schemas
    const schemas = generateSchemas(ctx)
    for (const schema of schemas) {
      files.push({
        path: join('src', 'schemas', `${schema.name}.ts`),
        content: schema.content,
      })
    }

    // Generate resource classes
    for (const resource of ctx.getResources()) {
      const resourceClass = generateResourceClass(resource, ctx)
      files.push({
        path: join('src', 'resources', `${resourceClass.name}.ts`),
        content: resourceClass.content,
      })

      const collectionClass = generateCollectionClass(resource, ctx)
      files.push({
        path: join('src', 'collections', `${collectionClass.name}.ts`),
        content: collectionClass.content,
      })
    }

    // Generate application class
    const appClass = generateApplicationClass(ctx)
    files.push({
      path: join('src', `${appClass.name}.ts`),
      content: appClass.content,
    })

    // Generate package.json
    files.push({
      path: 'package.json',
      content: generatePackageJson(ctx),
    })

    // Generate index.ts
    files.push({
      path: join('src', 'index.ts'),
      content: generateIndexFile(ctx, appClass.name),
    })

    // Generate LICENSE
    files.push({
      path: 'LICENSE',
      content: MIT_LICENSE,
    })
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return { files, errors }
}

function generatePackageJson(ctx: GeneratorContext): string {
  const unscopedName = ctx.options.packageName.replace(/^@[^/]+\//, '')
  const typesPath = `./dist/${unscopedName}.d.ts`

  const pkg = {
    name: ctx.options.packageName,
    version: ctx.options.version ?? '0.0.0',
    description: `TypeScript SDK for ${ctx.manifest.app.name}`,
    license: 'MIT',
    repository: {
      type: 'git',
      url: 'git+https://github.com/mike-north/macts.git',
      directory: `packages/${unscopedName}`,
    },
    publishConfig: { access: 'public' },
    type: 'module',
    exports: {
      '.': {
        types: typesPath,
        import: './dist/index.js',
      },
    },
    main: './dist/index.js',
    types: typesPath,
    files: ['dist'],
    engines: {
      node: '>=22',
    },
    dependencies: {
      '@macts/core': 'workspace:*',
      zod: 'catalog:',
    },
  }
  return JSON.stringify(pkg, null, 2)
}

function generateIndexFile(ctx: GeneratorContext, appClassName: string): string {
  const lines = [
    `// Auto-generated SDK for ${ctx.manifest.app.name}`,
    '',
    `export { ${appClassName} } from './${appClassName}.js';`,
    '',
    '// Types',
  ]

  for (const resource of ctx.getResources()) {
    lines.push(
      `export type { ${resource.name}, ${resource.name}CreateInput, ${resource.name}UpdateInput } from './types/${resource.name}.js';`
    )
  }

  for (const enumDef of ctx.getEnums()) {
    lines.push(`export type { ${enumDef.name} } from './types/${enumDef.name}.js';`)
  }

  lines.push('')
  lines.push('// Schemas')

  for (const resource of ctx.getResources()) {
    lines.push(
      `export { ${resource.name}Schema, ${resource.name}CreateInputSchema, ${resource.name}UpdateInputSchema } from './schemas/${resource.name}Schema.js';`
    )
  }

  return lines.join('\n')
}

/**
 * Write generated SDK to disk.
 */
export async function writeSdk(result: GenerateSdkResult, outDir: string): Promise<void> {
  for (const file of result.files) {
    const fullPath = join(outDir, file.path)
    const dir = join(outDir, file.path, '..')
    await mkdir(dir, { recursive: true })
    await writeFile(fullPath, file.content, 'utf-8')
  }
}
