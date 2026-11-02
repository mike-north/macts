/**
 * The iTerm contract: the transport-neutral description of every
 * iTerm operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `iTermClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `iTermClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the iTerm manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type FileSource,
  type Integer,
  type ObjectReferenceData,
  type ObjectReferenceVariant,
  type OperationDescriptor,
  type Point,
  type Rectangle,
  type Rgb,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** SaveOptions */
export type SaveOptions = 'yes' | 'no' | 'ask'

/** A window. */
export interface Window {
  /**
   * The unique identifier of the session.
   * Never null: the primary identifier.
   */
  readonly id: Integer
  /**
   * The alternate unique identifier of the session.
   * Nullable. No evidence that the app always sets it.
   */
  readonly alternateIdentifier: string | null
  /**
   * The full title of the window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The index of the window, ordered front to back.
   * Nullable. No evidence that the app always sets it.
   */
  index: Integer | null
  /**
   * The bounding rectangle of the window.
   * Nullable. No evidence that the app always sets it.
   */
  bounds: Rectangle | null
  /**
   * Whether the window has a close box.
   * Nullable. No evidence that the app always sets it.
   */
  readonly closeable: boolean | null
  /**
   * Whether the window can be minimized.
   * Nullable. No evidence that the app always sets it.
   */
  readonly miniaturizable: boolean | null
  /**
   * Whether the window is currently minimized.
   * Nullable. No evidence that the app always sets it.
   */
  miniaturized: boolean | null
  /**
   * Whether the window can be resized.
   * Nullable. No evidence that the app always sets it.
   */
  readonly resizable: boolean | null
  /**
   * Whether the window is currently visible.
   * Nullable. No evidence that the app always sets it.
   */
  visible: boolean | null
  /**
   * Whether the window can be zoomed.
   * Nullable. No evidence that the app always sets it.
   */
  readonly zoomable: boolean | null
  /**
   * Whether the window is currently zoomed.
   * Nullable. No evidence that the app always sets it.
   */
  zoomed: boolean | null
  /**
   * Whether the window is currently the frontmost window.
   * Nullable. No evidence that the app always sets it.
   */
  frontmost: boolean | null
  /**
   * The currently selected tab.
   * Nullable. No evidence that the app always sets it.
   */
  currentTab: ObjectReferenceVariant<Tab, never, 'Tab'> | null
  /**
   * The current session in a window.
   * Nullable. No evidence that the app always sets it.
   */
  currentSession: ObjectReferenceVariant<Session, string, 'Session'> | null
  /**
   * Whether the window is a hotkey window.
   * Nullable. No evidence that the app always sets it.
   */
  isHotkeyWindow: boolean | null
  /**
   * If the window is a hotkey window, this gives the name of the profile that created the window.
   * Nullable. No evidence that the app always sets it.
   */
  hotkeyWindowProfile: string | null
  /**
   * The position of the window, relative to the upper left corner of the screen.
   * Nullable. No evidence that the app always sets it.
   */
  position: Point | null
  /**
   * The position of the window, relative to the lower left corner of the screen.
   * Nullable. No evidence that the app always sets it.
   */
  origin: Point | null
  /**
   * The width and height of the window.
   * Nullable. No evidence that the app always sets it.
   */
  size: Point | null
  /**
   * The bounding rectangle, relative to the lower left corner of the screen.
   * Nullable. No evidence that the app always sets it.
   */
  frame: Rectangle | null
}

/** A terminal tab */
export interface Tab {
  /**
   * The current session in a tab.
   * Nullable. No evidence that the app always sets it.
   */
  currentSession: ObjectReferenceVariant<Session, string, 'Session'> | null
  /**
   * Index of tab in parent tab view control.
   * Nullable. No evidence that the app always sets it.
   */
  index: Integer | null
  /**
   * The title property.
   * Nullable. No evidence that the app always sets it.
   */
  title: string | null
}

/** A terminal session */
export interface Session {
  /**
   * The unique identifier of the session.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The session has received output recently.
   * Nullable. No evidence that the app always sets it.
   */
  isProcessing: boolean | null
  /**
   * The terminal is at the shell prompt. Requires shell integration.
   * Nullable. No evidence that the app always sets it.
   */
  isAtShellPrompt: boolean | null
  /**
   * The columns property.
   * Nullable. No evidence that the app always sets it.
   */
  columns: Integer | null
  /**
   * The rows property.
   * Nullable. No evidence that the app always sets it.
   */
  rows: Integer | null
  /**
   * The tty property.
   * Nullable. No evidence that the app always sets it.
   */
  readonly tty: string | null
  /**
   * The currently visible contents of the session.
   * Nullable. No evidence that the app always sets it.
   */
  contents: string | null
  /**
   * The currently visible contents of the session.
   * Nullable. No evidence that the app always sets it.
   */
  readonly text: string | null
  /**
   * The colorPreset property.
   * Nullable. No evidence that the app always sets it.
   */
  colorPreset: string | null
  /**
   * The backgroundColor property.
   * Nullable. No evidence that the app always sets it.
   */
  backgroundColor: Rgb | null
  /**
   * The boldColor property.
   * Nullable. No evidence that the app always sets it.
   */
  boldColor: Rgb | null
  /**
   * The cursorColor property.
   * Nullable. No evidence that the app always sets it.
   */
  cursorColor: Rgb | null
  /**
   * The cursorTextColor property.
   * Nullable. No evidence that the app always sets it.
   */
  cursorTextColor: Rgb | null
  /**
   * The foregroundColor property.
   * Nullable. No evidence that the app always sets it.
   */
  foregroundColor: Rgb | null
  /**
   * The selectedTextColor property.
   * Nullable. No evidence that the app always sets it.
   */
  selectedTextColor: Rgb | null
  /**
   * The selectionColor property.
   * Nullable. No evidence that the app always sets it.
   */
  selectionColor: Rgb | null
  /**
   * The aNSIBlackColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIBlackColor: Rgb | null
  /**
   * The aNSIRedColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIRedColor: Rgb | null
  /**
   * The aNSIGreenColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIGreenColor: Rgb | null
  /**
   * The aNSIYellowColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIYellowColor: Rgb | null
  /**
   * The aNSIBlueColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIBlueColor: Rgb | null
  /**
   * The aNSIMagentaColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIMagentaColor: Rgb | null
  /**
   * The aNSICyanColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSICyanColor: Rgb | null
  /**
   * The aNSIWhiteColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIWhiteColor: Rgb | null
  /**
   * The aNSIBrightBlackColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIBrightBlackColor: Rgb | null
  /**
   * The aNSIBrightRedColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIBrightRedColor: Rgb | null
  /**
   * The aNSIBrightGreenColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIBrightGreenColor: Rgb | null
  /**
   * The aNSIBrightYellowColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIBrightYellowColor: Rgb | null
  /**
   * The aNSIBrightBlueColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIBrightBlueColor: Rgb | null
  /**
   * The aNSIBrightMagentaColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIBrightMagentaColor: Rgb | null
  /**
   * The aNSIBrightCyanColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIBrightCyanColor: Rgb | null
  /**
   * The aNSIBrightWhiteColor property.
   * Nullable. No evidence that the app always sets it.
   */
  aNSIBrightWhiteColor: Rgb | null
  /**
   * The underlineColor property.
   * Nullable. No evidence that the app always sets it.
   */
  underlineColor: Rgb | null
  /**
   * Whether the use a dedicated color for underlining.
   * Nullable. No evidence that the app always sets it.
   */
  useUnderlineColor: boolean | null
  /**
   * The backgroundImage property.
   * Nullable. No evidence that the app always sets it.
   */
  backgroundImage: string | null
  /**
   * The name property.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The transparency property.
   * Nullable. No evidence that the app always sets it.
   */
  transparency: number | null
  /**
   * The uniqueID property.
   * Nullable. No evidence that the app always sets it.
   */
  readonly uniqueID: string | null
  /**
   * The session's profile name.
   * Nullable. No evidence that the app always sets it.
   */
  readonly profileName: string | null
  /**
   * ENQ Answerback string.
   * Nullable. No evidence that the app always sets it.
   */
  answerbackString: string | null
}

/** Input for creating a Window. */
export interface WindowCreateInput {
  /** The index of the window, ordered front to back. */
  index?: Integer
  /** The bounding rectangle of the window. */
  bounds?: Rectangle
  /** Whether the window is currently minimized. */
  miniaturized?: boolean
  /** Whether the window is currently visible. */
  visible?: boolean
  /** Whether the window is currently zoomed. */
  zoomed?: boolean
  /** Whether the window is currently the frontmost window. */
  frontmost?: boolean
  /** The currently selected tab */
  currentTab?: ObjectReferenceData<never, 'Tab'>
  /** The current session in a window */
  currentSession?: ObjectReferenceData<string, 'Session'>
  /** Whether the window is a hotkey window. */
  isHotkeyWindow?: boolean
  /**
   * If the window is a hotkey window, this gives the name of the profile that created the window.
   */
  hotkeyWindowProfile?: string
  /** The position of the window, relative to the upper left corner of the screen. */
  position?: Point
  /** The position of the window, relative to the lower left corner of the screen. */
  origin?: Point
  /** The width and height of the window */
  size?: Point
  /** The bounding rectangle, relative to the lower left corner of the screen. */
  frame?: Rectangle
}

/** Input for updating a Window. Omitted fields are left unchanged. */
export interface WindowUpdateInput {
  /**
   * The index of the window, ordered front to back.
   * Cannot be reset: null is rejected.
   */
  index?: Integer
  /**
   * The bounding rectangle of the window.
   * Cannot be reset: null is rejected.
   */
  bounds?: Rectangle
  /**
   * Whether the window is currently minimized.
   * Cannot be reset: null is rejected.
   */
  miniaturized?: boolean
  /**
   * Whether the window is currently visible.
   * Cannot be reset: null is rejected.
   */
  visible?: boolean
  /**
   * Whether the window is currently zoomed.
   * Cannot be reset: null is rejected.
   */
  zoomed?: boolean
  /**
   * Whether the window is currently the frontmost window.
   * Cannot be reset: null is rejected.
   */
  frontmost?: boolean
  /**
   * The currently selected tab.
   * Cannot be reset: null is rejected.
   */
  currentTab?: ObjectReferenceData<never, 'Tab'>
  /**
   * The current session in a window.
   * Cannot be reset: null is rejected.
   */
  currentSession?: ObjectReferenceData<string, 'Session'>
  /**
   * Whether the window is a hotkey window.
   * Cannot be reset: null is rejected.
   */
  isHotkeyWindow?: boolean
  /**
   * If the window is a hotkey window, this gives the name of the profile that created the window.
   * Cannot be reset: null is rejected.
   */
  hotkeyWindowProfile?: string
  /**
   * The position of the window, relative to the upper left corner of the screen.
   * Cannot be reset: null is rejected.
   */
  position?: Point
  /**
   * The position of the window, relative to the lower left corner of the screen.
   * Cannot be reset: null is rejected.
   */
  origin?: Point
  /**
   * The width and height of the window.
   * Cannot be reset: null is rejected.
   */
  size?: Point
  /**
   * The bounding rectangle, relative to the lower left corner of the screen.
   * Cannot be reset: null is rejected.
   */
  frame?: Rectangle
}

/** Input for creating a Tab. */
export interface TabCreateInput {
  /** The current session in a tab */
  currentSession?: ObjectReferenceData<string, 'Session'>
  /** Index of tab in parent tab view control */
  index?: Integer
  /** The title property */
  title?: string
}

/** Input for updating a Tab. Omitted fields are left unchanged. */
export interface TabUpdateInput {
  /**
   * The current session in a tab.
   * Cannot be reset: null is rejected.
   */
  currentSession?: ObjectReferenceData<string, 'Session'>
  /**
   * Index of tab in parent tab view control.
   * Cannot be reset: null is rejected.
   */
  index?: Integer
  /**
   * The title property.
   * Cannot be reset: null is rejected.
   */
  title?: string
}

/** Input for creating a Session. */
export interface SessionCreateInput {
  /** The session has received output recently. */
  isProcessing?: boolean
  /** The terminal is at the shell prompt. Requires shell integration. */
  isAtShellPrompt?: boolean
  /** The columns property */
  columns?: Integer
  /** The rows property */
  rows?: Integer
  /** The currently visible contents of the session. */
  contents?: string
  /** The colorPreset property */
  colorPreset?: string
  /** The backgroundColor property */
  backgroundColor?: Rgb
  /** The boldColor property */
  boldColor?: Rgb
  /** The cursorColor property */
  cursorColor?: Rgb
  /** The cursorTextColor property */
  cursorTextColor?: Rgb
  /** The foregroundColor property */
  foregroundColor?: Rgb
  /** The selectedTextColor property */
  selectedTextColor?: Rgb
  /** The selectionColor property */
  selectionColor?: Rgb
  /** The aNSIBlackColor property */
  aNSIBlackColor?: Rgb
  /** The aNSIRedColor property */
  aNSIRedColor?: Rgb
  /** The aNSIGreenColor property */
  aNSIGreenColor?: Rgb
  /** The aNSIYellowColor property */
  aNSIYellowColor?: Rgb
  /** The aNSIBlueColor property */
  aNSIBlueColor?: Rgb
  /** The aNSIMagentaColor property */
  aNSIMagentaColor?: Rgb
  /** The aNSICyanColor property */
  aNSICyanColor?: Rgb
  /** The aNSIWhiteColor property */
  aNSIWhiteColor?: Rgb
  /** The aNSIBrightBlackColor property */
  aNSIBrightBlackColor?: Rgb
  /** The aNSIBrightRedColor property */
  aNSIBrightRedColor?: Rgb
  /** The aNSIBrightGreenColor property */
  aNSIBrightGreenColor?: Rgb
  /** The aNSIBrightYellowColor property */
  aNSIBrightYellowColor?: Rgb
  /** The aNSIBrightBlueColor property */
  aNSIBrightBlueColor?: Rgb
  /** The aNSIBrightMagentaColor property */
  aNSIBrightMagentaColor?: Rgb
  /** The aNSIBrightCyanColor property */
  aNSIBrightCyanColor?: Rgb
  /** The aNSIBrightWhiteColor property */
  aNSIBrightWhiteColor?: Rgb
  /** The underlineColor property */
  underlineColor?: Rgb
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

/** Input for updating a Session. Omitted fields are left unchanged. */
export interface SessionUpdateInput {
  /**
   * The session has received output recently.
   * Cannot be reset: null is rejected.
   */
  isProcessing?: boolean
  /**
   * The terminal is at the shell prompt. Requires shell integration.
   * Cannot be reset: null is rejected.
   */
  isAtShellPrompt?: boolean
  /**
   * The columns property.
   * Cannot be reset: null is rejected.
   */
  columns?: Integer
  /**
   * The rows property.
   * Cannot be reset: null is rejected.
   */
  rows?: Integer
  /**
   * The currently visible contents of the session.
   * Cannot be reset: null is rejected.
   */
  contents?: string
  /**
   * The colorPreset property.
   * Cannot be reset: null is rejected.
   */
  colorPreset?: string
  /**
   * The backgroundColor property.
   * Cannot be reset: null is rejected.
   */
  backgroundColor?: Rgb
  /**
   * The boldColor property.
   * Cannot be reset: null is rejected.
   */
  boldColor?: Rgb
  /**
   * The cursorColor property.
   * Cannot be reset: null is rejected.
   */
  cursorColor?: Rgb
  /**
   * The cursorTextColor property.
   * Cannot be reset: null is rejected.
   */
  cursorTextColor?: Rgb
  /**
   * The foregroundColor property.
   * Cannot be reset: null is rejected.
   */
  foregroundColor?: Rgb
  /**
   * The selectedTextColor property.
   * Cannot be reset: null is rejected.
   */
  selectedTextColor?: Rgb
  /**
   * The selectionColor property.
   * Cannot be reset: null is rejected.
   */
  selectionColor?: Rgb
  /**
   * The aNSIBlackColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIBlackColor?: Rgb
  /**
   * The aNSIRedColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIRedColor?: Rgb
  /**
   * The aNSIGreenColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIGreenColor?: Rgb
  /**
   * The aNSIYellowColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIYellowColor?: Rgb
  /**
   * The aNSIBlueColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIBlueColor?: Rgb
  /**
   * The aNSIMagentaColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIMagentaColor?: Rgb
  /**
   * The aNSICyanColor property.
   * Cannot be reset: null is rejected.
   */
  aNSICyanColor?: Rgb
  /**
   * The aNSIWhiteColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIWhiteColor?: Rgb
  /**
   * The aNSIBrightBlackColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIBrightBlackColor?: Rgb
  /**
   * The aNSIBrightRedColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIBrightRedColor?: Rgb
  /**
   * The aNSIBrightGreenColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIBrightGreenColor?: Rgb
  /**
   * The aNSIBrightYellowColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIBrightYellowColor?: Rgb
  /**
   * The aNSIBrightBlueColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIBrightBlueColor?: Rgb
  /**
   * The aNSIBrightMagentaColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIBrightMagentaColor?: Rgb
  /**
   * The aNSIBrightCyanColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIBrightCyanColor?: Rgb
  /**
   * The aNSIBrightWhiteColor property.
   * Cannot be reset: null is rejected.
   */
  aNSIBrightWhiteColor?: Rgb
  /**
   * The underlineColor property.
   * Cannot be reset: null is rejected.
   */
  underlineColor?: Rgb
  /**
   * Whether the use a dedicated color for underlining.
   * Cannot be reset: null is rejected.
   */
  useUnderlineColor?: boolean
  /**
   * The backgroundImage property.
   * Cannot be reset: null is rejected.
   */
  backgroundImage?: string
  /**
   * The name property.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * The transparency property.
   * Cannot be reset: null is rejected.
   */
  transparency?: number
  /**
   * ENQ Answerback string.
   * Cannot be reset: null is rejected.
   */
  answerbackString?: string
}

/**
 * The iTerm client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link iTermContract}.
 */
export interface iTermClient {
  /**
   * Return the number of elements of a particular class within an object.
   *
   * @param each - The class of objects to be counted. Does not accept null.
   */
  count(each?: string, options?: CallOptions): Promise<void>
  /** Delete an object. */
  _delete(options?: CallOptions): Promise<void>
  /**
   * Copy object(s) and put the copies at a new location.
   *
   * @param to - The location for the new object(s). Does not accept null.
   * @param withProperties - Properties to be set in the new duplicated object(s). Does not accept
   * null.
   */
  duplicate(to: string, withProperties?: unknown, options?: CallOptions): Promise<void>
  /** Verify if an object exists. */
  exists(options?: CallOptions): Promise<void>
  /**
   * Make a new object.
   *
   * @param _new - The class of the new object. Does not accept null.
   * @param at - The location at which to insert the object. Does not accept null.
   * @param withData - The initial contents of the object. Does not accept null.
   * @param withProperties - The initial values for properties of the object. Does not accept null.
   */
  make(
    _new: string,
    at?: string,
    withData?: unknown,
    withProperties?: unknown,
    options?: CallOptions
  ): Promise<void>
  /**
   * Move object(s) to a new location.
   *
   * @param to - The new location for the object(s). Does not accept null.
   */
  move(to: string, options?: CallOptions): Promise<void>
  /** Close a document. */
  close(options?: CallOptions): Promise<void>
  /**
   * Request a Python API cookie
   *
   * @param andKeyForAppNamed - Name of script using the cookie. This is shown in the console. Does
   * not accept null.
   */
  requestCookie(andKeyForAppNamed?: string, options?: CallOptions): Promise<void>
  /**
   * Create a new tab
   *
   * @param withProfile - The profile name. Does not accept null.
   * @param command - Shell command to run. Does not accept null.
   */
  createTab(withProfile: string, command?: string, options?: CallOptions): Promise<void>
  /**
   * Create a new tab with the default profile
   *
   * @param command - Shell command to run. Does not accept null.
   */
  createTabWithDefaultProfile(command?: string, options?: CallOptions): Promise<void>
  /**
   * Create a new window
   *
   * @param command - Shell command to run. Does not accept null.
   */
  createWindowWithProfile(command?: string, options?: CallOptions): Promise<void>
  /** Create a hotkey window */
  createHotkeyWindowWithProfile(options?: CallOptions): Promise<void>
  /**
   * Launch API script by name
   *
   * @param _arguments - Arguments to pass to script. Does not accept null.
   */
  launchAPIScriptNamed(_arguments?: string, options?: CallOptions): Promise<void>
  /** Invokes an expression, such as a registered function. */
  invokeAPIExpression(options?: CallOptions): Promise<void>
  /**
   * Create a new window with the default profile
   *
   * @param command - Shell command to run. Does not accept null.
   */
  createWindowWithDefaultProfile(command?: string, options?: CallOptions): Promise<void>
  /**
   * Send text as though it was typed.
   *
   * @param contentsOfFile - Filename to send the contents of. Does not accept null.
   * @param text - Text to send. Does not accept null.
   * @param newline - If newline should be added to end of text (default: yes). Does not accept
   * null.
   */
  write(
    contentsOfFile?: FileSource,
    text?: string,
    newline?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Make receiver visible and selected. */
  select(options?: CallOptions): Promise<void>
  /**
   * Split a session vertically.
   *
   * @param withProfile - Name of profile for new session. Does not accept null.
   * @param command - Shell command to run. Does not accept null.
   */
  splitVertically(withProfile: string, command?: string, options?: CallOptions): Promise<void>
  /**
   * Split a session vertically, using the default profile for the new session
   *
   * @param command - Shell command to run. Does not accept null.
   */
  splitVerticallyWithDefaultProfile(command?: string, options?: CallOptions): Promise<void>
  /**
   * Split a session vertically, using the original session's profile for the new session
   *
   * @param command - Shell command to run. Does not accept null.
   */
  splitVerticallyWithSameProfile(command?: string, options?: CallOptions): Promise<void>
  /**
   * Split a session horizontally.
   *
   * @param withProfile - Name of profile for new session. Does not accept null.
   * @param command - Shell command to run. Does not accept null.
   */
  splitHorizontally(withProfile: string, command?: string, options?: CallOptions): Promise<void>
  /**
   * Split a session horizontally, using the default profile for the new session
   *
   * @param command - Shell command to run. Does not accept null.
   */
  splitHorizontallyWithDefaultProfile(command?: string, options?: CallOptions): Promise<void>
  /**
   * Split a session horizontally, using the original session's profile for the new session
   *
   * @param command - Shell command to run. Does not accept null.
   */
  splitHorizontallyWithSameProfile(command?: string, options?: CallOptions): Promise<void>
  /**
   * Returns the value of a session variable with the given name
   *
   * @param named - Name of variable. Does not accept null.
   */
  variable(named: string, options?: CallOptions): Promise<void>
  /**
   * Sets the value of a session variable
   *
   * @param named - Name of variable. Does not accept null.
   * @param to - New value. Does not accept null.
   */
  setVariable(named: string, to: string, options?: CallOptions): Promise<void>
  /** Reveals a hotkey window. Only to be called on windows that are hotkey windows. */
  revealHotkeyWindow(options?: CallOptions): Promise<void>
  /** Hides a hotkey window. Only to be called on windows that are hotkey windows. */
  hideHotkeyWindow(options?: CallOptions): Promise<void>
  /**
   * Toggles the visibility of a hotkey window. Only to be called on windows that are hotkey
   * windows.
   */
  toggleHotkeyWindow(options?: CallOptions): Promise<void>
}

const windowRecordType: ValueType<Window> = t.record(
  {
    id: t.integer({ description: 'The unique identifier of the session.' }),
    alternateIdentifier: t.nullable(t.string(), {
      description: 'The alternate unique identifier of the session.',
    }),
    name: t.nullable(t.string(), { description: 'The full title of the window.' }),
    index: t.nullable(t.integer(), {
      description: 'The index of the window, ordered front to back.',
    }),
    bounds: t.nullable(t.rectangle(), { description: 'The bounding rectangle of the window.' }),
    closeable: t.nullable(t.boolean(), { description: 'Whether the window has a close box.' }),
    miniaturizable: t.nullable(t.boolean(), {
      description: 'Whether the window can be minimized.',
    }),
    miniaturized: t.nullable(t.boolean(), {
      description: 'Whether the window is currently minimized.',
    }),
    resizable: t.nullable(t.boolean(), { description: 'Whether the window can be resized.' }),
    visible: t.nullable(t.boolean(), { description: 'Whether the window is currently visible.' }),
    zoomable: t.nullable(t.boolean(), { description: 'Whether the window can be zoomed.' }),
    zoomed: t.nullable(t.boolean(), { description: 'Whether the window is currently zoomed.' }),
    frontmost: t.nullable(t.boolean(), {
      description: 'Whether the window is currently the frontmost window.',
    }),
    currentTab: t.nullable(
      t.reference<Tab, never, 'Tab'>(() => iTermContract, 'Tab', 'one'),
      { description: 'The currently selected tab' }
    ),
    currentSession: t.nullable(
      t.reference<Session, string, 'Session'>(() => iTermContract, 'Session', 'one'),
      { description: 'The current session in a window' }
    ),
    isHotkeyWindow: t.nullable(t.boolean(), {
      description: 'Whether the window is a hotkey window.',
    }),
    hotkeyWindowProfile: t.nullable(t.string(), {
      description:
        'If the window is a hotkey window, this gives the name of the profile that created the window.',
    }),
    position: t.nullable(t.point(), {
      description: 'The position of the window, relative to the upper left corner of the screen.',
    }),
    origin: t.nullable(t.point(), {
      description: 'The position of the window, relative to the lower left corner of the screen.',
    }),
    size: t.nullable(t.point(), { description: 'The width and height of the window' }),
    frame: t.nullable(t.rectangle(), {
      description: 'The bounding rectangle, relative to the lower left corner of the screen.',
    }),
  },
  { description: 'A window.' }
)

const tabRecordType: ValueType<Tab> = t.record(
  {
    currentSession: t.nullable(
      t.reference<Session, string, 'Session'>(() => iTermContract, 'Session', 'one'),
      { description: 'The current session in a tab' }
    ),
    index: t.nullable(t.integer(), { description: 'Index of tab in parent tab view control' }),
    title: t.nullable(t.string(), { description: 'The title property' }),
  },
  { description: 'A terminal tab' }
)

const sessionRecordType: ValueType<Session> = t.record(
  {
    id: t.string({ description: 'The unique identifier of the session.' }),
    isProcessing: t.nullable(t.boolean(), {
      description: 'The session has received output recently.',
    }),
    isAtShellPrompt: t.nullable(t.boolean(), {
      description: 'The terminal is at the shell prompt. Requires shell integration.',
    }),
    columns: t.nullable(t.integer(), { description: 'The columns property' }),
    rows: t.nullable(t.integer(), { description: 'The rows property' }),
    tty: t.nullable(t.string(), { description: 'The tty property' }),
    contents: t.nullable(t.string(), {
      description: 'The currently visible contents of the session.',
    }),
    text: t.nullable(t.string(), { description: 'The currently visible contents of the session.' }),
    colorPreset: t.nullable(t.string(), { description: 'The colorPreset property' }),
    backgroundColor: t.nullable(t.rgb(), { description: 'The backgroundColor property' }),
    boldColor: t.nullable(t.rgb(), { description: 'The boldColor property' }),
    cursorColor: t.nullable(t.rgb(), { description: 'The cursorColor property' }),
    cursorTextColor: t.nullable(t.rgb(), { description: 'The cursorTextColor property' }),
    foregroundColor: t.nullable(t.rgb(), { description: 'The foregroundColor property' }),
    selectedTextColor: t.nullable(t.rgb(), { description: 'The selectedTextColor property' }),
    selectionColor: t.nullable(t.rgb(), { description: 'The selectionColor property' }),
    aNSIBlackColor: t.nullable(t.rgb(), { description: 'The aNSIBlackColor property' }),
    aNSIRedColor: t.nullable(t.rgb(), { description: 'The aNSIRedColor property' }),
    aNSIGreenColor: t.nullable(t.rgb(), { description: 'The aNSIGreenColor property' }),
    aNSIYellowColor: t.nullable(t.rgb(), { description: 'The aNSIYellowColor property' }),
    aNSIBlueColor: t.nullable(t.rgb(), { description: 'The aNSIBlueColor property' }),
    aNSIMagentaColor: t.nullable(t.rgb(), { description: 'The aNSIMagentaColor property' }),
    aNSICyanColor: t.nullable(t.rgb(), { description: 'The aNSICyanColor property' }),
    aNSIWhiteColor: t.nullable(t.rgb(), { description: 'The aNSIWhiteColor property' }),
    aNSIBrightBlackColor: t.nullable(t.rgb(), { description: 'The aNSIBrightBlackColor property' }),
    aNSIBrightRedColor: t.nullable(t.rgb(), { description: 'The aNSIBrightRedColor property' }),
    aNSIBrightGreenColor: t.nullable(t.rgb(), { description: 'The aNSIBrightGreenColor property' }),
    aNSIBrightYellowColor: t.nullable(t.rgb(), {
      description: 'The aNSIBrightYellowColor property',
    }),
    aNSIBrightBlueColor: t.nullable(t.rgb(), { description: 'The aNSIBrightBlueColor property' }),
    aNSIBrightMagentaColor: t.nullable(t.rgb(), {
      description: 'The aNSIBrightMagentaColor property',
    }),
    aNSIBrightCyanColor: t.nullable(t.rgb(), { description: 'The aNSIBrightCyanColor property' }),
    aNSIBrightWhiteColor: t.nullable(t.rgb(), { description: 'The aNSIBrightWhiteColor property' }),
    underlineColor: t.nullable(t.rgb(), { description: 'The underlineColor property' }),
    useUnderlineColor: t.nullable(t.boolean(), {
      description: 'Whether the use a dedicated color for underlining.',
    }),
    backgroundImage: t.nullable(t.string(), { description: 'The backgroundImage property' }),
    name: t.nullable(t.string(), { description: 'The name property' }),
    transparency: t.nullable(t.double(), { description: 'The transparency property' }),
    uniqueID: t.nullable(t.string(), { description: 'The uniqueID property' }),
    profileName: t.nullable(t.string(), { description: "The session's profile name" }),
    answerbackString: t.nullable(t.string(), { description: 'ENQ Answerback string' }),
  },
  { description: 'A terminal session' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<iTermClient>['resources'] = {
  Window: {
    name: 'Window',
    record: windowRecordType,
    id: t.integer({ description: 'The unique identifier of the session.' }),
  },
  Tab: {
    name: 'Tab',
    record: tabRecordType,
  },
  Session: {
    name: 'Session',
    record: sessionRecordType,
    id: t.string({ description: 'The unique identifier of the session.' }),
  },
}

const appCountOperation: OperationDescriptor<{ readonly each?: string | undefined }, undefined> = {
  id: 'iterm.app.count',
  permission: 'iterm:app:count',
  target: { command: 'count' },
  description: 'Return the number of elements of a particular class within an object.',
  input: t.record({
    each: t.optional(t.string({ description: 'The class of objects to be counted.' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { each: { type: 'string', description: 'The class of objects to be counted.' } },
    additionalProperties: false,
  },
}

const appDeleteOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.delete',
  permission: 'iterm:app:delete',
  target: { command: 'delete' },
  description: 'Delete an object.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appDuplicateOperation: OperationDescriptor<
  { readonly to: string; readonly withProperties?: unknown },
  undefined
> = {
  id: 'iterm.app.duplicate',
  permission: 'iterm:app:duplicate',
  target: { command: 'duplicate' },
  description: 'Copy object(s) and put the copies at a new location.',
  input: t.record({
    to: t.string({ description: 'The location for the new object(s).' }),
    withProperties: t.optional(
      t.unknown({ description: 'Properties to be set in the new duplicated object(s).' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      to: { type: 'string', description: 'The location for the new object(s).' },
      withProperties: {
        allOf: [
          {
            description: 'Properties to be set in the new duplicated object(s).',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
    },
    required: ['to'],
    additionalProperties: false,
    definitions: {
      __schema0: {
        anyOf: [
          { type: 'string' },
          { type: 'boolean' },
          { type: 'null' },
          { type: 'array', items: { $ref: '#/definitions/__schema0' } },
          {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                pattern:
                  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
              },
            },
            required: ['date'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              record: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { $ref: '#/definitions/__schema0' },
              },
            },
            required: ['record'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { reference: { not: {} } },
            required: ['reference'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { file: { not: {} } },
            required: ['file'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { fileSource: { not: {} } },
            required: ['fileSource'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
}

const appExistsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.exists',
  permission: 'iterm:app:exists',
  target: { command: 'exists' },
  description: 'Verify if an object exists.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appMakeOperation: OperationDescriptor<
  {
    readonly new: string
    readonly at?: string | undefined
    readonly withData?: unknown
    readonly withProperties?: unknown
  },
  undefined
> = {
  id: 'iterm.app.make',
  permission: 'iterm:app:make',
  target: { command: 'make' },
  description: 'Make a new object.',
  input: t.record({
    new: t.string({ description: 'The class of the new object.' }),
    at: t.optional(t.string({ description: 'The location at which to insert the object.' })),
    withData: t.optional(t.unknown({ description: 'The initial contents of the object.' })),
    withProperties: t.optional(
      t.unknown({ description: 'The initial values for properties of the object.' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      new: { type: 'string', description: 'The class of the new object.' },
      at: { type: 'string', description: 'The location at which to insert the object.' },
      withData: {
        allOf: [
          { description: 'The initial contents of the object.', $ref: '#/definitions/__schema0' },
        ],
      },
      withProperties: {
        allOf: [
          {
            description: 'The initial values for properties of the object.',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
    },
    required: ['new'],
    additionalProperties: false,
    definitions: {
      __schema0: {
        anyOf: [
          { type: 'string' },
          { type: 'boolean' },
          { type: 'null' },
          { type: 'array', items: { $ref: '#/definitions/__schema0' } },
          {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                pattern:
                  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
              },
            },
            required: ['date'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              record: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { $ref: '#/definitions/__schema0' },
              },
            },
            required: ['record'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { reference: { not: {} } },
            required: ['reference'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { file: { not: {} } },
            required: ['file'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { fileSource: { not: {} } },
            required: ['fileSource'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
}

const appMoveOperation: OperationDescriptor<{ readonly to: string }, undefined> = {
  id: 'iterm.app.move',
  permission: 'iterm:app:move',
  target: { command: 'move' },
  description: 'Move object(s) to a new location.',
  input: t.record({
    to: t.string({ description: 'The new location for the object(s).' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { to: { type: 'string', description: 'The new location for the object(s).' } },
    required: ['to'],
    additionalProperties: false,
  },
}

const appCloseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.close',
  permission: 'iterm:app:close',
  target: { command: 'close' },
  description: 'Close a document.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appRequestCookieOperation: OperationDescriptor<
  { readonly andKeyForAppNamed?: string | undefined },
  undefined
> = {
  id: 'iterm.app.requestCookie',
  permission: 'iterm:app:requestCookie',
  target: { command: 'requestCookie' },
  description: 'Request a Python API cookie',
  input: t.record({
    andKeyForAppNamed: t.optional(
      t.string({ description: 'Name of script using the cookie. This is shown in the console.' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      andKeyForAppNamed: {
        type: 'string',
        description: 'Name of script using the cookie. This is shown in the console.',
      },
    },
    additionalProperties: false,
  },
}

const appCreateTabOperation: OperationDescriptor<
  { readonly withProfile: string; readonly command?: string | undefined },
  undefined
> = {
  id: 'iterm.app.createTab',
  permission: 'iterm:app:createTab',
  target: { command: 'createTab' },
  description: 'Create a new tab',
  input: t.record({
    withProfile: t.string({ description: 'The profile name' }),
    command: t.optional(t.string({ description: 'Shell command to run' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      withProfile: { type: 'string', description: 'The profile name' },
      command: { type: 'string', description: 'Shell command to run' },
    },
    required: ['withProfile'],
    additionalProperties: false,
  },
}

const appCreateTabWithDefaultProfileOperation: OperationDescriptor<
  { readonly command?: string | undefined },
  undefined
> = {
  id: 'iterm.app.createTabWithDefaultProfile',
  permission: 'iterm:app:createTabWithDefaultProfile',
  target: { command: 'createTabWithDefaultProfile' },
  description: 'Create a new tab with the default profile',
  input: t.record({
    command: t.optional(t.string({ description: 'Shell command to run' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { command: { type: 'string', description: 'Shell command to run' } },
    additionalProperties: false,
  },
}

const appCreateWindowWithProfileOperation: OperationDescriptor<
  { readonly command?: string | undefined },
  undefined
> = {
  id: 'iterm.app.createWindowWithProfile',
  permission: 'iterm:app:createWindowWithProfile',
  target: { command: 'createWindowWithProfile' },
  description: 'Create a new window',
  input: t.record({
    command: t.optional(t.string({ description: 'Shell command to run' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { command: { type: 'string', description: 'Shell command to run' } },
    additionalProperties: false,
  },
}

const appCreateHotkeyWindowWithProfileOperation: OperationDescriptor<
  Record<string, never>,
  undefined
> = {
  id: 'iterm.app.createHotkeyWindowWithProfile',
  permission: 'iterm:app:createHotkeyWindowWithProfile',
  target: { command: 'createHotkeyWindowWithProfile' },
  description: 'Create a hotkey window',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appLaunchAPIScriptNamedOperation: OperationDescriptor<
  { readonly arguments?: string | undefined },
  undefined
> = {
  id: 'iterm.app.launchAPIScriptNamed',
  permission: 'iterm:app:launchAPIScriptNamed',
  target: { command: 'launchAPIScriptNamed' },
  description: 'Launch API script by name',
  input: t.record({
    arguments: t.optional(t.string({ description: 'Arguments to pass to script' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { arguments: { type: 'string', description: 'Arguments to pass to script' } },
    additionalProperties: false,
  },
}

const appInvokeAPIExpressionOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.invokeAPIExpression',
  permission: 'iterm:app:invokeAPIExpression',
  target: { command: 'invokeAPIExpression' },
  description: 'Invokes an expression, such as a registered function.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appCreateWindowWithDefaultProfileOperation: OperationDescriptor<
  { readonly command?: string | undefined },
  undefined
> = {
  id: 'iterm.app.createWindowWithDefaultProfile',
  permission: 'iterm:app:createWindowWithDefaultProfile',
  target: { command: 'createWindowWithDefaultProfile' },
  description: 'Create a new window with the default profile',
  input: t.record({
    command: t.optional(t.string({ description: 'Shell command to run' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { command: { type: 'string', description: 'Shell command to run' } },
    additionalProperties: false,
  },
}

const appWriteOperation: OperationDescriptor<
  {
    readonly contentsOfFile?: FileSource | undefined
    readonly text?: string | undefined
    readonly newline?: boolean | undefined
  },
  undefined
> = {
  id: 'iterm.app.write',
  permission: 'iterm:app:write',
  target: { command: 'write' },
  description: 'Send text as though it was typed.',
  input: t.record({
    contentsOfFile: t.optional(t.fileSource({ description: 'Filename to send the contents of' })),
    text: t.optional(t.string({ description: 'Text to send' })),
    newline: t.optional(
      t.boolean({ description: 'If newline should be added to end of text (default: yes)' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      contentsOfFile: {
        type: 'object',
        properties: {
          fileSource: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  kind: { type: 'string', const: 'caller-owned-file' },
                  path: { type: 'string', minLength: 1 },
                },
                required: ['kind', 'path'],
                additionalProperties: false,
              },
              {
                type: 'object',
                properties: {
                  kind: { type: 'string', const: 'uploaded-file' },
                  uploadId: { type: 'string', minLength: 1 },
                },
                required: ['kind', 'uploadId'],
                additionalProperties: false,
              },
            ],
          },
        },
        required: ['fileSource'],
        additionalProperties: false,
        description: 'Filename to send the contents of',
      },
      text: { type: 'string', description: 'Text to send' },
      newline: {
        type: 'boolean',
        description: 'If newline should be added to end of text (default: yes)',
      },
    },
    additionalProperties: false,
  },
}

const appSelectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.select',
  permission: 'iterm:app:select',
  target: { command: 'select' },
  description: 'Make receiver visible and selected.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appSplitVerticallyOperation: OperationDescriptor<
  { readonly withProfile: string; readonly command?: string | undefined },
  undefined
> = {
  id: 'iterm.app.splitVertically',
  permission: 'iterm:app:splitVertically',
  target: { command: 'splitVertically' },
  description: 'Split a session vertically.',
  input: t.record({
    withProfile: t.string({ description: 'Name of profile for new session.' }),
    command: t.optional(t.string({ description: 'Shell command to run' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      withProfile: { type: 'string', description: 'Name of profile for new session.' },
      command: { type: 'string', description: 'Shell command to run' },
    },
    required: ['withProfile'],
    additionalProperties: false,
  },
}

const appSplitVerticallyWithDefaultProfileOperation: OperationDescriptor<
  { readonly command?: string | undefined },
  undefined
> = {
  id: 'iterm.app.splitVerticallyWithDefaultProfile',
  permission: 'iterm:app:splitVerticallyWithDefaultProfile',
  target: { command: 'splitVerticallyWithDefaultProfile' },
  description: 'Split a session vertically, using the default profile for the new session',
  input: t.record({
    command: t.optional(t.string({ description: 'Shell command to run' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { command: { type: 'string', description: 'Shell command to run' } },
    additionalProperties: false,
  },
}

const appSplitVerticallyWithSameProfileOperation: OperationDescriptor<
  { readonly command?: string | undefined },
  undefined
> = {
  id: 'iterm.app.splitVerticallyWithSameProfile',
  permission: 'iterm:app:splitVerticallyWithSameProfile',
  target: { command: 'splitVerticallyWithSameProfile' },
  description:
    "Split a session vertically, using the original session's profile for the new session",
  input: t.record({
    command: t.optional(t.string({ description: 'Shell command to run' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { command: { type: 'string', description: 'Shell command to run' } },
    additionalProperties: false,
  },
}

const appSplitHorizontallyOperation: OperationDescriptor<
  { readonly withProfile: string; readonly command?: string | undefined },
  undefined
> = {
  id: 'iterm.app.splitHorizontally',
  permission: 'iterm:app:splitHorizontally',
  target: { command: 'splitHorizontally' },
  description: 'Split a session horizontally.',
  input: t.record({
    withProfile: t.string({ description: 'Name of profile for new session.' }),
    command: t.optional(t.string({ description: 'Shell command to run' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      withProfile: { type: 'string', description: 'Name of profile for new session.' },
      command: { type: 'string', description: 'Shell command to run' },
    },
    required: ['withProfile'],
    additionalProperties: false,
  },
}

const appSplitHorizontallyWithDefaultProfileOperation: OperationDescriptor<
  { readonly command?: string | undefined },
  undefined
> = {
  id: 'iterm.app.splitHorizontallyWithDefaultProfile',
  permission: 'iterm:app:splitHorizontallyWithDefaultProfile',
  target: { command: 'splitHorizontallyWithDefaultProfile' },
  description: 'Split a session horizontally, using the default profile for the new session',
  input: t.record({
    command: t.optional(t.string({ description: 'Shell command to run' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { command: { type: 'string', description: 'Shell command to run' } },
    additionalProperties: false,
  },
}

const appSplitHorizontallyWithSameProfileOperation: OperationDescriptor<
  { readonly command?: string | undefined },
  undefined
> = {
  id: 'iterm.app.splitHorizontallyWithSameProfile',
  permission: 'iterm:app:splitHorizontallyWithSameProfile',
  target: { command: 'splitHorizontallyWithSameProfile' },
  description:
    "Split a session horizontally, using the original session's profile for the new session",
  input: t.record({
    command: t.optional(t.string({ description: 'Shell command to run' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { command: { type: 'string', description: 'Shell command to run' } },
    additionalProperties: false,
  },
}

const appVariableOperation: OperationDescriptor<{ readonly named: string }, undefined> = {
  id: 'iterm.app.variable',
  permission: 'iterm:app:variable',
  target: { command: 'variable' },
  description: 'Returns the value of a session variable with the given name',
  input: t.record({
    named: t.string({ description: 'Name of variable' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { named: { type: 'string', description: 'Name of variable' } },
    required: ['named'],
    additionalProperties: false,
  },
}

const appSetVariableOperation: OperationDescriptor<
  { readonly named: string; readonly to: string },
  undefined
> = {
  id: 'iterm.app.setVariable',
  permission: 'iterm:app:setVariable',
  target: { command: 'setVariable' },
  description: 'Sets the value of a session variable',
  input: t.record({
    named: t.string({ description: 'Name of variable' }),
    to: t.string({ description: 'New value' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      named: { type: 'string', description: 'Name of variable' },
      to: { type: 'string', description: 'New value' },
    },
    required: ['named', 'to'],
    additionalProperties: false,
  },
}

const appRevealHotkeyWindowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.revealHotkeyWindow',
  permission: 'iterm:app:revealHotkeyWindow',
  target: { command: 'revealHotkeyWindow' },
  description: 'Reveals a hotkey window. Only to be called on windows that are hotkey windows.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appHideHotkeyWindowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.hideHotkeyWindow',
  permission: 'iterm:app:hideHotkeyWindow',
  target: { command: 'hideHotkeyWindow' },
  description: 'Hides a hotkey window. Only to be called on windows that are hotkey windows.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appToggleHotkeyWindowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.toggleHotkeyWindow',
  permission: 'iterm:app:toggleHotkeyWindow',
  target: { command: 'toggleHotkeyWindow' },
  description:
    'Toggles the visibility of a hotkey window. Only to be called on windows that are hotkey windows.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<iTermClient>['operations'] = {
  'iterm.app.count': appCountOperation,
  'iterm.app.delete': appDeleteOperation,
  'iterm.app.duplicate': appDuplicateOperation,
  'iterm.app.exists': appExistsOperation,
  'iterm.app.make': appMakeOperation,
  'iterm.app.move': appMoveOperation,
  'iterm.app.close': appCloseOperation,
  'iterm.app.requestCookie': appRequestCookieOperation,
  'iterm.app.createTab': appCreateTabOperation,
  'iterm.app.createTabWithDefaultProfile': appCreateTabWithDefaultProfileOperation,
  'iterm.app.createWindowWithProfile': appCreateWindowWithProfileOperation,
  'iterm.app.createHotkeyWindowWithProfile': appCreateHotkeyWindowWithProfileOperation,
  'iterm.app.launchAPIScriptNamed': appLaunchAPIScriptNamedOperation,
  'iterm.app.invokeAPIExpression': appInvokeAPIExpressionOperation,
  'iterm.app.createWindowWithDefaultProfile': appCreateWindowWithDefaultProfileOperation,
  'iterm.app.write': appWriteOperation,
  'iterm.app.select': appSelectOperation,
  'iterm.app.splitVertically': appSplitVerticallyOperation,
  'iterm.app.splitVerticallyWithDefaultProfile': appSplitVerticallyWithDefaultProfileOperation,
  'iterm.app.splitVerticallyWithSameProfile': appSplitVerticallyWithSameProfileOperation,
  'iterm.app.splitHorizontally': appSplitHorizontallyOperation,
  'iterm.app.splitHorizontallyWithDefaultProfile': appSplitHorizontallyWithDefaultProfileOperation,
  'iterm.app.splitHorizontallyWithSameProfile': appSplitHorizontallyWithSameProfileOperation,
  'iterm.app.variable': appVariableOperation,
  'iterm.app.setVariable': appSetVariableOperation,
  'iterm.app.revealHotkeyWindow': appRevealHotkeyWindowOperation,
  'iterm.app.hideHotkeyWindow': appHideHotkeyWindowOperation,
  'iterm.app.toggleHotkeyWindow': appToggleHotkeyWindowOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): iTermClient {
  return {
    count: (each, options) => runtime.invoke(appCountOperation, { each }, options),
    _delete: (options) => runtime.invoke(appDeleteOperation, {}, options),
    duplicate: (to, withProperties, options) =>
      runtime.invoke(appDuplicateOperation, { to, withProperties }, options),
    exists: (options) => runtime.invoke(appExistsOperation, {}, options),
    make: (_new, at, withData, withProperties, options) =>
      runtime.invoke(appMakeOperation, { new: _new, at, withData, withProperties }, options),
    move: (to, options) => runtime.invoke(appMoveOperation, { to }, options),
    close: (options) => runtime.invoke(appCloseOperation, {}, options),
    requestCookie: (andKeyForAppNamed, options) =>
      runtime.invoke(appRequestCookieOperation, { andKeyForAppNamed }, options),
    createTab: (withProfile, command, options) =>
      runtime.invoke(appCreateTabOperation, { withProfile, command }, options),
    createTabWithDefaultProfile: (command, options) =>
      runtime.invoke(appCreateTabWithDefaultProfileOperation, { command }, options),
    createWindowWithProfile: (command, options) =>
      runtime.invoke(appCreateWindowWithProfileOperation, { command }, options),
    createHotkeyWindowWithProfile: (options) =>
      runtime.invoke(appCreateHotkeyWindowWithProfileOperation, {}, options),
    launchAPIScriptNamed: (_arguments, options) =>
      runtime.invoke(appLaunchAPIScriptNamedOperation, { arguments: _arguments }, options),
    invokeAPIExpression: (options) => runtime.invoke(appInvokeAPIExpressionOperation, {}, options),
    createWindowWithDefaultProfile: (command, options) =>
      runtime.invoke(appCreateWindowWithDefaultProfileOperation, { command }, options),
    write: (contentsOfFile, text, newline, options) =>
      runtime.invoke(appWriteOperation, { contentsOfFile, text, newline }, options),
    select: (options) => runtime.invoke(appSelectOperation, {}, options),
    splitVertically: (withProfile, command, options) =>
      runtime.invoke(appSplitVerticallyOperation, { withProfile, command }, options),
    splitVerticallyWithDefaultProfile: (command, options) =>
      runtime.invoke(appSplitVerticallyWithDefaultProfileOperation, { command }, options),
    splitVerticallyWithSameProfile: (command, options) =>
      runtime.invoke(appSplitVerticallyWithSameProfileOperation, { command }, options),
    splitHorizontally: (withProfile, command, options) =>
      runtime.invoke(appSplitHorizontallyOperation, { withProfile, command }, options),
    splitHorizontallyWithDefaultProfile: (command, options) =>
      runtime.invoke(appSplitHorizontallyWithDefaultProfileOperation, { command }, options),
    splitHorizontallyWithSameProfile: (command, options) =>
      runtime.invoke(appSplitHorizontallyWithSameProfileOperation, { command }, options),
    variable: (named, options) => runtime.invoke(appVariableOperation, { named }, options),
    setVariable: (named, to, options) =>
      runtime.invoke(appSetVariableOperation, { named, to }, options),
    revealHotkeyWindow: (options) => runtime.invoke(appRevealHotkeyWindowOperation, {}, options),
    hideHotkeyWindow: (options) => runtime.invoke(appHideHotkeyWindowOperation, {}, options),
    toggleHotkeyWindow: (options) => runtime.invoke(appToggleHotkeyWindowOperation, {}, options),
  }
}

/**
 * The iTerm contract. Pass it to a client factory to obtain a
 * {@link iTermClient}.
 */
export const iTermContract: AppContract<iTermClient> = {
  app: 'iterm',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
