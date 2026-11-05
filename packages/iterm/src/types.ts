/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { SaveOptions } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Window } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type WindowCreateInput = Omit<import('./contract/index.js').WindowCreateInput, 'index'> & {
  /** The index of the window, ordered front to back. Numeric values are validated by the contract before dispatch. */
  index?: number | Extract<import('./contract/index.js').WindowCreateInput['index'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type WindowUpdateInput = Omit<import('./contract/index.js').WindowUpdateInput, 'index'> & {
  /** The index of the window, ordered front to back. Numeric values are validated by the contract before dispatch. */
  index?: number | Extract<import('./contract/index.js').WindowUpdateInput['index'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Tab } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TabCreateInput = Omit<import('./contract/index.js').TabCreateInput, 'index'> & {
  /** Index of tab in parent tab view control Numeric values are validated by the contract before dispatch. */
  index?: number | Extract<import('./contract/index.js').TabCreateInput['index'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type TabUpdateInput = Omit<import('./contract/index.js').TabUpdateInput, 'index'> & {
  /** Index of tab in parent tab view control Numeric values are validated by the contract before dispatch. */
  index?: number | Extract<import('./contract/index.js').TabUpdateInput['index'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Session } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SessionCreateInput = Omit<
  import('./contract/index.js').SessionCreateInput,
  'columns' | 'rows'
> & {
  /** The columns property Numeric values are validated by the contract before dispatch. */
  columns?: number | Extract<import('./contract/index.js').SessionCreateInput['columns'], null>
  /** The rows property Numeric values are validated by the contract before dispatch. */
  rows?: number | Extract<import('./contract/index.js').SessionCreateInput['rows'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type SessionUpdateInput = Omit<
  import('./contract/index.js').SessionUpdateInput,
  'columns' | 'rows'
> & {
  /** The columns property Numeric values are validated by the contract before dispatch. */
  columns?: number | Extract<import('./contract/index.js').SessionUpdateInput['columns'], null>
  /** The rows property Numeric values are validated by the contract before dispatch. */
  rows?: number | Extract<import('./contract/index.js').SessionUpdateInput['rows'], null>
}

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const WindowSchema = z.object({
  id: z.number(),
  alternateIdentifier: z.string(),
  name: z.string(),
  index: z.number(),
  bounds: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
  closeable: z.boolean(),
  miniaturizable: z.boolean(),
  miniaturized: z.boolean(),
  resizable: z.boolean(),
  visible: z.boolean(),
  zoomable: z.boolean(),
  zoomed: z.boolean(),
  frontmost: z.boolean(),
  isHotkeyWindow: z.boolean(),
  hotkeyWindowProfile: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  origin: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ x: z.number(), y: z.number() }),
  frame: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TabSchema = z.object({
  index: z.number(),
  title: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SessionSchema = z.object({
  id: z.string(),
  isProcessing: z.boolean(),
  isAtShellPrompt: z.boolean(),
  columns: z.number(),
  rows: z.number(),
  tty: z.string(),
  contents: z.string(),
  text: z.string(),
  colorPreset: z.string(),
  backgroundColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  boldColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  cursorColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  cursorTextColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  foregroundColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  selectedTextColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  selectionColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIBlackColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIRedColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIGreenColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIYellowColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIBlueColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIMagentaColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSICyanColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIWhiteColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIBrightBlackColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIBrightRedColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIBrightGreenColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIBrightYellowColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIBrightBlueColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIBrightMagentaColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIBrightCyanColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  aNSIBrightWhiteColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  underlineColor: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  useUnderlineColor: z.boolean(),
  backgroundImage: z.string(),
  name: z.string(),
  transparency: z.number(),
  uniqueID: z.string(),
  profileName: z.string(),
  answerbackString: z.string(),
})
