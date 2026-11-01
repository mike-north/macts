/**
 * The MCP tool results every served tool shares, and the operator-side
 * logging of failures that must not reach a client.
 *
 * Both the operation tools of the adapter and the host tools composed beside
 * them answer a failure they cannot describe canonically the same way: a
 * generic `INTERNAL` envelope for the client, and the original logged for the
 * operator. Keeping that in one place keeps the two from drifting.
 *
 * @packageDocumentation
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { InternalError, toWireErrorEnvelope } from '@macts/contracts'

/** The message every unexpected failure is reported with; never the original text. */
const INTERNAL_ERROR_MESSAGE = 'Internal server error'

/** A tool result carrying one JSON document as its only text content. */
export function textResult(document: unknown, isError: boolean): CallToolResult {
  const content: CallToolResult['content'] = [{ type: 'text', text: JSON.stringify(document) }]
  return isError ? { isError: true, content } : { content }
}

/** The generic failure result, carrying only the correlation id when there is one. */
export function internalErrorResult(correlationId: string | undefined): CallToolResult {
  const error = new InternalError(
    INTERNAL_ERROR_MESSAGE,
    correlationId === undefined ? {} : { correlationId }
  )
  return textResult(toWireErrorEnvelope(error), true)
}

/**
 * Fields that describe an unexpected failure in an operator log line.
 *
 * @remarks
 * Name, message, and stack only, the same fields the HTTP adapter logs. Other
 * own properties of an error (such as a child process's captured standard
 * error) are deliberately not logged.
 */
export function errorLogFields(error: unknown): Record<string, string | undefined> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  return { type: typeof error }
}

/**
 * Run one diagnostic log call, ignoring any failure of the logger itself: a
 * tool result must still be produced when logging is what broke.
 */
export function logSafely(write: () => void): void {
  try {
    write()
  } catch {
    // Nothing more can be reported.
  }
}
