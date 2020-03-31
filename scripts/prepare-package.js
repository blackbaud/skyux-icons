const CleanCSS = require('clean-css');
const fs = require('fs-extra');
const path = require('path');

const projectPath = path.join(__dirname, '..');
const srcPath = path.join(projectPath, 'src');
const distPath = path.join(projectPath, 'dist');
const distAssetsPath = path.join(distPath, 'assets');
const distAssetsCssPath = path.join(distAssetsPath, 'css');

async function copyToDist() {
  if (await fs.exists(distPath)) {
    await fs.emptyDir(distPath);
  }

  await fs.copy(
    path.join(srcPath, 'css'),
    distAssetsCssPath
  );

  await fs.copy(
    path.join(srcPath, 'font'),
    path.join(distAssetsPath, 'font')
  );
}

async function minifyCss() {
  const cssFiles = await fs.readdir(distAssetsCssPath);

  for (const cssFile of cssFiles) {
    const cssFilePath = path.join(distAssetsCssPath, cssFile);
    const cssFileParsedPath = path.parse(cssFilePath);

    const css = await fs.readFile(cssFilePath, { encoding: 'utf-8' });

    const minifier = new CleanCSS(
      {
        compatibility: cssFileParsedPath.name.indexOf('-ie7') ? 'ie7' : '*',
        inline: false,
        level: 1,
        returnPromise: true
      }
    );

    const cssMinified = (await minifier.minify(css)).styles;

    const cssMinifiedFilePath = path.join(
      cssFileParsedPath.dir,
      `${cssFileParsedPath.name}.min${cssFileParsedPath.ext}`
    );

    await fs.writeFile(cssMinifiedFilePath, cssMinified, { encoding: 'utf-8' });
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
    // Initialize the glyph list with items from metadata.json; additional properties will be
    // added from matching items in config.json. Any items from config.json without a matching
    // item in metadata.json will be added to the end of the list. This preserves the order
    // of the items in metadata.json so documentation generated from the list will be in the
    // specified order.
    glyphs: [...metadata.glyphs]
  };

  for (const glyph of config.glyphs) {
    const matchingGlyph = manifest.glyphs.find(item => item.name === glyph.css);

    const glpyhData = {
      name: glyph.css,
      code: glyph.code
    };

    if (matchingGlyph) {
      // Preserve the order in metadata.json by updating the properties on the existing item.
      Object.assign(matchingGlyph, glpyhData);
    } else {
      // The item is missing from metadata.json; append it to the end.
      manifest.glyphs.push(glpyhData);
    }
  }

  const manifestDistPath = path.join(distAssetsPath, 'manifest.json');

  await fs.writeJSON(
    manifestDistPath,
    manifest,
    {
      spaces: 2
    }
  );
}

(async () => {
  await copyToDist();
  await minifyCss();
  await createManifest();
})();
