/** Generated reads keep application identity, positional containment and lazy hydration in their consumer types. */
import { expectNotAssignable, expectType } from 'tsd'
import type {
  Point,
  Rectangle,
  Integer,
  ObjectReferenceVariant,
  IndexSelectorReference,
} from '@macts/contracts'
import type { iTermClient, Window, Tab } from '@macts/iterm/contract'

declare const client: iTermClient
expectType<Promise<ObjectReferenceVariant<Window, Integer, 'Window'> | null>>(
  client.currentWindow()
)
expectNotAssignable<Parameters<iTermClient['currentWindow']>[0]>(1)
expectNotAssignable<Parameters<iTermClient['tabs']['get']>[0]>(1)
declare const window: Window
expectType<IndexSelectorReference<Tab, 'Tab'> | null>(window.currentTab)
if (window.currentTab !== null) expectType<Promise<Tab>>(window.currentTab.resolve())

expectType<Rectangle | null>(window.bounds)
expectType<Point | null | undefined>(window.position)
expectType<Point | null | undefined>(window.origin)
expectType<Point | null | undefined>(window.size)
expectType<Rectangle | null | undefined>(window.frame)
