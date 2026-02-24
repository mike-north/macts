import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a setting by ID.
 */
export class GetSettingCommand extends Command {
  static override paths = [["automator", "workflows", "actions", "settings", "get"]];

  static override usage = Command.Usage({
    description: 'Get a setting by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workflowId = Option.String('--workflow-id', { required: true, description: 'Workflow ID' });
  automatorActionId = Option.String('--automator-action-id', { required: true, description: 'AutomatorAction ID' });

  settingId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.settings.get(this.settingId);

      const output = formatter.format({
        name: item.name,
        value: item.value,
        defaultValue: item.defaultValue,
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
