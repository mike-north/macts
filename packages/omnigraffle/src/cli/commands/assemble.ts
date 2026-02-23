import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Group graphics
 */
export class AssembleCommand extends Command {
  static override paths = [["omnigraffle", "assemble"]];

  static override usage = Command.Usage({
    description: "Group graphics",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  subgraph = Option.Boolean('--subgraph', { description: "Create as subgraph" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.assemble(this.subgraph as any);

      const output = formatter.formatSuccess('assemble completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
