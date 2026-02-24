import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Invoke the "test" scheme action
 */
export class TestWorkspaceDocumentCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'test']]

  static override usage = Command.Usage({
    description: 'Invoke the "test" scheme action',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  workspaceDocumentId = Option.String({ required: true })
  workspaceName = Option.String('--workspace-name', {
    required: true,
    description: 'Workspace document name',
  })
  withCommandLineArguments = Option.String('--with-command-line-arguments', {
    required: false,
    description: 'Additional command line arguments to pass to the action',
  })
  withEnvironmentVariables = Option.String('--with-environment-variables', {
    required: false,
    description: 'Additional environment variables to set for the action',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.workspacedocuments.test(
        this.workspaceName as unknown,
        this.withCommandLineArguments as unknown,
        this.withEnvironmentVariables as unknown
      )

      const output = formatter.formatSuccess('test completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
