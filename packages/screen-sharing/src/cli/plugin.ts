import type { CliPlugin } from '@macts/cli'
import { ListConnectionsCommand } from './commands/connections/list.js'
import { GetConnectionCommand } from './commands/connections/get.js'
import { GetURLCommand } from './commands/get-url.js'

/**
 * CLI plugin for Screen Sharing.
 */
export const plugin: CliPlugin = {
  name: 'screen-sharing',
  description: 'Commands for Screen Sharing',
  commands: [ListConnectionsCommand, GetConnectionCommand, GetURLCommand],
}
