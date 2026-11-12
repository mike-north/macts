/**
 * The generated contract of the Panes fixture (see `panesManifest`), compiled
 * in a temporary package against the real `@macts/contracts`, checked against
 * what the real native executor returns for it.
 *
 * Expected behaviour is written by hand from phases/13 D7 ("Emitted forms"),
 * D9 and D11:
 *
 * - a window's `currentTab` is typed as an index selector, whose selector is
 *   a position and whose container is an identity reference to the window;
 *   it has no `id`, and no identity reference is assignable to it;
 * - the window get's result schema admits the index selector the native
 *   executor emits for it, and decodes it to that selector within its
 *   window; it rejects a tab in identity form, and an index selector with no
 *   window, as output validation must.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D7, D9, D11)
 * @see ../../manifest/test-support/panes-positional.ts
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DecodeContext, ResourcePlanTable, ValueType } from '@macts/contracts'
import { createNativeExecutor } from '../../jxa/native-executor.js'
import { standInTransport } from '../../jxa/test-support/stand-in-app.js'
import { standInPanes } from '../../jxa/test-support/stand-in-panes.js'
import { panesManifest } from '../../manifest/test-support/panes-positional.js'
import { linkContracts, objectAt, runTsc, tsconfig } from '../test-support/compiled-contract.js'
import { generateContract } from './index.js'

/**
 * Compiled alongside the generated contract. Every `@ts-expect-error` line is
 * usage the record's types must reject; the build fails if any compiles.
 */
const CONSUMER_SOURCE = `
import type { IdentityReference, IndexSelectorReference, Integer } from '@macts/contracts'
import type { Tab, Window } from './contract/index.js'

export function usage(window: Window, identity: IdentityReference<Tab, Integer, 'Tab'>): void {
  const tab: IndexSelectorReference<Tab, 'Tab'> | null = window.currentTab
  if (tab === null) return
  const position: Integer = tab.selector.index
  const container: IdentityReference<unknown> = tab.container
  void [position, container]
  // @ts-expect-error -- a tab has no identifier
  void tab.id
  // @ts-expect-error -- an identity reference is not an index selector
  const wrong: IndexSelectorReference<Tab, 'Tab'> = identity
  void wrong
}
`

/** The window `id`'s wire form. */
const window = (id: string) => ({
  resource: 'Window',
  form: 'identity',
  cardinality: 'one',
  id: { integer: id },
})

/** A decoding client that binds references to their data unchanged. */
const DECODE_CONTEXT: DecodeContext = {
  bindReference: (reference) => reference as ReturnType<DecodeContext['bindReference']>,
  bindFile: () => {
    throw new Error('Panes has no files')
  },
}

let workDir = ''
let tscOutput = ''
let tscStatus: number | null = null
let windowResult: ValueType<unknown> | undefined

beforeAll(async () => {
  const generated = generateContract(panesManifest())
  expect(generated.errors).toEqual([])

  workDir = await mkdtemp(join(tmpdir(), 'macts-panes-contract-'))
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
  const contract = objectAt(loaded, ['panesContract'])
  const output = objectAt(contract, ['operations', 'panes.windows.getWindow'])['output']
  windowResult = output as ValueType<unknown>
}, 120_000)

afterAll(async () => {
  if (workDir !== '') await rm(workDir, { recursive: true, force: true })
})

/** The compiled window get's result type. */
function result(): ValueType<unknown> {
  if (windowResult === undefined) throw new Error('the contract was not loaded')
  return windowResult
}

describe('the Panes contract', () => {
  it('type-checks against @macts/contracts, with the consumer usage (and its rejections)', () => {
    expect(tscOutput).toBe('')
    expect(tscStatus).toBe(0)
  })

  it('admits and decodes the index selector the native executor emits for a window', async () => {
    const { app, automation } = standInPanes([
      { id: 4, name: 'Work', tabs: [{ title: 'Shell' }, { title: 'Logs' }], currentTab: 1 },
    ])
    const executor = createNativeExecutor({ transport: standInTransport(app, [], automation) })
    const plan = result().plan
    const resourcePlans: ResourcePlanTable = { Window: { id: { kind: 'integer' } }, Tab: {} }

    const wire = await executor.execute({
      manifest: panesManifest(),
      target: { command: 'getWindow', resource: 'Window' },
      input: { id: { integer: '4' } },
      inputPlan: {
        kind: 'record',
        fields: { id: { presence: 'required', value: { kind: 'integer' } } },
      },
      outputPlan: plan,
      resourcePlans,
    })

    expect(result().wire.safeParse(wire).success).toBe(true)
    const decoded = result().decode(wire, DECODE_CONTEXT)
    expect(decoded.ok ? objectAt(decoded.value, ['currentTab']) : decoded.issues).toEqual({
      app: 'panes',
      resource: 'Tab',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: 1 },
      container: { app: 'panes', resource: 'Window', form: 'identity', cardinality: 'one', id: 4 },
    })
  })

  it.each<[string, object]>([
    [
      'a tab in identity form',
      { resource: 'Tab', form: 'identity', cardinality: 'one', id: { integer: '1' } },
    ],
    [
      'an index selector with no window',
      {
        resource: 'Tab',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: { integer: '1' } },
      },
    ],
  ])('rejects %s at the window’s current tab, as output validation must', (_label, reference) => {
    const wire = { id: { integer: '4' }, name: 'Work', currentTab: { reference } }
    expect(result().wire.safeParse(wire).success).toBe(false)
    // The emitted form is admitted at the same position.
    const emitted = {
      ...wire,
      currentTab: {
        reference: {
          resource: 'Tab',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'index', index: { integer: '1' } },
          container: window('4'),
        },
      },
    }
    expect(result().wire.safeParse(emitted).success).toBe(true)
  })
})
