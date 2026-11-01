/**
 * Consumer program for the real Notes app package: builds a remote client from
 * the contract the package ships at `@macts/notes/contract`, calls
 * `notes.attachments.get` against the stub service (which answers with a
 * `TARGET_NOT_FOUND` envelope), and prints a JSON report of the error it saw.
 */

import * as sdk from '@macts/sdk'
import * as local from '@macts/sdk/local'
import { notesContract } from '@macts/notes/contract'
import { startStubService } from './stub-service.mjs'

const service = await startStubService()
try {
  const notes = sdk.createClient(notesContract, {
    token: 'macts_sk_packed-install-token',
    url: service.url,
  })

  let thrown
  try {
    await notes.attachments.get('x-coredata://macts-missing')
  } catch (error) {
    thrown = error
  }

  const report = {
    app: notesContract.app,
    error: {
      name: thrown?.name,
      code: thrown?.code,
      message: thrown?.message,
      details: thrown?.details,
    },
    instanceOf: {
      sdkTargetNotFound: thrown instanceof sdk.TargetNotFoundError,
      localTargetNotFound: thrown instanceof local.TargetNotFoundError,
      sdkMactsError: thrown instanceof sdk.MactsError,
      localMactsError: thrown instanceof local.MactsError,
    },
  }
  process.stdout.write(JSON.stringify(report))
} finally {
  await service.close()
}
