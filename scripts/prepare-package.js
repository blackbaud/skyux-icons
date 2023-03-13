const CleanCSS = require('clean-css');
const fs = require('fs-extra');
const path = require('path');

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
      `${cssFileParsedPath.name}.min${cssFileParsedPath.ext}`
    );

    await writeUtf8(cssMinifiedFilePath, cssMinified);
  }
}

async function createManifest() {
  const configPath = path.join(srcPath, 'config.json');
  const metadataPath = path.join(projectPath, 'metadata.json');

  const config = await fs.readJSON(configPath);
  const metadata = await fs.readJSON(metadataPath);

  const manifest = {
    name: config.name,
    cssPrefix: config.css_prefix_text,
    glyphs: [],
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

  const manifestDistPath = path.join(distAssetsPath, 'manifest.json');

  await fs.writeJSON(manifestDistPath, manifest, {
    spaces: 2,
  });

  await fs.writeFile(
    path.join(distAssetsPath, 'manifest.ts'),
    `const manifest = ${JSON.stringify(manifest)};
export default manifest;
`
  );
}

(async () => {
  try {
    await copyToDist();
    await processCss();
    await createManifest();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
