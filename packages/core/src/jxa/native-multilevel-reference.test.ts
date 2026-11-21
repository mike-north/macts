/** Identified output containers retain the full validated ancestry of the read. */
import { expect, it } from 'vitest'
import { createNativeCodecFunctions } from './native-codec-functions.js'
import { NATIVE_CONTAINED_REFERENCE_KEY, type NativeCodecEnvironment } from './native-codec.js'

it('emits a three-level identity chain with each ancestor encoded by its own identifier plan', () => {
  const page = { id: () => 'page', exists: () => true }
  const book = { id: () => 'book', exists: () => true }
  const shelf = { id: () => 'shelf', exists: () => true, books: { byId: () => book } }
  const library = { id: () => 7, exists: () => true, shelves: { byId: () => shelf } }
  const env: NativeCodecEnvironment = {
    app: { libraries: { byId: () => library } },
    contexts: new WeakMap(),
    references: {
      Library: {
        id: { kind: 'integer' },
        addressing: { lookup: 'byId', collection: 'libraries', property: 'id' },
      },
      Shelf: {
        id: { kind: 'string' },
        addressing: { lookup: 'byId', collection: 'shelves', property: 'id', within: 'Library' },
      },
      Book: {
        id: { kind: 'string' },
        addressing: { lookup: 'byId', collection: 'books', property: 'id', within: 'Shelf' },
      },
      Page: {
        id: { kind: 'string' },
        addressing: { lookup: 'byId', collection: 'pages', property: 'id', within: 'Book' },
      },
    },
  }
  const codec = createNativeCodecFunctions()
  const ancestor = {
    resource: 'Library',
    form: 'identity',
    cardinality: 'one',
    id: { integer: '7' },
  }
  const container = {
    resource: 'Shelf',
    form: 'identity',
    cardinality: 'one',
    id: 'shelf',
    container: ancestor,
  }
  const reference = {
    resource: 'Book',
    form: 'identity',
    cardinality: 'one',
    id: 'book',
    container,
  }
  expect(
    codec.decode({ reference }, { kind: 'reference', resource: 'Book', cardinality: 'one' }, env)
  ).toBe(book)
  const native = { [Symbol.for(NATIVE_CONTAINED_REFERENCE_KEY)]: { value: page, container: book } }
  expect(
    codec.encode(native, { kind: 'reference', resource: 'Page', cardinality: 'one' }, env)
  ).toEqual({
    reference: {
      resource: 'Page',
      form: 'identity',
      cardinality: 'one',
      id: 'page',
      container: reference,
    },
  })
  const row = {
    [Symbol.for(NATIVE_CONTAINED_REFERENCE_KEY)]: {
      value: page,
      containerId: 'book',
      ancestors: [
        { resource: 'Library', item: library },
        { resource: 'Shelf', item: shelf },
      ],
    },
  }
  expect(
    codec.encode(row, { kind: 'reference', resource: 'Page', cardinality: 'one' }, env)
  ).toEqual({
    reference: {
      resource: 'Page',
      form: 'identity',
      cardinality: 'one',
      id: 'page',
      container: reference,
    },
  })
})
