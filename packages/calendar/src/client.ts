/**
 * Calendar HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { CalendarResourceClient } from './resources/calendar.js'
import { EventResourceClient } from './resources/event.js'
import { AttendeeResourceClient } from './resources/attendee.js'
import { DisplayAlarmResourceClient } from './resources/displayalarm.js'
import { MailAlarmResourceClient } from './resources/mailalarm.js'
import { SoundAlarmResourceClient } from './resources/soundalarm.js'
import { OpenFileAlarmResourceClient } from './resources/openfilealarm.js'
import type { ViewType } from './types.js'

/**
 * Client configuration options.
 */
export interface CalendarClientOptions {
  /** API key for authentication */
  apiKey: string
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
export class HttpClient {
  readonly #baseUrl: string
  readonly #apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl
    this.#apiKey = apiKey
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = `${this.#baseUrl}/api/v1/rpc/${path}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = (await response.json()) as { error?: { code?: string; message?: string } }
      const code = error.error?.code ?? 'UNKNOWN_ERROR'
      const message = error.error?.message ?? `HTTP ${String(response.status)}`
      throw new CalendarError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for Calendar API errors.
 */
export class CalendarError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CalendarError'
    this.code = code
  }
}

/**
 * Calendar client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new CalendarClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class CalendarClient {
  readonly #httpClient: HttpClient

  /** A calendar containing events */
  readonly calendars: CalendarResourceClient

  /** A calendar event */
  readonly events: EventResourceClient

  /** An event attendee */
  readonly attendees: AttendeeResourceClient

  /** A message/display alarm */
  readonly displayalarms: DisplayAlarmResourceClient

  /** A mail/email alarm */
  readonly mailalarms: MailAlarmResourceClient

  /** A sound alarm */
  readonly soundalarms: SoundAlarmResourceClient

  /** An 'open file' alarm */
  readonly openfilealarms: OpenFileAlarmResourceClient

  constructor(options: CalendarClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.calendars = new CalendarResourceClient(this.#httpClient, 'calendar', 'calendars')
    this.events = new EventResourceClient(this.#httpClient, 'calendar', 'events')
    this.attendees = new AttendeeResourceClient(this.#httpClient, 'calendar', 'attendees')
    this.displayalarms = new DisplayAlarmResourceClient(
      this.#httpClient,
      'calendar',
      'displayalarms'
    )
    this.mailalarms = new MailAlarmResourceClient(this.#httpClient, 'calendar', 'mailalarms')
    this.soundalarms = new SoundAlarmResourceClient(this.#httpClient, 'calendar', 'soundalarms')
    this.openfilealarms = new OpenFileAlarmResourceClient(
      this.#httpClient,
      'calendar',
      'openfilealarms'
    )
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Tell the application to reload all calendar files contents
   */
  async reloadCalendars(): Promise<void> {
    await this.#httpClient.rpc<undefined>('calendar.app.reloadCalendars', {})
  }

  /**
   * Show calendar on the given view
   */
  async switchView(to: ViewType): Promise<void> {
    await this.#httpClient.rpc<undefined>('calendar.app.switchView', { to })
  }

  /**
   * Show calendar on the given date
   */
  async viewCalendar(at: Date): Promise<void> {
    await this.#httpClient.rpc<undefined>('calendar.app.viewCalendar', { at })
  }
}
