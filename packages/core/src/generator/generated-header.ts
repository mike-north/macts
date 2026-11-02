/**
 * The "do not edit" notices the generator writes into a generated file's
 * leading doc comment, and their recognition.
 *
 * Two emitters write a notice: the HTTP client SDK emitter writes
 * {@link SDK_GENERATED_NOTICE}, and the contract emitter writes
 * {@link manifestGeneratedNotice}. Both emitters build their notice from this
 * module, so the text that recognizes a generated file can never drift from
 * the text the generator writes.
 *
 * Recognition exists only to seed a package's owned-output set the first time
 * it is generated without a record (see `./owned-output.ts`). Many generated
 * files carry no notice; the record, not the notice, is what decides which
 * files the generator owns.
 *
 * @packageDocumentation
 */

/** The notice the HTTP client SDK emitter writes in each file's leading doc comment. */
export const SDK_GENERATED_NOTICE = 'Auto-generated - do not edit.'

/** The fixed text before the app name in the contract emitter's notice. */
const MANIFEST_NOTICE_PREFIX = 'Generated from the '

/** The fixed text after the app name in the contract emitter's notice. */
const MANIFEST_NOTICE_SUFFIX = ' manifest; do not edit.'

/**
 * The notice the contract emitter writes in each file's leading doc comment.
 *
 * @param appName - The app's display name, as the manifest spells it
 */
export function manifestGeneratedNotice(appName: string): string {
  return `${MANIFEST_NOTICE_PREFIX}${appName}${MANIFEST_NOTICE_SUFFIX}`
}

/** The doc-comment line prefix every notice is written behind. */
const DOC_LINE_PREFIX = ' * '

/** Whether one doc-comment line is exactly a notice the generator writes. */
function isNoticeLine(line: string): boolean {
  if (!line.startsWith(DOC_LINE_PREFIX)) return false
  const text = line.slice(DOC_LINE_PREFIX.length)
  if (text === SDK_GENERATED_NOTICE) return true
  return (
    text.length > MANIFEST_NOTICE_PREFIX.length + MANIFEST_NOTICE_SUFFIX.length &&
    text.startsWith(MANIFEST_NOTICE_PREFIX) &&
    text.endsWith(MANIFEST_NOTICE_SUFFIX)
  )
}

/**
 * Whether a file's content opens with a generated header: a leading doc
 * comment (the content starts with `/**`) holding one of the generator's
 * notice lines before the comment closes.
 *
 * A notice anywhere else in the file, such as inside a later comment or a
 * string, does not count, so a handwritten file that merely mentions a notice
 * is never mistaken for generated output.
 */
export function hasGeneratedHeader(content: string): boolean {
  const lines = content.split('\n')
  if (lines[0]?.trimEnd() !== '/**') return false
  for (const line of lines.slice(1)) {
    const trimmed = line.trimEnd()
    if (trimmed.endsWith('*/')) return false
    if (isNoticeLine(trimmed)) return true
  }
  return false
}
