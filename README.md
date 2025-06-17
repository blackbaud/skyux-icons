# skyux-icons

## Overview

SKY UX icons is a package that provides icon assets for the SKY UX framework.

## Usage

To use SKY UX icons, use the [SKY UX icon component](https://developer.blackbaud.com/skyux/components/icon).

## Adding new icons

### Adding Fluent icons

1. Add the icon name to the alphabetized list in `src/svg/fluent-icon-list.txt`
   - Do not include any variant or size information
   - Verify the icon name in the [Fluent icon GitHub repo](https://github.com/microsoft/fluentui-system-icons/tree/main/assets)
2. Release the `skyux-icons` repo following the [release process](#release-process)

### Adding custom icons

#### Single color icons

1. Add SVG files to `src/svg` using file name format: `<name>-<size>-<variant>.svg`
2. All sizes require both a solid and line variant
3. SVG files should contain only one path
4. SVG files must not contain:
   - Classes
   - `<style>` elements
   - Inline styles
5. Release the `skyux-icons` repo following the [release process](#release-process)

#### Mutli-color icons

SKY UX icons can support 2 colors.

1. Add SVG files to `src/svg` using file name format: `<name>-<size>-<variant>.svg`
2. All sizes require both a solid and line variant
3. Use these classes on each path for colors:
   - Primary: `sky-i-path-1`
   - Secondary: `sky-i-path-2`
4. SVG files must not contain:
   - `<style>` elements
   - Inline styles
5. Release the `skyux-icons` repo following the [release process](#release-process)

#### Branded icons

Branded icons support maintaining brand color customization.

1. Add SVG files to `src/svg/branded` using file name format: `<name>-<size>-<variant>.svg`
2. All sizes require both a solid and line variant
3. SVG files must not contain:
   - `<style>` elements
   - Inline styles
4. Release the `skyux-icons` repo following the [release process](#release-process)

## Release Process

### Minor Version

1. Release `skyux-icons`
2. If metadata changes have been made, update the `@skyux/icons` package version in `@skyux/icon` and release the monorepo.

### Major Version

1. Release `skyux-icons`
2. Update `@skyux/icon` component:
   - `@skyux/icons` package version
   - the major version in the CDN URL in `SkyIconSvgResolverService`
3. Release the monorepo
4. Update the docs SPA and omnibar

## Maintenance

**Important:** All updates to the `@fluentui/svg-icons` package require a breaking change release due to potential visual changes in any version (major, minor, or patch).

To create a breaking change, add `!` to your commit title, i.e. `feat!: update fluent icon version`

## Legal

Icons that have an `owner` property in the `metadata.json` file are the property of the listed organization.

Icons owned by `Webalys, LLC` must only be used within the context of the SKY UX user experience framework.
