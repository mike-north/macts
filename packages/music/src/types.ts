/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

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
  active: boolean
  /** is the device currently available? */
  available: boolean
  /** the kind of the device */
  kind: string
  /** the network (MAC) address of the device */
  networkAddress: string
  /** is the device password- or passcode-protected? */
  protected: boolean
  /** is the device currently selected? */
  selected: boolean
  /** does the device support audio playback? */
  supportsAudio: boolean
  /** does the device support video playback? */
  supportsVideo: boolean
  /** the output volume for the device (0 = minimum, 100 = maximum) */
  soundVolume: number
}

/** Input for creating a AirPlayDevice */
export interface AirPlayDeviceCreateInput {
  /** is the device currently selected? */
  selected?: boolean
  /** the output volume for the device (0 = minimum, 100 = maximum) */
  soundVolume?: number
}

/** Input for updating a AirPlayDevice */
export type AirPlayDeviceUpdateInput = Partial<AirPlayDeviceCreateInput>

/** a piece of art within a track or playlist */
export interface Artwork {
  /** data for this artwork, in the form of a picture */
  data: string
  /** description of artwork as a string */
  description: string
  /** was this artwork downloaded by Music? */
  downloaded: boolean
  /** the data format for this piece of artwork */
  format: string
  /** kind or purpose of this piece of artwork */
  kind: number
  /** data for this artwork, in original format */
  rawData: unknown
}

/** Input for creating a Artwork */
export interface ArtworkCreateInput {
  /** data for this artwork, in the form of a picture */
  data?: string
  /** description of artwork as a string */
  description?: string
  /** kind or purpose of this piece of artwork */
  kind?: number
  /** data for this artwork, in original format */
  rawData?: unknown
}

/** Input for updating a Artwork */
export type ArtworkUpdateInput = Partial<ArtworkCreateInput>

/** a playlist representing an audio CD */
export interface AudioCDPlaylist {
  /** the artist of the CD */
  artist: string
  /** is this CD a compilation album? */
  compilation: boolean
  /** the composer of the CD */
  composer: string
  /** the total number of discs in this CD’s album */
  discCount: number
  /** the index of this CD disc in the source album */
  discNumber: number
  /** the genre of the CD */
  genre: string
  /** the year the album was recorded/released */
  year: number
}

/** Input for creating a AudioCDPlaylist */
export interface AudioCDPlaylistCreateInput {
  /** the artist of the CD */
  artist?: string
  /** is this CD a compilation album? */
  compilation?: boolean
  /** the composer of the CD */
  composer?: string
  /** the total number of discs in this CD’s album */
  discCount?: number
  /** the index of this CD disc in the source album */
  discNumber?: number
  /** the genre of the CD */
  genre?: string
  /** the year the album was recorded/released */
  year?: number
}

/** Input for updating a AudioCDPlaylist */
export type AudioCDPlaylistUpdateInput = Partial<AudioCDPlaylistCreateInput>

/** a track on an audio CD */
export interface AudioCDTrack {
  /** the location of the file represented by this track */
  location: string
}

/** Input for creating a AudioCDTrack */
export type AudioCDTrackCreateInput = Record<string, never>

/** Input for updating a AudioCDTrack */
export type AudioCDTrackUpdateInput = Partial<AudioCDTrackCreateInput>

/** the main window */
export interface BrowserWindow {
  /** the selected tracks */
  selection: string
  /** the playlist currently displayed in the window */
  view: Playlist
}

/** Input for creating a BrowserWindow */
export interface BrowserWindowCreateInput {
  /** the playlist currently displayed in the window */
  view?: Playlist
}

/** Input for updating a BrowserWindow */
export type BrowserWindowUpdateInput = Partial<BrowserWindowCreateInput>

/** converts a track to a specific file format */
export interface Encoder {
  /** the data format created by the encoder */
  format: string
}

/** Input for creating a Encoder */
export type EncoderCreateInput = Record<string, never>

/** Input for updating a Encoder */
export type EncoderUpdateInput = Partial<EncoderCreateInput>

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
  modifiable: boolean
  /** the equalizer preamp level (-12.0 dB to +12.0 dB) */
  preamp: number
  /** should tracks which refer to this preset be updated when the preset is renamed or deleted? */
  updateTracks: boolean
}

/** Input for creating a EQPreset */
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

/** Input for updating a EQPreset */
export type EQPresetUpdateInput = Partial<EQPresetCreateInput>

/** the equalizer window */
export interface EQWindow {
  /** Unique identifier for this window */
  id: number
}

/** Input for creating a EQWindow */
export type EQWindowCreateInput = Record<string, never>

/** Input for updating a EQWindow */
export type EQWindowUpdateInput = Partial<EQWindowCreateInput>

/** a track representing an audio file (MP3, AIFF, etc.) */
export interface FileTrack {
  /** the location of the file represented by this track */
  location: string
}

/** Input for creating a FileTrack */
export interface FileTrackCreateInput {
  /** the location of the file represented by this track */
  location?: string
}

/** Input for updating a FileTrack */
export type FileTrackUpdateInput = Partial<FileTrackCreateInput>

/** the main library playlist */
export interface LibraryPlaylist {
  /** Unique identifier for this playlist */
  id: number
}

/** Input for creating a LibraryPlaylist */
export type LibraryPlaylistCreateInput = Record<string, never>

/** Input for updating a LibraryPlaylist */
export type LibraryPlaylistUpdateInput = Partial<LibraryPlaylistCreateInput>

/** the miniplayer window */
export interface MiniplayerWindow {
  /** Unique identifier for this window */
  id: number
}

/** Input for creating a MiniplayerWindow */
export type MiniplayerWindowCreateInput = Record<string, never>

/** Input for updating a MiniplayerWindow */
export type MiniplayerWindowUpdateInput = Partial<MiniplayerWindowCreateInput>

/** a list of tracks/streams */
export interface Playlist {
  /** the description of the playlist */
  description: string
  /** is this playlist disliked? */
  disliked: boolean
  /** the total length of all tracks (in seconds) */
  duration: number
  /** the name of the playlist */
  name: string
  /** is this playlist favorited? */
  favorited: boolean
  /** folder which contains this playlist (if any) */
  parent: Playlist
  /** the total size of all tracks (in bytes) */
  size: number
  /** special playlist kind */
  specialKind: string
  /** the length of all tracks in MM:SS format */
  time: string
  /** is this playlist visible in the Source list? */
  visible: boolean
}

/** Input for creating a Playlist */
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

/** Input for updating a Playlist */
export type PlaylistUpdateInput = Partial<PlaylistCreateInput>

/** a sub-window showing a single playlist */
export interface PlaylistWindow {
  /** the selected tracks */
  selection: string
  /** the playlist displayed in the window */
  view: Playlist
}

/** Input for creating a PlaylistWindow */
export type PlaylistWindowCreateInput = Record<string, never>

/** Input for updating a PlaylistWindow */
export type PlaylistWindowUpdateInput = Partial<PlaylistWindowCreateInput>

/** the radio tuner playlist */
export interface RadioTunerPlaylist {
  /** Unique identifier for this playlist */
  id: number
}

/** Input for creating a RadioTunerPlaylist */
export type RadioTunerPlaylistCreateInput = Record<string, never>

/** Input for updating a RadioTunerPlaylist */
export type RadioTunerPlaylistUpdateInput = Partial<RadioTunerPlaylistCreateInput>

/** a track residing in a shared library */
export interface SharedTrack {
  /** Unique identifier for this track */
  id: number
}

/** Input for creating a SharedTrack */
export type SharedTrackCreateInput = Record<string, never>

/** Input for updating a SharedTrack */
export type SharedTrackUpdateInput = Partial<SharedTrackCreateInput>

/** a media source (library, CD, device, etc.) */
export interface Source {
  /** the total size of the source if it has a fixed size */
  capacity: number
  /** the free space on the source if it has a fixed size */
  freeSpace: number
  /** The kind property */
  kind: string
}

/** Input for creating a Source */
export type SourceCreateInput = Record<string, never>

/** Input for updating a Source */
export type SourceUpdateInput = Partial<SourceCreateInput>

/** a subscription playlist from Apple Music */
export interface SubscriptionPlaylist {
  /** Unique identifier for this playlist */
  id: number
}

/** Input for creating a SubscriptionPlaylist */
export type SubscriptionPlaylistCreateInput = Record<string, never>

/** Input for updating a SubscriptionPlaylist */
export type SubscriptionPlaylistUpdateInput = Partial<SubscriptionPlaylistCreateInput>

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
  albumRating: number
  /** the rating kind of the album rating for this track */
  albumRatingKind: string
  /** the artist/source of the track */
  artist: string
  /** the bit rate of the track (in kbps) */
  bitRate: number
  /** the bookmark time of the track in seconds */
  bookmark: number
  /** is the playback position for this track remembered? */
  bookmarkable: boolean
  /** the tempo of this track in beats per minute */
  bpm: number
  /** the category of the track */
  category: string
  /** the iCloud status of the track */
  cloudStatus: string
  /** freeform notes about the track */
  comment: string
  /** is this track from a compilation album? */
  compilation: boolean
  /** the composer of the track */
  composer: string
  /** the common, unique ID for this track. If two tracks in different playlists have the same database ID, they are sharing the same data. */
  databaseID: number
  /** the date the track was added to the playlist */
  dateAdded: Date
  /** the description of the track */
  description: string
  /** the total number of discs in the source album */
  discCount: number
  /** the index of the disc containing this track on the source album */
  discNumber: number
  /** is this track disliked? */
  disliked: boolean
  /** the account of the person who downloaded this track */
  downloaderAccount: string
  /** the name of the person who downloaded this track */
  downloaderName: string
  /** the length of the track in seconds */
  duration: number
  /** is this track checked for playback? */
  enabled: boolean
  /** the episode ID of the track */
  episodeID: string
  /** the episode number of the track */
  episodeNumber: number
  /** the name of the EQ preset of the track */
  eQ: string
  /** the stop time of the track in seconds */
  finish: number
  /** is this track from a gapless album? */
  gapless: boolean
  /** the music/audio genre (category) of the track */
  genre: string
  /** the grouping (piece) of the track. Generally used to denote movements within a classical work. */
  grouping: string
  /** a text description of the track */
  kind: string
  /** the long description of the track */
  longDescription: string
  /** is this track favorited? */
  favorited: boolean
  /** the lyrics of the track */
  lyrics: string
  /** the media kind of the track */
  mediaKind: string
  /** the modification date of the content of this track */
  modificationDate: Date
  /** the movement name of the track */
  movement: string
  /** the total number of movements in the work */
  movementCount: number
  /** the index of the movement in the work */
  movementNumber: number
  /** number of times this track has been played */
  playedCount: number
  /** the date and time this track was last played */
  playedDate: Date
  /** the account of the person who purchased this track */
  purchaserAccount: string
  /** the name of the person who purchased this track */
  purchaserName: string
  /** the rating of this track (0 to 100) */
  rating: number
  /** the rating kind of this track */
  ratingKind: string
  /** the release date of this track */
  releaseDate: Date
  /** the sample rate of the track (in Hz) */
  sampleRate: number
  /** the season number of the track */
  seasonNumber: number
  /** is this track included when shuffling? */
  shufflable: boolean
  /** number of times this track has been skipped */
  skippedCount: number
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
  size: number
  /** the start time of the track in seconds */
  start: number
  /** the length of the track in MM:SS format */
  time: string
  /** the total number of tracks on the source album */
  trackCount: number
  /** the index of the track on the source album */
  trackNumber: number
  /** is this track unplayed? */
  unplayed: boolean
  /** relative volume adjustment of the track (-100% to 100%) */
  volumeAdjustment: number
  /** the work name of the track */
  work: string
  /** the year the track was recorded/released */
  year: number
}

/** Input for creating a Track */
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
  albumRating?: number
  /** the artist/source of the track */
  artist?: string
  /** the bookmark time of the track in seconds */
  bookmark?: number
  /** is the playback position for this track remembered? */
  bookmarkable?: boolean
  /** the tempo of this track in beats per minute */
  bpm?: number
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
  discCount?: number
  /** the index of the disc containing this track on the source album */
  discNumber?: number
  /** is this track disliked? */
  disliked?: boolean
  /** is this track checked for playback? */
  enabled?: boolean
  /** the episode ID of the track */
  episodeID?: string
  /** the episode number of the track */
  episodeNumber?: number
  /** the name of the EQ preset of the track */
  eQ?: string
  /** the stop time of the track in seconds */
  finish?: number
  /** is this track from a gapless album? */
  gapless?: boolean
  /** the music/audio genre (category) of the track */
  genre?: string
  /** the grouping (piece) of the track. Generally used to denote movements within a classical work. */
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
  movementCount?: number
  /** the index of the movement in the work */
  movementNumber?: number
  /** number of times this track has been played */
  playedCount?: number
  /** the date and time this track was last played */
  playedDate?: Date
  /** the rating of this track (0 to 100) */
  rating?: number
  /** the season number of the track */
  seasonNumber?: number
  /** is this track included when shuffling? */
  shufflable?: boolean
  /** number of times this track has been skipped */
  skippedCount?: number
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
  trackCount?: number
  /** the index of the track on the source album */
  trackNumber?: number
  /** is this track unplayed? */
  unplayed?: boolean
  /** relative volume adjustment of the track (-100% to 100%) */
  volumeAdjustment?: number
  /** the work name of the track */
  work?: string
  /** the year the track was recorded/released */
  year?: number
}

/** Input for updating a Track */
export type TrackUpdateInput = Partial<TrackCreateInput>

/** a track representing a network stream */
export interface URLTrack {
  /** the URL for this track */
  address: string
}

/** Input for creating a URLTrack */
export interface URLTrackCreateInput {
  /** the URL for this track */
  address?: string
}

/** Input for updating a URLTrack */
export type URLTrackUpdateInput = Partial<URLTrackCreateInput>

/** custom playlists created by the user */
export interface UserPlaylist {
  /** is this playlist shared? */
  shared: boolean
  /** is this a Smart Playlist? */
  smart: boolean
  /** is this a Genius Playlist? */
  genius: boolean
}

/** Input for creating a UserPlaylist */
export interface UserPlaylistCreateInput {
  /** is this playlist shared? */
  shared?: boolean
}

/** Input for updating a UserPlaylist */
export type UserPlaylistUpdateInput = Partial<UserPlaylistCreateInput>

/** the video window */
export interface VideoWindow {
  /** Unique identifier for this window */
  id: number
}

/** Input for creating a VideoWindow */
export type VideoWindowCreateInput = Record<string, never>

/** Input for updating a VideoWindow */
export type VideoWindowUpdateInput = Partial<VideoWindowCreateInput>

/** a visual plug-in */
export interface Visual {
  /** Unique identifier for this visual */
  id: number
}

/** Input for creating a Visual */
export type VisualCreateInput = Record<string, never>

/** Input for updating a Visual */
export type VisualUpdateInput = Partial<VisualCreateInput>

// Zod schemas for runtime validation

export const AirPlayDeviceSchema = z.object({
  active: z.boolean(),
  available: z.boolean(),
  kind: z.string(),
  networkAddress: z.string(),
  protected: z.boolean(),
  selected: z.boolean(),
  supportsAudio: z.boolean(),
  supportsVideo: z.boolean(),
  soundVolume: z.number(),
})

export const ArtworkSchema = z.object({
  data: z.string(),
  description: z.string(),
  downloaded: z.boolean(),
  format: z.string(),
  kind: z.number(),
  rawData: z.unknown(),
})

export const AudioCDPlaylistSchema = z.object({
  artist: z.string(),
  compilation: z.boolean(),
  composer: z.string(),
  discCount: z.number(),
  discNumber: z.number(),
  genre: z.string(),
  year: z.number(),
})

export const AudioCDTrackSchema = z.object({
  location: z.string(),
})

export const BrowserWindowSchema = z.object({
  selection: z.string(),
  view: z.string(),
})

export const EncoderSchema = z.object({
  format: z.string(),
})

export const EQPresetSchema = z.object({
  band1: z.number(),
  band2: z.number(),
  band3: z.number(),
  band4: z.number(),
  band5: z.number(),
  band6: z.number(),
  band7: z.number(),
  band8: z.number(),
  band9: z.number(),
  band10: z.number(),
  modifiable: z.boolean(),
  preamp: z.number(),
  updateTracks: z.boolean(),
})

export const EQWindowSchema = z.object({
  id: z.number(),
})

export const FileTrackSchema = z.object({
  location: z.string(),
})

export const LibraryPlaylistSchema = z.object({
  id: z.number(),
})

export const MiniplayerWindowSchema = z.object({
  id: z.number(),
})

export const PlaylistSchema = z.object({
  description: z.string(),
  disliked: z.boolean(),
  duration: z.number(),
  name: z.string(),
  favorited: z.boolean(),
  parent: z.string(),
  size: z.number(),
  specialKind: z.string(),
  time: z.string(),
  visible: z.boolean(),
})

export const PlaylistWindowSchema = z.object({
  selection: z.string(),
  view: z.string(),
})

export const RadioTunerPlaylistSchema = z.object({
  id: z.number(),
})

export const SharedTrackSchema = z.object({
  id: z.number(),
})

export const SourceSchema = z.object({
  capacity: z.number(),
  freeSpace: z.number(),
  kind: z.string(),
})

export const SubscriptionPlaylistSchema = z.object({
  id: z.number(),
})

export const TrackSchema = z.object({
  album: z.string(),
  albumArtist: z.string(),
  albumDisliked: z.boolean(),
  albumFavorited: z.boolean(),
  albumRating: z.number(),
  albumRatingKind: z.string(),
  artist: z.string(),
  bitRate: z.number(),
  bookmark: z.number(),
  bookmarkable: z.boolean(),
  bpm: z.number(),
  category: z.string(),
  cloudStatus: z.string(),
  comment: z.string(),
  compilation: z.boolean(),
  composer: z.string(),
  databaseID: z.number(),
  dateAdded: z.string(),
  description: z.string(),
  discCount: z.number(),
  discNumber: z.number(),
  disliked: z.boolean(),
  downloaderAccount: z.string(),
  downloaderName: z.string(),
  duration: z.number(),
  enabled: z.boolean(),
  episodeID: z.string(),
  episodeNumber: z.number(),
  eQ: z.string(),
  finish: z.number(),
  gapless: z.boolean(),
  genre: z.string(),
  grouping: z.string(),
  kind: z.string(),
  longDescription: z.string(),
  favorited: z.boolean(),
  lyrics: z.string(),
  mediaKind: z.string(),
  modificationDate: z.string(),
  movement: z.string(),
  movementCount: z.number(),
  movementNumber: z.number(),
  playedCount: z.number(),
  playedDate: z.string(),
  purchaserAccount: z.string(),
  purchaserName: z.string(),
  rating: z.number(),
  ratingKind: z.string(),
  releaseDate: z.string(),
  sampleRate: z.number(),
  seasonNumber: z.number(),
  shufflable: z.boolean(),
  skippedCount: z.number(),
  skippedDate: z.string(),
  show: z.string(),
  sortAlbum: z.string(),
  sortArtist: z.string(),
  sortAlbumArtist: z.string(),
  sortName: z.string(),
  sortComposer: z.string(),
  sortShow: z.string(),
  size: z.number(),
  start: z.number(),
  time: z.string(),
  trackCount: z.number(),
  trackNumber: z.number(),
  unplayed: z.boolean(),
  volumeAdjustment: z.number(),
  work: z.string(),
  year: z.number(),
})

export const URLTrackSchema = z.object({
  address: z.string(),
})

export const UserPlaylistSchema = z.object({
  shared: z.boolean(),
  smart: z.boolean(),
  genius: z.boolean(),
})

export const VideoWindowSchema = z.object({
  id: z.number(),
})

export const VisualSchema = z.object({
  id: z.number(),
})
