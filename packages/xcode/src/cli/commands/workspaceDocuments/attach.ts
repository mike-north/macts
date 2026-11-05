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
 * Start a new debugging session in the workspace. When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
 */
export class AttachWorkspaceDocumentCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'attach']]

  static override usage = Command.Usage({
    description:
      "Start a new debugging session in the workspace. When several workspace documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workspaceDocumentId = Option.String({ name: 'name', required: true })
  toProcessIdentifier = Option.String('--to-process-identifier', {
    required: true,
    description: 'The process identifier (pid) to which to attach',
  })
  suspended = Option.Boolean('--suspended', {
    description: 'Whether to start debugging in a suspended state',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.workspaceDocuments.attach(
        this.workspaceDocumentId as unknown as Parameters<
          typeof client.workspaceDocuments.attach
        >[0],
        __mactsParseIntegerOption(this.toProcessIdentifier),
        this.suspended as unknown as Parameters<typeof client.workspaceDocuments.attach>[2]
      )

      const output = formatter.formatSuccess('attach completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
