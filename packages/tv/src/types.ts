/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { EPlS } from './contract/index.js'

export type { ESrc } from './contract/index.js'

export type { ESrA } from './contract/index.js'

export type { ESpK } from './contract/index.js'

export type { EMdK } from './contract/index.js'

export type { ERtK } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Artwork } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ArtworkCreateInput = Omit<import('./contract/index.js').ArtworkCreateInput, 'kind'> & {
  /** kind or purpose of this piece of artwork Numeric values are validated by the contract before dispatch. */
  kind?: number | Extract<import('./contract/index.js').ArtworkCreateInput['kind'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type ArtworkUpdateInput = Omit<import('./contract/index.js').ArtworkUpdateInput, 'kind'> & {
  /** kind or purpose of this piece of artwork Numeric values are validated by the contract before dispatch. */
  kind?: number | Extract<import('./contract/index.js').ArtworkUpdateInput['kind'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BrowserWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type BrowserWindowCreateInput = import('./contract/index.js').BrowserWindowCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type BrowserWindowUpdateInput = import('./contract/index.js').BrowserWindowUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { FileTrack } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type FileTrackCreateInput = import('./contract/index.js').FileTrackCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type FileTrackUpdateInput = import('./contract/index.js').FileTrackUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { LibraryPlaylist } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type LibraryPlaylistCreateInput = import('./contract/index.js').LibraryPlaylistCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type LibraryPlaylistUpdateInput = import('./contract/index.js').LibraryPlaylistUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Playlist } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type PlaylistCreateInput = import('./contract/index.js').PlaylistCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type PlaylistUpdateInput = import('./contract/index.js').PlaylistUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { PlaylistWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type PlaylistWindowCreateInput = import('./contract/index.js').PlaylistWindowCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type PlaylistWindowUpdateInput = import('./contract/index.js').PlaylistWindowUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SharedTrack } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SharedTrackCreateInput = import('./contract/index.js').SharedTrackCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SharedTrackUpdateInput = import('./contract/index.js').SharedTrackUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Source } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SourceCreateInput = import('./contract/index.js').SourceCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type SourceUpdateInput = import('./contract/index.js').SourceUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Track } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TrackCreateInput = Omit<
  import('./contract/index.js').TrackCreateInput,
  | 'albumRating'
  | 'discCount'
  | 'discNumber'
  | 'episodeNumber'
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
  albumRating?:
    | number
    | Extract<import('./contract/index.js').TrackCreateInput['albumRating'], null>
  /** the total number of discs in the source album Numeric values are validated by the contract before dispatch. */
  discCount?: number | Extract<import('./contract/index.js').TrackCreateInput['discCount'], null>
  /** the index of the disc containing this track on the source album Numeric values are validated by the contract before dispatch. */
  discNumber?: number | Extract<import('./contract/index.js').TrackCreateInput['discNumber'], null>
  /** the episode number of the track Numeric values are validated by the contract before dispatch. */
  episodeNumber?:
    | number
    | Extract<import('./contract/index.js').TrackCreateInput['episodeNumber'], null>
  /** number of times this track has been played Numeric values are validated by the contract before dispatch. */
  playedCount?:
    | number
    | Extract<import('./contract/index.js').TrackCreateInput['playedCount'], null>
  /** the rating of this track (0 to 100) Numeric values are validated by the contract before dispatch. */
  rating?: number | Extract<import('./contract/index.js').TrackCreateInput['rating'], null>
  /** the season number of the track Numeric values are validated by the contract before dispatch. */
  seasonNumber?:
    | number
    | Extract<import('./contract/index.js').TrackCreateInput['seasonNumber'], null>
  /** number of times this track has been skipped Numeric values are validated by the contract before dispatch. */
  skippedCount?:
    | number
    | Extract<import('./contract/index.js').TrackCreateInput['skippedCount'], null>
  /** the total number of tracks on the source album Numeric values are validated by the contract before dispatch. */
  trackCount?: number | Extract<import('./contract/index.js').TrackCreateInput['trackCount'], null>
  /** the index of the track on the source album Numeric values are validated by the contract before dispatch. */
  trackNumber?:
    | number
    | Extract<import('./contract/index.js').TrackCreateInput['trackNumber'], null>
  /** relative volume adjustment of the track (-100% to 100%) Numeric values are validated by the contract before dispatch. */
  volumeAdjustment?:
    | number
    | Extract<import('./contract/index.js').TrackCreateInput['volumeAdjustment'], null>
  /** the year the track was recorded/released Numeric values are validated by the contract before dispatch. */
  year?: number | Extract<import('./contract/index.js').TrackCreateInput['year'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type TrackUpdateInput = Omit<
  import('./contract/index.js').TrackUpdateInput,
  | 'albumRating'
  | 'discCount'
  | 'discNumber'
  | 'episodeNumber'
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
  albumRating?:
    | number
    | Extract<import('./contract/index.js').TrackUpdateInput['albumRating'], null>
  /** the total number of discs in the source album Numeric values are validated by the contract before dispatch. */
  discCount?: number | Extract<import('./contract/index.js').TrackUpdateInput['discCount'], null>
  /** the index of the disc containing this track on the source album Numeric values are validated by the contract before dispatch. */
  discNumber?: number | Extract<import('./contract/index.js').TrackUpdateInput['discNumber'], null>
  /** the episode number of the track Numeric values are validated by the contract before dispatch. */
  episodeNumber?:
    | number
    | Extract<import('./contract/index.js').TrackUpdateInput['episodeNumber'], null>
  /** number of times this track has been played Numeric values are validated by the contract before dispatch. */
  playedCount?:
    | number
    | Extract<import('./contract/index.js').TrackUpdateInput['playedCount'], null>
  /** the rating of this track (0 to 100) Numeric values are validated by the contract before dispatch. */
  rating?: number | Extract<import('./contract/index.js').TrackUpdateInput['rating'], null>
  /** the season number of the track Numeric values are validated by the contract before dispatch. */
  seasonNumber?:
    | number
    | Extract<import('./contract/index.js').TrackUpdateInput['seasonNumber'], null>
  /** number of times this track has been skipped Numeric values are validated by the contract before dispatch. */
  skippedCount?:
    | number
    | Extract<import('./contract/index.js').TrackUpdateInput['skippedCount'], null>
  /** the total number of tracks on the source album Numeric values are validated by the contract before dispatch. */
  trackCount?: number | Extract<import('./contract/index.js').TrackUpdateInput['trackCount'], null>
  /** the index of the track on the source album Numeric values are validated by the contract before dispatch. */
  trackNumber?:
    | number
    | Extract<import('./contract/index.js').TrackUpdateInput['trackNumber'], null>
  /** relative volume adjustment of the track (-100% to 100%) Numeric values are validated by the contract before dispatch. */
  volumeAdjustment?:
    | number
    | Extract<import('./contract/index.js').TrackUpdateInput['volumeAdjustment'], null>
  /** the year the track was recorded/released Numeric values are validated by the contract before dispatch. */
  year?: number | Extract<import('./contract/index.js').TrackUpdateInput['year'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { URLTrack } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type URLTrackCreateInput = import('./contract/index.js').URLTrackCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type URLTrackUpdateInput = import('./contract/index.js').URLTrackUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { UserPlaylist } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type UserPlaylistCreateInput = import('./contract/index.js').UserPlaylistCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type UserPlaylistUpdateInput = import('./contract/index.js').UserPlaylistUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { VideoWindow } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type VideoWindowCreateInput = import('./contract/index.js').VideoWindowCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type VideoWindowUpdateInput = import('./contract/index.js').VideoWindowUpdateInput

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ArtworkSchema = z.object({
  id: z.number(),
  data: z.string(),
  description: z.string(),
  downloaded: z.boolean(),
  format: z.string(),
  kind: z.number(),
  rawData: z.unknown(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BrowserWindowSchema = z.object({
  id: z.number(),
  selection: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FileTrackSchema = z.object({
  id: z.number(),
  location: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const LibraryPlaylistSchema = z.object({
  id: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PlaylistSchema = z.object({
  id: z.number(),
  persistentID: z.string(),
  description: z.string(),
  duration: z.number(),
  name: z.string(),
  size: z.number(),
  specialKind: z.string(),
  time: z.string(),
  visible: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PlaylistWindowSchema = z.object({
  id: z.number(),
  selection: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SharedTrackSchema = z.object({
  id: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SourceSchema = z.object({
  id: z.number(),
  persistentID: z.string(),
  capacity: z.number(),
  freeSpace: z.number(),
  kind: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TrackSchema = z.object({
  id: z.number(),
  album: z.string(),
  albumRating: z.number(),
  albumRatingKind: z.string(),
  bitRate: z.number(),
  bookmark: z.number(),
  bookmarkable: z.boolean(),
  category: z.string(),
  comment: z.string(),
  databaseID: z.number(),
  dateAdded: z.string(),
  description: z.string(),
  director: z.string(),
  discCount: z.number(),
  discNumber: z.number(),
  downloaderAccount: z.string(),
  downloaderName: z.string(),
  duration: z.number(),
  enabled: z.boolean(),
  episodeID: z.string(),
  episodeNumber: z.number(),
  finish: z.number(),
  genre: z.string(),
  grouping: z.string(),
  kind: z.string(),
  longDescription: z.string(),
  mediaKind: z.string(),
  modificationDate: z.string(),
  playedCount: z.number(),
  playedDate: z.string(),
  purchaserAccount: z.string(),
  purchaserName: z.string(),
  rating: z.number(),
  ratingKind: z.string(),
  releaseDate: z.string(),
  sampleRate: z.number(),
  seasonNumber: z.number(),
  skippedCount: z.number(),
  skippedDate: z.string(),
  show: z.string(),
  sortAlbum: z.string(),
  sortDirector: z.string(),
  sortName: z.string(),
  sortShow: z.string(),
  size: z.number(),
  start: z.number(),
  time: z.string(),
  trackCount: z.number(),
  trackNumber: z.number(),
  unplayed: z.boolean(),
  volumeAdjustment: z.number(),
  year: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const URLTrackSchema = z.object({
  id: z.number(),
  address: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const UserPlaylistSchema = z.object({
  id: z.number(),
  shared: z.boolean(),
  smart: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const VideoWindowSchema = z.object({
  id: z.number(),
})
