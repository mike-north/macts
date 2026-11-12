import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

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
 * Sends a message.
 */
export class SendOutgoingMessageCommand extends Command {
  static override paths = [['mail', 'outgoingMessages', 'send']]

  static override usage = Command.Usage({
    description: 'Sends a message.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  outgoingMessageId = Option.String({ name: 'id', required: true })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const result = await client.outgoingMessages.send(
        __mactsParseIntegerOption(this.outgoingMessageId)
      )

      const output = formatter.format(result)
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
