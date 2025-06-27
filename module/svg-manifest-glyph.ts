/**
 * Metadata about a SKY UX SVG icon glyph.
 */
export interface SkySvgManifestGlyph {
  /**
   * The name of the SVG icon.
   */
  iconName: string;

  /**
   * A list of descriptions of how the glyph should be used to adhere to SKY UX design patterns.
   */
  usage?: string[];

  isMatching: boolean;
}
