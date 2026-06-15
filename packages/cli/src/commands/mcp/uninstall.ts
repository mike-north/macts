import { Command, Option } from 'clipanion'
import { uninstallMcpServerPlugin } from '../../plugin/manager.js'
import { createFormatter } from '../../output/index.js'

/**
 * Uninstall an MCP server plugin.
 *
 * Removes an `@macts/<app>-server` package from ~/.macts/plugins/. Restart the
 * daemon (`macts mcp start`) afterwards so it stops exposing the removed tools.
 */
export class McpUninstallCommand extends Command {
  static override paths = [['mcp', 'uninstall']]

  static override usage = Command.Usage({
    description: 'Uninstall an MCP server plugin',
    details: `
      Removes an app's MCP server plugin from ~/.macts/plugins/.

      Provide the app name (e.g. "calendar") or the full package name
      (e.g. "@macts/calendar-server").

      Restart the daemon afterwards so it stops exposing the removed tools:

        macts mcp start
    `,
    examples: [
      ['Uninstall the calendar MCP server plugin', '$0 mcp uninstall calendar'],
      ['Uninstall by full package name', '$0 mcp uninstall @macts/calendar-server'],
    ],
  })

  app = Option.String({ required: true, name: 'app' })
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    const result = uninstallMcpServerPlugin(this.app)

    if (result.success) {
      this.context.stdout.write(formatter.formatSuccess(result.message) + '\n')
      return Promise.resolve(0)
    } else {
      this.context.stderr.write(formatter.formatError(result.message) + '\n')
      return Promise.resolve(1)
    }
  }
}
