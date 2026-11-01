/**
 * Type tests for the wire codec: only errors with a wire code may be encoded,
 * and decoding always yields a structured error.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import {
  fromWireErrorEnvelope,
  toWireError,
  toWireErrorEnvelope,
  type AnyMactsError,
  type TransportError,
  type TransferError,
  type WireError,
  type WireErrorEnvelope,
} from '../index.js'

type EncodeParam = Parameters<typeof toWireError>[0]
type EnvelopeParam = Parameters<typeof toWireErrorEnvelope>[0]

expectNotAssignable<EncodeParam>({} as TransportError)
expectNotAssignable<EnvelopeParam>({} as TransportError)
expectNotAssignable<EncodeParam>({} as AnyMactsError)
expectAssignable<EncodeParam>({} as TransferError)

declare const transfer: TransferError
expectType<WireError>(toWireError(transfer))
expectType<WireErrorEnvelope>(toWireErrorEnvelope(transfer))
expectType<AnyMactsError>(fromWireErrorEnvelope(undefined, { status: 500 }))
