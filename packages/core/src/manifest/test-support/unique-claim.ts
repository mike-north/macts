/**
 * The manifest evidence a test fixture resource carries for its list to page.
 *
 * A list pages only when its resource's primary identifier is claimed unique
 * and the resource records a supported range read (`listOperationPages`).
 * Fixtures that exercise paging spread {@link UNIQUE_CLAIM} into their primary
 * identifier entry and {@link RANGE_READ_SUPPORTED} into the resource;
 * fixtures that exercise a list returning its whole collection leave one or
 * both out, or carry {@link RANGE_READ_FAILED}.
 */
import type { ResourceRangeRead } from '../schemas/resource.js'

export const UNIQUE_CLAIM = {
  unique: true,
  evidence: { unique: { source: 'curated', note: 'Test fixture: no two items share an id' } },
} as const

/** A resource-level marker that the fixture app reads ranges of the collection. */
export const RANGE_READ_SUPPORTED = {
  rangeRead: {
    supported: true,
    read: 'range',
    evidence: {
      source: 'probe',
      observedAt: '2026-01-15T10:30:00.000Z',
      bundleId: 'com.example.fixture',
      appVersion: '1.0',
      osVersion: '27.2',
      pageMs: 400,
      columnMs: 900,
      items: 120,
      note: 'Test fixture: range reads of the collection succeeded',
    },
  },
} as const

/** A resource-level marker that the fixture app's range reads of the collection failed. */
export const RANGE_READ_FAILED: { readonly rangeRead: ResourceRangeRead } = {
  rangeRead: {
    supported: false,
    evidence: {
      source: 'probe',
      observedAt: '2026-01-15T10:30:00.000Z',
      bundleId: 'com.example.fixture',
      appVersion: '1.0',
      osVersion: '27.2',
      errorNumbers: [-1708],
    },
  },
}
