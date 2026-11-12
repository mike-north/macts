/**
 * Declared command results are data, including falsy values. Generated CLI
 * commands use the existing human/JSON formatter conventions, while commands
 * whose effective contract has no output retain their success message.
 *
 * Regression (#287, #233): app and resource templates awaited then discarded
 * every result. These cases execute emitted Clipanion commands with the real
 * formatters and an injected SDK object; no network or app executor exists.
 */
import { Writable } from 'node:stream'
import { runInThisContext } from 'node:vm'
import * as clipanion from 'clipanion'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { generateCliPlugin, type AppManifest } from '@macts/core'
import { createFormatter } from './index.js'

/** A fixture with scalar app/resource results, void, and an unavailable reference result. */
const manifest: AppManifest = {
  version: '1.0',
  app: { name: 'Signal', bundleId: 'test.signal', tccEntitlements: [] },
  resources: {
    Item: {
      name: 'Item',
      plural: 'Items',
      description: 'A selected item',
      properties: {
        id: { type: 'string', access: 'r', description: 'Identity', code: 'ID  ', optional: false },
      },
      identifiers: [{ property: 'id', primary: true }],
    },
    Orphan: { name: 'Orphan', plural: 'Orphans', description: 'No resolving read', properties: {} },
  },
  hierarchy: { children: { items: { resource: 'Item', access: 'r' } } },
  enums: {},
  suites: [],
  relationships: [],
  commands: {
    probe: {
      name: 'probe',
      description: 'Read a flag',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'id', type: 'string', description: 'Item', required: true }],
      returns: 'boolean',
    },
    count: {
      name: 'count',
      description: 'Read a count',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'id', type: 'string', description: 'Item', required: true }],
      returns: 'integer',
    },
    status: {
      name: 'status',
      description: 'Read text',
      scope: 'application',
      parameters: [],
      returns: 'string',
    },
    clear: { name: 'clear', description: 'Clear a flag', scope: 'application', parameters: [] },
    orphan: {
      name: 'orphan',
      description: 'Unavailable result',
      scope: 'application',
      parameters: [],
      returns: 'Orphan',
    },
  },
}

/** Execute one actual generated command, replacing only its SDK module. */
async function run(
  method: 'probe' | 'count' | 'status' | 'clear' | 'orphan',
  value: unknown,
  json: boolean,
  failure?: Error
): Promise<{ code: number; stdout: string; stderr: string; calls: unknown[][] }> {
  const resource = method === 'probe' || method === 'count'
  const path = resource ? ['signal', 'items', method] : ['signal', method]
  const generated = generateCliPlugin(manifest, {
    packageName: '@macts/signal',
    sdkPackageName: '@macts/signal',
  })
  expect(generated.errors).toEqual([])
  const file = generated.files.find(
    ({ path: name }) => name === `src/commands/${path.slice(1).join('/')}.ts`
  )
  if (file === undefined) throw new Error('Missing fixture command')
  const calls: unknown[][] = []
  const invoke = (...args: unknown[]): Promise<unknown> => {
    calls.push(args)
    return failure === undefined ? Promise.resolve(value) : Promise.reject(failure)
  }
  const sdk = resource ? { items: { [method]: invoke } } : { [method]: invoke }
  const require = (name: string): unknown => {
    if (name === 'clipanion') return clipanion
    if (name.endsWith('/sdk.js')) return { getClient: () => sdk }
    if (name.endsWith('/output/index.js')) return { createFormatter }
    throw new Error(`Unexpected generated import: ${name}`)
  }
  const js = ts.transpileModule(file.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports: Record<string, unknown> = {}
  const evaluate = runInThisContext(`(function(require,exports){${js}\n})`) as (
    require: (name: string) => unknown,
    exports: Record<string, unknown>
  ) => void
  evaluate(require, exports)
  const cli = new clipanion.Cli()
  for (const command of Object.values(exports)) {
    if (typeof command === 'function' && command.prototype instanceof clipanion.Command) {
      // Runtime prototype validation establishes that this emitted export is a command class.
      cli.register(command as clipanion.CommandClass)
    }
  }
  let stdout = '',
    stderr = ''
  const output = new Writable({
    write(chunk, _encoding, done) {
      stdout += String(chunk)
      done()
    },
  })
  const error = new Writable({
    write(chunk, _encoding, done) {
      stderr += String(chunk)
      done()
    },
  })
  const code = await cli.run(
    [...path, ...(resource ? ['item-7'] : []), ...(json ? ['--json'] : [])],
    { stdout: output, stderr: error }
  )
  return { code, stdout, stderr, calls }
}

describe.each([false, true])('declared command output (json=%s)', (json) => {
  it.each([
    ['probe', false, 'false'],
    ['probe', true, 'true'],
    ['count', 0, '0'],
    ['status', 'Ready', 'Ready'],
    ['status', '', ''],
    ['probe', null, ''],
  ] as const)('prints %s result %j as data', async (method, value, human) => {
    const result = await run(method, value, json)
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    if (json) expect(JSON.parse(result.stdout)).toEqual({ data: value })
    else expect(result.stdout).toBe(`${human}\n`)
    expect(result.calls).toEqual([method === 'status' ? [] : ['item-7']])
  })

  it.each(['clear', 'orphan'] as const)(
    'retains success output for effective void %s',
    async (method) => {
      const result = await run(method, undefined, json)
      expect(result.code).toBe(0)
      if (json)
        expect(JSON.parse(result.stdout)).toEqual({
          success: true,
          message: `${method} completed successfully`,
        })
      else expect(result.stdout).toBe(`${method} completed successfully\n`)
    }
  )

  it('prints no success or result when validation rejects the operation', async () => {
    const result = await run('probe', undefined, json, new Error('Invalid result'))
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('Invalid result')
  })
})
