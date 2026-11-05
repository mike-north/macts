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
 * List folders.
 */
export class ListFoldersCommand extends Command {
  static override paths = [['photos', 'folders', 'folders', 'list']]

  static override usage = Command.Usage({
    description: 'List folders',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  pageSize = Option.String('--page-size', {
    description: 'The most items to show, from 1 to 100 (default 25)',
  })
  cursor = Option.String('--cursor', {
    description: 'Continue from the previous page, as its output says',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.folders.list({
        ...(this.pageSize === undefined
          ? {}
          : { pageSize: __mactsParseIntegerOption(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
        page.items.map((item) => ({
          id: item.id,
          name: item.name,
          parent: item.parent,
        })),
        page.nextCursor
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
