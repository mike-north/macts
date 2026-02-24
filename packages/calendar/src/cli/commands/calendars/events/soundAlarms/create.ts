import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new soundalarm.
 */
export class CreateSoundAlarmCommand extends Command {
  static override paths = [['calendar', 'calendars', 'events', 'soundAlarms', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new soundalarm',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  calendarId = Option.String('--calendar-id', { required: true, description: 'Calendar ID' })
  eventId = Option.String('--event-id', { required: true, description: 'Event ID' })
  triggerInterval = Option.String('--trigger-interval', {
    required: true,
    description:
      'The interval in minutes between the event and the alarm (positive for after, negative for before)',
  })
  triggerDate = Option.String('--trigger-date', {
    required: true,
    description: 'An absolute alarm date',
  })
  soundName = Option.String('--sound-name', {
    required: true,
    description: 'The system sound name to be used for the alarm',
  })
  soundFile = Option.String('--sound-file', {
    required: true,
    description: 'The (POSIX) path to the sound file to be used for the alarm',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.soundalarms.create({
        triggerInterval: this.triggerInterval,
        triggerDate: this.triggerDate,
        soundName: this.soundName,
        soundFile: this.soundFile,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'SoundAlarm created successfully',
        triggerInterval: item.triggerInterval,
        triggerDate: item.triggerDate,
        soundName: item.soundName,
        soundFile: item.soundFile,
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
