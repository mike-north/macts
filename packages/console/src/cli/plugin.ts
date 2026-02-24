import type { CliPlugin } from '@macts/cli'
import { ListDevicesCommand } from './commands/devices/list.js'
import { GetDeviceCommand } from './commands/devices/get.js'
import { SelectDeviceCommand } from './commands/select-device.js'

/**
 * CLI plugin for Console.
 */
export const plugin: CliPlugin = {
  name: 'console',
  description: 'Commands for Console',
  commands: [ListDevicesCommand, GetDeviceCommand, SelectDeviceCommand],
}
