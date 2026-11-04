/**
 * The lines `macts probe --nullability` prints after it writes the manifest.
 *
 * They say what the write did: that evidence was written, which resources
 * kept an earlier probe record, and each claim the probe decided on that the
 * manifest had nowhere to hold. A dropped claim is named on its own line, so
 * the "Wrote" line never stands for a claim that was not written.
 */

import type { NotWrittenClaim, NullabilityWriteResult } from '@macts/core'

/** Why a claim was not written, as the end of its "Did not write" line. */
const NOT_WRITTEN_REASON: Record<NotWrittenClaim['reason'], (claim: NotWrittenClaim) => string> = {
  'not-declared': (claim) => `${claim.resource} neither declares nor inherits "${claim.property}"`,
  'evidence-not-mapping': () => 'its evidence is not a mapping, so the claim cannot be added',
}

/**
 * The lines, each ending in a newline, that report writing `written` to the
 * manifest at `manifestPath`.
 */
export function nullabilityWriteNotes(
  manifestPath: string,
  written: NullabilityWriteResult
): string[] {
  const lines = [`Wrote nullability evidence to ${manifestPath}\n`]
  if (written.keptEarlierBlocks.length > 0) {
    lines.push(
      `Kept the earlier nullability probe record for ${written.keptEarlierBlocks.join(', ')}: this probe read no items there.\n`
    )
  }
  for (const claim of written.notWritten) {
    lines.push(
      `Did not write the nullability claim for ${claim.resource}.${claim.property}: ${NOT_WRITTEN_REASON[claim.reason](claim)}.\n`
    )
  }
  return lines
}
