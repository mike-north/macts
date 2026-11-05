/** Shared client composition must preserve SDK authority and canonical values across imports. */
import { describe, expect, it } from 'vitest'
import { bindReference, createCodecClient, createRemoteClient } from '@macts/contracts/client'
import { Integer, TargetNotFoundError } from '@macts/contracts'
import { bindReference as sdkBind, createClient } from './index.js'
import { bindReference as localBind } from './local.js'
import { DUNE_WIRE, SCIENCE_FICTION_WIRE, libraryContract } from './library-fixture.js'

describe('shared client composition', () => {
  it('keeps the factories and binder identical across package boundaries', () => {
    expect(createClient).toBe(createRemoteClient)
    expect(sdkBind).toBe(bindReference)
    expect(localBind).toBe(bindReference)
  })

  it('binds and hydrates through either import using the creating client authority', async () => {
    const client = createCodecClient(libraryContract, {
      invoke: () => Promise.resolve(DUNE_WIRE),
      resolve: () => Promise.resolve(SCIENCE_FICTION_WIRE),
    })
    const book = await client.books.get()
    expect(book.pages).toBe(Integer.validate(412))
    expect(await sdkBind(client, book.shelf).resolve()).toEqual({
      code: 'SF-1',
      label: 'Science Fiction',
    })
    expect(await localBind(client, book.shelf).resolve()).toEqual({
      code: 'SF-1',
      label: 'Science Fiction',
    })
  })

  it('reconstructs errors with the canonical constructor identity', async () => {
    const client = createRemoteClient(libraryContract, {
      token: 'test',
      url: 'https://service.example',
      fetch: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: 'TARGET_NOT_FOUND',
                message: 'Missing book.',
                details: { resource: 'Book' },
              },
            }),
            { status: 404 }
          )
        ),
    })
    await expect(client.books.get()).rejects.toBeInstanceOf(TargetNotFoundError)
  })
})
