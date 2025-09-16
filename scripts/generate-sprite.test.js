import { DOMParser } from '@xmldom/xmldom';

import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateSprite } from './generate-sprite.mjs';

let fluentIconList;

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn(),
    readFile: vi.fn(async (path, options) => {
      let fileContents = '';

      switch (path) {
        case 'src/svg/test-unbranded.svg':
          fileContents = `<svg xmlns="http://www.w3.org/2000/svg"><path d="a" fill="#242424"/></svg>`;
          break;
        case 'src/svg/branded/test-branded.svg':
          fileContents = `<svg xmlns="http://www.w3.org/2000/svg"><path d="b" fill="#242424"/><path d="c" fill="#fff"/><path d="d" fill="#000"/></svg>`;
          break;
        case 'src/svg/multicolor/test-multicolor-solid.svg':
          fileContents = `<svg xmlns="http://www.w3.org/2000/svg"><path d="m1" fill="#242424"/><path d="m2" fill="#fff"/></svg>`;
          break;
        case 'src/svg/multicolor/test-multicolor-line.svg':
          fileContents = `<svg xmlns="http://www.w3.org/2000/svg"><path d="ml1" fill="#242424"/><path d="ml2" fill="#fff"/></svg>`;
          break;
        case 'src/svg/multicolor/test-multicolor-existing-classes.svg':
          fileContents = `<svg xmlns="http://www.w3.org/2000/svg"><path class="existing-class" d="me1" fill="#242424"/><path class="another-class special" d="me2" fill="#fff"/></svg>`;
          break;
        case 'src/svg/multicolor/test-multicolor-invalid.svg':
          fileContents = `<svg xmlns="http://www.w3.org/2000/svg"><path d="mi1" fill="#242424"/><path d="mi2" fill="#fff"/><path d="mi3" fill="#000"/></svg>`;
          break;
        case 'src/svg/fluent-icon-list.txt':
          fileContents = fluentIconList.join('\n');
          break;
        default:
          if (path.includes('fluent_1') || path.includes('fluent_2')) {
            fileContents =
              '<svg xmlns="http://www.w3.org/2000/svg"><path d="e" fill="#242424"/></svg>';
          }
          break;
      }

      if (options?.encoding === 'utf-8') {
        return fileContents;
      }

      return Buffer.from(fileContents, 'utf-8');
    }),
    writeFile: vi.fn(),
  },
}));

vi.mock('glob', () => ({
  globIterate: vi.fn(async function* (path) {
    switch (path) {
      case 'node_modules/@fluentui/svg-icons/icons/*.svg':
        for (const item of [
          'node_modules/@fluentui/svg-icons/icons/fluent_1_25_regular.svg',
          'node_modules/@fluentui/svg-icons/icons/fluent_1_24_filled.svg',
          'node_modules/@fluentui/svg-icons/icons/fluent_2_24_regular.svg',
          'node_modules/@fluentui/svg-icons/icons/fluent_2_24_filled.svg',
        ]) {
          yield item;
        }
        break;
      case 'src/svg/**/*.svg':
        for (const item of [
          'src/svg/test-unbranded.svg',
          'src/svg/branded/test-branded.svg',
          'src/svg/multicolor/test-multicolor-solid.svg',
          'src/svg/multicolor/test-multicolor-line.svg',
          'src/svg/multicolor/test-multicolor-existing-classes.svg',
        ]) {
          yield item;
        }
    }
  }),
}));

describe('generate-sprites', () => {
  let svg;
  beforeEach(async () => {
    fluentIconList = ['fluent-1', 'fluent-2'];
    await generateSprite(fluentIconList);

    const writeFileCall = fs.writeFile.mock.calls.find(
      (call) => call[0] === 'dist/assets/svg/skyux-icons.svg',
    );

    expect(writeFileCall).toBeDefined();

    const svgContent = writeFileCall[1];
    const parser = new DOMParser();
    svg = parser.parseFromString(svgContent, 'text/xml');
  });

  // Helper function to get icon element by ID
  function getIconElement(iconId) {
    const iconElement = svg.getElementById(iconId);
    expect(iconElement).toBeTruthy();
    return iconElement;
  }

  it('should add the branded CSS class to icons in the branded folder', async () => {
    const brandedIcon = getIconElement('sky-i-test-branded');

    expect(brandedIcon.getAttribute('class')).toBe('sky-i-branded');
  });

  it('should throw an error if Fluent UI icons are missing', async () => {
    fluentIconList = ['icon1', 'icon2'];

    await expect(generateSprite(fluentIconList)).rejects.toThrow(
      'The following Fluent UI icons were not found:\nicon1\nicon2',
    );
  });

  it('should add multicolor CSS classes to solid icons in the multicolor folder', async () => {
    const multicolorIcon = getIconElement('sky-i-test-multicolor-solid');

    const paths = multicolorIcon.getElementsByTagName('path');
    expect(paths.length).toBe(2);

    expect(paths[0].getAttribute('class')).toBe('sky-i-path-1');
    expect(paths[1].getAttribute('class')).toBe('sky-i-path-2');
  });

  it('should not add path classes to the line icons in the multicolor folder', async () => {
    const multicolorIcon = getIconElement('sky-i-test-multicolor-line');

    const paths = multicolorIcon.getElementsByTagName('path');
    expect(paths.length).toBe(2);

    expect(paths[0].getAttribute('class')).toBeFalsy();
    expect(paths[1].getAttribute('class')).toBeFalsy();
  });

  it('should preserve existing classes when adding multicolor classes', async () => {
    const multicolorIcon = getIconElement(
      'sky-i-test-multicolor-existing-classes',
    );

    const paths = multicolorIcon.getElementsByTagName('path');
    expect(paths.length).toBe(2);

    expect(paths[0].getAttribute('class')).toBe('existing-class sky-i-path-1');
    expect(paths[1].getAttribute('class')).toBe(
      'another-class special sky-i-path-2',
    );
  });

  it('should throw an error for multicolor icons with incorrect number of paths', async () => {
    // Mock the glob to include the invalid multicolor icon
    const glob = await import('glob');
    const originalGlobIterate = glob.globIterate;

    vi.mocked(glob.globIterate).mockImplementation(async function* (path) {
      switch (path) {
        case 'node_modules/@fluentui/svg-icons/icons/*.svg':
          for (const item of [
            'node_modules/@fluentui/svg-icons/icons/fluent_1_25_regular.svg',
            'node_modules/@fluentui/svg-icons/icons/fluent_1_24_filled.svg',
            'node_modules/@fluentui/svg-icons/icons/fluent_2_24_regular.svg',
            'node_modules/@fluentui/svg-icons/icons/fluent_2_24_filled.svg',
          ]) {
            yield item;
          }
          break;
        case 'src/svg/**/*.svg':
          for (const item of [
            'src/svg/test-unbranded.svg',
            'src/svg/branded/test-branded.svg',
            'src/svg/multicolor/test-multicolor-invalid.svg',
          ]) {
            yield item;
          }
      }
    });

    await expect(generateSprite(fluentIconList)).rejects.toThrow(
      'Multicolor icon "test-multicolor-invalid.svg" has 3 paths. It must have exactly 2 paths.',
    );

    vi.mocked(glob.globIterate).mockImplementation(originalGlobIterate);
  });
});
