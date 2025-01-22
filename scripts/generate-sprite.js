const fs = require('fs-extra');
const glob = require('glob');
const path = require('node:path');
const SVGSpriter = require('svg-sprite');

function getFluentIconId(fileName, includeSize, includeVariant) {
  const parts = fileName.split('_');

  // The last two parts are the size and variant ("regular" or "filled")
  // plus extension. Discard the size and switch the variant to match
  // the SKY UX icon component variant input value.
  let name = parts.slice(0, parts.length - 2).join('-');

  if (includeSize) {
    name = `${name}-${parts[parts.length - 2]}`;
  }

  if (includeVariant) {
    const variant = parts[parts.length - 1] === 'filled.svg' ? 'solid' : 'line';

    name = `${name}-${variant}`;
  }

  return name;
}

async function addSprites(spriter, globPath, filterSet, includedSet) {
  for await (const file of glob.globIterate(path.normalize(globPath))) {
    let fileName = path.basename(file);
    let iconId = getFluentIconId(fileName);

    if (!filterSet || filterSet.has(iconId)) {
      spriter.add(file, null, await fs.readFile(file));
      includedSet?.add(iconId);
    }
  }
}

async function getFluentList() {
  const fluentIconsText = await fs.readFile(
    path.normalize('src/svg/fluent-icon-list.txt'),
    {
      encoding: 'utf-8',
    },
  );

  const fluentIcons = new Set(
    fluentIconsText.split('\n').filter((name) => !!name),
  );

  return fluentIcons;
}

async function generateSprite() {
  const ids = new Set();

  const spriter = new SVGSpriter({
    mode: {
      symbol: {
        example: true,
        inline: true,
      },
    },
    shape: {
      id: {
        generator(fileName) {
          let id;

          if (
            fileName.endsWith('_regular.svg') ||
            fileName.endsWith('_filled.svg')
          ) {
            id = getFluentIconId(fileName, true, true);
          } else {
            // Custom Blackbaud icon
            id = fileName.split('.')[0];
          }

          // Ensure a custom Blackbaud icon doesn't have the same name as a
          // Fluent icon.
          if (ids.has(id)) {
            throw new Error(`Duplicate ID found: ${id}`);
          }

          ids.add(id);

          return `sky-i-${id}`;
        },
      },
    },
    svg: {
      rootAttributes: {
        id: 'sky-icon-svg-sprite',
      },
      namespaceClassnames: false,
    },
  });

  const includedFluentSet = new Set();
  const filterFluentSet = await getFluentList();

  await addSprites(
    spriter,
    'node_modules/@fluentui/svg-icons/icons/*.svg',
    filterFluentSet,
    includedFluentSet,
  );

  const notFoundFluentIds = [...filterFluentSet].filter(
    (iconId) => !includedFluentSet.has(iconId),
  );

  if (notFoundFluentIds.length) {
    throw new Error(`The following Fluent UI icons were not found:
${notFoundFluentIds.join('\n')}`);
  }

  await addSprites(spriter, 'src/svg/*.svg');

  const { result } = await spriter.compileAsync();

  await fs.ensureDir(path.normalize('dist/assets/svg'));

  await fs.writeFile(
    path.normalize('dist/assets/svg/skyux-icons.svg'),
    result.symbol.sprite.contents,
    {
      encoding: 'utf-8',
    },
  );
}

module.exports = {
  generateSprite,
};
