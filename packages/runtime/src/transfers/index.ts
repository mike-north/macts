/**
 * Binary transfers: the persistent, subject-bound record of file grants and
 * download links, with their lifetimes, and the limits every kind of transfer
 * is held to (phases/13, D8).
 *
 * @packageDocumentation
 */

export {
  createTransferStore,
  type CreateTransferStoreOptions,
  type DownloadLinkTarget,
  type FileGrantRecord,
  type GrantedFile,
  type IssuedDownloadLink,
  type IssuedFileGrant,
  type TransferStore,
} from './store.js'
export {
  CONSUMED_UPLOAD_RETENTION_MS,
  DEFAULT_TRANSFER_LIMITS,
  DOWNLOAD_LINK_TTL_MS,
  FILE_GRANT_TTL_MS,
  MAX_OUTSTANDING_UPLOAD_BYTES_PER_SUBJECT,
  MAX_OUTSTANDING_UPLOADS_PER_SUBJECT,
  MAX_UPLOAD_BYTES,
  TEMPORARY_COPY_TTL_MS,
  UPLOAD_TTL_MS,
  type TransferLimits,
} from './limits.js'
