/**
 * Regression tests for the native get of a TextEdit document, which its
 * shipped manifest identifies by `name`.
 *
 * A TextEdit document has no dictionary id, so the app's id specifier cannot
 * find one: the get looked a document up with `documents.byId(name)` and
 * found nothing. A name is matched with `byProperty` instead, as phases/13
 * D10 ("Identifier targeting") requires of any identifier that is not the
 * class's dictionary id, code `ID  `. The lookup is the first match of
 * `documents.whose({ name })` in the app's element order (D4, reference
 * conversion), and nothing claims the name unique, so when two open
 * documents share a name the get returns the first of them, and does not
 * fail as ambiguous.
 *
 * The executor cases run the real native executor on the real composed
 * script, in an isolated context, against a stand-in TextEdit whose
 * documents answer `whose` as the app does: the matches in element order,
 * with an index past them naming no object.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4, D10)
 * @see ../../../../manifests/textedit/app.yaml
 */

import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { TargetNotFoundError, type ValuePlan } from '@macts/contracts'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/index.js'
import { createNativeExecutor } from './native-executor.js'
import { buildNativeBody } from './native-scripts.js'
import { standInTransport } from './test-support/stand-in-app.js'

const TEXTEDIT_MANIFEST = fileURLToPath(
  new URL('../../../../manifests/textedit/app.yaml', import.meta.url)
)

let textedit: AppManifest
beforeAll(async () => {
  textedit = await loadManifest(TEXTEDIT_MANIFEST)
})

/** One open stand-in document: what each of its properties reads. */
interface StandInDocument {
  readonly name: string
  readonly path: string
  readonly modified: boolean
  readonly text: string
}

/** A specifier for an object that does not exist. */
const ABSENT = Object.freeze({ exists: () => false })

/**
 * A stand-in TextEdit holding `documents`, in the app's element order. Its
 * `documents.whose({ name })` gives the matching documents in that order,
 * and an index past the last match names no object, as the bridge's does.
 * Every lookup it serves is recorded in `lookups`. It has no `byId`: a
 * TextEdit document has no dictionary id to find it by.
 */
function standInTextEdit(documents: readonly StandInDocument[], lookups: string[]): object {
  const specifier = (document: StandInDocument) => ({
    exists: () => true,
    properties: () => ({ ...document }),
  })
  return {
    documents: Object.assign(() => documents.map(specifier), {
      whose(filter: Readonly<Record<string, unknown>>) {
        lookups.push(`documents.whose(${JSON.stringify(filter)})`)
        const matches = documents
          .filter((document) =>
            Object.entries(filter).every(([k, v]) => document[k as keyof StandInDocument] === v)
          )
          .map(specifier)
        return new Proxy(matches, {
          get: (target, key, receiver) =>
            typeof key === 'string' && /^\d+$/.test(key) && Number(key) >= target.length
              ? ABSENT
              : (Reflect.get(target, key, receiver) as unknown),
        })
      },
    }),
  }
}

/** A document record's plan, as the TextEdit contract declares it. */
const DOCUMENT_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    name: { presence: 'required', value: { kind: 'string' } },
    path: { presence: 'optional', value: { kind: 'string' } },
    modified: { presence: 'required', value: { kind: 'boolean' } },
    text: { presence: 'required', value: { kind: 'string' } },
  },
}

/** Get the document named `name` from a stand-in holding `documents`. */
async function getByName(
  documents: readonly StandInDocument[],
  name: string,
  lookups: string[] = []
): Promise<unknown> {
  const executor = createNativeExecutor({
    transport: standInTransport(standInTextEdit(documents, lookups)),
  })
  return executor.execute({
    manifest: textedit,
    target: { command: 'get', resource: 'Document' },
    input: { name },
    inputPlan: {
      kind: 'record',
      fields: { name: { presence: 'required', value: { kind: 'string' } } },
    },
    outputPlan: DOCUMENT_PLAN,
    resourcePlans: { Document: { id: { kind: 'string' } } },
  })
}

const NOTES: StandInDocument = {
  name: 'Notes.txt',
  path: '/Users/example/Notes.txt',
  modified: false,
  text: 'first',
}
const DRAFT: StandInDocument = {
  name: 'Draft.txt',
  path: '/Users/example/Draft.txt',
  modified: true,
  text: 'draft',
}
/** A second open document with the same name as {@link NOTES}, in another folder. */
const OTHER_NOTES: StandInDocument = {
  name: 'Notes.txt',
  path: '/Users/example/Archive/Notes.txt',
  modified: true,
  text: 'second',
}

describe('the native get of a TextEdit document', () => {
  // Regression: the body looked the document up with the app's id specifier,
  // `documents.byId(name)`, which finds no TextEdit document. It matches on
  // the document's name.
  it('matches the document on its name, never by id', () => {
    const body = buildNativeBody(textedit, { command: 'get', resource: 'Document' })
    expect(body).toContain('var item = app["documents"].whose({ "name": itemId })[0];')
    expect(body).not.toContain('byId')
  })

  // Regression: run against an app with no id specifier for documents, the
  // get finds the document by its name and reads its record.
  it('reads the document whose name is given', async () => {
    const lookups: string[] = []
    expect(await getByName([NOTES, DRAFT], 'Draft.txt', lookups)).toEqual(DRAFT)
    expect(lookups).toEqual(['documents.whose({"name":"Draft.txt"})'])
  })

  // Guards that a name no open document has is a missing target, as a get
  // of any item that does not exist is.
  it('fails as a missing target when no open document has the name', async () => {
    await expect(getByName([NOTES, DRAFT], 'Absent.txt')).rejects.toBeInstanceOf(
      TargetNotFoundError
    )
  })

  // States what a get does when two open documents share the name: nothing
  // claims a document's name unique, and the lookup takes the first match in
  // the app's element order, so the get returns the first document of that
  // name and does not fail as ambiguous.
  it('returns the first of two documents that share the name', async () => {
    expect(await getByName([DRAFT, NOTES, OTHER_NOTES], 'Notes.txt')).toEqual(NOTES)
    expect(await getByName([DRAFT, OTHER_NOTES, NOTES], 'Notes.txt')).toEqual(OTHER_NOTES)
  })
})
