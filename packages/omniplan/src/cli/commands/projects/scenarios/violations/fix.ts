import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Fix a violation
 */
export class FixViolationCommand extends Command {
  static override paths = [["omniplan", "projects", "scenarios", "violations", "fix"]];

  static override usage = Command.Usage({
    description: "Fix a violation",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  scenarioId = Option.String('--scenario-id', { required: true, description: 'Scenario ID' });

  violationId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.violations.fix();

      const output = formatter.formatSuccess('fix completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
