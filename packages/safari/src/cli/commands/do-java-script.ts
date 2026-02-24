import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Applies a string of JavaScript code to a document.
 */
export class DoJavaScriptCommand extends Command {
  static override paths = [["safari", "do-java-script"]];

  static override usage = Command.Usage({
    description: "Applies a string of JavaScript code to a document.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  in = Option.String('--in', { required: false, description: "The tab that the JavaScript should be evaluated in." });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.doJavaScript(this.in as unknown);

      const output = formatter.formatSuccess('doJavaScript completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
