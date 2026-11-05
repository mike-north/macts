import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List automator actions.
 */
export class ListAutomatorActionsCommand extends Command {
  static override paths = [['automator', 'automatorActions', 'list']]

  static override usage = Command.Usage({
    description:
      "List automator actions. When several workflows share the same name, the first match in the app's order is used as the workflow.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workflowName = Option.String('--workflow-name', { required: true, description: 'Workflow name' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.automatorActions.list(this.workflowName)

      const output = formatter.formatList(
        page.items.map((item) => ({
          name: item.name,
          bundleId: item.bundleId,
          category: item.category,
          comment: item.comment,
          enabled: item.enabled,
          executionErrorMessage: item.executionErrorMessage,
          executionErrorNumber: item.executionErrorNumber,
          executionResult: item.executionResult,
          iconName: item.iconName,
          id: item.id,
          ignoresInput: item.ignoresInput,
          index: item.index,
          inputTypes: item.inputTypes,
          keywords: item.keywords,
          outputTypes: item.outputTypes,
          parentWorkflow: item.parentWorkflow,
          path: item.path,
          showActionWhenRun: item.showActionWhenRun,
          targetApplication: item.targetApplication,
          version: item.version,
          warningAction: item.warningAction,
          warningLevel: item.warningLevel,
          warningMessage: item.warningMessage,
        }))
      )

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
