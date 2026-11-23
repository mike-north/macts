/** Explicit reads preserve action-input contracts independently of their address selectors. */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInThisContext } from 'node:vm'
import * as ts from 'typescript'
import { expect, it } from 'vitest'
import * as contracts from '@macts/contracts'
import type { CommandParameter } from '../../manifest/index.js'
import { parseManifestYaml } from '../../manifest/loader.js'
import { AppManifestSchema } from '../../manifest/schemas/app.js'
import { generateConsolidatedPackages } from '../orchestrate.js'

/** Emitted modules run with real value contracts and only a recording transport substituted. */
function evaluate(source: string, dependency: (name: string) => unknown): Record<string, unknown> {
  const exports: Record<string, unknown> = {}
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  runInThisContext(`(function(require,exports) { ${code} })`)(dependency, exports)
  return exports
}
const requireCore = createRequire(import.meta.url)
/** A shipped complete address admits additional command inputs without changing its selectors. */
function generate(parameter: CommandParameter) {
  const manifest = parseManifestYaml(
    readFileSync(new URL('../../../../../manifests/iterm/app.yaml', import.meta.url), 'utf8')
  )
  manifest.commands['getSession']?.parameters.push(parameter)
  expect(AppManifestSchema.safeParse(manifest).success).toBe(true)
  const result = generateConsolidatedPackages(manifest, { appName: 'iterm' })
  expect(result.errors).toEqual([])
  const source = (path: string): string => {
    const file = result.client.files.find((file) => file.path === path)
    if (file === undefined) throw new Error(`Missing generated module ${path}`)
    return file.content
  }
  const sdk = source('src/resources/session.ts')
  const cli = source('src/cli/commands/windows/tabs/sessions/get.ts')
  const contract = source('src/contract/index.ts')
  return { sdk, cli, contract }
}
/** The evaluated method's inputs remain unknown here so runtime boundary cases can be exercised. */
interface Resource {
  get(...inputs: unknown[]): Promise<unknown>
}
/** Instantiate actual emitted code; package loading stays real except for the transport. */
function recordingResource(sdk: string) {
  const calls: unknown[][] = []
  const { SessionResourceClient } = evaluate(sdk, (name) =>
    name === '@macts/contracts' ? contracts : requireCore(name)
  )
  const Constructor = SessionResourceClient as new (...args: unknown[]) => Resource
  const resource = new Constructor(
    {
      invoke: async (...args: unknown[]) => {
        calls.push(args)
        return { id: 'a' }
      },
    },
    'iterm',
    'sessions'
  )
  return { resource, calls }
}
const optionalInteger: CommandParameter = {
  name: 'limit',
  type: 'integer',
  required: false,
  description: 'Optional read bound',
}

it('omits an absent optional integer through the emitted HTTP read', async () => {
  const { sdk } = generate(optionalInteger)
  const { resource, calls } = recordingResource(sdk)
  await expect(resource.get(7, 0, 'a')).resolves.toEqual({ id: 'a' })
  expect(calls[0]?.[1]).toEqual({ windowId: 7, tabIndex: 0, sessionId: 'a' })
  expect(calls[0]?.[1]).not.toHaveProperty('limit')
  expect(sdk).toContain('limit?: number')
})

it('executes the emitted CLI without an optional integer flag through the HTTP wrapper', async () => {
  const { sdk, cli } = generate(optionalInteger)
  const { resource, calls } = recordingResource(sdk)
  const { GetSessionCommand } = evaluate(cli, (name) => {
    if (name === 'clipanion') return requireCore(name)
    if (name.endsWith('/sdk.js')) return { getClient: () => ({ sessions: resource }) }
    if (name.endsWith('/output/index.js'))
      return {
        createFormatter: () => ({ format: () => '', formatError: (message: string) => message }),
      }
    throw new Error(`Unexpected dependency ${name}`)
  })
  const Constructor = GetSessionCommand as new () => { execute(): Promise<number> }
  const command = new Constructor()
  let stderr = ''
  Object.assign(command, {
    windowId: '7',
    tabIndex: '0',
    sessionId: 'a',
    limit: undefined,
    json: true,
    context: {
      stdout: { write: () => undefined },
      stderr: {
        write: (text: string) => {
          stderr += text
        },
      },
    },
  })
  expect(await command.execute(), stderr).toBe(0)
  expect(calls).toHaveLength(1)
  expect(calls[0]?.[1]).not.toHaveProperty('limit')
})

it('preserves boolean typing and false through the emitted HTTP read', async () => {
  const { sdk } = generate({
    name: 'enabled',
    type: 'boolean',
    required: true,
    description: 'Read mode',
  })
  expect(sdk).toContain('enabled: boolean')
  const { resource, calls } = recordingResource(sdk)
  await resource.get('7', '0', 'a', false)
  expect(calls[0]?.[1]).toEqual({ windowId: 7, tabIndex: 0, sessionId: 'a', enabled: false })
})

it('preserves declared null for optional integer inputs', async () => {
  const { sdk } = generate({
    ...optionalInteger,
    nullable: true,
    evidence: {
      nullable: { source: 'curated', note: 'The fixture permits an unbounded read via null' },
    },
  })
  expect(sdk).toContain('limit?: number | null')
  const { resource, calls } = recordingResource(sdk)
  await resource.get(7, 0, 'a', null)
  expect(calls[0]?.[1]).toEqual({ windowId: 7, tabIndex: 0, sessionId: 'a', limit: null })
})

it('keeps supplied optional integers and strict selector validation', async () => {
  const { sdk } = generate(optionalInteger)
  const { resource, calls } = recordingResource(sdk)
  await resource.get('7', '0', 'a', 5)
  expect(calls[0]?.[1]).toEqual({ windowId: 7, tabIndex: 0, sessionId: 'a', limit: 5 })
  await expect(resource.get('07', '0', 'a', 5)).rejects.toBeInstanceOf(contracts.ValidationError)
  expect(calls).toHaveLength(1)
})
