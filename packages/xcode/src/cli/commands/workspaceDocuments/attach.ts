import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Start a new debugging session in the workspace
 */
export class AttachWorkspaceDocumentCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'attach']]

  static override usage = Command.Usage({
    description: 'Start a new debugging session in the workspace',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  workspaceDocumentId = Option.String({ required: true })
  workspaceName = Option.String('--workspace-name', {
    required: true,
    description: 'Workspace document name',
  })
  toProcessIdentifier = Option.String('--to-process-identifier', {
    required: true,
    description: 'The process identifier (pid) to which to attach',
  })
  suspended = Option.Boolean('--suspended', {
    description: 'Whether to start debugging in a suspended state',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.workspacedocuments.attach(
        this.workspaceName as unknown,
        this.toProcessIdentifier as unknown,
        this.suspended as unknown
      )

      const output = formatter.formatSuccess('attach completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
