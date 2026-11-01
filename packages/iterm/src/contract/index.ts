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
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `iTermClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { iTermContract } from '@macts/iterm/contract'
 *
 * const client = createClient(iTermContract, { token, url })
 * ```
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
  /** The unique identifier of the session. */
  readonly id: Integer
  /** The alternate unique identifier of the session. */
  readonly alternateIdentifier: string
  /** The full title of the window. */
  readonly name: string
  /** The index of the window, ordered front to back. */
  index: Integer
  /** The bounding rectangle of the window. */
  bounds: Rectangle
  /** Whether the window has a close box. */
  readonly closeable: boolean
  /** Whether the window can be minimized. */
  readonly miniaturizable: boolean
  /** Whether the window is currently minimized. */
  miniaturized: boolean
  /** Whether the window can be resized. */
  readonly resizable: boolean
  /** Whether the window is currently visible. */
  visible: boolean
  /** Whether the window can be zoomed. */
  readonly zoomable: boolean
  /** Whether the window is currently zoomed. */
  zoomed: boolean
  /** Whether the window is currently the frontmost window. */
  frontmost: boolean
  /** The currently selected tab */
  currentTab: ObjectReferenceVariant<Tab, never>
  /** The current session in a window */
  currentSession: ObjectReferenceVariant<Session, string>
  /** Whether the window is a hotkey window. */
  isHotkeyWindow: boolean
  /**
   * If the window is a hotkey window, this gives the name of the profile that created the window.
   */
  hotkeyWindowProfile: string
  /** The position of the window, relative to the upper left corner of the screen. */
  position: Point
  /** The position of the window, relative to the lower left corner of the screen. */
  origin: Point
  /** The width and height of the window */
  size: Point
  /** The bounding rectangle, relative to the lower left corner of the screen. */
  frame: Rectangle
}

/** A terminal tab */
export interface Tab {
  /** The current session in a tab */
  currentSession: ObjectReferenceVariant<Session, string>
  /** Index of tab in parent tab view control */
  index: Integer
  /** The title property */
  title: string
}

/** A terminal session */
export interface Session {
  /** The unique identifier of the session. */
  readonly id: string
  /** The session has received output recently. */
  isProcessing: boolean
  /** The terminal is at the shell prompt. Requires shell integration. */
  isAtShellPrompt: boolean
  /** The columns property */
  columns: Integer
  /** The rows property */
  rows: Integer
  /** The tty property */
  readonly tty: string
  /** The currently visible contents of the session. */
  contents: string
  /** The currently visible contents of the session. */
  readonly text: string
  /** The colorPreset property */
  colorPreset: string
  /** The backgroundColor property */
  backgroundColor: Rgb
  /** The boldColor property */
  boldColor: Rgb
  /** The cursorColor property */
  cursorColor: Rgb
  /** The cursorTextColor property */
  cursorTextColor: Rgb
  /** The foregroundColor property */
  foregroundColor: Rgb
  /** The selectedTextColor property */
  selectedTextColor: Rgb
  /** The selectionColor property */
  selectionColor: Rgb
  /** The aNSIBlackColor property */
  aNSIBlackColor: Rgb
  /** The aNSIRedColor property */
  aNSIRedColor: Rgb
  /** The aNSIGreenColor property */
  aNSIGreenColor: Rgb
  /** The aNSIYellowColor property */
  aNSIYellowColor: Rgb
  /** The aNSIBlueColor property */
  aNSIBlueColor: Rgb
  /** The aNSIMagentaColor property */
  aNSIMagentaColor: Rgb
  /** The aNSICyanColor property */
  aNSICyanColor: Rgb
  /** The aNSIWhiteColor property */
  aNSIWhiteColor: Rgb
  /** The aNSIBrightBlackColor property */
  aNSIBrightBlackColor: Rgb
  /** The aNSIBrightRedColor property */
  aNSIBrightRedColor: Rgb
  /** The aNSIBrightGreenColor property */
  aNSIBrightGreenColor: Rgb
  /** The aNSIBrightYellowColor property */
  aNSIBrightYellowColor: Rgb
  /** The aNSIBrightBlueColor property */
  aNSIBrightBlueColor: Rgb
  /** The aNSIBrightMagentaColor property */
  aNSIBrightMagentaColor: Rgb
  /** The aNSIBrightCyanColor property */
  aNSIBrightCyanColor: Rgb
  /** The aNSIBrightWhiteColor property */
  aNSIBrightWhiteColor: Rgb
  /** The underlineColor property */
  underlineColor: Rgb
  /** Whether the use a dedicated color for underlining. */
  useUnderlineColor: boolean
  /** The backgroundImage property */
  backgroundImage: string
  /** The name property */
  name: string
  /** The transparency property */
  transparency: number
  /** The uniqueID property */
  readonly uniqueID: string
  /** The session's profile name */
  readonly profileName: string
  /** ENQ Answerback string */
  answerbackString: string
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
  currentTab?: ObjectReferenceVariant<Tab, never>
  /** The current session in a window */
  currentSession?: ObjectReferenceVariant<Session, string>
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
  currentTab?: ObjectReferenceVariant<Tab, never>
  /** The current session in a window */
  currentSession?: ObjectReferenceVariant<Session, string>
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

/** Input for creating a Tab. */
export interface TabCreateInput {
  /** The current session in a tab */
  currentSession?: ObjectReferenceVariant<Session, string>
  /** Index of tab in parent tab view control */
  index?: Integer
  /** The title property */
  title?: string
}

/** Input for updating a Tab. Omitted fields are left unchanged. */
export interface TabUpdateInput {
  /** The current session in a tab */
  currentSession?: ObjectReferenceVariant<Session, string>
  /** Index of tab in parent tab view control */
  index?: Integer
  /** The title property */
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

/**
 * The iTerm client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link iTermContract}.
 */
export interface iTermClient {
  /** Return the number of elements of a particular class within an object. */
  count(each?: string, options?: CallOptions): Promise<void>
  /** Delete an object. */
  _delete(options?: CallOptions): Promise<void>
  /** Copy object(s) and put the copies at a new location. */
  duplicate(to: string, withProperties?: unknown, options?: CallOptions): Promise<void>
  /** Verify if an object exists. */
  exists(options?: CallOptions): Promise<void>
  /** Make a new object. */
  make(
    _new: string,
    at?: string,
    withData?: unknown,
    withProperties?: unknown,
    options?: CallOptions
  ): Promise<void>
  /** Move object(s) to a new location. */
  move(to: string, options?: CallOptions): Promise<void>
  /** Close a document. */
  close(options?: CallOptions): Promise<void>
  /** Request a Python API cookie */
  requestCookie(andKeyForAppNamed?: string, options?: CallOptions): Promise<void>
  /** Create a new tab */
  createTab(withProfile: string, command?: string, options?: CallOptions): Promise<void>
  /** Create a new tab with the default profile */
  createTabWithDefaultProfile(command?: string, options?: CallOptions): Promise<void>
  /** Create a new window */
  createWindowWithProfile(command?: string, options?: CallOptions): Promise<void>
  /** Create a hotkey window */
  createHotkeyWindowWithProfile(options?: CallOptions): Promise<void>
  /** Launch API script by name */
  launchAPIScriptNamed(_arguments?: string, options?: CallOptions): Promise<void>
  /** Invokes an expression, such as a registered function. */
  invokeAPIExpression(options?: CallOptions): Promise<void>
  /** Create a new window with the default profile */
  createWindowWithDefaultProfile(command?: string, options?: CallOptions): Promise<void>
  /** Send text as though it was typed. */
  write(
    contentsOfFile?: FileSource,
    text?: string,
    newline?: boolean,
    options?: CallOptions
  ): Promise<void>
  /** Make receiver visible and selected. */
  select(options?: CallOptions): Promise<void>
  /** Split a session vertically. */
  splitVertically(withProfile: string, command?: string, options?: CallOptions): Promise<void>
  /** Split a session vertically, using the default profile for the new session */
  splitVerticallyWithDefaultProfile(command?: string, options?: CallOptions): Promise<void>
  /** Split a session vertically, using the original session's profile for the new session */
  splitVerticallyWithSameProfile(command?: string, options?: CallOptions): Promise<void>
  /** Split a session horizontally. */
  splitHorizontally(withProfile: string, command?: string, options?: CallOptions): Promise<void>
  /** Split a session horizontally, using the default profile for the new session */
  splitHorizontallyWithDefaultProfile(command?: string, options?: CallOptions): Promise<void>
  /** Split a session horizontally, using the original session's profile for the new session */
  splitHorizontallyWithSameProfile(command?: string, options?: CallOptions): Promise<void>
  /** Returns the value of a session variable with the given name */
  variable(named: string, options?: CallOptions): Promise<void>
  /** Sets the value of a session variable */
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
    alternateIdentifier: t.string({
      description: 'The alternate unique identifier of the session.',
    }),
    name: t.string({ description: 'The full title of the window.' }),
    index: t.integer({ description: 'The index of the window, ordered front to back.' }),
    bounds: t.rectangle({ description: 'The bounding rectangle of the window.' }),
    closeable: t.boolean({ description: 'Whether the window has a close box.' }),
    miniaturizable: t.boolean({ description: 'Whether the window can be minimized.' }),
    miniaturized: t.boolean({ description: 'Whether the window is currently minimized.' }),
    resizable: t.boolean({ description: 'Whether the window can be resized.' }),
    visible: t.boolean({ description: 'Whether the window is currently visible.' }),
    zoomable: t.boolean({ description: 'Whether the window can be zoomed.' }),
    zoomed: t.boolean({ description: 'Whether the window is currently zoomed.' }),
    frontmost: t.boolean({ description: 'Whether the window is currently the frontmost window.' }),
    currentTab: t.reference<Tab, never>(() => resources, 'Tab', 'one', {
      description: 'The currently selected tab',
    }),
    currentSession: t.reference<Session, string>(() => resources, 'Session', 'one', {
      description: 'The current session in a window',
    }),
    isHotkeyWindow: t.boolean({ description: 'Whether the window is a hotkey window.' }),
    hotkeyWindowProfile: t.string({
      description:
        'If the window is a hotkey window, this gives the name of the profile that created the window.',
    }),
    position: t.point({
      description: 'The position of the window, relative to the upper left corner of the screen.',
    }),
    origin: t.point({
      description: 'The position of the window, relative to the lower left corner of the screen.',
    }),
    size: t.point({ description: 'The width and height of the window' }),
    frame: t.rectangle({
      description: 'The bounding rectangle, relative to the lower left corner of the screen.',
    }),
  },
  { description: 'A window.' }
)

const tabRecordType: ValueType<Tab> = t.record(
  {
    currentSession: t.reference<Session, string>(() => resources, 'Session', 'one', {
      description: 'The current session in a tab',
    }),
    index: t.integer({ description: 'Index of tab in parent tab view control' }),
    title: t.string({ description: 'The title property' }),
  },
  { description: 'A terminal tab' }
)

const sessionRecordType: ValueType<Session> = t.record(
  {
    id: t.string({ description: 'The unique identifier of the session.' }),
    isProcessing: t.boolean({ description: 'The session has received output recently.' }),
    isAtShellPrompt: t.boolean({
      description: 'The terminal is at the shell prompt. Requires shell integration.',
    }),
    columns: t.integer({ description: 'The columns property' }),
    rows: t.integer({ description: 'The rows property' }),
    tty: t.string({ description: 'The tty property' }),
    contents: t.string({ description: 'The currently visible contents of the session.' }),
    text: t.string({ description: 'The currently visible contents of the session.' }),
    colorPreset: t.string({ description: 'The colorPreset property' }),
    backgroundColor: t.rgb({ description: 'The backgroundColor property' }),
    boldColor: t.rgb({ description: 'The boldColor property' }),
    cursorColor: t.rgb({ description: 'The cursorColor property' }),
    cursorTextColor: t.rgb({ description: 'The cursorTextColor property' }),
    foregroundColor: t.rgb({ description: 'The foregroundColor property' }),
    selectedTextColor: t.rgb({ description: 'The selectedTextColor property' }),
    selectionColor: t.rgb({ description: 'The selectionColor property' }),
    aNSIBlackColor: t.rgb({ description: 'The aNSIBlackColor property' }),
    aNSIRedColor: t.rgb({ description: 'The aNSIRedColor property' }),
    aNSIGreenColor: t.rgb({ description: 'The aNSIGreenColor property' }),
    aNSIYellowColor: t.rgb({ description: 'The aNSIYellowColor property' }),
    aNSIBlueColor: t.rgb({ description: 'The aNSIBlueColor property' }),
    aNSIMagentaColor: t.rgb({ description: 'The aNSIMagentaColor property' }),
    aNSICyanColor: t.rgb({ description: 'The aNSICyanColor property' }),
    aNSIWhiteColor: t.rgb({ description: 'The aNSIWhiteColor property' }),
    aNSIBrightBlackColor: t.rgb({ description: 'The aNSIBrightBlackColor property' }),
    aNSIBrightRedColor: t.rgb({ description: 'The aNSIBrightRedColor property' }),
    aNSIBrightGreenColor: t.rgb({ description: 'The aNSIBrightGreenColor property' }),
    aNSIBrightYellowColor: t.rgb({ description: 'The aNSIBrightYellowColor property' }),
    aNSIBrightBlueColor: t.rgb({ description: 'The aNSIBrightBlueColor property' }),
    aNSIBrightMagentaColor: t.rgb({ description: 'The aNSIBrightMagentaColor property' }),
    aNSIBrightCyanColor: t.rgb({ description: 'The aNSIBrightCyanColor property' }),
    aNSIBrightWhiteColor: t.rgb({ description: 'The aNSIBrightWhiteColor property' }),
    underlineColor: t.rgb({ description: 'The underlineColor property' }),
    useUnderlineColor: t.boolean({
      description: 'Whether the use a dedicated color for underlining.',
    }),
    backgroundImage: t.string({ description: 'The backgroundImage property' }),
    name: t.string({ description: 'The name property' }),
    transparency: t.double({ description: 'The transparency property' }),
    uniqueID: t.string({ description: 'The uniqueID property' }),
    profileName: t.string({ description: "The session's profile name" }),
    answerbackString: t.string({ description: 'ENQ Answerback string' }),
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
}

const appDeleteOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.delete',
  permission: 'iterm:app:delete',
  target: { command: 'delete' },
  description: 'Delete an object.',
  input: t.record({}),
  output: t.none(),
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
}

const appExistsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.exists',
  permission: 'iterm:app:exists',
  target: { command: 'exists' },
  description: 'Verify if an object exists.',
  input: t.record({}),
  output: t.none(),
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
}

const appCloseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.close',
  permission: 'iterm:app:close',
  target: { command: 'close' },
  description: 'Close a document.',
  input: t.record({}),
  output: t.none(),
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
}

const appInvokeAPIExpressionOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.invokeAPIExpression',
  permission: 'iterm:app:invokeAPIExpression',
  target: { command: 'invokeAPIExpression' },
  description: 'Invokes an expression, such as a registered function.',
  input: t.record({}),
  output: t.none(),
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
}

const appSelectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.select',
  permission: 'iterm:app:select',
  target: { command: 'select' },
  description: 'Make receiver visible and selected.',
  input: t.record({}),
  output: t.none(),
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
}

const appRevealHotkeyWindowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.revealHotkeyWindow',
  permission: 'iterm:app:revealHotkeyWindow',
  target: { command: 'revealHotkeyWindow' },
  description: 'Reveals a hotkey window. Only to be called on windows that are hotkey windows.',
  input: t.record({}),
  output: t.none(),
}

const appHideHotkeyWindowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.hideHotkeyWindow',
  permission: 'iterm:app:hideHotkeyWindow',
  target: { command: 'hideHotkeyWindow' },
  description: 'Hides a hotkey window. Only to be called on windows that are hotkey windows.',
  input: t.record({}),
  output: t.none(),
}

const appToggleHotkeyWindowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'iterm.app.toggleHotkeyWindow',
  permission: 'iterm:app:toggleHotkeyWindow',
  target: { command: 'toggleHotkeyWindow' },
  description:
    'Toggles the visibility of a hotkey window. Only to be called on windows that are hotkey windows.',
  input: t.record({}),
  output: t.none(),
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
