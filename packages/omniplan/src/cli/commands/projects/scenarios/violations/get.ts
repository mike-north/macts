import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a violation by ID.
 */
export class GetViolationCommand extends Command {
  static override paths = [["omniplan", "projects", "scenarios", "violations", "get"]];

  static override usage = Command.Usage({
    description: 'Get a violation by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  scenarioId = Option.String('--scenario-id', { required: true, description: 'Scenario ID' });

  violationId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.violations.get(this.violationId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Violation not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        violationType: item.violationType,
        shortDescription: item.shortDescription,
        html: item.html,
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
