import { __getIconManifest } from './__manifest';
import type { SkyThemeIconManifest } from './icon-manifest';

/**
 * Returns information about the SKY UX icon font.
 */
export function getIconManifest(): SkyThemeIconManifest {
  // Return a new version of the manifest every time `getIconManifest` is called.
  return __getIconManifest();
}
