import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Create a new rule.
 */
export class CreateRuleCommand extends Command {
  static override paths = [["mail", "rules", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new rule',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  colorMessage = Option.String('--color-message', { required: true, description: "If rule matches, apply this color" });
  deleteMessage = Option.Boolean('--delete-message', { description: "If rule matches, delete message" });
  forwardText = Option.String('--forward-text', { required: true, description: "If rule matches, prepend this text to the forwarded message. Set to empty string to include no prepended text" });
  forwardMessage = Option.String('--forward-message', { required: true, description: "If rule matches, forward message to this address, or multiple addresses, separated by commas. Set to empty string to disable this action" });
  markFlagged = Option.Boolean('--mark-flagged', { description: "If rule matches, mark message as flagged" });
  markFlagIndex = Option.String('--mark-flag-index', { required: true, description: "If rule matches, mark message with the specified flag. Set to -1 to disable this action" });
  markRead = Option.Boolean('--mark-read', { description: "If rule matches, mark message as read" });
  playSound = Option.String('--play-sound', { required: true, description: "If rule matches, play this sound (specify name of sound or path to sound)" });
  redirectMessage = Option.String('--redirect-message', { required: true, description: "If rule matches, redirect message to this address or multiple addresses, separate by commas. Set to empty string to disable this action" });
  replyText = Option.String('--reply-text', { required: true, description: "If rule matches, reply to message and prepend with this text. Set to empty string to disable this action" });
  runScript = Option.String('--run-script', { required: true, description: "If rule matches, run this compiled AppleScript file. Set to empty string to disable this action" });
  allConditionsMustBeMet = Option.Boolean('--all-conditions-must-be-met', { description: "Indicates whether all conditions must be met for rule to execute" });
  copyMessage = Option.String('--copy-message', { required: true, description: "If rule matches, copy to this mailbox" });
  moveMessage = Option.String('--move-message', { required: true, description: "If rule matches, move to this mailbox" });
  highlightTextUsingColor = Option.Boolean('--highlight-text-using-color', { description: "Indicates whether the color will be used to highlight the text or background of a message in the message list" });
  enabled = Option.Boolean('--enabled', { description: "Indicates whether the rule is enabled" });
  name = Option.String('--name', { required: true, description: "Name of rule" });
  shouldCopyMessage = Option.Boolean('--should-copy-message', { description: "Indicates whether the rule has a copy action" });
  shouldMoveMessage = Option.Boolean('--should-move-message', { description: "Indicates whether the rule has a move action" });
  stopEvaluatingRules = Option.Boolean('--stop-evaluating-rules', { description: "If rule matches, stop rule evaluation for this message" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.rules.create({
        colorMessage: this.colorMessage,
        deleteMessage: this.deleteMessage,
        forwardText: this.forwardText,
        forwardMessage: this.forwardMessage,
        markFlagged: this.markFlagged,
        markFlagIndex: this.markFlagIndex,
        markRead: this.markRead,
        playSound: this.playSound,
        redirectMessage: this.redirectMessage,
        replyText: this.replyText,
        runScript: this.runScript,
        allConditionsMustBeMet: this.allConditionsMustBeMet,
        copyMessage: this.copyMessage,
        moveMessage: this.moveMessage,
        highlightTextUsingColor: this.highlightTextUsingColor,
        enabled: this.enabled,
        name: this.name,
        shouldCopyMessage: this.shouldCopyMessage,
        shouldMoveMessage: this.shouldMoveMessage,
        stopEvaluatingRules: this.stopEvaluatingRules,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Rule created successfully',
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
