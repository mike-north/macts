import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Invokes an expression, such as a registered function.
 */
export class InvokeAPIExpressionCommand extends Command {
  static override paths = [["iterm", "invoke-apiexpression"]];

  static override usage = Command.Usage({
    description: "Invokes an expression, such as a registered function.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.invokeAPIExpression();

      const output = formatter.formatSuccess('invokeAPIExpression completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
