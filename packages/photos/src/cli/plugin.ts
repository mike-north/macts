import type { CliPlugin } from '@macts/cli'
import { ListAlbumsCommand } from './commands/albums/list.js'
import { GetAlbumCommand } from './commands/albums/get.js'
import { ListMediaItemsCommand } from './commands/albums/mediaItems/list.js'
import { GetMediaItemCommand } from './commands/albums/mediaItems/get.js'
import { DuplicateMediaItemCommand } from './commands/albums/mediaItems/duplicate.js'
import { ListFoldersCommand } from './commands/folders/list.js'
import { GetFolderCommand } from './commands/folders/get.js'
import { ListContainersCommand } from './commands/folders/containers/list.js'
import { GetContainerCommand } from './commands/folders/containers/get.js'
import { ListMomentsCommand } from './commands/moments/list.js'
import { GetMomentCommand } from './commands/moments/get.js'
import { ImportCommand } from './commands/import.js'
import { ExportCommand } from './commands/export.js'
import { MakeCommand } from './commands/make.js'
import { DeleteCommand } from './commands/delete.js'
import { AddCommand } from './commands/add.js'
import { StartSlideshowCommand } from './commands/start-slideshow.js'
import { StopSlideshowCommand } from './commands/stop-slideshow.js'
import { NextSlideCommand } from './commands/next-slide.js'
import { PreviousSlideCommand } from './commands/previous-slide.js'
import { PauseSlideshowCommand } from './commands/pause-slideshow.js'
import { ResumeSlideshowCommand } from './commands/resume-slideshow.js'
import { SpotlightCommand } from './commands/spotlight.js'
import { SearchCommand } from './commands/search.js'

/**
 * CLI plugin for Photos.
 */
export const plugin: CliPlugin = {
  name: 'photos',
  description: 'Commands for Photos',
  commands: [
    ListAlbumsCommand,
    GetAlbumCommand,
    ListMediaItemsCommand,
    GetMediaItemCommand,
    DuplicateMediaItemCommand,
    ListFoldersCommand,
    GetFolderCommand,
    ListContainersCommand,
    GetContainerCommand,
    ListMomentsCommand,
    GetMomentCommand,
    ImportCommand,
    ExportCommand,
    MakeCommand,
    DeleteCommand,
    AddCommand,
    StartSlideshowCommand,
    StopSlideshowCommand,
    NextSlideCommand,
    PreviousSlideCommand,
    PauseSlideshowCommand,
    ResumeSlideshowCommand,
    SpotlightCommand,
    SearchCommand,
  ],
}
