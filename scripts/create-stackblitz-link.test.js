import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStackblitzLink } from './create-stackblitz-link.mjs';

// Mock all dependencies
vi.mock('node:fs');
vi.mock('node:child_process');

describe('create-stackblitz-link functionality', () => {
  const mockPlaygroundUrl = 'https://example.com/playground';
  const mockAngularVersion = '^20.0.0';
  const mockPackages = {
    '@skyux/core': '^13.0.0',
    '@skyux/theme': '^13.0.0',
    '@skyux/icons': '^13.0.0',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset process.argv
    process.argv = [
      'node',
      'create-stackblitz-link.mjs',
      `--url=${mockPlaygroundUrl}`,
    ];

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock process.exit - don't throw, just track calls
    vi.spyOn(process, 'exit').mockImplementation(() => undefined);

    // Mock spawnSync to return successful responses with proper structure
    vi.mocked(cp.spawnSync).mockImplementation((command, args) => {
      let stdout = '';

      if (
        command === 'npm' &&
        args.includes('view') &&
        args.includes('peerDependencies.@angular/core')
      ) {
        stdout = mockAngularVersion;
      } else if (
        command === 'npm' &&
        args.includes('view') &&
        args.includes('ng-update.packageGroup')
      ) {
        stdout = JSON.stringify(mockPackages);
      } else if (command === 'find') {
        stdout = './package.json\n./src/index.html\n./src/app/app.component.ts';
      }

      return {
        stdout,
        stderr: '',
        status: 0,
        signal: null,
        output: [null, stdout, ''],
        pid: 12345,
        error: undefined,
      };
    });

    // Mock fs methods
    vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
      const pathStr = filePath.toString();

      if (pathStr.includes('index.html')) {
        return '<html><body>URL</body></html>';
      }
      if (pathStr.includes('stackblitz.html')) {
        return '<html><script>const project = { files: {} };</script></html>';
      }
      if (pathStr.endsWith('package.json')) {
        return '{"name":"test","version":"1.0.0"}';
      }

      return 'mock file content';
    });

    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
  });

  it('should error when no URL is provided', () => {
    process.argv = ['node', 'create-stackblitz-link.mjs'];

    createStackblitzLink();

    expect(console.error).toHaveBeenCalledWith(
      'Error: Playground URL is required. Use --url=<string>',
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should fetch Angular version from @skyux/core peer dependencies', () => {
    createStackblitzLink();

    expect(cp.spawnSync).toHaveBeenCalledWith(
      'npm',
      ['view', '@skyux/core', 'peerDependencies.@angular/core'],
      expect.any(Object),
    );
  });

  it('should create new Angular project with correct configuration', () => {
    createStackblitzLink();

    expect(cp.spawnSync).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining([
        '-y',
        expect.stringContaining('@angular/cli@'),
        'new',
        'skyux-icons-demo',
        '--directory=.',
        '--defaults',
        '--ai-config=none',
        '--no-ssr',
        '--no-zoneless',
        '--package-manager=npm',
        '--routing',
        '--skip-git',
        '--style=css',
      ]),
      expect.any(Object),
    );
  });

  it('should configure budget size to 2mb', () => {
    createStackblitzLink();

    expect(cp.spawnSync).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining([
        '@angular/cli',
        'config',
        'projects.skyux-icons-demo.architect.build.configurations.production.budgets[0].maximumError',
        '2mb',
      ]),
      expect.any(Object),
    );
  });

  it('should disable Angular analytics', () => {
    createStackblitzLink();

    expect(cp.spawnSync).toHaveBeenCalledWith(
      'npx',
      ['@angular/cli', 'analytics', 'disable'],
      expect.any(Object),
    );
  });

  it('should add @skyux/packages to the project', () => {
    createStackblitzLink();

    expect(cp.spawnSync).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining([
        '@angular/cli',
        'add',
        '@skyux/packages',
        '--project',
        'skyux-icons-demo',
        '--skip-confirmation',
      ]),
      expect.any(Object),
    );
  });

  it('should set npm overrides for ng2-dragula compatibility', () => {
    createStackblitzLink();

    const overridesCall = vi
      .mocked(cp.spawnSync)
      .mock.calls.find(
        ([cmd, args]) =>
          cmd === 'npm' && args.includes('pkg') && args.includes('set'),
      );

    expect(overridesCall).toBeDefined();
    const overridesArg = overridesCall[1].find((arg) =>
      arg.startsWith('overrides='),
    );
    expect(overridesArg).toBeDefined();

    // The overrides argument is in the format: overrides={"ng2-dragula@5.1.0":{...}}
    // We need to extract just the JSON part after the equals sign
    const jsonString = overridesArg.substring('overrides='.length);
    const overridesValue = JSON.parse(jsonString);
    expect(overridesValue).toHaveProperty('ng2-dragula@5.1.0');
    expect(overridesValue['ng2-dragula@5.1.0']).toEqual({
      '@angular/animations': '>=16.0.0',
      '@angular/core': '>=16.0.0',
      '@angular/common': '>=16.0.0',
    });
  });

  it('should fetch SKY UX package group versions', () => {
    createStackblitzLink();

    expect(cp.spawnSync).toHaveBeenCalledWith(
      'npm',
      ['view', '@skyux/packages', 'ng-update.packageGroup', '--json'],
      expect.any(Object),
    );
  });

  it('should install SKY UX packages excluding lint packages', () => {
    createStackblitzLink();

    const installCall = vi
      .mocked(cp.spawnSync)
      .mock.calls.find(([cmd, args]) => cmd === 'npm' && args[0] === 'install');

    expect(installCall).toBeDefined();
    expect(installCall[1]).toContain('@skyux/core@^13.0.0');
    expect(installCall[1]).toContain('@skyux/theme@^13.0.0');
    expect(installCall[1]).toContain('@skyux/icons@^13.0.0');
  });

  it('should filter out lint packages from installation', () => {
    vi.mocked(cp.spawnSync).mockImplementation((command, args) => {
      let stdout = '';

      if (command === 'npm' && args.includes('ng-update.packageGroup')) {
        stdout = JSON.stringify({
          '@skyux/core': '^13.0.0',
          '@skyux/eslint-config': '^13.0.0',
          '@skyux/lint': '^1.0.0',
        });
      } else if (
        command === 'npm' &&
        args.includes('peerDependencies.@angular/core')
      ) {
        stdout = mockAngularVersion;
      } else if (command === 'find') {
        stdout = './package.json\n./src/index.html\n./src/app/app.component.ts';
      }

      return {
        stdout,
        stderr: '',
        status: 0,
        signal: null,
        output: [null, stdout, ''],
        pid: 12345,
        error: undefined,
      };
    });

    createStackblitzLink();

    const installCall = vi
      .mocked(cp.spawnSync)
      .mock.calls.find(([cmd, args]) => cmd === 'npm' && args[0] === 'install');

    const installedPackages = installCall[1].slice(1);
    expect(installedPackages).toContain('@skyux/core@^13.0.0');
    expect(installedPackages).not.toContain(expect.stringContaining('eslint'));
    expect(installedPackages).not.toContain(expect.stringContaining('lint'));
  });

  it('should remove unnecessary files and folders', () => {
    createStackblitzLink();

    expect(cp.spawnSync).toHaveBeenCalledWith(
      'rm',
      expect.arrayContaining([
        '-rf',
        '.angular',
        'node_modules',
        expect.stringMatching(/public[/\\]favicon\.ico/),
        expect.stringMatching(/src[/\\]app/),
      ]),
      expect.any(Object),
    );
  });

  it('should copy stackblitz app files to src/app', () => {
    createStackblitzLink();

    const cpCall = vi
      .mocked(cp.spawnSync)
      .mock.calls.find(([cmd, args]) => cmd === 'cp' && args[0] === '-R');

    expect(cpCall).toBeDefined();
    expect(cpCall[1][1]).toMatch(/stackblitz-app[/\\]app/);
    expect(cpCall[1][2]).toMatch(/src[/\\]app/);
  });

  it('should create index.html with playground URL', () => {
    createStackblitzLink();

    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/stackblitz-app[/\\]index\.html/),
      'utf-8',
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/src[/\\]index\.html/),
      expect.stringContaining(mockPlaygroundUrl),
    );

    expect(console.log).toHaveBeenCalledWith(
      'Creating index.html with preview icons',
    );
  });

  it('should create stackblitz.html with project files', () => {
    createStackblitzLink();

    expect(cp.spawnSync).toHaveBeenCalledWith(
      'find',
      ['.', '-type', 'f'],
      expect.any(Object),
    );

    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/stackblitz-app[/\\]stackblitz\.html/),
      'utf-8',
    );

    const stackblitzWriteCall = vi
      .mocked(fs.writeFileSync)
      .mock.calls.find(([file]) => file === 'stackblitz.html');

    expect(stackblitzWriteCall).toBeDefined();
    expect(stackblitzWriteCall[1]).toContain('files:');

    expect(console.log).toHaveBeenCalledWith(
      'Creating stackblitz.html with project files',
    );
  });

  it('should filter out .DS_Store and stackblitz.html from project files', () => {
    vi.mocked(cp.spawnSync).mockImplementation((command, args) => {
      let stdout = '';

      if (command === 'find') {
        stdout =
          './package.json\n./src/app/.DS_Store\n./stackblitz.html\n./src/index.html';
      } else if (
        command === 'npm' &&
        args.includes('peerDependencies.@angular/core')
      ) {
        stdout = mockAngularVersion;
      } else if (command === 'npm' && args.includes('ng-update.packageGroup')) {
        stdout = JSON.stringify(mockPackages);
      }

      return {
        stdout,
        stderr: '',
        status: 0,
        signal: null,
        output: [null, stdout, ''],
        pid: 12345,
        error: undefined,
      };
    });

    createStackblitzLink();

    const stackblitzWriteCall = vi
      .mocked(fs.writeFileSync)
      .mock.calls.find(([file]) => file === 'stackblitz.html');

    expect(stackblitzWriteCall).toBeDefined();
    const content = stackblitzWriteCall[1];
    expect(content).not.toContain('.DS_Store');
    expect(content).not.toContain('"stackblitz.html"');
  });

  it('should log success message when complete', () => {
    createStackblitzLink();

    expect(console.log).toHaveBeenCalledWith('✅ Done.');
  });

  it('should log each command that is executed', () => {
    createStackblitzLink();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('# npm view @skyux/core'),
    );
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('# npx'));
  });
});
