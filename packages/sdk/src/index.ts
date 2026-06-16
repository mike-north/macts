/**
 * `@macts/sdk` — frictionless authoring helper for governed macts scripts.
 *
 * This package is the Rung-1 authoring entry point for agents writing TS/JS
 * scripts that compose `@macts/*` SDK calls. It resolves the API key and
 * base URL once from the environment and returns ready-to-use, fully-typed
 * clients for every installed app SDK.
 *
 * ## Quick start
 *
 * ```typescript
 * import { createMactsClients } from '@macts/sdk';
 *
 * const m = createMactsClients();
 *
 * // Compose operations across apps
 * const calendars = await m.calendar.calendars.list();
 * const lists = await m.reminders.lists.list();
 * await m.reminders.reminders.create({
 *   name: `Review meeting: ${calendars[0]?.name ?? 'calendar'}`,
 *   listId: lists[0]?.id ?? '',
 * });
 * ```
 *
 * ## Environment variables
 *
 * | Variable | Required | Description |
 * |---|---|---|
 * | `MACTS_API_KEY` | Yes | API key token (`macts_sk_...`). Create with `macts api-key create`. |
 * | `MACTS_API_URL` | No | Base URL of the macts daemon. Default: `http://localhost:8372`. |
 *
 * ## Governance
 *
 * Every client call is routed through the macts API server, where the active
 * governance policy is applied. A policy-denied operation surfaces as an error
 * thrown by the client method (e.g. `CalendarError` with
 * `code: 'GOVERNANCE_DENIED'`). No additional configuration is needed.
 *
 * @packageDocumentation
 */

export { createMactsClients } from './clients.js'
export type { MactsClients } from './clients.js'
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
} from './clients.js'
export {
  resolveApiKey,
  resolveBaseUrl,
  resolveConnectionOptions,
  DEFAULT_BASE_URL,
} from './resolve.js'
export type { MactsConnectionOptions } from './resolve.js'
