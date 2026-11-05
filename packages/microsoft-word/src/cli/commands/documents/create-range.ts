import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

import {
  ValueTypes as __mactsValueTypes,
  ValidationError as __mactsValidationError,
} from '@macts/contracts'

/** The contract's canonical decimal and safe-integer policy, built once. */
const __mactsIntegerOptionWire = __mactsValueTypes.integer().wire

/**
 * Check the original CLI spelling before converting to the numeric SDK input.
 * Canonical safe-integer text is exactly representable, so conversion after
 * this check cannot round or reinterpret the caller's chosen value.
 */
function __mactsParseIntegerOption(text: string): number {
  if (!__mactsIntegerOptionWire.safeParse({ integer: text }).success) {
    const message = 'Expected a canonical decimal integer within the safe-integer range.'
    throw new __mactsValidationError(message, { issues: [{ path: [], message }] })
  }
  return Number(text)
}

/**
 * Create a text range by character positions. When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
 */
export class CreateRangeDocumentCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'create-range']]

  static override usage = Command.Usage({
    description:
      "Create a text range by character positions. When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String({ name: 'name', required: true })
  start = Option.String('--start', {
    required: false,
    description: 'The starting character position',
  })
  end = Option.String('--end', { required: false, description: 'The ending character position' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.documents.createRange(
        this.documentId as unknown as Parameters<typeof client.documents.createRange>[0],
        this.start === undefined ? undefined : __mactsParseIntegerOption(this.start),
        this.end === undefined ? undefined : __mactsParseIntegerOption(this.end)
      )

      const output = formatter.formatSuccess('createRange completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
