/**
 * Type-level brand check, compiled against the installed packages: an
 * `Integer` from `@macts/sdk` is accepted where `@macts/sdk/local`'s `Integer`
 * is required, a plain number is not, and an error class from one entry point
 * is the same type as the other's. Shared and SDK client composition must
 * also preserve canonical contract, generated-client, and reference brands.
 */

import type { Integer as RemoteInteger, TargetNotFoundError as RemoteNotFound } from '@macts/sdk'
import type {
  Integer as LocalInteger,
  TargetNotFoundError as LocalNotFound,
} from '@macts/sdk/local'

import type { AppContract, IdentityReference } from '@macts/contracts'
import { createRemoteClient, bindReference as sharedBind } from '@macts/contracts/client'
import { createClient, bindReference as sdkBind } from '@macts/sdk'
import { bindReference as localBind } from '@macts/sdk/local'
import {
  notesContract,
  type Note,
  type NotesClient,
  type NotesResources,
} from '@macts/notes/contract'

declare const fromRemote: RemoteInteger
declare const remoteError: RemoteNotFound

function acceptsLocalInteger(value: LocalInteger): number {
  return value
}
function acceptsLocalError(error: LocalNotFound): string {
  return error.code
}

acceptsLocalInteger(fromRemote)
acceptsLocalError(remoteError)
// @ts-expect-error a plain number is not an Integer
acceptsLocalInteger(7)

// The shared client declarations must refer to the canonical root's nominal
// domains, including clients whose explicit generated interface retains a brand.

const canonicalContract: AppContract<NotesClient, NotesResources> = notesContract
const options = { token: 'macts_sk_type_fixture', url: 'https://service.example' }
const sharedClient = createRemoteClient(canonicalContract, options)
const sdkClient = createClient(canonicalContract, options)
const annotatedShared: NotesClient = sharedClient
const annotatedSdk: NotesClient = sdkClient
const noteData = {
  app: 'notes',
  resource: 'Note',
  form: 'identity',
  cardinality: 'one',
  id: 'Groceries',
} as const

const sharedReference: IdentityReference<Note, string, 'Note'> = sharedBind(annotatedSdk, noteData)
const sdkReference: IdentityReference<Note, string, 'Note'> = sdkBind(annotatedShared, noteData)
const rebound: IdentityReference<Note, string, 'Note'> = localBind(annotatedSdk, sharedReference)
const fromShared: Promise<Note> = sharedBind(sharedClient, sdkReference).resolve()
const fromSdk: Promise<Note> = sdkBind(sdkClient, rebound).resolve()
void fromShared
void fromSdk

// The generated interface must preserve its resource table, not widen binding.
// @ts-expect-error Notebook is not a resource of the Notes contract.
sharedBind(annotatedSdk, { ...noteData, resource: 'Notebook' })
// @ts-expect-error A single note reference does not resolve to a collection.
const incorrectCardinality: Promise<readonly Note[]> = sdkReference.resolve()
void incorrectCardinality
