/**
 * The TV contract: the transport-neutral description of every
 * TV operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `TVClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `TVClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the TV manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type FileSource,
  type FileValue,
  type Integer,
  type ObjectReferenceData,
  type ObjectReferenceVariant,
  type OperationDescriptor,
  type Page,
  type ResourceDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** EPlS */
export type EPlS = 'stopped' | 'playing' | 'paused' | 'fastForwarding' | 'rewinding'

/** ESrc */
export type ESrc = 'library' | 'sharedLibrary' | 'iTunesStore' | 'unknown'

/** ESrA */
export type ESrA = 'albums' | 'all' | 'artists' | 'displayed' | 'names'

/** ESpK */
export type ESpK = 'none' | 'folder' | 'library' | 'movies' | 'tVShows'

/** EMdK */
export type EMdK = 'homeVideo' | 'movie' | 'tVShow' | 'unknown'

/** ERtK */
export type ERtK = 'user' | 'computed'

/** a piece of art within a track or playlist */
export interface Artwork {
  /**
   * Unique identifier for this artwork.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
  /**
   * data for this artwork, in the form of a picture.
   * Nullable. No evidence that the app always sets it.
   */
  data: string | null
  /**
   * description of artwork as a string.
   * Nullable. No evidence that the app always sets it.
   */
  description: string | null
  /**
   * was this artwork downloaded by iTunes?
   * Nullable. No evidence that the app always sets it.
   */
  readonly downloaded: boolean | null
  /**
   * the data format for this piece of artwork.
   * Nullable. No evidence that the app always sets it.
   */
  readonly format: string | null
  /**
   * kind or purpose of this piece of artwork.
   * Nullable. No evidence that the app always sets it.
   */
  kind: Integer | null
  /**
   * data for this artwork, in original format.
   * Nullable. No evidence that the app always sets it.
   */
  rawData: unknown
}

/** the main window */
export interface BrowserWindow {
  /**
   * Unique identifier for this window.
   * Never null: the primary identifier.
   */
  readonly id: Integer
  /**
   * the selected tracks.
   * Nullable. No evidence that the app always sets it.
   */
  readonly selection: string | null
}

/** a track representing a video file */
export interface FileTrack {
  /**
   * Unique identifier for this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
  /**
   * the location of the file represented by this track.
   * Nullable. No evidence that the app always sets it.
   */
  location: FileValue | null
}

/** the main library playlist */
export interface LibraryPlaylist {
  /**
   * Unique identifier for this playlist.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
}

/** a list of tracks/streams */
export interface Playlist {
  /**
   * The source that holds this playlist.
   * Never null: A playlist belongs to a source; reading its source must return that containing
   * object. An unreadable source is a failed read, not an empty relationship.
   */
  readonly source: ObjectReferenceVariant<Source, string, 'Source'>
  /**
   * Unique identifier for this playlist.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
  /**
   * the id of the item as a hexadecimal string. This id does not change over time.
   * Never null: the primary identifier.
   */
  readonly persistentID: string
  /**
   * the description of the playlist.
   * Nullable. No evidence that the app always sets it.
   */
  description: string | null
  /**
   * the total length of all tracks (in seconds).
   * Nullable. No evidence that the app always sets it.
   */
  readonly duration: Integer | null
  /**
   * the name of the playlist.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * the total size of all tracks (in bytes).
   * Nullable. No evidence that the app always sets it.
   */
  readonly size: Integer | null
  /**
   * special playlist kind.
   * Nullable. No evidence that the app always sets it.
   */
  readonly specialKind: string | null
  /**
   * the length of all tracks in MM:SS format.
   * Nullable. No evidence that the app always sets it.
   */
  readonly time: string | null
  /**
   * is this playlist visible in the Source list?
   * Nullable. No evidence that the app always sets it.
   */
  readonly visible: boolean | null
}

/** a sub-window showing a single playlist */
export interface PlaylistWindow {
  /**
   * Unique identifier for this window.
   * Never null: the primary identifier.
   */
  readonly id: Integer
  /**
   * the selected tracks.
   * Nullable. No evidence that the app always sets it.
   */
  readonly selection: string | null
}

/** a track residing in a shared library */
export interface SharedTrack {
  /**
   * Unique identifier for this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
}

/** a media source (library, CD, device, etc.) */
export interface Source {
  /**
   * Unique identifier for this source.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
  /**
   * the id of the item as a hexadecimal string. This id does not change over time.
   * Never null: the primary identifier.
   */
  readonly persistentID: string
  /**
   * the total size of the source if it has a fixed size.
   * Nullable. No evidence that the app always sets it.
   */
  readonly capacity: number | null
  /**
   * the free space on the source if it has a fixed size.
   * Nullable. No evidence that the app always sets it.
   */
  readonly freeSpace: number | null
  /**
   * The kind property.
   * Nullable. No evidence that the app always sets it.
   */
  readonly kind: string | null
}

/** playable video source */
export interface Track {
  /**
   * Unique identifier for this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
  /**
   * the album name of the track.
   * Nullable. No evidence that the app always sets it.
   */
  album: string | null
  /**
   * the rating of the album for this track (0 to 100).
   * Nullable. No evidence that the app always sets it.
   */
  albumRating: Integer | null
  /**
   * the rating kind of the album rating for this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly albumRatingKind: string | null
  /**
   * the bit rate of the track (in kbps).
   * Nullable. No evidence that the app always sets it.
   */
  readonly bitRate: Integer | null
  /**
   * the bookmark time of the track in seconds.
   * Nullable. No evidence that the app always sets it.
   */
  bookmark: number | null
  /**
   * is the playback position for this track remembered?
   * Nullable. No evidence that the app always sets it.
   */
  bookmarkable: boolean | null
  /**
   * the category of the track.
   * Nullable. No evidence that the app always sets it.
   */
  category: string | null
  /**
   * freeform notes about the track.
   * Nullable. No evidence that the app always sets it.
   */
  comment: string | null
  /**
   * the common, unique ID for this track. If two tracks in different playlists have the same
   * database ID, they are sharing the same data.
   * Nullable. No evidence that the app always sets it.
   */
  readonly databaseID: Integer | null
  /**
   * the date the track was added to the playlist.
   * Nullable. No evidence that the app always sets it.
   */
  readonly dateAdded: Date | null
  /**
   * the description of the track.
   * Nullable. No evidence that the app always sets it.
   */
  description: string | null
  /**
   * the artist/source of the track.
   * Nullable. No evidence that the app always sets it.
   */
  director: string | null
  /**
   * the total number of discs in the source album.
   * Nullable. No evidence that the app always sets it.
   */
  discCount: Integer | null
  /**
   * the index of the disc containing this track on the source album.
   * Nullable. No evidence that the app always sets it.
   */
  discNumber: Integer | null
  /**
   * the account of the person who downloaded this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly downloaderAccount: string | null
  /**
   * the name of the person who downloaded this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly downloaderName: string | null
  /**
   * the length of the track in seconds.
   * Nullable. No evidence that the app always sets it.
   */
  readonly duration: number | null
  /**
   * is this track checked for playback?
   * Nullable. No evidence that the app always sets it.
   */
  enabled: boolean | null
  /**
   * the episode ID of the track.
   * Nullable. No evidence that the app always sets it.
   */
  episodeID: string | null
  /**
   * the episode number of the track.
   * Nullable. No evidence that the app always sets it.
   */
  episodeNumber: Integer | null
  /**
   * the stop time of the track in seconds.
   * Nullable. No evidence that the app always sets it.
   */
  finish: number | null
  /**
   * the genre (category) of the track.
   * Nullable. No evidence that the app always sets it.
   */
  genre: string | null
  /**
   * the grouping (piece) of the track. Generally used to denote movements within a classical work.
   * Nullable. No evidence that the app always sets it.
   */
  grouping: string | null
  /**
   * a text description of the track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly kind: string | null
  /**
   * the long description of the track.
   * Nullable. No evidence that the app always sets it.
   */
  longDescription: string | null
  /**
   * the media kind of the track.
   * Nullable. No evidence that the app always sets it.
   */
  mediaKind: string | null
  /**
   * the modification date of the content of this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly modificationDate: Date | null
  /**
   * number of times this track has been played.
   * Nullable. No evidence that the app always sets it.
   */
  playedCount: Integer | null
  /**
   * the date and time this track was last played.
   * Nullable. No evidence that the app always sets it.
   */
  playedDate: Date | null
  /**
   * the account of the person who purchased this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly purchaserAccount: string | null
  /**
   * the name of the person who purchased this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly purchaserName: string | null
  /**
   * the rating of this track (0 to 100).
   * Nullable. No evidence that the app always sets it.
   */
  rating: Integer | null
  /**
   * the rating kind of this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly ratingKind: string | null
  /**
   * the release date of this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly releaseDate: Date | null
  /**
   * the sample rate of the track (in Hz).
   * Nullable. No evidence that the app always sets it.
   */
  readonly sampleRate: Integer | null
  /**
   * the season number of the track.
   * Nullable. No evidence that the app always sets it.
   */
  seasonNumber: Integer | null
  /**
   * number of times this track has been skipped.
   * Nullable. No evidence that the app always sets it.
   */
  skippedCount: Integer | null
  /**
   * the date and time this track was last skipped.
   * Nullable. No evidence that the app always sets it.
   */
  skippedDate: Date | null
  /**
   * the show name of the track.
   * Nullable. No evidence that the app always sets it.
   */
  show: string | null
  /**
   * override string to use for the track when sorting by album.
   * Nullable. No evidence that the app always sets it.
   */
  sortAlbum: string | null
  /**
   * override string to use for the track when sorting by artist.
   * Nullable. No evidence that the app always sets it.
   */
  sortDirector: string | null
  /**
   * override string to use for the track when sorting by name.
   * Nullable. No evidence that the app always sets it.
   */
  sortName: string | null
  /**
   * override string to use for the track when sorting by show name.
   * Nullable. No evidence that the app always sets it.
   */
  sortShow: string | null
  /**
   * the size of the track (in bytes).
   * Nullable. No evidence that the app always sets it.
   */
  readonly size: number | null
  /**
   * the start time of the track in seconds.
   * Nullable. No evidence that the app always sets it.
   */
  start: number | null
  /**
   * the length of the track in MM:SS format.
   * Nullable. No evidence that the app always sets it.
   */
  readonly time: string | null
  /**
   * the total number of tracks on the source album.
   * Nullable. No evidence that the app always sets it.
   */
  trackCount: Integer | null
  /**
   * the index of the track on the source album.
   * Nullable. No evidence that the app always sets it.
   */
  trackNumber: Integer | null
  /**
   * is this track unplayed?
   * Nullable. No evidence that the app always sets it.
   */
  unplayed: boolean | null
  /**
   * relative volume adjustment of the track (-100% to 100%).
   * Nullable. No evidence that the app always sets it.
   */
  volumeAdjustment: Integer | null
  /**
   * the year the track was recorded/released.
   * Nullable. No evidence that the app always sets it.
   */
  year: Integer | null
}

/** a track representing a network stream */
export interface URLTrack {
  /**
   * Unique identifier for this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
  /**
   * the URL for this track.
   * Nullable. No evidence that the app always sets it.
   */
  address: string | null
}

/** custom playlists created by the user */
export interface UserPlaylist {
  /**
   * Unique identifier for this playlist.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
  /**
   * is this playlist shared?
   * Nullable. No evidence that the app always sets it.
   */
  shared: boolean | null
  /**
   * is this a Smart Playlist?
   * Nullable. No evidence that the app always sets it.
   */
  readonly smart: boolean | null
}

/** the video window */
export interface VideoWindow {
  /**
   * Unique identifier for this window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
}

/** Input for creating an Artwork. */
export interface ArtworkCreateInput {
  /** data for this artwork, in the form of a picture */
  data?: string
  /** description of artwork as a string */
  description?: string
  /** kind or purpose of this piece of artwork */
  kind?: Integer
  /** data for this artwork, in original format */
  rawData?: unknown
}

/** Input for updating an Artwork. Omitted fields are left unchanged. */
export interface ArtworkUpdateInput {
  /**
   * data for this artwork, in the form of a picture.
   * Cannot be reset: null is rejected.
   */
  data?: string
  /**
   * description of artwork as a string.
   * Cannot be reset: null is rejected.
   */
  description?: string
  /**
   * kind or purpose of this piece of artwork.
   * Cannot be reset: null is rejected.
   */
  kind?: Integer
  /**
   * data for this artwork, in original format.
   * Cannot be reset: null is rejected.
   */
  rawData?: unknown
}

/** Input for creating a BrowserWindow. */
export interface BrowserWindowCreateInput {
  /** the playlist currently displayed in the window */
  view?: ObjectReferenceData<string, 'Playlist'>
}

/** Input for updating a BrowserWindow. Omitted fields are left unchanged. */
export interface BrowserWindowUpdateInput {
  /**
   * the playlist currently displayed in the window.
   * Cannot be reset: null is rejected.
   */
  view?: ObjectReferenceData<string, 'Playlist'>
}

/** Input for creating a FileTrack. */
export interface FileTrackCreateInput {
  /** the location of the file represented by this track */
  location?: FileSource
}

/** Input for updating a FileTrack. Omitted fields are left unchanged. */
export interface FileTrackUpdateInput {
  /**
   * the location of the file represented by this track.
   * Cannot be reset: null is rejected.
   */
  location?: FileSource
}

/** Input for creating a LibraryPlaylist. */
export type LibraryPlaylistCreateInput = Record<string, never>

/** Input for updating a LibraryPlaylist. Omitted fields are left unchanged. */
export type LibraryPlaylistUpdateInput = Record<string, never>

/** Input for creating a Playlist. */
export interface PlaylistCreateInput {
  /** the description of the playlist */
  description?: string
  /** the name of the playlist */
  name?: string
}

/** Input for updating a Playlist. Omitted fields are left unchanged. */
export interface PlaylistUpdateInput {
  /**
   * the description of the playlist.
   * Cannot be reset: null is rejected.
   */
  description?: string
  /**
   * the name of the playlist.
   * Cannot be reset: null is rejected.
   */
  name?: string
}

/** Input for creating a PlaylistWindow. */
export type PlaylistWindowCreateInput = Record<string, never>

/** Input for updating a PlaylistWindow. Omitted fields are left unchanged. */
export type PlaylistWindowUpdateInput = Record<string, never>

/** Input for creating a SharedTrack. */
export type SharedTrackCreateInput = Record<string, never>

/** Input for updating a SharedTrack. Omitted fields are left unchanged. */
export type SharedTrackUpdateInput = Record<string, never>

/** Input for creating a Source. */
export type SourceCreateInput = Record<string, never>

/** Input for updating a Source. Omitted fields are left unchanged. */
export type SourceUpdateInput = Record<string, never>

/** Input for creating a Track. */
export interface TrackCreateInput {
  /** the album name of the track */
  album?: string
  /** the rating of the album for this track (0 to 100) */
  albumRating?: Integer
  /** the bookmark time of the track in seconds */
  bookmark?: number
  /** is the playback position for this track remembered? */
  bookmarkable?: boolean
  /** the category of the track */
  category?: string
  /** freeform notes about the track */
  comment?: string
  /** the description of the track */
  description?: string
  /** the artist/source of the track */
  director?: string
  /** the total number of discs in the source album */
  discCount?: Integer
  /** the index of the disc containing this track on the source album */
  discNumber?: Integer
  /** is this track checked for playback? */
  enabled?: boolean
  /** the episode ID of the track */
  episodeID?: string
  /** the episode number of the track */
  episodeNumber?: Integer
  /** the stop time of the track in seconds */
  finish?: number
  /** the genre (category) of the track */
  genre?: string
  /**
   * the grouping (piece) of the track. Generally used to denote movements within a classical work.
   */
  grouping?: string
  /** the long description of the track */
  longDescription?: string
  /** the media kind of the track */
  mediaKind?: string
  /** number of times this track has been played */
  playedCount?: Integer
  /** the date and time this track was last played */
  playedDate?: Date
  /** the rating of this track (0 to 100) */
  rating?: Integer
  /** the season number of the track */
  seasonNumber?: Integer
  /** number of times this track has been skipped */
  skippedCount?: Integer
  /** the date and time this track was last skipped */
  skippedDate?: Date
  /** the show name of the track */
  show?: string
  /** override string to use for the track when sorting by album */
  sortAlbum?: string
  /** override string to use for the track when sorting by artist */
  sortDirector?: string
  /** override string to use for the track when sorting by name */
  sortName?: string
  /** override string to use for the track when sorting by show name */
  sortShow?: string
  /** the start time of the track in seconds */
  start?: number
  /** the total number of tracks on the source album */
  trackCount?: Integer
  /** the index of the track on the source album */
  trackNumber?: Integer
  /** is this track unplayed? */
  unplayed?: boolean
  /** relative volume adjustment of the track (-100% to 100%) */
  volumeAdjustment?: Integer
  /** the year the track was recorded/released */
  year?: Integer
}

/** Input for updating a Track. Omitted fields are left unchanged. */
export interface TrackUpdateInput {
  /**
   * the album name of the track.
   * Cannot be reset: null is rejected.
   */
  album?: string
  /**
   * the rating of the album for this track (0 to 100).
   * Cannot be reset: null is rejected.
   */
  albumRating?: Integer
  /**
   * the bookmark time of the track in seconds.
   * Cannot be reset: null is rejected.
   */
  bookmark?: number
  /**
   * is the playback position for this track remembered?
   * Cannot be reset: null is rejected.
   */
  bookmarkable?: boolean
  /**
   * the category of the track.
   * Cannot be reset: null is rejected.
   */
  category?: string
  /**
   * freeform notes about the track.
   * Cannot be reset: null is rejected.
   */
  comment?: string
  /**
   * the description of the track.
   * Cannot be reset: null is rejected.
   */
  description?: string
  /**
   * the artist/source of the track.
   * Cannot be reset: null is rejected.
   */
  director?: string
  /**
   * the total number of discs in the source album.
   * Cannot be reset: null is rejected.
   */
  discCount?: Integer
  /**
   * the index of the disc containing this track on the source album.
   * Cannot be reset: null is rejected.
   */
  discNumber?: Integer
  /**
   * is this track checked for playback?
   * Cannot be reset: null is rejected.
   */
  enabled?: boolean
  /**
   * the episode ID of the track.
   * Cannot be reset: null is rejected.
   */
  episodeID?: string
  /**
   * the episode number of the track.
   * Cannot be reset: null is rejected.
   */
  episodeNumber?: Integer
  /**
   * the stop time of the track in seconds.
   * Cannot be reset: null is rejected.
   */
  finish?: number
  /**
   * the genre (category) of the track.
   * Cannot be reset: null is rejected.
   */
  genre?: string
  /**
   * the grouping (piece) of the track. Generally used to denote movements within a classical work.
   * Cannot be reset: null is rejected.
   */
  grouping?: string
  /**
   * the long description of the track.
   * Cannot be reset: null is rejected.
   */
  longDescription?: string
  /**
   * the media kind of the track.
   * Cannot be reset: null is rejected.
   */
  mediaKind?: string
  /**
   * number of times this track has been played.
   * Cannot be reset: null is rejected.
   */
  playedCount?: Integer
  /**
   * the date and time this track was last played.
   * Cannot be reset: null is rejected.
   */
  playedDate?: Date
  /**
   * the rating of this track (0 to 100).
   * Cannot be reset: null is rejected.
   */
  rating?: Integer
  /**
   * the season number of the track.
   * Cannot be reset: null is rejected.
   */
  seasonNumber?: Integer
  /**
   * number of times this track has been skipped.
   * Cannot be reset: null is rejected.
   */
  skippedCount?: Integer
  /**
   * the date and time this track was last skipped.
   * Cannot be reset: null is rejected.
   */
  skippedDate?: Date
  /**
   * the show name of the track.
   * Cannot be reset: null is rejected.
   */
  show?: string
  /**
   * override string to use for the track when sorting by album.
   * Cannot be reset: null is rejected.
   */
  sortAlbum?: string
  /**
   * override string to use for the track when sorting by artist.
   * Cannot be reset: null is rejected.
   */
  sortDirector?: string
  /**
   * override string to use for the track when sorting by name.
   * Cannot be reset: null is rejected.
   */
  sortName?: string
  /**
   * override string to use for the track when sorting by show name.
   * Cannot be reset: null is rejected.
   */
  sortShow?: string
  /**
   * the start time of the track in seconds.
   * Cannot be reset: null is rejected.
   */
  start?: number
  /**
   * the total number of tracks on the source album.
   * Cannot be reset: null is rejected.
   */
  trackCount?: Integer
  /**
   * the index of the track on the source album.
   * Cannot be reset: null is rejected.
   */
  trackNumber?: Integer
  /**
   * is this track unplayed?
   * Cannot be reset: null is rejected.
   */
  unplayed?: boolean
  /**
   * relative volume adjustment of the track (-100% to 100%).
   * Cannot be reset: null is rejected.
   */
  volumeAdjustment?: Integer
  /**
   * the year the track was recorded/released.
   * Cannot be reset: null is rejected.
   */
  year?: Integer
}

/** Input for creating an URLTrack. */
export interface URLTrackCreateInput {
  /** the URL for this track */
  address?: string
}

/** Input for updating an URLTrack. Omitted fields are left unchanged. */
export interface URLTrackUpdateInput {
  /**
   * the URL for this track.
   * Cannot be reset: null is rejected.
   */
  address?: string
}

/** Input for creating an UserPlaylist. */
export interface UserPlaylistCreateInput {
  /** is this playlist shared? */
  shared?: boolean
}

/** Input for updating an UserPlaylist. Omitted fields are left unchanged. */
export interface UserPlaylistUpdateInput {
  /**
   * is this playlist shared?
   * Cannot be reset: null is rejected.
   */
  shared?: boolean
}

/** Input for creating a VideoWindow. */
export type VideoWindowCreateInput = Record<string, never>

/** Input for updating a VideoWindow. Omitted fields are left unchanged. */
export type VideoWindowUpdateInput = Record<string, never>

/** the main window */
export interface BrowserWindowResourceClient {
  /** List browser windows, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<BrowserWindow>>
  /**
   * Read the browser window identified by `id`.
   *
   * @param id - Id of the browser window. Does not accept null.
   */
  get(id: Integer, options?: CallOptions): Promise<BrowserWindow>
}

/** a track representing a video file */
export interface FileTrackResourceClient {
  /**
   * update file track information from the current information in the track’s file. macts does not
   * yet send the file track to the app, so the app acts on whatever it chooses.
   */
  refresh(options?: CallOptions): Promise<void>
}

/** a list of tracks/streams */
export interface PlaylistResourceClient {
  /**
   * List playlists, as one page holding all of them.
   *
   * @param sourceId - Persistent ID of the source. Does not accept null.
   */
  list(sourceId: string, options?: CallOptions): Promise<Page<Playlist>>
  /**
   * Read the playlist identified by `persistentID` within `sourceId`.
   *
   * @param sourceId - Persistent ID of the source. Does not accept null.
   * @param persistentID - Persistent ID of the playlist. Does not accept null.
   */
  get(sourceId: string, persistentID: string, options?: CallOptions): Promise<Playlist>
  /**
   * Move playlist(s) to a new location
   *
   * @param sourceId - Persistent ID of the source. Does not accept null.
   * @param persistentID - Persistent ID of the playlist. Does not accept null.
   * @param to - the new location for the playlist(s). Does not accept null.
   */
  move(sourceId: string, persistentID: string, to: string, options?: CallOptions): Promise<void>
  /**
   * search a playlist for tracks matching the search string. Identical to entering search text in
   * the Search field.
   *
   * @param sourceId - Persistent ID of the source. Does not accept null.
   * @param persistentID - Persistent ID of the playlist. Does not accept null.
   * @param _for - the search text. Does not accept null.
   * @param only - area to search (default is all). Does not accept null.
   */
  search(
    sourceId: string,
    persistentID: string,
    _for: string,
    only?: string,
    options?: CallOptions
  ): Promise<void>
}

/** a sub-window showing a single playlist */
export interface PlaylistWindowResourceClient {
  /** List playlist windows, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<PlaylistWindow>>
  /**
   * Read the playlist window identified by `id`.
   *
   * @param id - Id of the playlist window. Does not accept null.
   */
  get(id: Integer, options?: CallOptions): Promise<PlaylistWindow>
}

/** a media source (library, CD, device, etc.) */
export interface SourceResourceClient {
  /** List sources, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Source>>
  /**
   * Read the source identified by `persistentID`.
   *
   * @param persistentID - Persistent ID of the source. Does not accept null.
   */
  get(persistentID: string, options?: CallOptions): Promise<Source>
}

/**
 * The TV client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from `tvContract` in the app's `/contract` entry. Its type carries the
 * contract's resource table, {@link TVResources}, so references can be bound to it by resource; the
 * brand has no runtime member.
 */
export interface TVClient extends ClientBrand<TVResources> {
  /** the main window */
  readonly browserWindows: BrowserWindowResourceClient
  /** a track representing a video file */
  readonly fileTracks: FileTrackResourceClient
  /** a list of tracks/streams */
  readonly playlists: PlaylistResourceClient
  /** a sub-window showing a single playlist */
  readonly playlistWindows: PlaylistWindowResourceClient
  /** a media source (library, CD, device, etc.) */
  readonly sources: SourceResourceClient
  /** Close an object */
  close(options?: CallOptions): Promise<void>
  /**
   * Return the number of elements of a particular class within an object
   *
   * @param each - the class of the elements to be counted. Keyword 'each' is optional in
   * AppleScript. Does not accept null.
   */
  count(each: string, options?: CallOptions): Promise<void>
  /**
   * Duplicate one or more object(s)
   *
   * @param to - the new location for the object(s). Does not accept null.
   */
  duplicate(to?: string, options?: CallOptions): Promise<void>
  /** Verify if an object exists */
  exists(options?: CallOptions): Promise<void>
  /**
   * Make a new element
   *
   * @param _new - the class of the new element. Keyword 'new' is optional in AppleScript. Does not
   * accept null.
   * @param at - the location at which to insert the element. Does not accept null.
   * @param withProperties - the initial values for the properties of the element. Does not accept
   * null.
   */
  make(_new: string, at?: string, withProperties?: unknown, options?: CallOptions): Promise<void>
  /** Open the specified object(s) */
  open(options?: CallOptions): Promise<void>
  /** Run the application */
  run(options?: CallOptions): Promise<void>
  /** Quit the application */
  quit(options?: CallOptions): Promise<void>
  /** Save the specified object(s) */
  save(options?: CallOptions): Promise<void>
  /**
   * add one or more files to a playlist
   *
   * @param to - the location of the added file(s). Does not accept null.
   */
  add(to?: string, options?: CallOptions): Promise<void>
  /**
   * reposition to beginning of current track or go to previous track if already at start of current
   * track
   */
  backTrack(options?: CallOptions): Promise<void>
  /** convert one or more files or tracks */
  convert(options?: CallOptions): Promise<void>
  /** download a cloud track or playlist */
  download(options?: CallOptions): Promise<void>
  /** skip forward in a playing track */
  fastForward(options?: CallOptions): Promise<void>
  /** advance to the next track in the current playlist */
  nextTrack(options?: CallOptions): Promise<void>
  /** pause playback */
  pause(options?: CallOptions): Promise<void>
  /**
   * play the current track or the specified track or file.
   *
   * @param once - If true, play this track once and then stop. Does not accept null.
   */
  play(once?: boolean, options?: CallOptions): Promise<void>
  /** toggle the playing/paused state of the current track */
  playpause(options?: CallOptions): Promise<void>
  /** return to the previous track in the current playlist */
  previousTrack(options?: CallOptions): Promise<void>
  /** disable fast forward/rewind and resume playback, if playing. */
  resume(options?: CallOptions): Promise<void>
  /** reveal and select a track or playlist */
  reveal(options?: CallOptions): Promise<void>
  /** skip backwards in a playing track */
  rewind(options?: CallOptions): Promise<void>
  /** select the specified object(s) */
  select(options?: CallOptions): Promise<void>
  /** stop playback */
  stop(options?: CallOptions): Promise<void>
  /** Opens an iTunes Store or stream URL */
  openLocation(options?: CallOptions): Promise<void>
}

const browserWindowRecordType: ValueType<BrowserWindow> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this window' }),
    selection: t.nullable(t.string(), { description: 'the selected tracks' }),
  },
  { description: 'the main window' }
)

const playlistRecordType: ValueType<Playlist> = t.record(
  {
    source: t.reference<Source, string, 'Source'>(() => tvContract, 'Source', 'one', {
      description: 'The source that holds this playlist',
    }),
    id: t.nullable(t.integer(), { description: 'Unique identifier for this playlist' }),
    persistentID: t.string({
      description: 'the id of the item as a hexadecimal string. This id does not change over time.',
    }),
    description: t.nullable(t.string(), { description: 'the description of the playlist' }),
    duration: t.nullable(t.integer(), {
      description: 'the total length of all tracks (in seconds)',
    }),
    name: t.nullable(t.string(), { description: 'the name of the playlist' }),
    size: t.nullable(t.integer(), { description: 'the total size of all tracks (in bytes)' }),
    specialKind: t.nullable(t.string(), { description: 'special playlist kind' }),
    time: t.nullable(t.string(), { description: 'the length of all tracks in MM:SS format' }),
    visible: t.nullable(t.boolean(), {
      description: 'is this playlist visible in the Source list?',
    }),
  },
  { description: 'a list of tracks/streams' }
)

const playlistWindowRecordType: ValueType<PlaylistWindow> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this window' }),
    selection: t.nullable(t.string(), { description: 'the selected tracks' }),
  },
  { description: 'a sub-window showing a single playlist' }
)

const sourceRecordType: ValueType<Source> = t.record(
  {
    id: t.nullable(t.integer(), { description: 'Unique identifier for this source' }),
    persistentID: t.string({
      description: 'the id of the item as a hexadecimal string. This id does not change over time.',
    }),
    capacity: t.nullable(t.double(), {
      description: 'the total size of the source if it has a fixed size',
    }),
    freeSpace: t.nullable(t.double(), {
      description: 'the free space on the source if it has a fixed size',
    }),
    kind: t.nullable(t.string(), { description: 'The kind property' }),
  },
  { description: 'a media source (library, CD, device, etc.)' }
)

/**
 * The type of the resource table in `tvContract` (the app's `/contract` entry): every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for each of those operations that finds the
 * resource only within another resource, that parent. A client created from
 * the contract carries it, so `bindReference` admits only references the
 * contract can resolve.
 */
export type TVResources = Readonly<{
  BrowserWindow: ResourceDescriptor<BrowserWindow, Integer> & {
    readonly id: ValueType<Integer>
    readonly get: 'tv.browserWindows.get'
    readonly list: 'tv.browserWindows.list'
  }
  Playlist: ResourceDescriptor<Playlist, string> & {
    readonly id: ValueType<string>
    readonly get: 'tv.playlists.get'
    readonly list: 'tv.playlists.list'
    readonly parents: { readonly get: 'Source'; readonly list: 'Source' }
  }
  PlaylistWindow: ResourceDescriptor<PlaylistWindow, Integer> & {
    readonly id: ValueType<Integer>
    readonly get: 'tv.playlistWindows.get'
    readonly list: 'tv.playlistWindows.list'
  }
  Source: ResourceDescriptor<Source, string> & {
    readonly id: ValueType<string>
    readonly get: 'tv.sources.get'
    readonly list: 'tv.sources.list'
  }
}>

/**
 * The resource table: the implementation of {@link TVResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {
  BrowserWindow: {
    name: 'BrowserWindow',
    record: browserWindowRecordType,
    id: t.integer({ description: 'Unique identifier for this window' }),
    get: 'tv.browserWindows.get',
    list: 'tv.browserWindows.list',
  },
  Playlist: {
    name: 'Playlist',
    record: playlistRecordType,
    id: t.string({
      description: 'the id of the item as a hexadecimal string. This id does not change over time.',
    }),
    get: 'tv.playlists.get',
    list: 'tv.playlists.list',
    parents: { get: 'Source', list: 'Source' },
  },
  PlaylistWindow: {
    name: 'PlaylistWindow',
    record: playlistWindowRecordType,
    id: t.integer({ description: 'Unique identifier for this window' }),
    get: 'tv.playlistWindows.get',
    list: 'tv.playlistWindows.list',
  },
  Source: {
    name: 'Source',
    record: sourceRecordType,
    id: t.string({
      description: 'the id of the item as a hexadecimal string. This id does not change over time.',
    }),
    get: 'tv.sources.get',
    list: 'tv.sources.list',
  },
} satisfies TVResources

const sourceListSourcesOperation: OperationDescriptor<Record<string, never>, Page<Source>> = {
  id: 'tv.sources.list',
  permission: 'tv:sources:list',
  target: { command: 'listSources', resource: 'Source' },
  description: 'List every source',
  input: t.record({}),
  output: t.page(sourceRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const sourceGetSourceOperation: OperationDescriptor<{ readonly persistentID: string }, Source> = {
  id: 'tv.sources.get',
  permission: 'tv:sources:get',
  target: { command: 'getSource', resource: 'Source' },
  description: 'Get a source by its persistent ID',
  input: t.record({
    persistentID: t.string({ description: 'Persistent ID of the source' }),
  }),
  output: sourceRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { persistentID: { type: 'string', description: 'Persistent ID of the source' } },
    required: ['persistentID'],
    additionalProperties: false,
  },
}

const playlistListPlaylistsOperation: OperationDescriptor<
  { readonly sourceId: string },
  Page<Playlist>
> = {
  id: 'tv.playlists.list',
  permission: 'tv:playlists:list',
  target: { command: 'listPlaylists', resource: 'Playlist' },
  description: 'List the playlists of a source',
  input: t.record({
    sourceId: t.string({ description: 'Persistent ID of the source' }),
  }),
  output: t.page(playlistRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { sourceId: { type: 'string', description: 'Persistent ID of the source' } },
    required: ['sourceId'],
    additionalProperties: false,
  },
}

const playlistGetPlaylistOperation: OperationDescriptor<
  { readonly sourceId: string; readonly persistentID: string },
  Playlist
> = {
  id: 'tv.playlists.get',
  permission: 'tv:playlists:get',
  target: { command: 'getPlaylist', resource: 'Playlist' },
  description: 'Get a playlist of a source by its persistent ID',
  input: t.record({
    sourceId: t.string({ description: 'Persistent ID of the source' }),
    persistentID: t.string({ description: 'Persistent ID of the playlist' }),
  }),
  output: playlistRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      sourceId: { type: 'string', description: 'Persistent ID of the source' },
      persistentID: { type: 'string', description: 'Persistent ID of the playlist' },
    },
    required: ['sourceId', 'persistentID'],
    additionalProperties: false,
  },
}

const browserWindowListBrowserWindowsOperation: OperationDescriptor<
  Record<string, never>,
  Page<BrowserWindow>
> = {
  id: 'tv.browserWindows.list',
  permission: 'tv:browserWindows:list',
  target: { command: 'listBrowserWindows', resource: 'BrowserWindow' },
  description: 'List every browser window',
  input: t.record({}),
  output: t.page(browserWindowRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const browserWindowGetBrowserWindowOperation: OperationDescriptor<
  { readonly id: Integer },
  BrowserWindow
> = {
  id: 'tv.browserWindows.get',
  permission: 'tv:browserWindows:get',
  target: { command: 'getBrowserWindow', resource: 'BrowserWindow' },
  description: 'Get a browser window by its id',
  input: t.record({
    id: t.integer({ description: 'Id of the browser window' }),
  }),
  output: browserWindowRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'Id of the browser window',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
}

const playlistWindowListPlaylistWindowsOperation: OperationDescriptor<
  Record<string, never>,
  Page<PlaylistWindow>
> = {
  id: 'tv.playlistWindows.list',
  permission: 'tv:playlistWindows:list',
  target: { command: 'listPlaylistWindows', resource: 'PlaylistWindow' },
  description: 'List every playlist window',
  input: t.record({}),
  output: t.page(playlistWindowRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const playlistWindowGetPlaylistWindowOperation: OperationDescriptor<
  { readonly id: Integer },
  PlaylistWindow
> = {
  id: 'tv.playlistWindows.get',
  permission: 'tv:playlistWindows:get',
  target: { command: 'getPlaylistWindow', resource: 'PlaylistWindow' },
  description: 'Get a playlist window by its id',
  input: t.record({
    id: t.integer({ description: 'Id of the playlist window' }),
  }),
  output: playlistWindowRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'Id of the playlist window',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
}

const appCloseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.close',
  permission: 'tv:app:close',
  target: { command: 'close' },
  description: 'Close an object',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appCountOperation: OperationDescriptor<{ readonly each: string }, undefined> = {
  id: 'tv.app.count',
  permission: 'tv:app:count',
  target: { command: 'count' },
  description: 'Return the number of elements of a particular class within an object',
  input: t.record({
    each: t.string({
      description:
        "the class of the elements to be counted. Keyword 'each' is optional in AppleScript",
    }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      each: {
        type: 'string',
        description:
          "the class of the elements to be counted. Keyword 'each' is optional in AppleScript",
      },
    },
    required: ['each'],
    additionalProperties: false,
  },
}

const appDuplicateOperation: OperationDescriptor<{ readonly to?: string | undefined }, undefined> =
  {
    id: 'tv.app.duplicate',
    permission: 'tv:app:duplicate',
    target: { command: 'duplicate' },
    description: 'Duplicate one or more object(s)',
    input: t.record({
      to: t.optional(t.string({ description: 'the new location for the object(s)' })),
    }),
    output: t.none(),
    inputJsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: { to: { type: 'string', description: 'the new location for the object(s)' } },
      additionalProperties: false,
    },
  }

const appExistsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.exists',
  permission: 'tv:app:exists',
  target: { command: 'exists' },
  description: 'Verify if an object exists',
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
  { readonly new: string; readonly at?: string | undefined; readonly withProperties?: unknown },
  undefined
> = {
  id: 'tv.app.make',
  permission: 'tv:app:make',
  target: { command: 'make' },
  description: 'Make a new element',
  input: t.record({
    new: t.string({
      description: "the class of the new element. Keyword 'new' is optional in AppleScript",
    }),
    at: t.optional(t.string({ description: 'the location at which to insert the element' })),
    withProperties: t.optional(
      t.unknown({ description: 'the initial values for the properties of the element' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      new: {
        type: 'string',
        description: "the class of the new element. Keyword 'new' is optional in AppleScript",
      },
      at: { type: 'string', description: 'the location at which to insert the element' },
      withProperties: {
        allOf: [
          {
            description: 'the initial values for the properties of the element',
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

const playlistMoveOperation: OperationDescriptor<
  { readonly sourceId: string; readonly persistentID: string; readonly to: string },
  undefined
> = {
  id: 'tv.playlists.move',
  permission: 'tv:playlists:move',
  target: { command: 'move', resource: 'Playlist' },
  description: 'Move playlist(s) to a new location',
  input: t.record({
    sourceId: t.string({ description: 'Persistent ID of the source' }),
    persistentID: t.string({ description: 'Persistent ID of the playlist' }),
    to: t.string({ description: 'the new location for the playlist(s)' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      sourceId: { type: 'string', description: 'Persistent ID of the source' },
      persistentID: { type: 'string', description: 'Persistent ID of the playlist' },
      to: { type: 'string', description: 'the new location for the playlist(s)' },
    },
    required: ['sourceId', 'persistentID', 'to'],
    additionalProperties: false,
  },
}

const appOpenOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.open',
  permission: 'tv:app:open',
  target: { command: 'open' },
  description: 'Open the specified object(s)',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appRunOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.run',
  permission: 'tv:app:run',
  target: { command: 'run' },
  description: 'Run the application',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appQuitOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.quit',
  permission: 'tv:app:quit',
  target: { command: 'quit' },
  description: 'Quit the application',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appSaveOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.save',
  permission: 'tv:app:save',
  target: { command: 'save' },
  description: 'Save the specified object(s)',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appAddOperation: OperationDescriptor<{ readonly to?: string | undefined }, undefined> = {
  id: 'tv.app.add',
  permission: 'tv:app:add',
  target: { command: 'add' },
  description: 'add one or more files to a playlist',
  input: t.record({
    to: t.optional(t.string({ description: 'the location of the added file(s)' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { to: { type: 'string', description: 'the location of the added file(s)' } },
    additionalProperties: false,
  },
}

const appBackTrackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.backTrack',
  permission: 'tv:app:backTrack',
  target: { command: 'backTrack' },
  description:
    'reposition to beginning of current track or go to previous track if already at start of current track',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appConvertOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.convert',
  permission: 'tv:app:convert',
  target: { command: 'convert' },
  description: 'convert one or more files or tracks',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appDownloadOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.download',
  permission: 'tv:app:download',
  target: { command: 'download' },
  description: 'download a cloud track or playlist',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appFastForwardOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.fastForward',
  permission: 'tv:app:fastForward',
  target: { command: 'fastForward' },
  description: 'skip forward in a playing track',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appNextTrackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.nextTrack',
  permission: 'tv:app:nextTrack',
  target: { command: 'nextTrack' },
  description: 'advance to the next track in the current playlist',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPauseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.pause',
  permission: 'tv:app:pause',
  target: { command: 'pause' },
  description: 'pause playback',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPlayOperation: OperationDescriptor<{ readonly once?: boolean | undefined }, undefined> = {
  id: 'tv.app.play',
  permission: 'tv:app:play',
  target: { command: 'play' },
  description: 'play the current track or the specified track or file.',
  input: t.record({
    once: t.optional(t.boolean({ description: 'If true, play this track once and then stop.' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      once: { type: 'boolean', description: 'If true, play this track once and then stop.' },
    },
    additionalProperties: false,
  },
}

const appPlaypauseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.playpause',
  permission: 'tv:app:playpause',
  target: { command: 'playpause' },
  description: 'toggle the playing/paused state of the current track',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPreviousTrackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.previousTrack',
  permission: 'tv:app:previousTrack',
  target: { command: 'previousTrack' },
  description: 'return to the previous track in the current playlist',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const fileTrackRefreshOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.fileTracks.refresh',
  permission: 'tv:fileTracks:refresh',
  target: { command: 'refresh', resource: 'FileTrack' },
  description: 'update file track information from the current information in the track’s file',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appResumeOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.resume',
  permission: 'tv:app:resume',
  target: { command: 'resume' },
  description: 'disable fast forward/rewind and resume playback, if playing.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appRevealOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.reveal',
  permission: 'tv:app:reveal',
  target: { command: 'reveal' },
  description: 'reveal and select a track or playlist',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appRewindOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.rewind',
  permission: 'tv:app:rewind',
  target: { command: 'rewind' },
  description: 'skip backwards in a playing track',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const playlistSearchOperation: OperationDescriptor<
  {
    readonly sourceId: string
    readonly persistentID: string
    readonly for: string
    readonly only?: string | undefined
  },
  undefined
> = {
  id: 'tv.playlists.search',
  permission: 'tv:playlists:search',
  target: { command: 'search', resource: 'Playlist' },
  description:
    'search a playlist for tracks matching the search string. Identical to entering search text in the Search field.',
  input: t.record({
    sourceId: t.string({ description: 'Persistent ID of the source' }),
    persistentID: t.string({ description: 'Persistent ID of the playlist' }),
    for: t.string({ description: 'the search text' }),
    only: t.optional(t.string({ description: 'area to search (default is all)' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      sourceId: { type: 'string', description: 'Persistent ID of the source' },
      persistentID: { type: 'string', description: 'Persistent ID of the playlist' },
      for: { type: 'string', description: 'the search text' },
      only: { type: 'string', description: 'area to search (default is all)' },
    },
    required: ['sourceId', 'persistentID', 'for'],
    additionalProperties: false,
  },
}

const appSelectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.select',
  permission: 'tv:app:select',
  target: { command: 'select' },
  description: 'select the specified object(s)',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appStopOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.stop',
  permission: 'tv:app:stop',
  target: { command: 'stop' },
  description: 'stop playback',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appOpenLocationOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'tv.app.openLocation',
  permission: 'tv:app:openLocation',
  target: { command: 'openLocation' },
  description: 'Opens an iTunes Store or stream URL',
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
const operations: AppContract<TVClient>['operations'] = {
  'tv.sources.list': sourceListSourcesOperation,
  'tv.sources.get': sourceGetSourceOperation,
  'tv.playlists.list': playlistListPlaylistsOperation,
  'tv.playlists.get': playlistGetPlaylistOperation,
  'tv.browserWindows.list': browserWindowListBrowserWindowsOperation,
  'tv.browserWindows.get': browserWindowGetBrowserWindowOperation,
  'tv.playlistWindows.list': playlistWindowListPlaylistWindowsOperation,
  'tv.playlistWindows.get': playlistWindowGetPlaylistWindowOperation,
  'tv.app.close': appCloseOperation,
  'tv.app.count': appCountOperation,
  'tv.app.duplicate': appDuplicateOperation,
  'tv.app.exists': appExistsOperation,
  'tv.app.make': appMakeOperation,
  'tv.playlists.move': playlistMoveOperation,
  'tv.app.open': appOpenOperation,
  'tv.app.run': appRunOperation,
  'tv.app.quit': appQuitOperation,
  'tv.app.save': appSaveOperation,
  'tv.app.add': appAddOperation,
  'tv.app.backTrack': appBackTrackOperation,
  'tv.app.convert': appConvertOperation,
  'tv.app.download': appDownloadOperation,
  'tv.app.fastForward': appFastForwardOperation,
  'tv.app.nextTrack': appNextTrackOperation,
  'tv.app.pause': appPauseOperation,
  'tv.app.play': appPlayOperation,
  'tv.app.playpause': appPlaypauseOperation,
  'tv.app.previousTrack': appPreviousTrackOperation,
  'tv.fileTracks.refresh': fileTrackRefreshOperation,
  'tv.app.resume': appResumeOperation,
  'tv.app.reveal': appRevealOperation,
  'tv.app.rewind': appRewindOperation,
  'tv.playlists.search': playlistSearchOperation,
  'tv.app.select': appSelectOperation,
  'tv.app.stop': appStopOperation,
  'tv.app.openLocation': appOpenLocationOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): TVClient {
  return {
    browserWindows: {
      list: (options) => runtime.invoke(browserWindowListBrowserWindowsOperation, {}, options),
      get: (id, options) => runtime.invoke(browserWindowGetBrowserWindowOperation, { id }, options),
    },
    fileTracks: {
      refresh: (options) => runtime.invoke(fileTrackRefreshOperation, {}, options),
    },
    playlists: {
      list: (sourceId, options) =>
        runtime.invoke(playlistListPlaylistsOperation, { sourceId }, options),
      get: (sourceId, persistentID, options) =>
        runtime.invoke(playlistGetPlaylistOperation, { sourceId, persistentID }, options),
      move: (sourceId, persistentID, to, options) =>
        runtime.invoke(playlistMoveOperation, { sourceId, persistentID, to }, options),
      search: (sourceId, persistentID, _for, only, options) =>
        runtime.invoke(
          playlistSearchOperation,
          { sourceId, persistentID, for: _for, only },
          options
        ),
    },
    playlistWindows: {
      list: (options) => runtime.invoke(playlistWindowListPlaylistWindowsOperation, {}, options),
      get: (id, options) =>
        runtime.invoke(playlistWindowGetPlaylistWindowOperation, { id }, options),
    },
    sources: {
      list: (options) => runtime.invoke(sourceListSourcesOperation, {}, options),
      get: (persistentID, options) =>
        runtime.invoke(sourceGetSourceOperation, { persistentID }, options),
    },
    close: (options) => runtime.invoke(appCloseOperation, {}, options),
    count: (each, options) => runtime.invoke(appCountOperation, { each }, options),
    duplicate: (to, options) => runtime.invoke(appDuplicateOperation, { to }, options),
    exists: (options) => runtime.invoke(appExistsOperation, {}, options),
    make: (_new, at, withProperties, options) =>
      runtime.invoke(appMakeOperation, { new: _new, at, withProperties }, options),
    open: (options) => runtime.invoke(appOpenOperation, {}, options),
    run: (options) => runtime.invoke(appRunOperation, {}, options),
    quit: (options) => runtime.invoke(appQuitOperation, {}, options),
    save: (options) => runtime.invoke(appSaveOperation, {}, options),
    add: (to, options) => runtime.invoke(appAddOperation, { to }, options),
    backTrack: (options) => runtime.invoke(appBackTrackOperation, {}, options),
    convert: (options) => runtime.invoke(appConvertOperation, {}, options),
    download: (options) => runtime.invoke(appDownloadOperation, {}, options),
    fastForward: (options) => runtime.invoke(appFastForwardOperation, {}, options),
    nextTrack: (options) => runtime.invoke(appNextTrackOperation, {}, options),
    pause: (options) => runtime.invoke(appPauseOperation, {}, options),
    play: (once, options) => runtime.invoke(appPlayOperation, { once }, options),
    playpause: (options) => runtime.invoke(appPlaypauseOperation, {}, options),
    previousTrack: (options) => runtime.invoke(appPreviousTrackOperation, {}, options),
    resume: (options) => runtime.invoke(appResumeOperation, {}, options),
    reveal: (options) => runtime.invoke(appRevealOperation, {}, options),
    rewind: (options) => runtime.invoke(appRewindOperation, {}, options),
    select: (options) => runtime.invoke(appSelectOperation, {}, options),
    stop: (options) => runtime.invoke(appStopOperation, {}, options),
    openLocation: (options) => runtime.invoke(appOpenLocationOperation, {}, options),
  }
}

/**
 * The TV contract. Pass it to a client factory to obtain a
 * {@link TVClient}.
 */
export const tvContract: AppContract<TVClient, TVResources> = {
  app: 'tv',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
