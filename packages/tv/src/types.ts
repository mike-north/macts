/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** EPlS */
export type EPlS = 'stopped' | 'playing' | 'paused' | 'fastForwarding' | 'rewinding';

/** ESrc */
export type ESrc = 'library' | 'sharedLibrary' | 'iTunesStore' | 'unknown';

/** ESrA */
export type ESrA = 'albums' | 'all' | 'artists' | 'displayed' | 'names';

/** ESpK */
export type ESpK = 'none' | 'folder' | 'library' | 'movies' | 'tVShows';

/** EMdK */
export type EMdK = 'homeVideo' | 'movie' | 'tVShow' | 'unknown';

/** ERtK */
export type ERtK = 'user' | 'computed';

/** a piece of art within a track or playlist */
export interface Artwork {
  /** Unique identifier for this artwork */
  id: number;
  /** data for this artwork, in the form of a picture */
  data: string;
  /** description of artwork as a string */
  description: string;
  /** was this artwork downloaded by iTunes? */
  downloaded: boolean;
  /** the data format for this piece of artwork */
  format: string;
  /** kind or purpose of this piece of artwork */
  kind: number;
  /** data for this artwork, in original format */
  rawData: unknown;
}

/** Input for creating a Artwork */
export interface ArtworkCreateInput {
  /** data for this artwork, in the form of a picture */
  data?: string;
  /** description of artwork as a string */
  description?: string;
  /** kind or purpose of this piece of artwork */
  kind?: number;
  /** data for this artwork, in original format */
  rawData?: unknown;
}

/** Input for updating a Artwork */
export type ArtworkUpdateInput = Partial<ArtworkCreateInput>;

/** the main window */
export interface BrowserWindow {
  /** Unique identifier for this window */
  id: number;
  /** the selected tracks */
  selection: string;
  /** the playlist currently displayed in the window */
  view: Playlist;
}

/** Input for creating a BrowserWindow */
export interface BrowserWindowCreateInput {
  /** the playlist currently displayed in the window */
  view?: Playlist;
}

/** Input for updating a BrowserWindow */
export type BrowserWindowUpdateInput = Partial<BrowserWindowCreateInput>;

/** a track representing a video file */
export interface FileTrack {
  /** Unique identifier for this track */
  id: number;
  /** the location of the file represented by this track */
  location: string;
}

/** Input for creating a FileTrack */
export interface FileTrackCreateInput {
  /** the location of the file represented by this track */
  location?: string;
}

/** Input for updating a FileTrack */
export type FileTrackUpdateInput = Partial<FileTrackCreateInput>;

/** the main library playlist */
export interface LibraryPlaylist {
  /** Unique identifier for this playlist */
  id: number;
}

/** Input for creating a LibraryPlaylist */
export type LibraryPlaylistCreateInput = Record<string, never>;

/** Input for updating a LibraryPlaylist */
export type LibraryPlaylistUpdateInput = Partial<LibraryPlaylistCreateInput>;

/** a list of tracks/streams */
export interface Playlist {
  /** Unique identifier for this playlist */
  id: number;
  /** the description of the playlist */
  description: string;
  /** the total length of all tracks (in seconds) */
  duration: number;
  /** the name of the playlist */
  name: string;
  /** folder which contains this playlist (if any) */
  parent: Playlist;
  /** the total size of all tracks (in bytes) */
  size: number;
  /** special playlist kind */
  specialKind: string;
  /** the length of all tracks in MM:SS format */
  time: string;
  /** is this playlist visible in the Source list? */
  visible: boolean;
}

/** Input for creating a Playlist */
export interface PlaylistCreateInput {
  /** the description of the playlist */
  description?: string;
  /** the name of the playlist */
  name?: string;
}

/** Input for updating a Playlist */
export type PlaylistUpdateInput = Partial<PlaylistCreateInput>;

/** a sub-window showing a single playlist */
export interface PlaylistWindow {
  /** Unique identifier for this window */
  id: number;
  /** the selected tracks */
  selection: string;
  /** the playlist displayed in the window */
  view: Playlist;
}

/** Input for creating a PlaylistWindow */
export type PlaylistWindowCreateInput = Record<string, never>;

/** Input for updating a PlaylistWindow */
export type PlaylistWindowUpdateInput = Partial<PlaylistWindowCreateInput>;

/** a track residing in a shared library */
export interface SharedTrack {
  /** Unique identifier for this track */
  id: number;
}

/** Input for creating a SharedTrack */
export type SharedTrackCreateInput = Record<string, never>;

/** Input for updating a SharedTrack */
export type SharedTrackUpdateInput = Partial<SharedTrackCreateInput>;

/** a media source (library, CD, device, etc.) */
export interface Source {
  /** Unique identifier for this source */
  id: number;
  /** the total size of the source if it has a fixed size */
  capacity: number;
  /** the free space on the source if it has a fixed size */
  freeSpace: number;
  /** The kind property */
  kind: string;
}

/** Input for creating a Source */
export type SourceCreateInput = Record<string, never>;

/** Input for updating a Source */
export type SourceUpdateInput = Partial<SourceCreateInput>;

/** playable video source */
export interface Track {
  /** Unique identifier for this track */
  id: number;
  /** the album name of the track */
  album: string;
  /** the rating of the album for this track (0 to 100) */
  albumRating: number;
  /** the rating kind of the album rating for this track */
  albumRatingKind: string;
  /** the bit rate of the track (in kbps) */
  bitRate: number;
  /** the bookmark time of the track in seconds */
  bookmark: number;
  /** is the playback position for this track remembered? */
  bookmarkable: boolean;
  /** the category of the track */
  category: string;
  /** freeform notes about the track */
  comment: string;
  /** the common, unique ID for this track. If two tracks in different playlists have the same database ID, they are sharing the same data. */
  databaseID: number;
  /** the date the track was added to the playlist */
  dateAdded: Date;
  /** the description of the track */
  description: string;
  /** the artist/source of the track */
  director: string;
  /** the total number of discs in the source album */
  discCount: number;
  /** the index of the disc containing this track on the source album */
  discNumber: number;
  /** the account of the person who downloaded this track */
  downloaderAccount: string;
  /** the name of the person who downloaded this track */
  downloaderName: string;
  /** the length of the track in seconds */
  duration: number;
  /** is this track checked for playback? */
  enabled: boolean;
  /** the episode ID of the track */
  episodeID: string;
  /** the episode number of the track */
  episodeNumber: number;
  /** the stop time of the track in seconds */
  finish: number;
  /** the genre (category) of the track */
  genre: string;
  /** the grouping (piece) of the track. Generally used to denote movements within a classical work. */
  grouping: string;
  /** a text description of the track */
  kind: string;
  /** the long description of the track */
  longDescription: string;
  /** the media kind of the track */
  mediaKind: string;
  /** the modification date of the content of this track */
  modificationDate: Date;
  /** number of times this track has been played */
  playedCount: number;
  /** the date and time this track was last played */
  playedDate: Date;
  /** the account of the person who purchased this track */
  purchaserAccount: string;
  /** the name of the person who purchased this track */
  purchaserName: string;
  /** the rating of this track (0 to 100) */
  rating: number;
  /** the rating kind of this track */
  ratingKind: string;
  /** the release date of this track */
  releaseDate: Date;
  /** the sample rate of the track (in Hz) */
  sampleRate: number;
  /** the season number of the track */
  seasonNumber: number;
  /** number of times this track has been skipped */
  skippedCount: number;
  /** the date and time this track was last skipped */
  skippedDate: Date;
  /** the show name of the track */
  show: string;
  /** override string to use for the track when sorting by album */
  sortAlbum: string;
  /** override string to use for the track when sorting by artist */
  sortDirector: string;
  /** override string to use for the track when sorting by name */
  sortName: string;
  /** override string to use for the track when sorting by show name */
  sortShow: string;
  /** the size of the track (in bytes) */
  size: number;
  /** the start time of the track in seconds */
  start: number;
  /** the length of the track in MM:SS format */
  time: string;
  /** the total number of tracks on the source album */
  trackCount: number;
  /** the index of the track on the source album */
  trackNumber: number;
  /** is this track unplayed? */
  unplayed: boolean;
  /** relative volume adjustment of the track (-100% to 100%) */
  volumeAdjustment: number;
  /** the year the track was recorded/released */
  year: number;
}

/** Input for creating a Track */
export interface TrackCreateInput {
  /** the album name of the track */
  album?: string;
  /** the rating of the album for this track (0 to 100) */
  albumRating?: number;
  /** the bookmark time of the track in seconds */
  bookmark?: number;
  /** is the playback position for this track remembered? */
  bookmarkable?: boolean;
  /** the category of the track */
  category?: string;
  /** freeform notes about the track */
  comment?: string;
  /** the description of the track */
  description?: string;
  /** the artist/source of the track */
  director?: string;
  /** the total number of discs in the source album */
  discCount?: number;
  /** the index of the disc containing this track on the source album */
  discNumber?: number;
  /** is this track checked for playback? */
  enabled?: boolean;
  /** the episode ID of the track */
  episodeID?: string;
  /** the episode number of the track */
  episodeNumber?: number;
  /** the stop time of the track in seconds */
  finish?: number;
  /** the genre (category) of the track */
  genre?: string;
  /** the grouping (piece) of the track. Generally used to denote movements within a classical work. */
  grouping?: string;
  /** the long description of the track */
  longDescription?: string;
  /** the media kind of the track */
  mediaKind?: string;
  /** number of times this track has been played */
  playedCount?: number;
  /** the date and time this track was last played */
  playedDate?: Date;
  /** the rating of this track (0 to 100) */
  rating?: number;
  /** the season number of the track */
  seasonNumber?: number;
  /** number of times this track has been skipped */
  skippedCount?: number;
  /** the date and time this track was last skipped */
  skippedDate?: Date;
  /** the show name of the track */
  show?: string;
  /** override string to use for the track when sorting by album */
  sortAlbum?: string;
  /** override string to use for the track when sorting by artist */
  sortDirector?: string;
  /** override string to use for the track when sorting by name */
  sortName?: string;
  /** override string to use for the track when sorting by show name */
  sortShow?: string;
  /** the start time of the track in seconds */
  start?: number;
  /** the total number of tracks on the source album */
  trackCount?: number;
  /** the index of the track on the source album */
  trackNumber?: number;
  /** is this track unplayed? */
  unplayed?: boolean;
  /** relative volume adjustment of the track (-100% to 100%) */
  volumeAdjustment?: number;
  /** the year the track was recorded/released */
  year?: number;
}

/** Input for updating a Track */
export type TrackUpdateInput = Partial<TrackCreateInput>;

/** a track representing a network stream */
export interface URLTrack {
  /** Unique identifier for this track */
  id: number;
  /** the URL for this track */
  address: string;
}

/** Input for creating a URLTrack */
export interface URLTrackCreateInput {
  /** the URL for this track */
  address?: string;
}

/** Input for updating a URLTrack */
export type URLTrackUpdateInput = Partial<URLTrackCreateInput>;

/** custom playlists created by the user */
export interface UserPlaylist {
  /** Unique identifier for this playlist */
  id: number;
  /** is this playlist shared? */
  shared: boolean;
  /** is this a Smart Playlist? */
  smart: boolean;
}

/** Input for creating a UserPlaylist */
export interface UserPlaylistCreateInput {
  /** is this playlist shared? */
  shared?: boolean;
}

/** Input for updating a UserPlaylist */
export type UserPlaylistUpdateInput = Partial<UserPlaylistCreateInput>;

/** the video window */
export interface VideoWindow {
  /** Unique identifier for this window */
  id: number;
}

/** Input for creating a VideoWindow */
export type VideoWindowCreateInput = Record<string, never>;

/** Input for updating a VideoWindow */
export type VideoWindowUpdateInput = Partial<VideoWindowCreateInput>;

// Zod schemas for runtime validation

export const ArtworkSchema = z.object({
  id: z.number(),
  data: z.string(),
  description: z.string(),
  downloaded: z.boolean(),
  format: z.string(),
  kind: z.number(),
  rawData: z.unknown(),
});

export const BrowserWindowSchema = z.object({
  id: z.number(),
  selection: z.string(),
  view: z.string(),
});

export const FileTrackSchema = z.object({
  id: z.number(),
  location: z.string(),
});

export const LibraryPlaylistSchema = z.object({
  id: z.number(),
});

export const PlaylistSchema = z.object({
  id: z.number(),
  description: z.string(),
  duration: z.number(),
  name: z.string(),
  parent: z.string(),
  size: z.number(),
  specialKind: z.string(),
  time: z.string(),
  visible: z.boolean(),
});

export const PlaylistWindowSchema = z.object({
  id: z.number(),
  selection: z.string(),
  view: z.string(),
});

export const SharedTrackSchema = z.object({
  id: z.number(),
});

export const SourceSchema = z.object({
  id: z.number(),
  capacity: z.number(),
  freeSpace: z.number(),
  kind: z.string(),
});

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
});

export const URLTrackSchema = z.object({
  id: z.number(),
  address: z.string(),
});

export const UserPlaylistSchema = z.object({
  id: z.number(),
  shared: z.boolean(),
  smart: z.boolean(),
});

export const VideoWindowSchema = z.object({
  id: z.number(),
});
