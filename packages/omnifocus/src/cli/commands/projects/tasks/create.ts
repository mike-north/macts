import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new task.
 */
export class CreateTaskCommand extends Command {
  static override paths = [["omnifocus", "projects", "tasks", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new task',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  name = Option.String('--name', { required: true, description: "The name of the task" });
  note = Option.String('--note', { required: true, description: "The note of the task" });
  flagged = Option.Boolean('--flagged', { description: "True if flagged" });
  deferDate = Option.String('--defer-date', { required: true, description: "When the task should become available for action" });
  plannedDate = Option.String('--planned-date', { required: true, description: "The date at which work for this task is intended" });
  dueDate = Option.String('--due-date', { required: true, description: "When the task must be finished" });
  completionDate = Option.String('--completion-date', { required: true, description: "The task's date of completion" });
  droppedDate = Option.String('--dropped-date', { required: true, description: "The date the task was dropped" });
  creationDate = Option.String('--creation-date', { required: true, description: "When the task was created" });
  estimatedMinutes = Option.String('--estimated-minutes', { required: true, description: "The estimated time, in whole minutes, that this task will take to finish" });
  sequential = Option.Boolean('--sequential', { description: "If true, any children are sequentially dependent" });
  completedByChildren = Option.Boolean('--completed-by-children', { description: "If true, complete when children are completed" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.tasks.create({
        name: this.name,
        note: this.note,
        flagged: this.flagged,
        deferDate: this.deferDate,
        plannedDate: this.plannedDate,
        dueDate: this.dueDate,
        completionDate: this.completionDate,
        droppedDate: this.droppedDate,
        creationDate: this.creationDate,
        estimatedMinutes: this.estimatedMinutes,
        sequential: this.sequential,
        completedByChildren: this.completedByChildren,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Task created successfully',
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
