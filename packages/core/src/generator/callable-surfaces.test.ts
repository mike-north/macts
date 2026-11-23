/** Callable admission follows published surfaces; 1.0 retains its established duplicate-CRUD behavior. */
import { readFileSync, readdirSync } from 'node:fs'
import { runInThisContext } from 'node:vm'
import * as ts from 'typescript'
import * as values from '@macts/contracts'
import { expect, it } from 'vitest'
import { AppManifestSchema, type AppManifest } from '../manifest/schemas/app.js'
import { parseManifestYaml } from '../manifest/loader.js'
import { panesManifest } from '../manifest/test-support/panes-positional.js'
import { archiveManifest } from '../manifest/test-support/archive-key-and-root.js'
import { usableCommands, usableResources } from '../manifest/unsupported.js'
import { resourceCommandEntries } from '../manifest/resource-commands.js'
import { generateConsolidatedPackages } from './orchestrate.js'
import { isOperationAvailable } from './input-satisfiability.js'
import { resourceNamespace, safeIdentifier } from './surface.js'

/** Evaluate emitted contracts/HTTP classes without application or network access. */
function evaluate(source: string): Record<string, unknown> {
  const exports: Record<string, unknown> = {}
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const run = runInThisContext(`(function(require, exports) { ${code} })`) as (
    require: () => unknown,
    exports: Record<string, unknown>
  ) => void
  run(() => values, exports)
  return exports
}

/** Every CRUD slot is independently declared; later CRUD commands never inherit a first method. */
it.each(['1.0', '1.1'] as const)(
  'audits primary/additional CRUD admission in format %s',
  (version) => {
    const outcomes: boolean[] = [],
      expected: boolean[] = []
    for (const kind of ['get', 'list', 'create', 'update', 'delete', 'inspect']) {
      for (const additional of [false, true]) {
        const manifest = { ...panesManifest(), version }
        const window = manifest.hierarchy.children['windows']
        if (window === undefined) throw new Error('Missing Windows')
        window.access = 'rw'
        delete window.children
        delete manifest.resources['Tab']
        delete manifest.resources['Window']?.properties['currentTab']
        const getWindow = manifest.commands['getWindow']
        if (getWindow === undefined) throw new Error('Missing Window get')
        manifest.commands = { getWindow }
        const command = {
          name: kind,
          scope: 'resource' as const,
          resourceType: 'Window',
          description: 'Declared callable',
          routeName: 'first',
          parameters: ['get', 'update', 'delete', 'inspect'].includes(kind)
            ? [
                {
                  name: 'id',
                  type: 'integer' as const,
                  required: true,
                  description: 'Selected Window',
                },
              ]
            : [],
        }
        manifest.commands['first'] = command
        if (kind === 'get') delete manifest.commands['getWindow']
        if (additional)
          manifest.commands['second'] = {
            ...command,
            name: kind === 'inspect' ? 'inspectAgain' : kind,
            routeName: 'second',
          }
        const supported =
          version === '1.0' ||
          (!['update', 'delete'].includes(kind) && (!additional || kind === 'inspect'))
        const parsed = AppManifestSchema.safeParse(manifest)
        const generated = generateConsolidatedPackages(manifest, { appName: 'panes' })
        outcomes.push(
          parsed.success,
          generated.errors.length === 0,
          generated.client.files.length > 0
        )
        expected.push(supported, supported, supported)
        if (supported && version === '1.1') expectEmittedSurfaces('panes', manifest)
      }
    }
    expect(outcomes).toEqual(expected)
  }
)

const directory = new URL('../../../../manifests/', import.meta.url)
const cases = readdirSync(directory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map(({ name }) => ({
    name,
    manifest: parseManifestYaml(readFileSync(new URL(`${name}/app.yaml`, directory), 'utf8')),
  }))
cases.push({ name: 'panes', manifest: { ...panesManifest(), version: '1.1' } })
const archive = { ...archiveManifest(), version: '1.1' as const }
archive.commands = Object.fromEntries(
  Object.entries(archive.commands).filter(([, command]) => command.resourceType === 'Desk')
)
cases.push({ name: 'archive', manifest: archive })

/** Inspect actual emitted members and CLI calls rather than using the admission predicate as an oracle. */
function expectEmittedSurfaces(name: string, manifest: AppManifest): void {
  const generated = generateConsolidatedPackages(manifest, { appName: name })
  const sources = new Map(generated.client.files.map((file) => [file.path, file.content]))
  const contract = Object.values(evaluate(sources.get('src/contract/index.ts') ?? '')).find(
    (value): value is values.AppContract<object> =>
      typeof value === 'object' && value !== null && 'bind' in value
  )
  if (contract === undefined) throw new Error('Missing contract')
  const client = contract.bind({
    // Members are inspected, never called.
    invoke: () => Promise.reject(new Error('Not called')),
    resolve: () => Promise.reject(new Error('Not called')),
  })
  const cli = generated.client.files.filter((file) => file.path.startsWith('src/cli/commands/'))
  expect(new Set(cli.map((file) => file.path)).size).toBe(cli.length)
  const namespaces: [string, ReturnType<typeof resourceCommandEntries>][] = usableResources(
    manifest
  ).map(([key, resource]) => [resourceNamespace(resource), resourceCommandEntries(manifest, key)])
  namespaces.push([
    'app',
    usableCommands(manifest).filter(([, command]) => command.scope === 'application'),
  ])
  for (const [namespace, commands] of namespaces) {
    const names: string[] = []
    for (const [key, command] of commands) {
      const resource =
        namespace === 'app'
          ? undefined
          : usableResources(manifest).find(
              ([, value]) => resourceNamespace(value) === namespace
            )?.[0]
      if (!isOperationAvailable(manifest, command, resource)) continue
      const crud =
        namespace !== 'app' && ['get', 'list', 'create', 'update', 'delete'].includes(command.name)
      const primary = commands.find(([, other]) => other.name === command.name)?.[0] === key
      const callable = crud && !primary ? (command.routeName ?? key) : command.name
      const method = crud && primary ? callable : safeIdentifier(callable)
      names.push(method)
      const members = namespace === 'app' ? client : (Reflect.get(client, namespace) as object)
      expect(typeof Reflect.get(members, method), `${namespace}.${method}`).toBe('function')
      if (resource !== undefined) {
        const http = evaluate(sources.get(`src/resources/${resource.toLowerCase()}.ts`) ?? '')
        const Constructor = http[`${resource}ResourceClient`] as new (...args: unknown[]) => object
        expect(typeof Reflect.get(new Constructor({}, name, namespace), method)).toBe('function')
      }
      expect(
        cli.some((file) =>
          file.content.includes(`client.${namespace === 'app' ? '' : `${namespace}.`}${method}(`)
        ),
        `${namespace}.${method} CLI`
      ).toBe(true)
    }
    expect(new Set(names).size, namespace).toBe(names.length)
  }
}

it.each(cases)(
  'emits every admitted 1.1 command once per callable namespace for $name',
  ({ name, manifest }) => {
    expect(AppManifestSchema.safeParse(manifest).success).toBe(true)
    expect(generateConsolidatedPackages(manifest, { appName: name }).errors).toEqual([])
    if (manifest.version === '1.1') expectEmittedSurfaces(name, manifest)
  }
)
