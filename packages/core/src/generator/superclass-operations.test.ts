/**
 * The operations of a resource that inherits a superclass: the generated
 * contract and the native get and list bodies of a stand-in Catalog whose
 * Book inherits Item.
 *
 * Expected values are written by hand from phases/13 D10 ("Superclasses",
 * "Native spellings"): a subclass's record holds every property its ancestors
 * declare and it does not, under the property's public key, and every read of
 * an inherited property uses the app's spelling the ancestor records for it.
 * Item records `uRL` as the app's `url` and `pOSIXPath` as `posixPath`; Book
 * inherits both, and its identifier, and declares `author` itself.
 *
 * The executor cases run the real native executor on the real composed
 * script against a stand-in Catalog application.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10
 */

import { describe, expect, it } from 'vitest'
import type { ResourcePlanTable, ValuePlan } from '@macts/contracts'
import { parseManifestYaml } from '../manifest/loader.js'
import { createNativeExecutor } from '../jxa/native-executor.js'
import { buildNativeBody } from '../jxa/native-scripts.js'
import { standInTransport } from '../jxa/test-support/stand-in-app.js'
import { CONTRACT_MODULE_PATH, generateContract } from './contract/index.js'

/** Dictionary evidence of the Catalog app for `term`. */
const evidence = (term: string): string => `
          evidence:
            source: dictionary
            bundleId: com.example.catalog
            appVersion: '2.0'
            osVersion: '27.2'
            term: ${term}`

const manifest = parseManifestYaml(`
version: '1.0'
app:
  name: Catalog
  bundleId: com.example.catalog
resources:
  Item:
    name: Item
    plural: Items
    description: An item
    properties:
      id:
        access: r
        type: string
        description: The id of the item
      uRL:
        access: r
        type: string
        description: The URL of the item
        native:
          name: url${evidence('URL')}
      pOSIXPath:
        access: r
        type: string
        description: The POSIX path of the item
        native:
          name: posixPath${evidence('POSIX path')}
    identifiers:
      - property: id
        primary: true
  Book:
    name: Book
    plural: Books
    description: A book
    inherits:
      resource: Item
      evidence:
        source: dictionary
        bundleId: com.example.catalog
        appVersion: '2.0'
        osVersion: '27.2'
        term: item
    properties:
      author:
        access: r
        type: string
        description: The author of the book
hierarchy:
  children:
    books:
      resource: Book
      access: r
      description: Books
commands:
  getBook:
    name: get
    description: Get a book
    scope: resource
    resourceType: Book
    parameters:
      - name: id
        type: string
        description: The book to read
  listBooks:
    name: list
    description: List books
    scope: resource
    resourceType: Book
`)

const text = (): ValuePlan => ({ kind: 'string' })
const nullable = (value: ValuePlan): ValuePlan => ({ kind: 'nullable', value })

/** A book record's plan: its own field, then those it inherits. */
const BOOK_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    author: { presence: 'required', value: nullable(text()) },
    id: { presence: 'required', value: text() },
    uRL: { presence: 'required', value: nullable(text()) },
    pOSIXPath: { presence: 'required', value: nullable(text()) },
  },
}

const RESOURCE_PLANS: ResourcePlanTable = { Book: { id: text() }, Item: { id: text() } }

describe('the native bodies of an inheriting resource', () => {
  it('get reads each inherited property by the app spelling into its public key', () => {
    const body = buildNativeBody(manifest, { command: 'getBook', resource: 'Book' })
    expect(body).toContain('var item = app["books"].byId(itemId);')
    expect(body).toContain(
      'if (props["posixPath"] !== undefined) { obj["pOSIXPath"] = props["posixPath"]; }'
    )
    expect(body).toContain('try { obj["pOSIXPath"] = item["posixPath"](); } catch (e) {}')
    expect(body).toContain('if (props["url"] !== undefined) { obj["uRL"] = props["url"]; }')
    expect(body).toContain(
      'if (props["author"] !== undefined) { obj["author"] = props["author"]; }'
    )
    expect(body).not.toContain('props["pOSIXPath"]')
    expect(body).not.toContain('props["uRL"]')
  })

  it('list reads each inherited property across the collection by the app spelling', () => {
    const body = buildNativeBody(manifest, { command: 'listBooks', resource: 'Book' })
    expect(body).toContain('var col = app["books"];')
    expect(body).toContain('readColumn("the property \\"uRL\\"", "url");')
    expect(body).toContain('readColumn("the property \\"pOSIXPath\\"", "posixPath");')
    expect(body).toContain('readColumn("the property \\"author\\"", "author");')
    expect(body).not.toContain('"pOSIXPath");')
  })
})

describe('the native executor against a stand-in Catalog', () => {
  /** A book that reports its properties under the app's spellings. */
  const book = (id: string) => {
    const record = { id, url: `file:///b/${id}`, posixPath: `/b/${id}`, author: 'Ann' }
    return {
      exists: (): boolean => true,
      properties: () => ({ ...record }),
    }
  }
  const books = Object.assign(() => [book('b1'), book('b2')], {
    byId: (id: unknown) => (id === 'b1' ? book('b1') : { exists: (): boolean => false }),
    id: () => ['b1', 'b2'],
    url: () => ['file:///b/b1', 'file:///b/b2'],
    posixPath: () => ['/b/b1', '/b/b2'],
    author: () => ['Ann', 'Ann'],
  })
  const app = { includeStandardAdditions: false, books }
  const executor = createNativeExecutor({ transport: standInTransport(app) })

  it('gets a book with its inherited fields under their public keys', async () => {
    await expect(
      executor.execute({
        manifest,
        target: { command: 'getBook', resource: 'Book' },
        input: { id: 'b1' },
        inputPlan: { kind: 'record', fields: { id: { presence: 'required', value: text() } } },
        outputPlan: BOOK_PLAN,
        resourcePlans: RESOURCE_PLANS,
      })
    ).resolves.toEqual({ author: 'Ann', id: 'b1', uRL: 'file:///b/b1', pOSIXPath: '/b/b1' })
  })

  it('lists books with their inherited fields under their public keys', async () => {
    await expect(
      executor.execute({
        manifest,
        target: { command: 'listBooks', resource: 'Book' },
        input: {},
        inputPlan: { kind: 'record', fields: {} },
        outputPlan: { kind: 'array', items: BOOK_PLAN },
        resourcePlans: RESOURCE_PLANS,
      })
    ).resolves.toEqual([
      { author: 'Ann', id: 'b1', uRL: 'file:///b/b1', pOSIXPath: '/b/b1' },
      { author: 'Ann', id: 'b2', uRL: 'file:///b/b2', pOSIXPath: '/b/b2' },
    ])
  })
})

describe('the generated contract of an inheriting resource', () => {
  const generated = generateContract(manifest)
  const contract = generated.files.find((file) => file.path === CONTRACT_MODULE_PATH)?.content

  it('generates without errors', () => {
    expect(generated.errors).toEqual([])
  })

  it('declares the inherited fields on the record, under their public keys', () => {
    const record = /export interface Book \{[\s\S]*?\n\}/.exec(contract ?? '')?.[0] ?? ''
    expect(record).toContain('  readonly author: string | null')
    expect(record).toContain('  readonly id: string')
    expect(record).toContain('  readonly uRL: string | null')
    expect(record).toContain('  readonly pOSIXPath: string | null')
    expect(record).not.toMatch(/readonly (url|posixPath):/)
  })

  it('gets a book by its inherited identifier', () => {
    expect(contract).toContain('  get(id: string, options?: CallOptions): Promise<Book>')
  })
})
