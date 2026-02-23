import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a rule by ID.
 */
export class GetRuleCommand extends Command {
  static override paths = [["mail", "rules", "get"]];

  static override usage = Command.Usage({
    description: 'Get a rule by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  ruleId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.rules.get(this.ruleId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Rule not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        colorMessage: item.colorMessage,
        deleteMessage: item.deleteMessage,
        forwardText: item.forwardText,
        forwardMessage: item.forwardMessage,
        markFlagged: item.markFlagged,
        markFlagIndex: item.markFlagIndex,
        markRead: item.markRead,
        playSound: item.playSound,
        redirectMessage: item.redirectMessage,
        replyText: item.replyText,
        runScript: item.runScript,
        allConditionsMustBeMet: item.allConditionsMustBeMet,
        copyMessage: item.copyMessage,
        moveMessage: item.moveMessage,
        highlightTextUsingColor: item.highlightTextUsingColor,
        enabled: item.enabled,
        name: item.name,
        shouldCopyMessage: item.shouldCopyMessage,
        shouldMoveMessage: item.shouldMoveMessage,
        stopEvaluatingRules: item.stopEvaluatingRules,
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
