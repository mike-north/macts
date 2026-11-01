/**
 * The widgets app contract, written by hand the way a generated app package
 * exposes one: operation descriptors with value types, a lazy manifest
 * loader, and a `bind` that maps positional methods onto the client runtime.
 *
 * - `widgets.widgets.get`  — permission `widgets:widgets:get`, input `{ id }`,
 *   result one widget `{ name, count }` where `count` is an integer
 * - `widgets.widgets.list` — permission `widgets:widgets:list`, input `{}`,
 *   result a list of widgets
 *
 * An integer travels as `{ "integer": "<decimal>" }` and decodes to a number
 * inside `INTEGER_LIMITS` from `@macts/contracts`.
 */

import { z } from 'zod'
import { INTEGER_LIMITS } from '@macts/contracts'

const INTEGER_TEXT = /^(0|-?[1-9][0-9]*)$/
const integerWire = z.strictObject({ integer: z.string().regex(INTEGER_TEXT) })
const widgetWire = z.strictObject({ name: z.string(), count: integerWire })
const widgetSdk = z.strictObject({ name: z.string(), count: z.number().int() })
const getInput = z.strictObject({ id: z.string().min(1) })
const emptyInput = z.strictObject({})

const WIDGET_PLAN = {
  kind: 'record',
  fields: {
    name: { value: { kind: 'string' }, presence: 'required' },
    count: { value: { kind: 'integer' }, presence: 'required' },
  },
}

function issuesOf(error, prefix = []) {
  return error.issues.map((issue) => ({
    path: [
      ...prefix,
      ...issue.path.map((segment) => (typeof segment === 'symbol' ? String(segment) : segment)),
    ],
    message: issue.message,
    code: issue.code,
  }))
}

function decodeWidget(wire, path) {
  const parsed = widgetWire.safeParse(wire)
  if (!parsed.success) return { ok: false, issues: issuesOf(parsed.error, path) }
  const count = Number(parsed.data.count.integer)
  if (!Number.isSafeInteger(count) || count < INTEGER_LIMITS.min || count > INTEGER_LIMITS.max) {
    return {
      ok: false,
      issues: [{ path: [...path, 'count'], message: 'Integer is outside the supported domain' }],
    }
  }
  return { ok: true, value: { name: parsed.data.name, count } }
}

function recordInput(schema, plan) {
  return {
    plan,
    sdk: schema,
    wire: schema,
    encode(value) {
      const parsed = schema.safeParse(value)
      return parsed.success
        ? { ok: true, value: parsed.data }
        : { ok: false, issues: issuesOf(parsed.error) }
    },
    decode(wire) {
      const parsed = schema.safeParse(wire)
      return parsed.success
        ? { ok: true, value: parsed.data }
        : { ok: false, issues: issuesOf(parsed.error) }
    },
  }
}

const WIDGET = {
  plan: WIDGET_PLAN,
  sdk: widgetSdk,
  wire: widgetWire,
  encode(value) {
    const parsed = widgetSdk.safeParse(value)
    if (!parsed.success) return { ok: false, issues: issuesOf(parsed.error) }
    return {
      ok: true,
      value: { name: parsed.data.name, count: { integer: String(parsed.data.count) } },
    }
  },
  decode: (wire) => decodeWidget(wire, []),
}

const WIDGET_LIST = {
  plan: { kind: 'array', items: WIDGET_PLAN },
  sdk: z.array(widgetSdk),
  wire: z.array(widgetWire),
  encode: () => ({
    ok: false,
    issues: [{ path: [], message: 'Widget lists are only ever results' }],
  }),
  decode(wire) {
    if (!Array.isArray(wire))
      return { ok: false, issues: [{ path: [], message: 'Expected a list' }] }
    const widgets = []
    for (const [index, element] of wire.entries()) {
      const widget = decodeWidget(element, [index])
      if (!widget.ok) return widget
      widgets.push(widget.value)
    }
    return { ok: true, value: widgets }
  },
}

const GET = {
  id: 'widgets.widgets.get',
  permission: 'widgets:widgets:get',
  target: { command: 'get', resource: 'Widget' },
  description: 'Get one widget',
  input: recordInput(getInput, {
    kind: 'record',
    fields: { id: { value: { kind: 'string' }, presence: 'required' } },
  }),
  output: WIDGET,
}

const LIST = {
  id: 'widgets.widgets.list',
  permission: 'widgets:widgets:list',
  target: { command: 'list', resource: 'Widget' },
  description: 'List widgets',
  input: recordInput(emptyInput, { kind: 'record', fields: {} }),
  output: WIDGET_LIST,
}

/** The widgets app contract. */
export const widgetsContract = {
  app: 'widgets',
  operations: { [GET.id]: GET, [LIST.id]: LIST },
  resources: { Widget: { name: 'Widget', record: WIDGET, get: GET.id, list: LIST.id } },
  loadManifest: () => import('./manifest.js').then((module) => module.manifest),
  bind(runtime) {
    return {
      widgets: {
        get: (id, options) => runtime.invoke(GET, { id }, options),
        list: (options) => runtime.invoke(LIST, {}, options),
      },
    }
  },
}
