import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new airplaydevice.
 */
export class CreateAirPlayDeviceCommand extends Command {
  static override paths = [['music', 'airPlayDevices', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new airplaydevice',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  selected = Option.Boolean('--selected', { description: 'is the device currently selected?' })
  soundVolume = Option.String('--sound-volume', {
    required: true,
    description: 'the output volume for the device (0 = minimum, 100 = maximum)',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.airplaydevices.create({
        selected: this.selected,
        soundVolume: this.soundVolume,
      } as unknown as Parameters<typeof client.airplaydevices.create>[0])

      const output = formatter.format({
        message: 'AirPlayDevice created successfully',
        active: item.active,
        available: item.available,
        kind: item.kind,
        networkAddress: item.networkAddress,
        protected: item.protected,
        selected: item.selected,
        supportsAudio: item.supportsAudio,
        supportsVideo: item.supportsVideo,
        soundVolume: item.soundVolume,
      })

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
