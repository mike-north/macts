import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new rulecondition.
 */
export class CreateRuleConditionCommand extends Command {
  static override paths = [["mail", "rules", "ruleConditions", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new rulecondition',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  ruleId = Option.String('--rule-id', { required: true, description: 'Rule ID' });
  expression = Option.String('--expression', { required: true, description: "Rule expression field" });
  header = Option.String('--header', { required: true, description: "Rule header key" });
  qualifier = Option.String('--qualifier', { required: true, description: "Rule qualifier" });
  ruleType = Option.String('--rule-type', { required: true, description: "Rule type" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.ruleconditions.create({
        expression: this.expression,
        header: this.header,
        qualifier: this.qualifier,
        ruleType: this.ruleType,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'RuleCondition created successfully',
        expression: item.expression,
        header: item.header,
        qualifier: item.qualifier,
        ruleType: item.ruleType,
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
