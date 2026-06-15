import { Command, Option } from 'clipanion'
import { installMcpServerPlugin } from '../../plugin/manager.js'
import { createFormatter } from '../../output/index.js'

/**
 * Install an MCP server plugin.
 *
 * MCP server plugins ship an app's tools to MCP clients. They are published as
 * `@macts/<app>-server` packages (HTTP API + MCP plugin) and installed into the
 * managed `~/.macts/plugins/` directory, where the MCP daemon discovers them.
 * After installing, restart the daemon (`macts mcp start`) so it exposes the
 * newly installed tools.
 */
export class McpInstallCommand extends Command {
  static override paths = [['mcp', 'install']]

  static override usage = Command.Usage({
    description: 'Install an MCP server plugin',
    details: `
      Installs an app's MCP server plugin into ~/.macts/plugins/ so the MCP
      daemon exposes that app's tools to MCP clients.

      Provide the app name (e.g. "calendar") or the full package name
      (e.g. "@macts/calendar-server"). The package must be scoped under
      @macts/<app>-server.

      After installing, (re)start the daemon so it picks up the new tools:

        macts mcp start

      The install location can be overridden with the MACTS_HOME environment
      variable (defaults to ~/.macts).
    `,
    examples: [
      ['Install the calendar MCP server plugin', '$0 mcp install calendar'],
      ['Install by full package name', '$0 mcp install @macts/calendar-server'],
      ['Install a specific version', '$0 mcp install calendar@1.0.0'],
    ],
  })

  app = Option.String({ required: true, name: 'app' })
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    // Parse app name and version. Handle bare names ("calendar@1.0.0") and
    // scoped package names ("@macts/calendar-server@1.0.0"): the version is
    // whatever follows the last "@" that isn't the leading scope marker.
    const lastAtIndex = this.app.lastIndexOf('@')
    const [app, version] =
      lastAtIndex > 0
        ? [this.app.slice(0, lastAtIndex), this.app.slice(lastAtIndex + 1)]
        : [this.app, 'latest']

    const result = installMcpServerPlugin(app, version)

    if (result.success) {
      this.context.stdout.write(formatter.formatSuccess(result.message) + '\n')
      this.context.stdout.write(
        formatter.formatSuccess('Restart the daemon to expose new tools: macts mcp start') + '\n'
      )
      return Promise.resolve(0)
    } else {
      this.context.stderr.write(formatter.formatError(result.message) + '\n')
      return Promise.resolve(1)
    }
  }
}
