/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { PlayerState } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Track } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TrackCreateInput = import('./contract/index.js').TrackCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type TrackUpdateInput = import('./contract/index.js').TrackUpdateInput

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TrackSchema = z.object({
  name: z.string(),
  artist: z.string(),
  album: z.string(),
  albumArtist: z.string(),
  discNumber: z.number(),
  duration: z.number(),
  playedCount: z.number(),
  trackNumber: z.number(),
  spotifyUrl: z.string(),
  id: z.string(),
  artworkUrl: z.string(),
  artwork: z.string(),
  playerState: z.string(),
})
