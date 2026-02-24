import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a variable by ID.
 */
export class GetVariableCommand extends Command {
  static override paths = [["automator", "workflows", "variables", "get"]];

  static override usage = Command.Usage({
    description: 'Get a variable by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workflowId = Option.String('--workflow-id', { required: true, description: 'Workflow ID' });

  variableId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.variables.get(this.variableId);

      const output = formatter.format({
        name: item.name,
        value: item.value,
        settable: item.settable,
        id: item.id,
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
