import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Request a Python API cookie
 */
export class RequestCookieCommand extends Command {
  static override paths = [["iterm", "request-cookie"]];

  static override usage = Command.Usage({
    description: "Request a Python API cookie",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  andKeyForAppNamed = Option.String('--and-key-for-app-named', { required: false, description: "Name of script using the cookie. This is shown in the console." });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.requestCookie(this.andKeyForAppNamed as unknown);

      const output = formatter.formatSuccess('requestCookie completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
