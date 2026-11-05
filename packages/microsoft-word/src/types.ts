/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { SaveFormat } from './contract/index.js'

export type { ParagraphAlignment } from './contract/index.js'

export type { UnderlineType } from './contract/index.js'

export type { ViewType } from './contract/index.js'

export type { FieldType } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Document } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type DocumentCreateInput = import('./contract/index.js').DocumentCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type DocumentUpdateInput = import('./contract/index.js').DocumentUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Paragraph } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ParagraphCreateInput = import('./contract/index.js').ParagraphCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ParagraphUpdateInput = import('./contract/index.js').ParagraphUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { TextRange } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TextRangeCreateInput = Omit<
  import('./contract/index.js').TextRangeCreateInput,
  'start' | 'end'
> & {
  /** The starting character position Numeric values are validated by the contract before dispatch. */
  start?: number | Extract<import('./contract/index.js').TextRangeCreateInput['start'], null>
  /** The ending character position Numeric values are validated by the contract before dispatch. */
  end?: number | Extract<import('./contract/index.js').TextRangeCreateInput['end'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type TextRangeUpdateInput = Omit<
  import('./contract/index.js').TextRangeUpdateInput,
  'start' | 'end'
> & {
  /** The starting character position Numeric values are validated by the contract before dispatch. */
  start?: number | Extract<import('./contract/index.js').TextRangeUpdateInput['start'], null>
  /** The ending character position Numeric values are validated by the contract before dispatch. */
  end?: number | Extract<import('./contract/index.js').TextRangeUpdateInput['end'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Selection } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SelectionCreateInput = import('./contract/index.js').SelectionCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SelectionUpdateInput = import('./contract/index.js').SelectionUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Table } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TableCreateInput = import('./contract/index.js').TableCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type TableUpdateInput = import('./contract/index.js').TableUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Row } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type RowCreateInput = import('./contract/index.js').RowCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type RowUpdateInput = import('./contract/index.js').RowUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Column } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ColumnCreateInput = import('./contract/index.js').ColumnCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ColumnUpdateInput = import('./contract/index.js').ColumnUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Cell } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type CellCreateInput = import('./contract/index.js').CellCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type CellUpdateInput = import('./contract/index.js').CellUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Font } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FontCreateInput = import('./contract/index.js').FontCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FontUpdateInput = import('./contract/index.js').FontUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { PageSetup } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type PageSetupCreateInput = import('./contract/index.js').PageSetupCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type PageSetupUpdateInput = import('./contract/index.js').PageSetupUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Section } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SectionCreateInput = import('./contract/index.js').SectionCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SectionUpdateInput = import('./contract/index.js').SectionUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Bookmark } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BookmarkCreateInput = import('./contract/index.js').BookmarkCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type BookmarkUpdateInput = import('./contract/index.js').BookmarkUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Field } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FieldCreateInput = import('./contract/index.js').FieldCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FieldUpdateInput = import('./contract/index.js').FieldUpdateInput

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const DocumentSchema = z.object({
  id: z.string().optional(),
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
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ParagraphSchema = z.object({
  id: z.string().optional(),
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
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TextRangeSchema = z.object({
  content: z.string(),
  bold: z.boolean(),
  italic: z.boolean(),
  underline: z.string(),
  fontSize: z.number(),
  fontName: z.string(),
  start: z.number(),
  end: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SelectionSchema = z.object({
  content: z.string(),
  bold: z.boolean(),
  italic: z.boolean(),
  fontSize: z.number(),
  fontName: z.string(),
  start: z.number(),
  end: z.number(),
  selectionType: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TableSchema = z.object({
  rowCount: z.number(),
  columnCount: z.number(),
  allowAutoFit: z.boolean(),
  borders: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RowSchema = z.object({
  height: z.number(),
  allowBreakAcrossPages: z.boolean(),
  headingFormat: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ColumnSchema = z.object({
  width: z.number(),
  preferredWidth: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const CellSchema = z.object({
  content: z.string(),
  width: z.number(),
  height: z.number(),
  verticalAlignment: z.string(),
  rowIndex: z.number(),
  columnIndex: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PageSetupSchema = z.object({
  topMargin: z.number(),
  bottomMargin: z.number(),
  leftMargin: z.number(),
  rightMargin: z.number(),
  pageHeight: z.number(),
  pageWidth: z.number(),
  orientation: z.string(),
  paperSize: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SectionSchema = z.object({
  sectionIndex: z.number(),
  protectedForForms: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BookmarkSchema = z.object({
  name: z.string(),
  start: z.number(),
  end: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FieldSchema = z.object({
  fieldType: z.string(),
  fieldCode: z.string(),
  fieldText: z.string(),
  locked: z.boolean(),
  showCodes: z.boolean(),
})
