import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Create a new mailattachment.
 */
export class CreateMailAttachmentCommand extends Command {
  static override paths = [["mail", "messageViewers", "messages", "mailAttachments", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new mailattachment',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  messageViewerId = Option.String('--message-viewer-id', { required: true, description: 'MessageViewer ID' });
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.mailattachments.create({

      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'MailAttachment created successfully',
        name: item.name,
        mIMEType: item.mIMEType,
        fileSize: item.fileSize,
        downloaded: item.downloaded,
        id: item.id,
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
