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
        ]) {
          yield item;
        }
    }
  }),
}));

describe('generate-sprites', () => {
  beforeEach(() => {
    fluentIconList = ['fluent-1', 'fluent-2'];
  });

  it('should add the branded CSS class to icons in the branded folder', async () => {
    await generateSprite(fluentIconList);

    expect(fs.writeFile).toHaveBeenCalledWith(
      'dist/assets/svg/skyux-icons.svg',
      '<svg id="sky-icon-svg-sprite" hidden="true"><symbol viewBox="0 0 100 100" id="sky-i-fluent-1-24-solid" xmlns="http://www.w3.org/2000/svg"><path d="e" fill="#242424"/></symbol><symbol viewBox="0 0 100 100" id="sky-i-fluent-1-25-line" xmlns="http://www.w3.org/2000/svg"><path d="e" fill="#242424"/></symbol><symbol viewBox="0 0 100 100" id="sky-i-fluent-2-24-line" xmlns="http://www.w3.org/2000/svg"><path d="e" fill="#242424"/></symbol><symbol viewBox="0 0 100 100" id="sky-i-fluent-2-24-solid" xmlns="http://www.w3.org/2000/svg"><path d="e" fill="#242424"/></symbol><symbol class="sky-i-branded" viewBox="0 0 100 100" id="sky-i-test-branded" xmlns="http://www.w3.org/2000/svg"><path d="b" fill="#242424"/><path d="c" fill="#fff"/><path d="d" fill="#000"/></symbol><symbol viewBox="0 0 100 100" id="sky-i-test-unbranded" xmlns="http://www.w3.org/2000/svg"><path d="a" fill="#242424"/></symbol></svg>',
      { encoding: 'utf-8' },
    );
  });

  it('should throw an error if Fluent UI icons are missing', async () => {
    fluentIconList = ['icon1', 'icon2'];

    await expect(generateSprite(fluentIconList)).rejects.toThrow(
      'The following Fluent UI icons were not found:\nicon1\nicon2',
    );
  });
});
