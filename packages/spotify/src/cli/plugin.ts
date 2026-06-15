import type { CliPlugin } from '@macts/cli'
import { NextTrackCommand } from './commands/next-track.js'
import { PreviousTrackCommand } from './commands/previous-track.js'
import { PlaypauseCommand } from './commands/playpause.js'
import { PauseCommand } from './commands/pause.js'
import { PlayCommand } from './commands/play.js'
import { PlayTrackCommand } from './commands/play-track.js'

/**
 * CLI plugin for Spotify.
 */
export const plugin: CliPlugin = {
  name: 'spotify',
  description: 'Commands for Spotify',
  commands: [
    NextTrackCommand,
    PreviousTrackCommand,
    PlaypauseCommand,
    PauseCommand,
    PlayCommand,
    PlayTrackCommand,
  ],
}
