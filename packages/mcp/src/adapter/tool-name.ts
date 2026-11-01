/**
 * MCP tool names for macts operations.
 *
 * Every operation an adapter serves is exposed as exactly one MCP tool, and
 * that tool's name is a pure function of the operation id: there is no
 * per-tool override and no registry of exceptions. Agents, policies, and
 * documentation can therefore predict a tool's name from the operation alone,
 * and two adapters serving the same operation always agree on it.
 *
 * @packageDocumentation
 */

import type { OperationId } from '@macts/contracts'
import { McpToolDerivationError } from './errors.js'

/** Prefix shared by every macts tool, so agents can tell macts tools apart from others. */
const TOOL_NAME_PREFIX = 'macts'

/** Separator between the prefix, the app, and the resource-plus-operation part. */
const SEGMENT_SEPARATOR = '__'

/** An acronym run followed by a capitalized word, as in `APIExpression`. */
const ACRONYM_BOUNDARY = /([A-Z]+)([A-Z][a-z])/g

/** A lowercase letter or digit followed by an uppercase letter, as in `getURL`. */
const WORD_BOUNDARY = /([a-z0-9])([A-Z])/g

/**
 * The snake-case form of an operation segment, with acronyms kept whole:
 * `getURL` becomes `get_url`, and `invokeAPIExpression` becomes
 * `invoke_api_expression`.
 */
function snakeCaseOperation(operation: string): string {
  return operation.replace(ACRONYM_BOUNDARY, '$1_$2').replace(WORD_BOUNDARY, '$1_$2').toLowerCase()
}

/**
 * The MCP tool name of an operation.
 *
 * @remarks
 * The name is `macts__<app>__<resource>_<operation>`. The app and resource
 * segments of the id are kept exactly as they are (an app may contain `-`, and
 * a resource may be camelCase); only the operation segment is converted to
 * snake case, with runs of capitals treated as one word. For example,
 * `calendar.app.reloadCalendars` is `macts__calendar__app_reload_calendars`,
 * and `mail.app.getURL` is `macts__mail__app_get_url`.
 *
 * The derivation is deliberately free of overrides. Two operations whose ids
 * derive the same name cannot both be served; the adapter refuses that
 * combination when it is built rather than renaming either.
 *
 * @param id - An operation id of the form `app.resource.operation`.
 * @returns The tool name the operation is served under.
 * @throws {@link McpToolDerivationError} when the id does not have exactly
 *   three non-empty segments.
 */
export function toolNameFor(id: OperationId): string {
  const segments = id.split('.')
  const [app, resource, operation] = segments
  if (
    segments.length !== 3 ||
    app === undefined ||
    resource === undefined ||
    operation === undefined ||
    app.length === 0 ||
    resource.length === 0 ||
    operation.length === 0
  ) {
    throw new McpToolDerivationError(
      `Operation "${id}" has no MCP tool name: expected an id of the form app.resource.operation`
    )
  }
  return [TOOL_NAME_PREFIX, app, `${resource}_${snakeCaseOperation(operation)}`].join(
    SEGMENT_SEPARATOR
  )
}
