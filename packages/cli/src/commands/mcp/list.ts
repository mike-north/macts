import { Command, Option } from 'clipanion'
import { listInstalledMcpServerPlugins } from '../../plugin/manager.js'
import { createFormatter } from '../../output/index.js'

/**
 * List installed MCP server plugins.
 *
 * Shows the `@macts/<app>-server` packages installed in ~/.macts/plugins/ —
 * the plugins the MCP daemon discovers and exposes to MCP clients.
 */
export class McpListCommand extends Command {
  static override paths = [['mcp', 'list']]

  static override usage = Command.Usage({
    description: 'List installed MCP server plugins',
    details: `
      Shows all MCP server plugins installed in ~/.macts/plugins/. These are the
      @macts/<app>-server packages the MCP daemon discovers and exposes to MCP
      clients.
    `,
    examples: [
      ['List all MCP server plugins', '$0 mcp list'],
      ['List as JSON', '$0 mcp list --json'],
    ],
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)
    const plugins = listInstalledMcpServerPlugins()

    if (plugins.length === 0) {
      this.context.stdout.write(
        formatter.formatSuccess(
          'No MCP server plugins installed. Use `macts mcp install <app>` to add one.'
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
