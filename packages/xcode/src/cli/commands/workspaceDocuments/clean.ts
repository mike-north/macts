import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Invoke the "clean" scheme action
 */
export class CleanWorkspaceDocumentCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'clean']]

  static override usage = Command.Usage({
    description: 'Invoke the "clean" scheme action',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  workspaceDocumentId = Option.String({ required: true })
  workspaceName = Option.String('--workspace-name', {
    required: true,
    description: 'Workspace document name',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.workspacedocuments.clean(this.workspaceName as unknown)

      const output = formatter.formatSuccess('clean completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
