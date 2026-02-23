import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * List tasks.
 */
export class ListTasksCommand extends Command {
  static override paths = [["omniplan", "projects", "tasks", "tasks", "list"]];

  static override usage = Command.Usage({
    description: 'List tasks',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  taskId = Option.String('--task-id', { required: true, description: 'Task ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.tasks.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        name: item.name,
        startingDate: item.startingDate,
        endingDate: item.endingDate,
        duration: item.duration,
        effort: item.effort,
        completed: item.completed,
        completedEffort: item.completedEffort,
        remainingEffort: item.remainingEffort,
        priority: item.priority,
        taskStatus: item.taskStatus,
        taskType: item.taskType,
        staticCost: item.staticCost,
        resourceCost: item.resourceCost,
        totalCost: item.totalCost,
        outlineDepth: item.outlineDepth,
        outlineNumber: item.outlineNumber,
        startingConstraintDate: item.startingConstraintDate,
        endingConstraintDate: item.endingConstraintDate,
        startingDateLocked: item.startingDateLocked,
        endingDateLocked: item.endingDateLocked,
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
