import type { CliPlugin } from '@macts/cli';
import { ListCalendarsCommand } from './commands/calendars/list.js';
import { CreateCalendarCommand } from './commands/calendars/create.js';
import { GetCalendarCommand } from './commands/calendars/get.js';
import { ListEventsCommand } from './commands/calendars/events/list.js';
import { CreateEventCommand } from './commands/calendars/events/create.js';
import { GetEventCommand } from './commands/calendars/events/get.js';
import { ShowEventCommand } from './commands/calendars/events/show.js';
import { ListAttendeesCommand } from './commands/calendars/events/attendees/list.js';
import { GetAttendeeCommand } from './commands/calendars/events/attendees/get.js';
import { ListDisplayAlarmsCommand } from './commands/calendars/events/displayAlarms/list.js';
import { CreateDisplayAlarmCommand } from './commands/calendars/events/displayAlarms/create.js';
import { GetDisplayAlarmCommand } from './commands/calendars/events/displayAlarms/get.js';
import { ListMailAlarmsCommand } from './commands/calendars/events/mailAlarms/list.js';
import { CreateMailAlarmCommand } from './commands/calendars/events/mailAlarms/create.js';
import { GetMailAlarmCommand } from './commands/calendars/events/mailAlarms/get.js';
import { ListSoundAlarmsCommand } from './commands/calendars/events/soundAlarms/list.js';
import { CreateSoundAlarmCommand } from './commands/calendars/events/soundAlarms/create.js';
import { GetSoundAlarmCommand } from './commands/calendars/events/soundAlarms/get.js';
import { ListOpenFileAlarmsCommand } from './commands/calendars/events/openFileAlarms/list.js';
import { CreateOpenFileAlarmCommand } from './commands/calendars/events/openFileAlarms/create.js';
import { GetOpenFileAlarmCommand } from './commands/calendars/events/openFileAlarms/get.js';
import { ReloadCalendarsCommand } from './commands/reload-calendars.js';
import { SwitchViewCommand } from './commands/switch-view.js';
import { ViewCalendarCommand } from './commands/view-calendar.js';

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
    ListAttendeesCommand,
    GetAttendeeCommand,
    ListDisplayAlarmsCommand,
    CreateDisplayAlarmCommand,
    GetDisplayAlarmCommand,
    ListMailAlarmsCommand,
    CreateMailAlarmCommand,
    GetMailAlarmCommand,
    ListSoundAlarmsCommand,
    CreateSoundAlarmCommand,
    GetSoundAlarmCommand,
    ListOpenFileAlarmsCommand,
    CreateOpenFileAlarmCommand,
    GetOpenFileAlarmCommand,
    ReloadCalendarsCommand,
    SwitchViewCommand,
    ViewCalendarCommand,
  ],
};
