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
  type ObjectReferenceData,
  type ObjectReferenceVariant,
  type OperationDescriptor,
  type Page,
  type PageRequest,
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
  /**
   * is the device currently being played to?
   * Nullable. No evidence that the app always sets it.
   */
  readonly active: boolean | null
  /**
   * is the device currently available?
   * Nullable. No evidence that the app always sets it.
   */
  readonly available: boolean | null
  /**
   * the kind of the device.
   * Nullable. No evidence that the app always sets it.
   */
  readonly kind: string | null
  /**
   * the network (MAC) address of the device.
   * Nullable. No evidence that the app always sets it.
   */
  readonly networkAddress: string | null
  /**
   * is the device password- or passcode-protected?
   * Nullable. No evidence that the app always sets it.
   */
  readonly protected: boolean | null
  /**
   * is the device currently selected?
   * Nullable. No evidence that the app always sets it.
   */
  selected: boolean | null
  /**
   * does the device support audio playback?
   * Nullable. No evidence that the app always sets it.
   */
  readonly supportsAudio: boolean | null
  /**
   * does the device support video playback?
   * Nullable. No evidence that the app always sets it.
   */
  readonly supportsVideo: boolean | null
  /**
   * the output volume for the device (0 = minimum, 100 = maximum).
   * Nullable. No evidence that the app always sets it.
   */
  soundVolume: Integer | null
}

/** a piece of art within a track or playlist */
export interface Artwork {
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
   * was this artwork downloaded by Music?
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

/** a playlist representing an audio CD */
export interface AudioCDPlaylist {
  /**
   * the artist of the CD.
   * Nullable. No evidence that the app always sets it.
   */
  artist: string | null
  /**
   * is this CD a compilation album?
   * Nullable. No evidence that the app always sets it.
   */
  compilation: boolean | null
  /**
   * the composer of the CD.
   * Nullable. No evidence that the app always sets it.
   */
  composer: string | null
  /**
   * the total number of discs in this CD’s album.
   * Nullable. No evidence that the app always sets it.
   */
  discCount: Integer | null
  /**
   * the index of this CD disc in the source album.
   * Nullable. No evidence that the app always sets it.
   */
  discNumber: Integer | null
  /**
   * the genre of the CD.
   * Nullable. No evidence that the app always sets it.
   */
  genre: string | null
  /**
   * the year the album was recorded/released.
   * Nullable. No evidence that the app always sets it.
   */
  year: Integer | null
}

/** a track on an audio CD */
export interface AudioCDTrack {
  /**
   * the location of the file represented by this track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly location: FileValue | null
}

/** the main window */
export interface BrowserWindow {
  /**
   * the selected tracks.
   * Nullable. No evidence that the app always sets it.
   */
  readonly selection: string | null
  /**
   * the playlist currently displayed in the window.
   * Nullable. No evidence that the app always sets it.
   */
  view: ObjectReferenceVariant<Playlist, string, 'Playlist'> | null
}

/** converts a track to a specific file format */
export interface Encoder {
  /**
   * the data format created by the encoder.
   * Nullable. No evidence that the app always sets it.
   */
  readonly format: string | null
}

/** equalizer preset configuration */
export interface EQPreset {
  /**
   * the equalizer 32 Hz band level (-12.0 dB to +12.0 dB).
   * Nullable. No evidence that the app always sets it.
   */
  band1: number | null
  /**
   * the equalizer 64 Hz band level (-12.0 dB to +12.0 dB).
   * Nullable. No evidence that the app always sets it.
   */
  band2: number | null
  /**
   * the equalizer 125 Hz band level (-12.0 dB to +12.0 dB).
   * Nullable. No evidence that the app always sets it.
   */
  band3: number | null
  /**
   * the equalizer 250 Hz band level (-12.0 dB to +12.0 dB).
   * Nullable. No evidence that the app always sets it.
   */
  band4: number | null
  /**
   * the equalizer 500 Hz band level (-12.0 dB to +12.0 dB).
   * Nullable. No evidence that the app always sets it.
   */
  band5: number | null
  /**
   * the equalizer 1 kHz band level (-12.0 dB to +12.0 dB).
   * Nullable. No evidence that the app always sets it.
   */
  band6: number | null
  /**
   * the equalizer 2 kHz band level (-12.0 dB to +12.0 dB).
   * Nullable. No evidence that the app always sets it.
   */
  band7: number | null
  /**
   * the equalizer 4 kHz band level (-12.0 dB to +12.0 dB).
   * Nullable. No evidence that the app always sets it.
   */
  band8: number | null
  /**
   * the equalizer 8 kHz band level (-12.0 dB to +12.0 dB).
   * Nullable. No evidence that the app always sets it.
   */
  band9: number | null
  /**
   * the equalizer 16 kHz band level (-12.0 dB to +12.0 dB).
   * Nullable. No evidence that the app always sets it.
   */
  band10: number | null
  /**
   * can this preset be modified?
   * Nullable. No evidence that the app always sets it.
   */
  readonly modifiable: boolean | null
  /**
   * the equalizer preamp level (-12.0 dB to +12.0 dB).
   * Nullable. No evidence that the app always sets it.
   */
  preamp: number | null
  /**
   * should tracks which refer to this preset be updated when the preset is renamed or deleted?
   * Nullable. No evidence that the app always sets it.
   */
  updateTracks: boolean | null
}

/** the equalizer window */
export interface EQWindow {
  /**
   * Unique identifier for this window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
}

/** a track representing an audio file (MP3, AIFF, etc.) */
export interface FileTrack {
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

/** the miniplayer window */
export interface MiniplayerWindow {
  /**
   * Unique identifier for this window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
}

/** a list of tracks/streams */
export interface Playlist {
  /**
   * the id of the item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
  /**
   * the index of the item in internal application order.
   * Nullable. No evidence that the app always sets it.
   */
  readonly index: Integer | null
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
   * is this playlist disliked?
   * Nullable. No evidence that the app always sets it.
   */
  disliked: boolean | null
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
   * is this playlist favorited?
   * Nullable. No evidence that the app always sets it.
   */
  favorited: boolean | null
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
   * the selected tracks.
   * Nullable. No evidence that the app always sets it.
   */
  readonly selection: string | null
  /**
   * the playlist displayed in the window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly view: ObjectReferenceVariant<Playlist, string, 'Playlist'> | null
}

/** the radio tuner playlist */
export interface RadioTunerPlaylist {
  /**
   * Unique identifier for this playlist.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
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

/** a subscription playlist from Apple Music */
export interface SubscriptionPlaylist {
  /**
   * Unique identifier for this playlist.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
}

/** playable audio source */
export interface Track {
  /**
   * the id of the item.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
  /**
   * the index of the item in internal application order.
   * Nullable. No evidence that the app always sets it.
   */
  readonly index: Integer | null
  /**
   * the name of the item.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * the id of the item as a hexadecimal string. This id does not change over time.
   * Never null: the primary identifier.
   */
  readonly persistentID: string
  /**
   * the album name of the track.
   * Nullable. No evidence that the app always sets it.
   */
  album: string | null
  /**
   * the album artist of the track.
   * Nullable. No evidence that the app always sets it.
   */
  albumArtist: string | null
  /**
   * is the album for this track disliked?
   * Nullable. No evidence that the app always sets it.
   */
  albumDisliked: boolean | null
  /**
   * is the album for this track favorited?
   * Nullable. No evidence that the app always sets it.
   */
  albumFavorited: boolean | null
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
   * the artist/source of the track.
   * Nullable. No evidence that the app always sets it.
   */
  artist: string | null
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
   * the tempo of this track in beats per minute.
   * Nullable. No evidence that the app always sets it.
   */
  bpm: Integer | null
  /**
   * the category of the track.
   * Nullable. No evidence that the app always sets it.
   */
  category: string | null
  /**
   * the iCloud status of the track.
   * Nullable. No evidence that the app always sets it.
   */
  readonly cloudStatus: string | null
  /**
   * freeform notes about the track.
   * Nullable. No evidence that the app always sets it.
   */
  comment: string | null
  /**
   * is this track from a compilation album?
   * Nullable. No evidence that the app always sets it.
   */
  compilation: boolean | null
  /**
   * the composer of the track.
   * Nullable. No evidence that the app always sets it.
   */
  composer: string | null
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
   * is this track disliked?
   * Nullable. No evidence that the app always sets it.
   */
  disliked: boolean | null
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
   * the name of the EQ preset of the track.
   * Nullable. No evidence that the app always sets it.
   */
  eQ: string | null
  /**
   * the stop time of the track in seconds.
   * Nullable. No evidence that the app always sets it.
   */
  finish: number | null
  /**
   * is this track from a gapless album?
   * Nullable. No evidence that the app always sets it.
   */
  gapless: boolean | null
  /**
   * the music/audio genre (category) of the track.
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
   * is this track favorited?
   * Nullable. No evidence that the app always sets it.
   */
  favorited: boolean | null
  /**
   * the lyrics of the track.
   * Nullable. No evidence that the app always sets it.
   */
  lyrics: string | null
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
   * the movement name of the track.
   * Nullable. No evidence that the app always sets it.
   */
  movement: string | null
  /**
   * the total number of movements in the work.
   * Nullable. No evidence that the app always sets it.
   */
  movementCount: Integer | null
  /**
   * the index of the movement in the work.
   * Nullable. No evidence that the app always sets it.
   */
  movementNumber: Integer | null
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
   * is this track included when shuffling?
   * Nullable. No evidence that the app always sets it.
   */
  shufflable: boolean | null
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
  sortArtist: string | null
  /**
   * override string to use for the track when sorting by album artist.
   * Nullable. No evidence that the app always sets it.
   */
  sortAlbumArtist: string | null
  /**
   * override string to use for the track when sorting by name.
   * Nullable. No evidence that the app always sets it.
   */
  sortName: string | null
  /**
   * override string to use for the track when sorting by composer.
   * Nullable. No evidence that the app always sets it.
   */
  sortComposer: string | null
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
   * the work name of the track.
   * Nullable. No evidence that the app always sets it.
   */
  work: string | null
  /**
   * the year the track was recorded/released.
   * Nullable. No evidence that the app always sets it.
   */
  year: Integer | null
}

/** a track representing a network stream */
export interface URLTrack {
  /**
   * the URL for this track.
   * Nullable. No evidence that the app always sets it.
   */
  address: string | null
}

/** custom playlists created by the user */
export interface UserPlaylist {
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
  /**
   * is this a Genius Playlist?
   * Nullable. No evidence that the app always sets it.
   */
  readonly genius: boolean | null
}

/** the video window */
export interface VideoWindow {
  /**
   * Unique identifier for this window.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
}

/** a visual plug-in */
export interface Visual {
  /**
   * Unique identifier for this visual.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: Integer | null
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
  /**
   * is the device currently selected?
   * Cannot be reset: null is rejected.
   */
  selected?: boolean
  /**
   * the output volume for the device (0 = minimum, 100 = maximum).
   * Cannot be reset: null is rejected.
   */
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
  /**
   * the artist of the CD.
   * Cannot be reset: null is rejected.
   */
  artist?: string
  /**
   * is this CD a compilation album?
   * Cannot be reset: null is rejected.
   */
  compilation?: boolean
  /**
   * the composer of the CD.
   * Cannot be reset: null is rejected.
   */
  composer?: string
  /**
   * the total number of discs in this CD’s album.
   * Cannot be reset: null is rejected.
   */
  discCount?: Integer
  /**
   * the index of this CD disc in the source album.
   * Cannot be reset: null is rejected.
   */
  discNumber?: Integer
  /**
   * the genre of the CD.
   * Cannot be reset: null is rejected.
   */
  genre?: string
  /**
   * the year the album was recorded/released.
   * Cannot be reset: null is rejected.
   */
  year?: Integer
}

/** Input for creating an AudioCDTrack. */
export type AudioCDTrackCreateInput = Record<string, never>

/** Input for updating an AudioCDTrack. Omitted fields are left unchanged. */
export type AudioCDTrackUpdateInput = Record<string, never>

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
  /**
   * the equalizer 32 Hz band level (-12.0 dB to +12.0 dB).
   * Cannot be reset: null is rejected.
   */
  band1?: number
  /**
   * the equalizer 64 Hz band level (-12.0 dB to +12.0 dB).
   * Cannot be reset: null is rejected.
   */
  band2?: number
  /**
   * the equalizer 125 Hz band level (-12.0 dB to +12.0 dB).
   * Cannot be reset: null is rejected.
   */
  band3?: number
  /**
   * the equalizer 250 Hz band level (-12.0 dB to +12.0 dB).
   * Cannot be reset: null is rejected.
   */
  band4?: number
  /**
   * the equalizer 500 Hz band level (-12.0 dB to +12.0 dB).
   * Cannot be reset: null is rejected.
   */
  band5?: number
  /**
   * the equalizer 1 kHz band level (-12.0 dB to +12.0 dB).
   * Cannot be reset: null is rejected.
   */
  band6?: number
  /**
   * the equalizer 2 kHz band level (-12.0 dB to +12.0 dB).
   * Cannot be reset: null is rejected.
   */
  band7?: number
  /**
   * the equalizer 4 kHz band level (-12.0 dB to +12.0 dB).
   * Cannot be reset: null is rejected.
   */
  band8?: number
  /**
   * the equalizer 8 kHz band level (-12.0 dB to +12.0 dB).
   * Cannot be reset: null is rejected.
   */
  band9?: number
  /**
   * the equalizer 16 kHz band level (-12.0 dB to +12.0 dB).
   * Cannot be reset: null is rejected.
   */
  band10?: number
  /**
   * the equalizer preamp level (-12.0 dB to +12.0 dB).
   * Cannot be reset: null is rejected.
   */
  preamp?: number
  /**
   * should tracks which refer to this preset be updated when the preset is renamed or deleted?
   * Cannot be reset: null is rejected.
   */
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
  /**
   * the description of the playlist.
   * Cannot be reset: null is rejected.
   */
  description?: string
  /**
   * is this playlist disliked?
   * Cannot be reset: null is rejected.
   */
  disliked?: boolean
  /**
   * the name of the playlist.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * is this playlist favorited?
   * Cannot be reset: null is rejected.
   */
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
  /** the name of the item */
  name?: string
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
  /**
   * the name of the item.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * the album name of the track.
   * Cannot be reset: null is rejected.
   */
  album?: string
  /**
   * the album artist of the track.
   * Cannot be reset: null is rejected.
   */
  albumArtist?: string
  /**
   * is the album for this track disliked?
   * Cannot be reset: null is rejected.
   */
  albumDisliked?: boolean
  /**
   * is the album for this track favorited?
   * Cannot be reset: null is rejected.
   */
  albumFavorited?: boolean
  /**
   * the rating of the album for this track (0 to 100).
   * Cannot be reset: null is rejected.
   */
  albumRating?: Integer
  /**
   * the artist/source of the track.
   * Cannot be reset: null is rejected.
   */
  artist?: string
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
   * the tempo of this track in beats per minute.
   * Cannot be reset: null is rejected.
   */
  bpm?: Integer
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
   * is this track from a compilation album?
   * Cannot be reset: null is rejected.
   */
  compilation?: boolean
  /**
   * the composer of the track.
   * Cannot be reset: null is rejected.
   */
  composer?: string
  /**
   * the description of the track.
   * Cannot be reset: null is rejected.
   */
  description?: string
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
   * is this track disliked?
   * Cannot be reset: null is rejected.
   */
  disliked?: boolean
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
   * the name of the EQ preset of the track.
   * Cannot be reset: null is rejected.
   */
  eQ?: string
  /**
   * the stop time of the track in seconds.
   * Cannot be reset: null is rejected.
   */
  finish?: number
  /**
   * is this track from a gapless album?
   * Cannot be reset: null is rejected.
   */
  gapless?: boolean
  /**
   * the music/audio genre (category) of the track.
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
   * is this track favorited?
   * Cannot be reset: null is rejected.
   */
  favorited?: boolean
  /**
   * the lyrics of the track.
   * Cannot be reset: null is rejected.
   */
  lyrics?: string
  /**
   * the media kind of the track.
   * Cannot be reset: null is rejected.
   */
  mediaKind?: string
  /**
   * the movement name of the track.
   * Cannot be reset: null is rejected.
   */
  movement?: string
  /**
   * the total number of movements in the work.
   * Cannot be reset: null is rejected.
   */
  movementCount?: Integer
  /**
   * the index of the movement in the work.
   * Cannot be reset: null is rejected.
   */
  movementNumber?: Integer
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
   * is this track included when shuffling?
   * Cannot be reset: null is rejected.
   */
  shufflable?: boolean
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
  sortArtist?: string
  /**
   * override string to use for the track when sorting by album artist.
   * Cannot be reset: null is rejected.
   */
  sortAlbumArtist?: string
  /**
   * override string to use for the track when sorting by name.
   * Cannot be reset: null is rejected.
   */
  sortName?: string
  /**
   * override string to use for the track when sorting by composer.
   * Cannot be reset: null is rejected.
   */
  sortComposer?: string
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
   * the work name of the track.
   * Cannot be reset: null is rejected.
   */
  work?: string
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
  /**
   * List playlists, one page at a time.
   *
   * @param page - The page size, and the cursor that continues from the previous page.
   * @returns One page of results. When `nextCursor` is present, more remain: call again with the
   * same arguments and that cursor.
   */
  list(page?: PageRequest, options?: CallOptions): Promise<Page<Playlist>>
  /**
   * Read the playlist identified by `persistentID`.
   *
   * @param persistentID - Persistent ID of the playlist. Does not accept null.
   */
  get(persistentID: string, options?: CallOptions): Promise<Playlist>
  /**
   * Move playlist(s) to a new location
   *
   * @param to - the new location for the playlist(s). Does not accept null.
   */
  move(to: string, options?: CallOptions): Promise<void>
  /**
   * search a playlist for tracks matching the search string. Identical to entering search text in
   * the Search field.
   *
   * @param _for - the search text. Does not accept null.
   * @param only - area to search (default is all). Does not accept null.
   */
  search(_for: string, only?: string, options?: CallOptions): Promise<void>
}

/** playable audio source */
export interface TrackResourceClient {
  /**
   * List tracks, as one page holding all of them.
   *
   * @param playlistId - Persistent ID of the playlist. Does not accept null.
   */
  list(playlistId: string, options?: CallOptions): Promise<Page<Track>>
  /**
   * Read the track identified by `persistentID` within `playlistId`.
   *
   * @param playlistId - Persistent ID of the playlist. Does not accept null.
   * @param persistentID - Persistent ID of the track. Does not accept null.
   */
  get(playlistId: string, persistentID: string, options?: CallOptions): Promise<Track>
}

/**
 * The Music client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link musicContract}.
 */
export interface MusicClient {
  /** a track representing an audio file (MP3, AIFF, etc.) */
  readonly fileTracks: FileTrackResourceClient
  /** a list of tracks/streams */
  readonly playlists: PlaylistResourceClient
  /** playable audio source */
  readonly tracks: TrackResourceClient
  /**
   * Print the specified object(s)
   *
   * @param printDialog - Should the application show the print dialog. Does not accept null.
   * @param withProperties - the print settings. Does not accept null.
   * @param kind - the kind of printout desired. Does not accept null.
   * @param theme - name of theme to use for formatting the printout. Does not accept null.
   */
  print(
    printDialog?: boolean,
    withProperties?: string,
    kind?: string,
    theme?: string,
    options?: CallOptions
  ): Promise<void>
  /** Close an object */
  close(options?: CallOptions): Promise<void>
  /**
   * Return the number of elements of a particular class within an object
   *
   * @param each - the class of the elements to be counted. Keyword 'each' is optional in
   * AppleScript. Does not accept null.
   */
  count(each: string, options?: CallOptions): Promise<void>
  /** Delete an element from an object */
  _delete(options?: CallOptions): Promise<void>
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
  /**
   * export a source or playlist
   *
   * @param as - the format to export for a playlist. Does not accept null.
   * @param to - the destination of the export. Does not accept null.
   */
  _export(as?: string, to?: FileSource, options?: CallOptions): Promise<void>
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
  /** Opens an iTunes Store or audio stream URL */
  openLocation(options?: CallOptions): Promise<void>
}

const airPlayDeviceRecordType: ValueType<AirPlayDevice> = t.record(
  {
    active: t.nullable(t.boolean(), { description: 'is the device currently being played to?' }),
    available: t.nullable(t.boolean(), { description: 'is the device currently available?' }),
    kind: t.nullable(t.string(), { description: 'the kind of the device' }),
    networkAddress: t.nullable(t.string(), {
      description: 'the network (MAC) address of the device',
    }),
    protected: t.nullable(t.boolean(), {
      description: 'is the device password- or passcode-protected?',
    }),
    selected: t.nullable(t.boolean(), { description: 'is the device currently selected?' }),
    supportsAudio: t.nullable(t.boolean(), {
      description: 'does the device support audio playback?',
    }),
    supportsVideo: t.nullable(t.boolean(), {
      description: 'does the device support video playback?',
    }),
    soundVolume: t.nullable(t.integer(), {
      description: 'the output volume for the device (0 = minimum, 100 = maximum)',
    }),
  },
  { description: 'an AirPlay device' }
)

const artworkRecordType: ValueType<Artwork> = t.record(
  {
    data: t.nullable(t.string(), {
      description: 'data for this artwork, in the form of a picture',
    }),
    description: t.nullable(t.string(), { description: 'description of artwork as a string' }),
    downloaded: t.nullable(t.boolean(), { description: 'was this artwork downloaded by Music?' }),
    format: t.nullable(t.string(), { description: 'the data format for this piece of artwork' }),
    kind: t.nullable(t.integer(), { description: 'kind or purpose of this piece of artwork' }),
    rawData: t.unknown({ description: 'data for this artwork, in original format' }),
  },
  { description: 'a piece of art within a track or playlist' }
)

const audioCDPlaylistRecordType: ValueType<AudioCDPlaylist> = t.record(
  {
    artist: t.nullable(t.string(), { description: 'the artist of the CD' }),
    compilation: t.nullable(t.boolean(), { description: 'is this CD a compilation album?' }),
    composer: t.nullable(t.string(), { description: 'the composer of the CD' }),
    discCount: t.nullable(t.integer(), {
      description: 'the total number of discs in this CD’s album',
    }),
    discNumber: t.nullable(t.integer(), {
      description: 'the index of this CD disc in the source album',
    }),
    genre: t.nullable(t.string(), { description: 'the genre of the CD' }),
    year: t.nullable(t.integer(), { description: 'the year the album was recorded/released' }),
  },
  { description: 'a playlist representing an audio CD' }
)

const audioCDTrackRecordType: ValueType<AudioCDTrack> = t.record(
  {
    location: t.nullable(t.file(), {
      description: 'the location of the file represented by this track',
    }),
  },
  { description: 'a track on an audio CD' }
)

const browserWindowRecordType: ValueType<BrowserWindow> = t.record(
  {
    selection: t.nullable(t.string(), { description: 'the selected tracks' }),
    view: t.nullable(
      t.reference<Playlist, string, 'Playlist'>(() => musicContract, 'Playlist', 'one'),
      { description: 'the playlist currently displayed in the window' }
    ),
  },
  { description: 'the main window' }
)

const encoderRecordType: ValueType<Encoder> = t.record(
  {
    format: t.nullable(t.string(), { description: 'the data format created by the encoder' }),
  },
  { description: 'converts a track to a specific file format' }
)

const eqPresetRecordType: ValueType<EQPreset> = t.record(
  {
    band1: t.nullable(t.double(), {
      description: 'the equalizer 32 Hz band level (-12.0 dB to +12.0 dB)',
    }),
    band2: t.nullable(t.double(), {
      description: 'the equalizer 64 Hz band level (-12.0 dB to +12.0 dB)',
    }),
    band3: t.nullable(t.double(), {
      description: 'the equalizer 125 Hz band level (-12.0 dB to +12.0 dB)',
    }),
    band4: t.nullable(t.double(), {
      description: 'the equalizer 250 Hz band level (-12.0 dB to +12.0 dB)',
    }),
    band5: t.nullable(t.double(), {
      description: 'the equalizer 500 Hz band level (-12.0 dB to +12.0 dB)',
    }),
    band6: t.nullable(t.double(), {
      description: 'the equalizer 1 kHz band level (-12.0 dB to +12.0 dB)',
    }),
    band7: t.nullable(t.double(), {
      description: 'the equalizer 2 kHz band level (-12.0 dB to +12.0 dB)',
    }),
    band8: t.nullable(t.double(), {
      description: 'the equalizer 4 kHz band level (-12.0 dB to +12.0 dB)',
    }),
    band9: t.nullable(t.double(), {
      description: 'the equalizer 8 kHz band level (-12.0 dB to +12.0 dB)',
    }),
    band10: t.nullable(t.double(), {
      description: 'the equalizer 16 kHz band level (-12.0 dB to +12.0 dB)',
    }),
    modifiable: t.nullable(t.boolean(), { description: 'can this preset be modified?' }),
    preamp: t.nullable(t.double(), {
      description: 'the equalizer preamp level (-12.0 dB to +12.0 dB)',
    }),
    updateTracks: t.nullable(t.boolean(), {
      description:
        'should tracks which refer to this preset be updated when the preset is renamed or deleted?',
    }),
  },
  { description: 'equalizer preset configuration' }
)

const eqWindowRecordType: ValueType<EQWindow> = t.record(
  {
    id: t.nullable(t.integer(), { description: 'Unique identifier for this window' }),
  },
  { description: 'the equalizer window' }
)

const fileTrackRecordType: ValueType<FileTrack> = t.record(
  {
    location: t.nullable(t.file(), {
      description: 'the location of the file represented by this track',
    }),
  },
  { description: 'a track representing an audio file (MP3, AIFF, etc.)' }
)

const libraryPlaylistRecordType: ValueType<LibraryPlaylist> = t.record(
  {
    id: t.nullable(t.integer(), { description: 'Unique identifier for this playlist' }),
  },
  { description: 'the main library playlist' }
)

const miniplayerWindowRecordType: ValueType<MiniplayerWindow> = t.record(
  {
    id: t.nullable(t.integer(), { description: 'Unique identifier for this window' }),
  },
  { description: 'the miniplayer window' }
)

const playlistRecordType: ValueType<Playlist> = t.record(
  {
    id: t.nullable(t.integer(), { description: 'the id of the item' }),
    index: t.nullable(t.integer(), {
      description: 'the index of the item in internal application order',
    }),
    persistentID: t.string({
      description: 'the id of the item as a hexadecimal string. This id does not change over time.',
    }),
    description: t.nullable(t.string(), { description: 'the description of the playlist' }),
    disliked: t.nullable(t.boolean(), { description: 'is this playlist disliked?' }),
    duration: t.nullable(t.integer(), {
      description: 'the total length of all tracks (in seconds)',
    }),
    name: t.nullable(t.string(), { description: 'the name of the playlist' }),
    favorited: t.nullable(t.boolean(), { description: 'is this playlist favorited?' }),
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
    selection: t.nullable(t.string(), { description: 'the selected tracks' }),
    view: t.nullable(
      t.reference<Playlist, string, 'Playlist'>(() => musicContract, 'Playlist', 'one'),
      { description: 'the playlist displayed in the window' }
    ),
  },
  { description: 'a sub-window showing a single playlist' }
)

const radioTunerPlaylistRecordType: ValueType<RadioTunerPlaylist> = t.record(
  {
    id: t.nullable(t.integer(), { description: 'Unique identifier for this playlist' }),
  },
  { description: 'the radio tuner playlist' }
)

const sharedTrackRecordType: ValueType<SharedTrack> = t.record(
  {
    id: t.nullable(t.integer(), { description: 'Unique identifier for this track' }),
  },
  { description: 'a track residing in a shared library' }
)

const sourceRecordType: ValueType<Source> = t.record(
  {
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

const subscriptionPlaylistRecordType: ValueType<SubscriptionPlaylist> = t.record(
  {
    id: t.nullable(t.integer(), { description: 'Unique identifier for this playlist' }),
  },
  { description: 'a subscription playlist from Apple Music' }
)

const trackRecordType: ValueType<Track> = t.record(
  {
    id: t.nullable(t.integer(), { description: 'the id of the item' }),
    index: t.nullable(t.integer(), {
      description: 'the index of the item in internal application order',
    }),
    name: t.nullable(t.string(), { description: 'the name of the item' }),
    persistentID: t.string({
      description: 'the id of the item as a hexadecimal string. This id does not change over time.',
    }),
    album: t.nullable(t.string(), { description: 'the album name of the track' }),
    albumArtist: t.nullable(t.string(), { description: 'the album artist of the track' }),
    albumDisliked: t.nullable(t.boolean(), {
      description: 'is the album for this track disliked?',
    }),
    albumFavorited: t.nullable(t.boolean(), {
      description: 'is the album for this track favorited?',
    }),
    albumRating: t.nullable(t.integer(), {
      description: 'the rating of the album for this track (0 to 100)',
    }),
    albumRatingKind: t.nullable(t.string(), {
      description: 'the rating kind of the album rating for this track',
    }),
    artist: t.nullable(t.string(), { description: 'the artist/source of the track' }),
    bitRate: t.nullable(t.integer(), { description: 'the bit rate of the track (in kbps)' }),
    bookmark: t.nullable(t.double(), { description: 'the bookmark time of the track in seconds' }),
    bookmarkable: t.nullable(t.boolean(), {
      description: 'is the playback position for this track remembered?',
    }),
    bpm: t.nullable(t.integer(), { description: 'the tempo of this track in beats per minute' }),
    category: t.nullable(t.string(), { description: 'the category of the track' }),
    cloudStatus: t.nullable(t.string(), { description: 'the iCloud status of the track' }),
    comment: t.nullable(t.string(), { description: 'freeform notes about the track' }),
    compilation: t.nullable(t.boolean(), {
      description: 'is this track from a compilation album?',
    }),
    composer: t.nullable(t.string(), { description: 'the composer of the track' }),
    databaseID: t.nullable(t.integer(), {
      description:
        'the common, unique ID for this track. If two tracks in different playlists have the same database ID, they are sharing the same data.',
    }),
    dateAdded: t.nullable(t.date(), {
      description: 'the date the track was added to the playlist',
    }),
    description: t.nullable(t.string(), { description: 'the description of the track' }),
    discCount: t.nullable(t.integer(), {
      description: 'the total number of discs in the source album',
    }),
    discNumber: t.nullable(t.integer(), {
      description: 'the index of the disc containing this track on the source album',
    }),
    disliked: t.nullable(t.boolean(), { description: 'is this track disliked?' }),
    downloaderAccount: t.nullable(t.string(), {
      description: 'the account of the person who downloaded this track',
    }),
    downloaderName: t.nullable(t.string(), {
      description: 'the name of the person who downloaded this track',
    }),
    duration: t.nullable(t.double(), { description: 'the length of the track in seconds' }),
    enabled: t.nullable(t.boolean(), { description: 'is this track checked for playback?' }),
    episodeID: t.nullable(t.string(), { description: 'the episode ID of the track' }),
    episodeNumber: t.nullable(t.integer(), { description: 'the episode number of the track' }),
    eQ: t.nullable(t.string(), { description: 'the name of the EQ preset of the track' }),
    finish: t.nullable(t.double(), { description: 'the stop time of the track in seconds' }),
    gapless: t.nullable(t.boolean(), { description: 'is this track from a gapless album?' }),
    genre: t.nullable(t.string(), { description: 'the music/audio genre (category) of the track' }),
    grouping: t.nullable(t.string(), {
      description:
        'the grouping (piece) of the track. Generally used to denote movements within a classical work.',
    }),
    kind: t.nullable(t.string(), { description: 'a text description of the track' }),
    longDescription: t.nullable(t.string(), { description: 'the long description of the track' }),
    favorited: t.nullable(t.boolean(), { description: 'is this track favorited?' }),
    lyrics: t.nullable(t.string(), { description: 'the lyrics of the track' }),
    mediaKind: t.nullable(t.string(), { description: 'the media kind of the track' }),
    modificationDate: t.nullable(t.date(), {
      description: 'the modification date of the content of this track',
    }),
    movement: t.nullable(t.string(), { description: 'the movement name of the track' }),
    movementCount: t.nullable(t.integer(), {
      description: 'the total number of movements in the work',
    }),
    movementNumber: t.nullable(t.integer(), {
      description: 'the index of the movement in the work',
    }),
    playedCount: t.nullable(t.integer(), {
      description: 'number of times this track has been played',
    }),
    playedDate: t.nullable(t.date(), {
      description: 'the date and time this track was last played',
    }),
    purchaserAccount: t.nullable(t.string(), {
      description: 'the account of the person who purchased this track',
    }),
    purchaserName: t.nullable(t.string(), {
      description: 'the name of the person who purchased this track',
    }),
    rating: t.nullable(t.integer(), { description: 'the rating of this track (0 to 100)' }),
    ratingKind: t.nullable(t.string(), { description: 'the rating kind of this track' }),
    releaseDate: t.nullable(t.date(), { description: 'the release date of this track' }),
    sampleRate: t.nullable(t.integer(), { description: 'the sample rate of the track (in Hz)' }),
    seasonNumber: t.nullable(t.integer(), { description: 'the season number of the track' }),
    shufflable: t.nullable(t.boolean(), { description: 'is this track included when shuffling?' }),
    skippedCount: t.nullable(t.integer(), {
      description: 'number of times this track has been skipped',
    }),
    skippedDate: t.nullable(t.date(), {
      description: 'the date and time this track was last skipped',
    }),
    show: t.nullable(t.string(), { description: 'the show name of the track' }),
    sortAlbum: t.nullable(t.string(), {
      description: 'override string to use for the track when sorting by album',
    }),
    sortArtist: t.nullable(t.string(), {
      description: 'override string to use for the track when sorting by artist',
    }),
    sortAlbumArtist: t.nullable(t.string(), {
      description: 'override string to use for the track when sorting by album artist',
    }),
    sortName: t.nullable(t.string(), {
      description: 'override string to use for the track when sorting by name',
    }),
    sortComposer: t.nullable(t.string(), {
      description: 'override string to use for the track when sorting by composer',
    }),
    sortShow: t.nullable(t.string(), {
      description: 'override string to use for the track when sorting by show name',
    }),
    size: t.nullable(t.double(), { description: 'the size of the track (in bytes)' }),
    start: t.nullable(t.double(), { description: 'the start time of the track in seconds' }),
    time: t.nullable(t.string(), { description: 'the length of the track in MM:SS format' }),
    trackCount: t.nullable(t.integer(), {
      description: 'the total number of tracks on the source album',
    }),
    trackNumber: t.nullable(t.integer(), {
      description: 'the index of the track on the source album',
    }),
    unplayed: t.nullable(t.boolean(), { description: 'is this track unplayed?' }),
    volumeAdjustment: t.nullable(t.integer(), {
      description: 'relative volume adjustment of the track (-100% to 100%)',
    }),
    work: t.nullable(t.string(), { description: 'the work name of the track' }),
    year: t.nullable(t.integer(), { description: 'the year the track was recorded/released' }),
  },
  { description: 'playable audio source' }
)

const urlTrackRecordType: ValueType<URLTrack> = t.record(
  {
    address: t.nullable(t.string(), { description: 'the URL for this track' }),
  },
  { description: 'a track representing a network stream' }
)

const userPlaylistRecordType: ValueType<UserPlaylist> = t.record(
  {
    shared: t.nullable(t.boolean(), { description: 'is this playlist shared?' }),
    smart: t.nullable(t.boolean(), { description: 'is this a Smart Playlist?' }),
    genius: t.nullable(t.boolean(), { description: 'is this a Genius Playlist?' }),
  },
  { description: 'custom playlists created by the user' }
)

const videoWindowRecordType: ValueType<VideoWindow> = t.record(
  {
    id: t.nullable(t.integer(), { description: 'Unique identifier for this window' }),
  },
  { description: 'the video window' }
)

const visualRecordType: ValueType<Visual> = t.record(
  {
    id: t.nullable(t.integer(), { description: 'Unique identifier for this visual' }),
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
    id: t.string({
      description: 'the id of the item as a hexadecimal string. This id does not change over time.',
    }),
    get: 'music.playlists.get',
    list: 'music.playlists.list',
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
    id: t.string({
      description: 'the id of the item as a hexadecimal string. This id does not change over time.',
    }),
    get: 'music.tracks.get',
    list: 'music.tracks.list',
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

const playlistListPlaylistsOperation: OperationDescriptor<PageRequest, Page<Playlist>> = {
  id: 'music.playlists.list',
  permission: 'music:playlists:list',
  target: { command: 'listPlaylists', resource: 'Playlist' },
  description: 'List every playlist',
  input: t.record({
    ...t.pageInputs(),
  }),
  output: t.page(playlistRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      pageSize: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(100|[1-9][0-9]?)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'The most items to return, from 1 to 100. Defaults to 25.',
      },
      cursor: {
        type: 'string',
        description:
          'The nextCursor of the previous page, sent with the same other inputs, to read the next page. Omit it to read the first page.',
      },
    },
    additionalProperties: false,
  },
}

const playlistGetPlaylistOperation: OperationDescriptor<
  { readonly persistentID: string },
  Playlist
> = {
  id: 'music.playlists.get',
  permission: 'music:playlists:get',
  target: { command: 'getPlaylist', resource: 'Playlist' },
  description: 'Get a playlist by its persistent ID',
  input: t.record({
    persistentID: t.string({ description: 'Persistent ID of the playlist' }),
  }),
  output: playlistRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { persistentID: { type: 'string', description: 'Persistent ID of the playlist' } },
    required: ['persistentID'],
    additionalProperties: false,
  },
}

const trackListTracksOperation: OperationDescriptor<
  { readonly playlistId: string },
  Page<Track>
> = {
  id: 'music.tracks.list',
  permission: 'music:tracks:list',
  target: { command: 'listTracks', resource: 'Track' },
  description:
    'List the tracks of a playlist; the library playlist holds every track in the library',
  input: t.record({
    playlistId: t.string({ description: 'Persistent ID of the playlist' }),
  }),
  output: t.page(trackRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { playlistId: { type: 'string', description: 'Persistent ID of the playlist' } },
    required: ['playlistId'],
    additionalProperties: false,
  },
}

const trackGetTrackOperation: OperationDescriptor<
  { readonly playlistId: string; readonly persistentID: string },
  Track
> = {
  id: 'music.tracks.get',
  permission: 'music:tracks:get',
  target: { command: 'getTrack', resource: 'Track' },
  description: 'Get a track of a playlist by its persistent ID',
  input: t.record({
    playlistId: t.string({ description: 'Persistent ID of the playlist' }),
    persistentID: t.string({ description: 'Persistent ID of the track' }),
  }),
  output: trackRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      playlistId: { type: 'string', description: 'Persistent ID of the playlist' },
      persistentID: { type: 'string', description: 'Persistent ID of the track' },
    },
    required: ['playlistId', 'persistentID'],
    additionalProperties: false,
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      printDialog: { type: 'boolean', description: 'Should the application show the print dialog' },
      withProperties: { type: 'string', description: 'the print settings' },
      kind: { type: 'string', description: 'the kind of printout desired' },
      theme: { type: 'string', description: 'name of theme to use for formatting the printout' },
    },
    additionalProperties: false,
  },
}

const appCloseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.close',
  permission: 'music:app:close',
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

const appDeleteOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.delete',
  permission: 'music:app:delete',
  target: { command: 'delete' },
  description: 'Delete an element from an object',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
    inputJsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: { to: { type: 'string', description: 'the new location for the object(s)' } },
      additionalProperties: false,
    },
  }

const appExistsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.exists',
  permission: 'music:app:exists',
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

const playlistMoveOperation: OperationDescriptor<{ readonly to: string }, undefined> = {
  id: 'music.playlists.move',
  permission: 'music:playlists:move',
  target: { command: 'move', resource: 'Playlist' },
  description: 'Move playlist(s) to a new location',
  input: t.record({
    to: t.string({ description: 'the new location for the playlist(s)' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { to: { type: 'string', description: 'the new location for the playlist(s)' } },
    required: ['to'],
    additionalProperties: false,
  },
}

const appOpenOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.open',
  permission: 'music:app:open',
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
  id: 'music.app.run',
  permission: 'music:app:run',
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
  id: 'music.app.quit',
  permission: 'music:app:quit',
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
  id: 'music.app.save',
  permission: 'music:app:save',
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
  id: 'music.app.add',
  permission: 'music:app:add',
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
  id: 'music.app.backTrack',
  permission: 'music:app:backTrack',
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
  id: 'music.app.convert',
  permission: 'music:app:convert',
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
  id: 'music.app.download',
  permission: 'music:app:download',
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      as: { type: 'string', description: 'the format to export for a playlist' },
      to: {
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
        description: 'the destination of the export',
      },
    },
    additionalProperties: false,
  },
}

const appFastForwardOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.fastForward',
  permission: 'music:app:fastForward',
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
  id: 'music.app.nextTrack',
  permission: 'music:app:nextTrack',
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
  id: 'music.app.pause',
  permission: 'music:app:pause',
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
  id: 'music.app.play',
  permission: 'music:app:play',
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
  id: 'music.app.playpause',
  permission: 'music:app:playpause',
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
  id: 'music.app.previousTrack',
  permission: 'music:app:previousTrack',
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
  id: 'music.fileTracks.refresh',
  permission: 'music:fileTracks:refresh',
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
  id: 'music.app.resume',
  permission: 'music:app:resume',
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
  id: 'music.app.reveal',
  permission: 'music:app:reveal',
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
  id: 'music.app.rewind',
  permission: 'music:app:rewind',
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
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      for: { type: 'string', description: 'the search text' },
      only: { type: 'string', description: 'area to search (default is all)' },
    },
    required: ['for'],
    additionalProperties: false,
  },
}

const appSelectOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'music.app.select',
  permission: 'music:app:select',
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
  id: 'music.app.stop',
  permission: 'music:app:stop',
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
  id: 'music.app.openLocation',
  permission: 'music:app:openLocation',
  target: { command: 'openLocation' },
  description: 'Opens an iTunes Store or audio stream URL',
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
const operations: AppContract<MusicClient>['operations'] = {
  'music.playlists.list': playlistListPlaylistsOperation,
  'music.playlists.get': playlistGetPlaylistOperation,
  'music.tracks.list': trackListTracksOperation,
  'music.tracks.get': trackGetTrackOperation,
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
  'music.fileTracks.refresh': fileTrackRefreshOperation,
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
    fileTracks: {
      refresh: (options) => runtime.invoke(fileTrackRefreshOperation, {}, options),
    },
    playlists: {
      list: (page, options) => runtime.invoke(playlistListPlaylistsOperation, { ...page }, options),
      get: (persistentID, options) =>
        runtime.invoke(playlistGetPlaylistOperation, { persistentID }, options),
      move: (to, options) => runtime.invoke(playlistMoveOperation, { to }, options),
      search: (_for, only, options) =>
        runtime.invoke(playlistSearchOperation, { for: _for, only }, options),
    },
    tracks: {
      list: (playlistId, options) =>
        runtime.invoke(trackListTracksOperation, { playlistId }, options),
      get: (playlistId, persistentID, options) =>
        runtime.invoke(trackGetTrackOperation, { playlistId, persistentID }, options),
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
