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
// The app-only facade binds references to the same contract-backed client used
// by its generated methods, so resolution retains canonical errors.
const reference = bindReference(facade, {
  app: 'system-events',
  resource: 'DiskItem',
  form: 'identity',
  cardinality: 'one',
  id: 'missing',
})
const boundFacade = reference.app === 'system-events' && reference.resource === 'DiskItem'
let boundReferenceCanonicalError = false
try {
  await reference.resolve()
} catch (error) {
  boundReferenceCanonicalError = error instanceof TargetNotFoundError
}
const count = requests.length
let validationBeforeDispatch = false
try {
  await facade.editActionOf(undefined, 1.5)
} catch (error) {
  validationBeforeDispatch = error instanceof ValidationError && requests.length === count
}
process.stdout.write(
  JSON.stringify({
    input,
    canonicalError,
    rawError,
    boundFacade,
    boundReferenceCanonicalError,
    validationBeforeDispatch,
  })
)
