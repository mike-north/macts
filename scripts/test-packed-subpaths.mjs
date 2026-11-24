/** Exercise published declarations in an isolated TypeScript consumer. */
import { getPackages } from '@manypkg/get-packages'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const root = process.cwd()
const { packages } = await getPackages(root)
const published = packages.filter((pkg) => !pkg.packageJson.private)
const byName = new Map(published.map((pkg) => [pkg.packageJson.name, pkg]))
const clients = published.filter((pkg) => pkg.packageJson.exports?.['./cli'])
const selected = new Set([
  '@macts/core',
  '@macts/sdk',
  ...clients.map((pkg) => pkg.packageJson.name),
])
// Include workspace peers as well as dependencies so none resolve from a registry.
for (const name of selected) {
  const pkg = byName.get(name)
  if (!pkg) throw new Error(`Missing workspace package ${name}`)
  for (const dep of Object.keys({
    ...pkg.packageJson.dependencies,
    ...pkg.packageJson.peerDependencies,
  })) {
    if (dep.startsWith('@macts/')) selected.add(dep)
  }
}
const temp = await mkdtemp(path.join(os.tmpdir(), 'macts-packed-types-'))
try {
  const dependencies = {}
  for (const name of selected) {
    const pkg = byName.get(name)
    execFileSync('pnpm', ['pack', '--pack-destination', temp], { cwd: pkg.dir, stdio: 'pipe' })
    const filename = (await readdir(temp)).find(
      (file) => file === `${name.replace('@', '').replace('/', '-')}-${pkg.packageJson.version}.tgz`
    )
    if (!filename) throw new Error(`No archive for ${name}`)
    dependencies[name] = `file:${path.join(temp, filename)}`
  }
  const rootManifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  dependencies.typescript = rootManifest.devDependencies.typescript
  dependencies['@types/node'] = rootManifest.devDependencies['@types/node']
  await writeFile(
    path.join(temp, 'package.json'),
    JSON.stringify(
      {
        private: true,
        type: 'module',
        packageManager: rootManifest.packageManager,
        dependencies,
        pnpm: {
          overrides: Object.fromEntries([...selected].map((name) => [name, dependencies[name]])),
        },
      },
      null,
      2
    )
  )
  execFileSync('pnpm', ['install', '--ignore-scripts'], { cwd: temp, stdio: 'inherit' })
  const imports = clients.map(
    (pkg, i) =>
      `import type { plugin as Plugin${i} } from '${pkg.packageJson.name}/cli';\ntype Check${i} = typeof Plugin${i};`
  )
  imports.push(
    "import type { RemoteClientOptions } from '@macts/sdk';\ntype RemoteCheck = RemoteClientOptions;"
  )
  imports.push(
    "import type { LocalClientOptions } from '@macts/sdk/local';\ntype LocalCheck = LocalClientOptions;"
  )
  imports.push(
    "import type { GeneratorOptions } from '@macts/core/generator';\ntype GeneratorCheck = GeneratorOptions;"
  )
  await writeFile(path.join(temp, 'consumer.ts'), imports.join('\n') + '\n')
  let failed = false
  for (const resolution of ['nodenext', 'bundler']) {
    await writeFile(
      path.join(temp, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          module: resolution === 'nodenext' ? 'NodeNext' : 'ESNext',
          moduleResolution: resolution,
          target: 'ES2022',
        },
        files: ['consumer.ts'],
      })
    )
    console.log(
      `Checking ${clients.length} CLI subpaths and @macts/core/generator with ${resolution}`
    )
    try {
      execFileSync('pnpm', ['exec', 'tsc', '--noEmit'], { cwd: temp, stdio: 'inherit' })
    } catch {
      failed = true
    }
  }
  if (failed) process.exitCode = 1
} finally {
  await rm(temp, { recursive: true, force: true })
}
