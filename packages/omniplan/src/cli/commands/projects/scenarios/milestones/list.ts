import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * List milestones.
 */
export class ListMilestonesCommand extends Command {
  static override paths = [["omniplan", "projects", "scenarios", "milestones", "list"]];

  static override usage = Command.Usage({
    description: 'List milestones',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  scenarioId = Option.String('--scenario-id', { required: true, description: 'Scenario ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.milestones.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        name: item.name,
        startingDate: item.startingDate,
        note: item.note,
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
