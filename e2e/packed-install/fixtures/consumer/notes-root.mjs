/** Packed root facades participate in the SDK's one binding/error identity domain. */
import { NotesClient } from '@macts/notes'
import * as sdk from '@macts/sdk'
import * as local from '@macts/sdk/local'
import { bindReference } from '@macts/contracts/client'

const notes = new NotesClient({ apiKey: 'packed-test', baseUrl: 'http://macts.test' })
globalThis.fetch = async (url) => {
  if (String(url).endsWith('/references/v1/resolve'))
    return Response.json({
      result: {
        name: 'Groceries',
        id: 'note-7',
        body: null,
        plaintext: null,
        creationDate: { date: '2026-11-05T12:34:56.123Z' },
        modificationDate: { date: '2026-11-05T12:34:56.123Z' },
        shared: false,
        passwordProtected: false,
      },
    })
  return Response.json(
    {
      error: { code: 'TARGET_NOT_FOUND', message: 'Missing', details: { resource: 'Attachment' } },
    },
    { status: 404 }
  )
}
const reference = sdk.bindReference(notes, {
  app: 'notes',
  resource: 'Note',
  form: 'identity',
  cardinality: 'one',
  id: 'Groceries',
})
const record = await local.bindReference(notes, reference).resolve()
let sdkError = false,
  localError = false
try {
  await notes.attachments.get('missing')
} catch (error) {
  sdkError = error instanceof sdk.TargetNotFoundError
  localError = error instanceof local.TargetNotFoundError
}
process.stdout.write(
  JSON.stringify({
    sameBinder: sdk.bindReference === bindReference && local.bindReference === bindReference,
    hydrated:
      record.name === 'Groceries' && record.creationDate instanceof Date && record.body === null,
    sdkError,
    localError,
  })
)
