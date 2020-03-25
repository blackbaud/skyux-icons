const fs = require('fs-extra');
const CleanCSS = require('clean-css');
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

    const css = await fs.readFile(cssFilePath, { encoding: 'utf-8'});

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

    await fs.writeFile(cssMinifiedFilePath, cssMinified, { encoding: 'utf-8'});
  }
}

async function createManifest() {
  const configPath = path.join(srcPath, 'config.json');

  const config = await fs.readJSON(configPath);

  const manifest = {
    name: config.name,
    cssPrefix: config.css_prefix_text,
    glyphs: config.glyphs.map((glyph) => {
      return {
        name: glyph.css,
        code: glyph.code
      };
    })
  };

  const manifestPath = path.join(distAssetsPath, 'manifest.json');

  await fs.writeJSON(
    manifestPath,
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
