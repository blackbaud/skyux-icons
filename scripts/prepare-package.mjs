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
  const configPath = path.join(srcPath, 'config.json');
  const metadataPath = path.join(projectPath, 'metadata.json');

  const config = await fs.readJSON(configPath);
  const metadata = await fs.readJSON(metadataPath);

  const manifest = {
    name: config.name,
    cssPrefix: config.css_prefix_text,
    glyphs: [],
    additionalFluentIcons: [],
  };

  for (const glyph of metadata.glyphs) {
    const matchingGlyph = config.glyphs.find((item) => item.css === glyph.name);

    if (matchingGlyph) {
      const manifestGlyph = Object.assign({}, glyph, {
        name: matchingGlyph.css,
        code: matchingGlyph.code,
      });

      manifest.glyphs.push(manifestGlyph);
    }
  }

  for (const fluentIcon of fluentIcons) {
    if (!manifest.glyphs.some((glyph) => glyph.iconName === fluentIcon)) {
      manifest.additionalFluentIcons.push(fluentIcon);
    }
  }

  const manifestDistPath = path.join(distAssetsPath, 'manifest.json');

  await fs.writeJSON(manifestDistPath, manifest, {
    spaces: 2,
  });

  return manifest;
}

async function compileTypeScriptModule(manifest) {
  // Run the transpiler.
  crossSpawn.sync('tsc', ['--project', 'tsconfig.json'], { stdio: 'inherit' });

  const manifestFunctionPath = path.normalize(
    'dist/module/__get-icon-manifest.js',
  );
  const manifestFunctionContents = await fs.readFile(manifestFunctionPath, {
    encoding: 'utf-8',
  });

  // Convert the manifest.json contents into a JavaScript object.
  await fs.writeFile(
    manifestFunctionPath,
    manifestFunctionContents.replace(
      'return {};',
      `return ${JSON.stringify(manifest)};`,
    ),
  );
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
