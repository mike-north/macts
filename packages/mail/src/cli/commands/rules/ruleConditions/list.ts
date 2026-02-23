import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List ruleconditions.
 */
export class ListRuleConditionsCommand extends Command {
  static override paths = [["mail", "rules", "ruleConditions", "list"]];

  static override usage = Command.Usage({
    description: 'List ruleconditions',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  ruleId = Option.String('--rule-id', { required: true, description: 'Rule ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.ruleconditions.list();

      const output = formatter.formatList(items.map(item => ({
        expression: item.expression,
        header: item.header,
        qualifier: item.qualifier,
        ruleType: item.ruleType,
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
