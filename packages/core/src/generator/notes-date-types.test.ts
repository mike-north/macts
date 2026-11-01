/**
 * Regression test: the shipped Notes manifest types the creation and modification dates of
 * notes and attachments as dates, so the generated contract decodes them as `Date`.
 *
 * The Notes scripting dictionary declares `creation date` (code `ascd`) and
 * `modification date` (code `asmo`) on both `note` and `attachment` as `type="date"`.
 * A read-only check on Notes 4.13 (macOS 27.2) returned a date for both properties on
 * 30 of 30 sampled notes and 25 of 25 attachments. The manifest used to declare them as
 * `string`, so listing attachments against the real app failed decode with
 * "Expected a string, received a date" at `creationDate`.
 *
 * @see `sdef /System/Applications/Notes.app` — classes `note` and `attachment`
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { resolve } from 'node:path'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/index.js'
import { generateContract } from './contract/index.js'

const NOTES_MANIFEST = resolve(process.cwd(), '../../manifests/notes/app.yaml')
const DATE_PROPERTIES = ['creationDate', 'modificationDate'] as const
const DATE_CODES: Record<(typeof DATE_PROPERTIES)[number], string> = {
  creationDate: 'ascd',
  modificationDate: 'asmo',
}

describe('Notes date properties (regression: declared as string)', () => {
  let notes: AppManifest
  let contract: string

  beforeAll(async () => {
    notes = await loadManifest(NOTES_MANIFEST)
    const file = generateContract(notes).files.find((f) => f.path === 'src/contract/index.ts')
    if (!file) throw new Error('the Notes contract module was not generated')
    contract = file.content
  })

  for (const resource of ['Note', 'Attachment'] as const) {
    for (const property of DATE_PROPERTIES) {
      it(`declares ${resource}.${property} as a date with the dictionary's code`, () => {
        const declared = notes.resources[resource]?.properties[property]
        expect(declared?.type).toBe('date')
        expect(declared?.code).toBe(DATE_CODES[property])
      })
    }
  }

  it('generates date fields, never string fields, for both resources', () => {
    for (const property of DATE_PROPERTIES) {
      // Note's dates carry probe evidence of never being empty; Attachment's keep the
      // nullable default. Either way the value type is a date.
      expect(contract).toMatch(new RegExp(`${property}: t\\.date\\(`))
      expect(contract).toMatch(new RegExp(`${property}: t\\.nullable\\(t\\.date\\(\\)`))
      expect(contract).not.toMatch(new RegExp(`${property}: (t\\.nullable\\()?t\\.string\\(`))
    }
  })
})
