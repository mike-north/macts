import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GenerateCommand } from './generate.js';
import * as core from '@macts/core';
import type { Writable } from 'node:stream';

// Mock the core module
vi.mock('@macts/core', async () => {
  const actual = await vi.importActual<typeof core>('@macts/core');
  return {
    ...actual,
    loadManifest: vi.fn(),
    generateSdk: vi.fn(),
    writeSdk: vi.fn(),
  };
});

describe('GenerateCommand', () => {
  let stdout: string[];
  let stderr: string[];
  let mockStdout: Writable;
  let mockStderr: Writable;

  beforeEach(() => {
    stdout = [];
    stderr = [];

    // Create mock writable streams
    mockStdout = {
      write: (chunk: string) => {
        stdout.push(chunk);
        return true;
      },
    } as Writable;

    mockStderr = {
      write: (chunk: string) => {
        stderr.push(chunk);
        return true;
      },
    } as Writable;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('command parsing', () => {
    it('should have correct command path', () => {
      expect(GenerateCommand.paths).toEqual([['generate']]);
    });

    it('should define usage information', () => {
      expect(GenerateCommand.usage).toBeDefined();
      expect(GenerateCommand.usage?.description).toContain('Generate');
    });
  });

  describe('execute', () => {
    const mockManifest = {
      app: {
        name: 'Calendar',
        bundleId: 'com.apple.Calendar',
      },
      resources: {},
      commands: {},
      enums: {},
    };

    it('should load manifest and generate SDK successfully', async () => {
      // Setup mocks
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest);
      vi.mocked(core.generateSdk).mockReturnValue({
        files: [
          { path: 'src/index.ts', content: 'export {}' },
          { path: 'package.json', content: '{}' },
        ],
        errors: [],
      });
      vi.mocked(core.writeSdk).mockResolvedValue(undefined);

      // Create and configure command
      const command = new GenerateCommand();
      command.manifestPath = 'manifests/calendar/app.yaml';
      command.outDir = 'packages/sdk-calendar';
      command.packageName = '@macts/sdk-calendar';
      command.version = undefined as unknown as string;
      command.context = {
        stdout: mockStdout,
        stderr: mockStderr,
      } as any;

      // Execute
      const exitCode = await command.execute();

      // Assertions
      expect(exitCode).toBe(0);
      expect(core.loadManifest).toHaveBeenCalledWith(
        expect.stringContaining('manifests/calendar/app.yaml')
      );
      expect(core.generateSdk).toHaveBeenCalledWith(mockManifest, {
        outDir: expect.stringContaining('packages/sdk-calendar'),
        packageName: '@macts/sdk-calendar',
        version: undefined,
      });
      expect(core.writeSdk).toHaveBeenCalledWith(
        expect.objectContaining({
          files: expect.arrayContaining([
            expect.objectContaining({ path: 'src/index.ts' }),
          ]),
        }),
        expect.stringContaining('packages/sdk-calendar')
      );

      // Check output
      expect(stdout.join('')).toContain('Loading manifest');
      expect(stdout.join('')).toContain('Generating SDK for Calendar');
      expect(stdout.join('')).toContain('Writing 2 files');
      expect(stdout.join('')).toContain('SDK generated successfully!');
    });

    it('should pass version option to generator', async () => {
      // Setup mocks
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest);
      vi.mocked(core.generateSdk).mockReturnValue({
        files: [{ path: 'src/index.ts', content: 'export {}' }],
        errors: [],
      });
      vi.mocked(core.writeSdk).mockResolvedValue(undefined);

      // Create and configure command
      const command = new GenerateCommand();
      command.manifestPath = 'manifests/calendar/app.yaml';
      command.outDir = 'packages/sdk-calendar';
      command.packageName = '@macts/sdk-calendar';
      command.version = '1.2.3';
      command.context = {
        stdout: mockStdout,
        stderr: mockStderr,
      } as any;

      // Execute
      await command.execute();

      // Assertions
      expect(core.generateSdk).toHaveBeenCalledWith(
        mockManifest,
        expect.objectContaining({
          version: '1.2.3',
        })
      );
    });

    it('should return error code when generation has errors', async () => {
      // Setup mocks
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest);
      vi.mocked(core.generateSdk).mockReturnValue({
        files: [],
        errors: ['Failed to generate types', 'Invalid resource schema'],
      });

      // Create and configure command
      const command = new GenerateCommand();
      command.manifestPath = 'manifests/calendar/app.yaml';
      command.outDir = 'packages/sdk-calendar';
      command.packageName = '@macts/sdk-calendar';
      command.version = undefined as unknown as string;
      command.context = {
        stdout: mockStdout,
        stderr: mockStderr,
      } as any;

      // Execute
      const exitCode = await command.execute();

      // Assertions
      expect(exitCode).toBe(1);
      expect(stderr.join('')).toContain('Errors during generation');
      expect(stderr.join('')).toContain('Failed to generate types');
      expect(stderr.join('')).toContain('Invalid resource schema');
      expect(core.writeSdk).not.toHaveBeenCalled();
    });

    it('should handle manifest load errors', async () => {
      // Setup mocks
      vi.mocked(core.loadManifest).mockRejectedValue(
        new Error('Invalid manifest: missing app.bundleId')
      );

      // Create and configure command
      const command = new GenerateCommand();
      command.manifestPath = 'manifests/invalid/app.yaml';
      command.outDir = 'packages/sdk-invalid';
      command.packageName = '@macts/sdk-invalid';
      command.context = {
        stdout: mockStdout,
        stderr: mockStderr,
      } as any;

      // Execute
      const exitCode = await command.execute();

      // Assertions
      expect(exitCode).toBe(1);
      expect(stderr.join('')).toContain('Error:');
      expect(stderr.join('')).toContain('Invalid manifest: missing app.bundleId');
    });

    it('should handle write errors', async () => {
      // Setup mocks
      vi.mocked(core.loadManifest).mockResolvedValue(mockManifest);
      vi.mocked(core.generateSdk).mockReturnValue({
        files: [{ path: 'src/index.ts', content: 'export {}' }],
        errors: [],
      });
      vi.mocked(core.writeSdk).mockRejectedValue(
        new Error('EACCES: permission denied')
      );

      // Create and configure command
      const command = new GenerateCommand();
      command.manifestPath = 'manifests/calendar/app.yaml';
      command.outDir = '/protected/sdk-calendar';
      command.packageName = '@macts/sdk-calendar';
      command.context = {
        stdout: mockStdout,
        stderr: mockStderr,
      } as any;

      // Execute
      const exitCode = await command.execute();

      // Assertions
      expect(exitCode).toBe(1);
      expect(stderr.join('')).toContain('Error:');
      expect(stderr.join('')).toContain('EACCES: permission denied');
    });

    it('should handle non-Error exceptions', async () => {
      // Setup mocks
      vi.mocked(core.loadManifest).mockRejectedValue('Something went wrong');

      // Create and configure command
      const command = new GenerateCommand();
      command.manifestPath = 'manifests/calendar/app.yaml';
      command.outDir = 'packages/sdk-calendar';
      command.packageName = '@macts/sdk-calendar';
      command.version = undefined as unknown as string;
      command.context = {
        stdout: mockStdout,
        stderr: mockStderr,
      } as any;

      // Execute
      const exitCode = await command.execute();

      // Assertions
      expect(exitCode).toBe(1);
      expect(stderr.join('')).toContain('Unknown error:');
      expect(stderr.join('')).toContain('Something went wrong');
    });
  });

  describe('edge cases', () => {
    it('should handle empty files array', async () => {
      // Setup mocks
      vi.mocked(core.loadManifest).mockResolvedValue({
        app: { name: 'Empty', bundleId: 'com.test.empty' },
        resources: {},
        commands: {},
        enums: {},
      });
      vi.mocked(core.generateSdk).mockReturnValue({
        files: [],
        errors: [],
      });
      vi.mocked(core.writeSdk).mockResolvedValue(undefined);

      // Create and configure command
      const command = new GenerateCommand();
      command.manifestPath = 'manifests/empty/app.yaml';
      command.outDir = 'packages/sdk-empty';
      command.packageName = '@macts/sdk-empty';
      command.context = {
        stdout: mockStdout,
        stderr: mockStderr,
      } as any;

      // Execute
      const exitCode = await command.execute();

      // Assertions
      expect(exitCode).toBe(0);
      expect(stdout.join('')).toContain('Writing 0 files');
    });

    it('should resolve relative paths', async () => {
      // Setup mocks
      vi.mocked(core.loadManifest).mockResolvedValue({
        app: { name: 'Test', bundleId: 'com.test.app' },
        resources: {},
        commands: {},
        enums: {},
      });
      vi.mocked(core.generateSdk).mockReturnValue({
        files: [{ path: 'src/index.ts', content: '' }],
        errors: [],
      });
      vi.mocked(core.writeSdk).mockResolvedValue(undefined);

      // Create and configure command
      const command = new GenerateCommand();
      command.manifestPath = './manifests/test/app.yaml';
      command.outDir = './packages/sdk-test';
      command.packageName = '@macts/sdk-test';
      command.context = {
        stdout: mockStdout,
        stderr: mockStderr,
      } as any;

      // Execute
      await command.execute();

      // Assertions - paths should be resolved to absolute
      expect(core.loadManifest).toHaveBeenCalledWith(
        expect.not.stringMatching(/^\.\//)
      );
      expect(core.generateSdk).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          outDir: expect.not.stringMatching(/^\.\/./),
        })
      );
    });
  });
});
