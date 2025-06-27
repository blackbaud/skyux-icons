import type { SkyIconManifestGlyph } from './icon-manifest-glyph';
import { SkySvgManifestGlyph } from './svg-manifest-glyph';

/**
 * Metadata about the SKY UX icon font.
 */
export interface SkyIconManifest {
  /**
   * The prefix of the CSS class for each glyph.
   */
  cssPrefix: string;

  /**
   * A list of available glyphs.
   */
  glyphs: SkyIconManifestGlyph[];

  /**
   * A list of custom Fluent icons.
   */
  customFluentIcons: SkySvgManifestGlyph[];

  /**
   * A list of additional Fluent icons.
   */
  additionalFluentIcons: string[];

  /**
   * The name of the font as it is registered with the SKY UX stylesheet.
   */
  name: string;
}
