import { Command, Option } from 'clipanion'
import { listInstalledPlugins } from '../../plugin/manager.js'
import { createFormatter } from '../../output/index.js'

/**
 * List installed CLI plugins.
 */
export class PluginListCommand extends Command {
  static override paths = [['plugin', 'list']]

  static override usage = Command.Usage({
    description: 'List installed CLI plugins',
    details: `
      Shows all macts CLI plugins installed in ~/.macts/plugins/.
    `,
    examples: [
      ['List all plugins', '$0 plugin list'],
      ['List as JSON', '$0 plugin list --json'],
    ],
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)
    const plugins = listInstalledPlugins()

    if (plugins.length === 0) {
      this.context.stdout.write(
        formatter.formatSuccess(
          'No plugins installed. Use `macts plugin install` to add plugins.'
        ) + '\n'
      )
      return Promise.resolve(0)
    }

    const output = formatter.formatList(plugins, {
      columns: [
        { header: 'Package', key: 'packageName' },
        { header: 'Version', key: 'version' },
      ],
    })

    this.context.stdout.write(output + '\n')
    return Promise.resolve(0)
  }
}
