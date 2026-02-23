import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List scenarios.
 */
export class ListScenariosCommand extends Command {
  static override paths = [["omniplan", "projects", "scenarios", "list"]];

  static override usage = Command.Usage({
    description: 'List scenarios',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.scenarios.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        name: item.name,
        startingDate: item.startingDate,
        endingDate: item.endingDate,
        totalCost: item.totalCost,
        completed: item.completed,
        duration: item.duration,
        effort: item.effort,
        violationCount: item.violationCount,
        schedulingGranularity: item.schedulingGranularity,
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
