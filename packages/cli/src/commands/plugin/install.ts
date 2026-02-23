import { Command, Option } from 'clipanion'
import { installPlugin } from '../../plugin/manager.js'
import { createFormatter } from '../../output/index.js'

/**
 * Install a CLI plugin.
 */
export class PluginInstallCommand extends Command {
  static override paths = [['plugin', 'install']]

  static override usage = Command.Usage({
    description: 'Install a CLI plugin',
    details: `
      Installs a macts CLI plugin from npm into ~/.macts/plugins/.

      Plugins must be scoped under @macts/cli-* for security.
    `,
    examples: [
      ['Install the calendar plugin', '$0 plugin install @macts/cli-calendar'],
      ['Install a specific version', '$0 plugin install @macts/cli-calendar@1.0.0'],
    ],
  })

  packageName = Option.String({ required: true, name: 'package' })
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    // Parse package name and version (handle scoped packages like @macts/cli-calendar@1.0.0)
    // Find the last @ that's not at position 0 (scope prefix)
    const lastAtIndex = this.packageName.lastIndexOf('@')
    const [name, version] =
      lastAtIndex > 0
        ? [this.packageName.slice(0, lastAtIndex), this.packageName.slice(lastAtIndex + 1)]
        : [this.packageName, 'latest']

    const result = installPlugin(name, version)

    if (result.success) {
      this.context.stdout.write(formatter.formatSuccess(result.message) + '\n')
      return Promise.resolve(0)
    } else {
      this.context.stderr.write(formatter.formatError(result.message) + '\n')
      return Promise.resolve(1)
    }
  }
}
