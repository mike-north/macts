/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** A Terminal window */
export interface Window {
  /** The title of the window */
  name: string
  /** The unique identifier of the window */
  id: number
  /** The position of the window */
  position: string
  /** Whether the window is visible */
  visible: boolean
  /** Whether the window is the frontmost window */
  frontmost: boolean
}

/** Input for creating a Window */
export interface WindowCreateInput {
  /** The position of the window */
  position?: string
  /** Whether the window is visible */
  visible?: boolean
}

/** Input for updating a Window */
export type WindowUpdateInput = Partial<WindowCreateInput>

/** A Terminal tab */
export interface Tab {
  /** The visible contents of the tab */
  contents: string
  /** The complete history contents of the tab */
  history: string
  /** Whether the tab is busy running a process */
  busy: boolean
  /** The currently running processes in the tab */
  processes: string
  /** Whether the tab is selected */
  selected: boolean
  /** Whether the title displays a custom title */
  titleDisplaysCustomTitle: boolean
  /** The custom title of the tab */
  customTitle: string
  /** The tty device of the tab */
  tty: string
  /** The name of the current settings set */
  currentSettings: string
}

/** Input for creating a Tab */
export interface TabCreateInput {
  /** Whether the tab is selected */
  selected?: boolean
  /** Whether the title displays a custom title */
  titleDisplaysCustomTitle?: boolean
  /** The custom title of the tab */
  customTitle?: string
  /** The name of the current settings set */
  currentSettings?: string
}

/** Input for updating a Tab */
export type TabUpdateInput = Partial<TabCreateInput>

/** A Terminal settings set (profile) */
export interface SettingsSet {
  /** The name of the settings set */
  name: string
  /** The unique identifier of the settings set */
  id: number
  /** The number of rows */
  numberOfRows: number
  /** The number of columns */
  numberOfColumns: number
  /** The name of the font */
  fontName: string
  /** The size of the font */
  fontSize: number
}

/** Input for creating a SettingsSet */
export interface SettingsSetCreateInput {
  /** The name of the settings set */
  name?: string
  /** The number of rows */
  numberOfRows?: number
  /** The number of columns */
  numberOfColumns?: number
  /** The name of the font */
  fontName?: string
  /** The size of the font */
  fontSize?: number
}

/** Input for updating a SettingsSet */
export type SettingsSetUpdateInput = Partial<SettingsSetCreateInput>

// Zod schemas for runtime validation

export const WindowSchema = z.object({
  name: z.string(),
  id: z.number(),
  position: z.string(),
  visible: z.boolean(),
  frontmost: z.boolean(),
})

export const TabSchema = z.object({
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

export const SettingsSetSchema = z.object({
  name: z.string(),
  id: z.number(),
  numberOfRows: z.number(),
  numberOfColumns: z.number(),
  fontName: z.string(),
  fontSize: z.number(),
})
