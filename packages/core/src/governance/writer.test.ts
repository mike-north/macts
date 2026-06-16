/**
 * Runtime tests for the durable audit-record file writer.
 *
 * Tests use OS temp directories (via `node:os.tmpdir()` + `fs.mkdtemp`) so
 * they do not touch the project tree. All timestamps are fixed constants
 * (never `new Date()` / `Date.now()`).
 *
 * AC3 coverage: a capability call produces exactly one durable, well-formed
 * record with all required fields and redacted args. This is demonstrated in
 * the "capability call → durable record" describe block below.
 *
 * @see Issue #7 — Trust & Governance: every capability call is audit-logged.
 * @see Issue #52 — Governance foundation acceptance criteria.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { tmpdir } from 'node:os'
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createFileAuditWriter } from './writer.js'
import { createAuditRecord, serializeAuditRecord } from './audit.js'
import { redactArgs } from './redaction.js'
import type { AuditRecord, SerializedAuditRecord } from './audit.js'

// Fixed, deterministic timestamps — never Date.now() or new Date() in test data.
const TIMESTAMP_A = new Date('2026-06-14T10:42:12.000Z')
const TIMESTAMP_B = new Date('2026-06-14T11:00:00.000Z')

/** Minimal well-formed record for writer tests. */
function makeRecord(overrides: Partial<Parameters<typeof createAuditRecord>[0]> = {}): AuditRecord {
  return createAuditRecord({
    capability: 'calendar:events:create',
    app: 'calendar',
    argsSummary: 'calendar: Work; summary: Team Meeting; attendees: 3',
    apiKeyId: 'assistant-calendar-writer',
    decision: 'allowed',
    timestamp: TIMESTAMP_A,
    ...overrides,
  })
}

/** Parse a JSON-lines file into an array of parsed objects. */
async function readJsonLines(filePath: string): Promise<SerializedAuditRecord[]> {
  const text = await readFile(filePath, 'utf8')
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as SerializedAuditRecord)
}

// Track temp directories created during tests so we can clean up.
const createdDirs: string[] = []

afterEach(async () => {
  for (const dir of createdDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true })
  }
})

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'macts-writer-test-'))
  createdDirs.push(dir)
  return dir
}

// ---------------------------------------------------------------------------
// Basic write behaviour
// ---------------------------------------------------------------------------

describe('createFileAuditWriter — basic write behaviour', () => {
  it('appends one JSON-line per record (single record)', async () => {
    const dir = await makeTempDir()
    const logPath = join(dir, 'audit.jsonl')
    const writer = createFileAuditWriter(logPath)

    await writer.append(makeRecord())

    const lines = await readJsonLines(logPath)
    expect(lines).toHaveLength(1)
  })

  it('each appended record is a well-formed serialized audit record', async () => {
    const dir = await makeTempDir()
    const logPath = join(dir, 'audit.jsonl')
    const writer = createFileAuditWriter(logPath)
    const record = makeRecord()

    await writer.append(record)

    const [line] = await readJsonLines(logPath)
    // Derive expected from the spec (serializeAuditRecord) — not from the file contents.
    const expected: SerializedAuditRecord = serializeAuditRecord(record)
    expect(line).toEqual(expected)
  })

  it('accumulates multiple records across sequential appends', async () => {
    const dir = await makeTempDir()
    const logPath = join(dir, 'audit.jsonl')
    const writer = createFileAuditWriter(logPath)

    const r1 = makeRecord({ decision: 'allowed', timestamp: TIMESTAMP_A })
    const r2 = makeRecord({
      capability: 'reminders:lists:delete',
      app: 'reminders',
      decision: 'denied',
      timestamp: TIMESTAMP_B,
      reason: 'operation forbidden by policy',
    })

    await writer.append(r1)
    await writer.append(r2)

    const lines = await readJsonLines(logPath)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toEqual(serializeAuditRecord(r1))
    expect(lines[1]).toEqual(serializeAuditRecord(r2))
  })

  it('each line is terminated by a newline (JSON-lines format)', async () => {
    const dir = await makeTempDir()
    const logPath = join(dir, 'audit.jsonl')
    const writer = createFileAuditWriter(logPath)

    await writer.append(makeRecord())

    const raw = await readFile(logPath, 'utf8')
    expect(raw.endsWith('\n')).toBe(true)
    // Only one newline at the end — not two.
    expect(raw.split('\n').filter((l) => l.trim().length === 0)).toHaveLength(1)
  })

  it('a second writer instance appends to the same file (no truncation)', async () => {
    const dir = await makeTempDir()
    const logPath = join(dir, 'audit.jsonl')

    const writer1 = createFileAuditWriter(logPath)
    const writer2 = createFileAuditWriter(logPath)

    await writer1.append(makeRecord({ decision: 'allowed', timestamp: TIMESTAMP_A }))
    await writer2.append(makeRecord({ decision: 'denied', timestamp: TIMESTAMP_B }))

    const lines = await readJsonLines(logPath)
    expect(lines).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Parent-directory creation
// ---------------------------------------------------------------------------

describe('createFileAuditWriter — parent-directory creation', () => {
  it('creates missing parent directories automatically', async () => {
    const dir = await makeTempDir()
    // Nested path that does not yet exist.
    const logPath = join(dir, 'sub', 'nested', 'audit.jsonl')
    const writer = createFileAuditWriter(logPath)

    await writer.append(makeRecord())

    const lines = await readJsonLines(logPath)
    expect(lines).toHaveLength(1)
  })

  it('succeeds when the parent directory already exists', async () => {
    const dir = await makeTempDir()
    const subDir = join(dir, 'existing')
    await mkdir(subDir)
    const logPath = join(subDir, 'audit.jsonl')
    const writer = createFileAuditWriter(logPath)

    await writer.append(makeRecord())

    const lines = await readJsonLines(logPath)
    expect(lines).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('createFileAuditWriter — error handling', () => {
  it('surfaces an error when the path is not writable (directory used as file path)', async () => {
    const dir = await makeTempDir()
    // Attempt to write to a *directory* path — this should fail.
    const writer = createFileAuditWriter(dir)
    await expect(writer.append(makeRecord())).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// AC3: capability call → exactly one durable, well-formed record
// ---------------------------------------------------------------------------

describe('capability call → durable record (AC3)', () => {
  it('produces exactly one well-formed, durable record with redacted args', async () => {
    const dir = await makeTempDir()
    const logPath = join(dir, 'audit.jsonl')
    const writer = createFileAuditWriter(logPath)

    // Raw capability-call inputs (as they would arrive from the enforcement layer).
    const rawArgs: Record<string, unknown> = {
      calendar: 'Work',
      summary: 'Team Meeting',
      attendees: 3,
      // Sensitive — must be redacted in the audit record.
      password: 'hunter2',
    }
    const capabilityName = 'calendar:events:create'
    const app = 'calendar'
    const apiKeyId = 'assistant-calendar-writer'
    // Fixed timestamp — never new Date() / Date.now() in test data.
    const timestamp = new Date('2026-06-14T10:42:12.000Z')
    const decision = 'allowed' as const

    // Step 1 — redact args to produce the argsSummary.
    const argsSummary = redactArgs(rawArgs)
    expect(argsSummary).toContain('password: [redacted]')
    expect(argsSummary).not.toContain('hunter2')

    // Step 2 — construct the audit record (pure, no I/O).
    const record = createAuditRecord({
      capability: capabilityName,
      app,
      argsSummary,
      apiKeyId,
      decision,
      timestamp,
    })

    // Step 3 — write to the durable log.
    await writer.append(record)

    // Step 4 — verify exactly one record is in the log.
    const lines = await readJsonLines(logPath)
    expect(lines).toHaveLength(1)

    // Step 5 — verify all required fields are present and correct.
    const persisted = lines[0]
    expect(persisted).toBeDefined()
    if (!persisted) return

    // Required field: capability
    expect(persisted.capability).toBe('calendar:events:create')
    // Required field: app
    expect(persisted.app).toBe('calendar')
    // Required field: apiKeyId
    expect(persisted.apiKeyId).toBe('assistant-calendar-writer')
    // Required field: decision
    expect(persisted.decision).toBe('allowed')
    // Required field: timestamp (ISO-8601 string)
    expect(persisted.timestamp).toBe('2026-06-14T10:42:12.000Z')
    // Required field: argsSummary — must NOT contain the raw secret.
    expect(persisted.argsSummary).not.toContain('hunter2')
    expect(persisted.argsSummary).toContain('[redacted]')
    // Non-sensitive fields should appear in the summary.
    expect(persisted.argsSummary).toContain('calendar: Work')
    expect(persisted.argsSummary).toContain('summary: Team Meeting')
    expect(persisted.argsSummary).toContain('attendees: 3')
  })
})
