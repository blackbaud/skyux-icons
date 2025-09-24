import crossSpawn from 'cross-spawn';
import fs from 'fs-extra';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all dependencies but keep the prepare-package logic intact
vi.mock('fs-extra');
vi.mock('cross-spawn');
vi.mock('./generate-sprite.mjs', () => ({
  generateSprite: vi.fn().mockResolvedValue(undefined),
  getFluentList: vi.fn().mockResolvedValue(['test-icon-1', 'test-icon-2']),
}));

async function createCompiledContentAndMockRead() {
  // Read the actual version.ts file to get the real content structure
  const actualVersionFile = await import('fs').then((fs) =>
    fs.promises.readFile(
      path.join(process.cwd(), 'module', 'version.ts'),
      'utf-8',
    ),
  );

  // Create the compiled version.js content (what would exist after TypeScript compilation)
  const compiledVersionContent = actualVersionFile
    .replace(/export /g, '') // Remove export keywords for simplicity
    .replace(/: string/g, '') // Remove TypeScript type annotations
    .replace(/public readonly /g, '') // Remove TypeScript modifiers
    .replace(/readonly /g, '');

  vi.mocked(fs.readFile).mockImplementation(async (filePath, options) => {
    if (filePath.includes('version.js')) {
      return Buffer.from(compiledVersionContent);
    }
    return Buffer.from('');
  });
}

async function callPreparePackage() {
  // Import and execute the actual prepare-package script
  delete require.cache[require.resolve('./prepare-package.mjs')];
  await import('./prepare-package.mjs');
  await new Promise((resolve) => setTimeout(resolve, 100));
}

function verifyVersion(testVersion) {
  // Verify that package.json was read for version
  expect(fs.readJson).toHaveBeenCalledWith('package.json');

  // Verify that the version file was read
  expect(fs.readFile).toHaveBeenCalledWith(
    path.normalize('dist/module/version.js'),
  );

  // Verify that the version file was written with the correct replacement
  const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
  const versionWriteCall = writeFileCalls.find((call) =>
    call[0].toString().includes('version.js'),
  );

  expect(versionWriteCall).toBeDefined();
  expect(versionWriteCall[1]).toContain(testVersion);
  expect(versionWriteCall[1]).not.toContain('0.0.0-PLACEHOLDER');
  return versionWriteCall[1];
}

describe('prepare-package functionality', () => {
  // Shared test data
  const defaultMetadataResponse = {
    icons: [
      { iconName: 'home', usage: ['Home'] },
      { iconName: 'settings', usage: ['Settings'] },
      { iconName: 'user', usage: ['User'] },
    ],
  };

  // Helper function to setup custom mocks for specific tests
  const setupCustomMocks = (options = {}) => {
    const {
      packageVersion = '1.0.0',
      tscExitCode = 0,
      versionFileContent = 'class Version { constructor(version) { this.version = version || "0.0.0-PLACEHOLDER"; } }',
    } = options;

    vi.mocked(fs.readJSON).mockImplementation(async (filePath) => {
      if (filePath.includes('metadata.json')) {
        return defaultMetadataResponse;
      }
      if (filePath.includes('package.json')) {
        return packageVersion ? { version: packageVersion } : {};
      }
      return {};
    });

    vi.mocked(fs.readFile).mockImplementation(async (filePath, options) => {
      if (filePath.includes('version.js')) {
        return Buffer.from(versionFileContent);
      }
      return Buffer.from('');
    });

    vi.mocked(crossSpawn.sync).mockReturnValue({ status: tscExitCode });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Set up default mocks that work for most tests
    vi.mocked(fs.writeJSON).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined);

    // Set up default successful scenario
    setupCustomMocks();
  });

  describe('compileTypeScriptModule functionality', () => {
    it('should compile TypeScript modules using tsc command', async () => {
      await callPreparePackage();

      // Verify TypeScript compilation was triggered
      expect(crossSpawn.sync).toHaveBeenCalledWith(
        'tsc',
        ['--project', 'tsconfig.json'],
        { stdio: 'inherit' },
      );
    });
    it('should handle TypeScript compilation errors gracefully', async () => {
      // Mock TypeScript compilation to fail
      setupCustomMocks({ tscExitCode: 1 });

      // The test should still run even if tsc fails, since the script doesn't check the exit code
      await callPreparePackage();

      expect(crossSpawn.sync).toHaveBeenCalledWith(
        'tsc',
        ['--project', 'tsconfig.json'],
        { stdio: 'inherit' },
      );
    });
  });

  describe('sprite generation functionality', () => {
    it('should call getFluentList to retrieve fluent icons', async () => {
      await callPreparePackage();

      // Verify that getFluentList was called
      const { getFluentList } = await import('./generate-sprite.mjs');
      expect(vi.mocked(getFluentList)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(getFluentList)).toHaveBeenCalledWith();
    });

    it('should pass fluent icons from getFluentList to generateSprite', async () => {
      // Mock getFluentList to return specific test data
      const testFluentIcons = ['test-icon-a', 'test-icon-b', 'test-icon-c'];
      const { generateSprite, getFluentList } = await import(
        './generate-sprite.mjs'
      );
      vi.mocked(getFluentList).mockResolvedValue(testFluentIcons);

      await callPreparePackage();

      // Verify that generateSprite was called with the exact data from getFluentList
      expect(vi.mocked(generateSprite)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(generateSprite)).toHaveBeenCalledWith(testFluentIcons);
    });

    it('should call getFluentList before generateSprite in the correct order', async () => {
      const { generateSprite, getFluentList } = await import(
        './generate-sprite.mjs'
      );

      // Clear any previous calls
      vi.mocked(getFluentList).mockClear();
      vi.mocked(generateSprite).mockClear();

      await callPreparePackage();

      // Verify the call order - getFluentList should be called before generateSprite
      expect(vi.mocked(getFluentList)).toHaveBeenCalledBefore(
        vi.mocked(generateSprite),
      );
    });

    it('should handle empty fluent icons list', async () => {
      // Mock getFluentList to return empty array
      const { generateSprite, getFluentList } = await import(
        './generate-sprite.mjs'
      );
      vi.mocked(getFluentList).mockResolvedValue([]);

      await callPreparePackage();

      // Verify that generateSprite is still called even with empty array
      expect(vi.mocked(generateSprite)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(generateSprite)).toHaveBeenCalledWith([]);
    });

    it('should handle large fluent icons list', async () => {
      // Mock getFluentList to return a large array
      const largeFluentIconsList = Array.from(
        { length: 1000 },
        (_, i) => `icon-${i}`,
      );
      const { generateSprite, getFluentList } = await import(
        './generate-sprite.mjs'
      );
      vi.mocked(getFluentList).mockResolvedValue(largeFluentIconsList);

      await callPreparePackage();

      // Verify that generateSprite receives the complete large array
      expect(vi.mocked(generateSprite)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(generateSprite)).toHaveBeenCalledWith(
        largeFluentIconsList,
      );

      // Verify the exact length was passed through
      const actualCallArgs = vi.mocked(generateSprite).mock.calls[0][0];
      expect(actualCallArgs).toHaveLength(1000);
    });
  });

  describe('manifest functionality', () => {
    it('should create a manifest that includes the standard icons documented in metadata.json', async () => {
      await callPreparePackage();

      // Verify that writeJSON was called with the manifest
      const writeJSONCalls = vi.mocked(fs.writeJSON).mock.calls;
      const manifestCall = writeJSONCalls.find((call) =>
        call[0].includes('manifest.json'),
      );

      expect(manifestCall).toBeDefined();

      const manifest = manifestCall[1];
      expect(manifest).toHaveProperty('standardIcons');
      expect(manifest.standardIcons).toEqual(defaultMetadataResponse.icons);
      expect(manifest.standardIcons).toHaveLength(3);
      expect(manifest.standardIcons[0]).toEqual({
        iconName: 'home',
        usage: ['Home'],
      });
    });

    it('should create a manifest that includes the additional icons specified by the fluent list', async () => {
      const testFluentIcons = [
        'home',
        'settings',
        'fluent-icon-1',
        'fluent-icon-2',
        'fluent-icon-3',
      ];

      const { getFluentList } = await import('./generate-sprite.mjs');
      vi.mocked(getFluentList).mockResolvedValue(testFluentIcons);

      await callPreparePackage();

      const writeJSONCalls = vi.mocked(fs.writeJSON).mock.calls;
      const manifestCall = writeJSONCalls.find((call) =>
        call[0].includes('manifest.json'),
      );

      expect(manifestCall).toBeDefined();

      const manifest = manifestCall[1];
      expect(manifest).toHaveProperty('additionalIcons');
      expect(manifest.additionalIcons).toEqual([
        'fluent-icon-1',
        'fluent-icon-2',
        'fluent-icon-3',
      ]);
      expect(manifest.additionalIcons).toHaveLength(3);
      expect(manifest.additionalIcons).toEqual([
        'fluent-icon-1',
        'fluent-icon-2',
        'fluent-icon-3',
      ]);

      expect(manifest.standardIcons).toEqual(defaultMetadataResponse.icons);
    });

    it('should publish the manifest to the dist/assets folder', async () => {
      await callPreparePackage();

      const writeJSONCalls = vi.mocked(fs.writeJSON).mock.calls;
      const manifestCall = writeJSONCalls.find((call) =>
        call[0].includes('manifest.json'),
      );

      expect(manifestCall).toBeDefined();
      expect(manifestCall[0]).toMatch(/dist[\/\\]assets[\/\\]manifest\.json/);

      const manifest = manifestCall[1];
      expect(manifest).toHaveProperty('standardIcons');
      expect(manifest).toHaveProperty('additionalIcons');
    });

    it('should handle empty fluent list with only standard icons in manifest', async () => {
      // Mock empty fluent icons list
      const { getFluentList } = await import('./generate-sprite.mjs');
      vi.mocked(getFluentList).mockResolvedValue([]);

      await callPreparePackage();

      const writeJSONCalls = vi.mocked(fs.writeJSON).mock.calls;
      const manifestCall = writeJSONCalls.find((call) =>
        call[0].includes('manifest.json'),
      );

      expect(manifestCall).toBeDefined();

      const manifest = manifestCall[1];
      expect(manifest.standardIcons).toEqual(defaultMetadataResponse.icons);
      expect(manifest.additionalIcons).toEqual([]);
    });

    it('should handle case where all fluent icons are already in standard icons', async () => {
      // All fluent icons are already in metadata
      const testFluentIcons = ['home', 'settings', 'user'];

      const { getFluentList } = await import('./generate-sprite.mjs');
      vi.mocked(getFluentList).mockResolvedValue(testFluentIcons);

      await callPreparePackage();

      const writeJSONCalls = vi.mocked(fs.writeJSON).mock.calls;
      const manifestCall = writeJSONCalls.find((call) =>
        call[0].includes('manifest.json'),
      );

      expect(manifestCall).toBeDefined();

      const manifest = manifestCall[1];
      expect(manifest.standardIcons).toEqual(defaultMetadataResponse.icons);
      expect(manifest.additionalIcons).toEqual([]);
    });
  });

  describe('setVersion functionality', () => {
    function setupMetadataAndVersionMocks(testVersion) {
      // Only override the package.json version, not the entire fs.readFile mock
      vi.mocked(fs.readJSON).mockImplementation(async (filePath) => {
        if (filePath.includes('metadata.json')) {
          return defaultMetadataResponse;
        }
        if (filePath.includes('package.json')) {
          if (testVersion) {
            return { version: testVersion };
          } else {
            return {};
          }
        }
        return {};
      });
    }

    it('should update version placeholder with package.json version using actual prepare-package code', async () => {
      const testVersion = '1.2.3-beta.4';

      await createCompiledContentAndMockRead();

      setupMetadataAndVersionMocks(testVersion);

      await callPreparePackage();

      verifyVersion(testVersion);
    });

    it('should preserve file content except for version placeholder using actual prepare-package code', async () => {
      const testVersion = '2.1.0';

      await createCompiledContentAndMockRead();

      setupMetadataAndVersionMocks(testVersion);

      await callPreparePackage();

      const actualContent = verifyVersion(testVersion);
      expect(actualContent).toContain('class Version');
      expect(actualContent).toContain('constructor');
      expect(actualContent).toContain('major');
      expect(actualContent).toContain('minor');
      expect(actualContent).toContain('patch');
    });

    it('should handle edge case where package.json has no version using actual prepare-package code', async () => {
      await createCompiledContentAndMockRead();

      setupMetadataAndVersionMocks(undefined);

      await callPreparePackage();

      // Should replace placeholder with undefined using actual prepare-package code
      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const versionWriteCall = writeFileCalls.find((call) =>
        call[0].toString().includes('version.js'),
      );

      expect(versionWriteCall).toBeDefined();
      const actualContent = versionWriteCall[1];
      expect(actualContent).toContain("new Version('undefined')");
    });

    it('should run the complete prepare-package process including version update', async () => {
      const testVersion = '9.5.0';

      await createCompiledContentAndMockRead();

      setupMetadataAndVersionMocks(testVersion);

      await callPreparePackage();

      // Verify TypeScript compilation was triggered by the actual prepare-package script
      expect(crossSpawn.sync).toHaveBeenCalledWith(
        'tsc',
        ['--project', 'tsconfig.json'],
        { stdio: 'inherit' },
      );

      // Verify package.json was read for version by the actual prepare-package script
      expect(fs.readJson).toHaveBeenCalledWith('package.json');

      verifyVersion(testVersion);
    });
  });

  describe('main function error handling', () => {
    let consoleSpy;
    let processExitSpy;

    beforeEach(() => {
      // Spy on console.error and process.exit
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should catch and handle errors in the main function', async () => {
      const testError = new Error('Test error from getFluentList');

      // Mock getFluentList to throw an error
      const { getFluentList } = await import('./generate-sprite.mjs');
      vi.mocked(getFluentList).mockRejectedValue(testError);

      // Use the shared function to call prepare-package
      await callPreparePackage();

      // Verify error handling
      expect(consoleSpy).toHaveBeenCalledWith(testError);
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit with code 1 when any error occurs', async () => {
      const testError = new Error('Any error');

      // Mock getFluentList to throw an error (simplest failure point)
      const { getFluentList } = await import('./generate-sprite.mjs');
      vi.mocked(getFluentList).mockRejectedValue(testError);

      // Use the shared function to call prepare-package
      await callPreparePackage();

      // Verify that process.exit was called with error code 1
      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
