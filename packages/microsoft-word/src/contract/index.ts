/**
 * The Microsoft Word contract: the transport-neutral description of every
 * Microsoft Word operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `MicrosoftWordClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `MicrosoftWordClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Microsoft Word manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type Integer,
  type OperationDescriptor,
  type Page,
  type Rgb,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** Document save format */
export type SaveFormat =
  | 'document'
  | 'documentFormat97'
  | 'template'
  | 'rtf'
  | 'text'
  | 'html'
  | 'pdf'

/** Paragraph alignment */
export type ParagraphAlignment = 'left' | 'center' | 'right' | 'justify'

/** Text underline type */
export type UnderlineType = 'none' | 'single' | 'double' | 'dotted' | 'dashed'

/** Document view type */
export type ViewType = 'normalView' | 'outlineView' | 'printView' | 'webView'

/** Field type */
export type FieldType =
  | 'fieldAddin'
  | 'fieldDate'
  | 'fieldHyperlink'
  | 'fieldPageNumber'
  | 'fieldRef'

/** A Microsoft Word document */
export interface Document {
  /**
   * The name of the document.
   * Never null: the primary identifier.
   */
  readonly name: string
  /**
   * The full path of the document in HFS format.
   * Nullable. No evidence that the app always sets it.
   */
  readonly fullName: string | null
  /**
   * The full path of the document in POSIX format.
   * Nullable. No evidence that the app always sets it.
   */
  readonly posixFullName: string | null
  /**
   * The path to the document (HFS format).
   * Nullable. No evidence that the app always sets it.
   */
  readonly path: string | null
  /**
   * Whether the document has been saved.
   * Nullable. No evidence that the app always sets it.
   */
  saved: boolean | null
  /**
   * Whether the document is read-only.
   * Nullable. No evidence that the app always sets it.
   */
  readonly readOnly: boolean | null
  /**
   * Whether this is the active document.
   * Nullable. No evidence that the app always sets it.
   */
  readonly active: boolean | null
  /**
   * The main document text.
   * Nullable. No evidence that the app always sets it.
   */
  readonly content: string | null
  /**
   * Whether changes are tracked in the document.
   * Nullable. No evidence that the app always sets it.
   */
  trackRevisions: boolean | null
  /**
   * Whether tracked changes are shown.
   * Nullable. No evidence that the app always sets it.
   */
  showRevisions: boolean | null
  /**
   * The interval in points between default tab stops.
   * Nullable. No evidence that the app always sets it.
   */
  defaultTabStop: number | null
}

/** A single paragraph in a document */
export interface Paragraph {
  /**
   * The alignment for the paragraph.
   * Nullable. No evidence that the app always sets it.
   */
  alignment: ParagraphAlignment | null
  /**
   * The first-line or hanging indent value in points.
   * Nullable. No evidence that the app always sets it.
   */
  firstLineIndent: number | null
  /**
   * The left indent in points.
   * Nullable. No evidence that the app always sets it.
   */
  leftIndent: number | null
  /**
   * The right indent in points.
   * Nullable. No evidence that the app always sets it.
   */
  rightIndent: number | null
  /**
   * The line spacing in points.
   * Nullable. No evidence that the app always sets it.
   */
  lineSpacing: number | null
  /**
   * The spacing in points after the paragraph.
   * Nullable. No evidence that the app always sets it.
   */
  spaceAfter: number | null
  /**
   * The spacing in points before the paragraph.
   * Nullable. No evidence that the app always sets it.
   */
  spaceBefore: number | null
  /**
   * Whether a page break is forced before the paragraph.
   * Nullable. No evidence that the app always sets it.
   */
  pageBreakBefore: boolean | null
  /**
   * Whether all lines remain on the same page.
   * Nullable. No evidence that the app always sets it.
   */
  keepTogether: boolean | null
  /**
   * Whether paragraph stays with next paragraph.
   * Nullable. No evidence that the app always sets it.
   */
  keepWithNext: boolean | null
  /**
   * The paragraph ID.
   * Never null: the primary identifier.
   */
  readonly paragraphId: Integer
  /**
   * The text content of the paragraph.
   * Nullable. No evidence that the app always sets it.
   */
  readonly content: string | null
}

/** A contiguous area in a document */
export interface TextRange {
  /**
   * The text in the range.
   * Nullable. No evidence that the app always sets it.
   */
  content: string | null
  /**
   * Whether the text is formatted as bold.
   * Nullable. No evidence that the app always sets it.
   */
  bold: boolean | null
  /**
   * Whether the text is formatted as italic.
   * Nullable. No evidence that the app always sets it.
   */
  italic: boolean | null
  /**
   * The underline type.
   * Nullable. No evidence that the app always sets it.
   */
  underline: UnderlineType | null
  /**
   * The font size in points.
   * Nullable. No evidence that the app always sets it.
   */
  fontSize: number | null
  /**
   * The font name.
   * Nullable. No evidence that the app always sets it.
   */
  fontName: string | null
  /**
   * The starting character position.
   * Nullable. No evidence that the app always sets it.
   */
  start: Integer | null
  /**
   * The ending character position.
   * Nullable. No evidence that the app always sets it.
   */
  end: Integer | null
}

/** The current selection in a document */
export interface Selection {
  /**
   * The text in the selection.
   * Nullable. No evidence that the app always sets it.
   */
  content: string | null
  /**
   * Whether the selection is formatted as bold.
   * Nullable. No evidence that the app always sets it.
   */
  bold: boolean | null
  /**
   * Whether the selection is formatted as italic.
   * Nullable. No evidence that the app always sets it.
   */
  italic: boolean | null
  /**
   * The font size of the selection in points.
   * Nullable. No evidence that the app always sets it.
   */
  fontSize: number | null
  /**
   * The font name of the selection.
   * Nullable. No evidence that the app always sets it.
   */
  fontName: string | null
  /**
   * The starting character position of the selection.
   * Nullable. No evidence that the app always sets it.
   */
  readonly start: Integer | null
  /**
   * The ending character position of the selection.
   * Nullable. No evidence that the app always sets it.
   */
  readonly end: Integer | null
  /**
   * The type of selection (e.g., text, table, graphic).
   * Nullable. No evidence that the app always sets it.
   */
  readonly selectionType: string | null
}

/** A table in a document */
export interface Table {
  /**
   * The number of rows in the table.
   * Nullable. No evidence that the app always sets it.
   */
  readonly rowCount: Integer | null
  /**
   * The number of columns in the table.
   * Nullable. No evidence that the app always sets it.
   */
  readonly columnCount: Integer | null
  /**
   * Whether the table is allowed to autofit.
   * Nullable. No evidence that the app always sets it.
   */
  allowAutoFit: boolean | null
  /**
   * Whether the table has borders.
   * Nullable. No evidence that the app always sets it.
   */
  borders: boolean | null
}

/** A row in a table */
export interface Row {
  /**
   * The height of the row in points.
   * Nullable. No evidence that the app always sets it.
   */
  height: number | null
  /**
   * Whether the row can break across pages.
   * Nullable. No evidence that the app always sets it.
   */
  allowBreakAcrossPages: boolean | null
  /**
   * Whether the row is formatted as a heading.
   * Nullable. No evidence that the app always sets it.
   */
  headingFormat: boolean | null
}

/** A column in a table */
export interface Column {
  /**
   * The width of the column in points.
   * Nullable. No evidence that the app always sets it.
   */
  width: number | null
  /**
   * The preferred width of the column.
   * Nullable. No evidence that the app always sets it.
   */
  preferredWidth: number | null
}

/** A cell in a table */
export interface Cell {
  /**
   * The text content of the cell.
   * Nullable. No evidence that the app always sets it.
   */
  content: string | null
  /**
   * The width of the cell in points.
   * Nullable. No evidence that the app always sets it.
   */
  width: number | null
  /**
   * The height of the cell in points.
   * Nullable. No evidence that the app always sets it.
   */
  height: number | null
  /**
   * The vertical alignment of text in the cell.
   * Nullable. No evidence that the app always sets it.
   */
  verticalAlignment: string | null
  /**
   * The row index of the cell.
   * Nullable. No evidence that the app always sets it.
   */
  readonly rowIndex: Integer | null
  /**
   * The column index of the cell.
   * Nullable. No evidence that the app always sets it.
   */
  readonly columnIndex: Integer | null
}

/** Font formatting properties */
export interface Font {
  /**
   * Whether the font is bold.
   * Nullable. No evidence that the app always sets it.
   */
  bold: boolean | null
  /**
   * Whether the font is italic.
   * Nullable. No evidence that the app always sets it.
   */
  italic: boolean | null
  /**
   * The underline type.
   * Nullable. No evidence that the app always sets it.
   */
  underline: UnderlineType | null
  /**
   * The font size in points.
   * Nullable. No evidence that the app always sets it.
   */
  size: number | null
  /**
   * The font name.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The font color.
   * Nullable. No evidence that the app always sets it.
   */
  color: Rgb | null
  /**
   * Whether the font is subscript.
   * Nullable. No evidence that the app always sets it.
   */
  subscript: boolean | null
  /**
   * Whether the font is superscript.
   * Nullable. No evidence that the app always sets it.
   */
  superscript: boolean | null
  /**
   * Whether the font has strikethrough.
   * Nullable. No evidence that the app always sets it.
   */
  strikethrough: boolean | null
  /**
   * Whether the font is all caps.
   * Nullable. No evidence that the app always sets it.
   */
  allCaps: boolean | null
}

/** Page setup properties for a document or section */
export interface PageSetup {
  /**
   * The top margin in points.
   * Nullable. No evidence that the app always sets it.
   */
  topMargin: number | null
  /**
   * The bottom margin in points.
   * Nullable. No evidence that the app always sets it.
   */
  bottomMargin: number | null
  /**
   * The left margin in points.
   * Nullable. No evidence that the app always sets it.
   */
  leftMargin: number | null
  /**
   * The right margin in points.
   * Nullable. No evidence that the app always sets it.
   */
  rightMargin: number | null
  /**
   * The page height in points.
   * Nullable. No evidence that the app always sets it.
   */
  pageHeight: number | null
  /**
   * The page width in points.
   * Nullable. No evidence that the app always sets it.
   */
  pageWidth: number | null
  /**
   * The page orientation (portrait or landscape).
   * Nullable. No evidence that the app always sets it.
   */
  orientation: string | null
  /**
   * The paper size.
   * Nullable. No evidence that the app always sets it.
   */
  paperSize: string | null
}

/** A section in a document */
export interface Section {
  /**
   * The index of the section.
   * Nullable. No evidence that the app always sets it.
   */
  readonly sectionIndex: Integer | null
  /**
   * Whether the section is protected for forms.
   * Nullable. No evidence that the app always sets it.
   */
  protectedForForms: boolean | null
}

/** A bookmark in a document */
export interface Bookmark {
  /**
   * The name of the bookmark.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The starting character position.
   * Nullable. No evidence that the app always sets it.
   */
  readonly start: Integer | null
  /**
   * The ending character position.
   * Nullable. No evidence that the app always sets it.
   */
  readonly end: Integer | null
}

/** A field in a document */
export interface Field {
  /**
   * The field type.
   * Nullable. No evidence that the app always sets it.
   */
  readonly fieldType: FieldType | null
  /**
   * The field code.
   * Nullable. No evidence that the app always sets it.
   */
  fieldCode: string | null
  /**
   * The field text.
   * Nullable. No evidence that the app always sets it.
   */
  fieldText: string | null
  /**
   * Whether the field is locked.
   * Nullable. No evidence that the app always sets it.
   */
  locked: boolean | null
  /**
   * Whether field codes are displayed.
   * Nullable. No evidence that the app always sets it.
   */
  showCodes: boolean | null
}

/** Input for creating a Document. */
export interface DocumentCreateInput {
  /** Whether the document has been saved */
  saved?: boolean
  /** Whether changes are tracked in the document */
  trackRevisions?: boolean
  /** Whether tracked changes are shown */
  showRevisions?: boolean
  /** The interval in points between default tab stops */
  defaultTabStop?: number
}

/** Input for updating a Document. Omitted fields are left unchanged. */
export interface DocumentUpdateInput {
  /**
   * Whether the document has been saved.
   * Cannot be reset: null is rejected.
   */
  saved?: boolean
  /**
   * Whether changes are tracked in the document.
   * Cannot be reset: null is rejected.
   */
  trackRevisions?: boolean
  /**
   * Whether tracked changes are shown.
   * Cannot be reset: null is rejected.
   */
  showRevisions?: boolean
  /**
   * The interval in points between default tab stops.
   * Cannot be reset: null is rejected.
   */
  defaultTabStop?: number
}

/** Input for creating a Paragraph. */
export interface ParagraphCreateInput {
  /** The alignment for the paragraph */
  alignment?: ParagraphAlignment
  /** The first-line or hanging indent value in points */
  firstLineIndent?: number
  /** The left indent in points */
  leftIndent?: number
  /** The right indent in points */
  rightIndent?: number
  /** The line spacing in points */
  lineSpacing?: number
  /** The spacing in points after the paragraph */
  spaceAfter?: number
  /** The spacing in points before the paragraph */
  spaceBefore?: number
  /** Whether a page break is forced before the paragraph */
  pageBreakBefore?: boolean
  /** Whether all lines remain on the same page */
  keepTogether?: boolean
  /** Whether paragraph stays with next paragraph */
  keepWithNext?: boolean
}

/** Input for updating a Paragraph. Omitted fields are left unchanged. */
export interface ParagraphUpdateInput {
  /**
   * The alignment for the paragraph.
   * Cannot be reset: null is rejected.
   */
  alignment?: ParagraphAlignment
  /**
   * The first-line or hanging indent value in points.
   * Cannot be reset: null is rejected.
   */
  firstLineIndent?: number
  /**
   * The left indent in points.
   * Cannot be reset: null is rejected.
   */
  leftIndent?: number
  /**
   * The right indent in points.
   * Cannot be reset: null is rejected.
   */
  rightIndent?: number
  /**
   * The line spacing in points.
   * Cannot be reset: null is rejected.
   */
  lineSpacing?: number
  /**
   * The spacing in points after the paragraph.
   * Cannot be reset: null is rejected.
   */
  spaceAfter?: number
  /**
   * The spacing in points before the paragraph.
   * Cannot be reset: null is rejected.
   */
  spaceBefore?: number
  /**
   * Whether a page break is forced before the paragraph.
   * Cannot be reset: null is rejected.
   */
  pageBreakBefore?: boolean
  /**
   * Whether all lines remain on the same page.
   * Cannot be reset: null is rejected.
   */
  keepTogether?: boolean
  /**
   * Whether paragraph stays with next paragraph.
   * Cannot be reset: null is rejected.
   */
  keepWithNext?: boolean
}

/** Input for creating a TextRange. */
export interface TextRangeCreateInput {
  /** The text in the range */
  content?: string
  /** Whether the text is formatted as bold */
  bold?: boolean
  /** Whether the text is formatted as italic */
  italic?: boolean
  /** The underline type */
  underline?: UnderlineType
  /** The font size in points */
  fontSize?: number
  /** The font name */
  fontName?: string
  /** The starting character position */
  start?: Integer
  /** The ending character position */
  end?: Integer
}

/** Input for updating a TextRange. Omitted fields are left unchanged. */
export interface TextRangeUpdateInput {
  /**
   * The text in the range.
   * Cannot be reset: null is rejected.
   */
  content?: string
  /**
   * Whether the text is formatted as bold.
   * Cannot be reset: null is rejected.
   */
  bold?: boolean
  /**
   * Whether the text is formatted as italic.
   * Cannot be reset: null is rejected.
   */
  italic?: boolean
  /**
   * The underline type.
   * Cannot be reset: null is rejected.
   */
  underline?: UnderlineType
  /**
   * The font size in points.
   * Cannot be reset: null is rejected.
   */
  fontSize?: number
  /**
   * The font name.
   * Cannot be reset: null is rejected.
   */
  fontName?: string
  /**
   * The starting character position.
   * Cannot be reset: null is rejected.
   */
  start?: Integer
  /**
   * The ending character position.
   * Cannot be reset: null is rejected.
   */
  end?: Integer
}

/** Input for creating a Selection. */
export interface SelectionCreateInput {
  /** The text in the selection */
  content?: string
  /** Whether the selection is formatted as bold */
  bold?: boolean
  /** Whether the selection is formatted as italic */
  italic?: boolean
  /** The font size of the selection in points */
  fontSize?: number
  /** The font name of the selection */
  fontName?: string
}

/** Input for updating a Selection. Omitted fields are left unchanged. */
export interface SelectionUpdateInput {
  /**
   * The text in the selection.
   * Cannot be reset: null is rejected.
   */
  content?: string
  /**
   * Whether the selection is formatted as bold.
   * Cannot be reset: null is rejected.
   */
  bold?: boolean
  /**
   * Whether the selection is formatted as italic.
   * Cannot be reset: null is rejected.
   */
  italic?: boolean
  /**
   * The font size of the selection in points.
   * Cannot be reset: null is rejected.
   */
  fontSize?: number
  /**
   * The font name of the selection.
   * Cannot be reset: null is rejected.
   */
  fontName?: string
}

/** Input for creating a Table. */
export interface TableCreateInput {
  /** Whether the table is allowed to autofit */
  allowAutoFit?: boolean
  /** Whether the table has borders */
  borders?: boolean
}

/** Input for updating a Table. Omitted fields are left unchanged. */
export interface TableUpdateInput {
  /**
   * Whether the table is allowed to autofit.
   * Cannot be reset: null is rejected.
   */
  allowAutoFit?: boolean
  /**
   * Whether the table has borders.
   * Cannot be reset: null is rejected.
   */
  borders?: boolean
}

/** Input for creating a Row. */
export interface RowCreateInput {
  /** The height of the row in points */
  height?: number
  /** Whether the row can break across pages */
  allowBreakAcrossPages?: boolean
  /** Whether the row is formatted as a heading */
  headingFormat?: boolean
}

/** Input for updating a Row. Omitted fields are left unchanged. */
export interface RowUpdateInput {
  /**
   * The height of the row in points.
   * Cannot be reset: null is rejected.
   */
  height?: number
  /**
   * Whether the row can break across pages.
   * Cannot be reset: null is rejected.
   */
  allowBreakAcrossPages?: boolean
  /**
   * Whether the row is formatted as a heading.
   * Cannot be reset: null is rejected.
   */
  headingFormat?: boolean
}

/** Input for creating a Column. */
export interface ColumnCreateInput {
  /** The width of the column in points */
  width?: number
  /** The preferred width of the column */
  preferredWidth?: number
}

/** Input for updating a Column. Omitted fields are left unchanged. */
export interface ColumnUpdateInput {
  /**
   * The width of the column in points.
   * Cannot be reset: null is rejected.
   */
  width?: number
  /**
   * The preferred width of the column.
   * Cannot be reset: null is rejected.
   */
  preferredWidth?: number
}

/** Input for creating a Cell. */
export interface CellCreateInput {
  /** The text content of the cell */
  content?: string
  /** The width of the cell in points */
  width?: number
  /** The height of the cell in points */
  height?: number
  /** The vertical alignment of text in the cell */
  verticalAlignment?: string
}

/** Input for updating a Cell. Omitted fields are left unchanged. */
export interface CellUpdateInput {
  /**
   * The text content of the cell.
   * Cannot be reset: null is rejected.
   */
  content?: string
  /**
   * The width of the cell in points.
   * Cannot be reset: null is rejected.
   */
  width?: number
  /**
   * The height of the cell in points.
   * Cannot be reset: null is rejected.
   */
  height?: number
  /**
   * The vertical alignment of text in the cell.
   * Cannot be reset: null is rejected.
   */
  verticalAlignment?: string
}

/** Input for creating a Font. */
export interface FontCreateInput {
  /** Whether the font is bold */
  bold?: boolean
  /** Whether the font is italic */
  italic?: boolean
  /** The underline type */
  underline?: UnderlineType
  /** The font size in points */
  size?: number
  /** The font name */
  name?: string
  /** The font color */
  color?: Rgb
  /** Whether the font is subscript */
  subscript?: boolean
  /** Whether the font is superscript */
  superscript?: boolean
  /** Whether the font has strikethrough */
  strikethrough?: boolean
  /** Whether the font is all caps */
  allCaps?: boolean
}

/** Input for updating a Font. Omitted fields are left unchanged. */
export interface FontUpdateInput {
  /**
   * Whether the font is bold.
   * Cannot be reset: null is rejected.
   */
  bold?: boolean
  /**
   * Whether the font is italic.
   * Cannot be reset: null is rejected.
   */
  italic?: boolean
  /**
   * The underline type.
   * Cannot be reset: null is rejected.
   */
  underline?: UnderlineType
  /**
   * The font size in points.
   * Cannot be reset: null is rejected.
   */
  size?: number
  /**
   * The font name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * The font color.
   * Cannot be reset: null is rejected.
   */
  color?: Rgb
  /**
   * Whether the font is subscript.
   * Cannot be reset: null is rejected.
   */
  subscript?: boolean
  /**
   * Whether the font is superscript.
   * Cannot be reset: null is rejected.
   */
  superscript?: boolean
  /**
   * Whether the font has strikethrough.
   * Cannot be reset: null is rejected.
   */
  strikethrough?: boolean
  /**
   * Whether the font is all caps.
   * Cannot be reset: null is rejected.
   */
  allCaps?: boolean
}

/** Input for creating a PageSetup. */
export interface PageSetupCreateInput {
  /** The top margin in points */
  topMargin?: number
  /** The bottom margin in points */
  bottomMargin?: number
  /** The left margin in points */
  leftMargin?: number
  /** The right margin in points */
  rightMargin?: number
  /** The page height in points */
  pageHeight?: number
  /** The page width in points */
  pageWidth?: number
  /** The page orientation (portrait or landscape) */
  orientation?: string
  /** The paper size */
  paperSize?: string
}

/** Input for updating a PageSetup. Omitted fields are left unchanged. */
export interface PageSetupUpdateInput {
  /**
   * The top margin in points.
   * Cannot be reset: null is rejected.
   */
  topMargin?: number
  /**
   * The bottom margin in points.
   * Cannot be reset: null is rejected.
   */
  bottomMargin?: number
  /**
   * The left margin in points.
   * Cannot be reset: null is rejected.
   */
  leftMargin?: number
  /**
   * The right margin in points.
   * Cannot be reset: null is rejected.
   */
  rightMargin?: number
  /**
   * The page height in points.
   * Cannot be reset: null is rejected.
   */
  pageHeight?: number
  /**
   * The page width in points.
   * Cannot be reset: null is rejected.
   */
  pageWidth?: number
  /**
   * The page orientation (portrait or landscape).
   * Cannot be reset: null is rejected.
   */
  orientation?: string
  /**
   * The paper size.
   * Cannot be reset: null is rejected.
   */
  paperSize?: string
}

/** Input for creating a Section. */
export interface SectionCreateInput {
  /** Whether the section is protected for forms */
  protectedForForms?: boolean
}

/** Input for updating a Section. Omitted fields are left unchanged. */
export interface SectionUpdateInput {
  /**
   * Whether the section is protected for forms.
   * Cannot be reset: null is rejected.
   */
  protectedForForms?: boolean
}

/** Input for creating a Bookmark. */
export interface BookmarkCreateInput {
  /** The name of the bookmark */
  name?: string
}

/** Input for updating a Bookmark. Omitted fields are left unchanged. */
export interface BookmarkUpdateInput {
  /**
   * The name of the bookmark.
   * Cannot be reset: null is rejected.
   */
  name?: string
}

/** Input for creating a Field. */
export interface FieldCreateInput {
  /** The field code */
  fieldCode?: string
  /** The field text */
  fieldText?: string
  /** Whether the field is locked */
  locked?: boolean
  /** Whether field codes are displayed */
  showCodes?: boolean
}

/** Input for updating a Field. Omitted fields are left unchanged. */
export interface FieldUpdateInput {
  /**
   * The field code.
   * Cannot be reset: null is rejected.
   */
  fieldCode?: string
  /**
   * The field text.
   * Cannot be reset: null is rejected.
   */
  fieldText?: string
  /**
   * Whether the field is locked.
   * Cannot be reset: null is rejected.
   */
  locked?: boolean
  /**
   * Whether field codes are displayed.
   * Cannot be reset: null is rejected.
   */
  showCodes?: boolean
}

/** A Microsoft Word document */
export interface DocumentResourceClient {
  /** List documents, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Document>>
  /**
   * Read the document identified by `id`.
   *
   * @param id - Document name. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Document>
  /** Save the specified document */
  save(options?: CallOptions): Promise<void>
  /**
   * Save the document with a new name or format
   *
   * @param fileName - The file name for the document. Does not accept null.
   * @param fileFormat - The file format for saving. Does not accept null.
   */
  saveAs(fileName: string, fileFormat?: SaveFormat, options?: CallOptions): Promise<void>
  /**
   * Close the specified document
   *
   * @param saving - Whether to save changes before closing. Does not accept null.
   */
  close(saving?: boolean, options?: CallOptions): Promise<void>
  /** Print the specified document */
  print(options?: CallOptions): Promise<void>
  /** Activate the specified document window */
  activate(options?: CallOptions): Promise<void>
  /**
   * Create a text range by character positions
   *
   * @param start - The starting character position. Does not accept null.
   * @param end - The ending character position. Does not accept null.
   */
  createRange(start?: Integer, end?: Integer, options?: CallOptions): Promise<void>
}

/**
 * The Microsoft Word client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link microsoftWordContract}.
 */
export interface MicrosoftWordClient {
  /** A Microsoft Word document */
  readonly documents: DocumentResourceClient
  /** Undo the last action */
  undo(options?: CallOptions): Promise<void>
  /** Redo the last undone action */
  redo(options?: CallOptions): Promise<void>
  /** Copy the selected content to the clipboard */
  copyObject(options?: CallOptions): Promise<void>
  /** Cut the selected content to the clipboard */
  cutObject(options?: CallOptions): Promise<void>
  /** Paste content from the clipboard */
  pasteObject(options?: CallOptions): Promise<void>
  /** Select all content in the document */
  selectAll(options?: CallOptions): Promise<void>
  /**
   * Find text in the document
   *
   * @param findText - The text to search for. Does not accept null.
   * @param matchCase - Whether to match case. Does not accept null.
   * @param matchWholeWord - Whether to match whole words only. Does not accept null.
   */
  find(
    findText: string,
    matchCase?: boolean,
    matchWholeWord?: boolean,
    options?: CallOptions
  ): Promise<void>
  /**
   * Replace text in the document
   *
   * @param findText - The text to search for. Does not accept null.
   * @param replaceWith - The replacement text. Does not accept null.
   * @param replaceAll - Whether to replace all occurrences. Does not accept null.
   */
  replace(
    findText: string,
    replaceWith: string,
    replaceAll?: boolean,
    options?: CallOptions
  ): Promise<void>
  /**
   * Insert text at the specified location
   *
   * @param text - The text to insert. Does not accept null.
   * @param at - The character position to insert at. Does not accept null.
   */
  insertText(text: string, at?: Integer, options?: CallOptions): Promise<void>
  /**
   * Create a new document
   *
   * @param attachedTemplate - Path to template for the new document. Does not accept null.
   */
  createNewDocument(attachedTemplate?: string, options?: CallOptions): Promise<void>
}

/** The members of {@link SaveFormat}, for its value type. */
const saveFormatMembers = [
  'document',
  'documentFormat97',
  'template',
  'rtf',
  'text',
  'html',
  'pdf',
] as const

/** The members of {@link ParagraphAlignment}, for its value type. */
const paragraphAlignmentMembers = ['left', 'center', 'right', 'justify'] as const

/** The members of {@link UnderlineType}, for its value type. */
const underlineTypeMembers = ['none', 'single', 'double', 'dotted', 'dashed'] as const

/** The members of {@link FieldType}, for its value type. */
const fieldTypeMembers = [
  'fieldAddin',
  'fieldDate',
  'fieldHyperlink',
  'fieldPageNumber',
  'fieldRef',
] as const

const documentRecordType: ValueType<Document> = t.record(
  {
    name: t.string({ description: 'The name of the document' }),
    fullName: t.nullable(t.string(), {
      description: 'The full path of the document in HFS format',
    }),
    posixFullName: t.nullable(t.string(), {
      description: 'The full path of the document in POSIX format',
    }),
    path: t.nullable(t.string(), { description: 'The path to the document (HFS format)' }),
    saved: t.nullable(t.boolean(), { description: 'Whether the document has been saved' }),
    readOnly: t.nullable(t.boolean(), { description: 'Whether the document is read-only' }),
    active: t.nullable(t.boolean(), { description: 'Whether this is the active document' }),
    content: t.nullable(t.string(), { description: 'The main document text' }),
    trackRevisions: t.nullable(t.boolean(), {
      description: 'Whether changes are tracked in the document',
    }),
    showRevisions: t.nullable(t.boolean(), { description: 'Whether tracked changes are shown' }),
    defaultTabStop: t.nullable(t.double(), {
      description: 'The interval in points between default tab stops',
    }),
  },
  { description: 'A Microsoft Word document' }
)

const paragraphRecordType: ValueType<Paragraph> = t.record(
  {
    alignment: t.nullable(t.enumeration(paragraphAlignmentMembers), {
      description: 'The alignment for the paragraph',
    }),
    firstLineIndent: t.nullable(t.double(), {
      description: 'The first-line or hanging indent value in points',
    }),
    leftIndent: t.nullable(t.double(), { description: 'The left indent in points' }),
    rightIndent: t.nullable(t.double(), { description: 'The right indent in points' }),
    lineSpacing: t.nullable(t.double(), { description: 'The line spacing in points' }),
    spaceAfter: t.nullable(t.double(), {
      description: 'The spacing in points after the paragraph',
    }),
    spaceBefore: t.nullable(t.double(), {
      description: 'The spacing in points before the paragraph',
    }),
    pageBreakBefore: t.nullable(t.boolean(), {
      description: 'Whether a page break is forced before the paragraph',
    }),
    keepTogether: t.nullable(t.boolean(), {
      description: 'Whether all lines remain on the same page',
    }),
    keepWithNext: t.nullable(t.boolean(), {
      description: 'Whether paragraph stays with next paragraph',
    }),
    paragraphId: t.integer({ description: 'The paragraph ID' }),
    content: t.nullable(t.string(), { description: 'The text content of the paragraph' }),
  },
  { description: 'A single paragraph in a document' }
)

const textRangeRecordType: ValueType<TextRange> = t.record(
  {
    content: t.nullable(t.string(), { description: 'The text in the range' }),
    bold: t.nullable(t.boolean(), { description: 'Whether the text is formatted as bold' }),
    italic: t.nullable(t.boolean(), { description: 'Whether the text is formatted as italic' }),
    underline: t.nullable(t.enumeration(underlineTypeMembers), {
      description: 'The underline type',
    }),
    fontSize: t.nullable(t.double(), { description: 'The font size in points' }),
    fontName: t.nullable(t.string(), { description: 'The font name' }),
    start: t.nullable(t.integer(), { description: 'The starting character position' }),
    end: t.nullable(t.integer(), { description: 'The ending character position' }),
  },
  { description: 'A contiguous area in a document' }
)

const selectionRecordType: ValueType<Selection> = t.record(
  {
    content: t.nullable(t.string(), { description: 'The text in the selection' }),
    bold: t.nullable(t.boolean(), { description: 'Whether the selection is formatted as bold' }),
    italic: t.nullable(t.boolean(), {
      description: 'Whether the selection is formatted as italic',
    }),
    fontSize: t.nullable(t.double(), { description: 'The font size of the selection in points' }),
    fontName: t.nullable(t.string(), { description: 'The font name of the selection' }),
    start: t.nullable(t.integer(), {
      description: 'The starting character position of the selection',
    }),
    end: t.nullable(t.integer(), { description: 'The ending character position of the selection' }),
    selectionType: t.nullable(t.string(), {
      description: 'The type of selection (e.g., text, table, graphic)',
    }),
  },
  { description: 'The current selection in a document' }
)

const tableRecordType: ValueType<Table> = t.record(
  {
    rowCount: t.nullable(t.integer(), { description: 'The number of rows in the table' }),
    columnCount: t.nullable(t.integer(), { description: 'The number of columns in the table' }),
    allowAutoFit: t.nullable(t.boolean(), {
      description: 'Whether the table is allowed to autofit',
    }),
    borders: t.nullable(t.boolean(), { description: 'Whether the table has borders' }),
  },
  { description: 'A table in a document' }
)

const rowRecordType: ValueType<Row> = t.record(
  {
    height: t.nullable(t.double(), { description: 'The height of the row in points' }),
    allowBreakAcrossPages: t.nullable(t.boolean(), {
      description: 'Whether the row can break across pages',
    }),
    headingFormat: t.nullable(t.boolean(), {
      description: 'Whether the row is formatted as a heading',
    }),
  },
  { description: 'A row in a table' }
)

const columnRecordType: ValueType<Column> = t.record(
  {
    width: t.nullable(t.double(), { description: 'The width of the column in points' }),
    preferredWidth: t.nullable(t.double(), { description: 'The preferred width of the column' }),
  },
  { description: 'A column in a table' }
)

const cellRecordType: ValueType<Cell> = t.record(
  {
    content: t.nullable(t.string(), { description: 'The text content of the cell' }),
    width: t.nullable(t.double(), { description: 'The width of the cell in points' }),
    height: t.nullable(t.double(), { description: 'The height of the cell in points' }),
    verticalAlignment: t.nullable(t.string(), {
      description: 'The vertical alignment of text in the cell',
    }),
    rowIndex: t.nullable(t.integer(), { description: 'The row index of the cell' }),
    columnIndex: t.nullable(t.integer(), { description: 'The column index of the cell' }),
  },
  { description: 'A cell in a table' }
)

const fontRecordType: ValueType<Font> = t.record(
  {
    bold: t.nullable(t.boolean(), { description: 'Whether the font is bold' }),
    italic: t.nullable(t.boolean(), { description: 'Whether the font is italic' }),
    underline: t.nullable(t.enumeration(underlineTypeMembers), {
      description: 'The underline type',
    }),
    size: t.nullable(t.double(), { description: 'The font size in points' }),
    name: t.nullable(t.string(), { description: 'The font name' }),
    color: t.nullable(t.rgb(), { description: 'The font color' }),
    subscript: t.nullable(t.boolean(), { description: 'Whether the font is subscript' }),
    superscript: t.nullable(t.boolean(), { description: 'Whether the font is superscript' }),
    strikethrough: t.nullable(t.boolean(), { description: 'Whether the font has strikethrough' }),
    allCaps: t.nullable(t.boolean(), { description: 'Whether the font is all caps' }),
  },
  { description: 'Font formatting properties' }
)

const pageSetupRecordType: ValueType<PageSetup> = t.record(
  {
    topMargin: t.nullable(t.double(), { description: 'The top margin in points' }),
    bottomMargin: t.nullable(t.double(), { description: 'The bottom margin in points' }),
    leftMargin: t.nullable(t.double(), { description: 'The left margin in points' }),
    rightMargin: t.nullable(t.double(), { description: 'The right margin in points' }),
    pageHeight: t.nullable(t.double(), { description: 'The page height in points' }),
    pageWidth: t.nullable(t.double(), { description: 'The page width in points' }),
    orientation: t.nullable(t.string(), {
      description: 'The page orientation (portrait or landscape)',
    }),
    paperSize: t.nullable(t.string(), { description: 'The paper size' }),
  },
  { description: 'Page setup properties for a document or section' }
)

const sectionRecordType: ValueType<Section> = t.record(
  {
    sectionIndex: t.nullable(t.integer(), { description: 'The index of the section' }),
    protectedForForms: t.nullable(t.boolean(), {
      description: 'Whether the section is protected for forms',
    }),
  },
  { description: 'A section in a document' }
)

const bookmarkRecordType: ValueType<Bookmark> = t.record(
  {
    name: t.nullable(t.string(), { description: 'The name of the bookmark' }),
    start: t.nullable(t.integer(), { description: 'The starting character position' }),
    end: t.nullable(t.integer(), { description: 'The ending character position' }),
  },
  { description: 'A bookmark in a document' }
)

const fieldRecordType: ValueType<Field> = t.record(
  {
    fieldType: t.nullable(t.enumeration(fieldTypeMembers), { description: 'The field type' }),
    fieldCode: t.nullable(t.string(), { description: 'The field code' }),
    fieldText: t.nullable(t.string(), { description: 'The field text' }),
    locked: t.nullable(t.boolean(), { description: 'Whether the field is locked' }),
    showCodes: t.nullable(t.boolean(), { description: 'Whether field codes are displayed' }),
  },
  { description: 'A field in a document' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<MicrosoftWordClient>['resources'] = {
  Document: {
    name: 'Document',
    record: documentRecordType,
    id: t.string({ description: 'The name of the document' }),
    get: 'microsoft-word.documents.get',
    list: 'microsoft-word.documents.list',
  },
  Paragraph: {
    name: 'Paragraph',
    record: paragraphRecordType,
    id: t.integer({ description: 'The paragraph ID' }),
  },
  TextRange: {
    name: 'TextRange',
    record: textRangeRecordType,
  },
  Selection: {
    name: 'Selection',
    record: selectionRecordType,
  },
  Table: {
    name: 'Table',
    record: tableRecordType,
  },
  Row: {
    name: 'Row',
    record: rowRecordType,
  },
  Column: {
    name: 'Column',
    record: columnRecordType,
  },
  Cell: {
    name: 'Cell',
    record: cellRecordType,
  },
  Font: {
    name: 'Font',
    record: fontRecordType,
  },
  PageSetup: {
    name: 'PageSetup',
    record: pageSetupRecordType,
  },
  Section: {
    name: 'Section',
    record: sectionRecordType,
  },
  Bookmark: {
    name: 'Bookmark',
    record: bookmarkRecordType,
  },
  Field: {
    name: 'Field',
    record: fieldRecordType,
  },
}

const documentListOperation: OperationDescriptor<Record<string, never>, Page<Document>> = {
  id: 'microsoft-word.documents.list',
  permission: 'microsoft-word:documents:list',
  target: { command: 'list', resource: 'Document' },
  description: 'List all documents',
  input: t.record({}),
  output: t.page(documentRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const documentGetOperation: OperationDescriptor<{ readonly id: string }, Document> = {
  id: 'microsoft-word.documents.get',
  permission: 'microsoft-word:documents:get',
  target: { command: 'get', resource: 'Document' },
  description: 'Get a document by name',
  input: t.record({
    id: t.string({ description: 'Document name' }),
  }),
  output: documentRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Document name' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const documentSaveOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.documents.save',
  permission: 'microsoft-word:documents:save',
  target: { command: 'save', resource: 'Document' },
  description: 'Save the specified document',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const documentSaveAsOperation: OperationDescriptor<
  { readonly fileName: string; readonly fileFormat?: SaveFormat | undefined },
  undefined
> = {
  id: 'microsoft-word.documents.saveAs',
  permission: 'microsoft-word:documents:save',
  target: { command: 'saveAs', resource: 'Document' },
  description: 'Save the document with a new name or format',
  input: t.record({
    fileName: t.string({ description: 'The file name for the document' }),
    fileFormat: t.optional(
      t.enumeration(saveFormatMembers, { description: 'The file format for saving' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      fileName: { type: 'string', description: 'The file name for the document' },
      fileFormat: {
        type: 'string',
        enum: ['document', 'documentFormat97', 'template', 'rtf', 'text', 'html', 'pdf'],
        description: 'The file format for saving',
      },
    },
    required: ['fileName'],
    additionalProperties: false,
  },
}

const documentCloseOperation: OperationDescriptor<
  { readonly saving?: boolean | undefined },
  undefined
> = {
  id: 'microsoft-word.documents.close',
  permission: 'microsoft-word:documents:close',
  target: { command: 'close', resource: 'Document' },
  description: 'Close the specified document',
  input: t.record({
    saving: t.optional(t.boolean({ description: 'Whether to save changes before closing' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      saving: { type: 'boolean', description: 'Whether to save changes before closing' },
    },
    additionalProperties: false,
  },
}

const documentPrintOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.documents.print',
  permission: 'microsoft-word:documents:print',
  target: { command: 'print', resource: 'Document' },
  description: 'Print the specified document',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const documentActivateOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.documents.activate',
  permission: 'microsoft-word:documents:activate',
  target: { command: 'activate', resource: 'Document' },
  description: 'Activate the specified document window',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appUndoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.undo',
  permission: 'microsoft-word:app:undo',
  target: { command: 'undo' },
  description: 'Undo the last action',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appRedoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.redo',
  permission: 'microsoft-word:app:redo',
  target: { command: 'redo' },
  description: 'Redo the last undone action',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appCopyObjectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.copyObject',
  permission: 'microsoft-word:app:copy',
  target: { command: 'copyObject' },
  description: 'Copy the selected content to the clipboard',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appCutObjectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.cutObject',
  permission: 'microsoft-word:app:cut',
  target: { command: 'cutObject' },
  description: 'Cut the selected content to the clipboard',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPasteObjectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.pasteObject',
  permission: 'microsoft-word:app:paste',
  target: { command: 'pasteObject' },
  description: 'Paste content from the clipboard',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appSelectAllOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.selectAll',
  permission: 'microsoft-word:app:selectAll',
  target: { command: 'selectAll' },
  description: 'Select all content in the document',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appFindOperation: OperationDescriptor<
  {
    readonly findText: string
    readonly matchCase?: boolean | undefined
    readonly matchWholeWord?: boolean | undefined
  },
  undefined
> = {
  id: 'microsoft-word.app.find',
  permission: 'microsoft-word:app:find',
  target: { command: 'find' },
  description: 'Find text in the document',
  input: t.record({
    findText: t.string({ description: 'The text to search for' }),
    matchCase: t.optional(t.boolean({ description: 'Whether to match case' })),
    matchWholeWord: t.optional(t.boolean({ description: 'Whether to match whole words only' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      findText: { type: 'string', description: 'The text to search for' },
      matchCase: { type: 'boolean', description: 'Whether to match case' },
      matchWholeWord: { type: 'boolean', description: 'Whether to match whole words only' },
    },
    required: ['findText'],
    additionalProperties: false,
  },
}

const appReplaceOperation: OperationDescriptor<
  {
    readonly findText: string
    readonly replaceWith: string
    readonly replaceAll?: boolean | undefined
  },
  undefined
> = {
  id: 'microsoft-word.app.replace',
  permission: 'microsoft-word:app:replace',
  target: { command: 'replace' },
  description: 'Replace text in the document',
  input: t.record({
    findText: t.string({ description: 'The text to search for' }),
    replaceWith: t.string({ description: 'The replacement text' }),
    replaceAll: t.optional(t.boolean({ description: 'Whether to replace all occurrences' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      findText: { type: 'string', description: 'The text to search for' },
      replaceWith: { type: 'string', description: 'The replacement text' },
      replaceAll: { type: 'boolean', description: 'Whether to replace all occurrences' },
    },
    required: ['findText', 'replaceWith'],
    additionalProperties: false,
  },
}

const appInsertTextOperation: OperationDescriptor<
  { readonly text: string; readonly at?: Integer | undefined },
  undefined
> = {
  id: 'microsoft-word.app.insertText',
  permission: 'microsoft-word:documents:insert',
  target: { command: 'insertText' },
  description: 'Insert text at the specified location',
  input: t.record({
    text: t.string({ description: 'The text to insert' }),
    at: t.optional(t.integer({ description: 'The character position to insert at' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The text to insert' },
      at: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'The character position to insert at',
      },
    },
    required: ['text'],
    additionalProperties: false,
  },
}

const appCreateNewDocumentOperation: OperationDescriptor<
  { readonly attachedTemplate?: string | undefined },
  undefined
> = {
  id: 'microsoft-word.app.createNewDocument',
  permission: 'microsoft-word:documents:create',
  target: { command: 'createNewDocument' },
  description: 'Create a new document',
  input: t.record({
    attachedTemplate: t.optional(
      t.string({ description: 'Path to template for the new document' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      attachedTemplate: { type: 'string', description: 'Path to template for the new document' },
    },
    additionalProperties: false,
  },
}

const documentCreateRangeOperation: OperationDescriptor<
  { readonly start?: Integer | undefined; readonly end?: Integer | undefined },
  undefined
> = {
  id: 'microsoft-word.documents.createRange',
  permission: 'microsoft-word:documents:createRange',
  target: { command: 'createRange', resource: 'Document' },
  description: 'Create a text range by character positions',
  input: t.record({
    start: t.optional(t.integer({ description: 'The starting character position' })),
    end: t.optional(t.integer({ description: 'The ending character position' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      start: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'The starting character position',
      },
      end: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'The ending character position',
      },
    },
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<MicrosoftWordClient>['operations'] = {
  'microsoft-word.documents.list': documentListOperation,
  'microsoft-word.documents.get': documentGetOperation,
  'microsoft-word.documents.save': documentSaveOperation,
  'microsoft-word.documents.saveAs': documentSaveAsOperation,
  'microsoft-word.documents.close': documentCloseOperation,
  'microsoft-word.documents.print': documentPrintOperation,
  'microsoft-word.documents.activate': documentActivateOperation,
  'microsoft-word.app.undo': appUndoOperation,
  'microsoft-word.app.redo': appRedoOperation,
  'microsoft-word.app.copyObject': appCopyObjectOperation,
  'microsoft-word.app.cutObject': appCutObjectOperation,
  'microsoft-word.app.pasteObject': appPasteObjectOperation,
  'microsoft-word.app.selectAll': appSelectAllOperation,
  'microsoft-word.app.find': appFindOperation,
  'microsoft-word.app.replace': appReplaceOperation,
  'microsoft-word.app.insertText': appInsertTextOperation,
  'microsoft-word.app.createNewDocument': appCreateNewDocumentOperation,
  'microsoft-word.documents.createRange': documentCreateRangeOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): MicrosoftWordClient {
  return {
    documents: {
      list: (options) => runtime.invoke(documentListOperation, {}, options),
      get: (id, options) => runtime.invoke(documentGetOperation, { id }, options),
      save: (options) => runtime.invoke(documentSaveOperation, {}, options),
      saveAs: (fileName, fileFormat, options) =>
        runtime.invoke(documentSaveAsOperation, { fileName, fileFormat }, options),
      close: (saving, options) => runtime.invoke(documentCloseOperation, { saving }, options),
      print: (options) => runtime.invoke(documentPrintOperation, {}, options),
      activate: (options) => runtime.invoke(documentActivateOperation, {}, options),
      createRange: (start, end, options) =>
        runtime.invoke(documentCreateRangeOperation, { start, end }, options),
    },
    undo: (options) => runtime.invoke(appUndoOperation, {}, options),
    redo: (options) => runtime.invoke(appRedoOperation, {}, options),
    copyObject: (options) => runtime.invoke(appCopyObjectOperation, {}, options),
    cutObject: (options) => runtime.invoke(appCutObjectOperation, {}, options),
    pasteObject: (options) => runtime.invoke(appPasteObjectOperation, {}, options),
    selectAll: (options) => runtime.invoke(appSelectAllOperation, {}, options),
    find: (findText, matchCase, matchWholeWord, options) =>
      runtime.invoke(appFindOperation, { findText, matchCase, matchWholeWord }, options),
    replace: (findText, replaceWith, replaceAll, options) =>
      runtime.invoke(appReplaceOperation, { findText, replaceWith, replaceAll }, options),
    insertText: (text, at, options) =>
      runtime.invoke(appInsertTextOperation, { text, at }, options),
    createNewDocument: (attachedTemplate, options) =>
      runtime.invoke(appCreateNewDocumentOperation, { attachedTemplate }, options),
  }
}

/**
 * The Microsoft Word contract. Pass it to a client factory to obtain a
 * {@link MicrosoftWordClient}.
 */
export const microsoftWordContract: AppContract<MicrosoftWordClient> = {
  app: 'microsoft-word',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
