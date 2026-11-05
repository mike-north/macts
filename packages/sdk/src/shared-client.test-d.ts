/** Shared composition preserves the canonical client and reference types across package imports. */
import { expectType } from 'tsd'
import { createRemoteClient, bindReference } from '@macts/contracts/client'
import { createClient, bindReference as sdkBind } from './index.js'
import { libraryContract, type Shelf } from './library-fixture.js'

const shared = createRemoteClient(libraryContract, {
  token: 'test',
  url: 'https://service.example',
})
const sdk = createClient(libraryContract, { token: 'test', url: 'https://service.example' })
expectType<typeof sdk>(shared)
expectType<typeof shared>(sdk)
const reference = {
  app: 'library',
  resource: 'Shelf',
  form: 'identity',
  cardinality: 'one',
  id: 'SF-1',
} as const
expectType<Promise<Shelf>>(sdkBind(shared, reference).resolve())
expectType<Promise<Shelf>>(bindReference(sdk, reference).resolve())
