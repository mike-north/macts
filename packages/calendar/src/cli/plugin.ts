import type { CliPlugin } from '@macts/cli'
import { ListCalendarsCommand } from './commands/calendars/list.js'
import { CreateCalendarCommand } from './commands/calendars/create.js'
import { GetCalendarCommand } from './commands/calendars/get.js'
import { ListEventsCommand } from './commands/calendars/events/list.js'
import { CreateEventCommand } from './commands/calendars/events/create.js'
import { GetEventCommand } from './commands/calendars/events/get.js'
import { ShowEventCommand } from './commands/calendars/events/show.js'
import { ReloadCalendarsCommand } from './commands/reload-calendars.js'
import { SwitchViewCommand } from './commands/switch-view.js'
import { ViewCalendarCommand } from './commands/view-calendar.js'

/**
 * CLI plugin for Calendar.
 */
export const plugin: CliPlugin = {
  name: 'calendar',
  description: 'Commands for Calendar',
  commands: [
    ListCalendarsCommand,
    CreateCalendarCommand,
    GetCalendarCommand,
    ListEventsCommand,
    CreateEventCommand,
    GetEventCommand,
    ShowEventCommand,
    ReloadCalendarsCommand,
    SwitchViewCommand,
    ViewCalendarCommand,
  ],
}
