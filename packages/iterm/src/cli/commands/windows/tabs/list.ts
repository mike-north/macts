import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

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
 * List tabs.
 */
export class ListTabsCommand extends Command {
  static override paths = [['iterm', 'windows', 'tabs', 'list']]

  static override usage = Command.Usage({
    description: 'List tabs',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  windowId = Option.String('--window-id', { required: true, description: 'Window identifier' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.tabs.list(__mactsParseIntegerOption(this.windowId))

      const output = formatter.formatList(
        page.items.map((item) => ({
          index: item.index,
          title: item.title,
        }))
      )

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
