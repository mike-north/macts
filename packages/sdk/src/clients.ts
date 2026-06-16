/**
 * Aggregated macts client factory.
 *
 * `createMactsClients()` is the primary authoring entry point. It resolves the
 * API key and base URL once (from environment variables) and returns a single
 * object whose properties are ready-to-use, fully-typed clients for every
 * installed `@macts/<app>` SDK package.
 *
 * The property names match the app-prefix segment of the dotted capability
 * names returned by `macts capabilities search`, so "find a capability →
 * compose it" is a direct mapping:
 *
 * ```
 * $ macts capabilities search events
 * calendar.events.create   write   calendar:events:create
 * reminders.reminders.create  write  reminders:reminders:create
 * ```
 *
 * ```typescript
 * const m = createMactsClients();
 * await m.calendar.events.create({ ... });     // calendar.events.create
 * await m.reminders.reminders.create({ ... }); // reminders.reminders.create
 * ```
 *
 * All clients share the same resolved key and base URL, so every call goes
 * through the same governed API endpoint. Governance is inherited
 * automatically — there is nothing extra to configure.
 *
 * @packageDocumentation
 */

import { AlfredClient } from '@macts/alfred'
import { ArcClient } from '@macts/arc'
import { AutomatorClient } from '@macts/automator'
import { BluetoothFileExchangeClient } from '@macts/bluetooth-file-exchange'
import { CalendarClient } from '@macts/calendar'
import { ConsoleClient } from '@macts/console'
import { ContactsClient } from '@macts/contacts'
import { FinderClient } from '@macts/finder'
import { GoogleChromeClient } from '@macts/google-chrome'
import { iTermClient } from '@macts/iterm'
import { MailClient } from '@macts/mail'
import { MessagesClient } from '@macts/messages'
import { MicrosoftEdgeClient } from '@macts/microsoft-edge'
import { MicrosoftWordClient } from '@macts/microsoft-word'
import { MusicClient } from '@macts/music'
import { NotesClient } from '@macts/notes'
import { OmniFocusClient } from '@macts/omnifocus'
import { OmniGraffleClient } from '@macts/omnigraffle'
import { OmniPlanClient } from '@macts/omniplan'
import { PhotosClient } from '@macts/photos'
import { PreviewClient } from '@macts/preview'
import { QuickTimePlayerClient } from '@macts/quicktime-player'
import { RemindersClient } from '@macts/reminders'
import { SafariClient } from '@macts/safari'
import { ScreenSharingClient } from '@macts/screen-sharing'
import { ScriptEditorClient } from '@macts/script-editor'
import { ShortcutsClient } from '@macts/shortcuts'
import { SpotifyClient } from '@macts/spotify'
import { SystemEventsClient } from '@macts/system-events'
import { SystemInformationClient } from '@macts/system-information'
import { SystemSettingsClient } from '@macts/system-settings'
import { TerminalClient } from '@macts/terminal'
import { TextEditClient } from '@macts/textedit'
import { TVClient } from '@macts/tv'
import { XcodeClient } from '@macts/xcode'
import { resolveConnectionOptions } from './resolve.js'

export type {
  AlfredClient,
  ArcClient,
  AutomatorClient,
  BluetoothFileExchangeClient,
  CalendarClient,
  ConsoleClient,
  ContactsClient,
  FinderClient,
  GoogleChromeClient,
  iTermClient,
  MailClient,
  MessagesClient,
  MicrosoftEdgeClient,
  MicrosoftWordClient,
  MusicClient,
  NotesClient,
  OmniFocusClient,
  OmniGraffleClient,
  OmniPlanClient,
  PhotosClient,
  PreviewClient,
  QuickTimePlayerClient,
  RemindersClient,
  SafariClient,
  ScreenSharingClient,
  ScriptEditorClient,
  ShortcutsClient,
  SpotifyClient,
  SystemEventsClient,
  SystemInformationClient,
  SystemSettingsClient,
  TerminalClient,
  TextEditClient,
  TVClient,
  XcodeClient,
}

/**
 * Typed map of all available macts app clients.
 *
 * Each key matches the app-prefix segment of the dotted capability names
 * returned by `macts capabilities search` (e.g. `calendar` →
 * `calendar.events.create`).
 */
export interface MactsClients {
  /** Alfred launcher automation */
  readonly alfred: AlfredClient
  /** Arc browser automation */
  readonly arc: ArcClient
  /** Automator workflow automation */
  readonly automator: AutomatorClient
  /** Bluetooth File Exchange automation */
  readonly bluetoothFileExchange: BluetoothFileExchangeClient
  /** Calendar automation */
  readonly calendar: CalendarClient
  /** Console log viewer automation */
  readonly console: ConsoleClient
  /** Contacts book automation */
  readonly contacts: ContactsClient
  /** Finder file-manager automation */
  readonly finder: FinderClient
  /** Google Chrome browser automation */
  readonly googleChrome: GoogleChromeClient
  /** iTerm2 terminal emulator automation */
  readonly iterm: iTermClient
  /** Mail automation */
  readonly mail: MailClient
  /** Messages (iMessage/SMS) automation */
  readonly messages: MessagesClient
  /** Microsoft Edge browser automation */
  readonly microsoftEdge: MicrosoftEdgeClient
  /** Microsoft Word automation */
  readonly microsoftWord: MicrosoftWordClient
  /** Music (Apple Music) automation */
  readonly music: MusicClient
  /** Notes automation */
  readonly notes: NotesClient
  /** OmniFocus task manager automation */
  readonly omnifocus: OmniFocusClient
  /** OmniGraffle diagramming automation */
  readonly omnigraffle: OmniGraffleClient
  /** OmniPlan project-planning automation */
  readonly omniplan: OmniPlanClient
  /** Photos library automation */
  readonly photos: PhotosClient
  /** Preview document viewer automation */
  readonly preview: PreviewClient
  /** QuickTime Player automation */
  readonly quicktimePlayer: QuickTimePlayerClient
  /** Reminders automation */
  readonly reminders: RemindersClient
  /** Safari browser automation */
  readonly safari: SafariClient
  /** Screen Sharing automation */
  readonly screenSharing: ScreenSharingClient
  /** Script Editor automation */
  readonly scriptEditor: ScriptEditorClient
  /** Shortcuts automation */
  readonly shortcuts: ShortcutsClient
  /** Spotify music automation */
  readonly spotify: SpotifyClient
  /** System Events automation */
  readonly systemEvents: SystemEventsClient
  /** System Information automation */
  readonly systemInformation: SystemInformationClient
  /** System Settings automation */
  readonly systemSettings: SystemSettingsClient
  /** Terminal automation */
  readonly terminal: TerminalClient
  /** TextEdit automation */
  readonly textedit: TextEditClient
  /** TV (Apple TV app) automation */
  readonly tv: TVClient
  /** Xcode IDE automation */
  readonly xcode: XcodeClient
}

/**
 * Create all macts app clients with the API key and base URL resolved from
 * the environment.
 *
 * Resolution follows the same convention used by every `@macts/<app>/cli` SDK
 * helper:
 *
 * - **API key**: `MACTS_API_KEY` environment variable (required).
 * - **Base URL**: `MACTS_API_URL` environment variable; defaults to
 *   `http://localhost:8372`.
 *
 * Every returned client is wired to the same governed API endpoint. Every call
 * passes through the macts permission layer automatically — governance is
 * inherited, not configured per-call.
 *
 * A policy-denied operation surfaces as an error thrown by the client method
 * (the `*Error` class from the respective SDK, with `code: 'PERMISSION_DENIED'`
 * or `'GOVERNANCE_DENIED'`).
 *
 * @example
 * ```typescript
 * import { createMactsClients } from '@macts/sdk';
 *
 * // Key and base URL resolved from env — no boilerplate in the script
 * const m = createMactsClients();
 *
 * // Compose operations across apps (≥2 operations in one script)
 * const calendars = await m.calendar.calendars.list();
 * const lists = await m.reminders.lists.list();
 * await m.reminders.reminders.create({
 *   name: `Review: ${calendars[0]?.name ?? 'calendar'}`,
 *   listId: lists[0]?.id ?? '',
 * });
 * ```
 *
 * @throws {Error} When `MACTS_API_KEY` is not set.
 * @returns Fully-typed client map; each client is ready to call immediately.
 */
export function createMactsClients(): MactsClients {
  const opts = resolveConnectionOptions()

  return {
    alfred: new AlfredClient(opts),
    arc: new ArcClient(opts),
    automator: new AutomatorClient(opts),
    bluetoothFileExchange: new BluetoothFileExchangeClient(opts),
    calendar: new CalendarClient(opts),
    console: new ConsoleClient(opts),
    contacts: new ContactsClient(opts),
    finder: new FinderClient(opts),
    googleChrome: new GoogleChromeClient(opts),
    iterm: new iTermClient(opts),
    mail: new MailClient(opts),
    messages: new MessagesClient(opts),
    microsoftEdge: new MicrosoftEdgeClient(opts),
    microsoftWord: new MicrosoftWordClient(opts),
    music: new MusicClient(opts),
    notes: new NotesClient(opts),
    omnifocus: new OmniFocusClient(opts),
    omnigraffle: new OmniGraffleClient(opts),
    omniplan: new OmniPlanClient(opts),
    photos: new PhotosClient(opts),
    preview: new PreviewClient(opts),
    quicktimePlayer: new QuickTimePlayerClient(opts),
    reminders: new RemindersClient(opts),
    safari: new SafariClient(opts),
    screenSharing: new ScreenSharingClient(opts),
    scriptEditor: new ScriptEditorClient(opts),
    shortcuts: new ShortcutsClient(opts),
    spotify: new SpotifyClient(opts),
    systemEvents: new SystemEventsClient(opts),
    systemInformation: new SystemInformationClient(opts),
    systemSettings: new SystemSettingsClient(opts),
    terminal: new TerminalClient(opts),
    textedit: new TextEditClient(opts),
    tv: new TVClient(opts),
    xcode: new XcodeClient(opts),
  }
}
