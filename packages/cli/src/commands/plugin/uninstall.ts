import { Command, Option } from 'clipanion'
import { uninstallPlugin } from '../../plugin/manager.js'
import { createFormatter } from '../../output/index.js'

/**
 * Uninstall a CLI plugin.
 */
export class PluginUninstallCommand extends Command {
  static override paths = [['plugin', 'uninstall']]

  static override usage = Command.Usage({
    description: 'Uninstall a CLI plugin',
    details: `
      Removes a macts CLI plugin from ~/.macts/plugins/.
    `,
    examples: [['Uninstall the calendar plugin', '$0 plugin uninstall @macts/calendar']],
  })

  packageName = Option.String({ required: true, name: 'package' })
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    const result = uninstallPlugin(this.packageName)

    if (result.success) {
      this.context.stdout.write(formatter.formatSuccess(result.message) + '\n')
      return Promise.resolve(0)
    } else {
      this.context.stderr.write(formatter.formatError(result.message) + '\n')
      return Promise.resolve(1)
    }
  }
}
