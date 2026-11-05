/** Real generated constructor behavior in an app-only packed installation. */
import { SystemEventsClient, SystemEventsError } from '@macts/system-events'
import { TargetNotFoundError, ValidationError } from '@macts/contracts'
import { bindReference } from '@macts/contracts/client'

const requests = []
globalThis.fetch = async (url, init) => {
  requests.push({ url: String(url), body: JSON.parse(init.body) })
  if (String(url).endsWith('editActionOf')) return Response.json({ result: null })
  return Response.json(
    { error: { code: 'TARGET_NOT_FOUND', message: 'Missing', details: { resource: 'DiskItem' } } },
    { status: 404 }
  )
}
const facade = new SystemEventsClient({ apiKey: 'packed-test', baseUrl: 'http://macts.test' })
await facade.editActionOf(undefined, 7)
const input = requests[0].body
let canonicalError = false
try {
  await facade.beginTransaction()
} catch (error) {
  canonicalError = error instanceof TargetNotFoundError
}
let rawError = false
try {
  await facade.http.rpc('system-events.app.beginTransaction')
} catch (error) {
  rawError = error instanceof SystemEventsError
}
let boundFacade = false
// This base contract has no get/list resources yet. Registry admission is
// observable as canonical reference validation rather than an unregistered-client TypeError.
try {
  bindReference(facade, {
    app: 'system-events',
    resource: 'DiskItem',
    form: 'identity',
    cardinality: 'one',
    id: 'missing',
  })
} catch (error) {
  boundFacade = error instanceof ValidationError
}
const count = requests.length
let validationBeforeDispatch = false
try {
  await facade.editActionOf(undefined, 1.5)
} catch (error) {
  validationBeforeDispatch = error instanceof ValidationError && requests.length === count
}
process.stdout.write(
  JSON.stringify({ input, canonicalError, rawError, boundFacade, validationBeforeDispatch })
)
