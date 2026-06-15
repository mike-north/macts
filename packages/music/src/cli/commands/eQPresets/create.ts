import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new eqpreset.
 */
export class CreateEQPresetCommand extends Command {
  static override paths = [['music', 'eQPresets', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new eqpreset',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  band1 = Option.String('--band1', {
    required: true,
    description: 'the equalizer 32 Hz band level (-12.0 dB to +12.0 dB)',
  })
  band2 = Option.String('--band2', {
    required: true,
    description: 'the equalizer 64 Hz band level (-12.0 dB to +12.0 dB)',
  })
  band3 = Option.String('--band3', {
    required: true,
    description: 'the equalizer 125 Hz band level (-12.0 dB to +12.0 dB)',
  })
  band4 = Option.String('--band4', {
    required: true,
    description: 'the equalizer 250 Hz band level (-12.0 dB to +12.0 dB)',
  })
  band5 = Option.String('--band5', {
    required: true,
    description: 'the equalizer 500 Hz band level (-12.0 dB to +12.0 dB)',
  })
  band6 = Option.String('--band6', {
    required: true,
    description: 'the equalizer 1 kHz band level (-12.0 dB to +12.0 dB)',
  })
  band7 = Option.String('--band7', {
    required: true,
    description: 'the equalizer 2 kHz band level (-12.0 dB to +12.0 dB)',
  })
  band8 = Option.String('--band8', {
    required: true,
    description: 'the equalizer 4 kHz band level (-12.0 dB to +12.0 dB)',
  })
  band9 = Option.String('--band9', {
    required: true,
    description: 'the equalizer 8 kHz band level (-12.0 dB to +12.0 dB)',
  })
  band10 = Option.String('--band10', {
    required: true,
    description: 'the equalizer 16 kHz band level (-12.0 dB to +12.0 dB)',
  })
  preamp = Option.String('--preamp', {
    required: true,
    description: 'the equalizer preamp level (-12.0 dB to +12.0 dB)',
  })
  updateTracks = Option.Boolean('--update-tracks', {
    description:
      'should tracks which refer to this preset be updated when the preset is renamed or deleted?',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.eqpresets.create({
        band1: this.band1,
        band2: this.band2,
        band3: this.band3,
        band4: this.band4,
        band5: this.band5,
        band6: this.band6,
        band7: this.band7,
        band8: this.band8,
        band9: this.band9,
        band10: this.band10,
        preamp: this.preamp,
        updateTracks: this.updateTracks,
      } as unknown as Parameters<typeof client.eqpresets.create>[0])

      const output = formatter.format({
        message: 'EQPreset created successfully',
        band1: item.band1,
        band2: item.band2,
        band3: item.band3,
        band4: item.band4,
        band5: item.band5,
        band6: item.band6,
        band7: item.band7,
        band8: item.band8,
        band9: item.band9,
        band10: item.band10,
        modifiable: item.modifiable,
        preamp: item.preamp,
        updateTracks: item.updateTracks,
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
