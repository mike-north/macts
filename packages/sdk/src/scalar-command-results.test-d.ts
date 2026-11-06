/** Scalar declarations retain nullable result types through generated and factory clients. */
import { expectType } from 'tsd'
import { Integer, type ObjectReferenceData } from '@macts/contracts'
import { ContactsClient } from '@macts/contacts'
import { MailClient } from '@macts/mail'
import { contactsContract } from '@macts/contacts/contract'
import { mailContract } from '@macts/mail/contract'
import { createClient as localClient } from './local-client.js'
import { createClient as remoteClient } from './remote.js'

const mail = new MailClient({ apiKey: 'type-only' })
const contacts = new ContactsClient({ apiKey: 'type-only' })
const person: ObjectReferenceData<string, 'Person'> = {
  app: 'contacts',
  resource: 'Person',
  form: 'identity',
  cardinality: 'one',
  id: 'type-only',
}
expectType<Promise<boolean | null>>(mail.outgoingMessages.send(7))
expectType<Promise<string | null>>(contacts.actionProperty())
expectType<Promise<string | null>>(contacts.actionTitle('email', person))
expectType<Promise<boolean | null>>(contacts.performAction('email', person))
expectType<Promise<boolean | null>>(contacts.shouldEnableAction('email', person))
expectType<Promise<void>>(contacts.save())
const local = localClient(mailContract, { token: 'type-only' })
expectType<Promise<boolean | null>>(local.outgoingMessages.send(Integer.validate(7)))
const remote = remoteClient(contactsContract, { token: 'type-only', url: 'http://types.test' })
expectType<Promise<string | null>>(remote.actionProperty())
