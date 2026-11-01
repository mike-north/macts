/**
 * The Music contract: the transport-neutral description of every
 * Music operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `MusicClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `MusicClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Music manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type FileSource,
  type FileValue,
  type Integer,
  type ObjectReferenceVariant,
  type OperationDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** EKnd */
export type EKnd = 'trackListing' | 'albumListing' | 'cdInsert'

/** Enum */
export type Enum = 'standard' | 'detailed'

/** EPlS */
export type EPlS = 'stopped' | 'playing' | 'paused' | 'fastForwarding' | 'rewinding'

/** ERpt */
export type ERpt = 'off' | 'one' | 'all'

/** EShM */
export type EShM = 'songs' | 'albums' | 'groupings'

/** ESrc */
export type ESrc =
  | 'library'
  | 'audioCD'
  | 'mP3CD'
  | 'radioTuner'
  | 'sharedLibrary'
  | 'iTunesStore'
  | 'unknown'

/** ESrA */
export type ESrA = 'albums' | 'all' | 'artists' | 'composers' | 'displayed' | 'names'

/** ESpK */
export type ESpK = 'none' | 'folder' | 'genius' | 'library' | 'music' | 'purchasedMusic'

/** EMdK */
export type EMdK = 'song' | 'musicVideo' | 'movie' | 'tVShow' | 'unknown'

/** ERtK */
export type ERtK = 'user' | 'computed'

/** EAPD */
export type EAPD =
  | 'computer'
  | 'airPortExpress'
  | 'appleTV'
  | 'airPlayDevice'
  | 'bluetoothDevice'
  | 'homePod'
  | 'tV'
  | 'unknown'

/** EClS */
export type EClS =
  | 'unknown'
  | 'purchased'
  | 'matched'
  | 'uploaded'
  | 'ineligible'
  | 'removed'
  | 'error'
  | 'duplicate'
  | 'subscription'
  | 'prerelease'
  | 'noLongerAvailable'
  | 'notUploaded'

/** EExF */
export type EExF = 'plainText' | 'unicodeText' | 'xML' | 'm3U' | 'm3U8'

/** an AirPlay device */
export interface AirPlayDevice {
  /** is the device currently being played to? */
  readonly active: boolean
  /** is the device currently available? */
  readonly available: boolean
  /** the kind of the device */
  readonly kind: string
  /** the network (MAC) address of the device */
  readonly networkAddress: string
  /** is the device password- or passcode-protected? */
  readonly protected: boolean
  /** is the device currently selected? */
  selected: boolean
  /** does the device support audio playback? */
  readonly supportsAudio: boolean
  /** does the device support video playback? */
  readonly supportsVideo: boolean
  /** the output volume for the device (0 = minimum, 100 = maximum) */
  soundVolume: Integer
}

/** a piece of art within a track or playlist */
export interface Artwork {
  /** data for this artwork, in the form of a picture */
  data: string
  /** description of artwork as a string */
  description: string
  /** was this artwork downloaded by Music? */
  readonly downloaded: boolean
  /** the data format for this piece of artwork */
  readonly format: string
  /** kind or purpose of this piece of artwork */
  kind: Integer
  /** data for this artwork, in original format */
  rawData: unknown
}

/** a playlist representing an audio CD */
export interface AudioCDPlaylist {
  /** the artist of the CD */
  artist: string
  /** is this CD a compilation album? */
  compilation: boolean
  /** the composer of the CD */
  composer: string
  /** the total number of discs in this CD’s album */
  discCount: Integer
  /** the index of this CD disc in the source album */
  discNumber: Integer
  /** the genre of the CD */
  genre: string
  /** the year the album was recorded/released */
  year: Integer
}

/** a track on an audio CD */
export interface AudioCDTrack {
  /** the location of the file represented by this track */
  readonly location: FileValue
}

/** the main window */
export interface BrowserWindow {
  /** the selected tracks */
  readonly selection: string
  /** the playlist currently displayed in the window */
  view: ObjectReferenceVariant<Playlist, never>
}

/** converts a track to a specific file format */
export interface Encoder {
  /** the data format created by the encoder */
  readonly format: string
}

/** equalizer preset configuration */
export interface EQPreset {
  /** the equalizer 32 Hz band level (-12.0 dB to +12.0 dB) */
  band1: number
  /** the equalizer 64 Hz band level (-12.0 dB to +12.0 dB) */
  band2: number
  /** the equalizer 125 Hz band level (-12.0 dB to +12.0 dB) */
  band3: number
  /** the equalizer 250 Hz band level (-12.0 dB to +12.0 dB) */
  band4: number
  /** the equalizer 500 Hz band level (-12.0 dB to +12.0 dB) */
  band5: number
  /** the equalizer 1 kHz band level (-12.0 dB to +12.0 dB) */
  band6: number
  /** the equalizer 2 kHz band level (-12.0 dB to +12.0 dB) */
  band7: number
  /** the equalizer 4 kHz band level (-12.0 dB to +12.0 dB) */
  band8: number
  /** the equalizer 8 kHz band level (-12.0 dB to +12.0 dB) */
  band9: number
  /** the equalizer 16 kHz band level (-12.0 dB to +12.0 dB) */
  band10: number
  /** can this preset be modified? */
  readonly modifiable: boolean
  /** the equalizer preamp level (-12.0 dB to +12.0 dB) */
  preamp: number
  /** should tracks which refer to this preset be updated when the preset is renamed or deleted? */
  updateTracks: boolean
}

/** the equalizer window */
export interface EQWindow {
  /** Unique identifier for this window */
  readonly id: Integer
}

/** a track representing an audio file (MP3, AIFF, etc.) */
export interface FileTrack {
  /** the location of the file represented by this track */
  location: FileValue
}

/** the main library playlist */
export interface LibraryPlaylist {
  /** Unique identifier for this playlist */
  readonly id: Integer
}

/** the miniplayer window */
export interface MiniplayerWindow {
  /** Unique identifier for this window */
  readonly id: Integer
}

/** a list of tracks/streams */
export interface Playlist {
  /** the description of the playlist */
  description: string
  /** is this playlist disliked? */
  disliked: boolean
  /** the total length of all tracks (in seconds) */
  readonly duration: Integer
  /** the name of the playlist */
  name: string
  /** is this playlist favorited? */
  favorited: boolean
  /** folder which contains this playlist (if any) */
  readonly parent: ObjectReferenceVariant<Playlist, never>
  /** the total size of all tracks (in bytes) */
  readonly size: Integer
  /** special playlist kind */
  readonly specialKind: string
  /** the length of all tracks in MM:SS format */
  readonly time: string
  /** is this playlist visible in the Source list? */
  readonly visible: boolean
}

/** a sub-window showing a single playlist */
export interface PlaylistWindow {
  /** the selected tracks */
  readonly selection: string
  /** the playlist displayed in the window */
  readonly view: ObjectReferenceVariant<Playlist, never>
}

/** the radio tuner playlist */
export interface RadioTunerPlaylist {
  /** Unique identifier for this playlist */
  readonly id: Integer
}

/** a track residing in a shared library */
export interface SharedTrack {
  /** Unique identifier for this track */
  readonly id: Integer
}

/** a media source (library, CD, device, etc.) */
export interface Source {
  /** the total size of the source if it has a fixed size */
  readonly capacity: number
  /** the free space on the source if it has a fixed size */
  readonly freeSpace: number
  /** The kind property */
  readonly kind: string
}

/** a subscription playlist from Apple Music */
export interface SubscriptionPlaylist {
  /** Unique identifier for this playlist */
  readonly id: Integer
}

/** playable audio source */
export interface Track {
  /** the album name of the track */
  album: string
  /** the album artist of the track */
  albumArtist: string
  /** is the album for this track disliked? */
  albumDisliked: boolean
  /** is the album for this track favorited? */
  albumFavorited: boolean
  /** the rating of the album for this track (0 to 100) */
  albumRating: Integer
  /** the rating kind of the album rating for this track */
  readonly albumRatingKind: string
  /** the artist/source of the track */
  artist: string
  /** the bit rate of the track (in kbps) */
  readonly bitRate: Integer
  /** the bookmark time of the track in seconds */
  bookmark: number
  /** is the playback position for this track remembered? */
  bookmarkable: boolean
  /** the tempo of this track in beats per minute */
  bpm: Integer
  /** the category of the track */
  category: string
  /** the iCloud status of the track */
  readonly cloudStatus: string
  /** freeform notes about the track */
  comment: string
  /** is this track from a compilation album? */
  compilation: boolean
  /** the composer of the track */
  composer: string
  /**
   * the common, unique ID for this track. If two tracks in different playlists have the same
   * database ID, they are sharing the same data.
   */
  readonly databaseID: Integer
  /** the date the track was added to the playlist */
  readonly dateAdded: Date
  /** the description of the track */
  description: string
  /** the total number of discs in the source album */
  discCount: Integer
  /** the index of the disc containing this track on the source album */
  discNumber: Integer
  /** is this track disliked? */
  disliked: boolean
  /** the account of the person who downloaded this track */
  readonly downloaderAccount: string
  /** the name of the person who downloaded this track */
  readonly downloaderName: string
  /** the length of the track in seconds */
  readonly duration: number
  /** is this track checked for playback? */
  enabled: boolean
  /** the episode ID of the track */
  episodeID: string
  /** the episode number of the track */
  episodeNumber: Integer
  /** the name of the EQ preset of the track */
  eQ: string
  /** the stop time of the track in seconds */
  finish: number
  /** is this track from a gapless album? */
  gapless: boolean
  /** the music/audio genre (category) of the track */
  genre: string
  /**
   * the grouping (piece) of the track. Generally used to denote movements within a classical work.
   */
  grouping: string
  /** a text description of the track */
  readonly kind: string
  /** the long description of the track */
  longDescription: string
  /** is this track favorited? */
  favorited: boolean
  /** the lyrics of the track */
  lyrics: string
  /** the media kind of the track */
  mediaKind: string
  /** the modification date of the content of this track */
  readonly modificationDate: Date
  /** the movement name of the track */
  movement: string
  /** the total number of movements in the work */
  movementCount: Integer
  /** the index of the movement in the work */
  movementNumber: Integer
  /** number of times this track has been played */
  playedCount: Integer
  /** the date and time this track was last played */
  playedDate: Date
  /** the account of the person who purchased this track */
  readonly purchaserAccount: string
  /** the name of the person who purchased this track */
  readonly purchaserName: string
  /** the rating of this track (0 to 100) */
  rating: Integer
  /** the rating kind of this track */
  readonly ratingKind: string
  /** the release date of this track */
  readonly releaseDate: Date
  /** the sample rate of the track (in Hz) */
  readonly sampleRate: Integer
  /** the season number of the track */
  seasonNumber: Integer
  /** is this track included when shuffling? */
  shufflable: boolean
  /** number of times this track has been skipped */
  skippedCount: Integer
  /** the date and time this track was last skipped */
  skippedDate: Date
  /** the show name of the track */
  show: string
  /** override string to use for the track when sorting by album */
  sortAlbum: string
  /** override string to use for the track when sorting by artist */
  sortArtist: string
  /** override string to use for the track when sorting by album artist */
  sortAlbumArtist: string
  /** override string to use for the track when sorting by name */
  sortName: string
  /** override string to use for the track when sorting by composer */
  sortComposer: string
  /** override string to use for the track when sorting by show name */
  sortShow: string
  /** the size of the track (in bytes) */
  readonly size: number
  /** the start time of the track in seconds */
  start: number
  /** the length of the track in MM:SS format */
  readonly time: string
  /** the total number of tracks on the source album */
  trackCount: Integer
  /** the index of the track on the source album */
  trackNumber: Integer
  /** is this track unplayed? */
  unplayed: boolean
  /** relative volume adjustment of the track (-100% to 100%) */
  volumeAdjustment: Integer
  /** the work name of the track */
  work: string
  /** the year the track was recorded/released */
  year: Integer
}

/** a track representing a network stream */
export interface URLTrack {
  /** the URL for this track */
  address: string
}

/** custom playlists created by the user */
export interface UserPlaylist {
  /** is this playlist shared? */
  shared: boolean
  /** is this a Smart Playlist? */
  readonly smart: boolean
  /** is this a Genius Playlist? */
  readonly genius: boolean
}

/** the video window */
export interface VideoWindow {
  /** Unique identifier for this window */
  readonly id: Integer
}

/** a visual plug-in */
export interface Visual {
  /** Unique identifier for this visual */
  readonly id: Integer
}

/** Input for creating an AirPlayDevice. */
export interface AirPlayDeviceCreateInput {
  /** is the device currently selected? */
  selected?: boolean
  /** the output volume for the device (0 = minimum, 100 = maximum) */
  soundVolume?: Integer
}

/** Input for updating an AirPlayDevice. Omitted fields are left unchanged. */
export interface AirPlayDeviceUpdateInput {
  /** is the device currently selected? */
  selected?: boolean
  /** the output volume for the device (0 = minimum, 100 = maximum) */
  soundVolume?: Integer
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
  /** data for this artwork, in the form of a picture */
  data?: string
  /** description of artwork as a string */
  description?: string
  /** kind or purpose of this piece of artwork */
  kind?: Integer
  /** data for this artwork, in original format */
  rawData?: unknown
}

/** Input for creating an AudioCDPlaylist. */
export interface AudioCDPlaylistCreateInput {
  /** the artist of the CD */
  artist?: string
  /** is this CD a compilation album? */
  compilation?: boolean
  /** the composer of the CD */
  composer?: string
  /** the total number of discs in this CD’s album */
  discCount?: Integer
  /** the index of this CD disc in the source album */
  discNumber?: Integer
  /** the genre of the CD */
  genre?: string
  /** the year the album was recorded/released */
  year?: Integer
}

/** Input for updating an AudioCDPlaylist. Omitted fields are left unchanged. */
export interface AudioCDPlaylistUpdateInput {
  /** the artist of the CD */
  artist?: string
  /** is this CD a compilation album? */
  compilation?: boolean
  /** the composer of the CD */
  composer?: string
  /** the total number of discs in this CD’s album */
  discCount?: Integer
  /** the index of this CD disc in the source album */
  discNumber?: Integer
  /** the genre of the CD */
  genre?: string
  /** the year the album was recorded/released */
  year?: Integer
}

/** Input for creating an AudioCDTrack. */
export type AudioCDTrackCreateInput = Record<string, never>

/** Input for updating an AudioCDTrack. Omitted fields are left unchanged. */
export type AudioCDTrackUpdateInput = Record<string, never>

/** Input for creating a BrowserWindow. */
export interface BrowserWindowCreateInput {
  /** the playlist currently displayed in the window */
  view?: ObjectReferenceVariant<Playlist, never>
}

/** Input for updating a BrowserWindow. Omitted fields are left unchanged. */
export interface BrowserWindowUpdateInput {
  /** the playlist currently displayed in the window */
  view?: ObjectReferenceVariant<Playlist, never>
}

/** Input for creating an Encoder. */
export type EncoderCreateInput = Record<string, never>

/** Input for updating an Encoder. Omitted fields are left unchanged. */
export type EncoderUpdateInput = Record<string, never>

/** Input for creating an EQPreset. */
export interface EQPresetCreateInput {
  /** the equalizer 32 Hz band level (-12.0 dB to +12.0 dB) */
  band1?: number
  /** the equalizer 64 Hz band level (-12.0 dB to +12.0 dB) */
  band2?: number
  /** the equalizer 125 Hz band level (-12.0 dB to +12.0 dB) */
  band3?: number
  /** the equalizer 250 Hz band level (-12.0 dB to +12.0 dB) */
  band4?: number
  /** the equalizer 500 Hz band level (-12.0 dB to +12.0 dB) */
  band5?: number
  /** the equalizer 1 kHz band level (-12.0 dB to +12.0 dB) */
  band6?: number
  /** the equalizer 2 kHz band level (-12.0 dB to +12.0 dB) */
  band7?: number
  /** the equalizer 4 kHz band level (-12.0 dB to +12.0 dB) */
  band8?: number
  /** the equalizer 8 kHz band level (-12.0 dB to +12.0 dB) */
  band9?: number
  /** the equalizer 16 kHz band level (-12.0 dB to +12.0 dB) */
  band10?: number
  /** the equalizer preamp level (-12.0 dB to +12.0 dB) */
  preamp?: number
  /** should tracks which refer to this preset be updated when the preset is renamed or deleted? */
  updateTracks?: boolean
}

/** Input for updating an EQPreset. Omitted fields are left unchanged. */
export interface EQPresetUpdateInput {
  /** the equalizer 32 Hz band level (-12.0 dB to +12.0 dB) */
  band1?: number
  /** the equalizer 64 Hz band level (-12.0 dB to +12.0 dB) */
  band2?: number
  /** the equalizer 125 Hz band level (-12.0 dB to +12.0 dB) */
  band3?: number
  /** the equalizer 250 Hz band level (-12.0 dB to +12.0 dB) */
  band4?: number
  /** the equalizer 500 Hz band level (-12.0 dB to +12.0 dB) */
  band5?: number
  /** the equalizer 1 kHz band level (-12.0 dB to +12.0 dB) */
  band6?: number
  /** the equalizer 2 kHz band level (-12.0 dB to +12.0 dB) */
  band7?: number
  /** the equalizer 4 kHz band level (-12.0 dB to +12.0 dB) */
  band8?: number
  /** the equalizer 8 kHz band level (-12.0 dB to +12.0 dB) */
  band9?: number
  /** the equalizer 16 kHz band level (-12.0 dB to +12.0 dB) */
  band10?: number
  /** the equalizer preamp level (-12.0 dB to +12.0 dB) */
  preamp?: number
  /** should tracks which refer to this preset be updated when the preset is renamed or deleted? */
  updateTracks?: boolean
}

/** Input for creating an EQWindow. */
export type EQWindowCreateInput = Record<string, never>

/** Input for updating an EQWindow. Omitted fields are left unchanged. */
export type EQWindowUpdateInput = Record<string, never>

/** Input for creating a FileTrack. */
export interface FileTrackCreateInput {
  /** the location of the file represented by this track */
  location?: FileSource
}

/** Input for updating a FileTrack. Omitted fields are left unchanged. */
export interface FileTrackUpdateInput {
  /** the location of the file represented by this track */
  location?: FileSource
}

/** Input for creating a LibraryPlaylist. */
export type LibraryPlaylistCreateInput = Record<string, never>

/** Input for updating a LibraryPlaylist. Omitted fields are left unchanged. */
export type LibraryPlaylistUpdateInput = Record<string, never>

/** Input for creating a MiniplayerWindow. */
export type MiniplayerWindowCreateInput = Record<string, never>

/** Input for updating a MiniplayerWindow. Omitted fields are left unchanged. */
export type MiniplayerWindowUpdateInput = Record<string, never>

/** Input for creating a Playlist. */
export interface PlaylistCreateInput {
  /** the description of the playlist */
  description?: string
  /** is this playlist disliked? */
  disliked?: boolean
  /** the name of the playlist */
  name?: string
  /** is this playlist favorited? */
  favorited?: boolean
}

/** Input for updating a Playlist. Omitted fields are left unchanged. */
export interface PlaylistUpdateInput {
  /** the description of the playlist */
  description?: string
  /** is this playlist disliked? */
  disliked?: boolean
  /** the name of the playlist */
  name?: string
  /** is this playlist favorited? */
  favorited?: boolean
}

/** Input for creating a PlaylistWindow. */
export type PlaylistWindowCreateInput = Record<string, never>

/** Input for updating a PlaylistWindow. Omitted fields are left unchanged. */
export type PlaylistWindowUpdateInput = Record<string, never>

/** Input for creating a RadioTunerPlaylist. */
export type RadioTunerPlaylistCreateInput = Record<string, never>

/** Input for updating a RadioTunerPlaylist. Omitted fields are left unchanged. */
export type RadioTunerPlaylistUpdateInput = Record<string, never>

/** Input for creating a SharedTrack. */
export type SharedTrackCreateInput = Record<string, never>

/** Input for updating a SharedTrack. Omitted fields are left unchanged. */
export type SharedTrackUpdateInput = Record<string, never>

/** Input for creating a Source. */
export type SourceCreateInput = Record<string, never>

/** Input for updating a Source. Omitted fields are left unchanged. */
export type SourceUpdateInput = Record<string, never>

/** Input for creating a SubscriptionPlaylist. */
export type SubscriptionPlaylistCreateInput = Record<string, never>

/** Input for updating a SubscriptionPlaylist. Omitted fields are left unchanged. */
export type SubscriptionPlaylistUpdateInput = Record<string, never>

/** Input for creating a Track. */
export interface TrackCreateInput {
  /** the album name of the track */
  album?: string
  /** the album artist of the track */
  albumArtist?: string
  /** is the album for this track disliked? */
  albumDisliked?: boolean
  /** is the album for this track favorited? */
  albumFavorited?: boolean
  /** the rating of the album for this track (0 to 100) */
  albumRating?: Integer
  /** the artist/source of the track */
  artist?: string
  /** the bookmark time of the track in seconds */
  bookmark?: number
  /** is the playback position for this track remembered? */
  bookmarkable?: boolean
  /** the tempo of this track in beats per minute */
  bpm?: Integer
  /** the category of the track */
  category?: string
  /** freeform notes about the track */
  comment?: string
  /** is this track from a compilation album? */
  compilation?: boolean
  /** the composer of the track */
  composer?: string
  /** the description of the track */
  description?: string
  /** the total number of discs in the source album */
  discCount?: Integer
  /** the index of the disc containing this track on the source album */
  discNumber?: Integer
  /** is this track disliked? */
  disliked?: boolean
  /** is this track checked for playback? */
  enabled?: boolean
  /** the episode ID of the track */
  episodeID?: string
  /** the episode number of the track */
  episodeNumber?: Integer
  /** the name of the EQ preset of the track */
  eQ?: string
  /** the stop time of the track in seconds */
  finish?: number
  /** is this track from a gapless album? */
  gapless?: boolean
  /** the music/audio genre (category) of the track */
  genre?: string
  /**
   * the grouping (piece) of the track. Generally used to denote movements within a classical work.
   */
  grouping?: string
  /** the long description of the track */
  longDescription?: string
  /** is this track favorited? */
  favorited?: boolean
  /** the lyrics of the track */
  lyrics?: string
  /** the media kind of the track */
  mediaKind?: string
  /** the movement name of the track */
  movement?: string
  /** the total number of movements in the work */
  movementCount?: Integer
  /** the index of the movement in the work */
  movementNumber?: Integer
  /** number of times this track has been played */
  playedCount?: Integer
  /** the date and time this track was last played */
  playedDate?: Date
  /** the rating of this track (0 to 100) */
  rating?: Integer
  /** the season number of the track */
  seasonNumber?: Integer
  /** is this track included when shuffling? */
  shufflable?: boolean
  /** number of times this track has been skipped */
  skippedCount?: Integer
  /** the date and time this track was last skipped */
  skippedDate?: Date
  /** the show name of the track */
  show?: string
  /** override string to use for the track when sorting by album */
  sortAlbum?: string
  /** override string to use for the track when sorting by artist */
  sortArtist?: string
  /** override string to use for the track when sorting by album artist */
  sortAlbumArtist?: string
  /** override string to use for the track when sorting by name */
  sortName?: string
  /** override string to use for the track when sorting by composer */
  sortComposer?: string
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
  /** the work name of the track */
  work?: string
  /** the year the track was recorded/released */
  year?: Integer
}

/** Input for updating a Track. Omitted fields are left unchanged. */
export interface TrackUpdateInput {
  /** the album name of the track */
  album?: string
  /** the album artist of the track */
  albumArtist?: string
  /** is the album for this track disliked? */
  albumDisliked?: boolean
  /** is the album for this track favorited? */
  albumFavorited?: boolean
  /** the rating of the album for this track (0 to 100) */
  albumRating?: Integer
  /** the artist/source of the track */
  artist?: string
  /** the bookmark time of the track in seconds */
  bookmark?: number
  /** is the playback position for this track remembered? */
  bookmarkable?: boolean
  /** the tempo of this track in beats per minute */
  bpm?: Integer
  /** the category of the track */
  category?: string
  /** freeform notes about the track */
  comment?: string
  /** is this track from a compilation album? */
  compilation?: boolean
  /** the composer of the track */
  composer?: string
  /** the description of the track */
  description?: string
  /** the total number of discs in the source album */
  discCount?: Integer
  /** the index of the disc containing this track on the source album */
  discNumber?: Integer
  /** is this track disliked? */
  disliked?: boolean
  /** is this track checked for playback? */
  enabled?: boolean
  /** the episode ID of the track */
  episodeID?: string
  /** the episode number of the track */
  episodeNumber?: Integer
  /** the name of the EQ preset of the track */
  eQ?: string
  /** the stop time of the track in seconds */
  finish?: number
  /** is this track from a gapless album? */
  gapless?: boolean
  /** the music/audio genre (category) of the track */
  genre?: string
  /**
   * the grouping (piece) of the track. Generally used to denote movements within a classical work.
   */
  grouping?: string
  /** the long description of the track */
  longDescription?: string
  /** is this track favorited? */
  favorited?: boolean
  /** the lyrics of the track */
  lyrics?: string
  /** the media kind of the track */
  mediaKind?: string
  /** the movement name of the track */
  movement?: string
  /** the total number of movements in the work */
  movementCount?: Integer
  /** the index of the movement in the work */
  movementNumber?: Integer
  /** number of times this track has been played */
  playedCount?: Integer
  /** the date and time this track was last played */
  playedDate?: Date
  /** the rating of this track (0 to 100) */
  rating?: Integer
  /** the season number of the track */
  seasonNumber?: Integer
  /** is this track included when shuffling? */
  shufflable?: boolean
  /** number of times this track has been skipped */
  skippedCount?: Integer
  /** the date and time this track was last skipped */
  skippedDate?: Date
  /** the show name of the track */
  show?: string
  /** override string to use for the track when sorting by album */
  sortAlbum?: string
  /** override string to use for the track when sorting by artist */
  sortArtist?: string
  /** override string to use for the track when sorting by album artist */
  sortAlbumArtist?: string
  /** override string to use for the track when sorting by name */
  sortName?: string
  /** override string to use for the track when sorting by composer */
  sortComposer?: string
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
  /** the work name of the track */
  work?: string
  /** the year the track was recorded/released */
  year?: Integer
}

/** Input for creating an URLTrack. */
export interface URLTrackCreateInput {
  /** the URL for this track */
  address?: string
}

/** Input for updating an URLTrack. Omitted fields are left unchanged. */
export interface URLTrackUpdateInput {
  /** the URL for this track */
  address?: string
}

/** Input for creating an UserPlaylist. */
export interface UserPlaylistCreateInput {
  /** is this playlist shared? */
  shared?: boolean
}

/** Input for updating an UserPlaylist. Omitted fields are left unchanged. */
export interface UserPlaylistUpdateInput {
  /** is this playlist shared? */
  shared?: boolean
}

/** Input for creating a VideoWindow. */
export type VideoWindowCreateInput = Record<string, never>

/** Input for updating a VideoWindow. Omitted fields are left unchanged. */
export type VideoWindowUpdateInput = Record<string, never>

/** Input for creating a Visual. */
export type VisualCreateInput = Record<string, never>

/** Input for updating a Visual. Omitted fields are left unchanged. */
export type VisualUpdateInput = Record<string, never>

/** a track representing an audio file (MP3, AIFF, etc.) */
export interface FileTrackResourceClient {
  /** update file track information from the current information in the track’s file */
  refresh(options?: CallOptions): Promise<void>
}

/** a list of tracks/streams */
export interface PlaylistResourceClient {
  /** Move playlist(s) to a new location */
  move(to: string, options?: CallOptions): Promise<void>
  /**
   * search a playlist for tracks matching the search string. Identical to entering search text in
   * the Search field.
   */
  search(_for: string, only?: string, options?: CallOptions): Promise<void>
}

/**
 * The Music client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link musicContract}.
 */
export interface MusicClient {
  /** a track representing an audio file (MP3, AIFF, etc.) */
  readonly filetracks: FileTrackResourceClient
  /** a list of tracks/streams */
  readonly playlists: PlaylistResourceClient
  /** Print the specified object(s) */
  print(
    printDialog?: boolean,
    withProperties?: string,
    kind?: string,
    theme?: string,
    options?: CallOptions
  ): Promise<void>
  /** Close an object */
  close(options?: CallOptions): Promise<void>
  /** Return the number of elements of a particular class within an object */
  count(each: string, options?: CallOptions): Promise<void>
  /** Delete an element from an object */
  _delete(options?: CallOptions): Promise<void>
  /** Duplicate one or more object(s) */
  duplicate(to?: string, options?: CallOptions): Promise<void>
  /** Verify if an object exists */
  exists(options?: CallOptions): Promise<void>
  /** Make a new element */
  make(_new: string, at?: string, withProperties?: unknown, options?: CallOptions): Promise<void>
  /** Open the specified object(s) */
  open(options?: CallOptions): Promise<void>
  /** Run the application */
  run(options?: CallOptions): Promise<void>
  /** Quit the application */
  quit(options?: CallOptions): Promise<void>
  /** Save the specified object(s) */
  save(options?: CallOptions): Promise<void>
  /** add one or more files to a playlist */
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
  /** export a source or playlist */
  _export(as?: string, to?: FileSource, options?: CallOptions): Promise<void>
  /** skip forward in a playing track */
  fastForward(options?: CallOptions): Promise<void>
  /** advance to the next track in the current playlist */
  nextTrack(options?: CallOptions): Promise<void>
  /** pause playback */
  pause(options?: CallOptions): Promise<void>
  /** play the current track or the specified track or file. */
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
  /** Opens an iTunes Store or audio stream URL */
  openLocation(options?: CallOptions): Promise<void>
}

const airPlayDeviceRecordType: ValueType<AirPlayDevice> = t.record(
  {
    active: t.boolean({ description: 'is the device currently being played to?' }),
    available: t.boolean({ description: 'is the device currently available?' }),
    kind: t.string({ description: 'the kind of the device' }),
    networkAddress: t.string({ description: 'the network (MAC) address of the device' }),
    protected: t.boolean({ description: 'is the device password- or passcode-protected?' }),
    selected: t.boolean({ description: 'is the device currently selected?' }),
    supportsAudio: t.boolean({ description: 'does the device support audio playback?' }),
    supportsVideo: t.boolean({ description: 'does the device support video playback?' }),
    soundVolume: t.integer({
      description: 'the output volume for the device (0 = minimum, 100 = maximum)',
    }),
  },
  { description: 'an AirPlay device' }
)

const artworkRecordType: ValueType<Artwork> = t.record(
  {
    data: t.string({ description: 'data for this artwork, in the form of a picture' }),
    description: t.string({ description: 'description of artwork as a string' }),
    downloaded: t.boolean({ description: 'was this artwork downloaded by Music?' }),
    format: t.string({ description: 'the data format for this piece of artwork' }),
    kind: t.integer({ description: 'kind or purpose of this piece of artwork' }),
    rawData: t.unknown({ description: 'data for this artwork, in original format' }),
  },
  { description: 'a piece of art within a track or playlist' }
)

const audioCDPlaylistRecordType: ValueType<AudioCDPlaylist> = t.record(
  {
    artist: t.string({ description: 'the artist of the CD' }),
    compilation: t.boolean({ description: 'is this CD a compilation album?' }),
    composer: t.string({ description: 'the composer of the CD' }),
    discCount: t.integer({ description: 'the total number of discs in this CD’s album' }),
    discNumber: t.integer({ description: 'the index of this CD disc in the source album' }),
    genre: t.string({ description: 'the genre of the CD' }),
    year: t.integer({ description: 'the year the album was recorded/released' }),
  },
  { description: 'a playlist representing an audio CD' }
)

const audioCDTrackRecordType: ValueType<AudioCDTrack> = t.record(
  {
    location: t.file({ description: 'the location of the file represented by this track' }),
  },
  { description: 'a track on an audio CD' }
)

const browserWindowRecordType: ValueType<BrowserWindow> = t.record(
  {
    selection: t.string({ description: 'the selected tracks' }),
    view: t.reference<Playlist, never>(() => resources, 'Playlist', 'one', {
      description: 'the playlist currently displayed in the window',
    }),
  },
  { description: 'the main window' }
)

const encoderRecordType: ValueType<Encoder> = t.record(
  {
    format: t.string({ description: 'the data format created by the encoder' }),
  },
  { description: 'converts a track to a specific file format' }
)

const eqPresetRecordType: ValueType<EQPreset> = t.record(
  {
    band1: t.double({ description: 'the equalizer 32 Hz band level (-12.0 dB to +12.0 dB)' }),
    band2: t.double({ description: 'the equalizer 64 Hz band level (-12.0 dB to +12.0 dB)' }),
    band3: t.double({ description: 'the equalizer 125 Hz band level (-12.0 dB to +12.0 dB)' }),
    band4: t.double({ description: 'the equalizer 250 Hz band level (-12.0 dB to +12.0 dB)' }),
    band5: t.double({ description: 'the equalizer 500 Hz band level (-12.0 dB to +12.0 dB)' }),
    band6: t.double({ description: 'the equalizer 1 kHz band level (-12.0 dB to +12.0 dB)' }),
    band7: t.double({ description: 'the equalizer 2 kHz band level (-12.0 dB to +12.0 dB)' }),
    band8: t.double({ description: 'the equalizer 4 kHz band level (-12.0 dB to +12.0 dB)' }),
    band9: t.double({ description: 'the equalizer 8 kHz band level (-12.0 dB to +12.0 dB)' }),
    band10: t.double({ description: 'the equalizer 16 kHz band level (-12.0 dB to +12.0 dB)' }),
    modifiable: t.boolean({ description: 'can this preset be modified?' }),
    preamp: t.double({ description: 'the equalizer preamp level (-12.0 dB to +12.0 dB)' }),
    updateTracks: t.boolean({
      description:
        'should tracks which refer to this preset be updated when the preset is renamed or deleted?',
    }),
  },
  { description: 'equalizer preset configuration' }
)

const eqWindowRecordType: ValueType<EQWindow> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this window' }),
  },
  { description: 'the equalizer window' }
)

const fileTrackRecordType: ValueType<FileTrack> = t.record(
  {
    location: t.file({ description: 'the location of the file represented by this track' }),
  },
  { description: 'a track representing an audio file (MP3, AIFF, etc.)' }
)

const libraryPlaylistRecordType: ValueType<LibraryPlaylist> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this playlist' }),
  },
  { description: 'the main library playlist' }
)

const miniplayerWindowRecordType: ValueType<MiniplayerWindow> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this window' }),
  },
  { description: 'the miniplayer window' }
)

const playlistRecordType: ValueType<Playlist> = t.record(
  {
    description: t.string({ description: 'the description of the playlist' }),
    disliked: t.boolean({ description: 'is this playlist disliked?' }),
    duration: t.integer({ description: 'the total length of all tracks (in seconds)' }),
    name: t.string({ description: 'the name of the playlist' }),
    favorited: t.boolean({ description: 'is this playlist favorited?' }),
    parent: t.reference<Playlist, never>(() => resources, 'Playlist', 'one', {
      description: 'folder which contains this playlist (if any)',
    }),
    size: t.integer({ description: 'the total size of all tracks (in bytes)' }),
    specialKind: t.string({ description: 'special playlist kind' }),
    time: t.string({ description: 'the length of all tracks in MM:SS format' }),
    visible: t.boolean({ description: 'is this playlist visible in the Source list?' }),
  },
  { description: 'a list of tracks/streams' }
)

const playlistWindowRecordType: ValueType<PlaylistWindow> = t.record(
  {
    selection: t.string({ description: 'the selected tracks' }),
    view: t.reference<Playlist, never>(() => resources, 'Playlist', 'one', {
      description: 'the playlist displayed in the window',
    }),
  },
  { description: 'a sub-window showing a single playlist' }
)

const radioTunerPlaylistRecordType: ValueType<RadioTunerPlaylist> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this playlist' }),
  },
  { description: 'the radio tuner playlist' }
)

const sharedTrackRecordType: ValueType<SharedTrack> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this track' }),
  },
  { description: 'a track residing in a shared library' }
)

const sourceRecordType: ValueType<Source> = t.record(
  {
    capacity: t.double({ description: 'the total size of the source if it has a fixed size' }),
    freeSpace: t.double({ description: 'the free space on the source if it has a fixed size' }),
    kind: t.string({ description: 'The kind property' }),
  },
  { description: 'a media source (library, CD, device, etc.)' }
)

const subscriptionPlaylistRecordType: ValueType<SubscriptionPlaylist> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this playlist' }),
  },
  { description: 'a subscription playlist from Apple Music' }
)

const trackRecordType: ValueType<Track> = t.record(
  {
    album: t.string({ description: 'the album name of the track' }),
    albumArtist: t.string({ description: 'the album artist of the track' }),
    albumDisliked: t.boolean({ description: 'is the album for this track disliked?' }),
    albumFavorited: t.boolean({ description: 'is the album for this track favorited?' }),
    albumRating: t.integer({ description: 'the rating of the album for this track (0 to 100)' }),
    albumRatingKind: t.string({
      description: 'the rating kind of the album rating for this track',
    }),
    artist: t.string({ description: 'the artist/source of the track' }),
    bitRate: t.integer({ description: 'the bit rate of the track (in kbps)' }),
    bookmark: t.double({ description: 'the bookmark time of the track in seconds' }),
    bookmarkable: t.boolean({ description: 'is the playback position for this track remembered?' }),
    bpm: t.integer({ description: 'the tempo of this track in beats per minute' }),
    category: t.string({ description: 'the category of the track' }),
    cloudStatus: t.string({ description: 'the iCloud status of the track' }),
    comment: t.string({ description: 'freeform notes about the track' }),
    compilation: t.boolean({ description: 'is this track from a compilation album?' }),
    composer: t.string({ description: 'the composer of the track' }),
    databaseID: t.integer({
      description:
        'the common, unique ID for this track. If two tracks in different playlists have the same database ID, they are sharing the same data.',
    }),
    dateAdded: t.date({ description: 'the date the track was added to the playlist' }),
    description: t.string({ description: 'the description of the track' }),
    discCount: t.integer({ description: 'the total number of discs in the source album' }),
    discNumber: t.integer({
      description: 'the index of the disc containing this track on the source album',
    }),
    disliked: t.boolean({ description: 'is this track disliked?' }),
    downloaderAccount: t.string({
      description: 'the account of the person who downloaded this track',
    }),
    downloaderName: t.string({ description: 'the name of the person who downloaded this track' }),
    duration: t.double({ description: 'the length of the track in seconds' }),
    enabled: t.boolean({ description: 'is this track checked for playback?' }),
    episodeID: t.string({ description: 'the episode ID of the track' }),
    episodeNumber: t.integer({ description: 'the episode number of the track' }),
    eQ: t.string({ description: 'the name of the EQ preset of the track' }),
    finish: t.double({ description: 'the stop time of the track in seconds' }),
    gapless: t.boolean({ description: 'is this track from a gapless album?' }),
    genre: t.string({ description: 'the music/audio genre (category) of the track' }),
    grouping: t.string({
      description:
        'the grouping (piece) of the track. Generally used to denote movements within a classical work.',
    }),
    kind: t.string({ description: 'a text description of the track' }),
    longDescription: t.string({ description: 'the long description of the track' }),
    favorited: t.boolean({ description: 'is this track favorited?' }),
    lyrics: t.string({ description: 'the lyrics of the track' }),
    mediaKind: t.string({ description: 'the media kind of the track' }),
    modificationDate: t.date({ description: 'the modification date of the content of this track' }),
    movement: t.string({ description: 'the movement name of the track' }),
    movementCount: t.integer({ description: 'the total number of movements in the work' }),
    movementNumber: t.integer({ description: 'the index of the movement in the work' }),
    playedCount: t.integer({ description: 'number of times this track has been played' }),
    playedDate: t.date({ description: 'the date and time this track was last played' }),
    purchaserAccount: t.string({
      description: 'the account of the person who purchased this track',
    }),
    purchaserName: t.string({ description: 'the name of the person who purchased this track' }),
    rating: t.integer({ description: 'the rating of this track (0 to 100)' }),
    ratingKind: t.string({ description: 'the rating kind of this track' }),
    releaseDate: t.date({ description: 'the release date of this track' }),
    sampleRate: t.integer({ description: 'the sample rate of the track (in Hz)' }),
    seasonNumber: t.integer({ description: 'the season number of the track' }),
    shufflable: t.boolean({ description: 'is this track included when shuffling?' }),
    skippedCount: t.integer({ description: 'number of times this track has been skipped' }),
    skippedDate: t.date({ description: 'the date and time this track was last skipped' }),
    show: t.string({ description: 'the show name of the track' }),
    sortAlbum: t.string({
      description: 'override string to use for the track when sorting by album',
    }),
    sortArtist: t.string({
      description: 'override string to use for the track when sorting by artist',
    }),
    sortAlbumArtist: t.string({
      description: 'override string to use for the track when sorting by album artist',
    }),
    sortName: t.string({
      description: 'override string to use for the track when sorting by name',
    }),
    sortComposer: t.string({
      description: 'override string to use for the track when sorting by composer',
    }),
    sortShow: t.string({
      description: 'override string to use for the track when sorting by show name',
    }),
    size: t.double({ description: 'the size of the track (in bytes)' }),
    start: t.double({ description: 'the start time of the track in seconds' }),
    time: t.string({ description: 'the length of the track in MM:SS format' }),
    trackCount: t.integer({ description: 'the total number of tracks on the source album' }),
    trackNumber: t.integer({ description: 'the index of the track on the source album' }),
    unplayed: t.boolean({ description: 'is this track unplayed?' }),
    volumeAdjustment: t.integer({
      description: 'relative volume adjustment of the track (-100% to 100%)',
    }),
    work: t.string({ description: 'the work name of the track' }),
    year: t.integer({ description: 'the year the track was recorded/released' }),
  },
  { description: 'playable audio source' }
)

const urlTrackRecordType: ValueType<URLTrack> = t.record(
  {
    address: t.string({ description: 'the URL for this track' }),
  },
  { description: 'a track representing a network stream' }
)

const userPlaylistRecordType: ValueType<UserPlaylist> = t.record(
  {
    shared: t.boolean({ description: 'is this playlist shared?' }),
    smart: t.boolean({ description: 'is this a Smart Playlist?' }),
    genius: t.boolean({ description: 'is this a Genius Playlist?' }),
  },
  { description: 'custom playlists created by the user' }
)

const videoWindowRecordType: ValueType<VideoWindow> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this window' }),
  },
  { description: 'the video window' }
)

const visualRecordType: ValueType<Visual> = t.record(
  {
    id: t.integer({ description: 'Unique identifier for this visual' }),
  },
  { description: 'a visual plug-in' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<MusicClient>['resources'] = {
  AirPlayDevice: {
    name: 'AirPlayDevice',
    record: airPlayDeviceRecordType,
  },
  Artwork: {
    name: 'Artwork',
    record: artworkRecordType,
  },
  AudioCDPlaylist: {
    name: 'AudioCDPlaylist',
    record: audioCDPlaylistRecordType,
  },
  AudioCDTrack: {
    name: 'AudioCDTrack',
    record: audioCDTrackRecordType,
  },
  BrowserWindow: {
    name: 'BrowserWindow',
    record: browserWindowRecordType,
  },
  Encoder: {
    name: 'Encoder',
    record: encoderRecordType,
  },
  EQPreset: {
    name: 'EQPreset',
    record: eqPresetRecordType,
  },
  EQWindow: {
    name: 'EQWindow',
    record: eqWindowRecordType,
  },
  FileTrack: {
    name: 'FileTrack',
    record: fileTrackRecordType,
  },
  LibraryPlaylist: {
    name: 'LibraryPlaylist',
    record: libraryPlaylistRecordType,
  },
  MiniplayerWindow: {
    name: 'MiniplayerWindow',
    record: miniplayerWindowRecordType,
  },
  Playlist: {
    name: 'Playlist',
    record: playlistRecordType,
  },
  PlaylistWindow: {
    name: 'PlaylistWindow',
    record: playlistWindowRecordType,
  },
  RadioTunerPlaylist: {
    name: 'RadioTunerPlaylist',
    record: radioTunerPlaylistRecordType,
  },
  SharedTrack: {
    name: 'SharedTrack',
    record: sharedTrackRecordType,
  },
  Source: {
    name: 'Source',
    record: sourceRecordType,
  },
  SubscriptionPlaylist: {
    name: 'SubscriptionPlaylist',
    record: subscriptionPlaylistRecordType,
  },
  Track: {
    name: 'Track',
    record: trackRecordType,
  },
  URLTrack: {
    name: 'URLTrack',
    record: urlTrackRecordType,
  },
  UserPlaylist: {
    name: 'UserPlaylist',
    record: userPlaylistRecordType,
  },
  VideoWindow: {
    name: 'VideoWindow',
    record: videoWindowRecordType,
  },
  Visual: {
    name: 'Visual',
    record: visualRecordType,
  },
}

const appPrintOperation: OperationDescriptor<
  {
    readonly printDialog?: boolean | undefined
    readonly withProperties?: string | undefined
    readonly kind?: string | undefined
    readonly theme?: string | undefined
  },
  undefined
> = {
  id: 'music.app.print',
  permission: 'music:app:print',
  target: { command: 'print' },
  description: 'Print the specified object(s)',
  input: t.record({
    printDialog: t.optional(
      t.boolean({ description: 'Should the application show the print dialog' })
    ),
    withProperties: t.optional(t.string({ description: 'the print settings' })),
    kind: t.optional(t.string({ description: 'the kind of printout desired' })),
    theme: t.optional(
      t.string({ description: 'name of theme to use for formatting the printout' })
    ),
  }),
  output: t.none(),
}

const appCloseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.close',
  permission: 'music:app:close',
  target: { command: 'close' },
  description: 'Close an object',
  input: t.record({}),
  output: t.none(),
}

const appCountOperation: OperationDescriptor<{ readonly each: string }, undefined> = {
  id: 'music.app.count',
  permission: 'music:app:count',
  target: { command: 'count' },
  description: 'Return the number of elements of a particular class within an object',
  input: t.record({
    each: t.string({
      description:
        "the class of the elements to be counted. Keyword 'each' is optional in AppleScript",
    }),
  }),
  output: t.none(),
}

const appDeleteOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.delete',
  permission: 'music:app:delete',
  target: { command: 'delete' },
  description: 'Delete an element from an object',
  input: t.record({}),
  output: t.none(),
}

const appDuplicateOperation: OperationDescriptor<{ readonly to?: string | undefined }, undefined> =
  {
    id: 'music.app.duplicate',
    permission: 'music:app:duplicate',
    target: { command: 'duplicate' },
    description: 'Duplicate one or more object(s)',
    input: t.record({
      to: t.optional(t.string({ description: 'the new location for the object(s)' })),
    }),
    output: t.none(),
  }

const appExistsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.exists',
  permission: 'music:app:exists',
  target: { command: 'exists' },
  description: 'Verify if an object exists',
  input: t.record({}),
  output: t.none(),
}

const appMakeOperation: OperationDescriptor<
  { readonly new: string; readonly at?: string | undefined; readonly withProperties?: unknown },
  undefined
> = {
  id: 'music.app.make',
  permission: 'music:app:make',
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
}

const playlistMoveOperation: OperationDescriptor<{ readonly to: string }, undefined> = {
  id: 'music.playlists.move',
  permission: 'music:playlists:move',
  target: { command: 'move', resource: 'Playlist' },
  description: 'Move playlist(s) to a new location',
  input: t.record({
    to: t.string({ description: 'the new location for the playlist(s)' }),
  }),
  output: t.none(),
}

const appOpenOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.open',
  permission: 'music:app:open',
  target: { command: 'open' },
  description: 'Open the specified object(s)',
  input: t.record({}),
  output: t.none(),
}

const appRunOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.run',
  permission: 'music:app:run',
  target: { command: 'run' },
  description: 'Run the application',
  input: t.record({}),
  output: t.none(),
}

const appQuitOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.quit',
  permission: 'music:app:quit',
  target: { command: 'quit' },
  description: 'Quit the application',
  input: t.record({}),
  output: t.none(),
}

const appSaveOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.save',
  permission: 'music:app:save',
  target: { command: 'save' },
  description: 'Save the specified object(s)',
  input: t.record({}),
  output: t.none(),
}

const appAddOperation: OperationDescriptor<{ readonly to?: string | undefined }, undefined> = {
  id: 'music.app.add',
  permission: 'music:app:add',
  target: { command: 'add' },
  description: 'add one or more files to a playlist',
  input: t.record({
    to: t.optional(t.string({ description: 'the location of the added file(s)' })),
  }),
  output: t.none(),
}

const appBackTrackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.backTrack',
  permission: 'music:app:backTrack',
  target: { command: 'backTrack' },
  description:
    'reposition to beginning of current track or go to previous track if already at start of current track',
  input: t.record({}),
  output: t.none(),
}

const appConvertOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.convert',
  permission: 'music:app:convert',
  target: { command: 'convert' },
  description: 'convert one or more files or tracks',
  input: t.record({}),
  output: t.none(),
}

const appDownloadOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.download',
  permission: 'music:app:download',
  target: { command: 'download' },
  description: 'download a cloud track or playlist',
  input: t.record({}),
  output: t.none(),
}

const appExportOperation: OperationDescriptor<
  { readonly as?: string | undefined; readonly to?: FileSource | undefined },
  undefined
> = {
  id: 'music.app.export',
  permission: 'music:app:export',
  target: { command: 'export' },
  description: 'export a source or playlist',
  input: t.record({
    as: t.optional(t.string({ description: 'the format to export for a playlist' })),
    to: t.optional(t.fileSource({ description: 'the destination of the export' })),
  }),
  output: t.none(),
}

const appFastForwardOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.fastForward',
  permission: 'music:app:fastForward',
  target: { command: 'fastForward' },
  description: 'skip forward in a playing track',
  input: t.record({}),
  output: t.none(),
}

const appNextTrackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.nextTrack',
  permission: 'music:app:nextTrack',
  target: { command: 'nextTrack' },
  description: 'advance to the next track in the current playlist',
  input: t.record({}),
  output: t.none(),
}

const appPauseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.pause',
  permission: 'music:app:pause',
  target: { command: 'pause' },
  description: 'pause playback',
  input: t.record({}),
  output: t.none(),
}

const appPlayOperation: OperationDescriptor<{ readonly once?: boolean | undefined }, undefined> = {
  id: 'music.app.play',
  permission: 'music:app:play',
  target: { command: 'play' },
  description: 'play the current track or the specified track or file.',
  input: t.record({
    once: t.optional(t.boolean({ description: 'If true, play this track once and then stop.' })),
  }),
  output: t.none(),
}

const appPlaypauseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.playpause',
  permission: 'music:app:playpause',
  target: { command: 'playpause' },
  description: 'toggle the playing/paused state of the current track',
  input: t.record({}),
  output: t.none(),
}

const appPreviousTrackOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.previousTrack',
  permission: 'music:app:previousTrack',
  target: { command: 'previousTrack' },
  description: 'return to the previous track in the current playlist',
  input: t.record({}),
  output: t.none(),
}

const fileTrackRefreshOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.filetracks.refresh',
  permission: 'music:filetracks:refresh',
  target: { command: 'refresh', resource: 'FileTrack' },
  description: 'update file track information from the current information in the track’s file',
  input: t.record({}),
  output: t.none(),
}

const appResumeOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.resume',
  permission: 'music:app:resume',
  target: { command: 'resume' },
  description: 'disable fast forward/rewind and resume playback, if playing.',
  input: t.record({}),
  output: t.none(),
}

const appRevealOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.reveal',
  permission: 'music:app:reveal',
  target: { command: 'reveal' },
  description: 'reveal and select a track or playlist',
  input: t.record({}),
  output: t.none(),
}

const appRewindOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.rewind',
  permission: 'music:app:rewind',
  target: { command: 'rewind' },
  description: 'skip backwards in a playing track',
  input: t.record({}),
  output: t.none(),
}

const playlistSearchOperation: OperationDescriptor<
  { readonly for: string; readonly only?: string | undefined },
  undefined
> = {
  id: 'music.playlists.search',
  permission: 'music:playlists:search',
  target: { command: 'search', resource: 'Playlist' },
  description:
    'search a playlist for tracks matching the search string. Identical to entering search text in the Search field.',
  input: t.record({
    for: t.string({ description: 'the search text' }),
    only: t.optional(t.string({ description: 'area to search (default is all)' })),
  }),
  output: t.none(),
}

const appSelectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.select',
  permission: 'music:app:select',
  target: { command: 'select' },
  description: 'select the specified object(s)',
  input: t.record({}),
  output: t.none(),
}

const appStopOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.stop',
  permission: 'music:app:stop',
  target: { command: 'stop' },
  description: 'stop playback',
  input: t.record({}),
  output: t.none(),
}

const appOpenLocationOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.openLocation',
  permission: 'music:app:openLocation',
  target: { command: 'openLocation' },
  description: 'Opens an iTunes Store or audio stream URL',
  input: t.record({}),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<MusicClient>['operations'] = {
  'music.app.print': appPrintOperation,
  'music.app.close': appCloseOperation,
  'music.app.count': appCountOperation,
  'music.app.delete': appDeleteOperation,
  'music.app.duplicate': appDuplicateOperation,
  'music.app.exists': appExistsOperation,
  'music.app.make': appMakeOperation,
  'music.playlists.move': playlistMoveOperation,
  'music.app.open': appOpenOperation,
  'music.app.run': appRunOperation,
  'music.app.quit': appQuitOperation,
  'music.app.save': appSaveOperation,
  'music.app.add': appAddOperation,
  'music.app.backTrack': appBackTrackOperation,
  'music.app.convert': appConvertOperation,
  'music.app.download': appDownloadOperation,
  'music.app.export': appExportOperation,
  'music.app.fastForward': appFastForwardOperation,
  'music.app.nextTrack': appNextTrackOperation,
  'music.app.pause': appPauseOperation,
  'music.app.play': appPlayOperation,
  'music.app.playpause': appPlaypauseOperation,
  'music.app.previousTrack': appPreviousTrackOperation,
  'music.filetracks.refresh': fileTrackRefreshOperation,
  'music.app.resume': appResumeOperation,
  'music.app.reveal': appRevealOperation,
  'music.app.rewind': appRewindOperation,
  'music.playlists.search': playlistSearchOperation,
  'music.app.select': appSelectOperation,
  'music.app.stop': appStopOperation,
  'music.app.openLocation': appOpenLocationOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): MusicClient {
  return {
    filetracks: {
      refresh: (options) => runtime.invoke(fileTrackRefreshOperation, {}, options),
    },
    playlists: {
      move: (to, options) => runtime.invoke(playlistMoveOperation, { to }, options),
      search: (_for, only, options) =>
        runtime.invoke(playlistSearchOperation, { for: _for, only }, options),
    },
    print: (printDialog, withProperties, kind, theme, options) =>
      runtime.invoke(appPrintOperation, { printDialog, withProperties, kind, theme }, options),
    close: (options) => runtime.invoke(appCloseOperation, {}, options),
    count: (each, options) => runtime.invoke(appCountOperation, { each }, options),
    _delete: (options) => runtime.invoke(appDeleteOperation, {}, options),
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
    _export: (as, to, options) => runtime.invoke(appExportOperation, { as, to }, options),
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
 * The Music contract. Pass it to a client factory to obtain a
 * {@link MusicClient}.
 */
export const musicContract: AppContract<MusicClient> = {
  app: 'music',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
