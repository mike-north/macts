import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List automator actions.
 */
export class ListAutomatorActionsCommand extends Command {
  static override paths = [['automator', 'automatorActions', 'list']]

  static override usage = Command.Usage({
    description: 'List automator actions',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workflowName = Option.String('--workflow-name', { required: true, description: 'Workflow name' })
  pageSize = Option.String('--page-size', {
    description: 'The most items to show, from 1 to 100 (default 25)',
  })
  cursor = Option.String('--cursor', {
    description: 'Continue from the previous page, as its output says',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.automatorActions.list(this.workflowName, {
        ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
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
        })),
        page.nextCursor
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
