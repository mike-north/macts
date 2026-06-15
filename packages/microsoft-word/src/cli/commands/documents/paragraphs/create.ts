import { Command, Option } from 'clipanion'
import * as t from 'typanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new paragraph.
 */
export class CreateParagraphCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'paragraphs', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new paragraph',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })
  alignment = Option.String('--alignment', {
    required: true,
    description: 'The alignment for the paragraph',
    validator: t.isEnum(['left', 'center', 'right', 'justify']),
  })
  firstLineIndent = Option.String('--first-line-indent', {
    required: true,
    description: 'The first-line or hanging indent value in points',
  })
  leftIndent = Option.String('--left-indent', {
    required: true,
    description: 'The left indent in points',
  })
  rightIndent = Option.String('--right-indent', {
    required: true,
    description: 'The right indent in points',
  })
  lineSpacing = Option.String('--line-spacing', {
    required: true,
    description: 'The line spacing in points',
  })
  spaceAfter = Option.String('--space-after', {
    required: true,
    description: 'The spacing in points after the paragraph',
  })
  spaceBefore = Option.String('--space-before', {
    required: true,
    description: 'The spacing in points before the paragraph',
  })
  pageBreakBefore = Option.Boolean('--page-break-before', {
    description: 'Whether a page break is forced before the paragraph',
  })
  keepTogether = Option.Boolean('--keep-together', {
    description: 'Whether all lines remain on the same page',
  })
  keepWithNext = Option.Boolean('--keep-with-next', {
    description: 'Whether paragraph stays with next paragraph',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.paragraphs.create({
        alignment: this.alignment,
        firstLineIndent: this.firstLineIndent,
        leftIndent: this.leftIndent,
        rightIndent: this.rightIndent,
        lineSpacing: this.lineSpacing,
        spaceAfter: this.spaceAfter,
        spaceBefore: this.spaceBefore,
        pageBreakBefore: this.pageBreakBefore,
        keepTogether: this.keepTogether,
        keepWithNext: this.keepWithNext,
      } as unknown as Parameters<typeof client.paragraphs.create>[0])

      const output = formatter.format({
        message: 'Paragraph created successfully',
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
