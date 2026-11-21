import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Read a session identity across all tabs of its Window. A move to another Window makes this identity missing.
 */
export class ResolveSessionCommand extends Command {
  static override paths = [['iterm', 'windows', 'tabs', 'sessions', 'resolve']]

  static override usage = Command.Usage({
    description:
      'Read a session identity across all tabs of its Window. A move to another Window makes this identity missing',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  windowId = Option.String('--window-id', { required: true, description: 'Window identifier' })

  sessionId = Option.String({ name: 'id', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.sessions.resolve(this.windowId, this.sessionId)

      const output = formatter.format({
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
      })

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
