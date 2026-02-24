import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a task by ID.
 */
export class GetTaskCommand extends Command {
  static override paths = [["omniplan", "projects", "scenarios", "tasks", "get"]];

  static override usage = Command.Usage({
    description: 'Get a task by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  scenarioId = Option.String('--scenario-id', { required: true, description: 'Scenario ID' });

  taskId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.tasks.get(this.taskId);

      const output = formatter.format({
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
