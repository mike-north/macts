import { Command, Option } from 'clipanion'
import { resolveDiscoveryLimit, governedDiscoverySearch, ALLOW_ALL_GOVERNANCE } from '@macts/core'
import { createFormatter } from '../../output/index.js'
import { loadRegistry } from './registry.js'

/** Default number of search results when `--limit` is absent or invalid. */
const DEFAULT_SEARCH_LIMIT = 10

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
      // Validate `--limit`: a non-positive-integer value (e.g. `--limit foo`)
      // would otherwise reach `slice(0, NaN)` and silently empty the results.
      const limit = resolveDiscoveryLimit(this.limit, DEFAULT_SEARCH_LIMIT)

      // governedDiscoverySearch applies governance BEFORE slicing so that
      // denied capabilities are replaced by lower-ranked allowed ones, and
      // "--limit N" means "N usable results", not "N results then drop some".
      // The active governance filter (no-op pass-through by default) is
      // supplied by the governance workstream when a real policy is active.
      const outcome = governedDiscoverySearch(registry, this.intent, limit, ALLOW_ALL_GOVERNANCE)

      // Distinguish "nothing matched" (suggest generating a capability) from
      // "matches existed but governance denied them all" (do NOT suggest
      // generation — a different policy could surface them).
      if (outcome.kind === 'no-match') {
        return this.reportNoMatch(formatter)
      }
      if (outcome.kind === 'governance-blocked') {
        return this.reportGovernanceBlocked(formatter, outcome.deniedCount)
      }

      const governed = outcome.governed

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
              call: g.capability.cliSnippet,
              governance: g.decision.disposition,
              score: g.score,
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

  /**
   * Report the governance-blocked case: capabilities matched the intent but the
   * active policy denied every one of them. Unlike the no-match case, the next
   * move is to seek approval for the existing capabilities — never to generate a
   * new one, which would not change the policy outcome.
   */
  private reportGovernanceBlocked(
    formatter: ReturnType<typeof createFormatter>,
    deniedCount: number
  ): number {
    const message = `${String(deniedCount)} matching ${deniedCount === 1 ? 'capability is' : 'capabilities are'} denied by the active governance policy.`
    if (this.json) {
      this.context.stdout.write(
        formatter.format({
          intent: this.intent,
          results: [],
          governance: 'denied',
          deniedCount,
          message,
        }) + '\n'
      )
    } else {
      this.context.stdout.write(`\n${message}\n`)
      this.context.stdout.write(
        `\nThese capabilities exist but are blocked by policy. Request approval rather than generating a new capability.\n`
      )
    }
    return 0
  }
}
