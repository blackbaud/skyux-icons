import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SVGSpriter from 'svg-sprite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PATH_BRANDED = path.resolve(__dirname, '..', 'src', 'svg', 'branded');
const PATH_MULTICOLOR = path.resolve(
  __dirname,
  '..',
  'src',
  'svg',
  'multicolor',
);

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

    documentEl.setAttribute('class', 'sky-i-branded');
  }

  callback(null);
}

function addMulticolorCssClass(shape, _, callback) {
  if (
    path.normalize(shape.source.dirname) === PATH_MULTICOLOR &&
    !shape.source.basename.includes('line')
  ) {
    const paths = shape.dom.documentElement.getElementsByTagName('path');

    if (paths.length === 2) {
      paths[0].setAttribute('class', 'sky-i-path-1');
      paths[1].setAttribute('class', 'sky-i-path-2');
    } else {
      throw new Error(
        `Multicolor icon "${shape.source.basename}" has ${paths.length} paths. It must have exactly 2 paths.`,
      );
    }
  }

  callback(null);
}

function createSpriter() {
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
        {
          addMulticolorCssClass,
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
  for await (const filePath of glob.globIterate(globPath)) {
    let fileName = path.basename(filePath);
    let iconId = getFluentIconId(fileName);

    if (!filterSet || filterSet.has(iconId)) {
      spriter.add(filePath, null, await fs.readFile(filePath));
      includedSet?.add(iconId);
    }
  }
}

async function getFluentList() {
  return (
    await fs.readFile(path.normalize('src/svg/fluent-icon-list.txt'), 'utf-8')
  )
    .split('\n')
    .map((name) => name.trim())
    .filter((name) => !!name);
}

async function addFluentIcons(spriter, fluentIcons) {
  const includedFluentSet = new Set();
  const filterFluentSet = new Set(fluentIcons);

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

async function getCustomIconFiles() {
  return await glob.glob('src/svg/**/*.svg');
}

// Custom icons must be named {name}-{size}-{solid|line}[-dark].svg, where the
// name contains only letters and hyphens and the optional "-dark" suffix marks
// the dark mode version of an icon.
const CUSTOM_ICON_PATTERN = /^([a-zA-Z-]+)-(\d+)-(solid|line)(-dark)?\.svg$/;

// Splits a custom icon file name into its parts, or returns undefined when the
// file name does not follow the required naming format.
// Example: 'headline-chart-16-solid-dark.svg' ->
//   { name: 'headline-chart', size: '16', variant: 'solid', isDark: true }
function parseCustomIconFileName(fileName) {
  const match = fileName.match(CUSTOM_ICON_PATTERN);

  if (!match) {
    return undefined;
  }

  const [, name, size, variant, darkSuffix] = match;

  return { name, size, variant, isDark: !!darkSuffix };
}

async function getCustomList() {
  const iconNames = new Set();
  const iconFiles = await getCustomIconFiles();

  for (const filePath of iconFiles) {
    const parsed = parseCustomIconFileName(path.basename(filePath));

    if (parsed) {
      iconNames.add(parsed.name);
    }
  }

  return Array.from(iconNames);
}

async function addCustomIcons(spriter, fluentIcons) {
  // Validate that all custom icons follow the required naming format:
  // {name}-{digits}-{solid|line}[-dark].svg where name contains only letters
  // and hyphens
  const iconFiles = await getCustomIconFiles();
  const parsedIcons = new Map(); // key: file path, value: parsed file name
  const invalidFiles = [];

  for (const filePath of iconFiles) {
    const fileName = path.basename(filePath);
    const parsed = parseCustomIconFileName(fileName);

    if (parsed) {
      parsedIcons.set(filePath, parsed);
    } else {
      invalidFiles.push(fileName);
    }
  }

  if (invalidFiles.length > 0) {
    throw new Error(`The following SVG files do not match the required naming format (name-digits-{solid|line}[-dark].svg where name contains only letters and hyphens):
${invalidFiles.join('\n')}`);
  }

  // Validate that custom icons don't have the same name as fluent icons
  const fluentIconSet = new Set(fluentIcons);
  const conflictingIcons = [];

  for (const [filePath, { name }] of parsedIcons) {
    if (fluentIconSet.has(name)) {
      conflictingIcons.push(path.basename(filePath));
    }
  }

  if (conflictingIcons.length > 0) {
    throw new Error(`The following custom icons have names that conflict with Fluent UI icons:
${conflictingIcons.join('\n')}`);
  }

  // Validate that for every size, both solid and line variants exist, in light
  // mode and (when the icon provides dark mode versions) in dark mode.
  const iconGroups = new Map(); // key: {name}-{size}, value: light/dark variant sets

  for (const { name, size, variant, isDark } of parsedIcons.values()) {
    const baseKey = `${name}-${size}`;

    if (!iconGroups.has(baseKey)) {
      iconGroups.set(baseKey, { light: new Set(), dark: new Set() });
    }

    iconGroups.get(baseKey)[isDark ? 'dark' : 'light'].add(variant);
  }

  function getMissingVariants(variants) {
    const missing = [];
    if (!variants.has('solid')) missing.push('solid');
    if (!variants.has('line')) missing.push('line');

    return missing;
  }

  const missingVariants = [];
  const missingDarkVariants = [];
  const missingLightIcons = [];

  for (const [baseKey, { light, dark }] of iconGroups) {
    if (light.size === 0) {
      // Dark mode versions are an addition to an icon, not a replacement, so
      // the light mode versions of the icon must exist too.
      missingLightIcons.push(baseKey);
    } else {
      const missingLight = getMissingVariants(light);

      if (missingLight.length > 0) {
        missingVariants.push(
          `${baseKey}: missing ${missingLight.join(' and ')} variant(s)`,
        );
      }

      if (dark.size > 0) {
        const missingDark = getMissingVariants(dark);

        if (missingDark.length > 0) {
          missingDarkVariants.push(
            `${baseKey}: missing dark ${missingDark.join(' and ')} variant(s)`,
          );
        }
      }
    }
  }

  if (missingVariants.length > 0) {
    throw new Error(`The following icons are missing required variants (both solid and line must exist for each size):
${missingVariants.join('\n')}`);
  }

  if (missingDarkVariants.length > 0) {
    throw new Error(`The following icons are missing required dark variants (both solid and line must exist for each size with dark variants):
${missingDarkVariants.join('\n')}`);
  }

  if (missingLightIcons.length > 0) {
    throw new Error(`The following icons only have dark variants (each "-dark" icon requires the same icon without the "-dark" suffix):
${missingLightIcons.join('\n')}`);
  }

  // Validate that no SVG elements have class attributes
  const filesWithClassAttributes = [];

  for (const filePath of parsedIcons.keys()) {
    const svgContent = await fs.readFile(filePath, 'utf-8');

    // Check for class attributes in any HTML element
    const classAttributePattern = /\s+class\s*=\s*["'][^"']*["']/gi;
    if (classAttributePattern.test(svgContent)) {
      filesWithClassAttributes.push(path.basename(filePath));
    }
  }

  if (filesWithClassAttributes.length > 0) {
    throw new Error(`The following SVG files contain class attributes, which are not allowed in custom icons:
${filesWithClassAttributes.join('\n')}`);
  }

  await addIcons(spriter, 'src/svg/**/*.svg');
}

async function generateSprite(fluentIcons) {
  const spriter = createSpriter();

  await addFluentIcons(spriter, fluentIcons);
  await addCustomIcons(spriter, fluentIcons);

  const { result } = await spriter.compileAsync();

  const output = result.symbol.sprite.contents
    .toString()
    .replace(/\sstyle=("|')[^"']*("|')/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<style[^>]*\/>/gi, '');

  await fs.ensureDir(path.normalize('dist/assets/svg'));

  await fs.writeFile(
    path.normalize('dist/assets/svg/skyux-icons.svg'),
    output,
    {
      encoding: 'utf-8',
    },
  );
}

export { generateSprite, getFluentList, getCustomList };
