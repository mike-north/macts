import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Invoke the "build" scheme action. When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
 */
export class BuildWorkspaceDocumentCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'build']]

  static override usage = Command.Usage({
    description:
      'Invoke the "build" scheme action. When several workspace documents share the same name, the first match in the app\'s order is used, and the operation does not fail as ambiguous.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workspaceDocumentId = Option.String({ name: 'name', required: true })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.workspaceDocuments.build(
        this.workspaceDocumentId as unknown as Parameters<typeof client.workspaceDocuments.build>[0]
      )

      const output = formatter.formatSuccess('build completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
