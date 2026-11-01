/**
 * Exact comparison of SDK and wire values for codec vectors.
 *
 * General-purpose deep equality is too forgiving for codec acceptance: it may
 * equate `-0` with `0`, ignore whether a property is an own property, or treat
 * an own property holding `undefined` as absent. This comparison is exact in
 * the ways the value contracts require:
 *
 * - numbers compare with `Object.is`, so `-0` differs from `0` and `NaN`
 *   equals `NaN`;
 * - dates compare by time value, also with `Object.is`;
 * - objects must have exactly the same own enumerable keys (checked with
 *   `Object.hasOwn`), so absence and an own `undefined` are different;
 * - arrays must have the same length and elements.
 *
 * @packageDocumentation
 */

/**
 * List every way `actual` differs from `expected`, each prefixed with its
 * location (for example `sessions[0].note: missing own property`). An empty
 * list means the values are the same.
 */
export function sameValueMismatches(actual: unknown, expected: unknown): string[] {
  const mismatches: string[] = []
  compare(actual, expected, '$', mismatches)
  return mismatches
}

function compare(actual: unknown, expected: unknown, at: string, out: string[]): void {
  if (expected instanceof Date) {
    if (!(actual instanceof Date)) {
      out.push(`${at}: expected a Date, received ${render(actual)}`)
    } else if (!Object.is(actual.getTime(), expected.getTime())) {
      out.push(
        `${at}: expected time ${String(expected.getTime())}, received ${String(actual.getTime())}`
      )
    }
    return
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      out.push(`${at}: expected an array, received ${render(actual)}`)
      return
    }
    const actualItems: readonly unknown[] = actual
    const expectedItems: readonly unknown[] = expected
    if (actualItems.length !== expectedItems.length) {
      out.push(
        `${at}: expected length ${String(expectedItems.length)}, received ${String(actualItems.length)}`
      )
      return
    }
    expectedItems.forEach((item, index) => {
      compare(actualItems[index], item, `${at}[${String(index)}]`, out)
    })
    return
  }
  if (typeof expected === 'object' && expected !== null) {
    if (
      typeof actual !== 'object' ||
      actual === null ||
      Array.isArray(actual) ||
      actual instanceof Date
    ) {
      out.push(`${at}: expected an object, received ${render(actual)}`)
      return
    }
    for (const key of Object.keys(expected)) {
      if (!Object.hasOwn(actual, key)) {
        out.push(`${at}.${key}: missing own property`)
        continue
      }
      compare(Reflect.get(actual, key), Reflect.get(expected, key), `${at}.${key}`, out)
    }
    for (const key of Object.keys(actual)) {
      if (!Object.hasOwn(expected, key)) {
        out.push(
          `${at}.${key}: unexpected own property holding ${render(Reflect.get(actual, key))}`
        )
      }
    }
    return
  }
  if (!Object.is(actual, expected)) {
    out.push(`${at}: expected ${render(expected)}, received ${render(actual)}`)
  }
}

function render(value: unknown): string {
  switch (typeof value) {
    case 'number':
      return Object.is(value, -0) ? '-0' : String(value)
    case 'string':
      return JSON.stringify(value)
    case 'boolean':
      return String(value)
    case 'bigint':
      return `${value.toString()}n`
    case 'undefined':
      return 'undefined'
    case 'symbol':
      return 'a symbol'
    case 'function':
      return 'a function'
    case 'object':
      if (value === null) return 'null'
      if (value instanceof Date) return `Date(${String(value.getTime())})`
      return Array.isArray(value) ? 'an array' : 'an object'
  }
}
