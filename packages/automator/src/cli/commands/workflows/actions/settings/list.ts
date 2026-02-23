import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * List settings.
 */
export class ListSettingsCommand extends Command {
  static override paths = [["automator", "workflows", "actions", "settings", "list"]];

  static override usage = Command.Usage({
    description: 'List settings',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workflowId = Option.String('--workflow-id', { required: true, description: 'Workflow ID' });
  automatorActionId = Option.String('--automator-action-id', { required: true, description: 'AutomatorAction ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.settings.list();

      const output = formatter.formatList(items.map(item => ({
        name: item.name,
        value: item.value,
        defaultValue: item.defaultValue,
      })));

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
