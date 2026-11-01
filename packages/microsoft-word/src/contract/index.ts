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
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `MicrosoftWordClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { microsoftWordContract } from '@macts/microsoft-word/contract'
 *
 * const client = createClient(microsoftWordContract, { token, url })
 * ```
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
  /** The name of the document */
  readonly name: string
  /** The full path of the document in HFS format */
  readonly fullName: string
  /** The full path of the document in POSIX format */
  readonly posixFullName: string
  /** The path to the document (HFS format) */
  readonly path: string
  /** Whether the document has been saved */
  saved: boolean
  /** Whether the document is read-only */
  readonly readOnly: boolean
  /** Whether this is the active document */
  readonly active: boolean
  /** The main document text */
  readonly content: string
  /** Whether changes are tracked in the document */
  trackRevisions: boolean
  /** Whether tracked changes are shown */
  showRevisions: boolean
  /** The interval in points between default tab stops */
  defaultTabStop: number
}

/** A single paragraph in a document */
export interface Paragraph {
  /** The alignment for the paragraph */
  alignment: ParagraphAlignment
  /** The first-line or hanging indent value in points */
  firstLineIndent: number
  /** The left indent in points */
  leftIndent: number
  /** The right indent in points */
  rightIndent: number
  /** The line spacing in points */
  lineSpacing: number
  /** The spacing in points after the paragraph */
  spaceAfter: number
  /** The spacing in points before the paragraph */
  spaceBefore: number
  /** Whether a page break is forced before the paragraph */
  pageBreakBefore: boolean
  /** Whether all lines remain on the same page */
  keepTogether: boolean
  /** Whether paragraph stays with next paragraph */
  keepWithNext: boolean
  /** The paragraph ID */
  readonly paragraphId: Integer
  /** The text content of the paragraph */
  readonly content: string
}

/** A contiguous area in a document */
export interface TextRange {
  /** The text in the range */
  content: string
  /** Whether the text is formatted as bold */
  bold: boolean
  /** Whether the text is formatted as italic */
  italic: boolean
  /** The underline type */
  underline: UnderlineType
  /** The font size in points */
  fontSize: number
  /** The font name */
  fontName: string
  /** The starting character position */
  start: Integer
  /** The ending character position */
  end: Integer
}

/** The current selection in a document */
export interface Selection {
  /** The text in the selection */
  content: string
  /** Whether the selection is formatted as bold */
  bold: boolean
  /** Whether the selection is formatted as italic */
  italic: boolean
  /** The font size of the selection in points */
  fontSize: number
  /** The font name of the selection */
  fontName: string
  /** The starting character position of the selection */
  readonly start: Integer
  /** The ending character position of the selection */
  readonly end: Integer
  /** The type of selection (e.g., text, table, graphic) */
  readonly selectionType: string
}

/** A table in a document */
export interface Table {
  /** The number of rows in the table */
  readonly rowCount: Integer
  /** The number of columns in the table */
  readonly columnCount: Integer
  /** Whether the table is allowed to autofit */
  allowAutoFit: boolean
  /** Whether the table has borders */
  borders: boolean
}

/** A row in a table */
export interface Row {
  /** The height of the row in points */
  height: number
  /** Whether the row can break across pages */
  allowBreakAcrossPages: boolean
  /** Whether the row is formatted as a heading */
  headingFormat: boolean
}

/** A column in a table */
export interface Column {
  /** The width of the column in points */
  width: number
  /** The preferred width of the column */
  preferredWidth: number
}

/** A cell in a table */
export interface Cell {
  /** The text content of the cell */
  content: string
  /** The width of the cell in points */
  width: number
  /** The height of the cell in points */
  height: number
  /** The vertical alignment of text in the cell */
  verticalAlignment: string
  /** The row index of the cell */
  readonly rowIndex: Integer
  /** The column index of the cell */
  readonly columnIndex: Integer
}

/** Font formatting properties */
export interface Font {
  /** Whether the font is bold */
  bold: boolean
  /** Whether the font is italic */
  italic: boolean
  /** The underline type */
  underline: UnderlineType
  /** The font size in points */
  size: number
  /** The font name */
  name: string
  /** The font color */
  color: Rgb
  /** Whether the font is subscript */
  subscript: boolean
  /** Whether the font is superscript */
  superscript: boolean
  /** Whether the font has strikethrough */
  strikethrough: boolean
  /** Whether the font is all caps */
  allCaps: boolean
}

/** Page setup properties for a document or section */
export interface PageSetup {
  /** The top margin in points */
  topMargin: number
  /** The bottom margin in points */
  bottomMargin: number
  /** The left margin in points */
  leftMargin: number
  /** The right margin in points */
  rightMargin: number
  /** The page height in points */
  pageHeight: number
  /** The page width in points */
  pageWidth: number
  /** The page orientation (portrait or landscape) */
  orientation: string
  /** The paper size */
  paperSize: string
}

/** A section in a document */
export interface Section {
  /** The index of the section */
  readonly sectionIndex: Integer
  /** Whether the section is protected for forms */
  protectedForForms: boolean
}

/** A bookmark in a document */
export interface Bookmark {
  /** The name of the bookmark */
  name: string
  /** The starting character position */
  readonly start: Integer
  /** The ending character position */
  readonly end: Integer
}

/** A field in a document */
export interface Field {
  /** The field type */
  readonly fieldType: FieldType
  /** The field code */
  fieldCode: string
  /** The field text */
  fieldText: string
  /** Whether the field is locked */
  locked: boolean
  /** Whether field codes are displayed */
  showCodes: boolean
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
  /** Whether the document has been saved */
  saved?: boolean
  /** Whether changes are tracked in the document */
  trackRevisions?: boolean
  /** Whether tracked changes are shown */
  showRevisions?: boolean
  /** The interval in points between default tab stops */
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

/** Input for creating a Table. */
export interface TableCreateInput {
  /** Whether the table is allowed to autofit */
  allowAutoFit?: boolean
  /** Whether the table has borders */
  borders?: boolean
}

/** Input for updating a Table. Omitted fields are left unchanged. */
export interface TableUpdateInput {
  /** Whether the table is allowed to autofit */
  allowAutoFit?: boolean
  /** Whether the table has borders */
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
  /** The height of the row in points */
  height?: number
  /** Whether the row can break across pages */
  allowBreakAcrossPages?: boolean
  /** Whether the row is formatted as a heading */
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
  /** The width of the column in points */
  width?: number
  /** The preferred width of the column */
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
  /** The text content of the cell */
  content?: string
  /** The width of the cell in points */
  width?: number
  /** The height of the cell in points */
  height?: number
  /** The vertical alignment of text in the cell */
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

/** Input for creating a Section. */
export interface SectionCreateInput {
  /** Whether the section is protected for forms */
  protectedForForms?: boolean
}

/** Input for updating a Section. Omitted fields are left unchanged. */
export interface SectionUpdateInput {
  /** Whether the section is protected for forms */
  protectedForForms?: boolean
}

/** Input for creating a Bookmark. */
export interface BookmarkCreateInput {
  /** The name of the bookmark */
  name?: string
}

/** Input for updating a Bookmark. Omitted fields are left unchanged. */
export interface BookmarkUpdateInput {
  /** The name of the bookmark */
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
  /** The field code */
  fieldCode?: string
  /** The field text */
  fieldText?: string
  /** Whether the field is locked */
  locked?: boolean
  /** Whether field codes are displayed */
  showCodes?: boolean
}

/** A Microsoft Word document */
export interface DocumentResourceClient {
  /** List documents. */
  list(options?: CallOptions): Promise<readonly Document[]>
  /** Read the document identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Document>
  /** Save the specified document */
  save(options?: CallOptions): Promise<void>
  /** Save the document with a new name or format */
  saveAs(fileName: string, fileFormat?: SaveFormat, options?: CallOptions): Promise<void>
  /** Close the specified document */
  close(saving?: boolean, options?: CallOptions): Promise<void>
  /** Print the specified document */
  print(options?: CallOptions): Promise<void>
  /** Activate the specified document window */
  activate(options?: CallOptions): Promise<void>
  /** Create a text range by character positions */
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
  /** Find text in the document */
  find(
    findText: string,
    matchCase?: boolean,
    matchWholeWord?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Replace text in the document */
  replace(
    findText: string,
    replaceWith: string,
    replaceAll?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Insert text at the specified location */
  insertText(text: string, at?: Integer, options?: CallOptions): Promise<void>
  /** Create a new document */
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
    fullName: t.string({ description: 'The full path of the document in HFS format' }),
    posixFullName: t.string({ description: 'The full path of the document in POSIX format' }),
    path: t.string({ description: 'The path to the document (HFS format)' }),
    saved: t.boolean({ description: 'Whether the document has been saved' }),
    readOnly: t.boolean({ description: 'Whether the document is read-only' }),
    active: t.boolean({ description: 'Whether this is the active document' }),
    content: t.string({ description: 'The main document text' }),
    trackRevisions: t.boolean({ description: 'Whether changes are tracked in the document' }),
    showRevisions: t.boolean({ description: 'Whether tracked changes are shown' }),
    defaultTabStop: t.double({ description: 'The interval in points between default tab stops' }),
  },
  { description: 'A Microsoft Word document' }
)

const paragraphRecordType: ValueType<Paragraph> = t.record(
  {
    alignment: t.enumeration(paragraphAlignmentMembers, {
      description: 'The alignment for the paragraph',
    }),
    firstLineIndent: t.double({ description: 'The first-line or hanging indent value in points' }),
    leftIndent: t.double({ description: 'The left indent in points' }),
    rightIndent: t.double({ description: 'The right indent in points' }),
    lineSpacing: t.double({ description: 'The line spacing in points' }),
    spaceAfter: t.double({ description: 'The spacing in points after the paragraph' }),
    spaceBefore: t.double({ description: 'The spacing in points before the paragraph' }),
    pageBreakBefore: t.boolean({
      description: 'Whether a page break is forced before the paragraph',
    }),
    keepTogether: t.boolean({ description: 'Whether all lines remain on the same page' }),
    keepWithNext: t.boolean({ description: 'Whether paragraph stays with next paragraph' }),
    paragraphId: t.integer({ description: 'The paragraph ID' }),
    content: t.string({ description: 'The text content of the paragraph' }),
  },
  { description: 'A single paragraph in a document' }
)

const textRangeRecordType: ValueType<TextRange> = t.record(
  {
    content: t.string({ description: 'The text in the range' }),
    bold: t.boolean({ description: 'Whether the text is formatted as bold' }),
    italic: t.boolean({ description: 'Whether the text is formatted as italic' }),
    underline: t.enumeration(underlineTypeMembers, { description: 'The underline type' }),
    fontSize: t.double({ description: 'The font size in points' }),
    fontName: t.string({ description: 'The font name' }),
    start: t.integer({ description: 'The starting character position' }),
    end: t.integer({ description: 'The ending character position' }),
  },
  { description: 'A contiguous area in a document' }
)

const selectionRecordType: ValueType<Selection> = t.record(
  {
    content: t.string({ description: 'The text in the selection' }),
    bold: t.boolean({ description: 'Whether the selection is formatted as bold' }),
    italic: t.boolean({ description: 'Whether the selection is formatted as italic' }),
    fontSize: t.double({ description: 'The font size of the selection in points' }),
    fontName: t.string({ description: 'The font name of the selection' }),
    start: t.integer({ description: 'The starting character position of the selection' }),
    end: t.integer({ description: 'The ending character position of the selection' }),
    selectionType: t.string({ description: 'The type of selection (e.g., text, table, graphic)' }),
  },
  { description: 'The current selection in a document' }
)

const tableRecordType: ValueType<Table> = t.record(
  {
    rowCount: t.integer({ description: 'The number of rows in the table' }),
    columnCount: t.integer({ description: 'The number of columns in the table' }),
    allowAutoFit: t.boolean({ description: 'Whether the table is allowed to autofit' }),
    borders: t.boolean({ description: 'Whether the table has borders' }),
  },
  { description: 'A table in a document' }
)

const rowRecordType: ValueType<Row> = t.record(
  {
    height: t.double({ description: 'The height of the row in points' }),
    allowBreakAcrossPages: t.boolean({ description: 'Whether the row can break across pages' }),
    headingFormat: t.boolean({ description: 'Whether the row is formatted as a heading' }),
  },
  { description: 'A row in a table' }
)

const columnRecordType: ValueType<Column> = t.record(
  {
    width: t.double({ description: 'The width of the column in points' }),
    preferredWidth: t.double({ description: 'The preferred width of the column' }),
  },
  { description: 'A column in a table' }
)

const cellRecordType: ValueType<Cell> = t.record(
  {
    content: t.string({ description: 'The text content of the cell' }),
    width: t.double({ description: 'The width of the cell in points' }),
    height: t.double({ description: 'The height of the cell in points' }),
    verticalAlignment: t.string({ description: 'The vertical alignment of text in the cell' }),
    rowIndex: t.integer({ description: 'The row index of the cell' }),
    columnIndex: t.integer({ description: 'The column index of the cell' }),
  },
  { description: 'A cell in a table' }
)

const fontRecordType: ValueType<Font> = t.record(
  {
    bold: t.boolean({ description: 'Whether the font is bold' }),
    italic: t.boolean({ description: 'Whether the font is italic' }),
    underline: t.enumeration(underlineTypeMembers, { description: 'The underline type' }),
    size: t.double({ description: 'The font size in points' }),
    name: t.string({ description: 'The font name' }),
    color: t.rgb({ description: 'The font color' }),
    subscript: t.boolean({ description: 'Whether the font is subscript' }),
    superscript: t.boolean({ description: 'Whether the font is superscript' }),
    strikethrough: t.boolean({ description: 'Whether the font has strikethrough' }),
    allCaps: t.boolean({ description: 'Whether the font is all caps' }),
  },
  { description: 'Font formatting properties' }
)

const pageSetupRecordType: ValueType<PageSetup> = t.record(
  {
    topMargin: t.double({ description: 'The top margin in points' }),
    bottomMargin: t.double({ description: 'The bottom margin in points' }),
    leftMargin: t.double({ description: 'The left margin in points' }),
    rightMargin: t.double({ description: 'The right margin in points' }),
    pageHeight: t.double({ description: 'The page height in points' }),
    pageWidth: t.double({ description: 'The page width in points' }),
    orientation: t.string({ description: 'The page orientation (portrait or landscape)' }),
    paperSize: t.string({ description: 'The paper size' }),
  },
  { description: 'Page setup properties for a document or section' }
)

const sectionRecordType: ValueType<Section> = t.record(
  {
    sectionIndex: t.integer({ description: 'The index of the section' }),
    protectedForForms: t.boolean({ description: 'Whether the section is protected for forms' }),
  },
  { description: 'A section in a document' }
)

const bookmarkRecordType: ValueType<Bookmark> = t.record(
  {
    name: t.string({ description: 'The name of the bookmark' }),
    start: t.integer({ description: 'The starting character position' }),
    end: t.integer({ description: 'The ending character position' }),
  },
  { description: 'A bookmark in a document' }
)

const fieldRecordType: ValueType<Field> = t.record(
  {
    fieldType: t.enumeration(fieldTypeMembers, { description: 'The field type' }),
    fieldCode: t.string({ description: 'The field code' }),
    fieldText: t.string({ description: 'The field text' }),
    locked: t.boolean({ description: 'Whether the field is locked' }),
    showCodes: t.boolean({ description: 'Whether field codes are displayed' }),
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

const documentListOperation: OperationDescriptor<Record<string, never>, readonly Document[]> = {
  id: 'microsoft-word.documents.list',
  permission: 'word:documents:list',
  target: { command: 'list', resource: 'Document' },
  description: 'List all documents',
  input: t.record({}),
  output: t.array(documentRecordType),
}

const documentGetOperation: OperationDescriptor<{ readonly id: string }, Document> = {
  id: 'microsoft-word.documents.get',
  permission: 'word:documents:get',
  target: { command: 'get', resource: 'Document' },
  description: 'Get a document by name',
  input: t.record({
    id: t.string({ description: 'Document name' }),
  }),
  output: documentRecordType,
}

const documentSaveOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.documents.save',
  permission: 'word:documents:save',
  target: { command: 'save', resource: 'Document' },
  description: 'Save the specified document',
  input: t.record({}),
  output: t.none(),
}

const documentSaveAsOperation: OperationDescriptor<
  { readonly fileName: string; readonly fileFormat?: SaveFormat | undefined },
  undefined
> = {
  id: 'microsoft-word.documents.saveAs',
  permission: 'word:documents:save',
  target: { command: 'saveAs', resource: 'Document' },
  description: 'Save the document with a new name or format',
  input: t.record({
    fileName: t.string({ description: 'The file name for the document' }),
    fileFormat: t.optional(
      t.enumeration(saveFormatMembers, { description: 'The file format for saving' })
    ),
  }),
  output: t.none(),
}

const documentCloseOperation: OperationDescriptor<
  { readonly saving?: boolean | undefined },
  undefined
> = {
  id: 'microsoft-word.documents.close',
  permission: 'word:documents:close',
  target: { command: 'close', resource: 'Document' },
  description: 'Close the specified document',
  input: t.record({
    saving: t.optional(t.boolean({ description: 'Whether to save changes before closing' })),
  }),
  output: t.none(),
}

const documentPrintOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.documents.print',
  permission: 'word:documents:print',
  target: { command: 'print', resource: 'Document' },
  description: 'Print the specified document',
  input: t.record({}),
  output: t.none(),
}

const documentActivateOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.documents.activate',
  permission: 'word:documents:activate',
  target: { command: 'activate', resource: 'Document' },
  description: 'Activate the specified document window',
  input: t.record({}),
  output: t.none(),
}

const appUndoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.undo',
  permission: 'word:app:undo',
  target: { command: 'undo' },
  description: 'Undo the last action',
  input: t.record({}),
  output: t.none(),
}

const appRedoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.redo',
  permission: 'word:app:redo',
  target: { command: 'redo' },
  description: 'Redo the last undone action',
  input: t.record({}),
  output: t.none(),
}

const appCopyObjectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.copyObject',
  permission: 'word:app:copy',
  target: { command: 'copyObject' },
  description: 'Copy the selected content to the clipboard',
  input: t.record({}),
  output: t.none(),
}

const appCutObjectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.cutObject',
  permission: 'word:app:cut',
  target: { command: 'cutObject' },
  description: 'Cut the selected content to the clipboard',
  input: t.record({}),
  output: t.none(),
}

const appPasteObjectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.pasteObject',
  permission: 'word:app:paste',
  target: { command: 'pasteObject' },
  description: 'Paste content from the clipboard',
  input: t.record({}),
  output: t.none(),
}

const appSelectAllOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'microsoft-word.app.selectAll',
  permission: 'word:app:selectAll',
  target: { command: 'selectAll' },
  description: 'Select all content in the document',
  input: t.record({}),
  output: t.none(),
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
  permission: 'word:app:find',
  target: { command: 'find' },
  description: 'Find text in the document',
  input: t.record({
    findText: t.string({ description: 'The text to search for' }),
    matchCase: t.optional(t.boolean({ description: 'Whether to match case' })),
    matchWholeWord: t.optional(t.boolean({ description: 'Whether to match whole words only' })),
  }),
  output: t.none(),
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
  permission: 'word:app:replace',
  target: { command: 'replace' },
  description: 'Replace text in the document',
  input: t.record({
    findText: t.string({ description: 'The text to search for' }),
    replaceWith: t.string({ description: 'The replacement text' }),
    replaceAll: t.optional(t.boolean({ description: 'Whether to replace all occurrences' })),
  }),
  output: t.none(),
}

const appInsertTextOperation: OperationDescriptor<
  { readonly text: string; readonly at?: Integer | undefined },
  undefined
> = {
  id: 'microsoft-word.app.insertText',
  permission: 'word:documents:insert',
  target: { command: 'insertText' },
  description: 'Insert text at the specified location',
  input: t.record({
    text: t.string({ description: 'The text to insert' }),
    at: t.optional(t.integer({ description: 'The character position to insert at' })),
  }),
  output: t.none(),
}

const appCreateNewDocumentOperation: OperationDescriptor<
  { readonly attachedTemplate?: string | undefined },
  undefined
> = {
  id: 'microsoft-word.app.createNewDocument',
  permission: 'word:documents:create',
  target: { command: 'createNewDocument' },
  description: 'Create a new document',
  input: t.record({
    attachedTemplate: t.optional(
      t.string({ description: 'Path to template for the new document' })
    ),
  }),
  output: t.none(),
}

const documentCreateRangeOperation: OperationDescriptor<
  { readonly start?: Integer | undefined; readonly end?: Integer | undefined },
  undefined
> = {
  id: 'microsoft-word.documents.createRange',
  permission: 'word:documents:createRange',
  target: { command: 'createRange', resource: 'Document' },
  description: 'Create a text range by character positions',
  input: t.record({
    start: t.optional(t.integer({ description: 'The starting character position' })),
    end: t.optional(t.integer({ description: 'The ending character position' })),
  }),
  output: t.none(),
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
