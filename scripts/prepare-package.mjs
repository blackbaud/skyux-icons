import CleanCSS from 'clean-css';
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
const distAssetsCssPath = path.join(distAssetsPath, 'css');

async function readUtf8(filePath) {
  return fs.readFile(filePath, { encoding: 'utf-8' });
}

async function writeUtf8(filePath, contents) {
  return fs.writeFile(filePath, contents, { encoding: 'utf-8' });
}

async function copyToDist() {
  if (await fs.exists(distPath)) {
    await fs.emptyDir(distPath);
  }

  await fs.copy(path.join(srcPath, 'css'), distAssetsCssPath);

  await fs.copy(path.join(srcPath, 'font'), path.join(distAssetsPath, 'font'));
}

async function processCss() {
  const cssOverridesFileNames = ['skyux-icons-embedded.css', 'skyux-icons.css'];

  const cssOverrides = await readUtf8(path.join(projectPath, 'overrides.css'));

  const cssFiles = await fs.readdir(distAssetsCssPath);

  for (const cssFile of cssFiles) {
    const cssFilePath = path.join(distAssetsCssPath, cssFile);
    const cssFileParsedPath = path.parse(cssFilePath);

    let css = await readUtf8(cssFilePath);

    if (cssOverridesFileNames.indexOf(cssFileParsedPath.base) >= 0) {
      css = `${css}\n\n${cssOverrides}`;

      await writeUtf8(cssFilePath, css);
    }

    const minifier = new CleanCSS({
      compatibility: cssFileParsedPath.name.indexOf('-ie7') ? 'ie7' : '*',
      inline: false,
      level: 1,
      returnPromise: true,
    });

    const cssMinified = (await minifier.minify(css)).styles;

    const cssMinifiedFilePath = path.join(
      cssFileParsedPath.dir,
      `${cssFileParsedPath.name}.min${cssFileParsedPath.ext}`,
    );

    await writeUtf8(cssMinifiedFilePath, cssMinified);
  }
}

async function createManifest(fluentIcons) {
  const configPath = path.join(srcPath, 'config.json');
  const metadataPath = path.join(projectPath, 'metadata.json');

  const config = await fs.readJSON(configPath);
  const metadata = await fs.readJSON(metadataPath);

  const manifest = {
    name: config.name,
    cssPrefix: config.css_prefix_text,
    glyphs: [],
    customFluentIcons: [],
    additionalFluentIcons: [],
  };

  for (const glyph of metadata.glyphs) {
    if (glyph.iconName) {
      manifest.customFluentIcons.push({
        iconName: glyph.iconName,
        usage: glyph.usage,
      });
    }

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
    await copyToDist();
    await processCss();
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
