/**
 * The removed trusted-caller switch, and how the CLI tells a user what to do
 * instead.
 *
 * MCP tool calls once could run without any API key when
 * `--disable-api-key-validation` was passed, or when
 * `MACTS_DISABLE_API_KEY_VALIDATION=1` was set. Every MCP call now runs
 * through the runtime, which verifies the caller's key on every call: there is
 * no trusted-caller mode, and being on the same Mac is not an identity
 * (phases/13 A1, D5). Both spellings are gone, and neither may be silently
 * ignored, because a user relying on one would otherwise not learn why calls
 * are refused:
 *
 * - the flag is no longer declared by any command, so clipanion refuses it as
 *   an unknown option; {@link MactsCli} appends the replacement to that error;
 * - the environment variable is reported once, on stderr, when an MCP host
 *   starts, by {@link warnIfRemovedTrustSwitchSet}.
 *
 * @packageDocumentation
 */

import { Cli, type BaseContext, type Command } from 'clipanion'

/** The removed command-line flag. */
export const REMOVED_TRUST_SWITCH_FLAG = '--disable-api-key-validation'

/** The removed environment variable. */
export const REMOVED_TRUST_SWITCH_ENV = 'MACTS_DISABLE_API_KEY_VALIDATION'

/** What to do instead of the removed switch, in one line. */
const REPLACEMENT =
  'Create a local key with `macts api-key create --name <name> --permission <app:resource:operation>` and pass it as MACTS_API_KEY (for `macts --mcp`), or as an `Authorization: Bearer` header (for `macts mcp serve` and `macts mcp start`).'

/** The hint appended to clipanion's unknown-option error for the removed flag. */
export const REMOVED_TRUST_SWITCH_HINT = `${REMOVED_TRUST_SWITCH_FLAG} has been removed: every MCP tool call is verified by its own API key. ${REPLACEMENT}`

/** The warning written when the removed environment variable is set. */
export const REMOVED_TRUST_SWITCH_ENV_WARNING = `Warning: ${REMOVED_TRUST_SWITCH_ENV} is set but no longer has any effect: every MCP tool call is verified by its own API key. ${REPLACEMENT}`

/**
 * The command line of a clipanion syntax error, when `error` is one.
 *
 * @remarks
 * Clipanion does not export its `UnknownSyntaxError` class, so the error is
 * recognized by its name and its `input` field, which is the command line it
 * failed to parse.
 */
function syntaxErrorInput(error: unknown): readonly unknown[] | undefined {
  if (!(error instanceof Error) || error.name !== 'UnknownSyntaxError' || !('input' in error)) {
    return undefined
  }
  return Array.isArray(error.input) ? error.input : undefined
}

/** Whether an argument is the removed flag, alone or with an attached value. */
function isRemovedFlag(arg: unknown): boolean {
  return (
    typeof arg === 'string' &&
    (arg === REMOVED_TRUST_SWITCH_FLAG || arg.startsWith(`${REMOVED_TRUST_SWITCH_FLAG}=`))
  )
}

/**
 * The text clipanion printed for a command-line error, with the replacement
 * for the removed flag appended when the command line contained it.
 *
 * @remarks
 * Only syntax errors are touched: the removed flag is declared nowhere, so a
 * command line containing it always fails to parse. The original text is kept
 * whole, so the unknown-option error itself is never hidden.
 *
 * @param error - What clipanion is reporting.
 * @param rendered - The text clipanion rendered for it.
 * @returns `rendered`, followed by the hint when it applies.
 */
export function explainRemovedOptions(error: unknown, rendered: string): string {
  if (syntaxErrorInput(error)?.some(isRemovedFlag) !== true) {
    return rendered
  }
  const separator = rendered.endsWith('\n') ? '' : '\n'
  return `${rendered}${separator}\n${REMOVED_TRUST_SWITCH_HINT}\n`
}

/**
 * The macts command-line interface: clipanion's `Cli`, with the replacement
 * for removed options appended to the errors that report them.
 */
export class MactsCli<Context extends BaseContext = BaseContext> extends Cli<Context> {
  override error(
    error: unknown,
    opts?: { colored?: boolean; command?: Command<Context> | null }
  ): string {
    return explainRemovedOptions(error, super.error(error, opts))
  }
}

/**
 * Warn on `stderr` that the removed environment variable no longer has any
 * effect, when it is set to anything.
 *
 * @remarks
 * Each MCP host command calls this once, when it starts, so a process warns
 * once.
 *
 * @param env - The process environment.
 * @param stderr - Where to write the warning; never stdout, which is the
 *   protocol channel of `macts --mcp`.
 */
export function warnIfRemovedTrustSwitchSet(
  env: Readonly<Record<string, string | undefined>>,
  stderr: { write(text: string): unknown }
): void {
  if (env[REMOVED_TRUST_SWITCH_ENV] === undefined) return
  stderr.write(`${REMOVED_TRUST_SWITCH_ENV_WARNING}\n`)
}
