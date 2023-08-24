/**
 * Metadata about a SKY UX icon glyph.
 */
export interface SkyIconManifestGlyph {
  /**
   * The character code of the glyph.
   */
  code: number;

  /**
   * The name of the glyph.
   */
  name: string;

  /**
   * A list of descriptions of how the glyph should be used to adhere to SKY UX design patterns.
   */
  usage: string[];

  /**
   * A list of additional names the glyph could be referenced by.
   */
  aliases?: string[];

  /**
   * An alternate Font Awesome icon for themes that do not use the SKY UX icon font.
   */
  faName?: string;

  /**
   * A flag indicating the glyph is not actively supported or documented.
   */
  deprecated?: boolean;
}
