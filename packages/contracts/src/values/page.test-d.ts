/**
 * Type tests for bounded list pages.
 *
 * A page's SDK type is `Page<T>`: readonly items and an optional
 * `nextCursor` that is a string when present and never `null` (with
 * `exactOptionalPropertyTypes`, never "present but `undefined`" either). The
 * page value type exposes its item type, and the paging inputs spread into a
 * record give that record an optional `pageSize: Integer` and
 * `cursor: string`.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D2 (SDK types versus wire types)
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import {
  ValueTypes as t,
  isPageValueType,
  type InferSdk,
  type Integer,
  type Page,
  type PageRequest,
  type PageValueType,
  type ValueType,
} from '../index.js'

const Item = t.record({ id: t.string(), count: t.integer() })
type ItemSdk = InferSdk<typeof Item>

// A page value type is a value type of Page<T> that exposes its item type.
const ItemPage = t.page(Item)
expectType<PageValueType<ItemSdk>>(ItemPage)
expectAssignable<ValueType<Page<ItemSdk>>>(ItemPage)
expectType<ValueType<ItemSdk>>(ItemPage.item)
expectType<Page<ItemSdk>>({} as InferSdk<typeof ItemPage>)

// nextCursor is an optional string: absent or text, never null or undefined.
expectAssignable<Page<string>>({ items: ['a'] })
expectAssignable<Page<string>>({ items: [], nextCursor: 'c' })
expectNotAssignable<Page<string>>({ items: [], nextCursor: null })
expectNotAssignable<Page<string>>({ items: [], nextCursor: undefined })
expectNotAssignable<Page<string>>({ nextCursor: 'c' })

// The items are readonly.
declare const page: Page<string>
expectType<readonly string[]>(page.items)

// The paging inputs spread into a record give optional Integer and string fields.
const _Input = t.record({ listId: t.string(), ...t.pageInputs() })
type InputSdk = InferSdk<typeof _Input>
expectAssignable<InputSdk>({ listId: 'L' })
expectAssignable<InputSdk>({ listId: 'L', pageSize: 25 as Integer, cursor: 'c' })
expectNotAssignable<InputSdk>({ listId: 'L', pageSize: 25 })
expectAssignable<PageRequest>({ pageSize: 25 as Integer })
expectNotAssignable<PageRequest>({ cursor: 3 })

// isPageValueType narrows an unknown value type to a page of unknown items.
declare const someType: ValueType<unknown>
if (isPageValueType(someType)) {
  expectType<ValueType<unknown>>(someType.item)
}
