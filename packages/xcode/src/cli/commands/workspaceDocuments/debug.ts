import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Start a debugging session using the "run" or "run without building" scheme action
 */
export class DebugWorkspaceDocumentCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'debug']]

  static override usage = Command.Usage({
    description:
      'Start a debugging session using the "run" or "run without building" scheme action',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workspaceDocumentId = Option.String({ required: true })
  workspaceName = Option.String('--workspace-name', {
    required: true,
    description: 'Workspace document name',
  })
  scheme = Option.String('--scheme', { required: false, description: 'Scheme name' })
  runDestinationSpecifier = Option.String('--run-destination-specifier', {
    required: false,
    description: 'Run destination specifier string',
  })
  skipBuilding = Option.Boolean('--skip-building', {
    description: 'Whether to perform "run without building" rather than "run"',
  })
  commandLineArguments = Option.String('--command-line-arguments', {
    required: false,
    description: 'Additional command line arguments to pass to the action',
  })
  environmentVariables = Option.String('--environment-variables', {
    required: false,
    description: 'Additional environment variables to set for the action',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.workspacedocuments.debug(
        this.workspaceName as unknown as Parameters<typeof client.workspacedocuments.debug>[0],
        this.scheme as unknown as Parameters<typeof client.workspacedocuments.debug>[1],
        this.runDestinationSpecifier as unknown as Parameters<
          typeof client.workspacedocuments.debug
        >[2],
        this.skipBuilding as unknown as Parameters<typeof client.workspacedocuments.debug>[3],
        this.commandLineArguments as unknown as Parameters<
          typeof client.workspacedocuments.debug
        >[4],
        this.environmentVariables as unknown as Parameters<
          typeof client.workspacedocuments.debug
        >[5]
      )

      const output = formatter.formatSuccess('debug completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
