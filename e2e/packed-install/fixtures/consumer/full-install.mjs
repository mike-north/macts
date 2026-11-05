/**
 * Consumer program for the full install: imports the SDK through both entry
 * points and the fixture app's contract, runs the remote client against the
 * stub service, and prints a JSON report of what it observed.
 */

import * as sdk from '@macts/sdk'
import * as local from '@macts/sdk/local'
import * as contracts from '@macts/contracts'
import * as shared from '@macts/contracts/client'
import { widgetsContract } from '@macts-fixture/widgets/contract'
import { startStubService } from './stub-service.mjs'

const TOKEN = 'macts_sk_packed-install-token'
const service = await startStubService()
try {
  const widgets = sdk.createClient(widgetsContract, { token: TOKEN, url: service.url })

  const listed = await widgets.widgets.list()

  let thrown
  try {
    await widgets.widgets.get('w-404')
  } catch (error) {
    thrown = error
  }

  // A function written against the local entry's export accepts the integer
  // the remote client produced: the integer domain is one shared declaration.
  const acceptsLocalInteger = (value) =>
    Number.isSafeInteger(value) &&
    value >= local.INTEGER_LIMITS.min &&
    value <= local.INTEGER_LIMITS.max

  const report = {
    listed,
    integerAcceptedByLocal: acceptsLocalInteger(listed.items[0]?.count),
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
    sameBindings: {
      errorClass: sdk.TargetNotFoundError === local.TargetNotFoundError,
      errorClassFromContracts: sdk.TargetNotFoundError === contracts.TargetNotFoundError,
      integerLimits: sdk.INTEGER_LIMITS === local.INTEGER_LIMITS,
      sharedFactory: sdk.createClient === shared.createRemoteClient,
      sharedBinder:
        sdk.bindReference === shared.bindReference && local.bindReference === shared.bindReference,
    },
    localFactory: typeof local.createClient,
    authorizations: service.authorizations,
  }
  process.stdout.write(JSON.stringify(report))
} finally {
  await service.close()
}
