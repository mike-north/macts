/**
 * Music HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { AirPlayDeviceResourceClient } from './resources/airplaydevice.js'
import { ArtworkResourceClient } from './resources/artwork.js'
import { AudioCDPlaylistResourceClient } from './resources/audiocdplaylist.js'
import { AudioCDTrackResourceClient } from './resources/audiocdtrack.js'
import { BrowserWindowResourceClient } from './resources/browserwindow.js'
import { EncoderResourceClient } from './resources/encoder.js'
import { EQPresetResourceClient } from './resources/eqpreset.js'
import { EQWindowResourceClient } from './resources/eqwindow.js'
import { FileTrackResourceClient } from './resources/filetrack.js'
import { LibraryPlaylistResourceClient } from './resources/libraryplaylist.js'
import { MiniplayerWindowResourceClient } from './resources/miniplayerwindow.js'
import { PlaylistResourceClient } from './resources/playlist.js'
import { PlaylistWindowResourceClient } from './resources/playlistwindow.js'
import { RadioTunerPlaylistResourceClient } from './resources/radiotunerplaylist.js'
import { SharedTrackResourceClient } from './resources/sharedtrack.js'
import { SourceResourceClient } from './resources/source.js'
import { SubscriptionPlaylistResourceClient } from './resources/subscriptionplaylist.js'
import { TrackResourceClient } from './resources/track.js'
import { URLTrackResourceClient } from './resources/urltrack.js'
import { UserPlaylistResourceClient } from './resources/userplaylist.js'
import { VideoWindowResourceClient } from './resources/videowindow.js'
import { VisualResourceClient } from './resources/visual.js'

/**
 * Client configuration options.
 */
export interface MusicClientOptions {
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
      throw new MusicError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for Music API errors.
 */
export class MusicError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'MusicError'
    this.code = code
  }
}

/**
 * Music client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new MusicClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class MusicClient {
  readonly #httpClient: HttpClient

  /** an AirPlay device */
  readonly airplaydevices: AirPlayDeviceResourceClient

  /** a piece of art within a track or playlist */
  readonly artworks: ArtworkResourceClient

  /** a playlist representing an audio CD */
  readonly audiocdplaylists: AudioCDPlaylistResourceClient

  /** a track on an audio CD */
  readonly audiocdtracks: AudioCDTrackResourceClient

  /** the main window */
  readonly browserwindows: BrowserWindowResourceClient

  /** converts a track to a specific file format */
  readonly encoders: EncoderResourceClient

  /** equalizer preset configuration */
  readonly eqpresets: EQPresetResourceClient

  /** the equalizer window */
  readonly eqwindows: EQWindowResourceClient

  /** a track representing an audio file (MP3, AIFF, etc.) */
  readonly filetracks: FileTrackResourceClient

  /** the main library playlist */
  readonly libraryplaylists: LibraryPlaylistResourceClient

  /** the miniplayer window */
  readonly miniplayerwindows: MiniplayerWindowResourceClient

  /** a list of tracks/streams */
  readonly playlists: PlaylistResourceClient

  /** a sub-window showing a single playlist */
  readonly playlistwindows: PlaylistWindowResourceClient

  /** the radio tuner playlist */
  readonly radiotunerplaylists: RadioTunerPlaylistResourceClient

  /** a track residing in a shared library */
  readonly sharedtracks: SharedTrackResourceClient

  /** a media source (library, CD, device, etc.) */
  readonly sources: SourceResourceClient

  /** a subscription playlist from Apple Music */
  readonly subscriptionplaylists: SubscriptionPlaylistResourceClient

  /** playable audio source */
  readonly tracks: TrackResourceClient

  /** a track representing a network stream */
  readonly urltracks: URLTrackResourceClient

  /** custom playlists created by the user */
  readonly userplaylists: UserPlaylistResourceClient

  /** the video window */
  readonly videowindows: VideoWindowResourceClient

  /** a visual plug-in */
  readonly visuals: VisualResourceClient

  constructor(options: MusicClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.airplaydevices = new AirPlayDeviceResourceClient(
      this.#httpClient,
      'music',
      'airplaydevices'
    )
    this.artworks = new ArtworkResourceClient(this.#httpClient, 'music', 'artworks')
    this.audiocdplaylists = new AudioCDPlaylistResourceClient(
      this.#httpClient,
      'music',
      'audiocdplaylists'
    )
    this.audiocdtracks = new AudioCDTrackResourceClient(this.#httpClient, 'music', 'audiocdtracks')
    this.browserwindows = new BrowserWindowResourceClient(
      this.#httpClient,
      'music',
      'browserwindows'
    )
    this.encoders = new EncoderResourceClient(this.#httpClient, 'music', 'encoders')
    this.eqpresets = new EQPresetResourceClient(this.#httpClient, 'music', 'eqpresets')
    this.eqwindows = new EQWindowResourceClient(this.#httpClient, 'music', 'eqwindows')
    this.filetracks = new FileTrackResourceClient(this.#httpClient, 'music', 'filetracks')
    this.libraryplaylists = new LibraryPlaylistResourceClient(
      this.#httpClient,
      'music',
      'libraryplaylists'
    )
    this.miniplayerwindows = new MiniplayerWindowResourceClient(
      this.#httpClient,
      'music',
      'miniplayerwindows'
    )
    this.playlists = new PlaylistResourceClient(this.#httpClient, 'music', 'playlists')
    this.playlistwindows = new PlaylistWindowResourceClient(
      this.#httpClient,
      'music',
      'playlistwindows'
    )
    this.radiotunerplaylists = new RadioTunerPlaylistResourceClient(
      this.#httpClient,
      'music',
      'radiotunerplaylists'
    )
    this.sharedtracks = new SharedTrackResourceClient(this.#httpClient, 'music', 'sharedtracks')
    this.sources = new SourceResourceClient(this.#httpClient, 'music', 'sources')
    this.subscriptionplaylists = new SubscriptionPlaylistResourceClient(
      this.#httpClient,
      'music',
      'subscriptionplaylists'
    )
    this.tracks = new TrackResourceClient(this.#httpClient, 'music', 'tracks')
    this.urltracks = new URLTrackResourceClient(this.#httpClient, 'music', 'urltracks')
    this.userplaylists = new UserPlaylistResourceClient(this.#httpClient, 'music', 'userplaylists')
    this.videowindows = new VideoWindowResourceClient(this.#httpClient, 'music', 'videowindows')
    this.visuals = new VisualResourceClient(this.#httpClient, 'music', 'visuals')
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Print the specified object(s)
   */
  async print(
    printDialog?: boolean,
    withProperties?: string,
    kind?: string,
    theme?: string
  ): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.print', {
      printDialog,
      withProperties,
      kind,
      theme,
    })
  }

  /**
   * Close an object
   */
  async close(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.close', {})
  }

  /**
   * Return the number of elements of a particular class within an object
   */
  async count(each: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.count', { each })
  }

  /**
   * Delete an element from an object
   */
  async _delete(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.delete', {})
  }

  /**
   * Duplicate one or more object(s)
   */
  async duplicate(to?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.duplicate', { to })
  }

  /**
   * Verify if an object exists
   */
  async exists(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.exists', {})
  }

  /**
   * Make a new element
   */
  async make(_new: string, at?: string, withProperties?: unknown): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.make', { new: _new, at, withProperties })
  }

  /**
   * Open the specified object(s)
   */
  async open(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.open', {})
  }

  /**
   * Run the application
   */
  async run(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.run', {})
  }

  /**
   * Quit the application
   */
  async quit(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.quit', {})
  }

  /**
   * Save the specified object(s)
   */
  async save(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.save', {})
  }

  /**
   * add one or more files to a playlist
   */
  async add(to?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.add', { to })
  }

  /**
   * reposition to beginning of current track or go to previous track if already at start of current track
   */
  async backTrack(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.backTrack', {})
  }

  /**
   * convert one or more files or tracks
   */
  async convert(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.convert', {})
  }

  /**
   * download a cloud track or playlist
   */
  async download(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.download', {})
  }

  /**
   * export a source or playlist
   */
  async _export(as?: string, to?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.export', { as, to })
  }

  /**
   * skip forward in a playing track
   */
  async fastForward(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.fastForward', {})
  }

  /**
   * advance to the next track in the current playlist
   */
  async nextTrack(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.nextTrack', {})
  }

  /**
   * pause playback
   */
  async pause(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.pause', {})
  }

  /**
   * play the current track or the specified track or file.
   */
  async play(once?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.play', { once })
  }

  /**
   * toggle the playing/paused state of the current track
   */
  async playpause(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.playpause', {})
  }

  /**
   * return to the previous track in the current playlist
   */
  async previousTrack(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.previousTrack', {})
  }

  /**
   * disable fast forward/rewind and resume playback, if playing.
   */
  async resume(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.resume', {})
  }

  /**
   * reveal and select a track or playlist
   */
  async reveal(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.reveal', {})
  }

  /**
   * skip backwards in a playing track
   */
  async rewind(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.rewind', {})
  }

  /**
   * select the specified object(s)
   */
  async select(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.select', {})
  }

  /**
   * stop playback
   */
  async stop(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.stop', {})
  }

  /**
   * Opens an iTunes Store or audio stream URL
   */
  async openLocation(): Promise<void> {
    await this.#httpClient.rpc<undefined>('music.app.openLocation', {})
  }
}
