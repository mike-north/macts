/**
 * Consumer program for a remote-only install (no Mac-side runtime or core
 * installed): the remote entry must load and work, and the local entry must
 * fail to load. Prints a JSON report.
 */

import { startStubService } from './stub-service.mjs'

const report = {}
const service = await startStubService()
try {
  const sdk = await import('@macts/sdk')
  const { widgetsContract } = await import('@macts-fixture/widgets/contract')
  const widgets = sdk.createClient(widgetsContract, {
    token: 'macts_sk_remote-only',
    url: service.url,
  })
  report.listed = await widgets.widgets.list()
  try {
    await widgets.widgets.get('w-404')
  } catch (error) {
    report.errorIsTargetNotFound = error instanceof sdk.TargetNotFoundError
  }
} finally {
  await service.close()
}

try {
  await import('@macts/sdk/local')
  report.local = { loaded: true }
} catch (error) {
  report.local = { loaded: false, code: error?.code, message: String(error?.message ?? error) }
}
process.stdout.write(JSON.stringify(report))
