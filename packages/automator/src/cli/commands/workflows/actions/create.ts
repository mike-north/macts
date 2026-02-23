import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new automatoraction.
 */
export class CreateAutomatorActionCommand extends Command {
  static override paths = [["automator", "workflows", "actions", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new automatoraction',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workflowId = Option.String('--workflow-id', { required: true, description: 'Workflow ID' });
  comment = Option.String('--comment', { required: true, description: "The comment for the name of the action" });
  enabled = Option.Boolean('--enabled', { description: "Is the action enabled?" });
  ignoresInput = Option.Boolean('--ignores-input', { description: "Shall the action ignore its input when it is run?" });
  index = Option.String('--index', { required: true, description: "The index of the action" });
  showActionWhenRun = Option.Boolean('--show-action-when-run', { description: "Shall the action show its user interface when it is run?" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.automatoractions.create({
        comment: this.comment,
        enabled: this.enabled,
        ignoresInput: this.ignoresInput,
        index: this.index,
        showActionWhenRun: this.showActionWhenRun,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'AutomatorAction created successfully',
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
