import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

/* c8 ignore start */
if (import.meta.url === `file://${process.argv[1]}`) {
  createStackblitzLink();
}
/* c8 ignore stop */

export function createStackblitzLink() {
  const playgroundUrl = process.argv
    .find((v) => v.startsWith('--url='))
    ?.split('=')[1];

  if (!playgroundUrl) {
    console.error('Error: Playground URL is required. Use --url=<string>');
    process.exit(1);
  }

  const angularVersion = runCommand('npm', [
    'view',
    '@skyux/core',
    'peerDependencies.@angular/core',
  ])
    .stdout.trim()
    .split('.')[0];

  runCommand('npx', [
    '-y',
    `@angular/cli@${angularVersion}`,
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
  ]);
  runCommand('npx', [
    '@angular/cli',
    'config',
    'projects.skyux-icons-demo.architect.build.configurations.production.budgets[0].maximumError',
    '2mb',
  ]);
  runCommand('npx', ['@angular/cli', 'analytics', 'disable']);
  runCommand('npx', [
    '@angular/cli',
    'add',
    '@skyux/packages',
    `--project`,
    'skyux-icons-demo',
    '--skip-confirmation',
  ]);

  runCommand('npm', [
    'pkg',
    'set',
    `overrides=${JSON.stringify({
      'ng2-dragula@5.1.0': {
        '@angular/animations': '>=16.0.0',
        '@angular/core': '>=16.0.0',
        '@angular/common': '>=16.0.0',
      },
    })}`,
    '--json',
  ]);

  const packages = JSON.parse(
    runCommand('npm', [
      'view',
      '@skyux/packages',
      'ng-update.packageGroup',
      '--json',
    ]).stdout.trim(),
  );
  const installPackages = Object.entries(packages)
    .filter(([name]) => !name.includes('lint'))
    .map(([name, version]) => `${name}@${version}`);

  runCommand('npm', ['install', ...installPackages]);
  runCommand('rm', [
    '-rf',
    '.angular',
    'node_modules',
    path.normalize('public/favicon.ico'),
    path.normalize('src/app'),
  ]);
  runCommand('cp', [
    '-R',
    path.join(__dirname, 'stackblitz-app/app'),
    path.normalize('src/app'),
  ]);

  console.log(`Creating index.html with preview icons`);
  const indexHtml = fs.readFileSync(
    path.join(__dirname, 'stackblitz-app/index.html'),
    'utf-8',
  );
  fs.writeFileSync(
    path.normalize('src/index.html'),
    indexHtml.replace('URL', playgroundUrl),
  );

  console.log(`Creating stackblitz.html with project files`);
  const files = runCommand('find', ['.', '-type', 'f'])
    .stdout.split(/\r?\n/)
    .filter(Boolean)
    .filter((f) =>
      ['.DS_Store', 'stackblitz.html'].every((ex) => !f.endsWith(`/${ex}`)),
    );
  const project = Object.fromEntries(
    files.map((f) => [
      f.replace(/^\.\//, '').replace(/\.template$/, ''),
      fs.readFileSync(f, 'utf-8'),
    ]),
  );
  const stackblitzHtml = fs.readFileSync(
    path.join(__dirname, 'stackblitz-app/stackblitz.html'),
    'utf-8',
  );
  fs.writeFileSync(
    'stackblitz.html',
    stackblitzHtml.replace('files: {}', `files: ${JSON.stringify(project)}`),
  );

  console.log(`✅ Done.`);
}

function runCommand(command, args) {
  console.log(`# ${command} ${args.join(' ')}`);
  return cp.spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf-8',
    shell: true,
  });
}
