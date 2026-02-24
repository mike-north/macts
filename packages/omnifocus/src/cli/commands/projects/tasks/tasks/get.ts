import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a task by ID.
 */
export class GetTaskCommand extends Command {
  static override paths = [["omnifocus", "projects", "tasks", "tasks", "get"]];

  static override usage = Command.Usage({
    description: 'Get a task by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  taskId = Option.String('--task-id', { required: true, description: 'Task ID' });

  taskId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.tasks.get(this.taskId);

      const output = formatter.format({
        id: item.id,
        name: item.name,
        note: item.note,
        flagged: item.flagged,
        completed: item.completed,
        deferDate: item.deferDate,
        plannedDate: item.plannedDate,
        dueDate: item.dueDate,
        completionDate: item.completionDate,
        droppedDate: item.droppedDate,
        creationDate: item.creationDate,
        modificationDate: item.modificationDate,
        estimatedMinutes: item.estimatedMinutes,
        sequential: item.sequential,
        completedByChildren: item.completedByChildren,
        inInbox: item.inInbox,
        next: item.next,
        blocked: item.blocked,
        effectiveDeferDate: item.effectiveDeferDate,
        effectivePlannedDate: item.effectivePlannedDate,
        effectiveDueDate: item.effectiveDueDate,
        effectivelyCompleted: item.effectivelyCompleted,
        effectivelyDropped: item.effectivelyDropped,
        dropped: item.dropped,
        numberOfTasks: item.numberOfTasks,
        numberOfAvailableTasks: item.numberOfAvailableTasks,
        numberOfCompletedTasks: item.numberOfCompletedTasks,
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
