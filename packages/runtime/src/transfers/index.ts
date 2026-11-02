/**
 * Binary transfers: the persistent, subject-bound record of file grants,
 * uploads, download links, and temporary copies, with their lifetimes and
 * limits (phases/13, D8).
 *
 * @packageDocumentation
 */

export {
  createTransferStore,
  type AllocatedTemporaryCopy,
  type AllocateTemporaryCopyOptions,
  type ConsumedUpload,
  type CreatedUpload,
  type CreateTransferStoreOptions,
  type CreateUploadOptions,
  type DownloadLinkTarget,
  type FileGrantRecord,
  type GrantedFile,
  type IssuedDownloadLink,
  type IssuedFileGrant,
  type ReceivedUpload,
  type ReceiveUploadOptions,
  type TransferStore,
} from './store.js'
export type { UploadByteSource } from './byte-source.js'
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
