import crossSpawn from 'cross-spawn';
import fs from 'fs-extra';
import { fileURLToPath } from 'node:url';
import path from 'path';

import { generateSprite, getFluentList } from './generate-sprite.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectPath = path.join(__dirname, '..');
const srcPath = path.join(projectPath, 'src');
const distPath = path.join(projectPath, 'dist');
const distAssetsPath = path.join(distPath, 'assets');

async function createManifest(fluentIcons) {
  const metadataPath = path.join(projectPath, 'metadata.json');

  const metadata = await fs.readJSON(metadataPath);

  const manifest = {
    standardIcons: metadata.icons,
    additionalIcons: [],
  };

  for (const fluentIcon of fluentIcons) {
    if (!manifest.standardIcons.some((icon) => icon.iconName === fluentIcon)) {
      manifest.additionalIcons.push(fluentIcon);
    }
  }

  const manifestDistPath = path.join(distAssetsPath, 'manifest.json');

  await fs.writeJSON(manifestDistPath, manifest, {
    spaces: 2,
  });

  return manifest;
}

async function compileTypeScriptModule() {
  // Run the transpiler.
  crossSpawn.sync('tsc', ['--project', 'tsconfig.json'], { stdio: 'inherit' });
}

async function setVersion() {
  const packageJson = await fs.readJson('package.json');

  const versionFilePath = path.normalize('dist/module/version.js');
  const versionFileContents = (await fs.readFile(versionFilePath)).toString();

  await fs.writeFile(
    versionFilePath,
    versionFileContents.replace('0.0.0-PLACEHOLDER', packageJson.version),
  );
}

(async () => {
  try {
    const fluentIcons = await getFluentList();
    await generateSprite(fluentIcons);
    const manifest = await createManifest(fluentIcons);
    await compileTypeScriptModule(manifest);
    await setVersion();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
