import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new section.
 */
export class CreateSectionCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'sections', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new section',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })
  protectedForForms = Option.Boolean('--protected-for-forms', {
    description: 'Whether the section is protected for forms',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.sections.create({
        protectedForForms: this.protectedForForms,
      } as unknown as Parameters<typeof client.sections.create>[0])

      const output = formatter.format({
        message: 'Section created successfully',
        sectionIndex: item.sectionIndex,
        protectedForForms: item.protectedForForms,
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
