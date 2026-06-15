import { Command, Option } from 'clipanion'
import { searchCapabilities, applyGovernance, ALLOW_ALL_GOVERNANCE } from '@macts/core'
import { createFormatter } from '../../output/index.js'
import { loadRegistry } from './registry.js'

/**
 * Search for capabilities matching an intent.
 *
 * Returns capabilities ranked by a deterministic lexical match over each
 * capability's name, app, resource, operation, and description keywords, along
 * with the snippet to call each. When nothing matches, surfaces "generate a new
 * capability" as the next move rather than any UI-driving fallback.
 */
export class CapabilitiesSearchCommand extends Command {
  static override paths = [['capabilities', 'search']]

  static override usage = Command.Usage({
    description: 'Search typed capabilities for an intent',
    details: `
      Ranks available capabilities against a free-text intent and prints, for
      each match, the capability name, app dependency, risk, required permission,
      and the CLI snippet to invoke it.

      Ranking is a deterministic lexical match (exact operation > resource > app >
      keyword > keyword-prefix). When nothing matches, the command suggests
      generating a new capability instead of falling back to UI automation.
    `,
    examples: [
      ['Find a way to create a calendar event', '$0 capabilities search "create calendar event"'],
      ['Search and emit JSON', '$0 capabilities search "send a message" --json'],
    ],
  })

  intent = Option.String({ required: true })
  json = Option.Boolean('--json', { description: 'Output as JSON' })
  limit = Option.String('--limit', { description: 'Maximum number of results (default: 10)' })
  manifestsDir = Option.String('--manifests-dir', {
    description: 'Directory containing app manifests (auto-detected by default)',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const { registry } = await loadRegistry(this.manifestsDir)
      const limit = this.limit ? Number.parseInt(this.limit, 10) : 10
      const ranked = searchCapabilities(registry, this.intent, { limit })

      // Apply the active governance filter (no-op pass-through by default).
      // The governance workstream will supply a real policy here.
      const matches = ranked.map((r) => r.capability)
      const governed = applyGovernance(matches, ALLOW_ALL_GOVERNANCE)
      const scoreByName = new Map(ranked.map((r) => [r.capability.name, r.score]))

      if (governed.length === 0) {
        return this.reportNoMatch(formatter)
      }

      if (this.json) {
        this.context.stdout.write(
          formatter.format({
            intent: this.intent,
            results: governed.map((g) => ({
              name: g.capability.name,
              app: g.capability.app,
              risk: g.capability.risk,
              permission: g.capability.permission ?? null,
              description: g.capability.description,
              score: scoreByName.get(g.capability.name) ?? 0,
              call: g.capability.cliSnippet,
              governance: g.decision.disposition,
            })),
          }) + '\n'
        )
        return 0
      }

      this.context.stdout.write(`\nCapabilities for: "${this.intent}"\n`)
      this.context.stdout.write('='.repeat(48) + '\n\n')
      for (const { capability, decision } of governed) {
        const warn = decision.disposition === 'warn' ? ' [needs approval]' : ''
        this.context.stdout.write(`${capability.name}  (${capability.risk})${warn}\n`)
        this.context.stdout.write(`  ${capability.description}\n`)
        this.context.stdout.write(`  call: ${capability.cliSnippet}\n\n`)
      }
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }

  /**
   * Report the no-match case. Per product direction, the next move is to
   * generate a new typed capability — never a UI/pixel fallback.
   */
  private reportNoMatch(formatter: ReturnType<typeof createFormatter>): number {
    const suggestion =
      'No matching capability. Generate a new one from a manifest with `macts generate <manifest> --out-dir packages` instead of driving the UI.'
    if (this.json) {
      this.context.stdout.write(
        formatter.format({
          intent: this.intent,
          results: [],
          nextMove: 'generate-capability',
          suggestion,
        }) + '\n'
      )
    } else {
      this.context.stdout.write(`\nNo capability matches "${this.intent}".\n\n`)
      this.context.stdout.write(`Next move: ${suggestion}\n`)
    }
    return 0
  }
}
