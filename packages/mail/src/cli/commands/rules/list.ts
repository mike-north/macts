import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * List rules.
 */
export class ListRulesCommand extends Command {
  static override paths = [["mail", "rules", "list"]];

  static override usage = Command.Usage({
    description: 'List rules',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.rules.list();

      const output = formatter.formatList(items.map(item => ({
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
