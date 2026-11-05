import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Invoke the "run" scheme action. When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
 */
export class RunWorkspaceDocumentCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'run']]

  static override usage = Command.Usage({
    description:
      'Invoke the "run" scheme action. When several workspace documents share the same name, the first match in the app\'s order is used, and the operation does not fail as ambiguous.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workspaceDocumentId = Option.String({ name: 'name', required: true })
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
      await client.workspaceDocuments.run(
        this.workspaceDocumentId as unknown as Parameters<typeof client.workspaceDocuments.run>[0],
        this.withCommandLineArguments as unknown as Parameters<
          typeof client.workspaceDocuments.run
        >[1],
        this.withEnvironmentVariables as unknown as Parameters<
          typeof client.workspaceDocuments.run
        >[2]
      )

      const output = formatter.formatSuccess('run completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
