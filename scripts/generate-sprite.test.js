import { DOMParser } from '@xmldom/xmldom';

import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'node:path';
import { afterEach } from 'node:test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateSprite } from './generate-sprite.mjs';

let fluentIconList;

function mockFsAndGlob() {
  vi.mock('fs-extra', () => ({
    default: {
      ensureDir: vi.fn(),
      readFile: vi.fn(async (path, options) => {
        let fileContents = '';

        switch (path) {
          case 'src/svg/test-unbranded-24-line.svg':
            fileContents = `<svg xmlns="http://www.w3.org/2000/svg"><path d="a" fill="#242424"/></svg>`;
            break;
          case 'src/svg/branded/test-branded-20-solid.svg':
            fileContents = `<svg xmlns="http://www.w3.org/2000/svg"><path d="b" fill="#242424"/><path d="c" fill="#fff"/><path d="d" fill="#000"/></svg>`;
            break;
          case 'src/svg/multicolor/test-multicolor-24-solid.svg':
            fileContents = `<svg xmlns="http://www.w3.org/2000/svg"><path d="m1" fill="#242424"/><path d="m2" fill="#fff"/></svg>`;
            break;
          case 'src/svg/multicolor/test-multicolor-16-line.svg':
            fileContents = `<svg xmlns="http://www.w3.org/2000/svg"><path d="ml1" fill="#242424"/><path d="ml2" fill="#fff"/></svg>`;
            break;
          case 'src/svg/multicolor/test-multicolor-existing-classes-24-solid.svg':
            fileContents = `<svg xmlns="http://www.w3.org/2000/svg"><path class="existing-class" d="me1" fill="#242424"/><path class="another-class special" d="me2" fill="#fff"/></svg>`;
            break;
          case 'src/svg/multicolor/test-multicolor-invalid-24-solid.svg':
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
    glob: vi
      .fn()
      .mockResolvedValue([
        'src/svg/test-unbranded-24-line.svg',
        'src/svg/branded/test-branded-20-solid.svg',
        'src/svg/multicolor/test-multicolor-24-solid.svg',
        'src/svg/multicolor/test-multicolor-16-line.svg',
        'src/svg/multicolor/test-multicolor-existing-classes-24-solid.svg',
      ]),
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
            'src/svg/test-unbranded-24-line.svg',
            'src/svg/branded/test-branded-20-solid.svg',
            'src/svg/multicolor/test-multicolor-24-solid.svg',
            'src/svg/multicolor/test-multicolor-16-line.svg',
            'src/svg/multicolor/test-multicolor-existing-classes-24-solid.svg',
          ]) {
            yield item;
          }
      }
    }),
  }));
}

describe('generate-sprites', () => {
  let svg;
  beforeEach(async () => {
    mockFsAndGlob();
    fluentIconList = ['fluent-1', 'fluent-2'];
    await generateSprite(fluentIconList);

    const writeFileCall = fs.writeFile.mock.calls.find(
      (call) => call[0] === path.normalize('dist/assets/svg/skyux-icons.svg'),
    );

    expect(writeFileCall).toBeDefined();

    const svgContent = writeFileCall[1];
    const parser = new DOMParser();
    svg = parser.parseFromString(svgContent, 'text/xml');
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  // Helper function to get icon element by ID
  function getIconElement(iconId) {
    const iconElement = svg.getElementById(iconId);
    expect(iconElement).toBeTruthy();
    return iconElement;
  }

  it('should add the branded CSS class to icons in the branded folder', async () => {
    const brandedIcon = getIconElement('sky-i-test-branded-20-solid');

    expect(brandedIcon.getAttribute('class')).toBe('sky-i-branded');
  });

  it('should throw an error if Fluent UI icons are missing', async () => {
    fluentIconList = ['icon1', 'icon2'];

    await expect(generateSprite(fluentIconList)).rejects.toThrow(
      'The following Fluent UI icons were not found:\nicon1\nicon2',
    );
  });

  it('should add multicolor CSS classes to solid icons in the multicolor folder', async () => {
    const multicolorIcon = getIconElement('sky-i-test-multicolor-24-solid');

    const paths = multicolorIcon.getElementsByTagName('path');
    expect(paths.length).toBe(2);

    expect(paths[0].getAttribute('class')).toBe('sky-i-path-1');
    expect(paths[1].getAttribute('class')).toBe('sky-i-path-2');
  });

  it('should not add path classes to the line icons in the multicolor folder', async () => {
    const multicolorIcon = getIconElement('sky-i-test-multicolor-16-line');

    const paths = multicolorIcon.getElementsByTagName('path');
    expect(paths.length).toBe(2);

    expect(paths[0].getAttribute('class')).toBeFalsy();
    expect(paths[1].getAttribute('class')).toBeFalsy();
  });

  it('should preserve existing classes when adding multicolor classes', async () => {
    const multicolorIcon = getIconElement(
      'sky-i-test-multicolor-existing-classes-24-solid',
    );

    const paths = multicolorIcon.getElementsByTagName('path');
    expect(paths.length).toBe(2);

    expect(paths[0].getAttribute('class')).toBe('existing-class sky-i-path-1');
    expect(paths[1].getAttribute('class')).toBe(
      'another-class special sky-i-path-2',
    );
  });

  it('should throw an error for multicolor icons with incorrect number of paths', async () => {
    // Use vi.mocked() to modify existing mocks for this specific test
    vi.mocked(glob.glob).mockResolvedValue([
      'src/svg/test-unbranded-24-line.svg',
      'src/svg/branded/test-branded-20-solid.svg',
      'src/svg/multicolor/test-multicolor-invalid-24-solid.svg',
    ]);

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
            'src/svg/test-unbranded-24-line.svg',
            'src/svg/branded/test-branded-20-solid.svg',
            'src/svg/multicolor/test-multicolor-invalid-24-solid.svg',
          ]) {
            yield item;
          }
      }
    });

    await expect(generateSprite(fluentIconList)).rejects.toThrow(
      'Multicolor icon "test-multicolor-invalid-24-solid.svg" has 3 paths. It must have exactly 2 paths.',
    );
  });
});

describe('custom icon validation', () => {
  beforeEach(() => {
    // Reset and re-setup mocks for each test to ensure clean state
    vi.restoreAllMocks();
    vi.resetModules();
    mockFsAndGlob();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('should accept valid icon names with correct format', async () => {
    vi.mocked(glob.glob).mockResolvedValue([
      'src/svg/add-24-line.svg',
      'src/svg/bar-chart-horizontal-24-solid.svg',
      'src/svg/test-icon-16-line.svg',
      'src/svg/another-test-20-solid.svg',
    ]);

    // Should not throw an error
    await expect(generateSprite(fluentIconList)).resolves.not.toThrow();
  });

  it('should reject invalid icon names with numbers in the name portion', async () => {
    vi.mocked(glob.glob).mockResolvedValue([
      'src/svg/add-24-line.svg',
      'src/svg/icon2-test-24-solid.svg', // Invalid: number in name
      'src/svg/icon-24-test-24-solid.svg', // Invalid: number in name standalone
    ]);

    await expect(generateSprite(fluentIconList)).rejects.toThrow(
      'The following SVG files do not match the required naming format (name-digits-{solid|line}.svg where name contains only letters and hyphens):\nicon2-test-24-solid.svg\nicon-24-test-24-solid.svg',
    );
  });

  it('should reject invalid icon names with special characters in the name portion', async () => {
    vi.mocked(glob.glob).mockResolvedValue([
      'src/svg/add-24-line.svg',
      'src/svg/test_icon-24-solid.svg', // Invalid: underscore in name
      'src/svg/test.icon-16-line.svg', // Invalid: dot in name
    ]);

    await expect(generateSprite(fluentIconList)).rejects.toThrow(
      'The following SVG files do not match the required naming format (name-digits-{solid|line}.svg where name contains only letters and hyphens):\ntest_icon-24-solid.svg\ntest.icon-16-line.svg',
    );
  });

  it('should reject invalid icon names with incorrect variant names', async () => {
    vi.mocked(glob.glob).mockResolvedValue([
      'src/svg/add-24-line.svg',
      'src/svg/test-icon-24-filled.svg', // Invalid: should be "solid" not "filled"
      'src/svg/another-test-16-outline.svg', // Invalid: should be "line" not "outline"
    ]);

    await expect(generateSprite(fluentIconList)).rejects.toThrow(
      'The following SVG files do not match the required naming format (name-digits-{solid|line}.svg where name contains only letters and hyphens):\ntest-icon-24-filled.svg\nanother-test-16-outline.svg',
    );
  });

  it('should reject invalid icon names missing size or variant', async () => {
    vi.mocked(glob.glob).mockResolvedValue([
      'src/svg/add-24-line.svg',
      'src/svg/test-icon-line.svg', // Invalid: missing size
      'src/svg/another-test-24.svg', // Invalid: missing variant
      'src/svg/no-structure.svg', // Invalid: missing size and variant
    ]);

    await expect(generateSprite(fluentIconList)).rejects.toThrow(
      'The following SVG files do not match the required naming format (name-digits-{solid|line}.svg where name contains only letters and hyphens):\ntest-icon-line.svg\nanother-test-24.svg\nno-structure.svg',
    );
  });

  it('should reject invalid icon names with wrong file extension', async () => {
    vi.mocked(glob.glob).mockResolvedValue([
      'src/svg/add-24-line.svg',
      'src/svg/test-icon-24-solid.png', // Invalid: wrong extension
    ]);

    await expect(generateSprite(fluentIconList)).rejects.toThrow(
      'The following SVG files do not match the required naming format (name-digits-{solid|line}.svg where name contains only letters and hyphens):\ntest-icon-24-solid.png',
    );
  });

  it('should accept complex multi-word icon names with hyphens', async () => {
    vi.mocked(glob.glob).mockResolvedValue([
      'src/svg/bar-chart-horizontal-with-labels-24-line.svg',
      'src/svg/multi-word-icon-name-here-16-solid.svg',
      'src/svg/a-very-long-icon-name-with-many-words-20-line.svg',
    ]);

    // Should not throw an error
    await expect(generateSprite(fluentIconList)).resolves.not.toThrow();
  });
});
