/**
 * The generated contract of the Archive fixture (see `archiveManifest`),
 * compiled in a temporary package against the real `@macts/contracts` and
 * used as a consumer would use it.
 *
 * Expected behaviour is written by hand from phases/13 D2, D7 and D10:
 *
 * - A key-targeted resource's get takes its key, and binds onto its get
 *   descriptor with the key under the get command's parameter.
 * - A singleton root's get takes only call options, binds onto its get
 *   descriptor with an empty input, and the root has no list; its client
 *   rejects an identifier at compile time.
 * - An operation whose required input takes a reference to a root cannot be
 *   called, so no client method offers it.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D2, D7, D10)
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AnyOperationDescriptor, ClientRuntime } from '@macts/contracts'
import { archiveManifest } from '../../manifest/test-support/archive-key-and-root.js'
import {
  call,
  linkContracts,
  objectAt,
  runTsc,
  tsconfig,
} from '../test-support/compiled-contract.js'
import { generateContract } from './index.js'

/**
 * Compiled alongside the generated contract. Every `@ts-expect-error` line is
 * usage the client's types must reject; the build fails if any compiles.
 */
const CONSUMER_SOURCE = `
import type { ClientRuntime } from '@macts/contracts'
import { archiveContract, type ArchiveClient, type Desk, type Entry, type Label } from './contract/index.js'

declare const runtime: ClientRuntime
const client: ArchiveClient = archiveContract.bind(runtime)

export async function usage(): Promise<void> {
  const desk: Desk = await client.desks.get()
  const clerk: string | null = desk.clerk
  const entry: Entry = await client.entries.get('/a')
  const label: Label = await client.labels.get('/a', 'l1')
  void [clerk, entry, label]
  await client.desks.get({ signal: new AbortController().signal })
  // @ts-expect-error -- a root's get reads an application property: it takes no identifier
  await client.desks.get('front')
  // @ts-expect-error -- a root has no list
  await client.desks.list()
  // @ts-expect-error -- ring's required desk takes a reference to a root, so it cannot be called
  await client.ring()
}
`

interface RecordedCall {
  readonly operation: AnyOperationDescriptor
  readonly input: unknown
}

let workDir = ''
let tscOutput = ''
let tscStatus: number | null = null
let bindContract: ((runtime: ClientRuntime) => unknown) | undefined

beforeAll(async () => {
  const generated = generateContract(archiveManifest())
  expect(generated.errors).toEqual([])

  workDir = await mkdtemp(join(tmpdir(), 'macts-archive-contract-'))
  for (const file of generated.files) {
    const path = join(workDir, file.path)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, file.content)
  }
  await writeFile(join(workDir, 'src', 'consumer.ts'), CONSUMER_SOURCE)
  await writeFile(join(workDir, 'package.json'), JSON.stringify({ type: 'module' }))
  await writeFile(join(workDir, 'tsconfig.json'), tsconfig(['src'], false))
  await linkContracts(workDir)

  const tsc = runTsc(workDir)
  tscStatus = tsc.status
  tscOutput = tsc.output
  if (tscStatus !== 0) throw new Error(`the generated contract does not compile:\n${tscOutput}`)

  const loaded: unknown = await import(
    pathToFileURL(join(workDir, 'dist', 'src', 'contract', 'index.js')).href
  )
  const contract: unknown =
    typeof loaded === 'object' && loaded !== null
      ? Reflect.get(loaded, 'archiveContract')
      : undefined
  const bind: unknown =
    typeof contract === 'object' && contract !== null ? Reflect.get(contract, 'bind') : undefined
  if (typeof bind !== 'function') throw new Error('the compiled module exports no archiveContract')
  bindContract = (runtime) => Reflect.apply(bind, contract, [runtime]) as unknown
}, 120_000)

afterAll(async () => {
  if (workDir !== '') await rm(workDir, { recursive: true, force: true })
})

/** A client bound to a runtime that records each call and answers `null`. */
function boundClient(): { client: unknown; calls: RecordedCall[] } {
  const calls: RecordedCall[] = []
  const runtime: ClientRuntime = {
    invoke(operation, input) {
      calls.push({ operation, input })
      return Promise.resolve(null as never)
    },
    resolve() {
      return Promise.reject(new Error('the generated client never resolves references itself'))
    },
  }
  if (bindContract === undefined) throw new Error('the contract was not loaded')
  return { client: bindContract(runtime), calls }
}

describe('the Archive contract', () => {
  it('type-checks against @macts/contracts, with the consumer usage (and its rejections)', () => {
    expect(tscOutput).toBe('')
    expect(tscStatus).toBe(0)
  })

  it('binds the root get onto its descriptor with an empty input', async () => {
    const { client, calls } = boundClient()
    await call(client, ['desks', 'get'])
    expect(calls.map(({ operation, input }) => [operation.id, input])).toEqual([
      ['archive.desks.getDesk', {}],
    ])
  })

  it('binds a key-targeted get with its key, and a get within a keyed parent with both', async () => {
    const { client, calls } = boundClient()
    await call(client, ['entries', 'get'], '/a')
    await call(client, ['labels', 'get'], '/a', 'l1')
    expect(calls.map(({ operation, input }) => [operation.id, input])).toEqual([
      ['archive.entries.getEntry', { location: '/a' }],
      ['archive.labels.getLabel', { entryLocation: '/a', id: 'l1' }],
    ])
  })

  it('offers only the root get, and no method for the operation that cannot be called', () => {
    const { client } = boundClient()
    expect(Object.keys(objectAt(client, ['desks']))).toEqual(['get'])
    expect(Object.keys(objectAt(client, [])).sort()).toEqual([
      'desks',
      'entries',
      'labels',
      'marks',
      'volumes',
    ])
  })
})
