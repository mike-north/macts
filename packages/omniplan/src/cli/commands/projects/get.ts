import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a project by ID.
 */
export class GetProjectCommand extends Command {
  static override paths = [["omniplan", "projects", "get"]];

  static override usage = Command.Usage({
    description: 'Get a project by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  projectId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.projects.get(this.projectId);

      const output = formatter.format({
        id: item.id,
        name: item.name,
        startingDate: item.startingDate,
        endingDate: item.endingDate,
        totalCost: item.totalCost,
        completed: item.completed,
        duration: item.duration,
        effort: item.effort,
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
