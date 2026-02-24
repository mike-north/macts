import type { CliPlugin } from '@macts/cli'
import { ListAirPlayDevicesCommand } from './commands/airPlayDevices/list.js'
import { CreateAirPlayDeviceCommand } from './commands/airPlayDevices/create.js'
import { GetAirPlayDeviceCommand } from './commands/airPlayDevices/get.js'
import { ListBrowserWindowsCommand } from './commands/browserWindows/list.js'
import { CreateBrowserWindowCommand } from './commands/browserWindows/create.js'
import { GetBrowserWindowCommand } from './commands/browserWindows/get.js'
import { ListEncodersCommand } from './commands/encoders/list.js'
import { CreateEncoderCommand } from './commands/encoders/create.js'
import { GetEncoderCommand } from './commands/encoders/get.js'
import { ListEQPresetsCommand } from './commands/eQPresets/list.js'
import { CreateEQPresetCommand } from './commands/eQPresets/create.js'
import { GetEQPresetCommand } from './commands/eQPresets/get.js'
import { ListEQWindowsCommand } from './commands/eQWindows/list.js'
import { CreateEQWindowCommand } from './commands/eQWindows/create.js'
import { GetEQWindowCommand } from './commands/eQWindows/get.js'
import { ListMiniplayerWindowsCommand } from './commands/miniplayerWindows/list.js'
import { CreateMiniplayerWindowCommand } from './commands/miniplayerWindows/create.js'
import { GetMiniplayerWindowCommand } from './commands/miniplayerWindows/get.js'
import { ListPlaylistsCommand } from './commands/playlists/list.js'
import { CreatePlaylistCommand } from './commands/playlists/create.js'
import { GetPlaylistCommand } from './commands/playlists/get.js'
import { MovePlaylistCommand } from './commands/playlists/move.js'
import { SearchPlaylistCommand } from './commands/playlists/search.js'
import { ListTracksCommand } from './commands/playlists/tracks/list.js'
import { CreateTrackCommand } from './commands/playlists/tracks/create.js'
import { GetTrackCommand } from './commands/playlists/tracks/get.js'
import { ListArtworksCommand } from './commands/playlists/tracks/artworks/list.js'
import { CreateArtworkCommand } from './commands/playlists/tracks/artworks/create.js'
import { GetArtworkCommand } from './commands/playlists/tracks/artworks/get.js'
import { ListPlaylistWindowsCommand } from './commands/playlistWindows/list.js'
import { CreatePlaylistWindowCommand } from './commands/playlistWindows/create.js'
import { GetPlaylistWindowCommand } from './commands/playlistWindows/get.js'
import { ListSourcesCommand } from './commands/sources/list.js'
import { CreateSourceCommand } from './commands/sources/create.js'
import { GetSourceCommand } from './commands/sources/get.js'
import { ListAudioCDPlaylistsCommand } from './commands/sources/audioCDPlaylists/list.js'
import { CreateAudioCDPlaylistCommand } from './commands/sources/audioCDPlaylists/create.js'
import { GetAudioCDPlaylistCommand } from './commands/sources/audioCDPlaylists/get.js'
import { ListAudioCDTracksCommand } from './commands/sources/audioCDPlaylists/audioCDTracks/list.js'
import { CreateAudioCDTrackCommand } from './commands/sources/audioCDPlaylists/audioCDTracks/create.js'
import { GetAudioCDTrackCommand } from './commands/sources/audioCDPlaylists/audioCDTracks/get.js'
import { ListLibraryPlaylistsCommand } from './commands/sources/libraryPlaylists/list.js'
import { CreateLibraryPlaylistCommand } from './commands/sources/libraryPlaylists/create.js'
import { GetLibraryPlaylistCommand } from './commands/sources/libraryPlaylists/get.js'
import { ListFileTracksCommand } from './commands/sources/libraryPlaylists/fileTracks/list.js'
import { CreateFileTrackCommand } from './commands/sources/libraryPlaylists/fileTracks/create.js'
import { GetFileTrackCommand } from './commands/sources/libraryPlaylists/fileTracks/get.js'
import { RefreshFileTrackCommand } from './commands/sources/libraryPlaylists/fileTracks/refresh.js'
import { ListURLTracksCommand } from './commands/sources/libraryPlaylists/uRLTracks/list.js'
import { CreateURLTrackCommand } from './commands/sources/libraryPlaylists/uRLTracks/create.js'
import { GetURLTrackCommand } from './commands/sources/libraryPlaylists/uRLTracks/get.js'
import { ListSharedTracksCommand } from './commands/sources/libraryPlaylists/sharedTracks/list.js'
import { CreateSharedTrackCommand } from './commands/sources/libraryPlaylists/sharedTracks/create.js'
import { GetSharedTrackCommand } from './commands/sources/libraryPlaylists/sharedTracks/get.js'
import { ListRadioTunerPlaylistsCommand } from './commands/sources/radioTunerPlaylists/list.js'
import { CreateRadioTunerPlaylistCommand } from './commands/sources/radioTunerPlaylists/create.js'
import { GetRadioTunerPlaylistCommand } from './commands/sources/radioTunerPlaylists/get.js'
import { ListSubscriptionPlaylistsCommand } from './commands/sources/subscriptionPlaylists/list.js'
import { CreateSubscriptionPlaylistCommand } from './commands/sources/subscriptionPlaylists/create.js'
import { GetSubscriptionPlaylistCommand } from './commands/sources/subscriptionPlaylists/get.js'
import { ListUserPlaylistsCommand } from './commands/sources/userPlaylists/list.js'
import { CreateUserPlaylistCommand } from './commands/sources/userPlaylists/create.js'
import { GetUserPlaylistCommand } from './commands/sources/userPlaylists/get.js'
import { ListVideoWindowsCommand } from './commands/videoWindows/list.js'
import { CreateVideoWindowCommand } from './commands/videoWindows/create.js'
import { GetVideoWindowCommand } from './commands/videoWindows/get.js'
import { ListVisualsCommand } from './commands/visuals/list.js'
import { CreateVisualCommand } from './commands/visuals/create.js'
import { GetVisualCommand } from './commands/visuals/get.js'
import { PrintCommand } from './commands/print.js'
import { CloseCommand } from './commands/close.js'
import { CountCommand } from './commands/count.js'
import { DeleteCommand } from './commands/delete.js'
import { DuplicateCommand } from './commands/duplicate.js'
import { ExistsCommand } from './commands/exists.js'
import { MakeCommand } from './commands/make.js'
import { OpenCommand } from './commands/open.js'
import { RunCommand } from './commands/run.js'
import { QuitCommand } from './commands/quit.js'
import { SaveCommand } from './commands/save.js'
import { AddCommand } from './commands/add.js'
import { BackTrackCommand } from './commands/back-track.js'
import { ConvertCommand } from './commands/convert.js'
import { DownloadCommand } from './commands/download.js'
import { ExportCommand } from './commands/export.js'
import { FastForwardCommand } from './commands/fast-forward.js'
import { NextTrackCommand } from './commands/next-track.js'
import { PauseCommand } from './commands/pause.js'
import { PlayCommand } from './commands/play.js'
import { PlaypauseCommand } from './commands/playpause.js'
import { PreviousTrackCommand } from './commands/previous-track.js'
import { ResumeCommand } from './commands/resume.js'
import { RevealCommand } from './commands/reveal.js'
import { RewindCommand } from './commands/rewind.js'
import { SelectCommand } from './commands/select.js'
import { StopCommand } from './commands/stop.js'
import { OpenLocationCommand } from './commands/open-location.js'

/**
 * CLI plugin for Music.
 */
export const plugin: CliPlugin = {
  name: 'music',
  description: 'Commands for Music',
  commands: [
    ListAirPlayDevicesCommand,
    CreateAirPlayDeviceCommand,
    GetAirPlayDeviceCommand,
    ListBrowserWindowsCommand,
    CreateBrowserWindowCommand,
    GetBrowserWindowCommand,
    ListEncodersCommand,
    CreateEncoderCommand,
    GetEncoderCommand,
    ListEQPresetsCommand,
    CreateEQPresetCommand,
    GetEQPresetCommand,
    ListEQWindowsCommand,
    CreateEQWindowCommand,
    GetEQWindowCommand,
    ListMiniplayerWindowsCommand,
    CreateMiniplayerWindowCommand,
    GetMiniplayerWindowCommand,
    ListPlaylistsCommand,
    CreatePlaylistCommand,
    GetPlaylistCommand,
    MovePlaylistCommand,
    SearchPlaylistCommand,
    ListTracksCommand,
    CreateTrackCommand,
    GetTrackCommand,
    ListArtworksCommand,
    CreateArtworkCommand,
    GetArtworkCommand,
    ListPlaylistWindowsCommand,
    CreatePlaylistWindowCommand,
    GetPlaylistWindowCommand,
    ListSourcesCommand,
    CreateSourceCommand,
    GetSourceCommand,
    ListAudioCDPlaylistsCommand,
    CreateAudioCDPlaylistCommand,
    GetAudioCDPlaylistCommand,
    ListAudioCDTracksCommand,
    CreateAudioCDTrackCommand,
    GetAudioCDTrackCommand,
    ListLibraryPlaylistsCommand,
    CreateLibraryPlaylistCommand,
    GetLibraryPlaylistCommand,
    ListFileTracksCommand,
    CreateFileTrackCommand,
    GetFileTrackCommand,
    RefreshFileTrackCommand,
    ListURLTracksCommand,
    CreateURLTrackCommand,
    GetURLTrackCommand,
    ListSharedTracksCommand,
    CreateSharedTrackCommand,
    GetSharedTrackCommand,
    ListRadioTunerPlaylistsCommand,
    CreateRadioTunerPlaylistCommand,
    GetRadioTunerPlaylistCommand,
    ListSubscriptionPlaylistsCommand,
    CreateSubscriptionPlaylistCommand,
    GetSubscriptionPlaylistCommand,
    ListUserPlaylistsCommand,
    CreateUserPlaylistCommand,
    GetUserPlaylistCommand,
    ListVideoWindowsCommand,
    CreateVideoWindowCommand,
    GetVideoWindowCommand,
    ListVisualsCommand,
    CreateVisualCommand,
    GetVisualCommand,
    PrintCommand,
    CloseCommand,
    CountCommand,
    DeleteCommand,
    DuplicateCommand,
    ExistsCommand,
    MakeCommand,
    OpenCommand,
    RunCommand,
    QuitCommand,
    SaveCommand,
    AddCommand,
    BackTrackCommand,
    ConvertCommand,
    DownloadCommand,
    ExportCommand,
    FastForwardCommand,
    NextTrackCommand,
    PauseCommand,
    PlayCommand,
    PlaypauseCommand,
    PreviousTrackCommand,
    ResumeCommand,
    RevealCommand,
    RewindCommand,
    SelectCommand,
    StopCommand,
    OpenLocationCommand,
  ],
}
