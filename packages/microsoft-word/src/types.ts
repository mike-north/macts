/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** Document save format */
export type SaveFormat = 'document' | 'documentFormat97' | 'template' | 'rtf' | 'text' | 'html' | 'pdf';

/** Paragraph alignment */
export type ParagraphAlignment = 'left' | 'center' | 'right' | 'justify';

/** Text underline type */
export type UnderlineType = 'none' | 'single' | 'double' | 'dotted' | 'dashed';

/** Document view type */
export type ViewType = 'normalView' | 'outlineView' | 'printView' | 'webView';

/** Field type */
export type FieldType = 'fieldAddin' | 'fieldDate' | 'fieldHyperlink' | 'fieldPageNumber' | 'fieldRef';

/** A Microsoft Word document */
export interface Document {
  /** The name of the document */
  name: string;
  /** The full path of the document in HFS format */
  fullName: string;
  /** The full path of the document in POSIX format */
  posixFullName: string;
  /** The path to the document (HFS format) */
  path: string;
  /** Whether the document has been saved */
  saved: boolean;
  /** Whether the document is read-only */
  readOnly: boolean;
  /** Whether this is the active document */
  active: boolean;
  /** The main document text */
  content: string;
  /** Whether changes are tracked in the document */
  trackRevisions: boolean;
  /** Whether tracked changes are shown */
  showRevisions: boolean;
  /** The interval in points between default tab stops */
  defaultTabStop: number;
}

/** Input for creating a Document */
export interface DocumentCreateInput {
  /** Whether the document has been saved */
  saved?: boolean;
  /** Whether changes are tracked in the document */
  trackRevisions?: boolean;
  /** Whether tracked changes are shown */
  showRevisions?: boolean;
  /** The interval in points between default tab stops */
  defaultTabStop?: number;
}

/** Input for updating a Document */
export type DocumentUpdateInput = Partial<DocumentCreateInput>;

/** A single paragraph in a document */
export interface Paragraph {
  /** The alignment for the paragraph */
  alignment: ParagraphAlignment;
  /** The first-line or hanging indent value in points */
  firstLineIndent: number;
  /** The left indent in points */
  leftIndent: number;
  /** The right indent in points */
  rightIndent: number;
  /** The line spacing in points */
  lineSpacing: number;
  /** The spacing in points after the paragraph */
  spaceAfter: number;
  /** The spacing in points before the paragraph */
  spaceBefore: number;
  /** Whether a page break is forced before the paragraph */
  pageBreakBefore: boolean;
  /** Whether all lines remain on the same page */
  keepTogether: boolean;
  /** Whether paragraph stays with next paragraph */
  keepWithNext: boolean;
  /** The paragraph ID */
  paragraphId: number;
  /** The text content of the paragraph */
  content: string;
}

/** Input for creating a Paragraph */
export interface ParagraphCreateInput {
  /** The alignment for the paragraph */
  alignment?: ParagraphAlignment;
  /** The first-line or hanging indent value in points */
  firstLineIndent?: number;
  /** The left indent in points */
  leftIndent?: number;
  /** The right indent in points */
  rightIndent?: number;
  /** The line spacing in points */
  lineSpacing?: number;
  /** The spacing in points after the paragraph */
  spaceAfter?: number;
  /** The spacing in points before the paragraph */
  spaceBefore?: number;
  /** Whether a page break is forced before the paragraph */
  pageBreakBefore?: boolean;
  /** Whether all lines remain on the same page */
  keepTogether?: boolean;
  /** Whether paragraph stays with next paragraph */
  keepWithNext?: boolean;
}

/** Input for updating a Paragraph */
export type ParagraphUpdateInput = Partial<ParagraphCreateInput>;

/** A contiguous area in a document */
export interface TextRange {
  /** The text in the range */
  content: string;
  /** Whether the text is formatted as bold */
  bold: boolean;
  /** Whether the text is formatted as italic */
  italic: boolean;
  /** The underline type */
  underline: UnderlineType;
  /** The font size in points */
  fontSize: number;
  /** The font name */
  fontName: string;
  /** The starting character position */
  start: number;
  /** The ending character position */
  end: number;
}

/** Input for creating a TextRange */
export interface TextRangeCreateInput {
  /** The text in the range */
  content?: string;
  /** Whether the text is formatted as bold */
  bold?: boolean;
  /** Whether the text is formatted as italic */
  italic?: boolean;
  /** The underline type */
  underline?: UnderlineType;
  /** The font size in points */
  fontSize?: number;
  /** The font name */
  fontName?: string;
  /** The starting character position */
  start?: number;
  /** The ending character position */
  end?: number;
}

/** Input for updating a TextRange */
export type TextRangeUpdateInput = Partial<TextRangeCreateInput>;

/** The current selection in a document */
export interface Selection {
  /** The text in the selection */
  content: string;
  /** Whether the selection is formatted as bold */
  bold: boolean;
  /** Whether the selection is formatted as italic */
  italic: boolean;
  /** The font size of the selection in points */
  fontSize: number;
  /** The font name of the selection */
  fontName: string;
  /** The starting character position of the selection */
  start: number;
  /** The ending character position of the selection */
  end: number;
  /** The type of selection (e.g., text, table, graphic) */
  selectionType: string;
}

/** Input for creating a Selection */
export interface SelectionCreateInput {
  /** The text in the selection */
  content?: string;
  /** Whether the selection is formatted as bold */
  bold?: boolean;
  /** Whether the selection is formatted as italic */
  italic?: boolean;
  /** The font size of the selection in points */
  fontSize?: number;
  /** The font name of the selection */
  fontName?: string;
}

/** Input for updating a Selection */
export type SelectionUpdateInput = Partial<SelectionCreateInput>;

/** A table in a document */
export interface Table {
  /** The number of rows in the table */
  rowCount: number;
  /** The number of columns in the table */
  columnCount: number;
  /** Whether the table is allowed to autofit */
  allowAutoFit: boolean;
  /** Whether the table has borders */
  borders: boolean;
}

/** Input for creating a Table */
export interface TableCreateInput {
  /** Whether the table is allowed to autofit */
  allowAutoFit?: boolean;
  /** Whether the table has borders */
  borders?: boolean;
}

/** Input for updating a Table */
export type TableUpdateInput = Partial<TableCreateInput>;

/** A row in a table */
export interface Row {
  /** The height of the row in points */
  height: number;
  /** Whether the row can break across pages */
  allowBreakAcrossPages: boolean;
  /** Whether the row is formatted as a heading */
  headingFormat: boolean;
}

/** Input for creating a Row */
export interface RowCreateInput {
  /** The height of the row in points */
  height?: number;
  /** Whether the row can break across pages */
  allowBreakAcrossPages?: boolean;
  /** Whether the row is formatted as a heading */
  headingFormat?: boolean;
}

/** Input for updating a Row */
export type RowUpdateInput = Partial<RowCreateInput>;

/** A column in a table */
export interface Column {
  /** The width of the column in points */
  width: number;
  /** The preferred width of the column */
  preferredWidth: number;
}

/** Input for creating a Column */
export interface ColumnCreateInput {
  /** The width of the column in points */
  width?: number;
  /** The preferred width of the column */
  preferredWidth?: number;
}

/** Input for updating a Column */
export type ColumnUpdateInput = Partial<ColumnCreateInput>;

/** A cell in a table */
export interface Cell {
  /** The text content of the cell */
  content: string;
  /** The width of the cell in points */
  width: number;
  /** The height of the cell in points */
  height: number;
  /** The vertical alignment of text in the cell */
  verticalAlignment: string;
  /** The row index of the cell */
  rowIndex: number;
  /** The column index of the cell */
  columnIndex: number;
}

/** Input for creating a Cell */
export interface CellCreateInput {
  /** The text content of the cell */
  content?: string;
  /** The width of the cell in points */
  width?: number;
  /** The height of the cell in points */
  height?: number;
  /** The vertical alignment of text in the cell */
  verticalAlignment?: string;
}

/** Input for updating a Cell */
export type CellUpdateInput = Partial<CellCreateInput>;

/** Font formatting properties */
export interface Font {
  /** Whether the font is bold */
  bold: boolean;
  /** Whether the font is italic */
  italic: boolean;
  /** The underline type */
  underline: UnderlineType;
  /** The font size in points */
  size: number;
  /** The font name */
  name: string;
  /** The font color */
  color: { r: number; g: number; b: number };
  /** Whether the font is subscript */
  subscript: boolean;
  /** Whether the font is superscript */
  superscript: boolean;
  /** Whether the font has strikethrough */
  strikethrough: boolean;
  /** Whether the font is all caps */
  allCaps: boolean;
}

/** Input for creating a Font */
export interface FontCreateInput {
  /** Whether the font is bold */
  bold?: boolean;
  /** Whether the font is italic */
  italic?: boolean;
  /** The underline type */
  underline?: UnderlineType;
  /** The font size in points */
  size?: number;
  /** The font name */
  name?: string;
  /** The font color */
  color?: { r: number; g: number; b: number };
  /** Whether the font is subscript */
  subscript?: boolean;
  /** Whether the font is superscript */
  superscript?: boolean;
  /** Whether the font has strikethrough */
  strikethrough?: boolean;
  /** Whether the font is all caps */
  allCaps?: boolean;
}

/** Input for updating a Font */
export type FontUpdateInput = Partial<FontCreateInput>;

/** Page setup properties for a document or section */
export interface PageSetup {
  /** The top margin in points */
  topMargin: number;
  /** The bottom margin in points */
  bottomMargin: number;
  /** The left margin in points */
  leftMargin: number;
  /** The right margin in points */
  rightMargin: number;
  /** The page height in points */
  pageHeight: number;
  /** The page width in points */
  pageWidth: number;
  /** The page orientation (portrait or landscape) */
  orientation: string;
  /** The paper size */
  paperSize: string;
}

/** Input for creating a PageSetup */
export interface PageSetupCreateInput {
  /** The top margin in points */
  topMargin?: number;
  /** The bottom margin in points */
  bottomMargin?: number;
  /** The left margin in points */
  leftMargin?: number;
  /** The right margin in points */
  rightMargin?: number;
  /** The page height in points */
  pageHeight?: number;
  /** The page width in points */
  pageWidth?: number;
  /** The page orientation (portrait or landscape) */
  orientation?: string;
  /** The paper size */
  paperSize?: string;
}

/** Input for updating a PageSetup */
export type PageSetupUpdateInput = Partial<PageSetupCreateInput>;

/** A section in a document */
export interface Section {
  /** The index of the section */
  sectionIndex: number;
  /** Whether the section is protected for forms */
  protectedForForms: boolean;
}

/** Input for creating a Section */
export interface SectionCreateInput {
  /** Whether the section is protected for forms */
  protectedForForms?: boolean;
}

/** Input for updating a Section */
export type SectionUpdateInput = Partial<SectionCreateInput>;

/** A bookmark in a document */
export interface Bookmark {
  /** The name of the bookmark */
  name: string;
  /** The starting character position */
  start: number;
  /** The ending character position */
  end: number;
}

/** Input for creating a Bookmark */
export interface BookmarkCreateInput {
  /** The name of the bookmark */
  name?: string;
}

/** Input for updating a Bookmark */
export type BookmarkUpdateInput = Partial<BookmarkCreateInput>;

/** A field in a document */
export interface Field {
  /** The field type */
  fieldType: FieldType;
  /** The field code */
  fieldCode: string;
  /** The field text */
  fieldText: string;
  /** Whether the field is locked */
  locked: boolean;
  /** Whether field codes are displayed */
  showCodes: boolean;
}

/** Input for creating a Field */
export interface FieldCreateInput {
  /** The field code */
  fieldCode?: string;
  /** The field text */
  fieldText?: string;
  /** Whether the field is locked */
  locked?: boolean;
  /** Whether field codes are displayed */
  showCodes?: boolean;
}

/** Input for updating a Field */
export type FieldUpdateInput = Partial<FieldCreateInput>;

// Zod schemas for runtime validation

export const DocumentSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  posixFullName: z.string(),
  path: z.string(),
  saved: z.boolean(),
  readOnly: z.boolean(),
  active: z.boolean(),
  content: z.string(),
  trackRevisions: z.boolean(),
  showRevisions: z.boolean(),
  defaultTabStop: z.number(),
});

export const ParagraphSchema = z.object({
  alignment: z.string(),
  firstLineIndent: z.number(),
  leftIndent: z.number(),
  rightIndent: z.number(),
  lineSpacing: z.number(),
  spaceAfter: z.number(),
  spaceBefore: z.number(),
  pageBreakBefore: z.boolean(),
  keepTogether: z.boolean(),
  keepWithNext: z.boolean(),
  paragraphId: z.number(),
  content: z.string(),
});

export const TextRangeSchema = z.object({
  content: z.string(),
  bold: z.boolean(),
  italic: z.boolean(),
  underline: z.string(),
  fontSize: z.number(),
  fontName: z.string(),
  start: z.number(),
  end: z.number(),
});

export const SelectionSchema = z.object({
  content: z.string(),
  bold: z.boolean(),
  italic: z.boolean(),
  fontSize: z.number(),
  fontName: z.string(),
  start: z.number(),
  end: z.number(),
  selectionType: z.string(),
});

export const TableSchema = z.object({
  rowCount: z.number(),
  columnCount: z.number(),
  allowAutoFit: z.boolean(),
  borders: z.boolean(),
});

export const RowSchema = z.object({
  height: z.number(),
  allowBreakAcrossPages: z.boolean(),
  headingFormat: z.boolean(),
});

export const ColumnSchema = z.object({
  width: z.number(),
  preferredWidth: z.number(),
});

export const CellSchema = z.object({
  content: z.string(),
  width: z.number(),
  height: z.number(),
  verticalAlignment: z.string(),
  rowIndex: z.number(),
  columnIndex: z.number(),
});

export const FontSchema = z.object({
  bold: z.boolean(),
  italic: z.boolean(),
  underline: z.string(),
  size: z.number(),
  name: z.string(),
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  subscript: z.boolean(),
  superscript: z.boolean(),
  strikethrough: z.boolean(),
  allCaps: z.boolean(),
});

export const PageSetupSchema = z.object({
  topMargin: z.number(),
  bottomMargin: z.number(),
  leftMargin: z.number(),
  rightMargin: z.number(),
  pageHeight: z.number(),
  pageWidth: z.number(),
  orientation: z.string(),
  paperSize: z.string(),
});

export const SectionSchema = z.object({
  sectionIndex: z.number(),
  protectedForForms: z.boolean(),
});

export const BookmarkSchema = z.object({
  name: z.string(),
  start: z.number(),
  end: z.number(),
});

export const FieldSchema = z.object({
  fieldType: z.string(),
  fieldCode: z.string(),
  fieldText: z.string(),
  locked: z.boolean(),
  showCodes: z.boolean(),
});
