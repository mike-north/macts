import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Create a new workflow.
 */
export class CreateWorkflowCommand extends Command {
  static override paths = [["automator", "workflows", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new workflow',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.workflows.create({

      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Workflow created successfully',
        name: item.name,
        currentAction: item.currentAction,
        executionResult: item.executionResult,
        executionErrorMessage: item.executionErrorMessage,
        executionErrorNumber: item.executionErrorNumber,
        executionId: item.executionId,
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
