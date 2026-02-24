import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a automatoraction by ID.
 */
export class GetAutomatorActionCommand extends Command {
  static override paths = [["automator", "workflows", "actions", "get"]];

  static override usage = Command.Usage({
    description: 'Get a automatoraction by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workflowId = Option.String('--workflow-id', { required: true, description: 'Workflow ID' });

  automatorActionId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.automatoractions.get(this.automatorActionId);

      const output = formatter.format({
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
      });

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
