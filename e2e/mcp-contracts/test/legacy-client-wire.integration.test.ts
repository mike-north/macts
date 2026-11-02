/**
 * Integration: the generated legacy resource client sends requests its app's
 * built contract accepts (#207).
 *
 * Terminal's window and settings set identifiers are declared `integer`, and
 * the contract's `get` input accepts them only in the integer wire form,
 * `{ id: { integer: "<digits>" } }` (phases/13 D3). The legacy client is
 * generated from the manifest, compiled here, and called with the string a
 * CLI passes; the body it sends is parsed with the shipped contract's wire
 * schema. The body the client sent before the fix, `{ id: "13000" }`, must be
 * rejected by the same schema, so the check cannot pass vacuously.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D3)
 * @see https://github.com/mike-north/macts/issues/207
 */

import { runInNewContext } from 'node:vm'
import { beforeAll, describe, expect, it } from 'vitest'
import ts from 'typescript'
import { generateHttpClientSdk } from '@macts/core'
import { loadRealApps, type RealApp } from '../src/real-contracts.js'

let terminal: RealApp

beforeAll(async () => {
  const found = (await loadRealApps()).find((app) => app.name === 'terminal')
  if (found === undefined) throw new Error('no terminal app')
  terminal = found
})

/** The request body a generated resource client's `get` sends for `identifier`. */
async function sentBody(file: string, className: string, identifier: string): Promise<unknown> {
  const sdk = generateHttpClientSdk(terminal.manifest, { packageName: '@macts/terminal' })
  const source = sdk.files.find((f) => f.path === `src/resources/${file}.ts`)
  if (source === undefined) throw new Error(`no ${file} client generated`)
  const { outputText } = ts.transpileModule(source.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const exports: Record<string, unknown> = {}
  runInNewContext(outputText, { exports })
  const Client = exports[className] as new (
    http: { rpc: (path: string, body: unknown) => Promise<unknown> },
    app: string,
    resource: string
  ) => { get: (id: string) => Promise<unknown> }
  let body: unknown
  const client = new Client(
    {
      rpc: (_path, sent) => {
        body = sent
        return Promise.resolve({})
      },
    },
    'terminal',
    'windows'
  )
  await client.get(identifier)
  return body
}

describe('legacy client get against the built Terminal contract (#207)', () => {
  it.each([
    ['window', 'WindowResourceClient', 'terminal.windows.get'],
    ['settingsset', 'SettingsSetResourceClient', 'terminal.settingsSets.get'],
  ])('%s: the body it sends parses; the raw string body does not', async (file, cls, op) => {
    const wire = terminal.contract.operations[op as `${string}.${string}.${string}`]?.input.wire
    if (wire === undefined) throw new Error(`no ${op} operation`)
    const body = await sentBody(file, cls, '13000')
    expect(body).toEqual({ id: { integer: '13000' } })
    expect(wire.safeParse(body).success).toBe(true)
    expect(wire.safeParse({ id: '13000' }).success).toBe(false)
  })
})
