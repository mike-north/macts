import type { CliPlugin } from '@macts/cli';
import { ListDocumentsCommand } from './commands/documents/list.js';
import { CreateDocumentCommand } from './commands/documents/create.js';
import { GetDocumentCommand } from './commands/documents/get.js';
import { OpenURLCommand } from './commands/open-url.js';
import { PlayCommand } from './commands/play.js';
import { StartCommand } from './commands/start.js';
import { PauseCommand } from './commands/pause.js';
import { ResumeCommand } from './commands/resume.js';
import { StopCommand } from './commands/stop.js';
import { StepBackwardCommand } from './commands/step-backward.js';
import { StepForwardCommand } from './commands/step-forward.js';
import { TrimCommand } from './commands/trim.js';
import { PresentCommand } from './commands/present.js';
import { NewMovieRecordingCommand } from './commands/new-movie-recording.js';
import { NewAudioRecordingCommand } from './commands/new-audio-recording.js';
import { NewScreenRecordingCommand } from './commands/new-screen-recording.js';
import { ExportCommand } from './commands/export.js';
import { ShowRemoteHudCommand } from './commands/show-remote-hud.js';

/**
 * CLI plugin for QuickTime Player.
 */
export const plugin: CliPlugin = {
  name: 'quicktime-player',
  description: 'Commands for QuickTime Player',
  commands: [
    ListDocumentsCommand,
    CreateDocumentCommand,
    GetDocumentCommand,
    OpenURLCommand,
    PlayCommand,
    StartCommand,
    PauseCommand,
    ResumeCommand,
    StopCommand,
    StepBackwardCommand,
    StepForwardCommand,
    TrimCommand,
    PresentCommand,
    NewMovieRecordingCommand,
    NewAudioRecordingCommand,
    NewScreenRecordingCommand,
    ExportCommand,
    ShowRemoteHudCommand,
  ],
};
