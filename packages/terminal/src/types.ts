/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Window } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type WindowCreateInput = import('./contract/index.js').WindowCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type WindowUpdateInput = import('./contract/index.js').WindowUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Tab } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TabCreateInput = import('./contract/index.js').TabCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type TabUpdateInput = import('./contract/index.js').TabUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SettingsSet } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SettingsSetCreateInput = import('./contract/index.js').SettingsSetCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SettingsSetUpdateInput = import('./contract/index.js').SettingsSetUpdateInput

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const WindowSchema = z.object({
  name: z.string(),
  id: z.number(),
  position: z.string(),
  visible: z.boolean(),
  frontmost: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TabSchema = z.object({
  id: z.string().optional(),
  contents: z.string(),
  history: z.string(),
  busy: z.boolean(),
  processes: z.string(),
  selected: z.boolean(),
  titleDisplaysCustomTitle: z.boolean(),
  customTitle: z.string(),
  tty: z.string(),
  currentSettings: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SettingsSetSchema = z.object({
  name: z.string(),
  id: z.number(),
  numberOfRows: z.number(),
  numberOfColumns: z.number(),
  fontName: z.string(),
  fontSize: z.number(),
})
