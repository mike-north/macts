/**
 * The QuickTime Player contract: the transport-neutral description of every
 * QuickTime Player operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `QuickTimePlayerClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `QuickTimePlayerClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the QuickTime Player manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type FileSource,
  type Integer,
  type OperationDescriptor,
} from '@macts/contracts'

const t = ValueTypes

/** A QuickTime Player document */
export interface Document {
  /**
   * The document name.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The unique identifier of the document.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The file path of the document.
   * Nullable. No evidence that the app always sets it.
   */
  readonly path: string | null
  /**
   * Whether the document is currently playing.
   * Nullable. No evidence that the app always sets it.
   */
  playing: boolean | null
  /**
   * The duration of the document in seconds.
   * Nullable. No evidence that the app always sets it.
   */
  readonly duration: number | null
  /**
   * The current playback time in seconds.
   * Nullable. No evidence that the app always sets it.
   */
  currentTime: number | null
}

/** Input for creating a Document. */
export interface DocumentCreateInput {
  /** Whether the document is currently playing */
  playing?: boolean
  /** The current playback time in seconds */
  currentTime?: number
}

/** Input for updating a Document. Omitted fields are left unchanged. */
export interface DocumentUpdateInput {
  /**
   * Whether the document is currently playing.
   * Cannot be reset: null is rejected.
   */
  playing?: boolean
  /**
   * The current playback time in seconds.
   * Cannot be reset: null is rejected.
   */
  currentTime?: number
}

/**
 * The QuickTime Player client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link quickTimePlayerContract}. Its type carries the
 * contract's resource table, {@link QuickTimePlayerResources}, so references can be bound to it by
 * resource; the brand has no runtime member.
 */
export interface QuickTimePlayerClient extends ClientBrand<QuickTimePlayerResources> {
  /** Open a URL. */
  openURL(options?: CallOptions): Promise<void>
  /** Play the movie. */
  play(options?: CallOptions): Promise<void>
  /** Start the movie recording. */
  start(options?: CallOptions): Promise<void>
  /** Pause the recording. */
  pause(options?: CallOptions): Promise<void>
  /** Resume the recording. */
  resume(options?: CallOptions): Promise<void>
  /** Stop the movie or recording. */
  stop(options?: CallOptions): Promise<void>
  /**
   * Step the movie backward the specified number of steps (default is 1).
   *
   * @param by - number of steps. Does not accept null.
   */
  stepBackward(by?: Integer, options?: CallOptions): Promise<void>
  /**
   * Step the movie forward the specified number of steps (default is 1).
   *
   * @param by - number of steps. Does not accept null.
   */
  stepForward(by?: Integer, options?: CallOptions): Promise<void>
  /**
   * Trim the movie.
   *
   * @param from - start time in seconds. Does not accept null.
   * @param to - end time in seconds. Does not accept null.
   */
  trim(from: number, to: number, options?: CallOptions): Promise<void>
  /** Present the document full screen. */
  present(options?: CallOptions): Promise<void>
  /** Create a new movie recording document. */
  newMovieRecording(options?: CallOptions): Promise<void>
  /** Create a new audio recording document. */
  newAudioRecording(options?: CallOptions): Promise<void>
  /** Create a new screen recording document. */
  newScreenRecording(options?: CallOptions): Promise<void>
  /**
   * Export a movie to another file
   *
   * @param _in - the destination file. Does not accept null.
   * @param usingSettingsPreset - the name of the export settings preset to use. Does not accept
   * null.
   */
  _export(_in: FileSource, usingSettingsPreset: string, options?: CallOptions): Promise<void>
  /** Show the document's Remote HUD */
  showRemoteHud(options?: CallOptions): Promise<void>
}

/**
 * The type of the resource table of {@link quickTimePlayerContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for a resource the app finds only within another,
 * that parent resource. A client created from the contract carries it, so
 * `bindReference` admits only references the contract can resolve.
 */
export type QuickTimePlayerResources = Readonly<Record<never, never>>

/**
 * The resource table: the implementation of {@link QuickTimePlayerResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {} satisfies QuickTimePlayerResources

const appOpenURLOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'quicktime-player.app.openURL',
  permission: 'quicktime-player:app:openURL',
  target: { command: 'openURL' },
  description: 'Open a URL.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPlayOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'quicktime-player.app.play',
  permission: 'quicktime-player:app:play',
  target: { command: 'play' },
  description: 'Play the movie.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appStartOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'quicktime-player.app.start',
  permission: 'quicktime-player:app:start',
  target: { command: 'start' },
  description: 'Start the movie recording.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appPauseOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'quicktime-player.app.pause',
  permission: 'quicktime-player:app:pause',
  target: { command: 'pause' },
  description: 'Pause the recording.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appResumeOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'quicktime-player.app.resume',
  permission: 'quicktime-player:app:resume',
  target: { command: 'resume' },
  description: 'Resume the recording.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appStopOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'quicktime-player.app.stop',
  permission: 'quicktime-player:app:stop',
  target: { command: 'stop' },
  description: 'Stop the movie or recording.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appStepBackwardOperation: OperationDescriptor<
  { readonly by?: Integer | undefined },
  undefined
> = {
  id: 'quicktime-player.app.stepBackward',
  permission: 'quicktime-player:app:stepBackward',
  target: { command: 'stepBackward' },
  description: 'Step the movie backward the specified number of steps (default is 1).',
  input: t.record({
    by: t.optional(t.integer({ description: 'number of steps' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      by: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'number of steps',
      },
    },
    additionalProperties: false,
  },
}

const appStepForwardOperation: OperationDescriptor<
  { readonly by?: Integer | undefined },
  undefined
> = {
  id: 'quicktime-player.app.stepForward',
  permission: 'quicktime-player:app:stepForward',
  target: { command: 'stepForward' },
  description: 'Step the movie forward the specified number of steps (default is 1).',
  input: t.record({
    by: t.optional(t.integer({ description: 'number of steps' })),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      by: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'number of steps',
      },
    },
    additionalProperties: false,
  },
}

const appTrimOperation: OperationDescriptor<
  { readonly from: number; readonly to: number },
  undefined
> = {
  id: 'quicktime-player.app.trim',
  permission: 'quicktime-player:app:trim',
  target: { command: 'trim' },
  description: 'Trim the movie.',
  input: t.record({
    from: t.double({ description: 'start time in seconds' }),
    to: t.double({ description: 'end time in seconds' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      from: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'start time in seconds',
      },
      to: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'end time in seconds',
      },
    },
    required: ['from', 'to'],
    additionalProperties: false,
  },
}

const appPresentOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'quicktime-player.app.present',
  permission: 'quicktime-player:app:present',
  target: { command: 'present' },
  description: 'Present the document full screen.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appNewMovieRecordingOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'quicktime-player.app.newMovieRecording',
  permission: 'quicktime-player:app:newMovieRecording',
  target: { command: 'newMovieRecording' },
  description: 'Create a new movie recording document.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appNewAudioRecordingOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'quicktime-player.app.newAudioRecording',
  permission: 'quicktime-player:app:newAudioRecording',
  target: { command: 'newAudioRecording' },
  description: 'Create a new audio recording document.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appNewScreenRecordingOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'quicktime-player.app.newScreenRecording',
  permission: 'quicktime-player:app:newScreenRecording',
  target: { command: 'newScreenRecording' },
  description: 'Create a new screen recording document.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appExportOperation: OperationDescriptor<
  { readonly in: FileSource; readonly usingSettingsPreset: string },
  undefined
> = {
  id: 'quicktime-player.app.export',
  permission: 'quicktime-player:app:export',
  target: { command: 'export' },
  description: 'Export a movie to another file',
  input: t.record({
    in: t.fileSource({ description: 'the destination file' }),
    usingSettingsPreset: t.string({ description: 'the name of the export settings preset to use' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      in: {
        type: 'object',
        properties: {
          fileSource: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  kind: { type: 'string', const: 'caller-owned-file' },
                  path: { type: 'string', minLength: 1 },
                },
                required: ['kind', 'path'],
                additionalProperties: false,
              },
              {
                type: 'object',
                properties: {
                  kind: { type: 'string', const: 'uploaded-file' },
                  uploadId: { type: 'string', minLength: 1 },
                },
                required: ['kind', 'uploadId'],
                additionalProperties: false,
              },
            ],
          },
        },
        required: ['fileSource'],
        additionalProperties: false,
        description: 'the destination file',
      },
      usingSettingsPreset: {
        type: 'string',
        description: 'the name of the export settings preset to use',
      },
    },
    required: ['in', 'usingSettingsPreset'],
    additionalProperties: false,
  },
}

const appShowRemoteHudOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'quicktime-player.app.showRemoteHud',
  permission: 'quicktime-player:app:showRemoteHud',
  target: { command: 'showRemoteHud' },
  description: "Show the document's Remote HUD",
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<QuickTimePlayerClient>['operations'] = {
  'quicktime-player.app.openURL': appOpenURLOperation,
  'quicktime-player.app.play': appPlayOperation,
  'quicktime-player.app.start': appStartOperation,
  'quicktime-player.app.pause': appPauseOperation,
  'quicktime-player.app.resume': appResumeOperation,
  'quicktime-player.app.stop': appStopOperation,
  'quicktime-player.app.stepBackward': appStepBackwardOperation,
  'quicktime-player.app.stepForward': appStepForwardOperation,
  'quicktime-player.app.trim': appTrimOperation,
  'quicktime-player.app.present': appPresentOperation,
  'quicktime-player.app.newMovieRecording': appNewMovieRecordingOperation,
  'quicktime-player.app.newAudioRecording': appNewAudioRecordingOperation,
  'quicktime-player.app.newScreenRecording': appNewScreenRecordingOperation,
  'quicktime-player.app.export': appExportOperation,
  'quicktime-player.app.showRemoteHud': appShowRemoteHudOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): QuickTimePlayerClient {
  return {
    openURL: (options) => runtime.invoke(appOpenURLOperation, {}, options),
    play: (options) => runtime.invoke(appPlayOperation, {}, options),
    start: (options) => runtime.invoke(appStartOperation, {}, options),
    pause: (options) => runtime.invoke(appPauseOperation, {}, options),
    resume: (options) => runtime.invoke(appResumeOperation, {}, options),
    stop: (options) => runtime.invoke(appStopOperation, {}, options),
    stepBackward: (by, options) => runtime.invoke(appStepBackwardOperation, { by }, options),
    stepForward: (by, options) => runtime.invoke(appStepForwardOperation, { by }, options),
    trim: (from, to, options) => runtime.invoke(appTrimOperation, { from, to }, options),
    present: (options) => runtime.invoke(appPresentOperation, {}, options),
    newMovieRecording: (options) => runtime.invoke(appNewMovieRecordingOperation, {}, options),
    newAudioRecording: (options) => runtime.invoke(appNewAudioRecordingOperation, {}, options),
    newScreenRecording: (options) => runtime.invoke(appNewScreenRecordingOperation, {}, options),
    _export: (_in, usingSettingsPreset, options) =>
      runtime.invoke(appExportOperation, { in: _in, usingSettingsPreset }, options),
    showRemoteHud: (options) => runtime.invoke(appShowRemoteHudOperation, {}, options),
  }
}

/**
 * The QuickTime Player contract. Pass it to a client factory to obtain a
 * {@link QuickTimePlayerClient}.
 */
export const quickTimePlayerContract: AppContract<QuickTimePlayerClient, QuickTimePlayerResources> =
  {
    app: 'quicktime-player',
    operations,
    resources,
    loadManifest: async () => (await import('./manifest.js')).manifest,
    bind,
  }
