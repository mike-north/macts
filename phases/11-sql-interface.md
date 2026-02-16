# Phase 11: SQL Interface (Speculative)

## Status

**This phase is speculative and may be deferred or cancelled.** The MCP server with good tool descriptions may provide sufficient querying capability for AI agents without a dedicated SQL layer.

## Goal

Build a SQL interface (`@macts/sql`) that allows querying macOS app data using SQL syntax.

## Key Insight

AppleScript/JXA natively supports `whose` clauses that map naturally to SQL WHERE:

```applescript
-- AppleScript
every event of calendar 1 whose allday_event is true

-- SQL equivalent
SELECT * FROM events WHERE calendar_id = 1 AND allday_event = true
```

Pushing filtering to the app's native query engine is more efficient than fetching everything and filtering in memory.

## Architecture

**Hybrid Approach:**

- **Reads → Direct JXA**: Leverage native `whose` clauses for efficient filtering
- **Writes → SDK**: Route through SDK for validation
- **Type Shaping → SDK Schemas**: Use Zod schemas for result transformation

## Key Deliverables

1. **SQL Parser**
   - Parse SQL SELECT/INSERT/UPDATE/DELETE
   - Support WHERE, ORDER BY, LIMIT, OFFSET
   - Support JOINs across hierarchy (events JOIN calendars)

2. **Query Optimizer**
   - Translate WHERE clauses to JXA `whose`
   - Identify optimal traversal path through hierarchy
   - Batch operations where possible

3. **Virtual Table Schema**
   - Generate DDL from manifest
   - Foreign keys from hierarchy
   - Column types from property types

4. **SQL-to-JXA Transpiler**
   - Convert SQL queries to JXA code
   - Handle type coercion
   - Handle null semantics

5. **Plugin System**
   - `@macts/sql-calendar` etc.
   - Tables registered by app plugins

## Example Queries

```sql
-- List all calendars
SELECT * FROM calendars;

-- Find events in a date range
SELECT summary, start_date, end_date
FROM events
WHERE calendar_id = 'work-uid'
  AND start_date >= '2026-03-01'
  AND start_date < '2026-04-01'
ORDER BY start_date;

-- Find all-day events
SELECT e.summary, c.name as calendar_name
FROM events e
JOIN calendars c ON e.calendar_id = c.uid
WHERE e.allday_event = true;

-- Create an event
INSERT INTO events (calendar_id, summary, start_date, end_date)
VALUES ('work-uid', 'Meeting', '2026-03-15T10:00:00', '2026-03-15T11:00:00');

-- Update an event
UPDATE events
SET summary = 'Updated Meeting'
WHERE uid = 'event-123';

-- Delete an event
DELETE FROM events WHERE uid = 'event-123';
```

## Generated DDL

```sql
-- Generated from Calendar manifest
CREATE TABLE calendars (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  writable BOOLEAN,
  description TEXT
);

CREATE TABLE events (
  uid TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL REFERENCES calendars(uid),
  summary TEXT,
  description TEXT,
  start_date DATETIME,
  end_date DATETIME,
  allday_event BOOLEAN DEFAULT false,
  location TEXT,
  url TEXT,
  status TEXT CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  recurrence TEXT
);

CREATE TABLE attendees (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(uid),
  display_name TEXT,
  email TEXT,
  participation_status TEXT CHECK (participation_status IN ('accepted', 'declined', 'tentative', 'pending'))
);
```

## Decision Point

Before implementing, evaluate:

1. **Does MCP provide enough?** If AI agents can effectively query through MCP tools, SQL may be unnecessary complexity.

2. **What's the use case?** SQL is most valuable for:
   - Complex analytical queries
   - Human users who prefer SQL
   - Integration with SQL-based tools

3. **Implementation cost**: SQL parsing, optimization, and transpilation is significant work.

**Recommendation**: Complete phases 0-10, evaluate whether SQL is needed based on real usage patterns.

## Dependencies

- Phase 0-8 (full stack)
- Phase 5 (Calendar SDK - for result type shaping)

## Critical Files (if implemented)

```
packages/sql/
├── package.json
├── src/
│   ├── index.ts
│   ├── parser.ts             # SQL parsing
│   ├── optimizer.ts          # Query optimization
│   ├── transpiler.ts         # SQL → JXA
│   ├── executor.ts           # Execute queries
│   └── plugin-loader.ts

packages/core/src/
├── generator/
│   └── sql/
│       ├── index.ts
│       ├── ddl.ts            # Generate CREATE TABLE
│       └── package.ts

packages/sql-calendar/        # Generated plugin
```

## Success Criteria (if implemented)

- [ ] SELECT queries work with WHERE, ORDER BY, LIMIT
- [ ] INSERT routes through SDK validation
- [ ] UPDATE routes through SDK validation
- [ ] DELETE routes through SDK validation
- [ ] JOINs work across hierarchy
- [ ] Performance competitive with direct SDK for simple queries
- [ ] Clear error messages for unsupported SQL features
