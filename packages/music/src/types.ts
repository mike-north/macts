/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { EKnd } from './contract/index.js'

export type { Enum } from './contract/index.js'

export type { EPlS } from './contract/index.js'

export type { ERpt } from './contract/index.js'

export type { EShM } from './contract/index.js'

export type { ESrc } from './contract/index.js'

export type { ESrA } from './contract/index.js'

export type { ESpK } from './contract/index.js'

export type { EMdK } from './contract/index.js'

export type { ERtK } from './contract/index.js'

export type { EAPD } from './contract/index.js'

export type { EClS } from './contract/index.js'

export type { EExF } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { AirPlayDevice } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AirPlayDeviceCreateInput = Omit<
  import('./contract/index.js').AirPlayDeviceCreateInput,
  'soundVolume'
> & {
  /** the output volume for the device (0 = minimum, 100 = maximum) Numeric values are validated by the contract before dispatch. */
  soundVolume?: null extends import('./contract/index.js').AirPlayDeviceCreateInput['soundVolume']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type AirPlayDeviceUpdateInput = Omit<
  import('./contract/index.js').AirPlayDeviceUpdateInput,
  'soundVolume'
> & {
  /** the output volume for the device (0 = minimum, 100 = maximum) Numeric values are validated by the contract before dispatch. */
  soundVolume?: null extends import('./contract/index.js').AirPlayDeviceUpdateInput['soundVolume']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Artwork } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ArtworkCreateInput = Omit<import('./contract/index.js').ArtworkCreateInput, 'kind'> & {
  /** kind or purpose of this piece of artwork Numeric values are validated by the contract before dispatch. */
  kind?: null extends import('./contract/index.js').ArtworkCreateInput['kind']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type ArtworkUpdateInput = Omit<import('./contract/index.js').ArtworkUpdateInput, 'kind'> & {
  /** kind or purpose of this piece of artwork Numeric values are validated by the contract before dispatch. */
  kind?: null extends import('./contract/index.js').ArtworkUpdateInput['kind']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { AudioCDPlaylist } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AudioCDPlaylistCreateInput = Omit<
  import('./contract/index.js').AudioCDPlaylistCreateInput,
  'discCount' | 'discNumber' | 'year'
> & {
  /** the total number of discs in this CD’s album Numeric values are validated by the contract before dispatch. */
  discCount?: null extends import('./contract/index.js').AudioCDPlaylistCreateInput['discCount']
    ? number | null
    : number
  /** the index of this CD disc in the source album Numeric values are validated by the contract before dispatch. */
  discNumber?: null extends import('./contract/index.js').AudioCDPlaylistCreateInput['discNumber']
    ? number | null
    : number
  /** the year the album was recorded/released Numeric values are validated by the contract before dispatch. */
  year?: null extends import('./contract/index.js').AudioCDPlaylistCreateInput['year']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type AudioCDPlaylistUpdateInput = Omit<
  import('./contract/index.js').AudioCDPlaylistUpdateInput,
  'discCount' | 'discNumber' | 'year'
> & {
  /** the total number of discs in this CD’s album Numeric values are validated by the contract before dispatch. */
  discCount?: null extends import('./contract/index.js').AudioCDPlaylistUpdateInput['discCount']
    ? number | null
    : number
  /** the index of this CD disc in the source album Numeric values are validated by the contract before dispatch. */
  discNumber?: null extends import('./contract/index.js').AudioCDPlaylistUpdateInput['discNumber']
    ? number | null
    : number
  /** the year the album was recorded/released Numeric values are validated by the contract before dispatch. */
  year?: null extends import('./contract/index.js').AudioCDPlaylistUpdateInput['year']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { AudioCDTrack } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AudioCDTrackCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AudioCDTrackUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BrowserWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { BrowserWindowCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { BrowserWindowUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Encoder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { EncoderCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { EncoderUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { EQPreset } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { EQPresetCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { EQPresetUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { EQWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { EQWindowCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { EQWindowUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { FileTrack } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { FileTrackCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { FileTrackUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { LibraryPlaylist } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { LibraryPlaylistCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { LibraryPlaylistUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MiniplayerWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MiniplayerWindowCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MiniplayerWindowUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Playlist } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { PlaylistCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { PlaylistUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { PlaylistWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { PlaylistWindowCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { PlaylistWindowUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RadioTunerPlaylist } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { RadioTunerPlaylistCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { RadioTunerPlaylistUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SharedTrack } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SharedTrackCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SharedTrackUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Source } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SourceCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SourceUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SubscriptionPlaylist } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SubscriptionPlaylistCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SubscriptionPlaylistUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Track } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TrackCreateInput = Omit<
  import('./contract/index.js').TrackCreateInput,
  | 'albumRating'
  | 'bpm'
  | 'discCount'
  | 'discNumber'
  | 'episodeNumber'
  | 'movementCount'
  | 'movementNumber'
  | 'playedCount'
  | 'rating'
  | 'seasonNumber'
  | 'skippedCount'
  | 'trackCount'
  | 'trackNumber'
  | 'volumeAdjustment'
  | 'year'
> & {
  /** the rating of the album for this track (0 to 100) Numeric values are validated by the contract before dispatch. */
  albumRating?: null extends import('./contract/index.js').TrackCreateInput['albumRating']
    ? number | null
    : number
  /** the tempo of this track in beats per minute Numeric values are validated by the contract before dispatch. */
  bpm?: null extends import('./contract/index.js').TrackCreateInput['bpm'] ? number | null : number
  /** the total number of discs in the source album Numeric values are validated by the contract before dispatch. */
  discCount?: null extends import('./contract/index.js').TrackCreateInput['discCount']
    ? number | null
    : number
  /** the index of the disc containing this track on the source album Numeric values are validated by the contract before dispatch. */
  discNumber?: null extends import('./contract/index.js').TrackCreateInput['discNumber']
    ? number | null
    : number
  /** the episode number of the track Numeric values are validated by the contract before dispatch. */
  episodeNumber?: null extends import('./contract/index.js').TrackCreateInput['episodeNumber']
    ? number | null
    : number
  /** the total number of movements in the work Numeric values are validated by the contract before dispatch. */
  movementCount?: null extends import('./contract/index.js').TrackCreateInput['movementCount']
    ? number | null
    : number
  /** the index of the movement in the work Numeric values are validated by the contract before dispatch. */
  movementNumber?: null extends import('./contract/index.js').TrackCreateInput['movementNumber']
    ? number | null
    : number
  /** number of times this track has been played Numeric values are validated by the contract before dispatch. */
  playedCount?: null extends import('./contract/index.js').TrackCreateInput['playedCount']
    ? number | null
    : number
  /** the rating of this track (0 to 100) Numeric values are validated by the contract before dispatch. */
  rating?: null extends import('./contract/index.js').TrackCreateInput['rating']
    ? number | null
    : number
  /** the season number of the track Numeric values are validated by the contract before dispatch. */
  seasonNumber?: null extends import('./contract/index.js').TrackCreateInput['seasonNumber']
    ? number | null
    : number
  /** number of times this track has been skipped Numeric values are validated by the contract before dispatch. */
  skippedCount?: null extends import('./contract/index.js').TrackCreateInput['skippedCount']
    ? number | null
    : number
  /** the total number of tracks on the source album Numeric values are validated by the contract before dispatch. */
  trackCount?: null extends import('./contract/index.js').TrackCreateInput['trackCount']
    ? number | null
    : number
  /** the index of the track on the source album Numeric values are validated by the contract before dispatch. */
  trackNumber?: null extends import('./contract/index.js').TrackCreateInput['trackNumber']
    ? number | null
    : number
  /** relative volume adjustment of the track (-100% to 100%) Numeric values are validated by the contract before dispatch. */
  volumeAdjustment?: null extends import('./contract/index.js').TrackCreateInput['volumeAdjustment']
    ? number | null
    : number
  /** the year the track was recorded/released Numeric values are validated by the contract before dispatch. */
  year?: null extends import('./contract/index.js').TrackCreateInput['year']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type TrackUpdateInput = Omit<
  import('./contract/index.js').TrackUpdateInput,
  | 'albumRating'
  | 'bpm'
  | 'discCount'
  | 'discNumber'
  | 'episodeNumber'
  | 'movementCount'
  | 'movementNumber'
  | 'playedCount'
  | 'rating'
  | 'seasonNumber'
  | 'skippedCount'
  | 'trackCount'
  | 'trackNumber'
  | 'volumeAdjustment'
  | 'year'
> & {
  /** the rating of the album for this track (0 to 100) Numeric values are validated by the contract before dispatch. */
  albumRating?: null extends import('./contract/index.js').TrackUpdateInput['albumRating']
    ? number | null
    : number
  /** the tempo of this track in beats per minute Numeric values are validated by the contract before dispatch. */
  bpm?: null extends import('./contract/index.js').TrackUpdateInput['bpm'] ? number | null : number
  /** the total number of discs in the source album Numeric values are validated by the contract before dispatch. */
  discCount?: null extends import('./contract/index.js').TrackUpdateInput['discCount']
    ? number | null
    : number
  /** the index of the disc containing this track on the source album Numeric values are validated by the contract before dispatch. */
  discNumber?: null extends import('./contract/index.js').TrackUpdateInput['discNumber']
    ? number | null
    : number
  /** the episode number of the track Numeric values are validated by the contract before dispatch. */
  episodeNumber?: null extends import('./contract/index.js').TrackUpdateInput['episodeNumber']
    ? number | null
    : number
  /** the total number of movements in the work Numeric values are validated by the contract before dispatch. */
  movementCount?: null extends import('./contract/index.js').TrackUpdateInput['movementCount']
    ? number | null
    : number
  /** the index of the movement in the work Numeric values are validated by the contract before dispatch. */
  movementNumber?: null extends import('./contract/index.js').TrackUpdateInput['movementNumber']
    ? number | null
    : number
  /** number of times this track has been played Numeric values are validated by the contract before dispatch. */
  playedCount?: null extends import('./contract/index.js').TrackUpdateInput['playedCount']
    ? number | null
    : number
  /** the rating of this track (0 to 100) Numeric values are validated by the contract before dispatch. */
  rating?: null extends import('./contract/index.js').TrackUpdateInput['rating']
    ? number | null
    : number
  /** the season number of the track Numeric values are validated by the contract before dispatch. */
  seasonNumber?: null extends import('./contract/index.js').TrackUpdateInput['seasonNumber']
    ? number | null
    : number
  /** number of times this track has been skipped Numeric values are validated by the contract before dispatch. */
  skippedCount?: null extends import('./contract/index.js').TrackUpdateInput['skippedCount']
    ? number | null
    : number
  /** the total number of tracks on the source album Numeric values are validated by the contract before dispatch. */
  trackCount?: null extends import('./contract/index.js').TrackUpdateInput['trackCount']
    ? number | null
    : number
  /** the index of the track on the source album Numeric values are validated by the contract before dispatch. */
  trackNumber?: null extends import('./contract/index.js').TrackUpdateInput['trackNumber']
    ? number | null
    : number
  /** relative volume adjustment of the track (-100% to 100%) Numeric values are validated by the contract before dispatch. */
  volumeAdjustment?: null extends import('./contract/index.js').TrackUpdateInput['volumeAdjustment']
    ? number | null
    : number
  /** the year the track was recorded/released Numeric values are validated by the contract before dispatch. */
  year?: null extends import('./contract/index.js').TrackUpdateInput['year']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { URLTrack } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { URLTrackCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { URLTrackUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { UserPlaylist } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { UserPlaylistCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { UserPlaylistUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { VideoWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { VideoWindowCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { VideoWindowUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Visual } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { VisualCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { VisualUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ArtworkSchema = z.object({
  data: z.string(),
  description: z.string(),
  downloaded: z.boolean(),
  format: z.string(),
  kind: z.number(),
  rawData: z.unknown(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AudioCDPlaylistSchema = z.object({
  artist: z.string(),
  compilation: z.boolean(),
  composer: z.string(),
  discCount: z.number(),
  discNumber: z.number(),
  genre: z.string(),
  year: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AudioCDTrackSchema = z.object({
  location: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BrowserWindowSchema = z.object({
  selection: z.string(),
  view: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const EncoderSchema = z.object({
  format: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const EQWindowSchema = z.object({
  id: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FileTrackSchema = z.object({
  location: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const LibraryPlaylistSchema = z.object({
  id: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MiniplayerWindowSchema = z.object({
  id: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PlaylistSchema = z.object({
  id: z.number(),
  index: z.number(),
  persistentID: z.string(),
  description: z.string(),
  disliked: z.boolean(),
  duration: z.number(),
  name: z.string(),
  favorited: z.boolean(),
  size: z.number(),
  specialKind: z.string(),
  time: z.string(),
  visible: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PlaylistWindowSchema = z.object({
  selection: z.string(),
  view: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RadioTunerPlaylistSchema = z.object({
  id: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SharedTrackSchema = z.object({
  id: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SourceSchema = z.object({
  capacity: z.number(),
  freeSpace: z.number(),
  kind: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SubscriptionPlaylistSchema = z.object({
  id: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TrackSchema = z.object({
  id: z.number(),
  index: z.number(),
  name: z.string(),
  persistentID: z.string(),
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

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const URLTrackSchema = z.object({
  address: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const UserPlaylistSchema = z.object({
  shared: z.boolean(),
  smart: z.boolean(),
  genius: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const VideoWindowSchema = z.object({
  id: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const VisualSchema = z.object({
  id: z.number(),
})
