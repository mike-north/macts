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
 * List sessions.
 */
export class ListSessionsCommand extends Command {
  static override paths = [['iterm', 'windows', 'tabs', 'sessions', 'list']]

  static override usage = Command.Usage({
    description: 'List sessions',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  windowId = Option.String('--window-id', { required: true, description: 'Window identifier' })
  tabIndex = Option.String('--tab-index', {
    required: true,
    description: 'Zero-based tab position',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.sessions.list(
        __mactsParseIntegerOption(this.windowId),
        __mactsParseIntegerOption(this.tabIndex)
      )

      const output = formatter.formatList(
        page.items.map((item) => ({
          id: item.id,
          isProcessing: item.isProcessing,
          isAtShellPrompt: item.isAtShellPrompt,
          columns: item.columns,
          rows: item.rows,
          tty: item.tty,
          colorPreset: item.colorPreset,
          backgroundColor: item.backgroundColor,
          boldColor: item.boldColor,
          cursorColor: item.cursorColor,
          cursorTextColor: item.cursorTextColor,
          foregroundColor: item.foregroundColor,
          selectedTextColor: item.selectedTextColor,
          selectionColor: item.selectionColor,
          aNSIBlackColor: item.aNSIBlackColor,
          aNSIRedColor: item.aNSIRedColor,
          aNSIGreenColor: item.aNSIGreenColor,
          aNSIYellowColor: item.aNSIYellowColor,
          aNSIBlueColor: item.aNSIBlueColor,
          aNSIMagentaColor: item.aNSIMagentaColor,
          aNSICyanColor: item.aNSICyanColor,
          aNSIWhiteColor: item.aNSIWhiteColor,
          aNSIBrightBlackColor: item.aNSIBrightBlackColor,
          aNSIBrightRedColor: item.aNSIBrightRedColor,
          aNSIBrightGreenColor: item.aNSIBrightGreenColor,
          aNSIBrightYellowColor: item.aNSIBrightYellowColor,
          aNSIBrightBlueColor: item.aNSIBrightBlueColor,
          aNSIBrightMagentaColor: item.aNSIBrightMagentaColor,
          aNSIBrightCyanColor: item.aNSIBrightCyanColor,
          aNSIBrightWhiteColor: item.aNSIBrightWhiteColor,
          underlineColor: item.underlineColor,
          useUnderlineColor: item.useUnderlineColor,
          backgroundImage: item.backgroundImage,
          name: item.name,
          transparency: item.transparency,
          uniqueID: item.uniqueID,
          profileName: item.profileName,
          answerbackString: item.answerbackString,
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
