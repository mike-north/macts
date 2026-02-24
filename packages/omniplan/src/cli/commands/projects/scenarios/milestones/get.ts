import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a milestone by ID.
 */
export class GetMilestoneCommand extends Command {
  static override paths = [["omniplan", "projects", "scenarios", "milestones", "get"]];

  static override usage = Command.Usage({
    description: 'Get a milestone by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  scenarioId = Option.String('--scenario-id', { required: true, description: 'Scenario ID' });

  milestoneId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.milestones.get(this.milestoneId);

      const output = formatter.format({
        id: item.id,
        name: item.name,
        startingDate: item.startingDate,
        note: item.note,
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
