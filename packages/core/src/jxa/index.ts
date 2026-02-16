// Executor
export { runJxa, runWithApp, JxaExecutionError, type JxaExecutorOptions } from './executor.js';

// Connection
export {
  connect,
  isAppRunning,
  activateApp,
  quitApp,
  getAppName,
  type AppConnection,
  type AppConnectionOptions,
} from './connection.js';

// Object specifier
export { ObjectSpecifier, type SpecifierStep, type Selector } from './specifier.js';

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
} from './coercion.js';
