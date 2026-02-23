import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * List assignments.
 */
export class ListAssignmentsCommand extends Command {
  static override paths = [["omniplan", "projects", "tasks", "assignments", "list"]];

  static override usage = Command.Usage({
    description: 'List assignments',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  taskId = Option.String('--task-id', { required: true, description: 'Task ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.assignments.list();

      const output = formatter.formatList(items.map(item => ({
        units: item.units,
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
