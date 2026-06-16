import { Command, Option } from 'clipanion'
import { inspectCapability } from '@macts/core'
import { createFormatter } from '../../output/index.js'
import { loadRegistry } from './registry.js'
import { loadActiveGovernanceFilter } from './policy.js'

/**
 * Inspect a single capability by its stable name.
 *
 * Prints the capability's input schema, required permission, risk
 * classification, and app dependency.
 */
export class CapabilitiesInspectCommand extends Command {
  static override paths = [['capabilities', 'inspect']]

  static override usage = Command.Usage({
    description: 'Inspect a capability (schema, permission, risk, app dependency)',
    details: `
      Prints the full descriptor for a single capability identified by its stable
      name (e.g. calendar.events.create): its input schema, the required
      permission, its risk classification, the app it depends on, and the snippet
      to call it.
    `,
    examples: [
      ['Inspect the create-event capability', '$0 capabilities inspect calendar.events.create'],
      ['Inspect as JSON', '$0 capabilities inspect calendar.events.create --json'],
    ],
  })

  capability = Option.String({ required: true })
  json = Option.Boolean('--json', { description: 'Output as JSON' })
  manifestsDir = Option.String('--manifests-dir', {
    description: 'Directory containing app manifests (auto-detected by default)',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const [{ registry }, governance] = await Promise.all([
        loadRegistry(this.manifestsDir),
        loadActiveGovernanceFilter(this.context.stderr),
      ])
      // Route inspection through the same governance seam as search, so a
      // capability denied by the active policy cannot be retrieved by name.
      // The active filter is loaded from $MACTS_HOME/policy.json when present.
      const outcome = inspectCapability(registry, this.capability, governance)

      if (outcome.kind === 'not-found') {
        this.context.stderr.write(
          formatter.formatError(
            `Unknown capability: ${this.capability}. Run \`macts capabilities search <intent>\` to discover available capabilities.`
          ) + '\n'
        )
        return 1
      }

      if (outcome.kind === 'denied') {
        // Do not leak the descriptor; surface a structured not-available result.
        const reason = outcome.reason ?? 'denied by the active governance policy'
        this.context.stderr.write(
          formatter.formatError(`Capability "${this.capability}" is not available: ${reason}.`) +
            '\n'
        )
        return 1
      }

      const { capability } = outcome

      if (this.json) {
        this.context.stdout.write(
          formatter.format({
            name: capability.name,
            app: capability.app,
            appBundleId: capability.appBundleId,
            resource: capability.resource,
            operation: capability.operation,
            description: capability.description,
            risk: capability.risk,
            permission: capability.permission ?? null,
            inputSchema: capability.inputSchema,
            call: capability.cliSnippet,
            mcpTool: capability.mcpToolName,
          }) + '\n'
        )
        return 0
      }

      this.context.stdout.write(`\n${capability.name}\n`)
      this.context.stdout.write('='.repeat(48) + '\n\n')
      this.context.stdout.write(`Description: ${capability.description}\n`)
      this.context.stdout.write(`App:         ${capability.app} (${capability.appBundleId})\n`)
      this.context.stdout.write(`Risk:        ${capability.risk}\n`)
      this.context.stdout.write(`Permission:  ${capability.permission ?? '(none — ungoverned)'}\n`)
      this.context.stdout.write(`Call:        ${capability.cliSnippet}\n`)
      this.context.stdout.write('\nInput schema:\n')
      this.context.stdout.write(JSON.stringify(capability.inputSchema, null, 2) + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
