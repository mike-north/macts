/** Scalar declarations retain nullable result types through generated and factory clients. */
import { expectType } from 'tsd'
import { Integer, type ObjectReferenceData } from '@macts/contracts'
import { ContactsClient } from '@macts/contacts'
import { MailClient } from '@macts/mail'
import { mailContract } from '@macts/mail/contract'
import { createClient as localClient } from './local-client.js'
import { createClient as remoteClient } from './remote.js'
import { rosterContract } from './test-support/roster-fixture.js'

const mail = new MailClient({ apiKey: 'type-only' })
const contacts = new ContactsClient({ apiKey: 'type-only' })
const person: ObjectReferenceData<string, 'Person'> = {
  app: 'roster',
  resource: 'Person',
  form: 'identity',
  cardinality: 'one',
  id: 'type-only',
}
expectType<Promise<boolean | null>>(mail.outgoingMessages.send(7))
expectType<Promise<void>>(contacts.save())
const roster = localClient(rosterContract, { token: 'type-only' })
expectType<Promise<string | null>>(roster.currentLabel())
expectType<Promise<string | null>>(roster.labelFor('email', person))
expectType<Promise<boolean | null>>(roster.confirm('email', person))
expectType<Promise<boolean | null>>(roster.isAllowed('email', person))
const local = localClient(mailContract, { token: 'type-only' })
expectType<Promise<boolean | null>>(local.outgoingMessages.send(Integer.validate(7)))
const remote = remoteClient(rosterContract, { token: 'type-only', url: 'http://types.test' })
expectType<Promise<string | null>>(remote.currentLabel())
