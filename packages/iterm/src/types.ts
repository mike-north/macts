/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** SaveOptions */
export type SaveOptions = 'yes' | 'no' | 'ask'

/** A window. */
export interface Window {
  /** The unique identifier of the session. */
  id: number
  /** The alternate unique identifier of the session. */
  alternateIdentifier: string
  /** The full title of the window. */
  name: string
  /** The index of the window, ordered front to back. */
  index: number
  /** The bounding rectangle of the window. */
  bounds: { x: number; y: number; width: number; height: number }
  /** Whether the window has a close box. */
  closeable: boolean
  /** Whether the window can be minimized. */
  miniaturizable: boolean
  /** Whether the window is currently minimized. */
  miniaturized: boolean
  /** Whether the window can be resized. */
  resizable: boolean
  /** Whether the window is currently visible. */
  visible: boolean
  /** Whether the window can be zoomed. */
  zoomable: boolean
  /** Whether the window is currently zoomed. */
  zoomed: boolean
  /** Whether the window is currently the frontmost window. */
  frontmost: boolean
  /** The currently selected tab */
  currentTab: Tab
  /** The current session in a window */
  currentSession: Session
  /** Whether the window is a hotkey window. */
  isHotkeyWindow: boolean
  /** If the window is a hotkey window, this gives the name of the profile that created the window. */
  hotkeyWindowProfile: string
  /** The position of the window, relative to the upper left corner of the screen. */
  position: { x: number; y: number }
  /** The position of the window, relative to the lower left corner of the screen. */
  origin: { x: number; y: number }
  /** The width and height of the window */
  size: { x: number; y: number }
  /** The bounding rectangle, relative to the lower left corner of the screen. */
  frame: { x: number; y: number; width: number; height: number }
}

/** Input for creating a Window */
export interface WindowCreateInput {
  /** The index of the window, ordered front to back. */
  index?: number
  /** The bounding rectangle of the window. */
  bounds?: { x: number; y: number; width: number; height: number }
  /** Whether the window is currently minimized. */
  miniaturized?: boolean
  /** Whether the window is currently visible. */
  visible?: boolean
  /** Whether the window is currently zoomed. */
  zoomed?: boolean
  /** Whether the window is currently the frontmost window. */
  frontmost?: boolean
  /** The currently selected tab */
  currentTab?: Tab
  /** The current session in a window */
  currentSession?: Session
  /** Whether the window is a hotkey window. */
  isHotkeyWindow?: boolean
  /** If the window is a hotkey window, this gives the name of the profile that created the window. */
  hotkeyWindowProfile?: string
  /** The position of the window, relative to the upper left corner of the screen. */
  position?: { x: number; y: number }
  /** The position of the window, relative to the lower left corner of the screen. */
  origin?: { x: number; y: number }
  /** The width and height of the window */
  size?: { x: number; y: number }
  /** The bounding rectangle, relative to the lower left corner of the screen. */
  frame?: { x: number; y: number; width: number; height: number }
}

/** Input for updating a Window */
export type WindowUpdateInput = Partial<WindowCreateInput>

/** A terminal tab */
export interface Tab {
  /** The current session in a tab */
  currentSession: Session
  /** Index of tab in parent tab view control */
  index: number
  /** The title property */
  title: string
}

/** Input for creating a Tab */
export interface TabCreateInput {
  /** The current session in a tab */
  currentSession?: Session
  /** Index of tab in parent tab view control */
  index?: number
  /** The title property */
  title?: string
}

/** Input for updating a Tab */
export type TabUpdateInput = Partial<TabCreateInput>

/** A terminal session */
export interface Session {
  /** The unique identifier of the session. */
  id: string
  /** The session has received output recently. */
  isProcessing: boolean
  /** The terminal is at the shell prompt. Requires shell integration. */
  isAtShellPrompt: boolean
  /** The columns property */
  columns: number
  /** The rows property */
  rows: number
  /** The tty property */
  tty: string
  /** The currently visible contents of the session. */
  contents: string
  /** The currently visible contents of the session. */
  text: string
  /** The colorPreset property */
  colorPreset: string
  /** The backgroundColor property */
  backgroundColor: { r: number; g: number; b: number }
  /** The boldColor property */
  boldColor: { r: number; g: number; b: number }
  /** The cursorColor property */
  cursorColor: { r: number; g: number; b: number }
  /** The cursorTextColor property */
  cursorTextColor: { r: number; g: number; b: number }
  /** The foregroundColor property */
  foregroundColor: { r: number; g: number; b: number }
  /** The selectedTextColor property */
  selectedTextColor: { r: number; g: number; b: number }
  /** The selectionColor property */
  selectionColor: { r: number; g: number; b: number }
  /** The aNSIBlackColor property */
  aNSIBlackColor: { r: number; g: number; b: number }
  /** The aNSIRedColor property */
  aNSIRedColor: { r: number; g: number; b: number }
  /** The aNSIGreenColor property */
  aNSIGreenColor: { r: number; g: number; b: number }
  /** The aNSIYellowColor property */
  aNSIYellowColor: { r: number; g: number; b: number }
  /** The aNSIBlueColor property */
  aNSIBlueColor: { r: number; g: number; b: number }
  /** The aNSIMagentaColor property */
  aNSIMagentaColor: { r: number; g: number; b: number }
  /** The aNSICyanColor property */
  aNSICyanColor: { r: number; g: number; b: number }
  /** The aNSIWhiteColor property */
  aNSIWhiteColor: { r: number; g: number; b: number }
  /** The aNSIBrightBlackColor property */
  aNSIBrightBlackColor: { r: number; g: number; b: number }
  /** The aNSIBrightRedColor property */
  aNSIBrightRedColor: { r: number; g: number; b: number }
  /** The aNSIBrightGreenColor property */
  aNSIBrightGreenColor: { r: number; g: number; b: number }
  /** The aNSIBrightYellowColor property */
  aNSIBrightYellowColor: { r: number; g: number; b: number }
  /** The aNSIBrightBlueColor property */
  aNSIBrightBlueColor: { r: number; g: number; b: number }
  /** The aNSIBrightMagentaColor property */
  aNSIBrightMagentaColor: { r: number; g: number; b: number }
  /** The aNSIBrightCyanColor property */
  aNSIBrightCyanColor: { r: number; g: number; b: number }
  /** The aNSIBrightWhiteColor property */
  aNSIBrightWhiteColor: { r: number; g: number; b: number }
  /** The underlineColor property */
  underlineColor: { r: number; g: number; b: number }
  /** Whether the use a dedicated color for underlining. */
  useUnderlineColor: boolean
  /** The backgroundImage property */
  backgroundImage: string
  /** The name property */
  name: string
  /** The transparency property */
  transparency: number
  /** The uniqueID property */
  uniqueID: string
  /** The session's profile name */
  profileName: string
  /** ENQ Answerback string */
  answerbackString: string
}

/** Input for creating a Session */
export interface SessionCreateInput {
  /** The session has received output recently. */
  isProcessing?: boolean
  /** The terminal is at the shell prompt. Requires shell integration. */
  isAtShellPrompt?: boolean
  /** The columns property */
  columns?: number
  /** The rows property */
  rows?: number
  /** The currently visible contents of the session. */
  contents?: string
  /** The colorPreset property */
  colorPreset?: string
  /** The backgroundColor property */
  backgroundColor?: { r: number; g: number; b: number }
  /** The boldColor property */
  boldColor?: { r: number; g: number; b: number }
  /** The cursorColor property */
  cursorColor?: { r: number; g: number; b: number }
  /** The cursorTextColor property */
  cursorTextColor?: { r: number; g: number; b: number }
  /** The foregroundColor property */
  foregroundColor?: { r: number; g: number; b: number }
  /** The selectedTextColor property */
  selectedTextColor?: { r: number; g: number; b: number }
  /** The selectionColor property */
  selectionColor?: { r: number; g: number; b: number }
  /** The aNSIBlackColor property */
  aNSIBlackColor?: { r: number; g: number; b: number }
  /** The aNSIRedColor property */
  aNSIRedColor?: { r: number; g: number; b: number }
  /** The aNSIGreenColor property */
  aNSIGreenColor?: { r: number; g: number; b: number }
  /** The aNSIYellowColor property */
  aNSIYellowColor?: { r: number; g: number; b: number }
  /** The aNSIBlueColor property */
  aNSIBlueColor?: { r: number; g: number; b: number }
  /** The aNSIMagentaColor property */
  aNSIMagentaColor?: { r: number; g: number; b: number }
  /** The aNSICyanColor property */
  aNSICyanColor?: { r: number; g: number; b: number }
  /** The aNSIWhiteColor property */
  aNSIWhiteColor?: { r: number; g: number; b: number }
  /** The aNSIBrightBlackColor property */
  aNSIBrightBlackColor?: { r: number; g: number; b: number }
  /** The aNSIBrightRedColor property */
  aNSIBrightRedColor?: { r: number; g: number; b: number }
  /** The aNSIBrightGreenColor property */
  aNSIBrightGreenColor?: { r: number; g: number; b: number }
  /** The aNSIBrightYellowColor property */
  aNSIBrightYellowColor?: { r: number; g: number; b: number }
  /** The aNSIBrightBlueColor property */
  aNSIBrightBlueColor?: { r: number; g: number; b: number }
  /** The aNSIBrightMagentaColor property */
  aNSIBrightMagentaColor?: { r: number; g: number; b: number }
  /** The aNSIBrightCyanColor property */
  aNSIBrightCyanColor?: { r: number; g: number; b: number }
  /** The aNSIBrightWhiteColor property */
  aNSIBrightWhiteColor?: { r: number; g: number; b: number }
  /** The underlineColor property */
  underlineColor?: { r: number; g: number; b: number }
  /** Whether the use a dedicated color for underlining. */
  useUnderlineColor?: boolean
  /** The backgroundImage property */
  backgroundImage?: string
  /** The name property */
  name?: string
  /** The transparency property */
  transparency?: number
  /** ENQ Answerback string */
  answerbackString?: string
}

/** Input for updating a Session */
export type SessionUpdateInput = Partial<SessionCreateInput>

// Zod schemas for runtime validation

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
  currentTab: z.string(),
  currentSession: z.string(),
  isHotkeyWindow: z.boolean(),
  hotkeyWindowProfile: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  origin: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ x: z.number(), y: z.number() }),
  frame: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
})

export const TabSchema = z.object({
  currentSession: z.string(),
  index: z.number(),
  title: z.string(),
})

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
