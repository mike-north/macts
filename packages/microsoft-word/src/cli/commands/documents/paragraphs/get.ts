import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a paragraph by ID.
 */
export class GetParagraphCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'paragraphs', 'get']]

  static override usage = Command.Usage({
    description: 'Get a paragraph by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })

  paragraphId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.paragraphs.get(this.paragraphId)

      const output = formatter.format({
        alignment: item.alignment,
        firstLineIndent: item.firstLineIndent,
        leftIndent: item.leftIndent,
        rightIndent: item.rightIndent,
        lineSpacing: item.lineSpacing,
        spaceAfter: item.spaceAfter,
        spaceBefore: item.spaceBefore,
        pageBreakBefore: item.pageBreakBefore,
        keepTogether: item.keepTogether,
        keepWithNext: item.keepWithNext,
        paragraphId: item.paragraphId,
        content: item.content,
      })

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
