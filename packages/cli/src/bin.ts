#!/usr/bin/env node
/**
 * CLI entry point
 */

import { Cli, Builtins } from 'clipanion';
import { GenerateCommand } from './commands/generate.js';
import { VERSION } from '@macts/core';

const cli = new Cli({
  binaryLabel: 'macts',
  binaryName: 'macts',
  binaryVersion: VERSION,
});

cli.register(GenerateCommand);
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

await cli.runExit(process.argv.slice(2));
