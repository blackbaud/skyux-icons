import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SVGSpriter from 'svg-sprite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PATH_BRANDED = path.resolve(__dirname, '..', 'src', 'svg', 'branded');

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

function addBrandedCssClass(shape, _, callback) {
  if (path.normalize(shape.source.dirname) === PATH_BRANDED) {
    const documentEl = shape.dom.documentElement;

    let cssClass = documentEl.getAttribute('class') ?? '';

    if (cssClass) {
      cssClass += ' ';
    }

    cssClass += 'sky-i-branded';

    documentEl.setAttribute('class', cssClass);
  }

  callback(null);
}

function createSpriter() {
  const ids = new Set();

  const spriter = new SVGSpriter({
    mode: {
      symbol: {
        example: true,
        inline: true,
      },
    },
    shape: {
      transform: [
        {
          addBrandedCssClass,
        },
      ],
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
        hidden: true,
      },
      namespaceClassnames: false,
      dimensionAttributes: false,
    },
  });

  return spriter;
}

async function addIcons(spriter, globPath, filterSet, includedSet) {
  for await (const filePath of glob.globIterate(path.normalize(globPath))) {
    let fileName = path.basename(filePath);
    let iconId = getFluentIconId(fileName);

    if (!filterSet || filterSet.has(iconId)) {
      spriter.add(filePath, null, await fs.readFile(filePath));
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

async function addFluentIcons(spriter) {
  const includedFluentSet = new Set();
  const filterFluentSet = await getFluentList();

  await addIcons(
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
}

async function addCustomIcons(spriter) {
  await addIcons(spriter, 'src/svg/**/*.svg');
}

async function generateSprite() {
  const spriter = createSpriter();

  await addFluentIcons(spriter);
  await addCustomIcons(spriter);

  const { result } = await spriter.compileAsync();

  const output = result.symbol.sprite.contents
    .toString()
    .replace(/\sstyle=("|')[^"']*("|')/gi, '');

  await fs.ensureDir(path.normalize('dist/assets/svg'));

  await fs.writeFile(
    path.normalize('dist/assets/svg/skyux-icons.svg'),
    output,
    {
      encoding: 'utf-8',
    },
  );
}

export { generateSprite };
