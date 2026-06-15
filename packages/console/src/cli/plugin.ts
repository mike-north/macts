import type { CliPlugin } from '@macts/cli'
import { SelectDeviceCommand } from './commands/select-device.js'

/**
 * CLI plugin for Console.
 */
export const plugin: CliPlugin = {
  name: 'console',
  description: 'Commands for Console',
  commands: [SelectDeviceCommand],
}
