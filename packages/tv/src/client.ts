/**
 * TV HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { ArtworkResourceClient } from './resources/artwork.js'
import { BrowserWindowResourceClient } from './resources/browserwindow.js'
import { FileTrackResourceClient } from './resources/filetrack.js'
import { LibraryPlaylistResourceClient } from './resources/libraryplaylist.js'
import { PlaylistResourceClient } from './resources/playlist.js'
import { PlaylistWindowResourceClient } from './resources/playlistwindow.js'
import { SharedTrackResourceClient } from './resources/sharedtrack.js'
import { SourceResourceClient } from './resources/source.js'
import { TrackResourceClient } from './resources/track.js'
import { URLTrackResourceClient } from './resources/urltrack.js'
import { UserPlaylistResourceClient } from './resources/userplaylist.js'
import { VideoWindowResourceClient } from './resources/videowindow.js'

/**
 * Client configuration options.
 */
export interface TVClientOptions {
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
      throw new TVError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for TV API errors.
 */
export class TVError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'TVError'
    this.code = code
  }
}

/**
 * TV client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new TVClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class TVClient {
  readonly #httpClient: HttpClient

  /** a piece of art within a track or playlist */
  readonly artworks: ArtworkResourceClient

  /** the main window */
  readonly browserwindows: BrowserWindowResourceClient

  /** a track representing a video file */
  readonly filetracks: FileTrackResourceClient

  /** the main library playlist */
  readonly libraryplaylists: LibraryPlaylistResourceClient

  /** a list of tracks/streams */
  readonly playlists: PlaylistResourceClient

  /** a sub-window showing a single playlist */
  readonly playlistwindows: PlaylistWindowResourceClient

  /** a track residing in a shared library */
  readonly sharedtracks: SharedTrackResourceClient

  /** a media source (library, CD, device, etc.) */
  readonly sources: SourceResourceClient

  /** playable video source */
  readonly tracks: TrackResourceClient

  /** a track representing a network stream */
  readonly urltracks: URLTrackResourceClient

  /** custom playlists created by the user */
  readonly userplaylists: UserPlaylistResourceClient

  /** the video window */
  readonly videowindows: VideoWindowResourceClient

  constructor(options: TVClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.artworks = new ArtworkResourceClient(this.#httpClient, 'tv', 'artworks')
    this.browserwindows = new BrowserWindowResourceClient(this.#httpClient, 'tv', 'browserwindows')
    this.filetracks = new FileTrackResourceClient(this.#httpClient, 'tv', 'filetracks')
    this.libraryplaylists = new LibraryPlaylistResourceClient(
      this.#httpClient,
      'tv',
      'libraryplaylists'
    )
    this.playlists = new PlaylistResourceClient(this.#httpClient, 'tv', 'playlists')
    this.playlistwindows = new PlaylistWindowResourceClient(
      this.#httpClient,
      'tv',
      'playlistwindows'
    )
    this.sharedtracks = new SharedTrackResourceClient(this.#httpClient, 'tv', 'sharedtracks')
    this.sources = new SourceResourceClient(this.#httpClient, 'tv', 'sources')
    this.tracks = new TrackResourceClient(this.#httpClient, 'tv', 'tracks')
    this.urltracks = new URLTrackResourceClient(this.#httpClient, 'tv', 'urltracks')
    this.userplaylists = new UserPlaylistResourceClient(this.#httpClient, 'tv', 'userplaylists')
    this.videowindows = new VideoWindowResourceClient(this.#httpClient, 'tv', 'videowindows')
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Close an object
   */
  async close(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.close', {})
  }

  /**
   * Return the number of elements of a particular class within an object
   */
  async count(each: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.count', { each })
  }

  /**
   * Delete an element from an object
   */
  async _delete(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.delete', {})
  }

  /**
   * Duplicate one or more object(s)
   */
  async duplicate(to?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.duplicate', { to })
  }

  /**
   * Verify if an object exists
   */
  async exists(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.exists', {})
  }

  /**
   * Make a new element
   */
  async make(_new: string, at?: string, withProperties?: unknown): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.make', { new: _new, at, withProperties })
  }

  /**
   * Open the specified object(s)
   */
  async open(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.open', {})
  }

  /**
   * Run the application
   */
  async run(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.run', {})
  }

  /**
   * Quit the application
   */
  async quit(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.quit', {})
  }

  /**
   * Save the specified object(s)
   */
  async save(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.save', {})
  }

  /**
   * add one or more files to a playlist
   */
  async add(to?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.add', { to })
  }

  /**
   * reposition to beginning of current track or go to previous track if already at start of current track
   */
  async backTrack(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.backTrack', {})
  }

  /**
   * convert one or more files or tracks
   */
  async convert(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.convert', {})
  }

  /**
   * download a cloud track or playlist
   */
  async download(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.download', {})
  }

  /**
   * skip forward in a playing track
   */
  async fastForward(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.fastForward', {})
  }

  /**
   * advance to the next track in the current playlist
   */
  async nextTrack(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.nextTrack', {})
  }

  /**
   * pause playback
   */
  async pause(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.pause', {})
  }

  /**
   * play the current track or the specified track or file.
   */
  async play(once?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.play', { once })
  }

  /**
   * toggle the playing/paused state of the current track
   */
  async playpause(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.playpause', {})
  }

  /**
   * return to the previous track in the current playlist
   */
  async previousTrack(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.previousTrack', {})
  }

  /**
   * disable fast forward/rewind and resume playback, if playing.
   */
  async resume(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.resume', {})
  }

  /**
   * reveal and select a track or playlist
   */
  async reveal(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.reveal', {})
  }

  /**
   * skip backwards in a playing track
   */
  async rewind(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.rewind', {})
  }

  /**
   * select the specified object(s)
   */
  async select(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.select', {})
  }

  /**
   * stop playback
   */
  async stop(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.stop', {})
  }

  /**
   * Opens an iTunes Store or stream URL
   */
  async openLocation(): Promise<void> {
    await this.#httpClient.rpc<undefined>('tv.app.openLocation', {})
  }
}
