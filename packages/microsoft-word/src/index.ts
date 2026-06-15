/**
 * Microsoft Word HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { MicrosoftWordClient } from '@macts/sdk-microsoft word';
 *
 * const client = new MicrosoftWordClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { MicrosoftWordClient, MicrosoftWordError, HttpClient } from './client.js'
export type { MicrosoftWordClientOptions } from './client.js'
export * from './types.js'
export { DocumentResourceClient } from './resources/document.js'
export { ParagraphResourceClient } from './resources/paragraph.js'
export { TextRangeResourceClient } from './resources/textrange.js'
export { SelectionResourceClient } from './resources/selection.js'
export { TableResourceClient } from './resources/table.js'
export { RowResourceClient } from './resources/row.js'
export { ColumnResourceClient } from './resources/column.js'
export { CellResourceClient } from './resources/cell.js'
export { FontResourceClient } from './resources/font.js'
export { PageSetupResourceClient } from './resources/pagesetup.js'
export { SectionResourceClient } from './resources/section.js'
export { BookmarkResourceClient } from './resources/bookmark.js'
export { FieldResourceClient } from './resources/field.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
