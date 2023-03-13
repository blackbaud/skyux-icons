import { ICON_MANIFEST } from './__manifest';
import type { SkyThemeIconManifest } from './icon-manifest';

/**
 * Returns information about the SKY UX icon font.
 */
export function getIconManifest(): SkyThemeIconManifest {
  return ICON_MANIFEST;
}
