import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

import {
  ValueTypes as __mactsValueTypes,
  ValidationError as __mactsValidationError,
} from '@macts/contracts'

/** The contract's canonical decimal and safe-integer policy, built once. */
const __mactsIntegerOptionWire = __mactsValueTypes.integer().wire

/**
 * Check the original CLI spelling before converting to the numeric SDK input.
 * Canonical safe-integer text is exactly representable, so conversion after
 * this check cannot round or reinterpret the caller's chosen value.
 */
function __mactsParseIntegerOption(text: string): number {
  if (!__mactsIntegerOptionWire.safeParse({ integer: text }).success) {
    const message = 'Expected a canonical decimal integer within the safe-integer range.'
    throw new __mactsValidationError(message, { issues: [{ path: [], message }] })
  }
  return Number(text)
}

/**
 * Write text into a session, as though it was typed, optionally followed by a newline.
 */
export class WriteSessionCommand extends Command {
  static override paths = [['iterm', 'windows', 'tabs', 'sessions', 'write']]

  static override usage = Command.Usage({
    description:
      'Write text into a session, as though it was typed, optionally followed by a newline.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  windowId = Option.String('--window-id', { required: true, description: 'Window identifier' })
  sessionId = Option.String({ name: 'id', required: true })
  text = Option.String('--text', { required: true, description: 'Text to write' })
  newline = Option.Boolean('--newline', {
    description: 'Whether to add a newline after the text (the app adds one when this is omitted)',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.sessions.write(
        __mactsParseIntegerOption(this.windowId),
        this.sessionId as unknown as Parameters<typeof client.sessions.write>[1],
        this.text as unknown as Parameters<typeof client.sessions.write>[2],
        this.newline as unknown as Parameters<typeof client.sessions.write>[3]
      )

      const output = formatter.formatSuccess('write completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
