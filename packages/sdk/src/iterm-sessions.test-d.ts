/** Session records preserve Window-scoped identity; Tab positions remain explicit inputs. */
import { expectNotAssignable, expectType } from 'tsd'
import { Integer, type ResolvableReferenceData } from '@macts/contracts'
import { iTermContract, type iTermClient, type Session } from '@macts/iterm/contract'
import { bindReference } from './local.js'

declare const client: iTermClient
expectType<Promise<Session>>(client.sessions.get(Integer.validate(7), Integer.validate(0), 'a'))
expectNotAssignable<Parameters<iTermClient['sessions']['get']>[0]>(7)
expectNotAssignable<keyof Session>('contents')
expectNotAssignable<keyof Session>('text')
const window = {
  app: 'iterm',
  resource: 'Window',
  form: 'identity',
  cardinality: 'one',
  id: Integer.validate(7),
} as const
expectType<Promise<Session>>(
  bindReference(client, {
    app: 'iterm',
    resource: 'Session',
    form: 'identity',
    cardinality: 'one',
    id: 'a',
    container: window,
  }).resolve()
)
expectNotAssignable<ResolvableReferenceData<typeof iTermContract.resources>>({
  app: 'iterm',
  resource: 'Session',
  form: 'identity',
  cardinality: 'one',
  id: 'a',
} as const)

expectNotAssignable<ResolvableReferenceData<typeof iTermContract.resources>>({
  app: 'iterm',
  resource: 'Session',
  form: 'identity',
  cardinality: 'one',
  id: 'a',
  container: {
    app: 'iterm',
    resource: 'Tab',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'index', index: Integer.validate(0) },
    container: window,
  },
} as const)
expectType<Promise<Session>>(client.sessions.resolve(Integer.validate(7), 'a'))
expectType<'iterm.sessions.resolve'>(iTermContract.resources.Session.get)
