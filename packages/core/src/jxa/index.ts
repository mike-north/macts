// Executor
export { runJxa, runWithApp, JxaExecutionError, type JxaExecutorOptions } from './executor.js'

// Native value codec (in-process wire <-> native conversion)
export {
  NATIVE_CODEC,
  NATIVE_DECODE_FUNCTION,
  NATIVE_ENCODE_FUNCTION,
  NATIVE_CODEC_ERROR_NAME,
  type NativeCodec,
  type NativeScript,
  type NativeFailure,
  type NativeOutcome,
} from './native-codec.js'

// Native executor (the macOS provider's implementation of the executor seam)
export { createNativeExecutor, type NativeExecutorOptions } from './native-executor.js'
export { buildNativeBody } from './native-scripts.js'

// Connection
export {
  connect,
  isAppRunning,
  activateApp,
  quitApp,
  getAppName,
  type AppConnection,
  type AppConnectionOptions,
} from './connection.js'

// Object specifier
export { ObjectSpecifier, type SpecifierStep, type Selector } from './specifier.js'

// Type coercion
export {
  dateCoercer,
  colorCoercer,
  createEnumCoercer,
  pathCoercer,
  booleanCoercer,
  numberCoercer,
  stringCoercer,
  createArrayCoercer,
  nullSafe,
  HexColorSchema,
  type TypeCoercer,
  type HexColor,
  type JxaEnumValue,
} from './coercion.js'
