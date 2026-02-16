# @macts/sdk-calendar

TypeScript SDK for macOS Calendar.app automation.

## Installation

```bash
npm install @macts/sdk-calendar
```

## Usage

```typescript
import { Calendar } from '@macts/sdk-calendar';

const app = new Calendar();

// List all calendars
const calendars = await app.calendars.list();

// Get a specific calendar
const work = await app.calendars.get('work-uid');

// Create an event
const event = await work.events.create({
  summary: 'Team standup',
  startDate: new Date('2026-02-16T09:00:00'),
  endDate: new Date('2026-02-16T09:30:00'),
});

// Update an event
await event.update({ location: 'Room 4B' });

// Show event in Calendar.app
await event.show();
```

## Generation

This package is generated from the Calendar.app manifest. The SDK code is produced by:

```bash
macts generate sdk-calendar
```

Do not manually edit files in `src/` - they will be overwritten on the next generation.

## Testing

This package includes integration tests that verify the SDK against a real Calendar.app instance. Tests use the attest-it pattern to skip when Calendar.app is not available.

```bash
npm test
```

## License

MIT
