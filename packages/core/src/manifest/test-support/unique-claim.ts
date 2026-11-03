/**
 * A uniqueness claim, with its evidence, for test fixture identifiers.
 *
 * A list pages only when its resource's primary identifier is claimed unique
 * (`listOperationPages`). Fixtures that exercise paging spread this into their
 * primary identifier entry; fixtures that exercise a list returning its whole
 * collection leave it out.
 */
export const UNIQUE_CLAIM = {
  unique: true,
  evidence: { unique: { source: 'curated', note: 'Test fixture: no two items share an id' } },
} as const
