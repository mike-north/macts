import type { CliPlugin } from '@macts/cli'
import { MovePlaylistCommand } from './commands/playlists/move.js'
import { SearchPlaylistCommand } from './commands/playlists/search.js'
import { RefreshFileTrackCommand } from './commands/sources/libraryPlaylists/fileTracks/refresh.js'
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
    MovePlaylistCommand,
    SearchPlaylistCommand,
    RefreshFileTrackCommand,
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
