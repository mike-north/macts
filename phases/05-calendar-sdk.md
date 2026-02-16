# Phase 5: Calendar SDK (Reference Implementation)

## Goal

Produce the first complete, working SDK: `@macts/sdk-calendar`. This is the vertical slice that proves the entire pipeline works end-to-end against a real macOS application.

## Why Calendar?

- Ships with every Mac (no purchase required)
- Rich enough to exercise most features (hierarchy, commands, enums)
- Simple enough to be tractable as first implementation
- Well-documented dictionary structure

## Key Deliverables

1. **Complete Calendar Manifest**
   - Hand-crafted `manifests/calendar/app.yaml`
   - All JSON Schema files for resources and commands
   - Source SDEF included for provenance
   - Confidence report (all high-confidence for hand-crafted)

2. **Generated @macts/sdk-calendar Package**
   - Full SDK generated from manifest
   - All resources: Calendar, Event, Attendee, Alarm types
   - All commands: reloadCalendars, switchView, viewCalendar, show, etc.
   - All enums: ParticipationStatus, EventStatus, ViewType

3. **Integration Tests**
   - Real tests against actual Calendar.app
   - Use attest-it for validation seals
   - Tests run locally, seals enforced in CI

4. **Documentation**
   - TSDoc comments on all public APIs
   - README with usage examples
   - API Documenter output for reference docs

## Test Scenarios

```typescript
describe('@macts/sdk-calendar', () => {
  const calendar = new Calendar();

  describe('calendars', () => {
    it('lists all calendars', async () => {
      const calendars = await calendar.calendars.list();
      expect(calendars.length).toBeGreaterThan(0);
      expect(calendars[0]).toHaveProperty('uid');
      expect(calendars[0]).toHaveProperty('name');
    });

    it('gets calendar by uid', async () => {
      const calendars = await calendar.calendars.list();
      const first = calendars[0];
      const fetched = await calendar.calendars.get(first.uid);
      expect(fetched.name).toBe(first.name);
    });

    it('creates and deletes a calendar', async () => {
      const created = await calendar.calendars.create({
        name: 'Test Calendar (macts)',
      });
      expect(created.name).toBe('Test Calendar (macts)');

      await created.delete();

      // Verify deletion
      await expect(calendar.calendars.get(created.uid)).rejects.toThrow();
    });
  });

  describe('events', () => {
    let testCalendar: CalendarInstance;

    beforeAll(async () => {
      testCalendar = await calendar.calendars.create({
        name: 'macts-test-calendar',
      });
    });

    afterAll(async () => {
      await testCalendar.delete();
    });

    it('creates an event with required fields', async () => {
      const event = await testCalendar.events.create({
        summary: 'Test Event',
        startDate: new Date('2026-03-01T10:00:00'),
        endDate: new Date('2026-03-01T11:00:00'),
      });

      expect(event.summary).toBe('Test Event');
      expect(event.uid).toBeDefined();

      await event.delete();
    });

    it('updates event properties', async () => {
      const event = await testCalendar.events.create({
        summary: 'Original Title',
        startDate: new Date('2026-03-01T10:00:00'),
        endDate: new Date('2026-03-01T11:00:00'),
      });

      await event.update({ summary: 'Updated Title' });

      const fetched = await testCalendar.events.get(event.uid);
      expect(fetched.summary).toBe('Updated Title');

      await event.delete();
    });

    it('lists attendees (read-only)', async () => {
      // Create event with attendee via Calendar UI first
      const events = await testCalendar.events.list();
      const withAttendees = events.find((e) => e.attendees?.length > 0);

      if (withAttendees) {
        const attendees = await withAttendees.attendees.list();
        expect(attendees[0]).toHaveProperty('email');
        expect(attendees[0]).toHaveProperty('displayName');
      }
    });
  });

  describe('app commands', () => {
    it('reloads calendars', async () => {
      await expect(calendar.reloadCalendars()).resolves.not.toThrow();
    });

    it('switches view', async () => {
      await expect(calendar.switchView({ to: 'week' })).resolves.not.toThrow();
    });
  });
});
```

## Dependencies

- Phase 0 (project foundation)
- Phase 1 (manifest schemas)
- Phase 2 (SDEF parser - to extract Calendar.sdef)
- Phase 3 (JXA bridge)
- Phase 4 (SDK generation)

## Critical Files

```
manifests/
└── calendar/
    ├── app.yaml
    ├── schemas/
    │   ├── resources/
    │   │   ├── calendar.json
    │   │   ├── event.json
    │   │   ├── attendee.json
    │   │   └── alarm.json
    │   ├── commands/
    │   │   └── switch-view.input.json
    │   └── enums/
    │       ├── participation-status.json
    │       ├── event-status.json
    │       └── view-type.json
    └── source.sdef

packages/sdk-calendar/        # Generated package
    ├── package.json
    ├── src/
    ├── tests/
    │   └── integration.test.ts
    └── attestations/         # attest-it seals
```

## Success Criteria

- [ ] Calendar manifest is complete and validates against schemas
- [ ] SDK generates successfully from manifest
- [ ] SDK compiles without errors
- [ ] All CRUD operations work against real Calendar.app
- [ ] App commands (reloadCalendars, switchView) execute correctly
- [ ] Date handling works correctly (create event, read it back)
- [ ] Enum values serialize/deserialize correctly
- [ ] Validation errors have clear, actionable messages
- [ ] Integration tests pass locally
- [ ] attest-it seals generated and enforced in CI
