/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** PlayerState */
export type PlayerState = 'stopped' | 'playing' | 'paused';

/** The currently playing track */
export interface Track {
  /** The name of the track */
  name: string;
  /** The artist of the track */
  artist: string;
  /** The album of the track */
  album: string;
  /** The album artist of the track */
  albumArtist: string;
  /** The disc number of the track */
  discNumber: number;
  /** The duration of the track in milliseconds */
  duration: number;
  /** Number of times this track has been played */
  playedCount: number;
  /** The track number */
  trackNumber: number;
  /** The Spotify URL for the track */
  spotifyUrl: string;
  /** The unique identifier of the track */
  id: string;
  /** The URL of the track artwork */
  artworkUrl: string;
  /** The track artwork */
  artwork: string;
  /** The current player state */
  playerState: PlayerState;
}

/** Input for creating a Track */
export interface TrackCreateInput {
}

/** Input for updating a Track */
export type TrackUpdateInput = Partial<TrackCreateInput>;

// Zod schemas for runtime validation

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
});
