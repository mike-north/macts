import { runJxa, runWithApp } from './executor.js';

export interface AppConnectionOptions {
  timeout?: number;
}

export interface AppConnection {
  bundleId: string;
  name: string;
  isRunning(): Promise<boolean>;
  activate(): Promise<undefined>;
  quit(): Promise<undefined>;
}

/**
 * Check if an application is currently running.
 */
export async function isAppRunning(bundleId: string): Promise<boolean> {
  const code = `
    var app = Application("${bundleId}");
    return app.running();
  `;
  return runJxa<boolean>(code);
}

/**
 * Activate (bring to foreground) an application.
 */
export async function activateApp(bundleId: string): Promise<undefined> {
  const code = `
    var app = Application("${bundleId}");
    app.activate();
  `;
  await runJxa<undefined>(code);
  return undefined;
}

/**
 * Quit an application.
 */
export async function quitApp(bundleId: string): Promise<undefined> {
  const code = `
    var app = Application("${bundleId}");
    app.quit();
  `;
  await runJxa<undefined>(code);
  return undefined;
}

/**
 * Get the display name of an application.
 */
export async function getAppName(bundleId: string): Promise<string> {
  return runWithApp<string>(bundleId, 'return app.name();');
}

/**
 * Create a connection object for an application.
 */
export async function connect(
  bundleId: string,
  _options: AppConnectionOptions = {}
): Promise<AppConnection> {
  const name = await getAppName(bundleId);

  return {
    bundleId,
    name,
    isRunning: () => isAppRunning(bundleId),
    activate: () => activateApp(bundleId),
    quit: () => quitApp(bundleId),
  };
}
